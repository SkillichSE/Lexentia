"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/node-pty/lib/utils.js
var require_utils = __commonJS({
  "node_modules/node-pty/lib/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.loadNativeModule = exports2.assign = void 0;
    function assign(target) {
      var sources = [];
      for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
      }
      sources.forEach(function(source) {
        return Object.keys(source).forEach(function(key) {
          return target[key] = source[key];
        });
      });
      return target;
    }
    exports2.assign = assign;
    function loadNativeModule(name) {
      var dirs = ["build/Release", "build/Debug", "prebuilds/" + process.platform + "-" + process.arch];
      var relative = ["..", "."];
      var lastError;
      for (var _i = 0, dirs_1 = dirs; _i < dirs_1.length; _i++) {
        var d = dirs_1[_i];
        for (var _a = 0, relative_1 = relative; _a < relative_1.length; _a++) {
          var r = relative_1[_a];
          var dir = r + "/" + d + "/";
          try {
            return { dir, module: require(dir + "/" + name + ".node") };
          } catch (e) {
            lastError = e;
          }
        }
      }
      throw new Error("Failed to load native module: " + name + ".node, checked: " + dirs.join(", ") + ": " + lastError);
    }
    exports2.loadNativeModule = loadNativeModule;
  }
});

// node_modules/node-pty/lib/eventEmitter2.js
var require_eventEmitter2 = __commonJS({
  "node_modules/node-pty/lib/eventEmitter2.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EventEmitter2 = void 0;
    var EventEmitter2 = (
      /** @class */
      (function() {
        function EventEmitter22() {
          this._listeners = [];
        }
        Object.defineProperty(EventEmitter22.prototype, "event", {
          get: function() {
            var _this = this;
            if (!this._event) {
              this._event = function(listener) {
                _this._listeners.push(listener);
                var disposable = {
                  dispose: function() {
                    for (var i = 0; i < _this._listeners.length; i++) {
                      if (_this._listeners[i] === listener) {
                        _this._listeners.splice(i, 1);
                        return;
                      }
                    }
                  }
                };
                return disposable;
              };
            }
            return this._event;
          },
          enumerable: false,
          configurable: true
        });
        EventEmitter22.prototype.fire = function(data) {
          var queue = [];
          for (var i = 0; i < this._listeners.length; i++) {
            queue.push(this._listeners[i]);
          }
          for (var i = 0; i < queue.length; i++) {
            queue[i].call(void 0, data);
          }
        };
        return EventEmitter22;
      })()
    );
    exports2.EventEmitter2 = EventEmitter2;
  }
});

// node_modules/node-pty/lib/terminal.js
var require_terminal = __commonJS({
  "node_modules/node-pty/lib/terminal.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Terminal = exports2.DEFAULT_ROWS = exports2.DEFAULT_COLS = void 0;
    var events_1 = require("events");
    var eventEmitter2_1 = require_eventEmitter2();
    exports2.DEFAULT_COLS = 80;
    exports2.DEFAULT_ROWS = 24;
    var FLOW_CONTROL_PAUSE = "";
    var FLOW_CONTROL_RESUME = "";
    var Terminal = (
      /** @class */
      (function() {
        function Terminal2(opt) {
          this._pid = 0;
          this._fd = 0;
          this._cols = 0;
          this._rows = 0;
          this._readable = false;
          this._writable = false;
          this._onData = new eventEmitter2_1.EventEmitter2();
          this._onExit = new eventEmitter2_1.EventEmitter2();
          this._internalee = new events_1.EventEmitter();
          this.handleFlowControl = !!(opt === null || opt === void 0 ? void 0 : opt.handleFlowControl);
          this._flowControlPause = (opt === null || opt === void 0 ? void 0 : opt.flowControlPause) || FLOW_CONTROL_PAUSE;
          this._flowControlResume = (opt === null || opt === void 0 ? void 0 : opt.flowControlResume) || FLOW_CONTROL_RESUME;
          if (!opt) {
            return;
          }
          this._checkType("name", opt.name ? opt.name : void 0, "string");
          this._checkType("cols", opt.cols ? opt.cols : void 0, "number");
          this._checkType("rows", opt.rows ? opt.rows : void 0, "number");
          this._checkType("cwd", opt.cwd ? opt.cwd : void 0, "string");
          this._checkType("env", opt.env ? opt.env : void 0, "object");
          this._checkType("uid", opt.uid ? opt.uid : void 0, "number");
          this._checkType("gid", opt.gid ? opt.gid : void 0, "number");
          this._checkType("encoding", opt.encoding ? opt.encoding : void 0, "string");
        }
        Object.defineProperty(Terminal2.prototype, "onData", {
          get: function() {
            return this._onData.event;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Terminal2.prototype, "onExit", {
          get: function() {
            return this._onExit.event;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Terminal2.prototype, "pid", {
          get: function() {
            return this._pid;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Terminal2.prototype, "cols", {
          get: function() {
            return this._cols;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(Terminal2.prototype, "rows", {
          get: function() {
            return this._rows;
          },
          enumerable: false,
          configurable: true
        });
        Terminal2.prototype.write = function(data) {
          if (this.handleFlowControl) {
            if (data === this._flowControlPause) {
              this.pause();
              return;
            }
            if (data === this._flowControlResume) {
              this.resume();
              return;
            }
          }
          this._write(data);
        };
        Terminal2.prototype._forwardEvents = function() {
          var _this = this;
          this.on("data", function(e) {
            return _this._onData.fire(e);
          });
          this.on("exit", function(exitCode, signal) {
            return _this._onExit.fire({ exitCode, signal });
          });
        };
        Terminal2.prototype._checkType = function(name, value, type, allowArray) {
          if (allowArray === void 0) {
            allowArray = false;
          }
          if (value === void 0) {
            return;
          }
          if (allowArray) {
            if (Array.isArray(value)) {
              value.forEach(function(v, i) {
                if (typeof v !== type) {
                  throw new Error(name + "[" + i + "] must be a " + type + " (not a " + typeof v[i] + ")");
                }
              });
              return;
            }
          }
          if (typeof value !== type) {
            throw new Error(name + " must be a " + type + " (not a " + typeof value + ")");
          }
        };
        Terminal2.prototype.end = function(data) {
          this._socket.end(data);
        };
        Terminal2.prototype.pipe = function(dest, options) {
          return this._socket.pipe(dest, options);
        };
        Terminal2.prototype.pause = function() {
          return this._socket.pause();
        };
        Terminal2.prototype.resume = function() {
          return this._socket.resume();
        };
        Terminal2.prototype.setEncoding = function(encoding) {
          if (this._socket._decoder) {
            delete this._socket._decoder;
          }
          if (encoding) {
            this._socket.setEncoding(encoding);
          }
        };
        Terminal2.prototype.addListener = function(eventName, listener) {
          this.on(eventName, listener);
        };
        Terminal2.prototype.on = function(eventName, listener) {
          if (eventName === "close") {
            this._internalee.on("close", listener);
            return;
          }
          this._socket.on(eventName, listener);
        };
        Terminal2.prototype.emit = function(eventName) {
          var args = [];
          for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
          }
          if (eventName === "close") {
            return this._internalee.emit.apply(this._internalee, arguments);
          }
          return this._socket.emit.apply(this._socket, arguments);
        };
        Terminal2.prototype.listeners = function(eventName) {
          return this._socket.listeners(eventName);
        };
        Terminal2.prototype.removeListener = function(eventName, listener) {
          this._socket.removeListener(eventName, listener);
        };
        Terminal2.prototype.removeAllListeners = function(eventName) {
          this._socket.removeAllListeners(eventName);
        };
        Terminal2.prototype.once = function(eventName, listener) {
          this._socket.once(eventName, listener);
        };
        Terminal2.prototype._close = function() {
          this._socket.readable = false;
          this.write = function() {
          };
          this.end = function() {
          };
          this._writable = false;
          this._readable = false;
        };
        Terminal2.prototype._parseEnv = function(env) {
          var keys = Object.keys(env || {});
          var pairs = [];
          for (var i = 0; i < keys.length; i++) {
            if (keys[i] === void 0) {
              continue;
            }
            pairs.push(keys[i] + "=" + env[keys[i]]);
          }
          return pairs;
        };
        return Terminal2;
      })()
    );
    exports2.Terminal = Terminal;
  }
});

// node_modules/node-pty/lib/shared/conout.js
var require_conout = __commonJS({
  "node_modules/node-pty/lib/shared/conout.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getWorkerPipeName = void 0;
    function getWorkerPipeName(conoutPipeName) {
      return conoutPipeName + "-worker";
    }
    exports2.getWorkerPipeName = getWorkerPipeName;
  }
});

// node_modules/node-pty/lib/windowsConoutConnection.js
var require_windowsConoutConnection = __commonJS({
  "node_modules/node-pty/lib/windowsConoutConnection.js"(exports2) {
    "use strict";
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __generator = exports2 && exports2.__generator || function(thisArg, body) {
      var _ = { label: 0, sent: function() {
        if (t[0] & 1) throw t[1];
        return t[1];
      }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
      }), g;
      function verb(n) {
        return function(v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConoutConnection = void 0;
    var worker_threads_1 = require("worker_threads");
    var conout_1 = require_conout();
    var path_1 = require("path");
    var eventEmitter2_1 = require_eventEmitter2();
    var FLUSH_DATA_INTERVAL = 1e3;
    var ConoutConnection = (
      /** @class */
      (function() {
        function ConoutConnection2(_conoutPipeName, _useConptyDll) {
          var _this = this;
          this._conoutPipeName = _conoutPipeName;
          this._useConptyDll = _useConptyDll;
          this._isDisposed = false;
          this._onReady = new eventEmitter2_1.EventEmitter2();
          var workerData = {
            conoutPipeName: _conoutPipeName
          };
          var scriptPath = __dirname.replace("node_modules.asar", "node_modules.asar.unpacked");
          this._worker = new worker_threads_1.Worker(path_1.join(scriptPath, "worker/conoutSocketWorker.js"), { workerData });
          this._worker.on("message", function(message) {
            switch (message) {
              case 1:
                _this._onReady.fire();
                return;
              default:
                console.warn("Unexpected ConoutWorkerMessage", message);
            }
          });
        }
        Object.defineProperty(ConoutConnection2.prototype, "onReady", {
          get: function() {
            return this._onReady.event;
          },
          enumerable: false,
          configurable: true
        });
        ConoutConnection2.prototype.dispose = function() {
          if (!this._useConptyDll && this._isDisposed) {
            return;
          }
          this._isDisposed = true;
          this._drainDataAndClose();
        };
        ConoutConnection2.prototype.connectSocket = function(socket) {
          socket.connect(conout_1.getWorkerPipeName(this._conoutPipeName));
        };
        ConoutConnection2.prototype._drainDataAndClose = function() {
          var _this = this;
          if (this._drainTimeout) {
            clearTimeout(this._drainTimeout);
          }
          this._drainTimeout = setTimeout(function() {
            return _this._destroySocket();
          }, FLUSH_DATA_INTERVAL);
        };
        ConoutConnection2.prototype._destroySocket = function() {
          return __awaiter(this, void 0, void 0, function() {
            return __generator(this, function(_a) {
              switch (_a.label) {
                case 0:
                  return [4, this._worker.terminate()];
                case 1:
                  _a.sent();
                  return [
                    2
                    /*return*/
                  ];
              }
            });
          });
        };
        return ConoutConnection2;
      })()
    );
    exports2.ConoutConnection = ConoutConnection;
  }
});

// node_modules/node-pty/lib/windowsPtyAgent.js
var require_windowsPtyAgent = __commonJS({
  "node_modules/node-pty/lib/windowsPtyAgent.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.argsToCommandLine = exports2.WindowsPtyAgent = void 0;
    var fs2 = require("fs");
    var os = require("os");
    var path2 = require("path");
    var child_process_1 = require("child_process");
    var net_1 = require("net");
    var windowsConoutConnection_1 = require_windowsConoutConnection();
    var utils_1 = require_utils();
    var conptyNative;
    var winptyNative;
    var FLUSH_DATA_INTERVAL = 1e3;
    var WindowsPtyAgent = (
      /** @class */
      (function() {
        function WindowsPtyAgent2(file, args, env, cwd, cols, rows, debug, _useConpty, _useConptyDll, conptyInheritCursor) {
          var _this = this;
          if (_useConptyDll === void 0) {
            _useConptyDll = false;
          }
          if (conptyInheritCursor === void 0) {
            conptyInheritCursor = false;
          }
          this._useConpty = _useConpty;
          this._useConptyDll = _useConptyDll;
          this._pid = 0;
          this._innerPid = 0;
          if (this._useConpty === void 0 || this._useConpty === true) {
            this._useConpty = this._getWindowsBuildNumber() >= 18309;
          }
          if (this._useConpty) {
            if (!conptyNative) {
              conptyNative = utils_1.loadNativeModule("conpty").module;
            }
          } else {
            if (!winptyNative) {
              winptyNative = utils_1.loadNativeModule("pty").module;
            }
          }
          this._ptyNative = this._useConpty ? conptyNative : winptyNative;
          cwd = path2.resolve(cwd);
          var commandLine = argsToCommandLine(file, args);
          var term;
          if (this._useConpty) {
            term = this._ptyNative.startProcess(file, cols, rows, debug, this._generatePipeName(), conptyInheritCursor, this._useConptyDll);
          } else {
            term = this._ptyNative.startProcess(file, commandLine, env, cwd, cols, rows, debug);
            this._pid = term.pid;
            this._innerPid = term.innerPid;
          }
          this._fd = term.fd;
          this._pty = term.pty;
          this._outSocket = new net_1.Socket();
          this._outSocket.setEncoding("utf8");
          this._conoutSocketWorker = new windowsConoutConnection_1.ConoutConnection(term.conout, this._useConptyDll);
          this._conoutSocketWorker.onReady(function() {
            _this._conoutSocketWorker.connectSocket(_this._outSocket);
          });
          this._outSocket.on("connect", function() {
            _this._outSocket.emit("ready_datapipe");
          });
          var inSocketFD = fs2.openSync(term.conin, "w");
          this._inSocket = new net_1.Socket({
            fd: inSocketFD,
            readable: false,
            writable: true
          });
          this._inSocket.setEncoding("utf8");
          if (this._useConpty) {
            var connect = this._ptyNative.connect(this._pty, commandLine, cwd, env, this._useConptyDll, function(c) {
              return _this._$onProcessExit(c);
            });
            this._innerPid = connect.pid;
          }
        }
        Object.defineProperty(WindowsPtyAgent2.prototype, "inSocket", {
          get: function() {
            return this._inSocket;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsPtyAgent2.prototype, "outSocket", {
          get: function() {
            return this._outSocket;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsPtyAgent2.prototype, "fd", {
          get: function() {
            return this._fd;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsPtyAgent2.prototype, "innerPid", {
          get: function() {
            return this._innerPid;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsPtyAgent2.prototype, "pty", {
          get: function() {
            return this._pty;
          },
          enumerable: false,
          configurable: true
        });
        WindowsPtyAgent2.prototype.resize = function(cols, rows) {
          if (this._useConpty) {
            if (this._exitCode !== void 0) {
              throw new Error("Cannot resize a pty that has already exited");
            }
            this._ptyNative.resize(this._pty, cols, rows, this._useConptyDll);
            return;
          }
          this._ptyNative.resize(this._pid, cols, rows);
        };
        WindowsPtyAgent2.prototype.clear = function() {
          if (this._useConpty) {
            this._ptyNative.clear(this._pty, this._useConptyDll);
          }
        };
        WindowsPtyAgent2.prototype.kill = function() {
          var _this = this;
          if (this._useConpty) {
            if (!this._useConptyDll) {
              this._inSocket.readable = false;
              this._outSocket.readable = false;
              this._getConsoleProcessList().then(function(consoleProcessList) {
                consoleProcessList.forEach(function(pid) {
                  try {
                    process.kill(pid);
                  } catch (e) {
                  }
                });
              });
              this._ptyNative.kill(this._pty, this._useConptyDll);
              this._conoutSocketWorker.dispose();
            } else {
              this._inSocket.destroy();
              this._ptyNative.kill(this._pty, this._useConptyDll);
              this._outSocket.on("data", function() {
                _this._conoutSocketWorker.dispose();
              });
            }
          } else {
            var processList = this._ptyNative.getProcessList(this._pid);
            this._ptyNative.kill(this._pid, this._innerPid);
            processList.forEach(function(pid) {
              try {
                process.kill(pid);
              } catch (e) {
              }
            });
          }
        };
        WindowsPtyAgent2.prototype._getConsoleProcessList = function() {
          var _this = this;
          return new Promise(function(resolve) {
            var agent = child_process_1.fork(path2.join(__dirname, "conpty_console_list_agent"), [_this._innerPid.toString()]);
            agent.on("message", function(message) {
              clearTimeout(timeout);
              resolve(message.consoleProcessList);
            });
            var timeout = setTimeout(function() {
              agent.kill();
              resolve([_this._innerPid]);
            }, 5e3);
          });
        };
        Object.defineProperty(WindowsPtyAgent2.prototype, "exitCode", {
          get: function() {
            if (this._useConpty) {
              return this._exitCode;
            }
            var winptyExitCode = this._ptyNative.getExitCode(this._innerPid);
            return winptyExitCode === -1 ? void 0 : winptyExitCode;
          },
          enumerable: false,
          configurable: true
        });
        WindowsPtyAgent2.prototype._getWindowsBuildNumber = function() {
          var osVersion = /(\d+)\.(\d+)\.(\d+)/g.exec(os.release());
          var buildNumber = 0;
          if (osVersion && osVersion.length === 4) {
            buildNumber = parseInt(osVersion[3]);
          }
          return buildNumber;
        };
        WindowsPtyAgent2.prototype._generatePipeName = function() {
          return "conpty-" + Math.random() * 1e7;
        };
        WindowsPtyAgent2.prototype._$onProcessExit = function(exitCode) {
          var _this = this;
          this._exitCode = exitCode;
          if (!this._useConptyDll) {
            this._flushDataAndCleanUp();
            this._outSocket.on("data", function() {
              return _this._flushDataAndCleanUp();
            });
          }
        };
        WindowsPtyAgent2.prototype._flushDataAndCleanUp = function() {
          var _this = this;
          if (this._useConptyDll) {
            return;
          }
          if (this._closeTimeout) {
            clearTimeout(this._closeTimeout);
          }
          this._closeTimeout = setTimeout(function() {
            return _this._cleanUpProcess();
          }, FLUSH_DATA_INTERVAL);
        };
        WindowsPtyAgent2.prototype._cleanUpProcess = function() {
          if (this._useConptyDll) {
            return;
          }
          this._inSocket.readable = false;
          this._outSocket.readable = false;
          this._outSocket.destroy();
        };
        return WindowsPtyAgent2;
      })()
    );
    exports2.WindowsPtyAgent = WindowsPtyAgent;
    function argsToCommandLine(file, args) {
      if (isCommandLine(args)) {
        if (args.length === 0) {
          return file;
        }
        return argsToCommandLine(file, []) + " " + args;
      }
      var argv = [file];
      Array.prototype.push.apply(argv, args);
      var result = "";
      for (var argIndex = 0; argIndex < argv.length; argIndex++) {
        if (argIndex > 0) {
          result += " ";
        }
        var arg = argv[argIndex];
        var hasLopsidedEnclosingQuote = xOr(arg[0] !== '"', arg[arg.length - 1] !== '"');
        var hasNoEnclosingQuotes = arg[0] !== '"' && arg[arg.length - 1] !== '"';
        var quote = arg === "" || (arg.indexOf(" ") !== -1 || arg.indexOf("	") !== -1) && (arg.length > 1 && (hasLopsidedEnclosingQuote || hasNoEnclosingQuotes));
        if (quote) {
          result += '"';
        }
        var bsCount = 0;
        for (var i = 0; i < arg.length; i++) {
          var p = arg[i];
          if (p === "\\") {
            bsCount++;
          } else if (p === '"') {
            result += repeatText("\\", bsCount * 2 + 1);
            result += '"';
            bsCount = 0;
          } else {
            result += repeatText("\\", bsCount);
            bsCount = 0;
            result += p;
          }
        }
        if (quote) {
          result += repeatText("\\", bsCount * 2);
          result += '"';
        } else {
          result += repeatText("\\", bsCount);
        }
      }
      return result;
    }
    exports2.argsToCommandLine = argsToCommandLine;
    function isCommandLine(args) {
      return typeof args === "string";
    }
    function repeatText(text, count) {
      var result = "";
      for (var i = 0; i < count; i++) {
        result += text;
      }
      return result;
    }
    function xOr(arg1, arg2) {
      return arg1 && !arg2 || !arg1 && arg2;
    }
  }
});

// node_modules/node-pty/lib/windowsTerminal.js
var require_windowsTerminal = __commonJS({
  "node_modules/node-pty/lib/windowsTerminal.js"(exports2) {
    "use strict";
    var __extends = exports2 && exports2.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WindowsTerminal = void 0;
    var terminal_1 = require_terminal();
    var windowsPtyAgent_1 = require_windowsPtyAgent();
    var utils_1 = require_utils();
    var DEFAULT_FILE = "cmd.exe";
    var DEFAULT_NAME = "Windows Shell";
    var WindowsTerminal = (
      /** @class */
      (function(_super) {
        __extends(WindowsTerminal2, _super);
        function WindowsTerminal2(file, args, opt) {
          var _this = _super.call(this, opt) || this;
          _this._checkType("args", args, "string", true);
          args = args || [];
          file = file || DEFAULT_FILE;
          opt = opt || {};
          opt.env = opt.env || process.env;
          if (opt.encoding) {
            console.warn("Setting encoding on Windows is not supported");
          }
          var env = utils_1.assign({}, opt.env);
          _this._cols = opt.cols || terminal_1.DEFAULT_COLS;
          _this._rows = opt.rows || terminal_1.DEFAULT_ROWS;
          var cwd = opt.cwd || process.cwd();
          var name = opt.name || env.TERM || DEFAULT_NAME;
          var parsedEnv = _this._parseEnv(env);
          _this._isReady = false;
          _this._deferreds = [];
          _this._agent = new windowsPtyAgent_1.WindowsPtyAgent(file, args, parsedEnv, cwd, _this._cols, _this._rows, false, opt.useConpty, opt.useConptyDll, opt.conptyInheritCursor);
          _this._socket = _this._agent.outSocket;
          _this._pid = _this._agent.innerPid;
          _this._fd = _this._agent.fd;
          _this._pty = _this._agent.pty;
          _this._socket.on("ready_datapipe", function() {
            _this._socket.once("data", function() {
              if (!_this._isReady) {
                _this._isReady = true;
                _this._deferreds.forEach(function(fn) {
                  fn.run();
                });
                _this._deferreds = [];
              }
            });
            _this._socket.on("error", function(err) {
              _this._close();
              if (err.code) {
                if (~err.code.indexOf("errno 5") || ~err.code.indexOf("EIO"))
                  return;
              }
              if (_this.listeners("error").length < 2) {
                throw err;
              }
            });
            _this._socket.on("close", function() {
              _this.emit("exit", _this._agent.exitCode);
              _this._close();
            });
          });
          _this._file = file;
          _this._name = name;
          _this._readable = true;
          _this._writable = true;
          _this._forwardEvents();
          return _this;
        }
        WindowsTerminal2.prototype._write = function(data) {
          this._defer(this._doWrite, data);
        };
        WindowsTerminal2.prototype._doWrite = function(data) {
          this._agent.inSocket.write(data);
        };
        WindowsTerminal2.open = function(options) {
          throw new Error("open() not supported on windows, use Fork() instead.");
        };
        WindowsTerminal2.prototype.resize = function(cols, rows) {
          var _this = this;
          if (cols <= 0 || rows <= 0 || isNaN(cols) || isNaN(rows) || cols === Infinity || rows === Infinity) {
            throw new Error("resizing must be done using positive cols and rows");
          }
          this._deferNoArgs(function() {
            _this._agent.resize(cols, rows);
            _this._cols = cols;
            _this._rows = rows;
          });
        };
        WindowsTerminal2.prototype.clear = function() {
          var _this = this;
          this._deferNoArgs(function() {
            _this._agent.clear();
          });
        };
        WindowsTerminal2.prototype.destroy = function() {
          var _this = this;
          this._deferNoArgs(function() {
            _this.kill();
          });
        };
        WindowsTerminal2.prototype.kill = function(signal) {
          var _this = this;
          this._deferNoArgs(function() {
            if (signal) {
              throw new Error("Signals not supported on windows.");
            }
            _this._close();
            _this._agent.kill();
          });
        };
        WindowsTerminal2.prototype._deferNoArgs = function(deferredFn) {
          var _this = this;
          if (this._isReady) {
            deferredFn.call(this);
            return;
          }
          this._deferreds.push({
            run: function() {
              return deferredFn.call(_this);
            }
          });
        };
        WindowsTerminal2.prototype._defer = function(deferredFn, arg) {
          var _this = this;
          if (this._isReady) {
            deferredFn.call(this, arg);
            return;
          }
          this._deferreds.push({
            run: function() {
              return deferredFn.call(_this, arg);
            }
          });
        };
        Object.defineProperty(WindowsTerminal2.prototype, "process", {
          get: function() {
            return this._name;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsTerminal2.prototype, "master", {
          get: function() {
            throw new Error("master is not supported on Windows");
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(WindowsTerminal2.prototype, "slave", {
          get: function() {
            throw new Error("slave is not supported on Windows");
          },
          enumerable: false,
          configurable: true
        });
        return WindowsTerminal2;
      })(terminal_1.Terminal)
    );
    exports2.WindowsTerminal = WindowsTerminal;
  }
});

// node_modules/node-pty/lib/unixTerminal.js
var require_unixTerminal = __commonJS({
  "node_modules/node-pty/lib/unixTerminal.js"(exports2) {
    "use strict";
    var __extends = exports2 && exports2.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UnixTerminal = void 0;
    var fs2 = require("fs");
    var path2 = require("path");
    var tty = require("tty");
    var terminal_1 = require_terminal();
    var utils_1 = require_utils();
    var native = utils_1.loadNativeModule("pty");
    var pty2 = native.module;
    var helperPath = native.dir + "/spawn-helper";
    helperPath = path2.resolve(__dirname, helperPath);
    helperPath = helperPath.replace("app.asar", "app.asar.unpacked");
    helperPath = helperPath.replace("node_modules.asar", "node_modules.asar.unpacked");
    var DEFAULT_FILE = "sh";
    var DEFAULT_NAME = "xterm";
    var DESTROY_SOCKET_TIMEOUT_MS = 200;
    var UnixTerminal = (
      /** @class */
      (function(_super) {
        __extends(UnixTerminal2, _super);
        function UnixTerminal2(file, args, opt) {
          var _a, _b;
          var _this = _super.call(this, opt) || this;
          _this._boundClose = false;
          _this._emittedClose = false;
          if (typeof args === "string") {
            throw new Error("args as a string is not supported on unix.");
          }
          args = args || [];
          file = file || DEFAULT_FILE;
          opt = opt || {};
          opt.env = opt.env || process.env;
          _this._cols = opt.cols || terminal_1.DEFAULT_COLS;
          _this._rows = opt.rows || terminal_1.DEFAULT_ROWS;
          var uid = (_a = opt.uid) !== null && _a !== void 0 ? _a : -1;
          var gid = (_b = opt.gid) !== null && _b !== void 0 ? _b : -1;
          var env = utils_1.assign({}, opt.env);
          if (opt.env === process.env) {
            _this._sanitizeEnv(env);
          }
          var cwd = opt.cwd || process.cwd();
          env.PWD = cwd;
          var name = opt.name || env.TERM || DEFAULT_NAME;
          env.TERM = name;
          var parsedEnv = _this._parseEnv(env);
          var encoding = opt.encoding === void 0 ? "utf8" : opt.encoding;
          var onexit = function(code, signal) {
            if (!_this._emittedClose) {
              if (_this._boundClose) {
                return;
              }
              _this._boundClose = true;
              var timeout_1 = setTimeout(function() {
                timeout_1 = null;
                _this._socket.destroy();
              }, DESTROY_SOCKET_TIMEOUT_MS);
              _this.once("close", function() {
                if (timeout_1 !== null) {
                  clearTimeout(timeout_1);
                }
                _this.emit("exit", code, signal);
              });
              return;
            }
            _this.emit("exit", code, signal);
          };
          var term = pty2.fork(file, args, parsedEnv, cwd, _this._cols, _this._rows, uid, gid, encoding === "utf8", helperPath, onexit);
          _this._socket = new tty.ReadStream(term.fd);
          if (encoding !== null) {
            _this._socket.setEncoding(encoding);
          }
          _this._writeStream = new CustomWriteStream(term.fd, encoding || void 0);
          _this._socket.on("error", function(err) {
            if (err.code) {
              if (~err.code.indexOf("EAGAIN")) {
                return;
              }
            }
            _this._close();
            if (!_this._emittedClose) {
              _this._emittedClose = true;
              _this.emit("close");
            }
            if (err.code) {
              if (~err.code.indexOf("errno 5") || ~err.code.indexOf("EIO")) {
                return;
              }
            }
            if (_this.listeners("error").length < 2) {
              throw err;
            }
          });
          _this._pid = term.pid;
          _this._fd = term.fd;
          _this._pty = term.pty;
          _this._file = file;
          _this._name = name;
          _this._readable = true;
          _this._writable = true;
          _this._socket.on("close", function() {
            if (_this._emittedClose) {
              return;
            }
            _this._emittedClose = true;
            _this._close();
            _this.emit("close");
          });
          _this._forwardEvents();
          return _this;
        }
        Object.defineProperty(UnixTerminal2.prototype, "master", {
          get: function() {
            return this._master;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(UnixTerminal2.prototype, "slave", {
          get: function() {
            return this._slave;
          },
          enumerable: false,
          configurable: true
        });
        UnixTerminal2.prototype._write = function(data) {
          this._writeStream.write(data);
        };
        Object.defineProperty(UnixTerminal2.prototype, "fd", {
          /* Accessors */
          get: function() {
            return this._fd;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(UnixTerminal2.prototype, "ptsName", {
          get: function() {
            return this._pty;
          },
          enumerable: false,
          configurable: true
        });
        UnixTerminal2.open = function(opt) {
          var self = Object.create(UnixTerminal2.prototype);
          opt = opt || {};
          if (arguments.length > 1) {
            opt = {
              cols: arguments[1],
              rows: arguments[2]
            };
          }
          var cols = opt.cols || terminal_1.DEFAULT_COLS;
          var rows = opt.rows || terminal_1.DEFAULT_ROWS;
          var encoding = opt.encoding === void 0 ? "utf8" : opt.encoding;
          var term = pty2.open(cols, rows);
          self._master = new tty.ReadStream(term.master);
          if (encoding !== null) {
            self._master.setEncoding(encoding);
          }
          self._master.resume();
          self._slave = new tty.ReadStream(term.slave);
          if (encoding !== null) {
            self._slave.setEncoding(encoding);
          }
          self._slave.resume();
          self._socket = self._master;
          self._pid = -1;
          self._fd = term.master;
          self._pty = term.pty;
          self._file = process.argv[0] || "node";
          self._name = process.env.TERM || "";
          self._readable = true;
          self._writable = true;
          self._socket.on("error", function(err) {
            self._close();
            if (self.listeners("error").length < 2) {
              throw err;
            }
          });
          self._socket.on("close", function() {
            self._close();
          });
          return self;
        };
        UnixTerminal2.prototype.destroy = function() {
          var _this = this;
          this._close();
          this._socket.once("close", function() {
            _this.kill("SIGHUP");
          });
          this._socket.destroy();
          this._writeStream.dispose();
        };
        UnixTerminal2.prototype.kill = function(signal) {
          try {
            process.kill(this.pid, signal || "SIGHUP");
          } catch (e) {
          }
        };
        Object.defineProperty(UnixTerminal2.prototype, "process", {
          /**
           * Gets the name of the process.
           */
          get: function() {
            if (process.platform === "darwin") {
              var title = pty2.process(this._fd);
              return title !== "kernel_task" ? title : this._file;
            }
            return pty2.process(this._fd, this._pty) || this._file;
          },
          enumerable: false,
          configurable: true
        });
        UnixTerminal2.prototype.resize = function(cols, rows) {
          if (cols <= 0 || rows <= 0 || isNaN(cols) || isNaN(rows) || cols === Infinity || rows === Infinity) {
            throw new Error("resizing must be done using positive cols and rows");
          }
          pty2.resize(this._fd, cols, rows);
          this._cols = cols;
          this._rows = rows;
        };
        UnixTerminal2.prototype.clear = function() {
        };
        UnixTerminal2.prototype._sanitizeEnv = function(env) {
          delete env["TMUX"];
          delete env["TMUX_PANE"];
          delete env["STY"];
          delete env["WINDOW"];
          delete env["WINDOWID"];
          delete env["TERMCAP"];
          delete env["COLUMNS"];
          delete env["LINES"];
        };
        return UnixTerminal2;
      })(terminal_1.Terminal)
    );
    exports2.UnixTerminal = UnixTerminal;
    var CustomWriteStream = (
      /** @class */
      (function() {
        function CustomWriteStream2(_fd, _encoding) {
          this._fd = _fd;
          this._encoding = _encoding;
          this._writeQueue = [];
        }
        CustomWriteStream2.prototype.dispose = function() {
          clearImmediate(this._writeImmediate);
          this._writeImmediate = void 0;
        };
        CustomWriteStream2.prototype.write = function(data) {
          var buffer = typeof data === "string" ? Buffer.from(data, this._encoding) : Buffer.from(data);
          if (buffer.byteLength !== 0) {
            this._writeQueue.push({ buffer, offset: 0 });
            if (this._writeQueue.length === 1) {
              this._processWriteQueue();
            }
          }
        };
        CustomWriteStream2.prototype._processWriteQueue = function() {
          var _this = this;
          this._writeImmediate = void 0;
          if (this._writeQueue.length === 0) {
            return;
          }
          var task = this._writeQueue[0];
          fs2.write(this._fd, task.buffer, task.offset, function(err, written) {
            if (err) {
              if ("code" in err && err.code === "EAGAIN") {
                _this._writeImmediate = setImmediate(function() {
                  return _this._processWriteQueue();
                });
              } else {
                _this._writeQueue.length = 0;
                console.error("Unhandled pty write error", err);
              }
              return;
            }
            task.offset += written;
            if (task.offset >= task.buffer.byteLength) {
              _this._writeQueue.shift();
            }
            _this._processWriteQueue();
          });
        };
        return CustomWriteStream2;
      })()
    );
  }
});

// node_modules/node-pty/lib/index.js
var require_lib = __commonJS({
  "node_modules/node-pty/lib/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.native = exports2.open = exports2.createTerminal = exports2.fork = exports2.spawn = void 0;
    var utils_1 = require_utils();
    var terminalCtor;
    if (process.platform === "win32") {
      terminalCtor = require_windowsTerminal().WindowsTerminal;
    } else {
      terminalCtor = require_unixTerminal().UnixTerminal;
    }
    function spawn3(file, args, opt) {
      return new terminalCtor(file, args, opt);
    }
    exports2.spawn = spawn3;
    function fork(file, args, opt) {
      return new terminalCtor(file, args, opt);
    }
    exports2.fork = fork;
    function createTerminal(file, args, opt) {
      return new terminalCtor(file, args, opt);
    }
    exports2.createTerminal = createTerminal;
    function open(options) {
      return terminalCtor.open(options);
    }
    exports2.open = open;
    exports2.native = process.platform !== "win32" ? utils_1.loadNativeModule("pty").module : null;
  }
});

// main.ts
var import_electron = require("electron");
var import_node_path = __toESM(require("node:path"));
var import_node_fs = __toESM(require("node:fs"));
var import_node_child_process = require("node:child_process");
var import_promises = __toESM(require("node:fs/promises"));
var pty = __toESM(require_lib());
var toolRunnerProc = null;
var workspaceRoot = null;
var skillsRoot = import_node_path.default.join(__dirname, "../skills");
var terminals = /* @__PURE__ */ new Map();
async function isToolRunnerUp(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
async function ensureToolRunner() {
  const baseUrl = "http://127.0.0.1:8000";
  const isUp = await isToolRunnerUp(baseUrl);
  if (isUp) return;
  const pythonBin = process.platform === "win32" ? "python" : "python3";
  const scriptPath = import_node_path.default.join(__dirname, "../python/tool_runner.py");
  if (!import_node_fs.default.existsSync(scriptPath)) {
    console.warn("[Lexentia] tool_runner.py not found; tools will be unavailable.");
    return;
  }
  toolRunnerProc = (0, import_node_child_process.spawn)(pythonBin, [scriptPath], {
    cwd: import_node_path.default.join(__dirname, ".."),
    stdio: "ignore"
  });
  toolRunnerProc.on("exit", (code) => {
    console.warn(`[Lexentia] tool runner exited with code ${code}`);
  });
}
async function isDevServerUp(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
function createMainWindow() {
  const win = new import_electron.BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: import_node_path.default.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      // MVP: allow local HTTP calls (Ollama/tools) without CORS friction.
      // Production should re-enable webSecurity and properly handle CORS.
      webSecurity: false
    }
  });
  const distIndexPath = import_node_path.default.join(__dirname, "../dist/renderer/index.html");
  const rendererDevUrl = "http://localhost:5173/";
  (async () => {
    const devUp = await isDevServerUp(rendererDevUrl);
    const loadTarget = devUp ? rendererDevUrl : import_node_fs.default.existsSync(distIndexPath) ? `file://${distIndexPath}` : rendererDevUrl;
    await win.loadURL(loadTarget);
    console.log(`[Lexentia] Renderer loaded from: ${loadTarget}`);
  })();
  return win;
}
function isWithinWorkspace(absPath) {
  if (!workspaceRoot) return false;
  const rel = import_node_path.default.relative(workspaceRoot, absPath);
  return !!rel && !rel.startsWith("..") && !import_node_path.default.isAbsolute(rel);
}
function resolveInWorkspace(relPath) {
  if (!workspaceRoot) throw new Error("Workspace is not set");
  const abs = import_node_path.default.resolve(workspaceRoot, relPath);
  if (!isWithinWorkspace(abs) && abs !== workspaceRoot) {
    throw new Error("Path is outside workspace");
  }
  return abs;
}
function registerIpcHandlers() {
  import_electron.ipcMain.handle("win:minimize", async (evt) => {
    const win = import_electron.BrowserWindow.fromWebContents(evt.sender);
    if (!win) return { ok: false };
    win.minimize();
    return { ok: true };
  });
  import_electron.ipcMain.handle("win:toggleMaximize", async (evt) => {
    const win = import_electron.BrowserWindow.fromWebContents(evt.sender);
    if (!win) return { ok: false, isMaximized: false };
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return { ok: true, isMaximized: win.isMaximized() };
  });
  import_electron.ipcMain.handle("win:close", async (evt) => {
    const win = import_electron.BrowserWindow.fromWebContents(evt.sender);
    if (!win) return { ok: false };
    win.close();
    return { ok: true };
  });
  import_electron.ipcMain.handle("win:isMaximized", async (evt) => {
    const win = import_electron.BrowserWindow.fromWebContents(evt.sender);
    if (!win) return { ok: false, isMaximized: false };
    return { ok: true, isMaximized: win.isMaximized() };
  });
  import_electron.ipcMain.handle("workspace:openFolder", async () => {
    const res = await import_electron.dialog.showOpenDialog({
      title: "Open Folder",
      properties: ["openDirectory"]
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false };
    workspaceRoot = res.filePaths[0];
    return { ok: true, workspaceRoot };
  });
  import_electron.ipcMain.handle("workspace:get", async () => {
    return { ok: true, workspaceRoot };
  });
  import_electron.ipcMain.handle("fs:listDir", async (_evt, relPath) => {
    const abs = resolveInWorkspace(relPath || ".");
    const entries = await import_promises.default.readdir(abs, { withFileTypes: true });
    const mapped = await Promise.all(
      entries.map(async (e) => {
        const childAbs = import_node_path.default.join(abs, e.name);
        const st = await import_promises.default.stat(childAbs);
        return {
          name: e.name,
          isDir: e.isDirectory(),
          size: st.size,
          mtimeMs: st.mtimeMs
        };
      })
    );
    mapped.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return { ok: true, entries: mapped };
  });
  import_electron.ipcMain.handle("fs:readFile", async (_evt, relPath) => {
    const abs = resolveInWorkspace(relPath);
    const data = await import_promises.default.readFile(abs, "utf-8");
    return { ok: true, content: data };
  });
  import_electron.ipcMain.handle("fs:writeFile", async (_evt, relPath, content) => {
    const abs = resolveInWorkspace(relPath);
    await import_promises.default.mkdir(import_node_path.default.dirname(abs), { recursive: true });
    await import_promises.default.writeFile(abs, content ?? "", "utf-8");
    return { ok: true };
  });
  import_electron.ipcMain.handle("skills:list", async () => {
    try {
      if (!import_node_fs.default.existsSync(skillsRoot)) return { ok: true, entries: [] };
      const entries = await import_promises.default.readdir(skillsRoot, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile()).map((e) => e.name).filter((name) => name.toLowerCase().endsWith(".md") || name.toLowerCase().endsWith(".txt"));
      const mapped = await Promise.all(
        files.map(async (name) => {
          const abs = import_node_path.default.join(skillsRoot, name);
          const st = await import_promises.default.stat(abs);
          return { name, size: st.size, mtimeMs: st.mtimeMs };
        })
      );
      mapped.sort((a, b) => a.name.localeCompare(b.name));
      return { ok: true, entries: mapped };
    } catch (e) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  });
  import_electron.ipcMain.handle("skills:read", async (_evt, name) => {
    try {
      const safe = String(name ?? "").trim();
      if (!safe || safe.includes("..") || safe.includes("/") || safe.includes("\\")) return { ok: false, error: "Invalid skill name" };
      const abs = import_node_path.default.join(skillsRoot, safe);
      if (!abs.startsWith(skillsRoot)) return { ok: false, error: "Invalid skill path" };
      const content = await import_promises.default.readFile(abs, "utf-8");
      return { ok: true, content };
    } catch (e) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  });
  import_electron.ipcMain.handle("term:create", async (evt, opts) => {
    const win = import_electron.BrowserWindow.fromWebContents(evt.sender);
    if (!win) return { ok: false };
    const id = `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash";
    const cwd = opts?.cwd ?? workspaceRoot ?? process.cwd();
    try {
      const p = pty.spawn(shell, [], {
        name: "xterm-color",
        cols: 120,
        rows: 30,
        cwd,
        env: process.env
      });
      terminals.set(id, { kind: "pty", ptyProcess: p, cwd });
      p.onData((data) => {
        win.webContents.send("term:data", { id, data });
      });
      p.onExit(() => {
        terminals.delete(id);
        win.webContents.send("term:data", { id, data: "\r\n[terminal exited]\r\n" });
      });
    } catch (error) {
      const fallback = (0, import_node_child_process.spawn)(shell, [], {
        cwd,
        env: process.env,
        stdio: "pipe"
      });
      terminals.set(id, { kind: "proc", process: fallback, cwd });
      fallback.stdout.on("data", (chunk) => {
        win.webContents.send("term:data", { id, data: String(chunk) });
      });
      fallback.stderr.on("data", (chunk) => {
        win.webContents.send("term:data", { id, data: String(chunk) });
      });
      fallback.on("exit", () => {
        terminals.delete(id);
        win.webContents.send("term:data", { id, data: "\r\n[terminal exited]\r\n" });
      });
      console.warn("[Lexentia] node-pty failed; using fallback terminal process:", error);
    }
    return { ok: true, id };
  });
  import_electron.ipcMain.handle("term:write", async (_evt, id, data) => {
    const t = terminals.get(id);
    if (!t) return { ok: false };
    if (t.kind === "pty") {
      t.ptyProcess.write(String(data ?? ""));
    } else {
      t.process.stdin.write(String(data ?? ""));
    }
    return { ok: true };
  });
  import_electron.ipcMain.handle("term:resize", async (_evt, id, cols, rows) => {
    const t = terminals.get(id);
    if (!t) return { ok: false };
    if (t.kind === "pty") {
      t.ptyProcess.resize(Math.max(2, cols | 0), Math.max(2, rows | 0));
    }
    return { ok: true };
  });
  import_electron.ipcMain.handle("term:kill", async (_evt, id) => {
    const t = terminals.get(id);
    if (!t) return { ok: false };
    try {
      if (t.kind === "pty") t.ptyProcess.kill();
      else t.process.kill();
    } finally {
      terminals.delete(id);
    }
    return { ok: true };
  });
}
import_electron.app.whenReady().then(() => {
  import_electron.Menu.setApplicationMenu(null);
  registerIpcHandlers();
  createMainWindow();
  void ensureToolRunner();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron.app.quit();
});
import_electron.app.on("before-quit", () => {
  try {
    toolRunnerProc?.kill();
  } catch {
  }
});
