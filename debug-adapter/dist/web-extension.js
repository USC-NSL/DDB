var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/events/events.js
var require_events = __commonJS({
  "node_modules/events/events.js"(exports, module2) {
    "use strict";
    var R = typeof Reflect === "object" ? Reflect : null;
    var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
      return Function.prototype.apply.call(target, receiver, args);
    };
    var ReflectOwnKeys;
    if (R && typeof R.ownKeys === "function") {
      ReflectOwnKeys = R.ownKeys;
    } else if (Object.getOwnPropertySymbols) {
      ReflectOwnKeys = function ReflectOwnKeys2(target) {
        return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
      };
    } else {
      ReflectOwnKeys = function ReflectOwnKeys2(target) {
        return Object.getOwnPropertyNames(target);
      };
    }
    function ProcessEmitWarning(warning) {
      if (console && console.warn)
        console.warn(warning);
    }
    var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
      return value !== value;
    };
    function EventEmitter3() {
      EventEmitter3.init.call(this);
    }
    module2.exports = EventEmitter3;
    module2.exports.once = once;
    EventEmitter3.EventEmitter = EventEmitter3;
    EventEmitter3.prototype._events = void 0;
    EventEmitter3.prototype._eventsCount = 0;
    EventEmitter3.prototype._maxListeners = void 0;
    var defaultMaxListeners = 10;
    function checkListener(listener) {
      if (typeof listener !== "function") {
        throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
      }
    }
    Object.defineProperty(EventEmitter3, "defaultMaxListeners", {
      enumerable: true,
      get: function() {
        return defaultMaxListeners;
      },
      set: function(arg) {
        if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
          throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
        }
        defaultMaxListeners = arg;
      }
    });
    EventEmitter3.init = function() {
      if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
        this._events = /* @__PURE__ */ Object.create(null);
        this._eventsCount = 0;
      }
      this._maxListeners = this._maxListeners || void 0;
    };
    EventEmitter3.prototype.setMaxListeners = function setMaxListeners(n) {
      if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
        throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
      }
      this._maxListeners = n;
      return this;
    };
    function _getMaxListeners(that) {
      if (that._maxListeners === void 0)
        return EventEmitter3.defaultMaxListeners;
      return that._maxListeners;
    }
    EventEmitter3.prototype.getMaxListeners = function getMaxListeners() {
      return _getMaxListeners(this);
    };
    EventEmitter3.prototype.emit = function emit(type) {
      var args = [];
      for (var i = 1; i < arguments.length; i++)
        args.push(arguments[i]);
      var doError = type === "error";
      var events = this._events;
      if (events !== void 0)
        doError = doError && events.error === void 0;
      else if (!doError)
        return false;
      if (doError) {
        var er;
        if (args.length > 0)
          er = args[0];
        if (er instanceof Error) {
          throw er;
        }
        var err = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
        err.context = er;
        throw err;
      }
      var handler = events[type];
      if (handler === void 0)
        return false;
      if (typeof handler === "function") {
        ReflectApply(handler, this, args);
      } else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          ReflectApply(listeners[i], this, args);
      }
      return true;
    };
    function _addListener(target, type, listener, prepend) {
      var m;
      var events;
      var existing;
      checkListener(listener);
      events = target._events;
      if (events === void 0) {
        events = target._events = /* @__PURE__ */ Object.create(null);
        target._eventsCount = 0;
      } else {
        if (events.newListener !== void 0) {
          target.emit("newListener", type, listener.listener ? listener.listener : listener);
          events = target._events;
        }
        existing = events[type];
      }
      if (existing === void 0) {
        existing = events[type] = listener;
        ++target._eventsCount;
      } else {
        if (typeof existing === "function") {
          existing = events[type] = prepend ? [listener, existing] : [existing, listener];
        } else if (prepend) {
          existing.unshift(listener);
        } else {
          existing.push(listener);
        }
        m = _getMaxListeners(target);
        if (m > 0 && existing.length > m && !existing.warned) {
          existing.warned = true;
          var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
          w.name = "MaxListenersExceededWarning";
          w.emitter = target;
          w.type = type;
          w.count = existing.length;
          ProcessEmitWarning(w);
        }
      }
      return target;
    }
    EventEmitter3.prototype.addListener = function addListener(type, listener) {
      return _addListener(this, type, listener, false);
    };
    EventEmitter3.prototype.on = EventEmitter3.prototype.addListener;
    EventEmitter3.prototype.prependListener = function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };
    function onceWrapper() {
      if (!this.fired) {
        this.target.removeListener(this.type, this.wrapFn);
        this.fired = true;
        if (arguments.length === 0)
          return this.listener.call(this.target);
        return this.listener.apply(this.target, arguments);
      }
    }
    function _onceWrap(target, type, listener) {
      var state = { fired: false, wrapFn: void 0, target, type, listener };
      var wrapped = onceWrapper.bind(state);
      wrapped.listener = listener;
      state.wrapFn = wrapped;
      return wrapped;
    }
    EventEmitter3.prototype.once = function once2(type, listener) {
      checkListener(listener);
      this.on(type, _onceWrap(this, type, listener));
      return this;
    };
    EventEmitter3.prototype.prependOnceListener = function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };
    EventEmitter3.prototype.removeListener = function removeListener(type, listener) {
      var list, events, position, i, originalListener;
      checkListener(listener);
      events = this._events;
      if (events === void 0)
        return this;
      list = events[type];
      if (list === void 0)
        return this;
      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = /* @__PURE__ */ Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit("removeListener", type, list.listener || listener);
        }
      } else if (typeof list !== "function") {
        position = -1;
        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }
        if (position < 0)
          return this;
        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }
        if (list.length === 1)
          events[type] = list[0];
        if (events.removeListener !== void 0)
          this.emit("removeListener", type, originalListener || listener);
      }
      return this;
    };
    EventEmitter3.prototype.off = EventEmitter3.prototype.removeListener;
    EventEmitter3.prototype.removeAllListeners = function removeAllListeners(type) {
      var listeners, events, i;
      events = this._events;
      if (events === void 0)
        return this;
      if (events.removeListener === void 0) {
        if (arguments.length === 0) {
          this._events = /* @__PURE__ */ Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== void 0) {
          if (--this._eventsCount === 0)
            this._events = /* @__PURE__ */ Object.create(null);
          else
            delete events[type];
        }
        return this;
      }
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === "removeListener")
            continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners("removeListener");
        this._events = /* @__PURE__ */ Object.create(null);
        this._eventsCount = 0;
        return this;
      }
      listeners = events[type];
      if (typeof listeners === "function") {
        this.removeListener(type, listeners);
      } else if (listeners !== void 0) {
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }
      return this;
    };
    function _listeners(target, type, unwrap) {
      var events = target._events;
      if (events === void 0)
        return [];
      var evlistener = events[type];
      if (evlistener === void 0)
        return [];
      if (typeof evlistener === "function")
        return unwrap ? [evlistener.listener || evlistener] : [evlistener];
      return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
    }
    EventEmitter3.prototype.listeners = function listeners(type) {
      return _listeners(this, type, true);
    };
    EventEmitter3.prototype.rawListeners = function rawListeners(type) {
      return _listeners(this, type, false);
    };
    EventEmitter3.listenerCount = function(emitter, type) {
      if (typeof emitter.listenerCount === "function") {
        return emitter.listenerCount(type);
      } else {
        return listenerCount.call(emitter, type);
      }
    };
    EventEmitter3.prototype.listenerCount = listenerCount;
    function listenerCount(type) {
      var events = this._events;
      if (events !== void 0) {
        var evlistener = events[type];
        if (typeof evlistener === "function") {
          return 1;
        } else if (evlistener !== void 0) {
          return evlistener.length;
        }
      }
      return 0;
    }
    EventEmitter3.prototype.eventNames = function eventNames() {
      return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
    };
    function arrayClone(arr, n) {
      var copy = new Array(n);
      for (var i = 0; i < n; ++i)
        copy[i] = arr[i];
      return copy;
    }
    function spliceOne(list, index) {
      for (; index + 1 < list.length; index++)
        list[index] = list[index + 1];
      list.pop();
    }
    function unwrapListeners(arr) {
      var ret = new Array(arr.length);
      for (var i = 0; i < ret.length; ++i) {
        ret[i] = arr[i].listener || arr[i];
      }
      return ret;
    }
    function once(emitter, name) {
      return new Promise(function(resolve, reject) {
        function errorListener(err) {
          emitter.removeListener(name, resolver);
          reject(err);
        }
        function resolver() {
          if (typeof emitter.removeListener === "function") {
            emitter.removeListener("error", errorListener);
          }
          resolve([].slice.call(arguments));
        }
        ;
        eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
        if (name !== "error") {
          addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
        }
      });
    }
    function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
      if (typeof emitter.on === "function") {
        eventTargetAgnosticAddListener(emitter, "error", handler, flags);
      }
    }
    function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
      if (typeof emitter.on === "function") {
        if (flags.once) {
          emitter.once(name, listener);
        } else {
          emitter.on(name, listener);
        }
      } else if (typeof emitter.addEventListener === "function") {
        emitter.addEventListener(name, function wrapListener(arg) {
          if (flags.once) {
            emitter.removeEventListener(name, wrapListener);
          }
          listener(arg);
        });
      } else {
        throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
      }
    }
  }
});

// node_modules/@vscode/debugadapter/lib/messages.js
var require_messages = __commonJS({
  "node_modules/@vscode/debugadapter/lib/messages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Event = exports.Response = exports.Message = void 0;
    var Message = class {
      constructor(type) {
        this.seq = 0;
        this.type = type;
      }
    };
    exports.Message = Message;
    var Response = class extends Message {
      constructor(request, message) {
        super("response");
        this.request_seq = request.seq;
        this.command = request.command;
        if (message) {
          this.success = false;
          this.message = message;
        } else {
          this.success = true;
        }
      }
    };
    exports.Response = Response;
    var Event = class extends Message {
      constructor(event, body) {
        super("event");
        this.event = event;
        if (body) {
          this.body = body;
        }
      }
    };
    exports.Event = Event;
  }
});

// node_modules/@vscode/debugadapter/lib/protocol.js
var require_protocol = __commonJS({
  "node_modules/@vscode/debugadapter/lib/protocol.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ProtocolServer = void 0;
    var ee = require_events();
    var messages_1 = require_messages();
    var Emitter = class {
      get event() {
        if (!this._event) {
          this._event = (listener, thisArg) => {
            this._listener = listener;
            this._this = thisArg;
            let result;
            result = {
              dispose: () => {
                this._listener = void 0;
                this._this = void 0;
              }
            };
            return result;
          };
        }
        return this._event;
      }
      fire(event) {
        if (this._listener) {
          try {
            this._listener.call(this._this, event);
          } catch (e) {
          }
        }
      }
      hasListener() {
        return !!this._listener;
      }
      dispose() {
        this._listener = void 0;
        this._this = void 0;
      }
    };
    var ProtocolServer = class extends ee.EventEmitter {
      constructor() {
        super();
        this._sendMessage = new Emitter();
        this._pendingRequests = /* @__PURE__ */ new Map();
        this.onDidSendMessage = this._sendMessage.event;
      }
      dispose() {
      }
      handleMessage(msg) {
        if (msg.type === "request") {
          this.dispatchRequest(msg);
        } else if (msg.type === "response") {
          const response = msg;
          const clb = this._pendingRequests.get(response.request_seq);
          if (clb) {
            this._pendingRequests.delete(response.request_seq);
            clb(response);
          }
        }
      }
      _isRunningInline() {
        return this._sendMessage && this._sendMessage.hasListener();
      }
      start(inStream, outStream) {
        this._sequence = 1;
        this._writableStream = outStream;
        this._rawData = Buffer.alloc(0);
        inStream.on("data", (data) => this._handleData(data));
        inStream.on("close", () => {
          this._emitEvent(new messages_1.Event("close"));
        });
        inStream.on("error", (error) => {
          this._emitEvent(new messages_1.Event("error", "inStream error: " + (error && error.message)));
        });
        outStream.on("error", (error) => {
          this._emitEvent(new messages_1.Event("error", "outStream error: " + (error && error.message)));
        });
        inStream.resume();
      }
      stop() {
        if (this._writableStream) {
          this._writableStream.end();
        }
      }
      sendEvent(event) {
        this._send("event", event);
      }
      sendResponse(response) {
        if (response.seq > 0) {
          console.error(`attempt to send more than one response for command ${response.command}`);
        } else {
          this._send("response", response);
        }
      }
      sendRequest(command, args, timeout2, cb) {
        const request = {
          command
        };
        if (args && Object.keys(args).length > 0) {
          request.arguments = args;
        }
        this._send("request", request);
        if (cb) {
          this._pendingRequests.set(request.seq, cb);
          const timer = setTimeout(() => {
            clearTimeout(timer);
            const clb = this._pendingRequests.get(request.seq);
            if (clb) {
              this._pendingRequests.delete(request.seq);
              clb(new messages_1.Response(request, "timeout"));
            }
          }, timeout2);
        }
      }
      dispatchRequest(request) {
      }
      _emitEvent(event) {
        this.emit(event.event, event);
      }
      _send(typ, message) {
        message.type = typ;
        message.seq = this._sequence++;
        if (this._writableStream) {
          const json = JSON.stringify(message);
          this._writableStream.write(`Content-Length: ${Buffer.byteLength(json, "utf8")}\r
\r
${json}`, "utf8");
        }
        this._sendMessage.fire(message);
      }
      _handleData(data) {
        this._rawData = Buffer.concat([this._rawData, data]);
        while (true) {
          if (this._contentLength >= 0) {
            if (this._rawData.length >= this._contentLength) {
              const message = this._rawData.toString("utf8", 0, this._contentLength);
              this._rawData = this._rawData.slice(this._contentLength);
              this._contentLength = -1;
              if (message.length > 0) {
                try {
                  let msg = JSON.parse(message);
                  this.handleMessage(msg);
                } catch (e) {
                  this._emitEvent(new messages_1.Event("error", "Error handling data: " + (e && e.message)));
                }
              }
              continue;
            }
          } else {
            const idx = this._rawData.indexOf(ProtocolServer.TWO_CRLF);
            if (idx !== -1) {
              const header = this._rawData.toString("utf8", 0, idx);
              const lines = header.split("\r\n");
              for (let i = 0; i < lines.length; i++) {
                const pair = lines[i].split(/: +/);
                if (pair[0] == "Content-Length") {
                  this._contentLength = +pair[1];
                }
              }
              this._rawData = this._rawData.slice(idx + ProtocolServer.TWO_CRLF.length);
              continue;
            }
          }
          break;
        }
      }
    };
    exports.ProtocolServer = ProtocolServer;
    ProtocolServer.TWO_CRLF = "\r\n\r\n";
  }
});

// node_modules/@vscode/debugadapter/lib/web/runDebugAdapterStub.js
var require_runDebugAdapterStub = __commonJS({
  "node_modules/@vscode/debugadapter/lib/web/runDebugAdapterStub.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.runDebugAdapter = void 0;
    function runDebugAdapter() {
    }
    exports.runDebugAdapter = runDebugAdapter;
  }
});

// node_modules/url/node_modules/punycode/punycode.js
var require_punycode = __commonJS({
  "node_modules/url/node_modules/punycode/punycode.js"(exports, module2) {
    (function(root) {
      var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
      var freeModule = typeof module2 == "object" && module2 && !module2.nodeType && module2;
      var freeGlobal = typeof global == "object" && global;
      if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal) {
        root = freeGlobal;
      }
      var punycode, maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delimiter = "-", regexPunycode = /^xn--/, regexNonASCII = /[^\x20-\x7E]/, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, errors = {
        "overflow": "Overflow: input needs wider integers to process",
        "not-basic": "Illegal input >= 0x80 (not a basic code point)",
        "invalid-input": "Invalid input"
      }, baseMinusTMin = base - tMin, floor = Math.floor, stringFromCharCode = String.fromCharCode, key;
      function error(type) {
        throw RangeError(errors[type]);
      }
      function map(array, fn) {
        var length = array.length;
        var result = [];
        while (length--) {
          result[length] = fn(array[length]);
        }
        return result;
      }
      function mapDomain(string, fn) {
        var parts = string.split("@");
        var result = "";
        if (parts.length > 1) {
          result = parts[0] + "@";
          string = parts[1];
        }
        string = string.replace(regexSeparators, ".");
        var labels = string.split(".");
        var encoded = map(labels, fn).join(".");
        return result + encoded;
      }
      function ucs2decode(string) {
        var output = [], counter = 0, length = string.length, value, extra;
        while (counter < length) {
          value = string.charCodeAt(counter++);
          if (value >= 55296 && value <= 56319 && counter < length) {
            extra = string.charCodeAt(counter++);
            if ((extra & 64512) == 56320) {
              output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
            } else {
              output.push(value);
              counter--;
            }
          } else {
            output.push(value);
          }
        }
        return output;
      }
      function ucs2encode(array) {
        return map(array, function(value) {
          var output = "";
          if (value > 65535) {
            value -= 65536;
            output += stringFromCharCode(value >>> 10 & 1023 | 55296);
            value = 56320 | value & 1023;
          }
          output += stringFromCharCode(value);
          return output;
        }).join("");
      }
      function basicToDigit(codePoint) {
        if (codePoint - 48 < 10) {
          return codePoint - 22;
        }
        if (codePoint - 65 < 26) {
          return codePoint - 65;
        }
        if (codePoint - 97 < 26) {
          return codePoint - 97;
        }
        return base;
      }
      function digitToBasic(digit, flag) {
        return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
      }
      function adapt(delta, numPoints, firstTime) {
        var k = 0;
        delta = firstTime ? floor(delta / damp) : delta >> 1;
        delta += floor(delta / numPoints);
        for (; delta > baseMinusTMin * tMax >> 1; k += base) {
          delta = floor(delta / baseMinusTMin);
        }
        return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
      }
      function decode(input) {
        var output = [], inputLength = input.length, out, i = 0, n = initialN, bias = initialBias, basic, j, index, oldi, w, k, digit, t, baseMinusT;
        basic = input.lastIndexOf(delimiter);
        if (basic < 0) {
          basic = 0;
        }
        for (j = 0; j < basic; ++j) {
          if (input.charCodeAt(j) >= 128) {
            error("not-basic");
          }
          output.push(input.charCodeAt(j));
        }
        for (index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
          for (oldi = i, w = 1, k = base; ; k += base) {
            if (index >= inputLength) {
              error("invalid-input");
            }
            digit = basicToDigit(input.charCodeAt(index++));
            if (digit >= base || digit > floor((maxInt - i) / w)) {
              error("overflow");
            }
            i += digit * w;
            t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
            if (digit < t) {
              break;
            }
            baseMinusT = base - t;
            if (w > floor(maxInt / baseMinusT)) {
              error("overflow");
            }
            w *= baseMinusT;
          }
          out = output.length + 1;
          bias = adapt(i - oldi, out, oldi == 0);
          if (floor(i / out) > maxInt - n) {
            error("overflow");
          }
          n += floor(i / out);
          i %= out;
          output.splice(i++, 0, n);
        }
        return ucs2encode(output);
      }
      function encode(input) {
        var n, delta, handledCPCount, basicLength, bias, j, m, q, k, t, currentValue, output = [], inputLength, handledCPCountPlusOne, baseMinusT, qMinusT;
        input = ucs2decode(input);
        inputLength = input.length;
        n = initialN;
        delta = 0;
        bias = initialBias;
        for (j = 0; j < inputLength; ++j) {
          currentValue = input[j];
          if (currentValue < 128) {
            output.push(stringFromCharCode(currentValue));
          }
        }
        handledCPCount = basicLength = output.length;
        if (basicLength) {
          output.push(delimiter);
        }
        while (handledCPCount < inputLength) {
          for (m = maxInt, j = 0; j < inputLength; ++j) {
            currentValue = input[j];
            if (currentValue >= n && currentValue < m) {
              m = currentValue;
            }
          }
          handledCPCountPlusOne = handledCPCount + 1;
          if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
            error("overflow");
          }
          delta += (m - n) * handledCPCountPlusOne;
          n = m;
          for (j = 0; j < inputLength; ++j) {
            currentValue = input[j];
            if (currentValue < n && ++delta > maxInt) {
              error("overflow");
            }
            if (currentValue == n) {
              for (q = delta, k = base; ; k += base) {
                t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
                if (q < t) {
                  break;
                }
                qMinusT = q - t;
                baseMinusT = base - t;
                output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
                q = floor(qMinusT / baseMinusT);
              }
              output.push(stringFromCharCode(digitToBasic(q, 0)));
              bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
              delta = 0;
              ++handledCPCount;
            }
          }
          ++delta;
          ++n;
        }
        return output.join("");
      }
      function toUnicode(input) {
        return mapDomain(input, function(string) {
          return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
        });
      }
      function toASCII(input) {
        return mapDomain(input, function(string) {
          return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
        });
      }
      punycode = {
        "version": "1.3.2",
        "ucs2": {
          "decode": ucs2decode,
          "encode": ucs2encode
        },
        "decode": decode,
        "encode": encode,
        "toASCII": toASCII,
        "toUnicode": toUnicode
      };
      if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
        define("punycode", function() {
          return punycode;
        });
      } else if (freeExports && freeModule) {
        if (module2.exports == freeExports) {
          freeModule.exports = punycode;
        } else {
          for (key in punycode) {
            punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
          }
        }
      } else {
        root.punycode = punycode;
      }
    })(exports);
  }
});

// node_modules/url/util.js
var require_util = __commonJS({
  "node_modules/url/util.js"(exports, module2) {
    "use strict";
    module2.exports = {
      isString: function(arg) {
        return typeof arg === "string";
      },
      isObject: function(arg) {
        return typeof arg === "object" && arg !== null;
      },
      isNull: function(arg) {
        return arg === null;
      },
      isNullOrUndefined: function(arg) {
        return arg == null;
      }
    };
  }
});

// node_modules/querystring/decode.js
var require_decode = __commonJS({
  "node_modules/querystring/decode.js"(exports, module2) {
    "use strict";
    function hasOwnProperty(obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    }
    module2.exports = function(qs, sep, eq, options) {
      sep = sep || "&";
      eq = eq || "=";
      var obj = {};
      if (typeof qs !== "string" || qs.length === 0) {
        return obj;
      }
      var regexp = /\+/g;
      qs = qs.split(sep);
      var maxKeys = 1e3;
      if (options && typeof options.maxKeys === "number") {
        maxKeys = options.maxKeys;
      }
      var len = qs.length;
      if (maxKeys > 0 && len > maxKeys) {
        len = maxKeys;
      }
      for (var i = 0; i < len; ++i) {
        var x = qs[i].replace(regexp, "%20"), idx = x.indexOf(eq), kstr, vstr, k, v;
        if (idx >= 0) {
          kstr = x.substr(0, idx);
          vstr = x.substr(idx + 1);
        } else {
          kstr = x;
          vstr = "";
        }
        k = decodeURIComponent(kstr);
        v = decodeURIComponent(vstr);
        if (!hasOwnProperty(obj, k)) {
          obj[k] = v;
        } else if (Array.isArray(obj[k])) {
          obj[k].push(v);
        } else {
          obj[k] = [obj[k], v];
        }
      }
      return obj;
    };
  }
});

// node_modules/querystring/encode.js
var require_encode = __commonJS({
  "node_modules/querystring/encode.js"(exports, module2) {
    "use strict";
    var stringifyPrimitive = function(v) {
      switch (typeof v) {
        case "string":
          return v;
        case "boolean":
          return v ? "true" : "false";
        case "number":
          return isFinite(v) ? v : "";
        default:
          return "";
      }
    };
    module2.exports = function(obj, sep, eq, name) {
      sep = sep || "&";
      eq = eq || "=";
      if (obj === null) {
        obj = void 0;
      }
      if (typeof obj === "object") {
        return Object.keys(obj).map(function(k) {
          var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
          if (Array.isArray(obj[k])) {
            return obj[k].map(function(v) {
              return ks + encodeURIComponent(stringifyPrimitive(v));
            }).join(sep);
          } else {
            return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
          }
        }).join(sep);
      }
      if (!name)
        return "";
      return encodeURIComponent(stringifyPrimitive(name)) + eq + encodeURIComponent(stringifyPrimitive(obj));
    };
  }
});

// node_modules/querystring/index.js
var require_querystring = __commonJS({
  "node_modules/querystring/index.js"(exports) {
    "use strict";
    exports.decode = exports.parse = require_decode();
    exports.encode = exports.stringify = require_encode();
  }
});

// node_modules/url/url.js
var require_url = __commonJS({
  "node_modules/url/url.js"(exports) {
    "use strict";
    var punycode = require_punycode();
    var util = require_util();
    exports.parse = urlParse;
    exports.resolve = urlResolve;
    exports.resolveObject = urlResolveObject;
    exports.format = urlFormat;
    exports.Url = Url;
    function Url() {
      this.protocol = null;
      this.slashes = null;
      this.auth = null;
      this.host = null;
      this.port = null;
      this.hostname = null;
      this.hash = null;
      this.search = null;
      this.query = null;
      this.pathname = null;
      this.path = null;
      this.href = null;
    }
    var protocolPattern = /^([a-z0-9.+-]+:)/i;
    var portPattern = /:[0-9]*$/;
    var simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/;
    var delims = ["<", ">", '"', "`", " ", "\r", "\n", "	"];
    var unwise = ["{", "}", "|", "\\", "^", "`"].concat(delims);
    var autoEscape = ["'"].concat(unwise);
    var nonHostChars = ["%", "/", "?", ";", "#"].concat(autoEscape);
    var hostEndingChars = ["/", "?", "#"];
    var hostnameMaxLen = 255;
    var hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/;
    var hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/;
    var unsafeProtocol = {
      "javascript": true,
      "javascript:": true
    };
    var hostlessProtocol = {
      "javascript": true,
      "javascript:": true
    };
    var slashedProtocol = {
      "http": true,
      "https": true,
      "ftp": true,
      "gopher": true,
      "file": true,
      "http:": true,
      "https:": true,
      "ftp:": true,
      "gopher:": true,
      "file:": true
    };
    var querystring = require_querystring();
    function urlParse(url, parseQueryString, slashesDenoteHost) {
      if (url && util.isObject(url) && url instanceof Url)
        return url;
      var u = new Url();
      u.parse(url, parseQueryString, slashesDenoteHost);
      return u;
    }
    Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
      if (!util.isString(url)) {
        throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
      }
      var queryIndex = url.indexOf("?"), splitter = queryIndex !== -1 && queryIndex < url.indexOf("#") ? "?" : "#", uSplit = url.split(splitter), slashRegex = /\\/g;
      uSplit[0] = uSplit[0].replace(slashRegex, "/");
      url = uSplit.join(splitter);
      var rest = url;
      rest = rest.trim();
      if (!slashesDenoteHost && url.split("#").length === 1) {
        var simplePath = simplePathPattern.exec(rest);
        if (simplePath) {
          this.path = rest;
          this.href = rest;
          this.pathname = simplePath[1];
          if (simplePath[2]) {
            this.search = simplePath[2];
            if (parseQueryString) {
              this.query = querystring.parse(this.search.substr(1));
            } else {
              this.query = this.search.substr(1);
            }
          } else if (parseQueryString) {
            this.search = "";
            this.query = {};
          }
          return this;
        }
      }
      var proto = protocolPattern.exec(rest);
      if (proto) {
        proto = proto[0];
        var lowerProto = proto.toLowerCase();
        this.protocol = lowerProto;
        rest = rest.substr(proto.length);
      }
      if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
        var slashes = rest.substr(0, 2) === "//";
        if (slashes && !(proto && hostlessProtocol[proto])) {
          rest = rest.substr(2);
          this.slashes = true;
        }
      }
      if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
        var hostEnd = -1;
        for (var i = 0; i < hostEndingChars.length; i++) {
          var hec = rest.indexOf(hostEndingChars[i]);
          if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
            hostEnd = hec;
        }
        var auth, atSign;
        if (hostEnd === -1) {
          atSign = rest.lastIndexOf("@");
        } else {
          atSign = rest.lastIndexOf("@", hostEnd);
        }
        if (atSign !== -1) {
          auth = rest.slice(0, atSign);
          rest = rest.slice(atSign + 1);
          this.auth = decodeURIComponent(auth);
        }
        hostEnd = -1;
        for (var i = 0; i < nonHostChars.length; i++) {
          var hec = rest.indexOf(nonHostChars[i]);
          if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
            hostEnd = hec;
        }
        if (hostEnd === -1)
          hostEnd = rest.length;
        this.host = rest.slice(0, hostEnd);
        rest = rest.slice(hostEnd);
        this.parseHost();
        this.hostname = this.hostname || "";
        var ipv6Hostname = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
        if (!ipv6Hostname) {
          var hostparts = this.hostname.split(/\./);
          for (var i = 0, l = hostparts.length; i < l; i++) {
            var part = hostparts[i];
            if (!part)
              continue;
            if (!part.match(hostnamePartPattern)) {
              var newpart = "";
              for (var j = 0, k = part.length; j < k; j++) {
                if (part.charCodeAt(j) > 127) {
                  newpart += "x";
                } else {
                  newpart += part[j];
                }
              }
              if (!newpart.match(hostnamePartPattern)) {
                var validParts = hostparts.slice(0, i);
                var notHost = hostparts.slice(i + 1);
                var bit = part.match(hostnamePartStart);
                if (bit) {
                  validParts.push(bit[1]);
                  notHost.unshift(bit[2]);
                }
                if (notHost.length) {
                  rest = "/" + notHost.join(".") + rest;
                }
                this.hostname = validParts.join(".");
                break;
              }
            }
          }
        }
        if (this.hostname.length > hostnameMaxLen) {
          this.hostname = "";
        } else {
          this.hostname = this.hostname.toLowerCase();
        }
        if (!ipv6Hostname) {
          this.hostname = punycode.toASCII(this.hostname);
        }
        var p = this.port ? ":" + this.port : "";
        var h = this.hostname || "";
        this.host = h + p;
        this.href += this.host;
        if (ipv6Hostname) {
          this.hostname = this.hostname.substr(1, this.hostname.length - 2);
          if (rest[0] !== "/") {
            rest = "/" + rest;
          }
        }
      }
      if (!unsafeProtocol[lowerProto]) {
        for (var i = 0, l = autoEscape.length; i < l; i++) {
          var ae = autoEscape[i];
          if (rest.indexOf(ae) === -1)
            continue;
          var esc = encodeURIComponent(ae);
          if (esc === ae) {
            esc = escape(ae);
          }
          rest = rest.split(ae).join(esc);
        }
      }
      var hash = rest.indexOf("#");
      if (hash !== -1) {
        this.hash = rest.substr(hash);
        rest = rest.slice(0, hash);
      }
      var qm = rest.indexOf("?");
      if (qm !== -1) {
        this.search = rest.substr(qm);
        this.query = rest.substr(qm + 1);
        if (parseQueryString) {
          this.query = querystring.parse(this.query);
        }
        rest = rest.slice(0, qm);
      } else if (parseQueryString) {
        this.search = "";
        this.query = {};
      }
      if (rest)
        this.pathname = rest;
      if (slashedProtocol[lowerProto] && this.hostname && !this.pathname) {
        this.pathname = "/";
      }
      if (this.pathname || this.search) {
        var p = this.pathname || "";
        var s = this.search || "";
        this.path = p + s;
      }
      this.href = this.format();
      return this;
    };
    function urlFormat(obj) {
      if (util.isString(obj))
        obj = urlParse(obj);
      if (!(obj instanceof Url))
        return Url.prototype.format.call(obj);
      return obj.format();
    }
    Url.prototype.format = function() {
      var auth = this.auth || "";
      if (auth) {
        auth = encodeURIComponent(auth);
        auth = auth.replace(/%3A/i, ":");
        auth += "@";
      }
      var protocol = this.protocol || "", pathname = this.pathname || "", hash = this.hash || "", host = false, query = "";
      if (this.host) {
        host = auth + this.host;
      } else if (this.hostname) {
        host = auth + (this.hostname.indexOf(":") === -1 ? this.hostname : "[" + this.hostname + "]");
        if (this.port) {
          host += ":" + this.port;
        }
      }
      if (this.query && util.isObject(this.query) && Object.keys(this.query).length) {
        query = querystring.stringify(this.query);
      }
      var search = this.search || query && "?" + query || "";
      if (protocol && protocol.substr(-1) !== ":")
        protocol += ":";
      if (this.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
        host = "//" + (host || "");
        if (pathname && pathname.charAt(0) !== "/")
          pathname = "/" + pathname;
      } else if (!host) {
        host = "";
      }
      if (hash && hash.charAt(0) !== "#")
        hash = "#" + hash;
      if (search && search.charAt(0) !== "?")
        search = "?" + search;
      pathname = pathname.replace(/[?#]/g, function(match) {
        return encodeURIComponent(match);
      });
      search = search.replace("#", "%23");
      return protocol + host + pathname + search + hash;
    };
    function urlResolve(source, relative) {
      return urlParse(source, false, true).resolve(relative);
    }
    Url.prototype.resolve = function(relative) {
      return this.resolveObject(urlParse(relative, false, true)).format();
    };
    function urlResolveObject(source, relative) {
      if (!source)
        return relative;
      return urlParse(source, false, true).resolveObject(relative);
    }
    Url.prototype.resolveObject = function(relative) {
      if (util.isString(relative)) {
        var rel = new Url();
        rel.parse(relative, false, true);
        relative = rel;
      }
      var result = new Url();
      var tkeys = Object.keys(this);
      for (var tk = 0; tk < tkeys.length; tk++) {
        var tkey = tkeys[tk];
        result[tkey] = this[tkey];
      }
      result.hash = relative.hash;
      if (relative.href === "") {
        result.href = result.format();
        return result;
      }
      if (relative.slashes && !relative.protocol) {
        var rkeys = Object.keys(relative);
        for (var rk = 0; rk < rkeys.length; rk++) {
          var rkey = rkeys[rk];
          if (rkey !== "protocol")
            result[rkey] = relative[rkey];
        }
        if (slashedProtocol[result.protocol] && result.hostname && !result.pathname) {
          result.path = result.pathname = "/";
        }
        result.href = result.format();
        return result;
      }
      if (relative.protocol && relative.protocol !== result.protocol) {
        if (!slashedProtocol[relative.protocol]) {
          var keys = Object.keys(relative);
          for (var v = 0; v < keys.length; v++) {
            var k = keys[v];
            result[k] = relative[k];
          }
          result.href = result.format();
          return result;
        }
        result.protocol = relative.protocol;
        if (!relative.host && !hostlessProtocol[relative.protocol]) {
          var relPath = (relative.pathname || "").split("/");
          while (relPath.length && !(relative.host = relPath.shift()))
            ;
          if (!relative.host)
            relative.host = "";
          if (!relative.hostname)
            relative.hostname = "";
          if (relPath[0] !== "")
            relPath.unshift("");
          if (relPath.length < 2)
            relPath.unshift("");
          result.pathname = relPath.join("/");
        } else {
          result.pathname = relative.pathname;
        }
        result.search = relative.search;
        result.query = relative.query;
        result.host = relative.host || "";
        result.auth = relative.auth;
        result.hostname = relative.hostname || relative.host;
        result.port = relative.port;
        if (result.pathname || result.search) {
          var p = result.pathname || "";
          var s = result.search || "";
          result.path = p + s;
        }
        result.slashes = result.slashes || relative.slashes;
        result.href = result.format();
        return result;
      }
      var isSourceAbs = result.pathname && result.pathname.charAt(0) === "/", isRelAbs = relative.host || relative.pathname && relative.pathname.charAt(0) === "/", mustEndAbs = isRelAbs || isSourceAbs || result.host && relative.pathname, removeAllDots = mustEndAbs, srcPath = result.pathname && result.pathname.split("/") || [], relPath = relative.pathname && relative.pathname.split("/") || [], psychotic = result.protocol && !slashedProtocol[result.protocol];
      if (psychotic) {
        result.hostname = "";
        result.port = null;
        if (result.host) {
          if (srcPath[0] === "")
            srcPath[0] = result.host;
          else
            srcPath.unshift(result.host);
        }
        result.host = "";
        if (relative.protocol) {
          relative.hostname = null;
          relative.port = null;
          if (relative.host) {
            if (relPath[0] === "")
              relPath[0] = relative.host;
            else
              relPath.unshift(relative.host);
          }
          relative.host = null;
        }
        mustEndAbs = mustEndAbs && (relPath[0] === "" || srcPath[0] === "");
      }
      if (isRelAbs) {
        result.host = relative.host || relative.host === "" ? relative.host : result.host;
        result.hostname = relative.hostname || relative.hostname === "" ? relative.hostname : result.hostname;
        result.search = relative.search;
        result.query = relative.query;
        srcPath = relPath;
      } else if (relPath.length) {
        if (!srcPath)
          srcPath = [];
        srcPath.pop();
        srcPath = srcPath.concat(relPath);
        result.search = relative.search;
        result.query = relative.query;
      } else if (!util.isNullOrUndefined(relative.search)) {
        if (psychotic) {
          result.hostname = result.host = srcPath.shift();
          var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
          if (authInHost) {
            result.auth = authInHost.shift();
            result.host = result.hostname = authInHost.shift();
          }
        }
        result.search = relative.search;
        result.query = relative.query;
        if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
          result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
        }
        result.href = result.format();
        return result;
      }
      if (!srcPath.length) {
        result.pathname = null;
        if (result.search) {
          result.path = "/" + result.search;
        } else {
          result.path = null;
        }
        result.href = result.format();
        return result;
      }
      var last = srcPath.slice(-1)[0];
      var hasTrailingSlash = (result.host || relative.host || srcPath.length > 1) && (last === "." || last === "..") || last === "";
      var up = 0;
      for (var i = srcPath.length; i >= 0; i--) {
        last = srcPath[i];
        if (last === ".") {
          srcPath.splice(i, 1);
        } else if (last === "..") {
          srcPath.splice(i, 1);
          up++;
        } else if (up) {
          srcPath.splice(i, 1);
          up--;
        }
      }
      if (!mustEndAbs && !removeAllDots) {
        for (; up--; up) {
          srcPath.unshift("..");
        }
      }
      if (mustEndAbs && srcPath[0] !== "" && (!srcPath[0] || srcPath[0].charAt(0) !== "/")) {
        srcPath.unshift("");
      }
      if (hasTrailingSlash && srcPath.join("/").substr(-1) !== "/") {
        srcPath.push("");
      }
      var isAbsolute = srcPath[0] === "" || srcPath[0] && srcPath[0].charAt(0) === "/";
      if (psychotic) {
        result.hostname = result.host = isAbsolute ? "" : srcPath.length ? srcPath.shift() : "";
        var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
        if (authInHost) {
          result.auth = authInHost.shift();
          result.host = result.hostname = authInHost.shift();
        }
      }
      mustEndAbs = mustEndAbs || result.host && srcPath.length;
      if (mustEndAbs && !isAbsolute) {
        srcPath.unshift("");
      }
      if (!srcPath.length) {
        result.pathname = null;
        result.path = null;
      } else {
        result.pathname = srcPath.join("/");
      }
      if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
        result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
      }
      result.auth = relative.auth || result.auth;
      result.slashes = result.slashes || relative.slashes;
      result.href = result.format();
      return result;
    };
    Url.prototype.parseHost = function() {
      var host = this.host;
      var port = portPattern.exec(host);
      if (port) {
        port = port[0];
        if (port !== ":") {
          this.port = port.substr(1);
        }
        host = host.substr(0, host.length - port.length);
      }
      if (host)
        this.hostname = host;
    };
  }
});

// node_modules/@vscode/debugadapter/lib/debugSession.js
var require_debugSession = __commonJS({
  "node_modules/@vscode/debugadapter/lib/debugSession.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DebugSession = exports.ErrorDestination = exports.MemoryEvent = exports.InvalidatedEvent = exports.ProgressEndEvent = exports.ProgressUpdateEvent = exports.ProgressStartEvent = exports.CapabilitiesEvent = exports.LoadedSourceEvent = exports.ModuleEvent = exports.BreakpointEvent = exports.ThreadEvent = exports.OutputEvent = exports.ExitedEvent = exports.TerminatedEvent = exports.InitializedEvent = exports.ContinuedEvent = exports.StoppedEvent = exports.CompletionItem = exports.Module = exports.Breakpoint = exports.Variable = exports.Thread = exports.StackFrame = exports.Scope = exports.Source = void 0;
    var protocol_1 = require_protocol();
    var messages_1 = require_messages();
    var runDebugAdapter_1 = require_runDebugAdapterStub();
    var url_1 = require_url();
    var Source2 = class {
      constructor(name, path, id = 0, origin, data) {
        this.name = name;
        this.path = path;
        this.sourceReference = id;
        if (origin) {
          this.origin = origin;
        }
        if (data) {
          this.adapterData = data;
        }
      }
    };
    exports.Source = Source2;
    var Scope2 = class {
      constructor(name, reference, expensive = false) {
        this.name = name;
        this.variablesReference = reference;
        this.expensive = expensive;
      }
    };
    exports.Scope = Scope2;
    var StackFrame2 = class {
      constructor(i, nm, src, ln = 0, col = 0) {
        this.id = i;
        this.source = src;
        this.line = ln;
        this.column = col;
        this.name = nm;
      }
    };
    exports.StackFrame = StackFrame2;
    var Thread2 = class {
      constructor(id, name) {
        this.id = id;
        if (name) {
          this.name = name;
        } else {
          this.name = "Thread #" + id;
        }
      }
    };
    exports.Thread = Thread2;
    var Variable = class {
      constructor(name, value, ref = 0, indexedVariables, namedVariables) {
        this.name = name;
        this.value = value;
        this.variablesReference = ref;
        if (typeof namedVariables === "number") {
          this.namedVariables = namedVariables;
        }
        if (typeof indexedVariables === "number") {
          this.indexedVariables = indexedVariables;
        }
      }
    };
    exports.Variable = Variable;
    var Breakpoint2 = class {
      constructor(verified, line, column, source) {
        this.verified = verified;
        const e = this;
        if (typeof line === "number") {
          e.line = line;
        }
        if (typeof column === "number") {
          e.column = column;
        }
        if (source) {
          e.source = source;
        }
      }
      setId(id) {
        this.id = id;
      }
    };
    exports.Breakpoint = Breakpoint2;
    var Module = class {
      constructor(id, name) {
        this.id = id;
        this.name = name;
      }
    };
    exports.Module = Module;
    var CompletionItem = class {
      constructor(label, start, length = 0) {
        this.label = label;
        this.start = start;
        this.length = length;
      }
    };
    exports.CompletionItem = CompletionItem;
    var StoppedEvent2 = class extends messages_1.Event {
      constructor(reason, threadId, exceptionText) {
        super("stopped");
        this.body = {
          reason
        };
        if (typeof threadId === "number") {
          this.body.threadId = threadId;
        }
        if (typeof exceptionText === "string") {
          this.body.text = exceptionText;
        }
      }
    };
    exports.StoppedEvent = StoppedEvent2;
    var ContinuedEvent = class extends messages_1.Event {
      constructor(threadId, allThreadsContinued) {
        super("continued");
        this.body = {
          threadId
        };
        if (typeof allThreadsContinued === "boolean") {
          this.body.allThreadsContinued = allThreadsContinued;
        }
      }
    };
    exports.ContinuedEvent = ContinuedEvent;
    var InitializedEvent2 = class extends messages_1.Event {
      constructor() {
        super("initialized");
      }
    };
    exports.InitializedEvent = InitializedEvent2;
    var TerminatedEvent2 = class extends messages_1.Event {
      constructor(restart) {
        super("terminated");
        if (typeof restart === "boolean" || restart) {
          const e = this;
          e.body = {
            restart
          };
        }
      }
    };
    exports.TerminatedEvent = TerminatedEvent2;
    var ExitedEvent = class extends messages_1.Event {
      constructor(exitCode) {
        super("exited");
        this.body = {
          exitCode
        };
      }
    };
    exports.ExitedEvent = ExitedEvent;
    var OutputEvent2 = class extends messages_1.Event {
      constructor(output, category = "console", data) {
        super("output");
        this.body = {
          category,
          output
        };
        if (data !== void 0) {
          this.body.data = data;
        }
      }
    };
    exports.OutputEvent = OutputEvent2;
    var ThreadEvent = class extends messages_1.Event {
      constructor(reason, threadId) {
        super("thread");
        this.body = {
          reason,
          threadId
        };
      }
    };
    exports.ThreadEvent = ThreadEvent;
    var BreakpointEvent2 = class extends messages_1.Event {
      constructor(reason, breakpoint) {
        super("breakpoint");
        this.body = {
          reason,
          breakpoint
        };
      }
    };
    exports.BreakpointEvent = BreakpointEvent2;
    var ModuleEvent = class extends messages_1.Event {
      constructor(reason, module3) {
        super("module");
        this.body = {
          reason,
          module: module3
        };
      }
    };
    exports.ModuleEvent = ModuleEvent;
    var LoadedSourceEvent = class extends messages_1.Event {
      constructor(reason, source) {
        super("loadedSource");
        this.body = {
          reason,
          source
        };
      }
    };
    exports.LoadedSourceEvent = LoadedSourceEvent;
    var CapabilitiesEvent = class extends messages_1.Event {
      constructor(capabilities) {
        super("capabilities");
        this.body = {
          capabilities
        };
      }
    };
    exports.CapabilitiesEvent = CapabilitiesEvent;
    var ProgressStartEvent2 = class extends messages_1.Event {
      constructor(progressId, title, message) {
        super("progressStart");
        this.body = {
          progressId,
          title
        };
        if (typeof message === "string") {
          this.body.message = message;
        }
      }
    };
    exports.ProgressStartEvent = ProgressStartEvent2;
    var ProgressUpdateEvent2 = class extends messages_1.Event {
      constructor(progressId, message) {
        super("progressUpdate");
        this.body = {
          progressId
        };
        if (typeof message === "string") {
          this.body.message = message;
        }
      }
    };
    exports.ProgressUpdateEvent = ProgressUpdateEvent2;
    var ProgressEndEvent2 = class extends messages_1.Event {
      constructor(progressId, message) {
        super("progressEnd");
        this.body = {
          progressId
        };
        if (typeof message === "string") {
          this.body.message = message;
        }
      }
    };
    exports.ProgressEndEvent = ProgressEndEvent2;
    var InvalidatedEvent2 = class extends messages_1.Event {
      constructor(areas, threadId, stackFrameId) {
        super("invalidated");
        this.body = {};
        if (areas) {
          this.body.areas = areas;
        }
        if (threadId) {
          this.body.threadId = threadId;
        }
        if (stackFrameId) {
          this.body.stackFrameId = stackFrameId;
        }
      }
    };
    exports.InvalidatedEvent = InvalidatedEvent2;
    var MemoryEvent2 = class extends messages_1.Event {
      constructor(memoryReference, offset, count) {
        super("memory");
        this.body = { memoryReference, offset, count };
      }
    };
    exports.MemoryEvent = MemoryEvent2;
    var ErrorDestination;
    (function(ErrorDestination2) {
      ErrorDestination2[ErrorDestination2["User"] = 1] = "User";
      ErrorDestination2[ErrorDestination2["Telemetry"] = 2] = "Telemetry";
    })(ErrorDestination = exports.ErrorDestination || (exports.ErrorDestination = {}));
    var DebugSession = class extends protocol_1.ProtocolServer {
      constructor(obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer) {
        super();
        const linesAndColumnsStartAt1 = typeof obsolete_debuggerLinesAndColumnsStartAt1 === "boolean" ? obsolete_debuggerLinesAndColumnsStartAt1 : false;
        this._debuggerLinesStartAt1 = linesAndColumnsStartAt1;
        this._debuggerColumnsStartAt1 = linesAndColumnsStartAt1;
        this._debuggerPathsAreURIs = false;
        this._clientLinesStartAt1 = true;
        this._clientColumnsStartAt1 = true;
        this._clientPathsAreURIs = false;
        this._isServer = typeof obsolete_isServer === "boolean" ? obsolete_isServer : false;
        this.on("close", () => {
          this.shutdown();
        });
        this.on("error", (error) => {
          this.shutdown();
        });
      }
      setDebuggerPathFormat(format) {
        this._debuggerPathsAreURIs = format !== "path";
      }
      setDebuggerLinesStartAt1(enable) {
        this._debuggerLinesStartAt1 = enable;
      }
      setDebuggerColumnsStartAt1(enable) {
        this._debuggerColumnsStartAt1 = enable;
      }
      setRunAsServer(enable) {
        this._isServer = enable;
      }
      static run(debugSession) {
        (0, runDebugAdapter_1.runDebugAdapter)(debugSession);
      }
      shutdown() {
        if (this._isServer || this._isRunningInline()) {
        } else {
          setTimeout(() => {
            process.exit(0);
          }, 100);
        }
      }
      sendErrorResponse(response, codeOrMessage, format, variables, dest = ErrorDestination.User) {
        let msg;
        if (typeof codeOrMessage === "number") {
          msg = {
            id: codeOrMessage,
            format
          };
          if (variables) {
            msg.variables = variables;
          }
          if (dest & ErrorDestination.User) {
            msg.showUser = true;
          }
          if (dest & ErrorDestination.Telemetry) {
            msg.sendTelemetry = true;
          }
        } else {
          msg = codeOrMessage;
        }
        response.success = false;
        response.message = DebugSession.formatPII(msg.format, true, msg.variables);
        if (!response.body) {
          response.body = {};
        }
        response.body.error = msg;
        this.sendResponse(response);
      }
      runInTerminalRequest(args, timeout2, cb) {
        this.sendRequest("runInTerminal", args, timeout2, cb);
      }
      dispatchRequest(request) {
        const response = new messages_1.Response(request);
        try {
          if (request.command === "initialize") {
            var args = request.arguments;
            if (typeof args.linesStartAt1 === "boolean") {
              this._clientLinesStartAt1 = args.linesStartAt1;
            }
            if (typeof args.columnsStartAt1 === "boolean") {
              this._clientColumnsStartAt1 = args.columnsStartAt1;
            }
            if (args.pathFormat !== "path") {
              this.sendErrorResponse(response, 2018, "debug adapter only supports native paths", null, ErrorDestination.Telemetry);
            } else {
              const initializeResponse = response;
              initializeResponse.body = {};
              this.initializeRequest(initializeResponse, args);
            }
          } else if (request.command === "launch") {
            this.launchRequest(response, request.arguments, request);
          } else if (request.command === "attach") {
            this.attachRequest(response, request.arguments, request);
          } else if (request.command === "disconnect") {
            this.disconnectRequest(response, request.arguments, request);
          } else if (request.command === "terminate") {
            this.terminateRequest(response, request.arguments, request);
          } else if (request.command === "restart") {
            this.restartRequest(response, request.arguments, request);
          } else if (request.command === "setBreakpoints") {
            this.setBreakPointsRequest(response, request.arguments, request);
          } else if (request.command === "setFunctionBreakpoints") {
            this.setFunctionBreakPointsRequest(response, request.arguments, request);
          } else if (request.command === "setExceptionBreakpoints") {
            this.setExceptionBreakPointsRequest(response, request.arguments, request);
          } else if (request.command === "configurationDone") {
            this.configurationDoneRequest(response, request.arguments, request);
          } else if (request.command === "continue") {
            this.continueRequest(response, request.arguments, request);
          } else if (request.command === "next") {
            this.nextRequest(response, request.arguments, request);
          } else if (request.command === "stepIn") {
            this.stepInRequest(response, request.arguments, request);
          } else if (request.command === "stepOut") {
            this.stepOutRequest(response, request.arguments, request);
          } else if (request.command === "stepBack") {
            this.stepBackRequest(response, request.arguments, request);
          } else if (request.command === "reverseContinue") {
            this.reverseContinueRequest(response, request.arguments, request);
          } else if (request.command === "restartFrame") {
            this.restartFrameRequest(response, request.arguments, request);
          } else if (request.command === "goto") {
            this.gotoRequest(response, request.arguments, request);
          } else if (request.command === "pause") {
            this.pauseRequest(response, request.arguments, request);
          } else if (request.command === "stackTrace") {
            this.stackTraceRequest(response, request.arguments, request);
          } else if (request.command === "scopes") {
            this.scopesRequest(response, request.arguments, request);
          } else if (request.command === "variables") {
            this.variablesRequest(response, request.arguments, request);
          } else if (request.command === "setVariable") {
            this.setVariableRequest(response, request.arguments, request);
          } else if (request.command === "setExpression") {
            this.setExpressionRequest(response, request.arguments, request);
          } else if (request.command === "source") {
            this.sourceRequest(response, request.arguments, request);
          } else if (request.command === "threads") {
            this.threadsRequest(response, request);
          } else if (request.command === "terminateThreads") {
            this.terminateThreadsRequest(response, request.arguments, request);
          } else if (request.command === "evaluate") {
            this.evaluateRequest(response, request.arguments, request);
          } else if (request.command === "stepInTargets") {
            this.stepInTargetsRequest(response, request.arguments, request);
          } else if (request.command === "gotoTargets") {
            this.gotoTargetsRequest(response, request.arguments, request);
          } else if (request.command === "completions") {
            this.completionsRequest(response, request.arguments, request);
          } else if (request.command === "exceptionInfo") {
            this.exceptionInfoRequest(response, request.arguments, request);
          } else if (request.command === "loadedSources") {
            this.loadedSourcesRequest(response, request.arguments, request);
          } else if (request.command === "dataBreakpointInfo") {
            this.dataBreakpointInfoRequest(response, request.arguments, request);
          } else if (request.command === "setDataBreakpoints") {
            this.setDataBreakpointsRequest(response, request.arguments, request);
          } else if (request.command === "readMemory") {
            this.readMemoryRequest(response, request.arguments, request);
          } else if (request.command === "writeMemory") {
            this.writeMemoryRequest(response, request.arguments, request);
          } else if (request.command === "disassemble") {
            this.disassembleRequest(response, request.arguments, request);
          } else if (request.command === "cancel") {
            this.cancelRequest(response, request.arguments, request);
          } else if (request.command === "breakpointLocations") {
            this.breakpointLocationsRequest(response, request.arguments, request);
          } else if (request.command === "setInstructionBreakpoints") {
            this.setInstructionBreakpointsRequest(response, request.arguments, request);
          } else {
            this.customRequest(request.command, response, request.arguments, request);
          }
        } catch (e) {
          this.sendErrorResponse(response, 1104, "{_stack}", { _exception: e.message, _stack: e.stack }, ErrorDestination.Telemetry);
        }
      }
      initializeRequest(response, args) {
        response.body.supportsConditionalBreakpoints = false;
        response.body.supportsHitConditionalBreakpoints = false;
        response.body.supportsFunctionBreakpoints = false;
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsEvaluateForHovers = false;
        response.body.supportsStepBack = false;
        response.body.supportsSetVariable = false;
        response.body.supportsRestartFrame = false;
        response.body.supportsStepInTargetsRequest = false;
        response.body.supportsGotoTargetsRequest = false;
        response.body.supportsCompletionsRequest = false;
        response.body.supportsRestartRequest = false;
        response.body.supportsExceptionOptions = false;
        response.body.supportsValueFormattingOptions = false;
        response.body.supportsExceptionInfoRequest = false;
        response.body.supportTerminateDebuggee = false;
        response.body.supportsDelayedStackTraceLoading = false;
        response.body.supportsLoadedSourcesRequest = false;
        response.body.supportsLogPoints = false;
        response.body.supportsTerminateThreadsRequest = false;
        response.body.supportsSetExpression = false;
        response.body.supportsTerminateRequest = false;
        response.body.supportsDataBreakpoints = false;
        response.body.supportsReadMemoryRequest = false;
        response.body.supportsDisassembleRequest = false;
        response.body.supportsCancelRequest = false;
        response.body.supportsBreakpointLocationsRequest = false;
        response.body.supportsClipboardContext = false;
        response.body.supportsSteppingGranularity = false;
        response.body.supportsInstructionBreakpoints = false;
        response.body.supportsExceptionFilterOptions = false;
        this.sendResponse(response);
      }
      disconnectRequest(response, args, request) {
        this.sendResponse(response);
        this.shutdown();
      }
      launchRequest(response, args, request) {
        this.sendResponse(response);
      }
      attachRequest(response, args, request) {
        this.sendResponse(response);
      }
      terminateRequest(response, args, request) {
        this.sendResponse(response);
      }
      restartRequest(response, args, request) {
        this.sendResponse(response);
      }
      setBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      setFunctionBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      setExceptionBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      configurationDoneRequest(response, args, request) {
        this.sendResponse(response);
      }
      continueRequest(response, args, request) {
        this.sendResponse(response);
      }
      nextRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepInRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepOutRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepBackRequest(response, args, request) {
        this.sendResponse(response);
      }
      reverseContinueRequest(response, args, request) {
        this.sendResponse(response);
      }
      restartFrameRequest(response, args, request) {
        this.sendResponse(response);
      }
      gotoRequest(response, args, request) {
        this.sendResponse(response);
      }
      pauseRequest(response, args, request) {
        this.sendResponse(response);
      }
      sourceRequest(response, args, request) {
        this.sendResponse(response);
      }
      threadsRequest(response, request) {
        this.sendResponse(response);
      }
      terminateThreadsRequest(response, args, request) {
        this.sendResponse(response);
      }
      stackTraceRequest(response, args, request) {
        this.sendResponse(response);
      }
      scopesRequest(response, args, request) {
        this.sendResponse(response);
      }
      variablesRequest(response, args, request) {
        this.sendResponse(response);
      }
      setVariableRequest(response, args, request) {
        this.sendResponse(response);
      }
      setExpressionRequest(response, args, request) {
        this.sendResponse(response);
      }
      evaluateRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepInTargetsRequest(response, args, request) {
        this.sendResponse(response);
      }
      gotoTargetsRequest(response, args, request) {
        this.sendResponse(response);
      }
      completionsRequest(response, args, request) {
        this.sendResponse(response);
      }
      exceptionInfoRequest(response, args, request) {
        this.sendResponse(response);
      }
      loadedSourcesRequest(response, args, request) {
        this.sendResponse(response);
      }
      dataBreakpointInfoRequest(response, args, request) {
        this.sendResponse(response);
      }
      setDataBreakpointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      readMemoryRequest(response, args, request) {
        this.sendResponse(response);
      }
      writeMemoryRequest(response, args, request) {
        this.sendResponse(response);
      }
      disassembleRequest(response, args, request) {
        this.sendResponse(response);
      }
      cancelRequest(response, args, request) {
        this.sendResponse(response);
      }
      breakpointLocationsRequest(response, args, request) {
        this.sendResponse(response);
      }
      setInstructionBreakpointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      customRequest(command, response, args, request) {
        this.sendErrorResponse(response, 1014, "unrecognized request", null, ErrorDestination.Telemetry);
      }
      convertClientLineToDebugger(line) {
        if (this._debuggerLinesStartAt1) {
          return this._clientLinesStartAt1 ? line : line + 1;
        }
        return this._clientLinesStartAt1 ? line - 1 : line;
      }
      convertDebuggerLineToClient(line) {
        if (this._debuggerLinesStartAt1) {
          return this._clientLinesStartAt1 ? line : line - 1;
        }
        return this._clientLinesStartAt1 ? line + 1 : line;
      }
      convertClientColumnToDebugger(column) {
        if (this._debuggerColumnsStartAt1) {
          return this._clientColumnsStartAt1 ? column : column + 1;
        }
        return this._clientColumnsStartAt1 ? column - 1 : column;
      }
      convertDebuggerColumnToClient(column) {
        if (this._debuggerColumnsStartAt1) {
          return this._clientColumnsStartAt1 ? column : column - 1;
        }
        return this._clientColumnsStartAt1 ? column + 1 : column;
      }
      convertClientPathToDebugger(clientPath) {
        if (this._clientPathsAreURIs !== this._debuggerPathsAreURIs) {
          if (this._clientPathsAreURIs) {
            return DebugSession.uri2path(clientPath);
          } else {
            return DebugSession.path2uri(clientPath);
          }
        }
        return clientPath;
      }
      convertDebuggerPathToClient(debuggerPath) {
        if (this._debuggerPathsAreURIs !== this._clientPathsAreURIs) {
          if (this._debuggerPathsAreURIs) {
            return DebugSession.uri2path(debuggerPath);
          } else {
            return DebugSession.path2uri(debuggerPath);
          }
        }
        return debuggerPath;
      }
      static path2uri(path) {
        if (process.platform === "win32") {
          if (/^[A-Z]:/.test(path)) {
            path = path[0].toLowerCase() + path.substr(1);
          }
          path = path.replace(/\\/g, "/");
        }
        path = encodeURI(path);
        let uri = new url_1.URL(`file:`);
        uri.pathname = path;
        return uri.toString();
      }
      static uri2path(sourceUri) {
        let uri = new url_1.URL(sourceUri);
        let s = decodeURIComponent(uri.pathname);
        if (process.platform === "win32") {
          if (/^\/[a-zA-Z]:/.test(s)) {
            s = s[1].toLowerCase() + s.substr(2);
          }
          s = s.replace(/\//g, "\\");
        }
        return s;
      }
      static formatPII(format, excludePII, args) {
        return format.replace(DebugSession._formatPIIRegexp, function(match, paramName) {
          if (excludePII && paramName.length > 0 && paramName[0] !== "_") {
            return match;
          }
          return args[paramName] && args.hasOwnProperty(paramName) ? args[paramName] : match;
        });
      }
    };
    exports.DebugSession = DebugSession;
    DebugSession._formatPIIRegexp = /{([^}]+)}/g;
  }
});

// node_modules/@vscode/debugadapter/lib/web/internalLoggerStub.js
var require_internalLoggerStub = __commonJS({
  "node_modules/@vscode/debugadapter/lib/web/internalLoggerStub.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InternalLogger = void 0;
    var InternalLogger = class {
      dispose() {
        return void 0;
      }
      log(msg, level, prependTimestamp) {
      }
      setup(options) {
        return void 0;
      }
    };
    exports.InternalLogger = InternalLogger;
  }
});

// node_modules/@vscode/debugadapter/lib/logger.js
var require_logger = __commonJS({
  "node_modules/@vscode/debugadapter/lib/logger.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.trimLastNewline = exports.LogOutputEvent = exports.logger = exports.Logger = exports.LogLevel = void 0;
    var internalLogger_1 = require_internalLoggerStub();
    var debugSession_1 = require_debugSession();
    var LogLevel;
    (function(LogLevel2) {
      LogLevel2[LogLevel2["Verbose"] = 0] = "Verbose";
      LogLevel2[LogLevel2["Log"] = 1] = "Log";
      LogLevel2[LogLevel2["Warn"] = 2] = "Warn";
      LogLevel2[LogLevel2["Error"] = 3] = "Error";
      LogLevel2[LogLevel2["Stop"] = 4] = "Stop";
    })(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
    var Logger2 = class {
      constructor() {
        this._pendingLogQ = [];
      }
      log(msg, level = LogLevel.Log) {
        msg = msg + "\n";
        this._write(msg, level);
      }
      verbose(msg) {
        this.log(msg, LogLevel.Verbose);
      }
      warn(msg) {
        this.log(msg, LogLevel.Warn);
      }
      error(msg) {
        this.log(msg, LogLevel.Error);
      }
      dispose() {
        if (this._currentLogger) {
          const disposeP = this._currentLogger.dispose();
          this._currentLogger = null;
          return disposeP;
        } else {
          return Promise.resolve();
        }
      }
      _write(msg, level = LogLevel.Log) {
        msg = msg + "";
        if (this._pendingLogQ) {
          this._pendingLogQ.push({ msg, level });
        } else if (this._currentLogger) {
          this._currentLogger.log(msg, level);
        }
      }
      setup(consoleMinLogLevel, _logFilePath, prependTimestamp = true) {
        const logFilePath = typeof _logFilePath === "string" ? _logFilePath : _logFilePath && this._logFilePathFromInit;
        if (this._currentLogger) {
          const options = {
            consoleMinLogLevel,
            logFilePath,
            prependTimestamp
          };
          this._currentLogger.setup(options).then(() => {
            if (this._pendingLogQ) {
              const logQ = this._pendingLogQ;
              this._pendingLogQ = null;
              logQ.forEach((item) => this._write(item.msg, item.level));
            }
          });
        }
      }
      init(logCallback, logFilePath, logToConsole) {
        this._pendingLogQ = this._pendingLogQ || [];
        this._currentLogger = new internalLogger_1.InternalLogger(logCallback, logToConsole);
        this._logFilePathFromInit = logFilePath;
      }
    };
    exports.Logger = Logger2;
    exports.logger = new Logger2();
    var LogOutputEvent = class extends debugSession_1.OutputEvent {
      constructor(msg, level) {
        const category = level === LogLevel.Error ? "stderr" : level === LogLevel.Warn ? "console" : "stdout";
        super(msg, category);
      }
    };
    exports.LogOutputEvent = LogOutputEvent;
    function trimLastNewline(str) {
      return str.replace(/(\n|\r\n)$/, "");
    }
    exports.trimLastNewline = trimLastNewline;
  }
});

// node_modules/@vscode/debugadapter/lib/loggingDebugSession.js
var require_loggingDebugSession = __commonJS({
  "node_modules/@vscode/debugadapter/lib/loggingDebugSession.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LoggingDebugSession = void 0;
    var Logger2 = require_logger();
    var logger2 = Logger2.logger;
    var debugSession_1 = require_debugSession();
    var LoggingDebugSession2 = class extends debugSession_1.DebugSession {
      constructor(obsolete_logFilePath, obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer) {
        super(obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer);
        this.obsolete_logFilePath = obsolete_logFilePath;
        this.on("error", (event) => {
          logger2.error(event.body);
        });
      }
      start(inStream, outStream) {
        super.start(inStream, outStream);
        logger2.init((e) => this.sendEvent(e), this.obsolete_logFilePath, this._isServer);
      }
      sendEvent(event) {
        if (!(event instanceof Logger2.LogOutputEvent)) {
          let objectToLog = event;
          if (event instanceof debugSession_1.OutputEvent && event.body && event.body.data && event.body.data.doNotLogOutput) {
            delete event.body.data.doNotLogOutput;
            objectToLog = { ...event };
            objectToLog.body = { ...event.body, output: "<output not logged>" };
          }
          logger2.verbose(`To client: ${JSON.stringify(objectToLog)}`);
        }
        super.sendEvent(event);
      }
      sendRequest(command, args, timeout2, cb) {
        logger2.verbose(`To client: ${JSON.stringify(command)}(${JSON.stringify(args)}), timeout: ${timeout2}`);
        super.sendRequest(command, args, timeout2, cb);
      }
      sendResponse(response) {
        logger2.verbose(`To client: ${JSON.stringify(response)}`);
        super.sendResponse(response);
      }
      dispatchRequest(request) {
        logger2.verbose(`From client: ${request.command}(${JSON.stringify(request.arguments)})`);
        super.dispatchRequest(request);
      }
    };
    exports.LoggingDebugSession = LoggingDebugSession2;
  }
});

// node_modules/@vscode/debugadapter/lib/handles.js
var require_handles = __commonJS({
  "node_modules/@vscode/debugadapter/lib/handles.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Handles = void 0;
    var Handles2 = class {
      constructor(startHandle) {
        this.START_HANDLE = 1e3;
        this._handleMap = /* @__PURE__ */ new Map();
        this._nextHandle = typeof startHandle === "number" ? startHandle : this.START_HANDLE;
      }
      reset() {
        this._nextHandle = this.START_HANDLE;
        this._handleMap = /* @__PURE__ */ new Map();
      }
      create(value) {
        var handle = this._nextHandle++;
        this._handleMap.set(handle, value);
        return handle;
      }
      get(handle, dflt) {
        return this._handleMap.get(handle) || dflt;
      }
    };
    exports.Handles = Handles2;
  }
});

// node_modules/@vscode/debugadapter/lib/main.js
var require_main = __commonJS({
  "node_modules/@vscode/debugadapter/lib/main.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Handles = exports.Response = exports.Event = exports.ErrorDestination = exports.CompletionItem = exports.Module = exports.Source = exports.Breakpoint = exports.Variable = exports.Scope = exports.StackFrame = exports.Thread = exports.MemoryEvent = exports.InvalidatedEvent = exports.ProgressEndEvent = exports.ProgressUpdateEvent = exports.ProgressStartEvent = exports.CapabilitiesEvent = exports.LoadedSourceEvent = exports.ModuleEvent = exports.BreakpointEvent = exports.ThreadEvent = exports.OutputEvent = exports.ContinuedEvent = exports.StoppedEvent = exports.ExitedEvent = exports.TerminatedEvent = exports.InitializedEvent = exports.logger = exports.Logger = exports.LoggingDebugSession = exports.DebugSession = void 0;
    var debugSession_1 = require_debugSession();
    Object.defineProperty(exports, "DebugSession", { enumerable: true, get: function() {
      return debugSession_1.DebugSession;
    } });
    Object.defineProperty(exports, "InitializedEvent", { enumerable: true, get: function() {
      return debugSession_1.InitializedEvent;
    } });
    Object.defineProperty(exports, "TerminatedEvent", { enumerable: true, get: function() {
      return debugSession_1.TerminatedEvent;
    } });
    Object.defineProperty(exports, "ExitedEvent", { enumerable: true, get: function() {
      return debugSession_1.ExitedEvent;
    } });
    Object.defineProperty(exports, "StoppedEvent", { enumerable: true, get: function() {
      return debugSession_1.StoppedEvent;
    } });
    Object.defineProperty(exports, "ContinuedEvent", { enumerable: true, get: function() {
      return debugSession_1.ContinuedEvent;
    } });
    Object.defineProperty(exports, "OutputEvent", { enumerable: true, get: function() {
      return debugSession_1.OutputEvent;
    } });
    Object.defineProperty(exports, "ThreadEvent", { enumerable: true, get: function() {
      return debugSession_1.ThreadEvent;
    } });
    Object.defineProperty(exports, "BreakpointEvent", { enumerable: true, get: function() {
      return debugSession_1.BreakpointEvent;
    } });
    Object.defineProperty(exports, "ModuleEvent", { enumerable: true, get: function() {
      return debugSession_1.ModuleEvent;
    } });
    Object.defineProperty(exports, "LoadedSourceEvent", { enumerable: true, get: function() {
      return debugSession_1.LoadedSourceEvent;
    } });
    Object.defineProperty(exports, "CapabilitiesEvent", { enumerable: true, get: function() {
      return debugSession_1.CapabilitiesEvent;
    } });
    Object.defineProperty(exports, "ProgressStartEvent", { enumerable: true, get: function() {
      return debugSession_1.ProgressStartEvent;
    } });
    Object.defineProperty(exports, "ProgressUpdateEvent", { enumerable: true, get: function() {
      return debugSession_1.ProgressUpdateEvent;
    } });
    Object.defineProperty(exports, "ProgressEndEvent", { enumerable: true, get: function() {
      return debugSession_1.ProgressEndEvent;
    } });
    Object.defineProperty(exports, "InvalidatedEvent", { enumerable: true, get: function() {
      return debugSession_1.InvalidatedEvent;
    } });
    Object.defineProperty(exports, "MemoryEvent", { enumerable: true, get: function() {
      return debugSession_1.MemoryEvent;
    } });
    Object.defineProperty(exports, "Thread", { enumerable: true, get: function() {
      return debugSession_1.Thread;
    } });
    Object.defineProperty(exports, "StackFrame", { enumerable: true, get: function() {
      return debugSession_1.StackFrame;
    } });
    Object.defineProperty(exports, "Scope", { enumerable: true, get: function() {
      return debugSession_1.Scope;
    } });
    Object.defineProperty(exports, "Variable", { enumerable: true, get: function() {
      return debugSession_1.Variable;
    } });
    Object.defineProperty(exports, "Breakpoint", { enumerable: true, get: function() {
      return debugSession_1.Breakpoint;
    } });
    Object.defineProperty(exports, "Source", { enumerable: true, get: function() {
      return debugSession_1.Source;
    } });
    Object.defineProperty(exports, "Module", { enumerable: true, get: function() {
      return debugSession_1.Module;
    } });
    Object.defineProperty(exports, "CompletionItem", { enumerable: true, get: function() {
      return debugSession_1.CompletionItem;
    } });
    Object.defineProperty(exports, "ErrorDestination", { enumerable: true, get: function() {
      return debugSession_1.ErrorDestination;
    } });
    var loggingDebugSession_1 = require_loggingDebugSession();
    Object.defineProperty(exports, "LoggingDebugSession", { enumerable: true, get: function() {
      return loggingDebugSession_1.LoggingDebugSession;
    } });
    var Logger2 = require_logger();
    exports.Logger = Logger2;
    var messages_1 = require_messages();
    Object.defineProperty(exports, "Event", { enumerable: true, get: function() {
      return messages_1.Event;
    } });
    Object.defineProperty(exports, "Response", { enumerable: true, get: function() {
      return messages_1.Response;
    } });
    var handles_1 = require_handles();
    Object.defineProperty(exports, "Handles", { enumerable: true, get: function() {
      return handles_1.Handles;
    } });
    var logger2 = Logger2.logger;
    exports.logger = logger2;
  }
});

// node_modules/path-browserify/index.js
var require_path_browserify = __commonJS({
  "node_modules/path-browserify/index.js"(exports, module2) {
    "use strict";
    function assertPath(path) {
      if (typeof path !== "string") {
        throw new TypeError("Path must be a string. Received " + JSON.stringify(path));
      }
    }
    function normalizeStringPosix(path, allowAboveRoot) {
      var res = "";
      var lastSegmentLength = 0;
      var lastSlash = -1;
      var dots = 0;
      var code;
      for (var i = 0; i <= path.length; ++i) {
        if (i < path.length)
          code = path.charCodeAt(i);
        else if (code === 47)
          break;
        else
          code = 47;
        if (code === 47) {
          if (lastSlash === i - 1 || dots === 1) {
          } else if (lastSlash !== i - 1 && dots === 2) {
            if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
              if (res.length > 2) {
                var lastSlashIndex = res.lastIndexOf("/");
                if (lastSlashIndex !== res.length - 1) {
                  if (lastSlashIndex === -1) {
                    res = "";
                    lastSegmentLength = 0;
                  } else {
                    res = res.slice(0, lastSlashIndex);
                    lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
                  }
                  lastSlash = i;
                  dots = 0;
                  continue;
                }
              } else if (res.length === 2 || res.length === 1) {
                res = "";
                lastSegmentLength = 0;
                lastSlash = i;
                dots = 0;
                continue;
              }
            }
            if (allowAboveRoot) {
              if (res.length > 0)
                res += "/..";
              else
                res = "..";
              lastSegmentLength = 2;
            }
          } else {
            if (res.length > 0)
              res += "/" + path.slice(lastSlash + 1, i);
            else
              res = path.slice(lastSlash + 1, i);
            lastSegmentLength = i - lastSlash - 1;
          }
          lastSlash = i;
          dots = 0;
        } else if (code === 46 && dots !== -1) {
          ++dots;
        } else {
          dots = -1;
        }
      }
      return res;
    }
    function _format(sep, pathObject) {
      var dir = pathObject.dir || pathObject.root;
      var base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
      if (!dir) {
        return base;
      }
      if (dir === pathObject.root) {
        return dir + base;
      }
      return dir + sep + base;
    }
    var posix = {
      resolve: function resolve() {
        var resolvedPath = "";
        var resolvedAbsolute = false;
        var cwd;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path;
          if (i >= 0)
            path = arguments[i];
          else {
            if (cwd === void 0)
              cwd = process.cwd();
            path = cwd;
          }
          assertPath(path);
          if (path.length === 0) {
            continue;
          }
          resolvedPath = path + "/" + resolvedPath;
          resolvedAbsolute = path.charCodeAt(0) === 47;
        }
        resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
        if (resolvedAbsolute) {
          if (resolvedPath.length > 0)
            return "/" + resolvedPath;
          else
            return "/";
        } else if (resolvedPath.length > 0) {
          return resolvedPath;
        } else {
          return ".";
        }
      },
      normalize: function normalize(path) {
        assertPath(path);
        if (path.length === 0)
          return ".";
        var isAbsolute = path.charCodeAt(0) === 47;
        var trailingSeparator = path.charCodeAt(path.length - 1) === 47;
        path = normalizeStringPosix(path, !isAbsolute);
        if (path.length === 0 && !isAbsolute)
          path = ".";
        if (path.length > 0 && trailingSeparator)
          path += "/";
        if (isAbsolute)
          return "/" + path;
        return path;
      },
      isAbsolute: function isAbsolute(path) {
        assertPath(path);
        return path.length > 0 && path.charCodeAt(0) === 47;
      },
      join: function join() {
        if (arguments.length === 0)
          return ".";
        var joined;
        for (var i = 0; i < arguments.length; ++i) {
          var arg = arguments[i];
          assertPath(arg);
          if (arg.length > 0) {
            if (joined === void 0)
              joined = arg;
            else
              joined += "/" + arg;
          }
        }
        if (joined === void 0)
          return ".";
        return posix.normalize(joined);
      },
      relative: function relative(from, to) {
        assertPath(from);
        assertPath(to);
        if (from === to)
          return "";
        from = posix.resolve(from);
        to = posix.resolve(to);
        if (from === to)
          return "";
        var fromStart = 1;
        for (; fromStart < from.length; ++fromStart) {
          if (from.charCodeAt(fromStart) !== 47)
            break;
        }
        var fromEnd = from.length;
        var fromLen = fromEnd - fromStart;
        var toStart = 1;
        for (; toStart < to.length; ++toStart) {
          if (to.charCodeAt(toStart) !== 47)
            break;
        }
        var toEnd = to.length;
        var toLen = toEnd - toStart;
        var length = fromLen < toLen ? fromLen : toLen;
        var lastCommonSep = -1;
        var i = 0;
        for (; i <= length; ++i) {
          if (i === length) {
            if (toLen > length) {
              if (to.charCodeAt(toStart + i) === 47) {
                return to.slice(toStart + i + 1);
              } else if (i === 0) {
                return to.slice(toStart + i);
              }
            } else if (fromLen > length) {
              if (from.charCodeAt(fromStart + i) === 47) {
                lastCommonSep = i;
              } else if (i === 0) {
                lastCommonSep = 0;
              }
            }
            break;
          }
          var fromCode = from.charCodeAt(fromStart + i);
          var toCode = to.charCodeAt(toStart + i);
          if (fromCode !== toCode)
            break;
          else if (fromCode === 47)
            lastCommonSep = i;
        }
        var out = "";
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
          if (i === fromEnd || from.charCodeAt(i) === 47) {
            if (out.length === 0)
              out += "..";
            else
              out += "/..";
          }
        }
        if (out.length > 0)
          return out + to.slice(toStart + lastCommonSep);
        else {
          toStart += lastCommonSep;
          if (to.charCodeAt(toStart) === 47)
            ++toStart;
          return to.slice(toStart);
        }
      },
      _makeLong: function _makeLong(path) {
        return path;
      },
      dirname: function dirname(path) {
        assertPath(path);
        if (path.length === 0)
          return ".";
        var code = path.charCodeAt(0);
        var hasRoot = code === 47;
        var end = -1;
        var matchedSlash = true;
        for (var i = path.length - 1; i >= 1; --i) {
          code = path.charCodeAt(i);
          if (code === 47) {
            if (!matchedSlash) {
              end = i;
              break;
            }
          } else {
            matchedSlash = false;
          }
        }
        if (end === -1)
          return hasRoot ? "/" : ".";
        if (hasRoot && end === 1)
          return "//";
        return path.slice(0, end);
      },
      basename: function basename2(path, ext) {
        if (ext !== void 0 && typeof ext !== "string")
          throw new TypeError('"ext" argument must be a string');
        assertPath(path);
        var start = 0;
        var end = -1;
        var matchedSlash = true;
        var i;
        if (ext !== void 0 && ext.length > 0 && ext.length <= path.length) {
          if (ext.length === path.length && ext === path)
            return "";
          var extIdx = ext.length - 1;
          var firstNonSlashEnd = -1;
          for (i = path.length - 1; i >= 0; --i) {
            var code = path.charCodeAt(i);
            if (code === 47) {
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else {
              if (firstNonSlashEnd === -1) {
                matchedSlash = false;
                firstNonSlashEnd = i + 1;
              }
              if (extIdx >= 0) {
                if (code === ext.charCodeAt(extIdx)) {
                  if (--extIdx === -1) {
                    end = i;
                  }
                } else {
                  extIdx = -1;
                  end = firstNonSlashEnd;
                }
              }
            }
          }
          if (start === end)
            end = firstNonSlashEnd;
          else if (end === -1)
            end = path.length;
          return path.slice(start, end);
        } else {
          for (i = path.length - 1; i >= 0; --i) {
            if (path.charCodeAt(i) === 47) {
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else if (end === -1) {
              matchedSlash = false;
              end = i + 1;
            }
          }
          if (end === -1)
            return "";
          return path.slice(start, end);
        }
      },
      extname: function extname(path) {
        assertPath(path);
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var preDotState = 0;
        for (var i = path.length - 1; i >= 0; --i) {
          var code = path.charCodeAt(i);
          if (code === 47) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === 46) {
            if (startDot === -1)
              startDot = i;
            else if (preDotState !== 1)
              preDotState = 1;
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          return "";
        }
        return path.slice(startDot, end);
      },
      format: function format(pathObject) {
        if (pathObject === null || typeof pathObject !== "object") {
          throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
        }
        return _format("/", pathObject);
      },
      parse: function parse(path) {
        assertPath(path);
        var ret = { root: "", dir: "", base: "", ext: "", name: "" };
        if (path.length === 0)
          return ret;
        var code = path.charCodeAt(0);
        var isAbsolute = code === 47;
        var start;
        if (isAbsolute) {
          ret.root = "/";
          start = 1;
        } else {
          start = 0;
        }
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var i = path.length - 1;
        var preDotState = 0;
        for (; i >= start; --i) {
          code = path.charCodeAt(i);
          if (code === 47) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === 46) {
            if (startDot === -1)
              startDot = i;
            else if (preDotState !== 1)
              preDotState = 1;
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          if (end !== -1) {
            if (startPart === 0 && isAbsolute)
              ret.base = ret.name = path.slice(1, end);
            else
              ret.base = ret.name = path.slice(startPart, end);
          }
        } else {
          if (startPart === 0 && isAbsolute) {
            ret.name = path.slice(1, startDot);
            ret.base = path.slice(1, end);
          } else {
            ret.name = path.slice(startPart, startDot);
            ret.base = path.slice(startPart, end);
          }
          ret.ext = path.slice(startDot, end);
        }
        if (startPart > 0)
          ret.dir = path.slice(0, startPart - 1);
        else if (isAbsolute)
          ret.dir = "/";
        return ret;
      },
      sep: "/",
      delimiter: ":",
      win32: null,
      posix: null
    };
    posix.posix = posix;
    module2.exports = posix;
  }
});

// node_modules/gdb-mi-parser/index.js
var require_gdb_mi_parser = __commonJS({
  "node_modules/gdb-mi-parser/index.js"(exports, module2) {
    function isEmpty(str) {
      return !str || str.length === 0;
    }
    function trim(str) {
      if (str)
        str = str.trim();
      return str;
    }
    var recordTypeMapping = {
      "^": "result",
      "~": "stream",
      "&": "stream",
      "@": "stream",
      "*": "async",
      "+": "async",
      "=": "async"
    };
    var outputTypeMapping = {
      "^": "result",
      "~": "console",
      "&": "log",
      "@": "target",
      "*": "exec",
      "+": "status",
      "=": "notify"
    };
    function eatWhitespace(line, i) {
      while (i < line.length && (line[i] == " " || line[i] == "\n" || line[i] == "\r" || line[i] == "	"))
        ++i;
      return i;
    }
    function eatVariableName(line, i) {
      while (i < line.length && line[i] != "=")
        ++i;
      return i + 1;
    }
    function nextVariableName(line, i) {
      var j = i;
      while (j < line.length && line[j] != "=")
        ++j;
      return [j, trim(line.substring(i, j))];
    }
    function nextValue(line, i) {
      if (line[i] == '"')
        return nextConst(line, i);
      else if (line[i] == "{")
        return nextTuple(line, i);
      else if (line[i] == "[")
        return nextList(line, i);
    }
    function simpleUnescape(line) {
      return line.replace(/\\\\/g, "\\").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "	").replace(/\\'/g, "'").replace(/\\"/g, '"');
    }
    function nextConst(line, i) {
      var j = i + 1;
      while (j < line.length) {
        if (line[j] == "\\")
          ++j;
        else if (line[j] == '"') {
          var cString = simpleUnescape(trim(line.substring(i + 1, j)));
          return [j + 1, cString];
        }
        ++j;
      }
      var cString = simpleUnescape(trim(line.substring(i + 1, j)));
      return [j + 1, cString];
    }
    function nextResult(line, i) {
      var nameRes = nextVariableName(line, i);
      var varName = nameRes[1];
      i = eatWhitespace(line, nameRes[0] + 1);
      var valRes = nextValue(line, i);
      if (!valRes)
        return void 0;
      var varValue = valRes[1];
      return [valRes[0], varName, varValue];
    }
    function nextTuple(line, i) {
      var ret = {};
      while (i < line.length && line[i] != "}") {
        var result = nextResult(line, i + 1);
        if (!result)
          return [i + 1, ret];
        ret[result[1]] = result[2];
        i = eatWhitespace(line, result[0]);
      }
      return [i + 1, ret];
    }
    function nextList(line, i) {
      var ret = [];
      while (i < line.length && line[i] != "]") {
        i = eatWhitespace(line, i + 1);
        if (line[i] != "]") {
          if (line[i] != '"' && line[i] != "{" && line[i] != "[") {
            i = eatVariableName(line, i);
            i = eatWhitespace(line, i);
          }
          var valRes = nextValue(line, i);
          ret.push(valRes[1]);
          i = eatWhitespace(line, valRes[0]);
        }
      }
      return [i + 1, ret];
    }
    function nextToken(line, i) {
      var j = i;
      while (j < line.length && line[j] >= "0" && line[j] <= "9")
        ++j;
      return [j, line.substring(i, j)];
    }
    function nextClass(line, i) {
      var j = i + 1;
      while (j < line.length && line[j] != ",")
        ++j;
      return [j, trim(line.substring(i + 1, j))];
    }
    function parseGdbMiLine(line) {
      if (line.endsWith("\\n"))
        line = line.substring(0, line.length - 2);
      var tokenResult = nextToken(line, eatWhitespace(line, 0));
      var i = eatWhitespace(line, tokenResult[0]);
      var prefix = line[i];
      var recordType = recordTypeMapping[prefix];
      if (recordType == void 0)
        return void 0;
      var outputType = outputTypeMapping[prefix];
      var klass = void 0;
      var result = void 0;
      if (recordType == "stream") {
        klass = outputType;
        result = nextConst(line, i + 1)[1];
      } else {
        var classResult = nextClass(line, i);
        klass = classResult[1];
        result = nextTuple(line, classResult[0])[1];
      }
      return {
        token: tokenResult[1],
        recordType,
        outputType,
        class: klass,
        result
      };
    }
    function parseGdbMiOut(data) {
      var outOfBandRecords = [];
      var resultRecord = void 0;
      var hasTerminator = false;
      var lines = data.toString().split("\n");
      for (var i = 0; i < lines.length; i++) {
        var line = trim(lines[i]);
        if (!isEmpty(line)) {
          if (line == "(gdb)")
            hasTerminator = true;
          else {
            var record = parseGdbMiLine(line);
            if (record != void 0) {
              if (record.recordType == "result")
                resultRecord = record;
              else
                outOfBandRecords.push(record);
            }
          }
        }
      }
      return {
        hasTerminator,
        outOfBandRecords,
        resultRecord
      };
    }
    module2.exports = parseGdbMiOut;
  }
});

// node_modules/await-notify/index.js
var require_await_notify = __commonJS({
  "node_modules/await-notify/index.js"(exports) {
    function Subject2() {
      this.waiters = [];
    }
    Subject2.prototype.wait = function(timeout2) {
      var self = this;
      var waiter = {};
      this.waiters.push(waiter);
      var promise = new Promise(function(resolve) {
        var resolved = false;
        waiter.resolve = function(noRemove) {
          if (resolved) {
            return;
          }
          resolved = true;
          if (waiter.timeout) {
            clearTimeout(waiter.timeout);
            waiter.timeout = null;
          }
          if (!noRemove) {
            var pos = self.waiters.indexOf(waiter);
            if (pos > -1) {
              self.waiters.splice(pos, 1);
            }
          }
          resolve();
        };
      });
      if (timeout2 > 0 && isFinite(timeout2)) {
        waiter.timeout = setTimeout(function() {
          waiter.timeout = null;
          waiter.resolve();
        }, timeout2);
      }
      return promise;
    };
    Subject2.prototype.notify = function() {
      if (this.waiters.length > 0) {
        this.waiters.pop().resolve(true);
      }
    };
    Subject2.prototype.notifyAll = function() {
      for (var i = this.waiters.length - 1; i >= 0; i--) {
        this.waiters[i].resolve(true);
      }
      this.waiters = [];
    };
    exports.Subject = Subject2;
  }
});

// node_modules/base64-js/index.js
var require_base64_js = __commonJS({
  "node_modules/base64-js/index.js"(exports) {
    "use strict";
    exports.byteLength = byteLength;
    exports.toByteArray = toByteArray2;
    exports.fromByteArray = fromByteArray2;
    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }
    var i;
    var len;
    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
    function getLens(b64) {
      var len2 = b64.length;
      if (len2 % 4 > 0) {
        throw new Error("Invalid string. Length must be a multiple of 4");
      }
      var validLen = b64.indexOf("=");
      if (validLen === -1)
        validLen = len2;
      var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
      return [validLen, placeHoldersLen];
    }
    function byteLength(b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function _byteLength(b64, validLen, placeHoldersLen) {
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function toByteArray2(b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
      var curByte = 0;
      var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
      var i2;
      for (i2 = 0; i2 < len2; i2 += 4) {
        tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 2) {
        tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 1) {
        tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      return arr;
    }
    function tripletToBase64(num) {
      return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
    }
    function encodeChunk(uint8, start, end) {
      var tmp;
      var output = [];
      for (var i2 = start; i2 < end; i2 += 3) {
        tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
        output.push(tripletToBase64(tmp));
      }
      return output.join("");
    }
    function fromByteArray2(uint8) {
      var tmp;
      var len2 = uint8.length;
      var extraBytes = len2 % 3;
      var parts = [];
      var maxChunkLength = 16383;
      for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
        parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
      }
      if (extraBytes === 1) {
        tmp = uint8[len2 - 1];
        parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
      } else if (extraBytes === 2) {
        tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
        parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
      }
      return parts.join("");
    }
  }
});

// src/web-extension.ts
var web_extension_exports = {};
__export(web_extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(web_extension_exports);

// src/activateMockDebug.ts
var vscode = __toESM(require("vscode"));

// src/mockDebug.ts
var import_debugadapter = __toESM(require_main());
var import_path_browserify = __toESM(require_path_browserify());

// src/mockRuntime.ts
var import_events = __toESM(require_events());
var RuntimeVariable = class {
  constructor(name, _value) {
    this.name = name;
    this._value = _value;
  }
  get value() {
    return this._value;
  }
  set value(value) {
    this._value = value;
    this._memory = void 0;
  }
  get memory() {
    if (this._memory === void 0 && typeof this._value === "string") {
      this._memory = new TextEncoder().encode(this._value);
    }
    return this._memory;
  }
  setMemory(data, offset = 0) {
    const memory = this.memory;
    if (!memory) {
      return;
    }
    memory.set(data, offset);
    this._memory = memory;
    this._value = new TextDecoder().decode(memory);
  }
};
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var MockRuntime = class extends import_events.EventEmitter {
  constructor(fileAccessor) {
    super();
    this.fileAccessor = fileAccessor;
    this._sourceFile = "";
    this.variables = /* @__PURE__ */ new Map();
    this.sourceLines = [];
    this.instructions = [];
    this.starts = [];
    this.ends = [];
    this._currentLine = 0;
    this.instruction = 0;
    this.breakPoints = /* @__PURE__ */ new Map();
    this.instructionBreakpoints = /* @__PURE__ */ new Set();
    this.breakpointId = 1;
    this.breakAddresses = /* @__PURE__ */ new Map();
    this.otherExceptions = false;
  }
  get sourceFile() {
    return this._sourceFile;
  }
  get currentLine() {
    return this._currentLine;
  }
  set currentLine(x) {
    this._currentLine = x;
    this.instruction = this.starts[x];
  }
  async start(program, stopOnEntry, debug2) {
    console.log("Starting program:", program, stopOnEntry, debug2);
    await this.loadSource(this.normalizePathAndCasing(program));
    if (debug2) {
      await this.verifyBreakpoints(this._sourceFile);
      if (stopOnEntry) {
        this.findNextStatement(false, "stopOnEntry");
      } else {
        this.continue(false);
      }
    } else {
      this.continue(false);
    }
  }
  continue(reverse) {
    while (!this.executeLine(this.currentLine, reverse)) {
      if (this.updateCurrentLine(reverse)) {
        break;
      }
      if (this.findNextStatement(reverse)) {
        break;
      }
    }
  }
  step(instruction, reverse) {
    if (instruction) {
      if (reverse) {
        this.instruction--;
      } else {
        this.instruction++;
      }
      this.sendEvent("stopOnStep");
    } else {
      if (!this.executeLine(this.currentLine, reverse)) {
        if (!this.updateCurrentLine(reverse)) {
          this.findNextStatement(reverse, "stopOnStep");
        }
      }
    }
  }
  updateCurrentLine(reverse) {
    if (reverse) {
      if (this.currentLine > 0) {
        this.currentLine--;
      } else {
        this.currentLine = 0;
        this.currentColumn = void 0;
        this.sendEvent("stopOnEntry");
        return true;
      }
    } else {
      if (this.currentLine < this.sourceLines.length - 1) {
        this.currentLine++;
      } else {
        this.currentColumn = void 0;
        this.sendEvent("end");
        return true;
      }
    }
    return false;
  }
  stepIn(targetId) {
    if (typeof targetId === "number") {
      this.currentColumn = targetId;
      this.sendEvent("stopOnStep");
    } else {
      if (typeof this.currentColumn === "number") {
        if (this.currentColumn <= this.sourceLines[this.currentLine].length) {
          this.currentColumn += 1;
        }
      } else {
        this.currentColumn = 1;
      }
      this.sendEvent("stopOnStep");
    }
  }
  stepOut() {
    if (typeof this.currentColumn === "number") {
      this.currentColumn -= 1;
      if (this.currentColumn === 0) {
        this.currentColumn = void 0;
      }
    }
    this.sendEvent("stopOnStep");
  }
  getStepInTargets(frameId) {
    const line = this.getLine();
    const words = this.getWords(this.currentLine, line);
    if (frameId < 0 || frameId >= words.length) {
      return [];
    }
    const { name, index } = words[frameId];
    return name.split("").map((c, ix) => {
      return {
        id: index + ix,
        label: `target: ${c}`
      };
    });
  }
  stack(startFrame, endFrame) {
    const line = this.getLine();
    const words = this.getWords(this.currentLine, line);
    words.push({ name: "BOTTOM", line: -1, index: -1 });
    const instruction = line.indexOf("disassembly") >= 0 ? this.instruction : void 0;
    const column = typeof this.currentColumn === "number" ? this.currentColumn : void 0;
    const frames = [];
    for (let i = startFrame; i < Math.min(endFrame, words.length); i++) {
      const stackFrame = {
        index: i,
        name: `${words[i].name}(${i})`,
        file: this._sourceFile,
        line: this.currentLine,
        column,
        instruction: instruction ? instruction + i : 0
      };
      frames.push(stackFrame);
    }
    return {
      frames,
      count: words.length
    };
  }
  getBreakpoints(path, line) {
    return this.getWords(line, this.getLine(line)).filter((w) => w.name.length > 8).map((w) => w.index);
  }
  async setBreakPoint(path, line) {
    path = this.normalizePathAndCasing(path);
    const bp = { verified: false, line, id: this.breakpointId++ };
    let bps = this.breakPoints.get(path);
    if (!bps) {
      bps = new Array();
      this.breakPoints.set(path, bps);
    }
    bps.push(bp);
    await this.verifyBreakpoints(path);
    return bp;
  }
  clearBreakPoint(path, line) {
    const bps = this.breakPoints.get(this.normalizePathAndCasing(path));
    if (bps) {
      const index = bps.findIndex((bp) => bp.line === line);
      if (index >= 0) {
        const bp = bps[index];
        bps.splice(index, 1);
        return bp;
      }
    }
    return void 0;
  }
  clearBreakpoints(path) {
    this.breakPoints.delete(this.normalizePathAndCasing(path));
  }
  setDataBreakpoint(address, accessType) {
    const x = accessType === "readWrite" ? "read write" : accessType;
    const t = this.breakAddresses.get(address);
    if (t) {
      if (t !== x) {
        this.breakAddresses.set(address, "read write");
      }
    } else {
      this.breakAddresses.set(address, x);
    }
    return true;
  }
  clearAllDataBreakpoints() {
    this.breakAddresses.clear();
  }
  setExceptionsFilters(namedException, otherExceptions) {
    this.namedException = namedException;
    this.otherExceptions = otherExceptions;
  }
  setInstructionBreakpoint(address) {
    this.instructionBreakpoints.add(address);
    return true;
  }
  clearInstructionBreakpoints() {
    this.instructionBreakpoints.clear();
  }
  async getGlobalVariables(cancellationToken) {
    let a = [];
    for (let i = 0; i < 10; i++) {
      a.push(new RuntimeVariable(`global_${i}`, i));
      if (cancellationToken && cancellationToken()) {
        break;
      }
      await timeout(1e3);
    }
    return a;
  }
  getLocalVariables() {
    return Array.from(this.variables, ([name, value]) => value);
  }
  getLocalVariable(name) {
    return this.variables.get(name);
  }
  disassemble(address, instructionCount) {
    const instructions = [];
    for (let a = address; a < address + instructionCount; a++) {
      if (a >= 0 && a < this.instructions.length) {
        instructions.push({
          address: a,
          instruction: this.instructions[a].name,
          line: this.instructions[a].line
        });
      } else {
        instructions.push({
          address: a,
          instruction: "nop"
        });
      }
    }
    return instructions;
  }
  getLine(line) {
    return this.sourceLines[line === void 0 ? this.currentLine : line].trim();
  }
  getWords(l, line) {
    const WORD_REGEXP = /[a-z]+/ig;
    const words = [];
    let match;
    while (match = WORD_REGEXP.exec(line)) {
      words.push({ name: match[0], line: l, index: match.index });
    }
    return words;
  }
  async loadSource(file) {
    if (this._sourceFile !== file) {
      this._sourceFile = this.normalizePathAndCasing(file);
      this.initializeContents(await this.fileAccessor.readFile(file));
    }
  }
  initializeContents(memory) {
    this.sourceLines = new TextDecoder().decode(memory).split(/\r?\n/);
    this.instructions = [];
    this.starts = [];
    this.instructions = [];
    this.ends = [];
    for (let l = 0; l < this.sourceLines.length; l++) {
      this.starts.push(this.instructions.length);
      const words = this.getWords(l, this.sourceLines[l]);
      for (let word of words) {
        this.instructions.push(word);
      }
      this.ends.push(this.instructions.length);
    }
  }
  findNextStatement(reverse, stepEvent) {
    for (let ln = this.currentLine; reverse ? ln >= 0 : ln < this.sourceLines.length; reverse ? ln-- : ln++) {
      const breakpoints = this.breakPoints.get(this._sourceFile);
      if (breakpoints) {
        const bps = breakpoints.filter((bp) => bp.line === ln);
        if (bps.length > 0) {
          this.sendEvent("stopOnBreakpoint");
          if (!bps[0].verified) {
            bps[0].verified = true;
            this.sendEvent("breakpointValidated", bps[0]);
          }
          this.currentLine = ln;
          return true;
        }
      }
      const line = this.getLine(ln);
      if (line.length > 0) {
        this.currentLine = ln;
        break;
      }
    }
    if (stepEvent) {
      this.sendEvent(stepEvent);
      return true;
    }
    return false;
  }
  executeLine(ln, reverse) {
    while (reverse ? this.instruction >= this.starts[ln] : this.instruction < this.ends[ln]) {
      reverse ? this.instruction-- : this.instruction++;
      if (this.instructionBreakpoints.has(this.instruction)) {
        this.sendEvent("stopOnInstructionBreakpoint");
        return true;
      }
    }
    const line = this.getLine(ln);
    let reg0 = /\$([a-z][a-z0-9]*)(=(false|true|[0-9]+(\.[0-9]+)?|\".*\"|\{.*\}))?/ig;
    let matches0;
    while (matches0 = reg0.exec(line)) {
      if (matches0.length === 5) {
        let access;
        const name = matches0[1];
        const value = matches0[3];
        let v = new RuntimeVariable(name, value);
        if (value && value.length > 0) {
          if (value === "true") {
            v.value = true;
          } else if (value === "false") {
            v.value = false;
          } else if (value[0] === '"') {
            v.value = value.slice(1, -1);
          } else if (value[0] === "{") {
            v.value = [
              new RuntimeVariable("fBool", true),
              new RuntimeVariable("fInteger", 123),
              new RuntimeVariable("fString", "hello"),
              new RuntimeVariable("flazyInteger", 321)
            ];
          } else {
            v.value = parseFloat(value);
          }
          if (this.variables.has(name)) {
            access = "write";
          }
          this.variables.set(name, v);
        } else {
          if (this.variables.has(name)) {
            access = "read";
          }
        }
        const accessType = this.breakAddresses.get(name);
        if (access && accessType && accessType.indexOf(access) >= 0) {
          this.sendEvent("stopOnDataBreakpoint", access);
          return true;
        }
      }
    }
    const reg1 = /(log|prio|out|err)\(([^\)]*)\)/g;
    let matches1;
    while (matches1 = reg1.exec(line)) {
      if (matches1.length === 3) {
        this.sendEvent("output", matches1[1], matches1[2], this._sourceFile, ln, matches1.index);
      }
    }
    const matches2 = /exception\((.*)\)/.exec(line);
    if (matches2 && matches2.length === 2) {
      const exception = matches2[1].trim();
      if (this.namedException === exception) {
        this.sendEvent("stopOnException", exception);
        return true;
      } else {
        if (this.otherExceptions) {
          this.sendEvent("stopOnException", void 0);
          return true;
        }
      }
    } else {
      if (line.indexOf("exception") >= 0) {
        if (this.otherExceptions) {
          this.sendEvent("stopOnException", void 0);
          return true;
        }
      }
    }
    return false;
  }
  async verifyBreakpoints(path) {
    const bps = this.breakPoints.get(path);
    if (bps) {
      await this.loadSource(path);
      bps.forEach((bp) => {
        if (!bp.verified && bp.line < this.sourceLines.length) {
          const srcLine = this.getLine(bp.line);
          if (srcLine.length === 0 || srcLine.indexOf("+") === 0) {
            bp.line++;
          }
          if (srcLine.indexOf("-") === 0) {
            bp.line--;
          }
          if (srcLine.indexOf("lazy") < 0) {
            bp.verified = true;
            this.sendEvent("breakpointValidated", bp);
          }
        }
      });
    }
  }
  sendEvent(event, ...args) {
    setTimeout(() => {
      this.emit(event, ...args);
    }, 0);
  }
  normalizePathAndCasing(path) {
    if (this.fileAccessor.isWindows) {
      return path.replace(/\//g, "\\").toLowerCase();
    } else {
      return path.replace(/\\/g, "/");
    }
  }
};

// src/gdbListener.ts
var import_events2 = __toESM(require_events());
var GDBParser = require_gdb_mi_parser();
var GdbListener = class extends import_events2.EventEmitter {
  constructor() {
    super();
  }
  start() {
    console.log("GdbListener started");
    process.stdin.on("data", (data) => {
      console.log("GdbListener received data: " + data);
      const parsedGDBResponse = GDBParser(data);
      console.log("parsedGDBResponse: ", parsedGDBResponse);
    });
  }
  stop() {
    console.log("GdbListener stopped");
  }
};

// src/mockDebug.ts
var import_await_notify = __toESM(require_await_notify());
var base64 = __toESM(require_base64_js());
var _MockDebugSession = class extends import_debugadapter.LoggingDebugSession {
  constructor(fileAccessor) {
    super("mock-debug.txt");
    this._variableHandles = new import_debugadapter.Handles();
    this._configurationDone = new import_await_notify.Subject();
    this._cancellationTokens = /* @__PURE__ */ new Map();
    this._reportProgress = false;
    this._progressId = 1e4;
    this._cancelledProgressId = void 0;
    this._isProgressCancellable = true;
    this._valuesInHex = false;
    this._useInvalidatedEvent = false;
    this._addressesInHex = true;
    this.setDebuggerLinesStartAt1(false);
    this.setDebuggerColumnsStartAt1(false);
    this._runtime = new MockRuntime(fileAccessor);
    this._gdbListener = new GdbListener();
    this._runtime.on("stopOnEntry", () => {
      this.sendEvent(new import_debugadapter.StoppedEvent("entry", _MockDebugSession.threadID));
    });
    this._runtime.on("stopOnStep", () => {
      this.sendEvent(new import_debugadapter.StoppedEvent("step", _MockDebugSession.threadID));
    });
    this._runtime.on("stopOnBreakpoint", () => {
      this.sendEvent(new import_debugadapter.StoppedEvent("breakpoint", _MockDebugSession.threadID));
    });
    this._runtime.on("stopOnDataBreakpoint", () => {
      this.sendEvent(new import_debugadapter.StoppedEvent("data breakpoint", _MockDebugSession.threadID));
    });
    this._runtime.on("stopOnInstructionBreakpoint", () => {
      this.sendEvent(new import_debugadapter.StoppedEvent("instruction breakpoint", _MockDebugSession.threadID));
    });
    this._runtime.on("stopOnException", (exception) => {
      if (exception) {
        this.sendEvent(new import_debugadapter.StoppedEvent(`exception(${exception})`, _MockDebugSession.threadID));
      } else {
        this.sendEvent(new import_debugadapter.StoppedEvent("exception", _MockDebugSession.threadID));
      }
    });
    this._runtime.on("breakpointValidated", (bp) => {
      this.sendEvent(new import_debugadapter.BreakpointEvent("changed", { verified: bp.verified, id: bp.id }));
    });
    this._runtime.on("output", (type, text, filePath, line, column) => {
      let category;
      switch (type) {
        case "prio":
          category = "important";
          break;
        case "out":
          category = "stdout";
          break;
        case "err":
          category = "stderr";
          break;
        default:
          category = "console";
          break;
      }
      const e = new import_debugadapter.OutputEvent(`${text}
`, category);
      if (text === "start" || text === "startCollapsed" || text === "end") {
        e.body.group = text;
        e.body.output = `group-${text}
`;
      }
      e.body.source = this.createSource(filePath);
      e.body.line = this.convertDebuggerLineToClient(line);
      e.body.column = this.convertDebuggerColumnToClient(column);
      this.sendEvent(e);
    });
    this._runtime.on("end", () => {
      this.sendEvent(new import_debugadapter.TerminatedEvent());
    });
  }
  initializeRequest(response, args) {
    if (args.supportsProgressReporting) {
      this._reportProgress = true;
    }
    if (args.supportsInvalidatedEvent) {
      this._useInvalidatedEvent = true;
    }
    response.body = response.body || {};
    response.body.supportsConfigurationDoneRequest = true;
    response.body.supportsEvaluateForHovers = true;
    response.body.supportsStepBack = true;
    response.body.supportsDataBreakpoints = true;
    response.body.supportsCompletionsRequest = true;
    response.body.completionTriggerCharacters = [".", "["];
    response.body.supportsCancelRequest = true;
    response.body.supportsBreakpointLocationsRequest = true;
    response.body.supportsStepInTargetsRequest = true;
    response.body.supportsExceptionFilterOptions = true;
    response.body.exceptionBreakpointFilters = [
      {
        filter: "namedException",
        label: "Named Exception",
        description: `Break on named exceptions. Enter the exception's name as the Condition.`,
        default: false,
        supportsCondition: true,
        conditionDescription: `Enter the exception's name`
      },
      {
        filter: "otherExceptions",
        label: "Other Exceptions",
        description: "This is a other exception",
        default: true,
        supportsCondition: false
      }
    ];
    response.body.supportsExceptionInfoRequest = true;
    response.body.supportsSetVariable = true;
    response.body.supportsSetExpression = true;
    response.body.supportsDisassembleRequest = true;
    response.body.supportsSteppingGranularity = true;
    response.body.supportsInstructionBreakpoints = true;
    response.body.supportsReadMemoryRequest = true;
    response.body.supportsWriteMemoryRequest = true;
    response.body.supportSuspendDebuggee = true;
    response.body.supportTerminateDebuggee = true;
    response.body.supportsFunctionBreakpoints = true;
    response.body.supportsDelayedStackTraceLoading = true;
    this.sendResponse(response);
    this.sendEvent(new import_debugadapter.InitializedEvent());
  }
  configurationDoneRequest(response, args) {
    super.configurationDoneRequest(response, args);
    this._configurationDone.notify();
  }
  disconnectRequest(response, args, request) {
    console.log(`disconnectRequest suspend: ${args.suspendDebuggee}, terminate: ${args.terminateDebuggee}`);
  }
  async attachRequest(response, args) {
    return this.launchRequest(response, args);
  }
  async launchRequest(response, args) {
    import_debugadapter.logger.setup(args.trace ? import_debugadapter.Logger.LogLevel.Verbose : import_debugadapter.Logger.LogLevel.Stop, false);
    await this._configurationDone.wait(1e3);
    this._gdbListener.start();
    if (args.compileError) {
      this.sendErrorResponse(response, {
        id: 1001,
        format: `compile error: some fake error.`,
        showUser: args.compileError === "show" ? true : args.compileError === "hide" ? false : void 0
      });
    } else {
      this.sendResponse(response);
    }
  }
  setFunctionBreakPointsRequest(response, args, request) {
    this.sendResponse(response);
  }
  async setBreakPointsRequest(response, args) {
    const path = args.source.path;
    const clientLines = args.lines || [];
    this._runtime.clearBreakpoints(path);
    const actualBreakpoints0 = clientLines.map(async (l) => {
      const { verified, line, id } = await this._runtime.setBreakPoint(path, this.convertClientLineToDebugger(l));
      const bp = new import_debugadapter.Breakpoint(verified, this.convertDebuggerLineToClient(line));
      bp.id = id;
      return bp;
    });
    const actualBreakpoints = await Promise.all(actualBreakpoints0);
    response.body = {
      breakpoints: actualBreakpoints
    };
    this.sendResponse(response);
  }
  breakpointLocationsRequest(response, args, request) {
    if (args.source.path) {
      const bps = this._runtime.getBreakpoints(args.source.path, this.convertClientLineToDebugger(args.line));
      response.body = {
        breakpoints: bps.map((col) => {
          return {
            line: args.line,
            column: this.convertDebuggerColumnToClient(col)
          };
        })
      };
    } else {
      response.body = {
        breakpoints: []
      };
    }
    this.sendResponse(response);
  }
  async setExceptionBreakPointsRequest(response, args) {
    let namedException = void 0;
    let otherExceptions = false;
    if (args.filterOptions) {
      for (const filterOption of args.filterOptions) {
        switch (filterOption.filterId) {
          case "namedException":
            namedException = args.filterOptions[0].condition;
            break;
          case "otherExceptions":
            otherExceptions = true;
            break;
        }
      }
    }
    if (args.filters) {
      if (args.filters.indexOf("otherExceptions") >= 0) {
        otherExceptions = true;
      }
    }
    this._runtime.setExceptionsFilters(namedException, otherExceptions);
    this.sendResponse(response);
  }
  exceptionInfoRequest(response, args) {
    response.body = {
      exceptionId: "Exception ID",
      description: "This is a descriptive description of the exception.",
      breakMode: "always",
      details: {
        message: "Message contained in the exception.",
        typeName: "Short type name of the exception object",
        stackTrace: "stack frame 1\nstack frame 2"
      }
    };
    this.sendResponse(response);
  }
  threadsRequest(response) {
    response.body = {
      threads: [
        new import_debugadapter.Thread(_MockDebugSession.threadID, "thread 1"),
        new import_debugadapter.Thread(_MockDebugSession.threadID + 1, "thread 2")
      ]
    };
    this.sendResponse(response);
  }
  stackTraceRequest(response, args) {
    const startFrame = typeof args.startFrame === "number" ? args.startFrame : 0;
    const maxLevels = typeof args.levels === "number" ? args.levels : 1e3;
    const endFrame = startFrame + maxLevels;
    const stk = this._runtime.stack(startFrame, endFrame);
    response.body = {
      stackFrames: stk.frames.map((f, ix) => {
        const sf = new import_debugadapter.StackFrame(f.index, f.name, this.createSource(f.file), this.convertDebuggerLineToClient(f.line));
        if (typeof f.column === "number") {
          sf.column = this.convertDebuggerColumnToClient(f.column);
        }
        if (typeof f.instruction === "number") {
          const address = this.formatAddress(f.instruction);
          sf.name = `${f.name} ${address}`;
          sf.instructionPointerReference = address;
        }
        return sf;
      }),
      totalFrames: stk.count
    };
    this.sendResponse(response);
  }
  scopesRequest(response, args) {
    response.body = {
      scopes: [
        new import_debugadapter.Scope("Locals", this._variableHandles.create("locals"), false),
        new import_debugadapter.Scope("Globals", this._variableHandles.create("globals"), true)
      ]
    };
    this.sendResponse(response);
  }
  async writeMemoryRequest(response, { data, memoryReference, offset = 0 }) {
    const variable = this._variableHandles.get(Number(memoryReference));
    if (typeof variable === "object") {
      const decoded = base64.toByteArray(data);
      variable.setMemory(decoded, offset);
      response.body = { bytesWritten: decoded.length };
    } else {
      response.body = { bytesWritten: 0 };
    }
    this.sendResponse(response);
    this.sendEvent(new import_debugadapter.InvalidatedEvent(["variables"]));
  }
  async readMemoryRequest(response, { offset = 0, count, memoryReference }) {
    const variable = this._variableHandles.get(Number(memoryReference));
    if (typeof variable === "object" && variable.memory) {
      const memory = variable.memory.subarray(Math.min(offset, variable.memory.length), Math.min(offset + count, variable.memory.length));
      response.body = {
        address: offset.toString(),
        data: base64.fromByteArray(memory),
        unreadableBytes: count - memory.length
      };
    } else {
      response.body = {
        address: offset.toString(),
        data: "",
        unreadableBytes: count
      };
    }
    this.sendResponse(response);
  }
  async variablesRequest(response, args, request) {
    let vs = [];
    const v = this._variableHandles.get(args.variablesReference);
    if (v === "locals") {
      vs = this._runtime.getLocalVariables();
    } else if (v === "globals") {
      if (request) {
        this._cancellationTokens.set(request.seq, false);
        vs = await this._runtime.getGlobalVariables(() => !!this._cancellationTokens.get(request.seq));
        this._cancellationTokens.delete(request.seq);
      } else {
        vs = await this._runtime.getGlobalVariables();
      }
    } else if (v && Array.isArray(v.value)) {
      vs = v.value;
    }
    response.body = {
      variables: vs.map((v2) => this.convertFromRuntime(v2))
    };
    this.sendResponse(response);
  }
  setVariableRequest(response, args) {
    const container = this._variableHandles.get(args.variablesReference);
    const rv = container === "locals" ? this._runtime.getLocalVariable(args.name) : container instanceof RuntimeVariable && container.value instanceof Array ? container.value.find((v) => v.name === args.name) : void 0;
    if (rv) {
      rv.value = this.convertToRuntime(args.value);
      response.body = this.convertFromRuntime(rv);
      if (rv.memory && rv.reference) {
        this.sendEvent(new import_debugadapter.MemoryEvent(String(rv.reference), 0, rv.memory.length));
      }
    }
    this.sendResponse(response);
  }
  continueRequest(response, args) {
    this._runtime.continue(false);
    this.sendResponse(response);
  }
  reverseContinueRequest(response, args) {
    this._runtime.continue(true);
    this.sendResponse(response);
  }
  nextRequest(response, args) {
    this._runtime.step(args.granularity === "instruction", false);
    this.sendResponse(response);
  }
  stepBackRequest(response, args) {
    this._runtime.step(args.granularity === "instruction", true);
    this.sendResponse(response);
  }
  stepInTargetsRequest(response, args) {
    const targets = this._runtime.getStepInTargets(args.frameId);
    response.body = {
      targets: targets.map((t) => {
        return { id: t.id, label: t.label };
      })
    };
    this.sendResponse(response);
  }
  stepInRequest(response, args) {
    this._runtime.stepIn(args.targetId);
    this.sendResponse(response);
  }
  stepOutRequest(response, args) {
    this._runtime.stepOut();
    this.sendResponse(response);
  }
  async evaluateRequest(response, args) {
    let reply;
    let rv;
    switch (args.context) {
      case "repl":
        const matches = /new +([0-9]+)/.exec(args.expression);
        if (matches && matches.length === 2) {
          const mbp = await this._runtime.setBreakPoint(this._runtime.sourceFile, this.convertClientLineToDebugger(parseInt(matches[1])));
          const bp = new import_debugadapter.Breakpoint(mbp.verified, this.convertDebuggerLineToClient(mbp.line), void 0, this.createSource(this._runtime.sourceFile));
          bp.id = mbp.id;
          this.sendEvent(new import_debugadapter.BreakpointEvent("new", bp));
          reply = `breakpoint created`;
        } else {
          const matches2 = /del +([0-9]+)/.exec(args.expression);
          if (matches2 && matches2.length === 2) {
            const mbp = this._runtime.clearBreakPoint(this._runtime.sourceFile, this.convertClientLineToDebugger(parseInt(matches2[1])));
            if (mbp) {
              const bp = new import_debugadapter.Breakpoint(false);
              bp.id = mbp.id;
              this.sendEvent(new import_debugadapter.BreakpointEvent("removed", bp));
              reply = `breakpoint deleted`;
            }
          } else {
            const matches3 = /progress/.exec(args.expression);
            if (matches3 && matches3.length === 1) {
              if (this._reportProgress) {
                reply = `progress started`;
                this.progressSequence();
              } else {
                reply = `frontend doesn't support progress (capability 'supportsProgressReporting' not set)`;
              }
            }
          }
        }
      default:
        if (args.expression.startsWith("$")) {
          rv = this._runtime.getLocalVariable(args.expression.substr(1));
        } else {
          rv = new RuntimeVariable("eval", this.convertToRuntime(args.expression));
        }
        break;
    }
    if (rv) {
      const v = this.convertFromRuntime(rv);
      response.body = {
        result: v.value,
        type: v.type,
        variablesReference: v.variablesReference,
        presentationHint: v.presentationHint
      };
    } else {
      response.body = {
        result: reply ? reply : `evaluate(context: '${args.context}', '${args.expression}')`,
        variablesReference: 0
      };
    }
    this.sendResponse(response);
  }
  setExpressionRequest(response, args) {
    if (args.expression.startsWith("$")) {
      const rv = this._runtime.getLocalVariable(args.expression.substr(1));
      if (rv) {
        rv.value = this.convertToRuntime(args.value);
        response.body = this.convertFromRuntime(rv);
        this.sendResponse(response);
      } else {
        this.sendErrorResponse(response, {
          id: 1002,
          format: `variable '{lexpr}' not found`,
          variables: { lexpr: args.expression },
          showUser: true
        });
      }
    } else {
      this.sendErrorResponse(response, {
        id: 1003,
        format: `'{lexpr}' not an assignable expression`,
        variables: { lexpr: args.expression },
        showUser: true
      });
    }
  }
  async progressSequence() {
    const ID = "" + this._progressId++;
    await timeout(100);
    const title = this._isProgressCancellable ? "Cancellable operation" : "Long running operation";
    const startEvent = new import_debugadapter.ProgressStartEvent(ID, title);
    startEvent.body.cancellable = this._isProgressCancellable;
    this._isProgressCancellable = !this._isProgressCancellable;
    this.sendEvent(startEvent);
    this.sendEvent(new import_debugadapter.OutputEvent(`start progress: ${ID}
`));
    let endMessage = "progress ended";
    for (let i = 0; i < 100; i++) {
      await timeout(500);
      this.sendEvent(new import_debugadapter.ProgressUpdateEvent(ID, `progress: ${i}`));
      if (this._cancelledProgressId === ID) {
        endMessage = "progress cancelled";
        this._cancelledProgressId = void 0;
        this.sendEvent(new import_debugadapter.OutputEvent(`cancel progress: ${ID}
`));
        break;
      }
    }
    this.sendEvent(new import_debugadapter.ProgressEndEvent(ID, endMessage));
    this.sendEvent(new import_debugadapter.OutputEvent(`end progress: ${ID}
`));
    this._cancelledProgressId = void 0;
  }
  dataBreakpointInfoRequest(response, args) {
    response.body = {
      dataId: null,
      description: "cannot break on data access",
      accessTypes: void 0,
      canPersist: false
    };
    if (args.variablesReference && args.name) {
      const v = this._variableHandles.get(args.variablesReference);
      if (v === "globals") {
        response.body.dataId = args.name;
        response.body.description = args.name;
        response.body.accessTypes = ["write"];
        response.body.canPersist = true;
      } else {
        response.body.dataId = args.name;
        response.body.description = args.name;
        response.body.accessTypes = ["read", "write", "readWrite"];
        response.body.canPersist = true;
      }
    }
    this.sendResponse(response);
  }
  setDataBreakpointsRequest(response, args) {
    this._runtime.clearAllDataBreakpoints();
    response.body = {
      breakpoints: []
    };
    for (const dbp of args.breakpoints) {
      const ok = this._runtime.setDataBreakpoint(dbp.dataId, dbp.accessType || "write");
      response.body.breakpoints.push({
        verified: ok
      });
    }
    this.sendResponse(response);
  }
  completionsRequest(response, args) {
    response.body = {
      targets: [
        {
          label: "item 10",
          sortText: "10"
        },
        {
          label: "item 1",
          sortText: "01",
          detail: "detail 1"
        },
        {
          label: "item 2",
          sortText: "02",
          detail: "detail 2"
        },
        {
          label: "array[]",
          selectionStart: 6,
          sortText: "03"
        },
        {
          label: "func(arg)",
          selectionStart: 5,
          selectionLength: 3,
          sortText: "04"
        }
      ]
    };
    this.sendResponse(response);
  }
  cancelRequest(response, args) {
    if (args.requestId) {
      this._cancellationTokens.set(args.requestId, true);
    }
    if (args.progressId) {
      this._cancelledProgressId = args.progressId;
    }
  }
  disassembleRequest(response, args) {
    const memoryInt = args.memoryReference.slice(3);
    const baseAddress = parseInt(memoryInt);
    const offset = args.instructionOffset || 0;
    const count = args.instructionCount;
    const isHex = memoryInt.startsWith("0x");
    const pad = isHex ? memoryInt.length - 2 : memoryInt.length;
    const loc = this.createSource(this._runtime.sourceFile);
    let lastLine = -1;
    const instructions = this._runtime.disassemble(baseAddress + offset, count).map((instruction) => {
      let address = Math.abs(instruction.address).toString(isHex ? 16 : 10).padStart(pad, "0");
      const sign = instruction.address < 0 ? "-" : "";
      const instr = {
        address: sign + (isHex ? `0x${address}` : `${address}`),
        instruction: instruction.instruction
      };
      if (instruction.line !== void 0 && lastLine !== instruction.line) {
        lastLine = instruction.line;
        instr.location = loc;
        instr.line = this.convertDebuggerLineToClient(instruction.line);
      }
      return instr;
    });
    response.body = {
      instructions
    };
    this.sendResponse(response);
  }
  setInstructionBreakpointsRequest(response, args) {
    this._runtime.clearInstructionBreakpoints();
    const breakpoints = args.breakpoints.map((ibp) => {
      const address = parseInt(ibp.instructionReference.slice(3));
      const offset = ibp.offset || 0;
      return {
        verified: this._runtime.setInstructionBreakpoint(address + offset)
      };
    });
    response.body = {
      breakpoints
    };
    this.sendResponse(response);
  }
  customRequest(command, response, args) {
    if (command === "toggleFormatting") {
      this._valuesInHex = !this._valuesInHex;
      if (this._useInvalidatedEvent) {
        this.sendEvent(new import_debugadapter.InvalidatedEvent(["variables"]));
      }
      this.sendResponse(response);
    } else {
      super.customRequest(command, response, args);
    }
  }
  convertToRuntime(value) {
    value = value.trim();
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    if (value[0] === "'" || value[0] === '"') {
      return value.substr(1, value.length - 2);
    }
    const n = parseFloat(value);
    if (!isNaN(n)) {
      return n;
    }
    return value;
  }
  convertFromRuntime(v) {
    let dapVariable = {
      name: v.name,
      value: "???",
      type: typeof v.value,
      variablesReference: 0,
      evaluateName: "$" + v.name
    };
    if (v.name.indexOf("lazy") >= 0) {
      dapVariable.value = "lazy var";
      v.reference ?? (v.reference = this._variableHandles.create(new RuntimeVariable("", [new RuntimeVariable("", v.value)])));
      dapVariable.variablesReference = v.reference;
      dapVariable.presentationHint = { lazy: true };
    } else {
      if (Array.isArray(v.value)) {
        dapVariable.value = "Object";
        v.reference ?? (v.reference = this._variableHandles.create(v));
        dapVariable.variablesReference = v.reference;
      } else {
        switch (typeof v.value) {
          case "number":
            if (Math.round(v.value) === v.value) {
              dapVariable.value = this.formatNumber(v.value);
              dapVariable.__vscodeVariableMenuContext = "simple";
              dapVariable.type = "integer";
            } else {
              dapVariable.value = v.value.toString();
              dapVariable.type = "float";
            }
            break;
          case "string":
            dapVariable.value = `"${v.value}"`;
            break;
          case "boolean":
            dapVariable.value = v.value ? "true" : "false";
            break;
          default:
            dapVariable.value = typeof v.value;
            break;
        }
      }
    }
    if (v.memory) {
      v.reference ?? (v.reference = this._variableHandles.create(v));
      dapVariable.memoryReference = String(v.reference);
    }
    return dapVariable;
  }
  formatAddress(x, pad = 8) {
    return "mem" + (this._addressesInHex ? "0x" + x.toString(16).padStart(8, "0") : x.toString(10));
  }
  formatNumber(x) {
    return this._valuesInHex ? "0x" + x.toString(16) : x.toString(10);
  }
  createSource(filePath) {
    return new import_debugadapter.Source((0, import_path_browserify.basename)(filePath), this.convertDebuggerPathToClient(filePath), void 0, void 0, "mock-adapter-data");
  }
};
var MockDebugSession = _MockDebugSession;
MockDebugSession.threadID = 1;

// src/activateMockDebug.ts
function activateMockDebug(context, factory) {
  context.subscriptions.push(vscode.commands.registerCommand("extension.dist-debug.getProgramName", (config) => {
    return vscode.window.showInputBox({
      placeHolder: "Please enter the name of the file in the workspace folder",
      value: "main.cpp"
    });
  }));
  const provider = new MockConfigurationProvider();
  context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("dist-debug", provider));
  if (!factory) {
    factory = new InlineDebugAdapterFactory();
  }
  context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory("dist-debug", factory));
}
var MockConfigurationProvider = class {
  resolveDebugConfiguration(folder, config, token) {
    if (!config.type && !config.request && !config.name) {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "cpp") {
        config.type = "dist-debug";
        config.name = "Launch";
        config.request = "launch";
        config.program = "${file}";
        config.stopOnEntry = true;
      }
    }
    if (!config.program) {
      return vscode.window.showInformationMessage("Cannot find a program to debug").then((_) => {
        return void 0;
      });
    }
    return config;
  }
};
var workspaceFileAccessor = {
  isWindows: typeof process !== "undefined" && process.platform === "win32",
  async readFile(path) {
    let uri;
    try {
      uri = pathToUri(path);
    } catch (e) {
      return new TextEncoder().encode(`cannot read '${path}'`);
    }
    return await vscode.workspace.fs.readFile(uri);
  },
  async writeFile(path, contents) {
    await vscode.workspace.fs.writeFile(pathToUri(path), contents);
  }
};
function pathToUri(path) {
  try {
    return vscode.Uri.file(path);
  } catch (e) {
    return vscode.Uri.parse(path);
  }
}
var InlineDebugAdapterFactory = class {
  createDebugAdapterDescriptor(_session) {
    return new vscode.DebugAdapterInlineImplementation(new MockDebugSession(workspaceFileAccessor));
  }
};

// src/web-extension.ts
function activate(context) {
  activateMockDebug(context);
}
function deactivate() {
}
/*! https://mths.be/punycode v1.3.2 by @mathias */
//# sourceMappingURL=web-extension.js.map
