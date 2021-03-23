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
]);
var MediaEngine = (function () {
    function MediaEngine(config) {
        var _this = this;
        this.availableDevices = function (deviceKind) {
            var result = [];
            _this._availableDevices.forEach(function (device) {
                if (device.kind === deviceKind) {
                    var tmpDevice = {
                        deviceId: device.deviceId,
                        label: device.label,
                    };
                    result.push(tmpDevice);
                }
            });
            return result;
        };
        this.reConfigure = function (config) {
            _this._prepareConfig(config);
        };
        this.openStreams = function (audio, video) { return __awaiter(_this, void 0, void 0, function () {
            var opts;
            var _this = this;
            return __generator(this, function (_a) {
                console.log(this._availableDevices);
                opts = this._getMediaConstraints(audio, video);
                return [2, navigator.mediaDevices.getUserMedia(opts).then(function (mediaStream) {
                        var newStream = new MediaStream();
                        mediaStream.getTracks().forEach(function (track) {
                            newStream.addTrack(track);
                        });
                        _this._openedStreams.push(newStream);
                        return Promise.resolve(newStream);
                    }).then(function (stream) {
                        var audioSource = _this._audioContext.createMediaStreamSource(stream);
                        var audioDest = _this._audioContext.createMediaStreamDestination();
                        audioSource.connect(_this._gainNode);
                        _this._gainNode.connect(audioDest);
                        _this._gainNode.gain.value = 1;
                        var inputStream = audioDest.stream;
                        return Promise.resolve(inputStream);
                    })];
            });
        }); };
        this.updateStream = function (appStream, audio, video) {
            if (appStream === null) {
                appStream = new MediaStream();
            }
            var opts = _this._getMediaConstraints(audio, video);
            return navigator.mediaDevices.getUserMedia(opts).then(function (mediaStream) {
                mediaStream.getTracks().forEach(function (track) {
                    var exists = appStream.getTracks().find(function (t) { return t.kind === track.kind; });
                    if (exists !== undefined) {
                        appStream.removeTrack(track);
                    }
                    appStream.addTrack(track);
                });
                return Promise.resolve(appStream);
            });
        };
        this.closeStream = function (mediaStream) {
            mediaStream.getTracks().forEach(function (track) {
                track.enabled = false;
                track.stop();
                mediaStream.removeTrack(track);
            });
            var index = _this._openedStreams.findIndex(function (item) { return item.id === mediaStream.id; });
            if (index !== -1) {
                _this._openedStreams.splice(index, 1);
            }
        };
        this.closeAll = function () {
            _this._openedStreams.forEach(function (mediaStream) {
                mediaStream.getTracks().forEach(function (track) {
                    track.enabled = false;
                    track.stop();
                });
            });
            _this._openedStreams = [];
            var opts = _this._getMediaConstraints(true, true);
            navigator.mediaDevices.getUserMedia(opts).then(function (mediaStream) {
                mediaStream.getTracks().forEach(function (track) {
                    mediaStream.removeTrack(track);
                });
            });
            _this._isPlaying = false;
        };
        this.startOrUpdateOutStreams = function (mediaStream, track, audioElement, videoElement) {
            if (!_this._isPlaying) {
                if (audioElement) {
                    var audioOut = _this._config.audio.out;
                    audioOut.element = audioElement;
                    audioOut.element.setSinkId(audioOut.deviceIds[0]);
                    audioOut.element.autoplay = true;
                }
                if (videoElement) {
                    _this._config.video['out'].element = videoElement;
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
            }
        };
        this.muteAudio = function () {
            _this._enableAudioChannels(false);
        };
        this.unMuteAudio = function () {
            _this._enableAudioChannels(true);
        };
        this.playTone = function (name, volume) {
            if (volume === void 0) { volume = 1.0; }
            if (volume === undefined) {
                volume = 1.0;
            }
            var toneRes = TONES.get(name);
            if (!toneRes) {
                return;
            }
            toneRes.audio.pause();
            toneRes.audio.currentTime = 0.0;
            toneRes.audio.volume = (toneRes.volume || 1.0) * volume;
            toneRes.audio.loop = true;
            toneRes.audio.play()
                .catch(function (err) {
            });
        };
        this.stopTone = function (name) {
            var toneRes = TONES.get(name);
            if (!toneRes) {
                return;
            }
            toneRes.audio.pause();
            toneRes.audio.currentTime = 0.0;
        };
        this.changeOutputVolume = function (vol) {
            var _a;
            if (vol > 1) {
                vol = 1;
            }
            var value = vol;
            if (_this._isPlaying) {
                var audioElement = (_a = _this._config) === null || _a === void 0 ? void 0 : _a.audio.out.element;
                audioElement.volume = value;
            }
            _this._outputVolume = value;
        };
        this.changeInputVolume = function (vol) {
            if (vol > 1) {
                vol = 1;
            }
            var value = vol * 2;
            _this._gainNode.gain.value = value;
            _this._inputVolume = vol;
        };
        this.getOutputVolume = function () {
            return _this._outputVolume;
        };
        this.getInputVolume = function () {
            return _this._inputVolume;
        };
        this.hasDeviceExists = function (deviceKind, deviceId) {
            var isValid = _this._supportedDeviceTypes.includes(deviceKind);
            if (!isValid) {
                throw Error("UnSupported Device Kind");
            }
            var deviceInfo = _this._availableDevices.find(function (device) { return device.kind === deviceKind; });
            if (deviceInfo && deviceInfo !== undefined) {
                if (deviceId) {
                    deviceInfo = _this._availableDevices.find(function (device) {
                        return device.kind === deviceKind && device.deviceId === deviceId;
                    });
                    if (deviceInfo === undefined) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        };
        this.changeDevice = function (deviceKind, deviceId) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2];
            });
        }); };
        this._startInputStreams = function (mediaStream) {
            var newStream = new MediaStream();
            mediaStream.getTracks().forEach(function (track) {
                newStream.addTrack(track.clone());
            });
            _this._openedStreams.push(newStream);
            return newStream;
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
                    _this._availableDevices.push(device);
                });
                console.log(oldList);
            })
                .catch(function (err) {
                console.log("Enumerate devices error " + err.cause);
            });
        };
        this._initDevices = function () {
            _this._audioContext = new AudioContext();
            _this._gainNode = _this._audioContext.createGain();
            _this._refreshDevices();
            navigator.mediaDevices.ondevicechange = function (event) {
                console.log("On media device change");
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
        this._openedStreams = [];
        this._supportedDeviceTypes = ['audioinput', 'audiooutput', 'videoinput'];
        this._inputVolume = 1;
        this._outputVolume = 1;
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