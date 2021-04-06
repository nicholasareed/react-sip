"use strict";
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
exports.MediaEngine = void 0;
var FILES = require("../sounds.json");
var TONES = new Map([
    ['ringback', { audio: new Audio(FILES['ringback']), volume: 1.0 }],
    ['ringing', { audio: new Audio(FILES['ringing']), volume: 1.0 }],
    ['answered', { audio: new Audio(FILES['answered']), volume: 1.0 }],
    ['rejected', { audio: new Audio(FILES['rejected']), volume: 1.0 }],
    ['ended', { audio: new Audio(FILES['rejected']), volume: 1.0 }],
]);
var MediaEngine = (function () {
    function MediaEngine(config, eventEmitter) {
        var _this = this;
        this.availableDevices = function (deviceKind) {
            var result = [];
            _this._availableDevices.forEach(function (device) {
                if (device.kind === deviceKind) {
                    result.push(device);
                }
            });
            return result;
        };
        this.fetchAllDevices = function () {
            return _this._availableDevices;
        };
        this.reConfigure = function (config) {
            _this._prepareConfig(config);
        };
        this.openStreams = function (reqId, audio, video) { return __awaiter(_this, void 0, void 0, function () {
            var opts;
            var _this = this;
            return __generator(this, function (_a) {
                console.log(this._availableDevices);
                opts = this._getMediaConstraints(audio, video);
                return [2, navigator.mediaDevices.getUserMedia(opts).then(function (mediaStream) {
                        var audioSource = _this._audioContext.createMediaStreamSource(mediaStream);
                        var audioDest = _this._audioContext.createMediaStreamDestination();
                        var gainNode = _this._audioContext.createGain();
                        audioSource.connect(gainNode);
                        gainNode.connect(audioDest);
                        gainNode.gain.value = _this._inputVolume * 2;
                        var inputStream = audioDest.stream;
                        var newStream = new MediaStream();
                        inputStream.getTracks().forEach(function (track) {
                            newStream.addTrack(track);
                        });
                        if (video) {
                            mediaStream.getVideoTracks().forEach(function (track) {
                                newStream.addTrack(track);
                            });
                        }
                        _this._inStreamContexts.push({
                            id: reqId,
                            hasVideo: video,
                            srcNode: audioSource,
                            destNode: audioDest,
                            gainNode: gainNode,
                            rawStream: mediaStream,
                            amplStream: newStream
                        });
                        return Promise.resolve(newStream);
                    })];
            });
        }); };
        this.updateStream = function (reqId, audio, video) {
            var index = _this._inStreamContexts.findIndex(function (ctxt) { return ctxt.id === reqId; });
            if (index !== -1) {
                var streamContext = _this._inStreamContexts[index];
                var appStream_1 = streamContext.amplStream;
                streamContext.hasVideo = video;
                if (audio) {
                    appStream_1.getAudioTracks().forEach(function (track) {
                        track.enabled = false;
                        track.stop();
                        appStream_1.removeTrack(track);
                    });
                }
                if (video) {
                    appStream_1.getVideoTracks().forEach(function (track) {
                        track.enabled = false;
                        track.stop();
                        appStream_1.removeTrack(track);
                    });
                }
                var opts = _this._getMediaConstraints(audio, video);
                return navigator.mediaDevices.getUserMedia(opts).then(function (mediaStream) {
                    mediaStream.getTracks().forEach(function (track) {
                        appStream_1.addTrack(track);
                    });
                    return Promise.resolve(appStream_1);
                });
            }
            return Promise.resolve(null);
        };
        this.closeStream = function (reqId) {
            var index = _this._inStreamContexts.findIndex(function (item) { return item.id === reqId; });
            if (index !== -1) {
                var streamContext = _this._inStreamContexts[index];
                var mediaStream_1 = streamContext.amplStream;
                streamContext.gainNode.disconnect();
                streamContext.srcNode.disconnect();
                streamContext.destNode.disconnect();
                mediaStream_1.getTracks().forEach(function (track) {
                    track.enabled = false;
                    track.stop();
                    mediaStream_1.removeTrack(track);
                });
                streamContext.rawStream.getTracks().forEach(function (track) {
                    track.enabled = false;
                    track.stop();
                });
                _this._inStreamContexts.splice(index, 1);
            }
            var outIndex = _this._outStreamContexts.findIndex(function (item) { return item.id === reqId; });
            if (outIndex !== -1) {
                _this._outStreamContexts.splice(outIndex, 1);
            }
        };
        this.closeAll = function () {
            _this._inStreamContexts.forEach(function (streamContext) {
                streamContext.gainNode.disconnect();
                streamContext.srcNode.disconnect();
                streamContext.destNode.disconnect();
                streamContext.amplStream.getTracks().forEach(function (track) {
                    track.enabled = false;
                    track.stop();
                });
                streamContext.rawStream.getTracks().forEach(function (track) {
                    track.enabled = false;
                    track.stop();
                });
            });
            _this._inStreamContexts = [];
            _this._outStreamContexts = [];
            _this._isPlaying = false;
        };
        this.startOrUpdateOutStreams = function (reqId, mediaStream, track, audioElement, videoElement) {
            if (!_this._isPlaying) {
                if (audioElement) {
                    var audioOut = _this._config.audio.out;
                    audioOut.element = audioElement;
                    audioOut.element.setSinkId(audioOut.deviceIds[0]);
                    audioOut.element.autoplay = true;
                    audioOut.element.volume = _this._outputVolume;
                }
                _this._isPlaying = true;
            }
            if (mediaStream) {
                var trackExists = mediaStream.getTracks().find(function (t) { return t.id === track.id; });
                if (trackExists) {
                    mediaStream.removeTrack(trackExists);
                }
                mediaStream.addTrack(track);
                var element = null;
                if (track.kind === 'audio') {
                    if (audioElement) {
                        element = audioElement;
                    }
                    else {
                        element = _this._config.audio.out.element;
                    }
                }
                else {
                    if (videoElement) {
                        element = videoElement;
                    }
                    else {
                        element = _this._config.video.out.element;
                    }
                }
                if (element) {
                    element.srcObject = mediaStream;
                }
                var outContext = _this._outStreamContexts.find(function (item) { return item.id === reqId; });
                if (outContext === undefined) {
                    if (track.kind === 'audio') {
                        var vol = _this._outputVolume;
                        if (!_this._outStreamContexts.length && element) {
                            element.volume = _this._outputVolume;
                        }
                        else {
                            vol = _this._outStreamContexts[0].volume;
                        }
                        _this._outStreamContexts.push({
                            id: reqId,
                            stream: mediaStream,
                            volume: vol
                        });
                    }
                }
                else {
                    if (outContext.stream.id !== mediaStream.id) {
                        outContext.stream = mediaStream;
                    }
                }
            }
        };
        this.muteAudio = function () {
            _this._enableAudioChannels(false);
        };
        this.unMuteAudio = function () {
            _this._enableAudioChannels(true);
        };
        this.playTone = function (name, volume, continuous) {
            if (volume === void 0) { volume = 1.0; }
            if (continuous === void 0) { continuous = true; }
            if (volume === undefined) {
                volume = 1.0;
            }
            var toneRes = typeof name === 'object' ? name : TONES.get(name);
            if (!toneRes) {
                return;
            }
            toneRes.audio.pause();
            toneRes.audio.currentTime = 0.0;
            toneRes.audio.volume = (toneRes.volume || 1.0) * volume;
            toneRes.audio.loop = continuous;
            toneRes.audio.volume = _this._ringVolume;
            toneRes.audio.play()
                .catch(function (err) {
            });
            return toneRes;
        };
        this.stopTone = function (name) {
            var toneRes = typeof name === 'object' ? name : TONES.get(name);
            if (!toneRes) {
                return;
            }
            toneRes.audio.pause();
            toneRes.audio.currentTime = 0.0;
        };
        this.changeOutputVolume = function (vol) {
            if (vol > 1) {
                vol = 1;
            }
            _this._outputVolume = vol;
        };
        this.changeInputVolume = function (vol) {
            if (vol > 1) {
                vol = 1;
            }
            else if (vol < 0) {
                vol = 0;
            }
            _this._inputVolume = vol;
        };
        this.changeOutStreamVolume = function (reqId, value) {
            var _a;
            if (value > 1) {
                value = 1;
            }
            var streamCtxt = _this._outStreamContexts.find(function (item) { return item.id === reqId; });
            if (streamCtxt !== undefined) {
                var audioElement = (_a = _this._config) === null || _a === void 0 ? void 0 : _a.audio.out.element;
                audioElement.volume = value;
                _this._outStreamContexts.forEach(function (ctxt) {
                    ctxt.volume = value;
                });
            }
        };
        this.changeInStreamVolume = function (reqId, vol) {
            if (vol > 1) {
                vol = 1;
            }
            var value = vol * 2;
            var streamContext = _this._inStreamContexts.find(function (item) { return item.id === reqId; });
            if (streamContext !== undefined) {
                streamContext.gainNode.gain.value = value;
            }
        };
        this.getOutputVolume = function () {
            return _this._outputVolume;
        };
        this.getInputVolume = function () {
            return _this._inputVolume;
        };
        this.changeRingVolume = function (vol) {
            _this._ringVolume = vol;
        };
        this.getRingVolume = function () {
            return _this._ringVolume;
        };
        this.getOutStreamVolume = function (reqId) {
            var ctxt = _this._outStreamContexts.find(function (item) { return item.id === reqId; });
            if (ctxt !== undefined) {
                return ctxt.volume;
            }
            return 0.8;
        };
        this.getInStreamVolume = function (reqId) {
            var streamContext = _this._inStreamContexts.find(function (item) { return item.id === reqId; });
            if (streamContext !== undefined) {
                var value = streamContext.gainNode.gain.value;
                return (value * 0.5);
            }
            return -1;
        };
        this.hasDeviceExists = function (deviceKind, deviceId) {
            var isValid = _this._supportedDeviceTypes.includes(deviceKind);
            if (!isValid) {
                throw Error("UnSupported Device Kind");
            }
            if (deviceId) {
                var index = _this._availableDevices.findIndex(function (item) {
                    return item.kind === deviceKind && item.deviceId === deviceId;
                });
                if (index !== -1) {
                    return true;
                }
                return false;
            }
            else {
                var index = _this._availableDevices.findIndex(function (item) {
                    return item.kind === deviceKind;
                });
                if (index !== -1) {
                    return true;
                }
                return false;
            }
        };
        this.changeAudioInput = function (deviceId) {
            if (!_this.hasDeviceExists('audioinput', deviceId)) {
                throw Error("audioinput device with id " + deviceId + " not found");
            }
            _this._changeDeviceConfig('audioinput', deviceId);
            _this._inStreamContexts.forEach(function (ctxt) {
                var reqId = ctxt.id;
                var rawStream = ctxt.rawStream;
                var amplStream = ctxt.amplStream;
                rawStream.getAudioTracks().forEach(function (track) {
                    track.enabled = false;
                    track.stop();
                    rawStream.removeTrack(track);
                });
                amplStream.getAudioTracks().forEach(function (track) {
                    track.enabled = false;
                    track.stop();
                    amplStream.removeTrack(track);
                });
                var currGain = ctxt.gainNode.gain.value;
                ctxt.srcNode.disconnect();
                ctxt.destNode.disconnect();
                ctxt.gainNode.disconnect();
                var opts = _this._getMediaConstraints(true, false);
                navigator.mediaDevices.getUserMedia(opts).then(function (mediaStream) {
                    mediaStream.getAudioTracks().forEach(function (track) {
                        ctxt.rawStream.addTrack(track);
                    });
                    ctxt.srcNode = _this._audioContext.createMediaStreamSource(ctxt.rawStream);
                    ctxt.destNode = _this._audioContext.createMediaStreamDestination();
                    ctxt.gainNode = _this._audioContext.createGain();
                    ctxt.srcNode.connect(ctxt.gainNode);
                    ctxt.gainNode.connect(ctxt.destNode);
                    ctxt.gainNode.gain.value = currGain;
                    ctxt.destNode.stream.getAudioTracks().forEach(function (track) {
                        ctxt.amplStream.addTrack(track);
                    });
                }).then(function () {
                    _this._eventEmitter.emit('audio.input.update', { 'reqId': reqId, 'stream': ctxt.amplStream });
                });
            });
        };
        this.changeAudioOutput = function (deviceId) {
            if (!_this.hasDeviceExists('audiooutput', deviceId)) {
                throw Error("audiooutput device with id " + deviceId + " not found");
            }
            _this._changeDeviceConfig('audiooutput', deviceId);
            if (_this._config) {
                var configAudioOutput = _this._config.audio.out;
                configAudioOutput.element.setSinkId(configAudioOutput.deviceIds[0]);
                configAudioOutput.element.autoplay = true;
            }
        };
        this.changeVideoInput = function (deviceId) {
            if (!_this.hasDeviceExists('videoinput', deviceId)) {
                throw Error("videoinput device with id " + deviceId + " not found");
            }
            _this._changeDeviceConfig('videoinput', deviceId);
            _this._inStreamContexts.forEach(function (ctxt) {
                var reqId = ctxt.id;
                var amplStream = ctxt.amplStream;
                amplStream.getVideoTracks().forEach(function (track) {
                    track.enabled = false;
                    track.stop();
                    amplStream.removeTrack(track);
                });
                var opts = _this._getMediaConstraints(false, true);
                navigator.mediaDevices.getUserMedia(opts).then(function (mediaStream) {
                    mediaStream.getVideoTracks().forEach(function (track) {
                        ctxt.amplStream.addTrack(track);
                    });
                }).then(function () {
                    _this._eventEmitter.emit('video.input.update', { 'reqId': reqId, 'stream': ctxt.amplStream });
                });
            });
        };
        this.getConfiguredDevice = function (deviceKind) {
            var deviceId = 'default';
            switch (deviceKind) {
                case 'audioinput':
                    if (_this._config.audio.in.deviceIds.length > 0) {
                        deviceId = _this._config.audio.in.deviceIds[0];
                    }
                    break;
                case 'audiooutput':
                    if (_this._config.audio.out.deviceIds.length > 0) {
                        deviceId = _this._config.audio.out.deviceIds[0];
                    }
                    break;
                case 'videoinput':
                    if (_this._config.video.in.deviceIds.length > 0) {
                        deviceId = _this._config.video.in.deviceIds[0];
                    }
                    break;
            }
            return deviceId;
        };
        this._changeDeviceConfig = function (deviceKind, deviceId) {
            switch (deviceKind) {
                case 'audioinput':
                    _this._config.audio.in.deviceIds[0] = deviceId;
                    break;
                case 'audiooutput':
                    _this._config.audio.out.deviceIds[0] = deviceId;
                    break;
                case 'videoinput':
                    _this._config.video.in.deviceIds[0] = deviceId;
                    break;
            }
        };
        this._flushDeviceConfig = function (deviceKind, deviceId) {
            switch (deviceKind) {
                case 'audioinput':
                    if (_this._config.audio.in.deviceIds.length > 0 &&
                        _this._config.audio.in.deviceIds[0] === deviceId) {
                        _this._config.audio.in.deviceIds = [];
                    }
                    break;
                case 'audiooutput':
                    if (_this._config.audio.out.deviceIds.length > 0 &&
                        _this._config.audio.out.deviceIds[0] === deviceId) {
                        _this._config.audio.out.deviceIds = [];
                    }
                    break;
                case 'videoinput':
                    if (_this._config.video.in.deviceIds.length > 0 &&
                        _this._config.video.in.deviceIds[0] === deviceId) {
                        _this._config.video.in.deviceIds = [];
                    }
                    break;
            }
        };
        this._enableAudioChannels = function (isEnable) {
            if (!_this._isAudioEnabled()) {
                throw Error("Audio device is not enabled");
            }
            var options = {
                audio: true,
                video: false,
            };
            navigator.mediaDevices.getUserMedia(options).then(function (mediaStream) {
                mediaStream.getAudioTracks().forEach(function (track) {
                    track.enabled = isEnable;
                });
            }).catch(function (err) {
                throw Error("Mute Audio");
            });
        };
        this._isAudioEnabled = function () {
            return _this._config.audio.in.enabled;
        };
        this._isVideoEnabled = function () {
            return _this._config.video.in.enabled;
        };
        this._refreshDevices = function () {
            var channels = ['audioinput', 'audiooutput', 'videoinput'];
            var deviceList = [];
            navigator.mediaDevices.enumerateDevices()
                .then(function (devices) {
                devices.forEach(function (deviceInfo) {
                    var isSupported = channels.includes(deviceInfo.kind);
                    if (isSupported) {
                        deviceList.push(deviceInfo);
                    }
                });
                var oldList = _this._availableDevices;
                _this._availableDevices = [];
                deviceList.forEach(function (device) {
                    var index = oldList.findIndex(function (item) {
                        return (item.deviceId === device.deviceId && item.kind === device.kind);
                    });
                    if (index < 0) {
                    }
                    else {
                        oldList.splice(index, 1);
                    }
                    var label = device.label;
                    var defStr = 'default -';
                    var commStr = 'communications -';
                    if (device.label.toLowerCase().startsWith(defStr)) {
                        label = device.label.substring(defStr.length);
                        label = label.trim();
                    }
                    else if (device.label.toLowerCase().startsWith(commStr)) {
                        label = device.label.substring(commStr.length);
                        label = label.trim();
                    }
                    var exists = _this._availableDevices.find(function (item) {
                        return item.label.toLowerCase() === label.toLowerCase() && item.kind === device.kind;
                    });
                    if (exists === undefined) {
                        _this._availableDevices.push({
                            deviceId: device.deviceId,
                            kind: device.kind,
                            label: label
                        });
                    }
                });
                oldList.forEach(function (item) {
                    _this._flushDeviceConfig(item.kind, item.deviceId);
                });
                _this._eventEmitter.emit('media.device.update', {});
            })
                .catch(function (err) {
                console.log("Enumerate devices error " + err.cause);
            });
        };
        this._initDevices = function () {
            _this._audioContext = new AudioContext();
            _this._refreshDevices();
            navigator.mediaDevices.ondevicechange = function (event) {
                _this._refreshDevices();
            };
        };
        this._getMediaConstraints = function (isAudio, isVideo) {
            var constraints = {
                audio: isAudio,
            };
            if (isVideo) {
                constraints['video'] = true;
            }
            if (isAudio &&
                _this._config.audio.in.deviceIds.length > 0) {
                constraints.audio = {
                    deviceId: _this._config.audio.in.deviceIds,
                };
            }
            if (isVideo &&
                _this._config.video.in.deviceIds.length > 0) {
                constraints.video = {
                    deviceId: _this._config.video.in.deviceIds,
                };
            }
            return constraints;
        };
        this._attachMediaStream = function (mediaStream, trackKind, direction) {
            var _a, _b;
            var element = null;
            if (trackKind === 'audio') {
                element = (_a = _this._config) === null || _a === void 0 ? void 0 : _a.audio[direction].element;
            }
            else if (trackKind === 'video') {
                element = (_b = _this._config) === null || _b === void 0 ? void 0 : _b.video[direction].element;
            }
            if (element && element !== undefined && element.srcObject.id !== mediaStream.id) {
                element.srcObject = mediaStream;
            }
        };
        this._isPlaying = false;
        this._availableDevices = [];
        this._inStreamContexts = [];
        this._outStreamContexts = [];
        this._supportedDeviceTypes = ['audioinput', 'audiooutput', 'videoinput'];
        this._outputVolume = 0.8;
        this._inputVolume = 1;
        this._ringVolume = 0.8;
        this._eventEmitter = eventEmitter;
        this._prepareConfig(config);
        this._initDevices();
    }
    MediaEngine.prototype._prepareConfig = function (config) {
        if (!config) {
            this._config = {
                audio: {
                    in: {
                        enabled: true,
                        deviceIds: [],
                        element: null,
                    },
                    out: {
                        enabled: true,
                        deviceIds: ['default'],
                        element: null,
                    },
                },
                video: {
                    in: {
                        enabled: true,
                        deviceIds: [],
                        element: null,
                    },
                    out: {
                        enabled: false,
                        deviceIds: [],
                        element: null,
                    },
                },
            };
            var audioOut = this._config.audio.out;
            audioOut.element = window.document.createElement('audio');
            audioOut.element.setSinkId(audioOut.deviceIds[0]);
            audioOut.element.autoplay = true;
            audioOut.element.volume = this._outputVolume;
        }
        else {
            var deviceId = null;
            if (config.audio.in.enabled) {
                if (config.audio.in.deviceIds.length > 0) {
                    deviceId = config.audio.in.deviceIds[0];
                }
                if (!this.hasDeviceExists('audioinput', deviceId)) {
                    throw Error("Audio input is enabled but device is not available");
                }
            }
            if (config.audio.out.enabled) {
                if (config.audio.out.deviceIds.length > 0) {
                    deviceId = config.audio.out.deviceIds[0];
                }
                if (!this.hasDeviceExists('audiooutput', deviceId)) {
                    throw Error("Audio output is enabled but device is not available");
                }
            }
            if (config.video.in.enabled) {
                if (config.video.in.deviceIds.length > 0) {
                    deviceId = config.video.in.deviceIds[0];
                }
                if (!this.hasDeviceExists('videoinput', deviceId)) {
                    throw Error("Video input is enabled but device is not available");
                }
            }
            Object.assign(this._config, config);
        }
    };
    return MediaEngine;
}());
exports.MediaEngine = MediaEngine;
//# sourceMappingURL=mediaengine.js.map