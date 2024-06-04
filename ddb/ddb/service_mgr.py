import time
import asyncio
from typing import Callable
import paho.mqtt.client as paho
from paho.mqtt.client import CallbackAPIVersion
from ddb.data_struct import ServiceInfo
from ddb.event_loop import GlobalRunningLoop
from ddb.logging import logger
from ddb.utils import ip_int2ip_str
from ddb.config import GlobalConfig

# BROKER_ADDR = "10.10.2.1"
# BROKER_PORT = 10101
BROKER_MSG_TRANSPORT = "tcp"
T_SERVICE_DISCOVERY = "service_discovery/report"
CLIENT_ID = "service_manager"

ON_NEW_SERVICE_CALLBACK_HANDLE = "on_new_service"
ON_NEW_SERVICE_CALLBACK = Callable[[ServiceInfo], None]

class ServiceManager:
    FIRST_RECONNECT_DELAY = 1
    RECONNECT_RATE = 2
    MAX_RECONNECT_COUNT = 12
    MAX_RECONNECT_DELAY = 60

    def __init__(self) -> None:
        self.userdata = {
            ON_NEW_SERVICE_CALLBACK_HANDLE: self.__default_on_new_service
        }

        self.client = paho.Client(
            callback_api_version=CallbackAPIVersion.VERSION2, 
            client_id=CLIENT_ID, 
            userdata=self.userdata, 
            protocol=paho.MQTTv5,
            transport=BROKER_MSG_TRANSPORT
        )
        self.client.on_connect = ServiceManager.__on_connect
        self.client.on_disconnect = ServiceManager.__on_disconnect

        self.client.on_message = ServiceManager.__on_message
        self.client.message_callback_add(T_SERVICE_DISCOVERY, ServiceManager.__on_service_discovery)

        broker_info = GlobalConfig.get().broker
        self.client.connect(broker_info.hostname, broker_info.port)
        self.client.subscribe(T_SERVICE_DISCOVERY)
        self.client.loop_start()

    def __del__(self) -> None:
        self.client.loop_stop()

# -----------------------------------------------
# Callbacks will be triggered by ServiceManager
# external users should set their own callbacks
# -----------------------------------------------
    def set_callback_on_new_service(self, callback: ON_NEW_SERVICE_CALLBACK):
        self.userdata[ON_NEW_SERVICE_CALLBACK_HANDLE] = callback

    def __default_on_new_service(self, service: ServiceInfo):
        logger.debug(f"Default on_new_service handle. new service discovered: {service}")

# -----------------------------------------------
# Callbacks will be triggered by 
# the internal paho MQTT client
# -----------------------------------------------
    def __on_message(client: paho.Client, userdata, message: paho.MQTTMessage):
        ''' Handling all other incoming messages excluding service discovery report message
        '''
        logger.debug(f"Received message: {message.payload.decode()}")

    def __on_service_discovery(client: paho.Client, userdata, message: paho.MQTTMessage):
        ''' Handling service discovery messages
        '''
        msg = message.payload.decode()
        logger.debug(f"Receive new service msg: {msg}")
        parts = msg.split(":")

        """ #1 directly run the callback in the running loop
        """
        # GlobalRunningLoop().get_loop().run_in_executor(
        #     None, userdata[ON_NEW_SERVICE_CALLBACK_HANDLE],
        #     ServiceInfo(
        #         ip=ip_int2ip_str(int(parts[0])), # ip addr embedded in the message is in integer format, convert it to human-readable string
        #         tag=str(parts[1]), 
        #         pid=int(parts[2])
        #     )
        # )

        """ #2 Run callback with run_coroutine_threadsafe
                This is incorrect as the callback is not a coroutine
        """
        # asyncio.run_coroutine_threadsafe(
        #     ServiceInfo(
        #         ip=ip_int2ip_str(int(parts[0])), # ip addr embedded in the message is in integer format, convert it to human-readable string
        #         tag=str(parts[1]), 
        #         pid=int(parts[2])
        #     ),
        #     GlobalRunningLoop().get_loop()
        # )

        """ #3 directly run the callback, which definitely won't work
            start() will call register_cmd() which uses SessionMeta.
            SessionMeta assume the existence of a asyncio loop.
        """
        userdata[ON_NEW_SERVICE_CALLBACK_HANDLE](
            ServiceInfo(
                ip=ip_int2ip_str(int(parts[0])), # ip addr embedded in the message is in integer format, convert it to human-readable string
                tag=str(parts[1]), 
                pid=int(parts[2])
            )
        )

        """ #4 Manually create a event loop of doesn't exist already.
            This still doesn't make sense as we need to submit the task to the same running loop.
            Also, the callback is not a coroutine.
            run_until_complete() should take a awaitable task.
        """
        # try:
        #     loop = asyncio.get_event_loop()
        # except RuntimeError:
        #     loop = asyncio.new_event_loop()
        #     asyncio.set_event_loop(loop)

        # loop.run_until_complete(
        #     userdata[ON_NEW_SERVICE_CALLBACK_HANDLE](
        #         ServiceInfo(
        #             ip=ip_int2ip_str(int(parts[0])), # ip addr embedded in the message is in integer format, convert it to human-readable string
        #             tag=str(parts[1]), 
        #             pid=int(parts[2])
        #         )
        #     )
        # )
        
    def __on_connect(client: paho.Client, userdata, flags, rc, properties):
        if rc == 0:
            logger.debug("Connected to MQTT Broker!")
        else:
            logger.debug("Failed to connect, return code %d\n", rc)

    def __on_disconnect(client: paho.Client, userdata, flags, rc, properties):
        ''' auto-reconnection logic here
        '''
        logger.debug("Disconnected with result code: %s", rc)
        reconnect_count, reconnect_delay = 0, ServiceManager.FIRST_RECONNECT_DELAY
        while reconnect_count < ServiceManager.MAX_RECONNECT_COUNT:
            logger.debug("Reconnecting in %d seconds...", reconnect_delay)
            time.sleep(reconnect_delay)

            try:
                client.reconnect()
                logger.debug("Reconnected successfully!")
                return
            except Exception as err:
                logger.debug("%s. Reconnect failed. Retrying...", err)

            reconnect_delay *= ServiceManager.RECONNECT_RATE
            reconnect_delay = min(reconnect_delay, ServiceManager.MAX_RECONNECT_DELAY)
            reconnect_count += 1
        logger.debug("Reconnect failed after %s attempts. Exiting...", reconnect_count)