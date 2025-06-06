#!/bin/bash

SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

sudo apt-get update
sudo apt-get install -y build-essential gcc autoconf libtool pkg-config make cmake cmake-gui cmake-curses-gui git

# sudo apt-add-repository -y ppa:mosquitto-dev/mosquitto-ppa
# sudo apt-get update
# sudo apt-get install -y libc-ares-dev libssl-dev mosquitto # install mosquitto broker directly

# # disable auto-start mosquitto service
# sudo systemctl disable mosquitto.service
# sudo systemctl stop mosquitto.service
# # hack cleanup if any instance is running
# sudo pkill -9 mosquitto

TMP_FOLDER="/opt/mqtt"

sudo rm -rf $TMP_FOLDER
sudo mkdir -p $TMP_FOLDER
sudo chmod 777 $TMP_FOLDER

check_status() {
    if [ $? -ne 0 ]; then
        echo "Error: Previous command failed. Exiting."
        exit 1
    fi
}

cd $TMP_FOLDER
check_status
git clone https://github.com/eclipse/paho.mqtt.c.git
cd paho.mqtt.c
make -j$(nproc)
sudo make uninstall # clean up first
sudo make install   # install mosquitto c lib
