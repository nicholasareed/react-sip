"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var PropTypes = require("prop-types");
var React = require("react");
var JsSIP = require("jssip");
var EventEmitter = require("eventemitter3");
var mediaengine_1 = require("../../medialib/mediaengine");
var dummyLogger_1 = require("../../lib/dummyLogger");
var sipcall_1 = require("../../siplib/sipcall");
var enums_1 = require("../../lib/enums");
var types_1 = require("../../lib/types");
var Constants_1 = require("jssip/lib/Constants");
var SipProvider = (function (_super) {
    __extends(SipProvider, _super);
    function SipProvider(props) {
        var _this = _super.call(this, props) || this;
        _this.ua = null;
        _this._uaConfig = null;
        _this._initProperties = function () {
            _this._uaConfig = {
                host: _this.props.host,
                sessionTimers: true,
                registerExpires: 600,
                userAgent: 'CioPhone UA v0.1',
            };
            _this._callConfig = {
                extraHeaders: _this.props.extraHeaders,
                sessionTimerExpires: _this.props.sessionTimersExpires,
                getSetting: _this.props.getSetting
            };
            _this._rtcConfig = {
                iceServers: _this.props.iceServers,
            };
            _this._dtmfOptions = {
                duration: 100,
                interToneGap: 500,
                channelType: Constants_1.DTMF_TRANSPORT.RFC2833,
            };
            _this._mediaEngine = new mediaengine_1.MediaEngine(null, _this.eventBus);
        };
        _this._getCallConfig = function () {
            return _this._callConfig;
        };
        _this._getRTCConfig = function () {
            return _this._rtcConfig;
        };
        _this._getDtmfOptions = function () {
            return _this._dtmfOptions;
        };
        _this._getUA = function () {
            return _this.ua;
        };
        _this._getUAOrFail = function () {
            var ua = _this._getUA();
            if (!ua) {
                throw new Error('JsSIP.UA not initialized');
            }
            return ua;
        };
        _this.isLineConnected = function () {
            return _this.state.lineStatus === enums_1.LINE_STATUS_CONNECTED;
        };
        _this.isRegistered = function () {
            return _this.state.sipStatus === enums_1.SIP_STATUS_REGISTERED;
        };
        _this.hasError = function () {
            return _this.state.errorType !== enums_1.SIP_ERROR_TYPE_NONE;
        };
        _this.getErrorMessage = function () {
            return _this.state.errorMessage;
        };
        _this._isCallAllowed = function () {
            if (!_this._mediaEngine) {
                _this._logger.debug('Media device is not ready');
                return false;
            }
            if (!_this.isRegistered()) {
                _this._logger.error('Sip device is not registered with the network');
                return false;
            }
            if (_this.state.callList.length >= _this.props.maxAllowedCalls) {
                _this._logger.debug('Max allowed call limit has reached');
                return false;
            }
            var callList = _this.state.callList;
            var establishing = callList.find(function (call) {
                return call.isEstablishing() === true;
            });
            if (establishing && establishing !== undefined) {
                _this._logger.debug('Already a call is in establishing state');
                return false;
            }
            return true;
        };
        _this._addToHistory = function (call) {
            var direction = call._direction === enums_1.CALL_DIRECTION_OUTGOING ? 'outgoing' : 'incoming';
            var callInfo = {
                _id: call.getId(),
                _direction: direction,
                _remoteName: call.remoteName,
                _remoteUser: call.remoteUser,
                _startTime: call.startTime,
                _endTime: call.endTime,
                _endType: call._endType,
                _errorReason: call._errorReason,
                _additionalInfo: call._additionalInfo
            };
            var callHistory = __spreadArrays([callInfo], _this.state.callHistory);
            _this.setState({ callHistory: callHistory });
        };
        _this.makeCall = function (callee, isVideoCall, additionalInfo, callEventHandler) {
            if (!callee) {
                throw new Error("Destination must be defined (" + callee + " given)");
            }
            if (!_this.ua) {
                throw new Error("Calling startCall is not allowed when JsSIP.UA isn't initialized");
            }
            if (!_this.isLineConnected()) {
                throw new Error("Phone is not connected to the network, current state - " + _this.state.lineStatus);
            }
            if (!_this._isCallAllowed()) {
                throw new Error("Max limit reached, new calls are not allowed");
            }
            var callList = _this.state.callList;
            var activeCall = callList.find(function (item) { return item.isMediaActive(); });
            if (activeCall) {
                throw new Error("An active call found, hold the call before making new call");
            }
            var rtcConfig = _this._getRTCConfig();
            var dtmfOptions = _this._getDtmfOptions();
            var sipCall = new sipcall_1.SipCall(false, callee, null, _this._getCallConfig(), rtcConfig, dtmfOptions, _this._mediaEngine, _this.eventBus, additionalInfo);
            var ua = _this._getUA();
            sipCall.dial(ua, callee, true, isVideoCall, callEventHandler);
            callList.push(sipCall);
            _this.setState({ callList: callList });
            return sipCall.getId();
        };
        _this.playTone = function (tone) {
            _this._mediaEngine.playTone(tone);
        };
        _this.stopTone = function (tone) {
            _this._mediaEngine.stopTone(tone);
        };
        _this.setSpeakerVolume = function (vol) {
            _this._mediaEngine.changeOutputVolume(vol);
        };
        _this.getSpeakerVolume = function () {
            return _this._mediaEngine.getOutputVolume();
        };
        _this.setMicVolume = function (vol) {
            _this._mediaEngine.changeInputVolume(vol);
        };
        _this.getMicVolume = function (vol) {
            return _this._mediaEngine.getInputVolume();
        };
        _this.setRingVolume = function (vol) {
            _this._mediaEngine.changeRingVolume(vol);
        };
        _this.getRingVolume = function () {
            return _this._mediaEngine.getRingVolume();
        };
        _this.changeAudioInput = function (deviceId) {
            _this._mediaEngine.changeAudioInput(deviceId);
        };
        _this.changeAudioOutput = function (deviceId) {
            _this._mediaEngine.changeAudioOutput(deviceId);
        };
        _this.changeVideoInput = function (deviceId) {
            _this._mediaEngine.changeVideoInput(deviceId);
        };
        _this.getPreferredDevice = function (deviceKind) {
            return _this._mediaEngine.getConfiguredDevice(deviceKind);
        };
        _this._terminateAll = function () {
            if (!_this.ua) {
                throw Error("UA is not connected");
            }
            _this.ua.terminateSessions();
        };
        _this.state = {
            lineStatus: enums_1.LINE_STATUS_DISCONNECTED,
            sipStatus: enums_1.SIP_STATUS_UNREGISTERED,
            errorType: enums_1.SIP_ERROR_TYPE_NONE,
            errorMessage: '',
            callList: [],
            callHistory: [],
            mediaDevices: []
        };
        _this.ua = null;
        _this.eventBus = new EventEmitter();
        return _this;
    }
    SipProvider.prototype.getChildContext = function () {
        return {
            sip: __assign(__assign({}, this.props), { addr: this._localAddr, status: this.state.sipStatus, errorType: this.state.errorType, errorMessage: this.state.errorMessage }),
            calls: __spreadArrays(this.state.callList),
            callHistory: __spreadArrays(this.state.callHistory),
            isLineConnected: this.isLineConnected.bind(this),
            isRegistered: this.isRegistered.bind(this),
            hasError: this.hasError.bind(this),
            getErrorMessage: this.getErrorMessage.bind(this),
            registerSip: this.registerSip.bind(this),
            unregisterSip: this.unregisterSip.bind(this),
            makeCall: this.makeCall.bind(this),
            playTone: this.playTone.bind(this),
            stopTone: this.stopTone.bind(this),
            setSpeakerVolume: this.setSpeakerVolume.bind(this),
            getSpeakerVolume: this.getSpeakerVolume.bind(this),
            setMicVolume: this.setMicVolume.bind(this),
            getMicVolume: this.getMicVolume.bind(this),
            setRingVolume: this.setRingVolume.bind(this),
            getRingVolume: this.getRingVolume.bind(this),
            changeAudioInput: this.changeAudioInput.bind(this),
            changeAudioOutput: this.changeAudioOutput.bind(this),
            changeVideoInput: this.changeVideoInput.bind(this),
            mediaDevices: __spreadArrays(this.state.mediaDevices),
            getPreferredDevice: this.getPreferredDevice.bind(this)
        };
    };
    SipProvider.prototype.componentDidMount = function () {
        if (window.document.getElementById('sip-provider-audio')) {
            throw new Error("Creating two SipProviders in one application is forbidden. If that's not the case " +
                "then check if you're using \"sip-provider-audio\" as id attribute for any existing " +
                "element");
        }
        this._reconfigureDebug();
        this._initProperties();
        this._reinitializeJsSIP();
    };
    SipProvider.prototype.componentDidUpdate = function (prevProps) {
        if (this.props.debug !== prevProps.debug) {
            this._reconfigureDebug();
        }
        if (this.props.socket !== prevProps.socket ||
            this.props.host !== prevProps.host ||
            this.props.port !== prevProps.port ||
            this.props.pathname !== prevProps.pathname ||
            this.props.secure !== prevProps.secure ||
            this.props.user !== prevProps.user ||
            this.props.realm !== prevProps.realm ||
            this.props.password !== prevProps.password ||
            this.props.autoRegister !== prevProps.autoRegister) {
            this._reinitializeJsSIP();
        }
    };
    SipProvider.prototype.componentWillUnmount = function () {
        if (this.ua) {
            this._terminateAll();
            this.ua.stop();
            this.ua = null;
        }
        if (this._mediaEngine) {
            this._mediaEngine.closeAll();
        }
    };
    SipProvider.prototype.registerSip = function () {
        if (!this.ua) {
            throw new Error("Calling registerSip is not allowed when JsSIP.UA isn't initialized");
        }
        if (this.props.autoRegister) {
            throw new Error('Calling registerSip is not allowed when autoRegister === true');
        }
        if (this.state.lineStatus !== enums_1.LINE_STATUS_CONNECTED) {
            throw new Error("Calling registerSip is not allowed when line status is " + this.state.lineStatus + " (expected " + enums_1.LINE_STATUS_CONNECTED + ")");
        }
        this.ua.register();
    };
    SipProvider.prototype.unregisterSip = function (options) {
        if (!this.ua) {
            throw new Error("Calling unregisterSip is not allowed when JsSIP.UA isn't initialized");
        }
        if (this.state.sipStatus !== enums_1.SIP_STATUS_REGISTERED) {
            throw new Error("Calling unregisterSip is not allowed when sip status is " + this.state.sipStatus + " (expected " + enums_1.SIP_STATUS_REGISTERED + ")");
        }
        this.ua.unregister(options);
    };
    SipProvider.prototype._reconfigureDebug = function () {
        var debug = this.props.debug;
        if (debug) {
            JsSIP.debug.enable(this.props.debugNamespaces || 'JsSIP:*');
            this._logger = console;
        }
        else {
            JsSIP.debug.disable();
            this._logger = dummyLogger_1.default;
        }
    };
    SipProvider.prototype._reinitializeJsSIP = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var _b, socket, user, password, realm, autoRegister, socketJsSip, _c, ua, eventBus, extraHeadersRegister;
            var _this = this;
            return __generator(this, function (_d) {
                if (this.ua) {
                    this.ua.stop();
                    this.ua = null;
                }
                _b = this.props, socket = _b.socket, user = _b.user, password = _b.password, realm = _b.realm, autoRegister = _b.autoRegister;
                this._localAddr = user + "@" + realm;
                if (!user) {
                    this.setState({
                        sipStatus: enums_1.SIP_STATUS_UNREGISTERED,
                        errorType: enums_1.SIP_ERROR_TYPE_CONFIGURATION,
                        errorMessage: 'user parameter is missing in config',
                    });
                    return [2];
                }
                try {
                    socketJsSip = new JsSIP.WebSocketInterface(socket);
                    this.ua = new JsSIP.UA({
                        uri: user + "@" + realm,
                        authorization_user: user,
                        realm: realm,
                        password: password,
                        sockets: [socketJsSip],
                        register: autoRegister,
                        session_timers: (_a = this._uaConfig) === null || _a === void 0 ? void 0 : _a.sessionTimers,
                    });
                    window.UA = this.ua;
                    window.UA_SOCKET = socketJsSip;
                }
                catch (error) {
                    console.log(error.message);
                    this.setState({
                        sipStatus: enums_1.SIP_STATUS_ERROR,
                        errorType: enums_1.SIP_ERROR_TYPE_CONFIGURATION,
                        errorMessage: error.message,
                    });
                    this._logger.debug(error.message);
                    return [2];
                }
                _c = this, ua = _c.ua, eventBus = _c.eventBus;
                ua.on('connecting', function () {
                    _this._logger.debug('UA "connecting" event');
                    if (_this.ua !== ua) {
                        return;
                    }
                    _this.setState({
                        lineStatus: enums_1.LINE_STATUS_CONNECTING,
                    });
                });
                ua.on('connected', function () {
                    _this._logger.debug('UA "connected" event');
                    if (_this.ua !== ua) {
                        return;
                    }
                    _this.setState({
                        lineStatus: enums_1.LINE_STATUS_CONNECTED,
                        errorType: enums_1.SIP_ERROR_TYPE_NONE,
                        errorMessage: '',
                    });
                });
                ua.on('disconnected', function () {
                    _this._logger.debug('UA "disconnected" event');
                    if (_this.ua !== ua) {
                        return;
                    }
                    _this.setState({
                        lineStatus: enums_1.LINE_STATUS_DISCONNECTED,
                        sipStatus: enums_1.SIP_STATUS_ERROR,
                        errorType: enums_1.SIP_ERROR_TYPE_CONNECTION,
                        errorMessage: 'disconnected',
                    });
                });
                ua.on('registered', function (data) {
                    _this._logger.debug('UA "registered" event', data);
                    if (_this.ua !== ua) {
                        return;
                    }
                    _this.setState({
                        sipStatus: enums_1.SIP_STATUS_REGISTERED,
                        errorType: enums_1.SIP_ERROR_TYPE_NONE,
                        errorMessage: '',
                    });
                });
                ua.on('unregistered', function () {
                    _this._logger.debug('UA "unregistered" event');
                    if (_this.ua !== ua) {
                        return;
                    }
                    _this.setState({
                        sipStatus: enums_1.SIP_STATUS_UNREGISTERED,
                    });
                });
                ua.on('registrationFailed', function (data) {
                    _this._logger.debug('UA "registrationFailed" event');
                    console.log(data.cause);
                    if (_this.ua !== ua) {
                        return;
                    }
                    _this.setState({
                        sipStatus: enums_1.SIP_STATUS_ERROR,
                        errorType: enums_1.SIP_ERROR_TYPE_REGISTRATION,
                        errorMessage: data.cause === undefined ? '' : data.cause,
                    });
                });
                ua.on('newRTCSession', function (data) {
                    var callList = _this.state.callList;
                    if (!_this || _this.ua !== ua) {
                        return;
                    }
                    var originator = data.originator, session = data.session, request = data.request;
                    if (originator === 'remote') {
                        var remoteIdentity = session.remote_identity;
                        var remoteName = remoteIdentity.display_name;
                        if (remoteName === null || remoteName === '') {
                            remoteName = remoteIdentity.uri.user;
                        }
                        if (!_this._isCallAllowed()) {
                            var rejectOptions = {
                                status_code: 486,
                                reason_phrase: 'Busy Here',
                            };
                            session.terminate(rejectOptions);
                            return;
                        }
                        var sipCall = new sipcall_1.SipCall(true, remoteName, remoteIdentity, _this._getCallConfig(), _this._getRTCConfig(), _this._getDtmfOptions(), _this._mediaEngine, _this.eventBus, {});
                        sipCall.onNewRTCSession(session, request);
                        callList.push(sipCall);
                        _this.setState({ callList: callList });
                    }
                    else {
                        var outCall = callList.find(function (call) { return call.isDialing() === true; });
                        if (outCall !== undefined) {
                            outCall.onNewRTCSession(session, request);
                        }
                    }
                });
                eventBus.on('call.update', function (event) {
                    var call = event.call;
                    var callList = _this.state.callList;
                    console.log('Event emitter on call.update');
                    console.log(event.call.getCallStatus());
                    var index = callList.findIndex(function (item) { return item.getId() === call.getId(); });
                    if (index !== -1) {
                        callList[index] = call;
                        _this.setState({ callList: callList });
                    }
                });
                eventBus.on('call.ended', function (event) {
                    var call = event.call;
                    var callList = _this.state.callList;
                    console.log('Event emitter on call.ended');
                    var index = callList.findIndex(function (item) { return item.getId() === call.getId(); });
                    if (index !== -1) {
                        callList.splice(index, 1);
                        _this.setState({ callList: callList });
                    }
                    console.log(callList);
                });
                eventBus.on('media.device.update', function (event) {
                    var mediaDevices = _this._mediaEngine.fetchAllDevices();
                    _this.setState({ mediaDevices: mediaDevices });
                });
                extraHeadersRegister = this.props.extraHeaders.register || [];
                if (extraHeadersRegister.length) {
                    ua.registrator().setExtraHeaders(extraHeadersRegister);
                }
                ua.start();
                return [2];
            });
        });
    };
    SipProvider.prototype.render = function () {
        return this.props.children;
    };
    SipProvider.childContextTypes = {
        sip: types_1.sipPropType,
        calls: types_1.callInfoListPropType,
        callHistory: types_1.callHistoryPropType,
        isLineConnected: PropTypes.func,
        isRegistered: PropTypes.func,
        hasError: PropTypes.func,
        getErrorMessage: PropTypes.func,
        registerSip: PropTypes.func,
        unregisterSip: PropTypes.func,
        makeCall: PropTypes.func,
        playTone: PropTypes.func,
        stopTone: PropTypes.func,
        setSpeakerVolume: PropTypes.func,
        getSpeakerVolume: PropTypes.func,
        setMicVolume: PropTypes.func,
        getMicVolume: PropTypes.func,
        setRingVolume: PropTypes.func,
        getRingVolume: PropTypes.func,
        changeAudioInput: PropTypes.func,
        changeAudioOutput: PropTypes.func,
        changeVideoInput: PropTypes.func,
        mediaDevices: types_1.mediaDeviceListPropType,
        getPreferredDevice: PropTypes.func
    };
    SipProvider.propTypes = {
        socket: PropTypes.string,
        user: PropTypes.string,
        uri: PropTypes.string,
        password: PropTypes.string,
        realm: PropTypes.string,
        secure: PropTypes.bool,
        autoRegister: PropTypes.bool,
        autoAnswer: PropTypes.bool,
        iceRestart: PropTypes.bool,
        sessionTimersExpires: PropTypes.number,
        extraHeaders: types_1.extraHeadersPropType,
        iceServers: types_1.iceServersPropType,
        maxAllowedCalls: PropTypes.number,
        debug: PropTypes.bool,
        registrar: PropTypes.string,
        getSetting: PropTypes.func,
        children: PropTypes.node,
    };
    SipProvider.defaultProps = {
        host: null,
        port: null,
        pathname: '',
        secure: true,
        user: null,
        password: null,
        autoRegister: true,
        autoAnswer: false,
        iceRestart: false,
        sessionTimersExpires: 120,
        maxAllowedCalls: 4,
        extraHeaders: {
            register: [],
            invite: [],
            nonInvite: [],
            info: [],
            refer: [],
            resp2xx: [],
            resp4xx: [],
        },
        iceServers: [],
        debug: false,
        children: null,
    };
    return SipProvider;
}(React.Component));
exports.default = SipProvider;
//# sourceMappingURL=index.js.map