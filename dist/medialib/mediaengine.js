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
    ['ringback', { audio: new Audio(FILES['ringback']) }],
    ['ringing', { audio: new Audio(FILES['ringing']) }],
    ['answered', { audio: new Audio(FILES['answered']) }],
    ['rejected', { audio: new Audio(FILES['rejected']) }],
    ['ended', { audio: new Audio(FILES['rejected']) }],
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
            if (_this._inStreamContexts.length === 0 &&
                _this._outStreamContexts.length === 0) {
                _this._prepareConfig(config);
            }
        };
        this.openStreams = function (reqId, audio, video) { return __awaiter(_this, void 0, void 0, function () {
            var opts;
            var _this = this;
            return __generator(this, function (_a) {
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
                            hasScreenMedia: false,
                            srcNode: audioSource,
                            destNode: audioDest,
                            gainNode: gainNode,
                            rawStream: mediaStream,
                            amplStream: newStream
                        });
                        return Promise.resolve(newStream);
                    }).catch(function (err) {
                        console.log(err);
                        return Promise.resolve(null);
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
                    mediaStream.getVideoTracks().forEach(function (track) {
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
                var outCtxt = _this._outStreamContexts[outIndex];
                outCtxt.dest.disconnect();
                outCtxt.gainNode.disconnect();
                outCtxt.src.disconnect();
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
            _this._outStreamContexts.forEach(function (outCtxt) {
                outCtxt.src.disconnect();
                outCtxt.gainNode.disconnect();
                outCtxt.dest.disconnect();
            });
            _this._inStreamContexts = [];
            _this._outStreamContexts = [];
            _this._isPlaying = false;
        };
        this.startOrUpdateOutStreams = function (reqId, mediaStream, track) {
            if (!_this._isPlaying) {
                _this._isPlaying = true;
            }
            var outContext = _this._outStreamContexts.find(function (item) { return item.id === reqId; });
            if (mediaStream) {
                var trackExists = mediaStream.getTracks().find(function (t) { return t.id === track.id; });
                if (trackExists) {
                    mediaStream.removeTrack(trackExists);
                }
                mediaStream.addTrack(track);
                if (outContext === undefined) {
                    if (track.kind === 'audio') {
                        var element = _this._config.audio.out.element;
                        var src = _this._audioContext.createMediaStreamSource(mediaStream);
                        var dest = _this._audioContext.createMediaStreamDestination();
                        var gainNode = _this._audioContext.createGain();
                        src.connect(gainNode);
                        gainNode.connect(dest);
                        gainNode.gain.value = _this._outputVolume * 2;
                        if (element) {
                            element.srcObject = dest.stream;
                        }
                        _this._outStreamContexts.push({
                            id: reqId,
                            stream: mediaStream,
                            src: src,
                            dest: dest,
                            gainNode: gainNode,
                            volume: _this._outputVolume,
                            amplified: false,
                            multiplier: 1
                        });
                    }
                }
                else {
                    if (track.kind === 'audio') {
                        var element = _this._config.audio.out.element;
                        if (element) {
                            element.srcObject = mediaStream;
                        }
                    }
                }
            }
        };
        this.startScreenCapture = function (reqId) {
            var screenShareSettings = _this._config.screenShare;
            var constraints = {
                video: {
                    cursor: screenShareSettings.cursor,
                    logicalSurface: screenShareSettings.logicalSurface,
                },
                audio: screenShareSettings.screenAudio
            };
            return navigator.mediaDevices.getDisplayMedia(constraints)
                .then(function (stream) {
                var context = _this._inStreamContexts.find(function (item) { return item.id === reqId; });
                if (context === undefined) {
                    console.log('error: stream context not found');
                    return Promise.resolve(null);
                }
                context.amplStream.getVideoTracks().forEach(function (track) {
                    track.enabled = false;
                    track.stop();
                    context.amplStream.removeTrack(track);
                });
                context.hasVideo = false;
                stream.getTracks().forEach(function (track) {
                    context.amplStream.addTrack(track);
                });
                context.hasScreenMedia = true;
                return Promise.resolve(context.amplStream);
            }).catch(function (err) {
                console.log(err);
                return Promise.resolve(null);
            });
        };
        this.stopScreenCapture = function (reqId, resumeVideo) {
            var ctxt = _this._inStreamContexts.find(function (item) { return item.id === reqId; });
            if (ctxt === undefined) {
                return Promise.resolve(null);
            }
            if (ctxt.hasScreenMedia) {
                ctxt.amplStream.getVideoTracks().forEach(function (track) {
                    track.enabled = false;
                    track.stop();
                    ctxt.amplStream.removeTrack(track);
                });
                ctxt.hasScreenMedia = false;
            }
            if (resumeVideo) {
                var opts = _this._getMediaConstraints(false, true);
                return navigator.mediaDevices.getUserMedia(opts).then(function (mediaStream) {
                    mediaStream.getVideoTracks().forEach(function (track) {
                        ctxt.amplStream.addTrack(track);
                    });
                }).then(function () {
                    ctxt.hasVideo = true;
                    return Promise.resolve(ctxt.amplStream);
                });
            }
            return Promise.resolve(ctxt.amplStream);
        };
        this.muteAudio = function () {
            _this._enableAudioChannels(false);
        };
        this.unMuteAudio = function () {
            _this._enableAudioChannels(true);
        };
        this.playTone = function (name, continuous) {
            if (continuous === void 0) { continuous = true; }
            var toneRes = typeof name === 'object' ? name : TONES.get(name);
            if (!toneRes) {
                return;
            }
            toneRes.audio.pause();
            toneRes.audio.currentTime = 0.0;
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
            if (value > 1) {
                value = 1;
            }
            var streamCtxt = _this._outStreamContexts.find(function (item) { return item.id === reqId; });
            if (streamCtxt !== undefined) {
                var multiplier = streamCtxt.multiplier;
                streamCtxt.gainNode.gain.value = value * multiplier * 2;
                streamCtxt.volume = value;
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
                if (!ctxt.hasScreenMedia) {
                    var reqId_1 = ctxt.id;
                    var amplStream_1 = ctxt.amplStream;
                    amplStream_1.getVideoTracks().forEach(function (track) {
                        track.enabled = false;
                        track.stop();
                        amplStream_1.removeTrack(track);
                    });
                    var opts = _this._getMediaConstraints(false, true);
                    navigator.mediaDevices.getUserMedia(opts).then(function (mediaStream) {
                        mediaStream.getVideoTracks().forEach(function (track) {
                            ctxt.amplStream.addTrack(track);
                        });
                    }).then(function () {
                        _this._eventEmitter.emit('video.input.update', { 'reqId': reqId_1, 'stream': ctxt.amplStream });
                    });
                }
            });
        };
        this.amplifyAudioOn = function (reqId, multiplier) {
            if (multiplier <= 1) {
                return;
            }
            var outCtxt = _this._outStreamContexts.find(function (item) { return item.id === reqId; });
            if (outCtxt !== undefined) {
                var gainNode = outCtxt.gainNode;
                gainNode.gain.value = outCtxt.volume * 2 * multiplier;
                outCtxt.amplified = true;
                outCtxt.multiplier = multiplier;
            }
        };
        this.amplifyAudioOff = function (reqId) {
            var outCtxt = _this._outStreamContexts.find(function (item) { return item.id === reqId; });
            if (outCtxt !== undefined && outCtxt.amplified) {
                var gainNode = outCtxt.gainNode;
                gainNode.gain.value = outCtxt.volume * 2;
                outCtxt.amplified = false;
                outCtxt.multiplier = 1;
            }
        };
        this.getConfiguredDevice = function (deviceKind) {
            var deviceId = 'default';
            var devices = _this._availableDevices.filter(function (item) { return item.kind === deviceKind; });
            if (devices.length > 0) {
                if (devices.length === 1) {
                    return devices[0].deviceId;
                }
            }
            else {
                return 'none';
            }
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
                .then(function () {
                channels.forEach(function (chnl) {
                    var _a, _b, _c;
                    var devices = _this._availableDevices.filter(function (item) { return item.kind === chnl; });
                    var defaultExists = devices.find(function (item) { return item.deviceId === 'default'; });
                    if (devices.length > 0) {
                        switch (chnl) {
                            case 'audioinput':
                                if (((_a = _this._config) === null || _a === void 0 ? void 0 : _a.audio.in.deviceIds.length) === 0 && defaultExists === undefined) {
                                    _this._config.audio.in.deviceIds[0] = devices[0].deviceId;
                                }
                                break;
                            case 'audiooutput':
                                if (((_b = _this._config) === null || _b === void 0 ? void 0 : _b.audio.out.deviceIds.length) === 0 && defaultExists === undefined) {
                                    _this._config.audio.out.deviceIds[0] = devices[0].deviceId;
                                }
                                break;
                            case 'videoinput':
                                if (((_c = _this._config) === null || _c === void 0 ? void 0 : _c.video.in.deviceIds.length) === 0 && defaultExists === undefined) {
                                    _this._config.video.in.deviceIds[0] = devices[0].deviceId;
                                }
                                break;
                        }
                    }
                });
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
            if (isAudio &&
                _this._config.audio.in.deviceIds.length > 0) {
                constraints.audio = {
                    deviceId: _this._config.audio.in.deviceIds,
                };
            }
            if (isVideo) {
                if (_this._config.video.in.deviceIds.length > 0) {
                    constraints.video = {
                        deviceId: _this._config.video.in.deviceIds,
                        width: _this._config.video.width,
                        height: _this._config.video.height
                    };
                }
                else {
                    constraints.video = {
                        width: _this._config.video.width,
                        height: _this._config.video.height,
                    };
                }
            }
            return constraints;
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
                    },
                    out: {
                        enabled: false,
                        deviceIds: [],
                    },
                    width: 1280,
                    height: 720
                },
                screenShare: {
                    cursor: 'always',
                    logicalSurface: false,
                    screenAudio: false
                }
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