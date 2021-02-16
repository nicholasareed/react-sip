"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SipCall = void 0;
var JsSIP = require("jssip");
var dummyLogger_1 = require("../lib/dummyLogger");
var __1 = require("..");
var SipCall = (function () {
    function SipCall(isIncoming, remoteName, callConfig, rtcConfig, dtmfOptions, mediaEngine, eventEmitter) {
        var _this = this;
        this._init = function (isIncoming) {
            if (isIncoming === true) {
                _this.setCallStatus(__1.CALL_STATUS_RINGING);
                _this._direction = __1.CALL_DIRECTION_INCOMING;
                _this._mediaEngine.playTone('ringing', 1.0);
            }
            else {
                _this.remoteUser = _this.remoteName;
                _this.setCallStatus(__1.CALL_STATUS_DIALING);
                _this._direction = __1.CALL_DIRECTION_OUTGOING;
            }
            _this._configureDebug();
            _this._mediaSessionStatus = __1.MEDIA_SESSION_STATUS_IDLE;
            _this._mediaDeviceStatus = {
                audio: __1.MEDIA_DEVICE_STATUS_ACTIVE,
                video: __1.MEDIA_DEVICE_STATUS_ACTIVE,
            };
            _this._outputMediaStream = new MediaStream();
        };
        this.getId = function () {
            return _this._id;
        };
        this.getExtraHeaders = function () {
            return _this._callConfig.extraHeaders;
        };
        this.getSessionTimerExpires = function () {
            return _this._callConfig.sessionTimerExpires;
        };
        this.setRTCSession = function (rtcSession) {
            _this._rtcSession = rtcSession;
        };
        this.getRTCSession = function () {
            return _this._rtcSession;
        };
        this.isSessionActive = function () {
            return _this._rtcSession != null;
        };
        this.getCallStatus = function () {
            return _this._callStatus;
        };
        this.setCallStatus = function (status) {
            _this._callStatus = status;
        };
        this.isEstablished = function () {
            return _this._callStatus === __1.CALL_STATUS_ACTIVE || _this._callStatus === __1.CALL_STATUS_CONNECTING;
        };
        this.isActive = function () {
            if (_this._callStatus === __1.CALL_STATUS_CONNECTING ||
                _this._callStatus === __1.CALL_STATUS_ACTIVE) {
                return true;
            }
            return false;
        };
        this.isMediaActive = function () {
            if (_this._callStatus === __1.CALL_STATUS_ACTIVE &&
                _this._mediaSessionStatus === __1.MEDIA_SESSION_STATUS_ACTIVE) {
                return true;
            }
            return false;
        };
        this.getMediaSessionStatus = function () {
            return _this._mediaSessionStatus;
        };
        this.setMediaSessionStatus = function (status) {
            _this._mediaSessionStatus = status;
        };
        this.getDtmfOptions = function () {
            return _this._dtmfOptions;
        };
        this.getRTCConfig = function () {
            return _this._rtcConfig;
        };
        this.getRTCOfferConstraints = function () {
            return {
                iceRestart: false,
            };
        };
        this.setInputMediaStream = function (stream) {
            _this._inputMediaStream = stream;
        };
        this.getInputMediaStream = function () {
            return _this._inputMediaStream;
        };
        this.onNewRTCSession = function (rtcSession) {
            console.log('ON NEW RTC Session');
            if (!rtcSession) {
                throw Error("New Session is not active");
            }
            _this.remoteName = rtcSession.remote_identity.display_name;
            if (_this.remoteName === null || _this.remoteName === '') {
                _this.remoteName = rtcSession.remote_identity.uri.user;
            }
            _this.remoteUser = rtcSession.remote_identity.uri.user;
            _this.remoteUri = rtcSession.remote_identity.uri.toAor();
            _this.setRTCSession(rtcSession);
            _this._initSessionEventHandler();
            _this._eventEmitter.emit('call.update', { 'call': _this });
        };
        this.setPeerConnection = function (conn) {
            _this._peerConnection = conn;
        };
        this.isDialing = function () {
            if ((_this._callStatus === __1.CALL_STATUS_DIALING) ||
                (_this._callStatus === __1.CALL_STATUS_PROGRESS)) {
                return true;
            }
            return false;
        };
        this.isRinging = function () {
            return (_this._callStatus === __1.CALL_STATUS_RINGING);
        };
        this.isEstablishing = function () {
            if (_this._callStatus === __1.CALL_STATUS_DIALING ||
                _this._callStatus === __1.CALL_STATUS_RINGING ||
                _this._callStatus === __1.CALL_STATUS_PROGRESS) {
                return true;
            }
            return false;
        };
        this.errorReason = function () {
            return _this._errorCause;
        };
        this.isFailed = function () {
            return _this._endType === 'failure';
        };
        this.getDisposition = function () {
            var disp = "idle";
            switch (_this._callStatus) {
                case __1.CALL_STATUS_DIALING:
                    disp = 'dialing';
                    break;
                case __1.CALL_STATUS_RINGING:
                    disp = 'ringing';
                    break;
                case __1.CALL_STATUS_PROGRESS:
                    disp = 'progress';
                    break;
                case __1.CALL_STATUS_CONNECTING:
                case __1.CALL_STATUS_ACTIVE:
                    disp = 'active';
                    if (_this._mediaSessionStatus === __1.MEDIA_SESSION_STATUS_SENDONLY ||
                        _this._mediaSessionStatus === __1.MEDIA_SESSION_STATUS_INACTIVE) {
                        disp = 'local hold';
                    }
                    break;
            }
            return disp;
        };
        this._configureDebug = function () {
            if (_this._debug) {
                JsSIP.debug.enable(_this._debugNamespaces || 'JsSIP:*');
                _this._logger = console;
            }
            else {
                JsSIP.debug.disable();
                _this._logger = dummyLogger_1.default;
            }
        };
        this._uuid = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0;
                var v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        this.dial = function (ua, target, hasAudio, hasVideo) {
            _this._mediaEngine.openStreams(hasAudio, hasVideo).then(function (stream) {
                if (!stream) {
                    throw Error('Failed to open the input streams');
                }
                var opts = {
                    mediaConstraints: {
                        audio: hasAudio,
                        video: hasVideo,
                    },
                    mediaStream: stream,
                    rtcOfferConstraints: _this.getRTCOfferConstraints(),
                    pcConfig: _this.getRTCConfig(),
                    extraHeaders: _this.getExtraHeaders().invite,
                    sessionTimersExpires: _this.getSessionTimerExpires(),
                };
                _this.remoteUri = target;
                _this.setCallStatus(__1.CALL_STATUS_DIALING);
                _this._eventEmitter.emit('call.update', { 'call': _this });
                ua.call(target, opts);
                _this.setInputMediaStream(stream);
            });
        };
        this.accept = function (hasAudio, hasVideo) {
            if (hasAudio === void 0) { hasAudio = true; }
            if (hasVideo === void 0) { hasVideo = true; }
            if (!_this.isSessionActive()) {
                throw new Error("RtcSession is not active");
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_RINGING) {
                _this._logger.error("Calling answer() is not allowed when call status is " + _this.getCallStatus());
                return;
            }
            _this._mediaEngine.openStreams(hasAudio, hasVideo).then(function (inputStream) {
                var options = {
                    extraHeaders: _this.getExtraHeaders().resp2xx,
                    mediaConstraints: {
                        audio: hasAudio,
                        video: hasVideo,
                    },
                    pcConfig: _this.getRTCConfig(),
                    inputStream: inputStream,
                    sessionTimerExpires: _this.getSessionTimerExpires(),
                };
                _this.getRTCSession().answer(options);
                _this.setCallStatus(__1.CALL_STATUS_CONNECTING);
                _this.setInputMediaStream(inputStream);
                _this._mediaEngine.stopTone('ringing');
            });
        };
        this.reject = function (code, reason) {
            if (code === void 0) { code = 486; }
            if (reason === void 0) { reason = 'Busy Here'; }
            if (!_this.isSessionActive()) {
                _this._logger.error('RtcSession is not active');
                return;
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_RINGING) {
                _this._logger.error("Calling reject() is not allowed when call status is " + _this.getCallStatus());
            }
            var options = {
                extraHeaders: _this.getExtraHeaders().resp4xx,
                status_code: code,
                reason_phrase: reason,
            };
            _this.getRTCSession().terminate(options);
            _this._mediaEngine.stopTone('ringing');
        };
        this.hangup = function () {
            if (!_this.isSessionActive()) {
                throw new Error('RtcSession is not active');
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_DIALING &&
                _this.getCallStatus() !== __1.CALL_STATUS_PROGRESS &&
                _this.getCallStatus() !== __1.CALL_STATUS_CONNECTING &&
                _this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                _this._logger.error("Calling hangup() is not allowed when call status is " + _this.getCallStatus());
            }
            var options = {
                extraHeaders: _this.getExtraHeaders().nonInvite,
            };
            _this.getRTCSession().terminate(options);
            var inputStream = _this.getInputMediaStream();
            if (inputStream) {
                _this._mediaEngine.closeStream(inputStream);
                _this.setInputMediaStream(null);
            }
        };
        this.sendDTMF = function (tones) {
            if (!_this.isSessionActive()) {
                throw new Error('RtcSession is not active');
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                throw new Error("Calling sendDTMF() is not allowed when call status is " + _this.getCallStatus());
            }
            if (_this._mediaSessionStatus === __1.MEDIA_SESSION_STATUS_SENDONLY ||
                _this._mediaSessionStatus === __1.MEDIA_SESSION_STATUS_RECVONLY ||
                _this._mediaSessionStatus === __1.MEDIA_SESSION_STATUS_INACTIVE) {
                _this._logger.error('DTMF is not allowed while call is on hold');
                return;
            }
            var options = {
                duration: _this.getDtmfOptions().duration,
                interToneGap: _this.getDtmfOptions().interToneGap,
                transportType: _this.getDtmfOptions().channelType
            };
            _this.getRTCSession().sendDTMF(tones, options);
        };
        this.sendInfo = function (contentType, body) {
            if (!_this.isSessionActive()) {
                throw new Error("RtcSession is not active");
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                throw new Error("Calling sendInfo() is not allowed when call status is " + _this.getCallStatus());
            }
            var options = {
                extraHeaders: _this.getExtraHeaders().info,
            };
            _this.getRTCSession().sendInfo(contentType, body, options);
        };
        this.hold = function () {
            if (!_this.isSessionActive()) {
                _this._logger.error("RTCSession is not active");
                return;
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                _this._logger.error("Calling hold() is not allowed when call status is " + _this.getCallStatus());
                return;
            }
            if (_this.getMediaSessionStatus() === __1.MEDIA_SESSION_STATUS_SENDONLY ||
                _this.getMediaSessionStatus() === __1.MEDIA_SESSION_STATUS_INACTIVE) {
                _this._logger.error("Calling hold() is not allowed when call is already on local hold");
                return;
            }
            var options = {
                useUpdate: false,
                extraHeaders: _this.getExtraHeaders().invite,
            };
            _this.getRTCSession().hold(options);
        };
        this.unhold = function () {
            if (!_this.isSessionActive()) {
                _this._logger.error('RTC Session is not valid');
                return;
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                _this._logger.error("Calling unhold() is not allowed when call status is " + _this.getCallStatus());
                return;
            }
            if (_this.getMediaSessionStatus() !== __1.MEDIA_SESSION_STATUS_SENDONLY &&
                _this.getMediaSessionStatus() !== __1.MEDIA_SESSION_STATUS_INACTIVE) {
                _this._logger.error("Calling unhold() is not allowed when call is not on hold");
                return;
            }
            var options = {
                useUpdate: false,
                extraHeaders: _this.getExtraHeaders().invite,
            };
            _this.getRTCSession().unhold(options);
        };
        this.toggleHold = function () {
            if (_this.isOnLocalHold()) {
                _this.unhold();
            }
            else {
                _this.hold();
            }
        };
        this.isOnLocalHold = function () {
            if (!_this.isSessionActive()) {
                return false;
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                return false;
            }
            var holdStatus = _this.getRTCSession().isOnHold();
            if (holdStatus) {
                return holdStatus.local;
            }
            return false;
        };
        this.isOnRemoteHold = function () {
            if (!_this.isSessionActive()) {
                return false;
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                return false;
            }
            var holdStatus = _this.getRTCSession().isOnHold();
            if (holdStatus) {
                return holdStatus.remote;
            }
            return false;
        };
        this.renegotiate = function () {
            if (!_this.isSessionActive()) {
                throw new Error('RtcSession is not active');
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                throw new Error("Calling reject() is not allowed when call status is " + _this.getCallStatus());
            }
            var options = {
                useUpdate: false,
                extraHeaders: _this.getExtraHeaders().invite,
            };
            return _this.getRTCSession().renegotiate(options);
        };
        this._mute = function (isAudio) {
            if (isAudio === void 0) { isAudio = true; }
            if (!_this.isSessionActive()) {
                _this._logger.error('RTCSession is not active');
                return;
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                _this._logger.error("Calling mute is not allowed when call status is " + _this._callStatus);
                return;
            }
            if (isAudio && _this._mediaDeviceStatus.audio === __1.MEDIA_DEVICE_STATUS_MUTE) {
                _this._logger.warn('Audio device is already in mute state');
                return;
            }
            if (!isAudio && _this._mediaDeviceStatus.video === __1.MEDIA_DEVICE_STATUS_MUTE) {
                _this._logger.warn('Video device is already in mute state');
                return;
            }
            var options = {
                audio: isAudio,
                video: !isAudio,
            };
            _this.getRTCSession().mute(options);
        };
        this._unmute = function (isAudio) {
            if (isAudio === void 0) { isAudio = true; }
            if (!_this.getRTCSession()) {
                _this._logger.error('RTCSession is not active');
                return;
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                _this._logger.error("Calling mute is not allowed when call status is " + _this._callStatus);
                return;
            }
            if (isAudio && _this._mediaDeviceStatus.audio !== __1.MEDIA_DEVICE_STATUS_MUTE) {
                _this._logger.warn('Audio device not in mute state');
                return;
            }
            if (!isAudio && _this._mediaDeviceStatus.video !== __1.MEDIA_DEVICE_STATUS_MUTE) {
                _this._logger.warn('Video device not in mute state');
                return;
            }
            var options = {
                audio: isAudio,
                video: !isAudio,
            };
            _this.getRTCSession().unmute(options);
        };
        this.muteAudio = function () {
            _this._mute(true);
        };
        this.muteVideo = function () {
            _this._mute(false);
        };
        this.unMuteAudio = function () {
            _this._unmute(true);
        };
        this.unMuteVideo = function () {
            _this._unmute(false);
        };
        this.toggleAudioMute = function () {
            if (_this._mediaDeviceStatus.audio === __1.MEDIA_DEVICE_STATUS_ACTIVE) {
                _this.muteAudio();
            }
            else {
                _this.unMuteAudio();
            }
        };
        this.toggleVideoMute = function () {
            if (_this._mediaDeviceStatus.video === __1.MEDIA_DEVICE_STATUS_ACTIVE) {
                _this.muteVideo();
            }
            else {
                _this.unMuteVideo();
            }
        };
        this.isAudioOnMute = function () {
            return _this._mediaDeviceStatus.audio === __1.MEDIA_DEVICE_STATUS_MUTE;
        };
        this.isVideoOnMute = function () {
            return _this._mediaDeviceStatus.video === __1.MEDIA_DEVICE_STATUS_MUTE;
        };
        this.blindTransfer = function (target) {
            if (!_this.getRTCSession()) {
                throw new Error('RtcSession is not active');
            }
            var transferOptions = {
                eventHandlers: {
                    requestSucceeded: _this._onReferSuccess,
                    requestFailed: _this._onReferfailed,
                    accepted: _this._onTransferAcceptNotify,
                    failed: _this._onTransferFailureNotify,
                },
            };
            _this.getRTCSession().refer(target, transferOptions);
            _this._transferStatus = __1.TRANSFER_STATUS_INITIATED;
        };
        this.attendedTransfer = function (replaceCall) {
            var _a;
            if (!_this.getRTCSession()) {
                throw new Error('RtcSession is not active');
            }
            if (!replaceCall.isOnLocalHold()) {
                _this._logger.error('Attended transfer is allowed only if call is on hold');
                return;
            }
            var replaceSession = replaceCall.getRTCSession();
            if (!replaceSession) {
                _this._logger.error('Replace session is not valid');
                return;
            }
            var transferOptions = {
                replaces: replaceSession,
                eventHandlers: {
                    requestSucceeded: _this._onReferSuccess,
                    requestFailed: _this._onReferfailed,
                    accepted: _this._onTransferAcceptNotify,
                    failed: _this._onTransferFailureNotify,
                },
            };
            if (!_this.isOnLocalHold()) {
                _this.hold();
            }
            (_a = _this.getRTCSession()) === null || _a === void 0 ? void 0 : _a.refer(_this.remoteUri, transferOptions);
            _this._transferStatus = __1.TRANSFER_STATUS_INITIATED;
        };
        this._onReferSuccess = function (data) {
            console.log('ON Transfer refer success');
            _this._transferStatus = __1.TRANSFER_STATUS_REFER_SUCCESS;
        };
        this._onReferfailed = function (data) {
            console.log('ON Transfer refer failed');
            _this._transferStatus = __1.TRANSFER_STATUS_FAILED;
        };
        this._onTransferAcceptNotify = function (data) {
            console.log('ON Transfer accept notification');
            _this._transferStatus = __1.TRANSFER_STATUS_COMPLETE;
        };
        this._onTransferFailureNotify = function (data) {
            console.log('ON Transfer failure notification');
            _this._transferStatus = __1.TRANSFER_STATUS_FAILED;
        };
        this._handleRemoteTrack = function (track) {
            _this._mediaEngine.addTrack(_this._outputMediaStream, track);
        };
        this._initSessionEventHandler = function () {
            var rtcSession = _this.getRTCSession();
            if (!_this.isSessionActive()) {
                throw Error("SM Init failed - Session is not ACTIVE");
            }
            if (rtcSession === null || rtcSession === void 0 ? void 0 : rtcSession.connection) {
                var peerConnection = rtcSession.connection;
                peerConnection.addEventListener('track', function (event) {
                    console.log('ON track event');
                    _this._logger.debug('PeerConnection "ontrack" event received');
                    _this._handleRemoteTrack(event.track);
                });
            }
            rtcSession.on('peerconnection', function (data) {
                console.log('ON peerconnection event');
                _this._logger.debug('RTCSession "peerconnection" event received', data);
                _this.setPeerConnection(data.peerconnection);
                data.peerconnection.addEventListener('track', function (event) {
                    console.log('ON track event');
                    _this._logger.debug('PeerConnection "ontrack" event received');
                    _this._handleRemoteTrack(event.track);
                });
            });
            rtcSession.on('connecting', function (data) {
                console.log('ON connecting event');
                _this._logger.debug('RTCSession "connecting" event received', data);
            });
            rtcSession.on('sending', function (data) {
                _this._logger.debug('RTCSession "sending" event received', data);
            });
            rtcSession.on('progress', function (data) {
                console.log('ON session Progress event');
                _this._logger.debug('RTCSession "progress" event received', data);
                if (_this.getCallStatus() === __1.CALL_STATUS_DIALING) {
                    _this.setCallStatus(__1.CALL_STATUS_PROGRESS);
                    _this._mediaEngine.playTone('ringback', 1.0);
                    _this._eventEmitter.emit('call.update', { 'call': _this });
                }
            });
            rtcSession.on('accepted', function (data) {
                console.log('ON session accepted event');
                _this._logger.debug('RTCSession "accepted" event received', data);
                if ((rtcSession === null || rtcSession === void 0 ? void 0 : rtcSession.start_time) && rtcSession.start_time !== undefined) {
                    _this.startTime = rtcSession === null || rtcSession === void 0 ? void 0 : rtcSession.start_time.toString();
                }
                _this.setCallStatus(__1.CALL_STATUS_CONNECTING);
                _this._mediaEngine.stopTone('ringback');
                _this._eventEmitter.emit('call.update', { 'call': _this });
            });
            rtcSession.on('confirmed', function (data) {
                console.log('ON session confirmed event');
                _this._logger.debug('RTCSession "confirmed" event received', data);
                _this.setCallStatus(__1.CALL_STATUS_ACTIVE);
                _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_ACTIVE);
                _this._eventEmitter.emit('call.update', { 'call': _this });
            });
            rtcSession.on('ended', function (data) {
                console.log('ON session ended event');
                _this._logger.debug('RTCSession "ended" event received', data);
                if (_this._inputMediaStream) {
                    _this._mediaEngine.closeStream(_this._inputMediaStream);
                    _this.setInputMediaStream(null);
                }
                if (_this._outputMediaStream) {
                    _this._mediaEngine.closeStream(_this._outputMediaStream);
                }
                if ((rtcSession === null || rtcSession === void 0 ? void 0 : rtcSession.end_time) && rtcSession.end_time !== undefined) {
                    _this.endTime = rtcSession === null || rtcSession === void 0 ? void 0 : rtcSession.end_time.toString();
                }
                _this._endType = 'hangup';
                _this.setCallStatus(__1.CALL_STATUS_IDLE);
                _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_IDLE);
                _this._eventEmitter.emit('call.ended', { 'call': _this });
            });
            rtcSession.on('failed', function (data) {
                console.log('ON session failed event');
                _this._logger.debug('RTCSession "failed" event received', data);
                var originator = data.originator;
                var reason = data.cause;
                if (_this._inputMediaStream) {
                    _this._mediaEngine.closeStream(_this._inputMediaStream);
                    _this.setInputMediaStream(null);
                }
                _this._endType = 'failure';
                _this._errorCause = originator + ": " + reason;
                _this.setCallStatus(__1.CALL_STATUS_IDLE);
                _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_IDLE);
                _this._eventEmitter.emit('call.ended', { 'call': _this });
            });
            rtcSession.on('newDTMF', function (data) {
                _this._logger.debug('RTCSession "newDtmf" event received', data);
            });
            rtcSession.on('newInfo', function (data) {
                _this._logger.debug('RTCSession "newInfo" event received', data);
            });
            rtcSession.on('hold', function (data) {
                console.log('ON session hold event');
                var originator = data.originator;
                var mediaSessionStatus = _this.getMediaSessionStatus();
                _this._logger.debug('RTCSession "hold" event received', data);
                if (originator === 'remote') {
                    if (mediaSessionStatus === __1.MEDIA_SESSION_STATUS_ACTIVE) {
                        _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_RECVONLY);
                    }
                    else if (mediaSessionStatus === __1.MEDIA_SESSION_STATUS_SENDONLY) {
                        _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_INACTIVE);
                    }
                }
                else {
                    if (mediaSessionStatus === __1.MEDIA_SESSION_STATUS_ACTIVE) {
                        _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_SENDONLY);
                    }
                    else if (mediaSessionStatus === __1.MEDIA_SESSION_STATUS_RECVONLY) {
                        _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_INACTIVE);
                    }
                }
                _this._eventEmitter.emit('call.update', { 'call': _this });
            });
            rtcSession.on('unhold', function (data) {
                console.log('ON session unhold event');
                var originator = data.originator;
                var mediaSessionStatus = _this.getMediaSessionStatus();
                _this._logger.debug('RTCSession "unhold" event received', data);
                if (originator === 'remote') {
                    if (mediaSessionStatus === __1.MEDIA_SESSION_STATUS_RECVONLY) {
                        _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_ACTIVE);
                    }
                    else if (mediaSessionStatus === __1.MEDIA_SESSION_STATUS_INACTIVE) {
                        _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_SENDONLY);
                    }
                }
                else {
                    if (mediaSessionStatus === __1.MEDIA_SESSION_STATUS_SENDONLY) {
                        _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_ACTIVE);
                    }
                    else if (mediaSessionStatus === __1.MEDIA_SESSION_STATUS_INACTIVE) {
                        _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_RECVONLY);
                    }
                }
                _this._eventEmitter.emit('call.update', { 'call': _this });
            });
            rtcSession.on('muted', function (data) {
                console.log('ON session muted event');
                var audio = data.audio, video = data.video;
                _this._logger.debug('RTCSession "muted" event received', data);
                if (audio) {
                    _this._mediaDeviceStatus.audio = __1.MEDIA_DEVICE_STATUS_MUTE;
                }
                if (video) {
                    _this._mediaDeviceStatus.video = __1.MEDIA_DEVICE_STATUS_MUTE;
                }
                _this._eventEmitter.emit('call.update', { 'call': _this });
            });
            rtcSession.on('unmuted', function (data) {
                console.log('ON session unmuted event');
                var audio = data.audio, video = data.video;
                _this._logger.debug('RTCSession "unmuted" event received', data);
                if (audio) {
                    _this._mediaDeviceStatus.audio = __1.MEDIA_DEVICE_STATUS_ACTIVE;
                }
                if (video) {
                    _this._mediaDeviceStatus.video = __1.MEDIA_DEVICE_STATUS_ACTIVE;
                }
                _this._eventEmitter.emit('call.update', { 'call': _this });
            });
            rtcSession.on('reinvite', function (data) {
                _this._logger.debug('RTCSession "re-invite" event received', data);
                console.log("ON session re-invite event");
            });
            rtcSession.on('update', function (data) {
                _this._logger.debug('RTCSession "update" event received', data);
            });
            rtcSession.on('refer', function (data) {
                _this._logger.debug('RTCSession "refer" event received', data);
            });
            rtcSession.on('replaces', function (data) {
                _this._logger.debug('RTCSession "replaces" event received', data);
            });
            rtcSession.on('sdp', function (data) {
                _this._logger.debug('RTCSession "sdp" event received', data);
            });
            rtcSession.on('icecandidate', function (data) {
                _this._logger.debug('RTCSession "icecandidate" event received', data);
            });
        };
        this._rtcSession = null;
        this._callConfig = callConfig;
        this._rtcConfig = rtcConfig;
        this._dtmfOptions = dtmfOptions;
        this._mediaEngine = mediaEngine;
        this._eventEmitter = eventEmitter;
        this.remoteName = remoteName;
        this.remoteUri = '';
        this._endType = 'none';
        this._errorCause = '';
        this._id = this._uuid();
        this._isPlaying = false;
        this._transferStatus = __1.TRANSFER_STATUS_NONE;
        this._init(isIncoming);
    }
    return SipCall;
}());
exports.SipCall = SipCall;
//# sourceMappingURL=sipcall.js.map