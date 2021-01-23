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
Object.defineProperty(exports, "__esModule", { value: true });
var JsSIP = require("jssip");
var PropTypes = require("prop-types");
var React = require("react");
var dummyLogger_1 = require("../../lib/dummyLogger");
var enums_1 = require("../../lib/enums");
var media_1 = require("../../lib/media");
var types_1 = require("../../lib/types");
var SipProvider = (function (_super) {
    __extends(SipProvider, _super);
    function SipProvider(props) {
        var _this = _super.call(this, props) || this;
        _this.ua = null;
        _this.remoteAudio = null;
        _this.currentSinkId = null;
        _this.isPlaying = false;
        _this.answerCall = function (options) {
            var opts = {
                mediaConstraints: {
                    audio: true,
                    video: false,
                },
                pcConfig: {
                    iceServers: _this.props.iceServers,
                },
            };
            Object.assign(opts, options);
            if (_this.state.callStatus !== enums_1.CALL_STATUS_STARTING || _this.state.callDirection !== enums_1.CALL_DIRECTION_INCOMING) {
                throw new Error("Calling answerCall() is not allowed when call status is " + _this.state.callStatus + " and call direction is " + _this.state.callDirection + "  (expected " + enums_1.CALL_STATUS_STARTING + " and " + enums_1.CALL_DIRECTION_INCOMING + ")");
            }
            if (!_this.state.rtcSession) {
                throw new Error('State does not have an active session.');
            }
            _this.state.rtcSession.answer(opts);
        };
        _this.startCall = function (destination, anonymous) {
            if (!destination) {
                throw new Error("Destination must be defined (" + destination + " given)");
            }
            if (!_this.ua) {
                throw new Error("Calling startCall is not allowed when JsSIP.UA isn't initialized");
            }
            if (_this.state.sipStatus !== enums_1.SIP_STATUS_CONNECTED && _this.state.sipStatus !== enums_1.SIP_STATUS_REGISTERED) {
                throw new Error("Calling startCall() is not allowed when sip status is " + _this.state.sipStatus + " (expected " + enums_1.SIP_STATUS_CONNECTED + " or " + enums_1.SIP_STATUS_REGISTERED + ")");
            }
            if (_this.state.callStatus !== enums_1.CALL_STATUS_IDLE) {
                throw new Error("Calling startCall() is not allowed when call status is " + _this.state.callStatus + " (expected " + enums_1.CALL_STATUS_IDLE + ")");
            }
            if (!anonymous) {
                anonymous = false;
            }
            var _a = _this.props, iceServers = _a.iceServers, sessionTimersExpires = _a.sessionTimersExpires;
            var extraHeaders = _this.props.extraHeaders.invite;
            var options = {
                extraHeaders: extraHeaders,
                mediaConstraints: { audio: true, video: false },
                rtcOfferConstraints: { iceRestart: _this.props.iceRestart },
                pcConfig: {
                    iceServers: iceServers,
                },
                sessionTimersExpires: sessionTimersExpires,
                anonymous: anonymous,
            };
            _this.ua.call(String(destination), options);
            _this.setState({ callStatus: enums_1.CALL_STATUS_STARTING });
        };
        _this.stopCall = function (options) {
            if (!_this.ua) {
                throw new Error("Calling stopCall is not allowed when JsSIP.UA isn't initialized");
            }
            _this.setState({ callStatus: enums_1.CALL_STATUS_STOPPING });
            _this.ua.terminateSessions(options);
        };
        _this.sendDTMF = function (tones, duration, interToneGap) {
            if (duration === void 0) { duration = 100; }
            if (interToneGap === void 0) { interToneGap = 70; }
            if (_this.state.callStatus === 'callStatus/ACTIVE' && _this.state.dtmfSender) {
                _this.state.dtmfSender.insertDTMF(tones, duration, interToneGap);
            }
            else {
                _this.logger.debug('Warning:', 'You are attempting to send DTMF, but there is no active call.');
            }
        };
        _this.setAudioSinkId = function (sinkId) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.currentSinkId && sinkId === this.currentSinkId) {
                    return [2];
                }
                this.currentSinkId = sinkId;
                return [2, this.getRemoteAudioOrFail().setSinkId(sinkId)];
            });
        }); };
        _this.callHold = function (useUpdate) {
            if (useUpdate === void 0) { useUpdate = false; }
            if (!_this.state.rtcSession) {
                _this.logger.warn("callHold: no-op as there's no active rtcSession");
                return;
            }
            var holdStatus = _this.state.rtcSession.isOnHold();
            if (!holdStatus.local) {
                var options = {
                    useUpdate: useUpdate,
                    extraHeaders: _this.props.extraHeaders.hold,
                };
                var done = function () {
                    _this.setState({ callIsOnHold: true });
                };
                _this.state.rtcSession.hold(options, done);
            }
        };
        _this.renegotiate = function (options, done) {
            if (!_this.state.rtcSession) {
                _this.logger.warn("renegotiate: no-op as there's no active rtcSession");
                return;
            }
            _this.state.rtcSession.renegotiate(options, done);
        };
        _this.callUnhold = function (useUpdate) {
            if (useUpdate === void 0) { useUpdate = false; }
            if (!_this.state.rtcSession) {
                _this.logger.warn("callUnhold: no-op as there's no active rtcSession");
                return;
            }
            var holdStatus = _this.state.rtcSession.isOnHold();
            if (holdStatus.local) {
                var options = {
                    useUpdate: useUpdate,
                    extraHeaders: _this.props.extraHeaders.hold,
                };
                var done = function () {
                    _this.setState({ callIsOnHold: false });
                };
                _this.state.rtcSession.unhold(options, done);
            }
            _this.callUnmuteMicrophone();
            _this.getRemoteAudioOrFail().muted = false;
            _this.getRemoteAudioOrFail().volume = 1;
        };
        _this.callToggleHold = function (useUpdate) {
            if (useUpdate === void 0) { useUpdate = false; }
            if (!_this.state.rtcSession) {
                _this.logger.warn("callToggleHold: no-op as there's no active rtcSession");
                return;
            }
            var holdStatus = _this.state.rtcSession.isOnHold();
            return holdStatus.local ? _this.callUnhold(useUpdate) : _this.callHold(useUpdate);
        };
        _this.callMuteMicrophone = function () {
            if (_this.state.rtcSession && !_this.state.callMicrophoneIsMuted) {
                _this.state.rtcSession.mute({ audio: true, video: false });
                _this.setState({ callMicrophoneIsMuted: true });
            }
        };
        _this.callUnmuteMicrophone = function () {
            if (_this.state.rtcSession && _this.state.callMicrophoneIsMuted) {
                _this.state.rtcSession.unmute({ audio: true, video: false });
                _this.setState({ callMicrophoneIsMuted: false });
            }
        };
        _this.callToggleMuteMicrophone = function () {
            return _this.state.callMicrophoneIsMuted ? _this.callUnmuteMicrophone() : _this.callMuteMicrophone();
        };
        _this.state = {
            sipStatus: enums_1.SIP_STATUS_DISCONNECTED,
            sipErrorType: null,
            sipErrorMessage: null,
            rtcSession: null,
            callStatus: enums_1.CALL_STATUS_IDLE,
            callDirection: null,
            callCounterpart: null,
            dtmfSender: null,
            callIsOnHold: false,
            callMicrophoneIsMuted: false,
        };
        _this.ua = null;
        return _this;
    }
    SipProvider.prototype.getChildContext = function () {
        return {
            sip: __assign(__assign({}, this.props), { status: this.state.sipStatus, errorType: this.state.sipErrorType, errorMessage: this.state.sipErrorMessage }),
            call: {
                id: 'UNKNOWN',
                status: this.state.callStatus,
                direction: this.state.callDirection,
                counterpart: this.state.callCounterpart,
                dtmfSender: this.state.dtmfSender,
                isOnHold: this.state.callIsOnHold,
                hold: this.callHold.bind(this),
                unhold: this.callUnhold.bind(this),
                toggleHold: this.callToggleHold.bind(this),
                microphoneIsMuted: this.state.callMicrophoneIsMuted,
                muteMicrophone: this.callMuteMicrophone.bind(this),
                unmuteMicrophone: this.callUnmuteMicrophone.bind(this),
                toggleMuteMicrophone: this.callToggleMuteMicrophone.bind(this),
                renegotiate: this.renegotiate.bind(this),
            },
            registerSip: this.registerSip.bind(this),
            unregisterSip: this.unregisterSip.bind(this),
            audioSinkId: this.audioSinkId,
            setAudioSinkId: this.setAudioSinkId,
            answerCall: this.answerCall.bind(this),
            startCall: this.startCall.bind(this),
            stopCall: this.stopCall.bind(this),
            sendDTMF: this.sendDTMF.bind(this),
            getUA: this.getUA.bind(this),
        };
    };
    SipProvider.prototype.getUA = function () {
        return this.ua;
    };
    SipProvider.prototype.getUAOrFail = function () {
        var ua = this.getUA();
        if (!ua) {
            throw new Error('JsSIP.UA not initialized');
        }
        return ua;
    };
    SipProvider.prototype.getAudioElement = function () {
        return this.remoteAudio;
    };
    SipProvider.prototype.componentDidMount = function () {
        if (window.document.getElementById('sip-provider-audio')) {
            throw new Error("Creating two SipProviders in one application is forbidden. If that's not the case " +
                "then check if you're using \"sip-provider-audio\" as id attribute for any existing " +
                "element");
        }
        this.remoteAudio = this.createRemoteAudioElement();
        window.document.body.appendChild(this.remoteAudio);
        this.reconfigureDebug();
        this.reinitializeJsSIP();
    };
    SipProvider.prototype.componentDidUpdate = function (prevProps) {
        if (this.props.debug !== prevProps.debug) {
            this.reconfigureDebug();
        }
        if (this.props.socket !== prevProps.socket ||
            this.props.host !== prevProps.host ||
            this.props.port !== prevProps.port ||
            this.props.pathname !== prevProps.pathname ||
            this.props.secure !== prevProps.secure ||
            this.props.user !== prevProps.user ||
            this.props.realm !== prevProps.realm ||
            this.props.password !== prevProps.password ||
            this.props.autoRegister !== prevProps.autoRegister ||
            this.props.inboundAudioDeviceId !== prevProps.inboundAudioDeviceId ||
            this.props.outboundAudioDeviceId !== prevProps.outboundAudioDeviceId) {
            this.reinitializeJsSIP();
        }
    };
    SipProvider.prototype.componentWillUnmount = function () {
        this.deleteRemoteAudio();
        if (this.ua) {
            this.ua.stop();
            this.ua = null;
        }
    };
    SipProvider.prototype.deleteRemoteAudio = function () {
        var element;
        try {
            element = this.getRemoteAudioOrFail();
        }
        catch (e) {
            return;
        }
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        this.remoteAudio = null;
    };
    SipProvider.prototype.registerSip = function () {
        if (!this.ua) {
            throw new Error("Calling registerSip is not allowed when JsSIP.UA isn't initialized");
        }
        if (this.props.autoRegister) {
            throw new Error('Calling registerSip is not allowed when autoRegister === true');
        }
        if (this.state.sipStatus !== enums_1.SIP_STATUS_CONNECTED) {
            throw new Error("Calling registerSip is not allowed when sip status is " + this.state.sipStatus + " (expected " + enums_1.SIP_STATUS_CONNECTED + ")");
        }
        this.ua.register();
    };
    SipProvider.prototype.unregisterSip = function (options) {
        if (!this.ua) {
            throw new Error("Calling unregisterSip is not allowed when JsSIP.UA isn't initialized");
        }
        if (this.props.autoRegister) {
            throw new Error('Calling registerSip is not allowed when autoRegister === true');
        }
        if (this.state.sipStatus !== enums_1.SIP_STATUS_REGISTERED) {
            throw new Error("Calling unregisterSip is not allowed when sip status is " + this.state.sipStatus + " (expected " + enums_1.SIP_STATUS_CONNECTED + ")");
        }
        this.ua.unregister(options);
    };
    SipProvider.prototype.reconfigureDebug = function () {
        var debug = this.props.debug;
        if (debug) {
            JsSIP.debug.enable(this.props.debugNamespaces || 'JsSIP:*');
            this.logger = console;
        }
        else {
            JsSIP.debug.disable();
            this.logger = dummyLogger_1.default;
        }
    };
    Object.defineProperty(SipProvider.prototype, "audioSinkId", {
        get: function () {
            var _a;
            return ((_a = this.remoteAudio) === null || _a === void 0 ? void 0 : _a.sinkId) || 'undefined';
        },
        enumerable: false,
        configurable: true
    });
    SipProvider.prototype.reinitializeJsSIP = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, socket, realm, user, password, autoRegister, inboundAudioDeviceId, outboundAudioDeviceId, outputDeviceId, exists, e_1, socketJsSip, ua, extraHeadersRegister;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.ua) {
                            this.ua.stop();
                            this.ua = null;
                        }
                        _a = this.props, socket = _a.socket, realm = _a.realm, user = _a.user, password = _a.password, autoRegister = _a.autoRegister, inboundAudioDeviceId = _a.inboundAudioDeviceId, outboundAudioDeviceId = _a.outboundAudioDeviceId;
                        if (!user) {
                            this.setState({
                                sipStatus: enums_1.SIP_STATUS_DISCONNECTED,
                                sipErrorType: null,
                                sipErrorMessage: null,
                            });
                            return [2];
                        }
                        outputDeviceId = outboundAudioDeviceId;
                        return [4, media_1.mediaDeviceExists(outputDeviceId, 'audiooutput')];
                    case 1:
                        exists = _b.sent();
                        if (!outputDeviceId || !exists) {
                            outputDeviceId = 'default';
                        }
                        if (!outputDeviceId) return [3, 5];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        this.remoteAudio = this.createRemoteAudioElement();
                        this.logger.debug("Audio.OUTBOUND: Setting sinkId to " + outputDeviceId);
                        return [4, this.setAudioSinkId(outputDeviceId)];
                    case 3:
                        _b.sent();
                        return [3, 5];
                    case 4:
                        e_1 = _b.sent();
                        this.logger.error('AUDIO.OUTBOUND: Could not set sinkId', e_1);
                        return [3, 5];
                    case 5:
                        try {
                            socketJsSip = new JsSIP.WebSocketInterface(socket);
                            this.ua = new JsSIP.UA({
                                uri: user + "@" + realm,
                                realm: realm,
                                authorization_user: user,
                                password: password,
                                sockets: [socketJsSip],
                                register: autoRegister,
                            });
                            window.UA = this.ua;
                            window.UA_SOCKET = socketJsSip;
                        }
                        catch (error) {
                            this.setState({
                                sipStatus: enums_1.SIP_STATUS_ERROR,
                                sipErrorType: enums_1.SIP_ERROR_TYPE_CONFIGURATION,
                                sipErrorMessage: error.message,
                            });
                            return [2];
                        }
                        ua = this.ua;
                        ua.on('connecting', function () {
                            _this.logger.debug('UA "connecting" event');
                            if (_this.ua !== ua) {
                                return;
                            }
                            _this.setState({
                                sipStatus: enums_1.SIP_STATUS_CONNECTING,
                                sipErrorType: null,
                                sipErrorMessage: null,
                            });
                        });
                        ua.on('connected', function () {
                            _this.logger.debug('UA "connected" event');
                            if (_this.ua !== ua) {
                                return;
                            }
                            _this.setState({
                                sipStatus: enums_1.SIP_STATUS_CONNECTED,
                                sipErrorType: null,
                                sipErrorMessage: null,
                            });
                        });
                        ua.on('disconnected', function () {
                            _this.logger.debug('UA "disconnected" event');
                            if (_this.ua !== ua) {
                                return;
                            }
                            _this.setState({
                                sipStatus: enums_1.SIP_STATUS_ERROR,
                                sipErrorType: enums_1.SIP_ERROR_TYPE_CONNECTION,
                                sipErrorMessage: 'disconnected',
                            });
                        });
                        ua.on('registered', function (data) {
                            _this.logger.debug('UA "registered" event', data);
                            if (_this.ua !== ua) {
                                return;
                            }
                            _this.setState({
                                sipStatus: enums_1.SIP_STATUS_REGISTERED,
                                callStatus: enums_1.CALL_STATUS_IDLE,
                            });
                        });
                        ua.on('unregistered', function () {
                            _this.logger.debug('UA "unregistered" event');
                            if (_this.ua !== ua) {
                                return;
                            }
                            if (ua.isConnected()) {
                                _this.setState({
                                    sipStatus: enums_1.SIP_STATUS_CONNECTED,
                                    callStatus: enums_1.CALL_STATUS_IDLE,
                                    callDirection: null,
                                });
                            }
                            else {
                                _this.setState({
                                    sipStatus: enums_1.SIP_STATUS_DISCONNECTED,
                                    callStatus: enums_1.CALL_STATUS_IDLE,
                                    callDirection: null,
                                });
                            }
                        });
                        ua.on('registrationFailed', function (data) {
                            _this.logger.debug('UA "registrationFailed" event');
                            if (_this.ua !== ua) {
                                return;
                            }
                            _this.setState({
                                sipStatus: enums_1.SIP_STATUS_ERROR,
                                sipErrorType: enums_1.SIP_ERROR_TYPE_REGISTRATION,
                                sipErrorMessage: data.cause || data.response.reason_phrase,
                            });
                        });
                        ua.on('newRTCSession', function (_a) {
                            var originator = _a.originator, rtcSession = _a.session, rtcRequest = _a.request;
                            window.UA_SESSION = rtcSession;
                            if (!_this || _this.ua !== ua) {
                                return;
                            }
                            var rtcSessionInState = _this.state.rtcSession;
                            if (rtcSessionInState) {
                                _this.logger.debug('incoming call replied with 486 "Busy Here"');
                                rtcSession.terminate({
                                    status_code: 486,
                                    reason_phrase: 'Busy Here',
                                });
                                return;
                            }
                            if (originator === 'local') {
                                var foundUri = rtcRequest.to.toString();
                                var delimiterPosition = foundUri.indexOf(';') || null;
                                _this.setState({
                                    callDirection: enums_1.CALL_DIRECTION_OUTGOING,
                                    callStatus: enums_1.CALL_STATUS_STARTING,
                                    callCounterpart: delimiterPosition ? foundUri.substring(0, delimiterPosition) || foundUri : foundUri,
                                    callIsOnHold: rtcSession.isOnHold().local,
                                    callMicrophoneIsMuted: rtcSession.isMuted().audio || false,
                                });
                            }
                            else if (originator === 'remote') {
                                var foundUri = rtcRequest.from.toString();
                                var delimiterPosition = foundUri.indexOf(';') || null;
                                _this.setState({
                                    callDirection: enums_1.CALL_DIRECTION_INCOMING,
                                    callStatus: enums_1.CALL_STATUS_STARTING,
                                    callCounterpart: delimiterPosition ? foundUri.substring(0, delimiterPosition) || foundUri : foundUri,
                                    callIsOnHold: rtcSession.isOnHold().local,
                                    callMicrophoneIsMuted: rtcSession.isMuted().audio || false,
                                });
                            }
                            else {
                                _this.logger.warn("call originator expected to be either local or remote. Got: " + originator);
                            }
                            _this.setState({ rtcSession: rtcSession });
                            rtcSession.on('failed', function () {
                                if (_this.ua !== ua) {
                                    return;
                                }
                                if (_this.state.rtcSession && _this.state.rtcSession.connection) {
                                    _this.state.rtcSession.connection.getSenders().forEach(function (sender) {
                                        if (sender.track) {
                                            sender.track.stop();
                                        }
                                    });
                                }
                                _this.setState({
                                    rtcSession: null,
                                    callStatus: enums_1.CALL_STATUS_IDLE,
                                    callDirection: null,
                                    callCounterpart: null,
                                    dtmfSender: null,
                                    callMicrophoneIsMuted: false,
                                });
                            });
                            rtcSession.on('ended', function () {
                                if (_this.ua !== ua) {
                                    return;
                                }
                                if (_this.state.rtcSession && _this.state.rtcSession.connection) {
                                    _this.state.rtcSession.connection.getSenders().forEach(function (sender) {
                                        if (sender.track) {
                                            sender.track.stop();
                                        }
                                    });
                                }
                                _this.setState({
                                    rtcSession: null,
                                    callStatus: enums_1.CALL_STATUS_IDLE,
                                    callDirection: null,
                                    callCounterpart: null,
                                    callIsOnHold: false,
                                    dtmfSender: null,
                                    callMicrophoneIsMuted: false,
                                });
                            });
                            rtcSession.on('unhold', function (e) {
                                _this.logger.debug('rtcSession.unhold', e);
                            });
                            rtcSession.on('peerconnection', function (pc) {
                                var remoteAudio = _this.getRemoteAudioOrFail();
                                remoteAudio.srcObject = pc.peerconnection.getRemoteStreams()[0];
                                pc.peerconnection.addEventListener('addstream', function (event) {
                                    _this.logger.debug('connection.addstream', event);
                                    var stream = event.stream;
                                    if (stream) {
                                        _this.logger.debug('connection.addstream: set remoteAudio.srcObject', stream);
                                        remoteAudio.srcObject = stream;
                                        remoteAudio
                                            .play()
                                            .then(function () {
                                            _this.logger.debug('remoteAudio: playing');
                                            _this.isPlaying = true;
                                        })
                                            .catch(function (e) {
                                            _this.logger.error('remoteAudio: not playing', e);
                                            _this.isPlaying = false;
                                        });
                                    }
                                });
                            });
                            rtcSession.on('accepted', function () {
                                if (_this.ua !== ua) {
                                    return;
                                }
                                if (inboundAudioDeviceId) {
                                    var constraints = { audio: { deviceId: { exact: inboundAudioDeviceId } } };
                                    navigator.mediaDevices
                                        .getUserMedia(constraints)
                                        .then(function (stream) {
                                        stream.getAudioTracks().forEach(function (track) {
                                            if (track) {
                                                _this.logger.debug("AUDIO.INBOUND: Attaching track", track);
                                                rtcSession.connection.getSenders().forEach(function (sender) {
                                                    _this.logger.debug('AUDIO.INBOUND: Replacing track', { sender: sender }, { track: track });
                                                    sender.replaceTrack(track);
                                                });
                                            }
                                        });
                                    })
                                        .catch(function (e) {
                                        _this.logger.error('AUDIO.INBOUND: Invalid audio device passed.', e);
                                    });
                                }
                                _this.setState({
                                    dtmfSender: rtcSession.connection.getSenders().filter(function (x) { return x.dtmf; })[0].dtmf,
                                });
                                _this.setState({ callStatus: enums_1.CALL_STATUS_ACTIVE });
                            });
                            _this.handleAutoAnswer();
                        });
                        extraHeadersRegister = this.props.extraHeaders.register || [];
                        if (extraHeadersRegister.length) {
                            ua.registrator().setExtraHeaders(extraHeadersRegister);
                        }
                        ua.start();
                        return [2];
                }
            });
        });
    };
    SipProvider.prototype.handleAutoAnswer = function () {
        if (this.state.callDirection === enums_1.CALL_DIRECTION_INCOMING && this.props.autoAnswer) {
            this.logger.log('Answer auto ON');
            this.answerCall();
        }
        else if (this.state.callDirection === enums_1.CALL_DIRECTION_INCOMING && !this.props.autoAnswer) {
            this.logger.log('Answer auto OFF');
        }
        else if (this.state.callDirection === enums_1.CALL_DIRECTION_OUTGOING) {
            this.logger.log('OUTGOING call');
        }
    };
    SipProvider.prototype.render = function () {
        return this.props.children;
    };
    SipProvider.prototype.getRemoteAudioOrFail = function () {
        if (!this.remoteAudio) {
            throw new Error('remoteAudio is not initiliazed');
        }
        return this.remoteAudio;
    };
    SipProvider.prototype.createRemoteAudioElement = function () {
        var id = 'sip-provider-audio';
        var el = window.document.getElementById(id);
        if (el) {
            return el;
        }
        el = window.document.createElement('audio');
        el.id = id;
        el.autoplay = true;
        window.document.body.appendChild(el);
        return el;
    };
    SipProvider.childContextTypes = {
        sip: types_1.sipPropType,
        call: types_1.callPropType,
        registerSip: PropTypes.func,
        unregisterSip: PropTypes.func,
        answerCall: PropTypes.func,
        startCall: PropTypes.func,
        stopCall: PropTypes.func,
        sendDTMF: PropTypes.func,
        getUA: PropTypes.func,
        audioSinkId: PropTypes.string,
        setAudioSinkId: PropTypes.func,
    };
    SipProvider.propTypes = {
        socket: PropTypes.string,
        user: PropTypes.string,
        password: PropTypes.string,
        realm: PropTypes.string,
        secure: PropTypes.bool,
        autoRegister: PropTypes.bool,
        autoAnswer: PropTypes.bool,
        iceRestart: PropTypes.bool,
        sessionTimersExpires: PropTypes.number,
        extraHeaders: types_1.extraHeadersPropType,
        iceServers: types_1.iceServersPropType,
        debug: PropTypes.bool,
        inboundAudioDeviceId: PropTypes.string,
        outboundAudioDeviceId: PropTypes.string,
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
        extraHeaders: { register: [], invite: [], hold: [] },
        iceServers: [],
        debug: false,
        inboundAudioDeviceId: '',
        outboundAudioDeviceId: '',
        children: null,
    };
    return SipProvider;
}(React.Component));
exports.default = SipProvider;
//# sourceMappingURL=index.js.map