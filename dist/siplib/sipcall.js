"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SipCall = void 0;
var JsSIP = require("jssip");
var sdpTransform = require("sdp-transform");
var dummyLogger_1 = require("../lib/dummyLogger");
var __1 = require("..");
var SipCall = (function () {
    function SipCall(isIncoming, remoteName, remoteIdentity, callConfig, rtcConfig, dtmfOptions, mediaEngine, eventEmitter, additionalInfo) {
        var _this = this;
        this._init = function (isIncoming) {
            var _a, _b, _c;
            if (isIncoming === true) {
                _this.setCallStatus(__1.CALL_STATUS_RINGING);
                _this._direction = __1.CALL_DIRECTION_INCOMING;
                var toneNameOrObj = (_c = (_b = (_a = _this._callConfig).getSetting) === null || _b === void 0 ? void 0 : _b.call(_a, 'call-ringing-tone', {
                    call: _this
                }, function () { return 'ringing'; })) !== null && _c !== void 0 ? _c : 'ringing';
                _this._tones['ringing'] = _this._mediaEngine.playTone(toneNameOrObj, 1.0);
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
        this.getAdditionalInfo = function () {
            return _this._additionalInfo;
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
        this.hasLocalVideo = function () {
            return _this._hasLocalVideo;
        };
        this.hasRemoteVideo = function () {
            return _this._hasRemoteVideo;
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
        this.getInputMediaStream = function () {
            return _this._inputMediaStream;
        };
        this.onNewRTCSession = function (rtcSession, request) {
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
            _this._request = request;
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
        this.changeOutputVolume = function (vol) {
            _this._mediaEngine.changeOutStreamVolume(_this.getId(), vol);
            _this._eventEmitter.emit('call.update', { 'call': _this });
        };
        this.getOutputVolume = function () {
            return _this._mediaEngine.getOutStreamVolume(_this.getId());
        };
        this._setInputMediaStream = function (stream) {
            _this._inputMediaStream = stream;
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
        this.dial = function (ua, target, hasAudio, hasVideo, localVideoEl, remoteVideoEl) {
            if (localVideoEl === void 0) { localVideoEl = null; }
            if (remoteVideoEl === void 0) { remoteVideoEl = null; }
            if (hasVideo) {
                _this._hasLocalVideo = true;
                _this._localVideoEl = localVideoEl;
                _this._remoteVideoEl = remoteVideoEl;
            }
            _this._mediaEngine.openStreams(_this.getId(), hasAudio, hasVideo).then(function (stream) {
                if (!stream) {
                    throw Error('Failed to open the input streams');
                }
                if (hasVideo && localVideoEl) {
                    localVideoEl.srcObject = stream;
                }
                var opts = {
                    mediaConstraints: {
                        audio: hasAudio,
                        video: hasVideo,
                    },
                    mediaStream: stream,
                    rtcOfferConstraints: {
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: true,
                        iceRestart: false
                    },
                    pcConfig: _this.getRTCConfig(),
                    extraHeaders: _this.getExtraHeaders().invite,
                    sessionTimersExpires: _this.getSessionTimerExpires(),
                };
                _this.remoteUri = target;
                _this.setCallStatus(__1.CALL_STATUS_DIALING);
                _this._setInputMediaStream(stream);
                _this._hasLocalVideo = hasVideo;
                _this._eventEmitter.emit('call.update', { 'call': _this });
                ua.call(target, opts);
            });
        };
        this.accept = function (hasAudio, hasVideo, localVideoEl, remoteVideoEl) {
            if (hasAudio === void 0) { hasAudio = true; }
            if (hasVideo === void 0) { hasVideo = false; }
            if (localVideoEl === void 0) { localVideoEl = null; }
            if (remoteVideoEl === void 0) { remoteVideoEl = null; }
            if (!_this.isSessionActive()) {
                throw new Error("RtcSession is not active");
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_RINGING) {
                _this._logger.error("Calling answer() is not allowed when call status is " + _this.getCallStatus());
                return;
            }
            if (hasVideo) {
                _this._hasLocalVideo = true;
            }
            _this._localVideoEl = localVideoEl;
            _this._remoteVideoEl = remoteVideoEl;
            _this._mediaEngine.openStreams(_this.getId(), hasAudio, hasVideo).then(function (inputStream) {
                if (hasVideo && localVideoEl) {
                    localVideoEl.srcObject = inputStream;
                }
                var stream = inputStream;
                var options = {
                    extraHeaders: _this.getExtraHeaders().resp2xx,
                    mediaConstraints: {
                        audio: true,
                        video: true,
                    },
                    pcConfig: _this.getRTCConfig(),
                    mediaStream: stream,
                    sessionTimerExpires: _this.getSessionTimerExpires(),
                };
                _this.getRTCSession().answer(options);
                _this.setCallStatus(__1.CALL_STATUS_CONNECTING);
                _this._setInputMediaStream(inputStream);
                _this._mediaEngine.stopTone(_this._tones['ringing'] || 'ringing');
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
            _this._mediaEngine.stopTone(_this._tones['ringing'] || 'ringing');
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
            _this._mediaEngine.closeStream(_this.getId());
            _this._setInputMediaStream(null);
            if (_this._localVideoEl) {
                _this._localVideoEl.srcObject = null;
                _this._localVideoEl = null;
            }
            if (_this.getCallStatus() === __1.CALL_STATUS_PROGRESS) {
                _this._mediaEngine.stopTone('ringback');
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
        this.offerVideo = function (localVideoEl) {
            if (!_this.isSessionActive()) {
                throw new Error('RtcSession is not active');
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                throw new Error("Calling offerVideo() is not allowed when call status is " + _this.getCallStatus());
            }
            if (localVideoEl) {
                _this._localVideoEl = localVideoEl;
            }
            var peerConnection = _this._peerConnection;
            var transceivers = peerConnection === null || peerConnection === void 0 ? void 0 : peerConnection.getTransceivers();
            if (transceivers === undefined || transceivers.length < 2) {
                _this._logger.error('Video transceiver not present');
                return;
            }
            var videoTransceiver = transceivers[1];
            videoTransceiver === null || videoTransceiver === void 0 ? void 0 : videoTransceiver.direction = 'sendrecv';
            _this._mediaEngine.updateStream(_this.getId(), false, true).then(function (stream) {
                if (!stream) {
                    throw Error('Failed to update the input streams in offerVideo');
                }
                stream.getVideoTracks().forEach(function (track) {
                    peerConnection === null || peerConnection === void 0 ? void 0 : peerConnection.addTrack(track, stream);
                });
                if (_this._localVideoEl) {
                    _this._localVideoEl.srcObject = stream;
                }
                var options = {
                    useUpdate: false,
                    rtcOfferConstraints: {
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: true,
                        iceRestart: false
                    },
                    extraHeaders: _this.getExtraHeaders().invite
                };
                _this._setInputMediaStream(stream);
                _this._hasLocalVideo = true;
                _this._eventEmitter.emit('call.update', { 'call': _this });
                _this.getRTCSession().renegotiate(options);
            });
        };
        this.changeInputVolume = function (vol) {
            _this._mediaEngine.changeInStreamVolume(_this.getId(), vol);
        };
        this.getInputVolume = function () {
            return _this._mediaEngine.getInStreamVolume(_this.getId());
        };
        this.renegotiate = function () {
            if (!_this.isSessionActive()) {
                throw new Error('RtcSession is not active');
            }
            if (_this.getCallStatus() !== __1.CALL_STATUS_ACTIVE) {
                throw new Error("Calling renegotiate() is not allowed when call status is " + _this.getCallStatus());
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
        this.parkCall = function (dest) {
            if (!_this.getRTCSession()) {
                _this._logger.error('Session is not active, invalid API call');
                return;
            }
            var options = {
                eventHandlers: {
                    requestSucceeded: function () {
                        console.log('ON Park refer success');
                    },
                    requestFailed: function () {
                        console.log('ON Park refer failed');
                    },
                    accepted: function () {
                        console.log('ON Park accept notification');
                    },
                    failed: function () {
                        console.log('ON Park failure notification');
                    },
                },
            };
            _this.getRTCSession().refer(dest, options);
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
            _this._mediaEngine.startOrUpdateOutStreams(_this.getId(), _this._outputMediaStream, track, null, _this._remoteVideoEl);
        };
        this._handleLocalSdp = function (sdp) {
            var sdpObj = sdpTransform.parse(sdp);
            _this._localMedia = [];
            sdpObj.media.forEach(function (media) {
                var mode = 'sendrecv';
                var type = media.type;
                if (media.direction !== undefined) {
                    mode = media.direction;
                }
                if (type === 'video' && media.port !== 0) {
                    console.log('Local Video present');
                }
                _this._localMedia.push({ mode: mode, type: type, payloads: media.rtp });
                if (_this._modifySdp) {
                    if (type === 'video') {
                        console.log(media);
                        var purgePts_1 = [];
                        var supportedCodecs_1 = _this._videoCodecs;
                        media.rtp.forEach(function (item) {
                            if (!supportedCodecs_1.includes(item.codec)) {
                                purgePts_1.push(item.payload);
                            }
                        });
                        var pts = media.payloads.toString().split(' ');
                        var filteredPts = pts.filter(function (item) { return !purgePts_1.includes(parseInt(item, 10)); });
                        var fmtp = media.fmtp.filter(function (item) { return !purgePts_1.includes(item.payload); });
                        var rtcpFb = media.rtcpFb.filter(function (item) { return !purgePts_1.includes(item.payload); });
                        var rtp = media.rtp.filter(function (item) { return !purgePts_1.includes(item.payload); });
                        media.payloads = filteredPts.join(' ');
                        media.fmtp = fmtp;
                        media.rtcpFb = rtcpFb;
                        media.rtp = rtp;
                    }
                }
            });
            var sdpStr = sdpTransform.write(sdpObj);
            return sdpStr;
        };
        this._handleRemoteOffer = function (sdp) {
            var sdpObj = sdpTransform.parse(sdp);
            if (sdpObj.media === undefined || sdpObj.media.length === 0) {
                _this._logger.debug('SDP Offer received with zero media streams');
                return;
            }
            var sdpAudio = sdpObj.media.find(function (mline) { return mline.type === 'audio'; });
            var sdpVideo = sdpObj.media.find(function (mline) { return mline.type === 'video'; });
            if (sdpAudio !== undefined) {
            }
            if (sdpVideo !== undefined && sdpVideo.port !== 0) {
                console.log('Incoming video call');
                _this._hasRemoteVideo = true;
            }
            _this._remoteMedia = [];
            sdpObj.media.forEach(function (media) {
                var mode = 'sendrecv';
                if (media.direction !== undefined) {
                    mode = media.direction;
                }
                _this._remoteMedia.push({ mode: mode, type: media.type, payloads: media.rtp });
            });
            _this._sdpStatus = __1.SDP_OFFER_RECEIVED;
            console.log(_this._remoteMedia);
        };
        this._handleRemoteAnswer = function (sdp) {
            var sdpObj = sdpTransform.parse(sdp);
            if (sdpObj.media === undefined || sdpObj.media.length === 0) {
                _this._logger.error('SDP Answer received with zero media streams');
                return;
            }
            var sdpVideo = sdpObj.media.find(function (mline) { return mline.type === 'video'; });
            if (sdpVideo !== undefined && sdpVideo.port !== 0) {
                console.log('Incoming video call');
                _this._hasRemoteVideo = true;
            }
            _this._remoteMedia = [];
            sdpObj.media.forEach(function (media) {
                var mode = 'sendrecv';
                if (media.direction !== undefined) {
                    mode = media.direction;
                }
                if (media.port !== 0) {
                    _this._remoteMedia.push({ mode: mode, type: media.type, payloads: media.rtp });
                }
            });
            _this._sdpStatus = __1.SDP_OFFER_ANSWER_COMPLETE;
            console.log(_this._remoteMedia);
        };
        this._initSessionEventHandler = function () {
            var rtcSession = _this.getRTCSession();
            if (!_this.isSessionActive()) {
                throw Error("SM Init failed - Session is not ACTIVE");
            }
            if (rtcSession === null || rtcSession === void 0 ? void 0 : rtcSession.connection) {
                var peerConnection = rtcSession.connection;
                _this.setPeerConnection(peerConnection);
                peerConnection.addEventListener('track', function (event) {
                    console.log('ON track event');
                    _this._logger.debug('PeerConnection "ontrack" event received');
                    _this._handleRemoteTrack(event.track);
                    _this._eventEmitter.emit('call.update', { 'call': _this });
                    event.track.addEventListener('unmute', function (ev) {
                        console.log('Received track unmute event');
                    });
                    event.track.addEventListener('mute', function (ev) {
                        console.log('Received track mute event');
                    });
                    event.track.addEventListener('ended', function (ev) {
                        console.log('Received track ended event');
                    });
                });
                peerConnection.addEventListener('removestream', function (event) {
                    console.log('Received remove stream event');
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
                    _this._eventEmitter.emit('call.update', { 'call': _this });
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
                _this._mediaEngine.closeStream(_this.getId());
                _this._setInputMediaStream(null);
                _this._outputMediaStream = null;
                if (_this._localVideoEl) {
                    _this._localVideoEl.srcObject = null;
                    _this._localVideoEl = null;
                }
                if (_this._remoteVideoEl) {
                    _this._remoteVideoEl.srcObject = null;
                    _this._remoteVideoEl = null;
                }
                if ((rtcSession === null || rtcSession === void 0 ? void 0 : rtcSession.end_time) && rtcSession.end_time !== undefined) {
                    _this.endTime = rtcSession === null || rtcSession === void 0 ? void 0 : rtcSession.end_time.toString();
                }
                _this._endType = 'hangup';
                if (_this.getCallStatus() === __1.CALL_STATUS_RINGING) {
                    _this._mediaEngine.stopTone(_this._tones['ringing'] || 'ringing');
                }
                else if (_this.getCallStatus() === __1.CALL_STATUS_PROGRESS) {
                    _this._mediaEngine.stopTone('ringback');
                }
                _this.setCallStatus(__1.CALL_STATUS_IDLE);
                _this.setMediaSessionStatus(__1.MEDIA_SESSION_STATUS_IDLE);
                _this._eventEmitter.emit('call.ended', { 'call': _this });
            });
            rtcSession.on('failed', function (data) {
                console.log('ON session failed event');
                _this._logger.debug('RTCSession "failed" event received', data);
                var originator = data.originator;
                var reason = data.cause;
                _this._mediaEngine.closeStream(_this.getId());
                _this._setInputMediaStream(null);
                _this._outputMediaStream = null;
                if (_this._localVideoEl) {
                    _this._localVideoEl.srcObject = null;
                    _this._localVideoEl = null;
                }
                if (_this._remoteVideoEl) {
                    _this._remoteVideoEl.srcObject = null;
                    _this._remoteVideoEl = null;
                }
                if (_this.getCallStatus() === __1.CALL_STATUS_RINGING) {
                    _this._mediaEngine.stopTone(_this._tones['ringing'] || 'ringing');
                }
                else if (_this.getCallStatus() === __1.CALL_STATUS_PROGRESS) {
                    _this._mediaEngine.stopTone('ringback');
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
                console.log("ON session SDP event");
                var originator = data.originator, type = data.type, sdp = data.sdp;
                if (originator === 'remote') {
                    if (type === 'answer') {
                        _this._handleRemoteAnswer(sdp);
                    }
                    else if (type === 'offer') {
                        _this._handleRemoteOffer(sdp);
                    }
                }
                else {
                    var modified = _this._handleLocalSdp(sdp);
                    if (_this._modifySdp) {
                        data.sdp = modified;
                    }
                }
            });
            rtcSession.on('icecandidate', function (data) {
                _this._logger.debug('RTCSession "icecandidate" event received', data);
            });
        };
        this._mediaEventHandler = function () {
            _this._eventEmitter.on('audio.input.update', function (event) {
                console.log("On audio.input.update event for callid: " + event.reqId);
                if (event.reqId === _this.getId()) {
                    var mediaStream = event.stream;
                    var peerConn_1 = _this._peerConnection;
                    mediaStream.getAudioTracks().forEach(function (track) {
                        peerConn_1 === null || peerConn_1 === void 0 ? void 0 : peerConn_1.getSenders().forEach(function (sender) {
                            if (sender.track && sender.track.kind === 'audio') {
                                sender.replaceTrack(track);
                            }
                        });
                    });
                }
            });
            _this._eventEmitter.on('audio.output.update', function (event) {
            });
            _this._eventEmitter.on('video.input.update', function (event) {
                if (event.reqId === _this.getId()) {
                    var mediaStream = event.stream;
                    var peerConn_2 = _this._peerConnection;
                    mediaStream.getVideoTracks().forEach(function (track) {
                        peerConn_2 === null || peerConn_2 === void 0 ? void 0 : peerConn_2.getSenders().forEach(function (sender) {
                            if (sender.track && sender.track.kind === 'video') {
                                sender.replaceTrack(track);
                            }
                        });
                    });
                }
            });
        };
        this._debug = true;
        this._rtcSession = null;
        this._callConfig = callConfig;
        this._rtcConfig = rtcConfig;
        this._dtmfOptions = dtmfOptions;
        this._mediaEngine = mediaEngine;
        this._eventEmitter = eventEmitter;
        this.remoteIdentity = remoteIdentity;
        this.remoteName = remoteName;
        this.remoteUri = '';
        this._endType = 'none';
        this._errorCause = '';
        this._id = this._uuid();
        this._isPlaying = false;
        this._transferStatus = __1.TRANSFER_STATUS_NONE;
        this._hasLocalVideo = false;
        this._hasRemoteVideo = false;
        this._localVideoEl = null;
        this._remoteVideoEl = null;
        this._sdpStatus = __1.SDP_OFFER_PENDING;
        this._localMedia = [];
        this._remoteMedia = [];
        this._additionalInfo = additionalInfo;
        this._modifySdp = false;
        this._audioCodecs = ['G722', 'PCMA', 'PCMU', 'telephone-event', 'CN'];
        this._videoCodecs = ['H264'];
        this._tones = {};
        this._init(isIncoming);
        this._mediaEventHandler();
    }
    return SipCall;
}());
exports.SipCall = SipCall;
//# sourceMappingURL=sipcall.js.map