import { WebAudioHTMLMediaElement } from "..";

import * as EventEmitter from 'eventemitter3';
import * as FILES from '../sounds.json';

const TONES = new Map([
  [ 'ringback', { audio: new Audio(FILES['ringback']) } ],
  [ 'ringing', { audio: new Audio(FILES['ringing']) } ],
  [ 'answered', { audio: new Audio(FILES['answered']) } ],
  [ 'rejected', { audio: new Audio(FILES['rejected']) } ],
  [ 'ended', { audio: new Audio(FILES['rejected']) } ],
]);

export interface AudioConfig {
  enabled: boolean;
  deviceIds: string[];
  element: WebAudioHTMLMediaElement | null;
}
export interface VideoConfig {
  enabled: boolean;
  deviceIds: string[];
}
export interface MediaEngineConfig {
  audio: {
    in: AudioConfig,
    out: AudioConfig
  };
  video: {
    in: VideoConfig,
    out: VideoConfig,
    width: number,
    height: number,
  };
}
export interface MediaDevice {
  deviceId: string;
  kind: string;
  label: string;
}
export interface InputStreamContext {
  id: string;
  hasVideo: boolean;
  hasScreenMedia: boolean;
  srcNode: MediaStreamAudioSourceNode;
  destNode: MediaStreamAudioDestinationNode;
  gainNode: GainNode;
  rawStream: MediaStream; // feed to source audio node
  amplStream: MediaStream;
}
export interface OutputStreamContext {
  id: string;
  stream: MediaStream;
  volume: number;
}
export class MediaEngine {
  _config: MediaEngineConfig | null;
  _availableDevices: MediaDevice[];
  _outputVolume: number;
  _inputVolume: number;
  _ringVolume: number;
  _audioContext: AudioContext;
  _inStreamContexts: InputStreamContext[];
  _outStreamContexts: OutputStreamContext[];
  _isPlaying: boolean;
  _supportedDeviceTypes: string[];
  _eventEmitter: EventEmitter;

  constructor(config: MediaEngineConfig | null, eventEmitter: EventEmitter) {
    this._isPlaying = false;
    this._availableDevices = [];
    this._inStreamContexts = [];
    this._outStreamContexts = [];
    this._supportedDeviceTypes = ['audioinput', 'audiooutput', 'videoinput'];
    this._outputVolume = 0.8;  // default 80%
    this._inputVolume = 1; // 100 %
    this._ringVolume = 0.8;
    this._eventEmitter = eventEmitter;
    this._prepareConfig(config);
    this._initDevices();
  }

  // Fetch available devices for a given 'device kind'
  availableDevices = (deviceKind: 'audioinput' | 'audiooutput' | 'videoinput'): MediaDevice[] => {
    const result: MediaDevice[] = [];
    this._availableDevices.forEach((device) => {
      if (device.kind === deviceKind) {
        result.push(device);
      }
    });
    return result;
  };

  fetchAllDevices = (): MediaDevice[] => {
    return this._availableDevices;
  };

  reConfigure = (config: MediaEngineConfig): void => {
    this._prepareConfig(config);
  };
  // Open
  openStreams = async (reqId: string,
                       audio: boolean,
                       video: boolean): Promise<MediaStream | null> => {
    // tslint:disable-next-line:no-console
    // console.log(this._availableDevices);
    const opts = this._getMediaConstraints(audio, video);

    // If already capturing
    return navigator.mediaDevices.getUserMedia(opts).then((mediaStream) => {
      const audioSource = this._audioContext.createMediaStreamSource(mediaStream);
      const audioDest = this._audioContext.createMediaStreamDestination();
      const gainNode = this._audioContext.createGain(); // per input stream ??
      audioSource.connect(gainNode);
      gainNode.connect(audioDest);
      gainNode.gain.value = this._inputVolume * 2;
      const inputStream = audioDest.stream;
      // clone the tracks to another stream
      const newStream = new MediaStream();
      inputStream.getTracks().forEach((track) => {
        newStream.addTrack(track);
        /*
        // if already live
        if (track.readyState === 'live') {
          delete opts[track.kind];
        } else {
          mediaStream.removeTrack(track);
        }
        */
      });

      // video call
      if (video) {
        mediaStream.getVideoTracks().forEach((track) => {
          newStream.addTrack(track);
        });
      }

      this._inStreamContexts.push({
        id: reqId,
        hasVideo: video,
        hasScreenMedia: false,
        srcNode: audioSource,
        destNode: audioDest,
        gainNode,
        rawStream: mediaStream,
        amplStream: newStream
      });
      return Promise.resolve(newStream);
    });
  };
  // update stream with audio/video
  // use case: adding video
  updateStream = (reqId: string,
                  audio: boolean,
                  video: boolean): Promise<MediaStream | null> => {
    const index = this._inStreamContexts.findIndex((ctxt) => ctxt.id === reqId);
    if (index !== -1) {
      const streamContext = this._inStreamContexts[index];
      const appStream = streamContext.amplStream;
      streamContext.hasVideo = video;
      if (audio) {
        appStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
          appStream.removeTrack(track);
        });
      }
      if (video) {
        appStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
          appStream.removeTrack(track);
        });
      }
      const opts = this._getMediaConstraints(audio, video);
      return navigator.mediaDevices.getUserMedia(opts).then((mediaStream) => {
        // currently update is used to add video
        // Video tracks are not routed through Gain Node
        // TODO: if audio is added
        mediaStream.getTracks().forEach((track) => {
          appStream!.addTrack(track);
        });
        return Promise.resolve(appStream);
      });
    }
    return Promise.resolve(null);
  };
  closeStream = (reqId: string): void => {
    const index = this._inStreamContexts.findIndex((item) => item.id === reqId);
    if (index !== -1) {
      const streamContext = this._inStreamContexts[index];
      const mediaStream = streamContext.amplStream;

      streamContext.gainNode.disconnect();
      streamContext.srcNode.disconnect();
      streamContext.destNode.disconnect();
      mediaStream.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        mediaStream.removeTrack(track);
      });
      streamContext.rawStream.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      this._inStreamContexts.splice(index, 1);
    }

    // out stream context
    const outIndex = this._outStreamContexts.findIndex(
      (item) => item.id === reqId);
    if (outIndex !== -1) {
      this._outStreamContexts.splice(outIndex, 1);
    }
  };
  closeAll = () => {
    // close all opened streams
    this._inStreamContexts.forEach((streamContext) => {
      streamContext.gainNode.disconnect();
      streamContext.srcNode.disconnect();
      streamContext.destNode.disconnect();
      streamContext.amplStream.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      streamContext.rawStream.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
    });
    this._inStreamContexts = [];
    this._outStreamContexts = [];
    this._isPlaying = false;
  };
  startOrUpdateOutStreams = (reqId: string,
                             mediaStream: MediaStream | null,
                             track: MediaStreamTrack): void => {
    if (!this._isPlaying) {
      this._isPlaying = true;
    }
    // if valid add the track
    if (mediaStream) {
      const trackExists = mediaStream.getTracks().find((t) => t.id === track.id);
      if (trackExists) {
        mediaStream.removeTrack(trackExists);
      }
      mediaStream.addTrack(track);
      if (track.kind === 'audio') {
        const element = this._config!.audio.out.element;
        if (element) {
          element.srcObject = mediaStream;
        }
      }
      const outContext = this._outStreamContexts.find((item) => item.id === reqId);
      // new context
      if (outContext === undefined) {
        if (track.kind === 'audio') {
          const element = this._config!.audio.out.element;
          let vol = this._outputVolume;
          if (!this._outStreamContexts.length && element) {
            element.volume = this._outputVolume;
          } else {
            vol = this._outStreamContexts[0].volume;
          }
          this._outStreamContexts.push({
            id: reqId,
            stream: mediaStream,
            volume: vol
          });
        }
      } else {
        if (outContext.stream.id !== mediaStream.id) {
          outContext.stream = mediaStream;
        }
      }
    }
  };
  // todo: screen audio
  startScreenCapture = (reqId: string): Promise<MediaStream | null> => {
    // screenshare constraints
    const constraints = {
      video : {
        cursor: 'never',
        logicalSurface: false
      },
      audio: false
    };
    // @ts-ignore
    return navigator.mediaDevices.getDisplayMedia(constraints)
      .then((stream) => {
        // find the input stream context
        const context = this._inStreamContexts.find((item) => item.id === reqId);
        if (context === undefined) {
          // tslint:disable-next-line:no-console
          console.log('error: stream context not found');
          return Promise.resolve(null);
        }
        // remove the existing video
        context.amplStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
          context.amplStream.removeTrack(track);
        });
        context.hasVideo = false;
        // add the screen media
        stream.getTracks().forEach((track) => {
          context.amplStream.addTrack(track);
        });
        context.hasScreenMedia = true;
        return Promise.resolve(context.amplStream);
      }).catch((err) => {
        // tslint:disable-next-line:no-console
        console.log(err);
        return Promise.resolve(null);
      })
  };
  stopScreenCapture = (reqId: string, resumeVideo: boolean): Promise<MediaStream | null> => {
    // find input stream context
    const ctxt = this._inStreamContexts.find((item) => item.id === reqId);
    if (ctxt === undefined) {
      // error
      return Promise.resolve(null);
    }
    if (ctxt.hasScreenMedia) {
      ctxt.amplStream.getVideoTracks().forEach((track) => {
        track.enabled = false;
        track.stop()
        ctxt.amplStream.removeTrack(track);
      });
      ctxt.hasScreenMedia = false;
    }
    // capture video
    if (resumeVideo) {
      const opts = this._getMediaConstraints(false, true);
      return navigator.mediaDevices.getUserMedia(opts).then((mediaStream) => {
        mediaStream.getVideoTracks().forEach((track) => {
          ctxt.amplStream.addTrack(track);
        })
      }).then(() => {
        ctxt.hasVideo = true;
        return Promise.resolve(ctxt.amplStream);
      })
    }
    return Promise.resolve(ctxt.amplStream);
  };
  muteAudio = (): void => {
    this._enableAudioChannels(false);
  };
  unMuteAudio = (): void => {
    this._enableAudioChannels(true);
  };
  playTone = (name: string | any, continuous: boolean=true): any => {
    const toneRes = typeof name === 'object' ? name : TONES.get(name);
    if (!toneRes) {
      return;
    }
    toneRes.audio.pause();
    toneRes.audio.currentTime = 0.0;
    toneRes.audio.loop = continuous;
    toneRes.audio.volume = this._ringVolume;
    toneRes.audio.play()
      .catch((err) => {
        // log the error
      });
    return toneRes;
  };
  stopTone = (name: string| any): void => {
    const toneRes = typeof name === 'object' ? name : TONES.get(name);
    if (!toneRes) {
      return;
    }
    toneRes.audio.pause();
    toneRes.audio.currentTime = 0.0;
  };
  // change output volume
  // used only for initial volume
  changeOutputVolume = (vol: number): void => {
    if (vol > 1) {
      vol = 1;
    }
    this._outputVolume = vol;
  };
  changeInputVolume = (vol: number): void => {
    if (vol > 1) {
      vol = 1;
    } else if (vol < 0) {
      vol = 0;
    }
    this._inputVolume = vol;
  }
  changeOutStreamVolume = (reqId: string, value: number): void => {
    if (value > 1) {
      value = 1;
    }
    const streamCtxt = this._outStreamContexts.find((item) => item.id === reqId);
    if (streamCtxt !== undefined) {
      const audioElement = this._config?.audio.out.element;
      audioElement!.volume = value;
      // currently volume is set on the element
      // not using audio nodes
      this._outStreamContexts.forEach((ctxt) => {
        ctxt.volume = value;
      });
    }
  };
  // change input volume
  changeInStreamVolume = (reqId: string, vol: number): void => {
    if (vol>1) {
      vol = 1;
    }
    const value = vol * 2;
    const streamContext = this._inStreamContexts.find(
      (item) => item.id === reqId);
    if (streamContext !== undefined) {
      streamContext.gainNode.gain.value = value;
    }
  };
  getOutputVolume = (): number => {
    return this._outputVolume;
  };
  getInputVolume = (): number => {
    return this._inputVolume;
  };
  changeRingVolume = (vol: number): void => {
    this._ringVolume = vol;
  };
  getRingVolume = (): number => {
    return this._ringVolume;
  };
  getOutStreamVolume = (reqId: string): number => {
    const ctxt = this._outStreamContexts.find((item) => item.id === reqId);
    if (ctxt !== undefined) {
      return ctxt.volume;
    }
    return 0.8;
  };
  getInStreamVolume = (reqId: string): number => {
    const streamContext = this._inStreamContexts.find(
      (item) => item.id === reqId);
    if (streamContext !== undefined) {
      const value = streamContext.gainNode.gain.value;
      return (value * 0.5);
    }
    return -1;
  };
  hasDeviceExists = (deviceKind: string, deviceId: string | null): boolean => {
    const isValid = this._supportedDeviceTypes.includes(deviceKind);
    if (!isValid) {
      throw Error("UnSupported Device Kind");
    }
    if (deviceId) {
      const index = this._availableDevices.findIndex((item) =>
        item.kind === deviceKind && item.deviceId === deviceId);
      if (index !== -1) {
        return true;
      }
      return false;
    } else {
      // device exists for the device kind
      const index = this._availableDevices.findIndex((item) =>
        item.kind === deviceKind );
      if (index !== -1) {
        return true;
      }
      return false;
    }
  };
  changeAudioInput = (deviceId: string): void => {
    // check device
    if (!this.hasDeviceExists('audioinput', deviceId)) {
      throw Error(`audioinput device with id ${deviceId} not found`);
    }
    this._changeDeviceConfig('audioinput', deviceId);
    this._inStreamContexts.forEach((ctxt) => {
      const reqId = ctxt.id;
      const rawStream = ctxt.rawStream;
      const amplStream = ctxt.amplStream;
      rawStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        rawStream.removeTrack(track);
      });
      amplStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        amplStream.removeTrack(track);
      });
      const currGain = ctxt.gainNode.gain.value;
      ctxt.srcNode.disconnect();
      ctxt.destNode.disconnect();
      ctxt.gainNode.disconnect();

      const opts = this._getMediaConstraints(true, false);
      navigator.mediaDevices.getUserMedia(opts).then((mediaStream) => {
        mediaStream.getAudioTracks().forEach((track) => {
          ctxt.rawStream.addTrack(track);
        })
        ctxt.srcNode = this._audioContext.createMediaStreamSource(ctxt.rawStream);
        ctxt.destNode = this._audioContext.createMediaStreamDestination();
        ctxt.gainNode = this._audioContext.createGain(); // per input stream ??
        ctxt.srcNode.connect(ctxt.gainNode);
        ctxt.gainNode.connect(ctxt.destNode);
        ctxt.gainNode.gain.value = currGain;

        ctxt.destNode.stream.getAudioTracks().forEach((track) => {
          ctxt.amplStream.addTrack(track);
        });
      }).then(() => {
        this._eventEmitter.emit('audio.input.update', {'reqId': reqId, 'stream': ctxt.amplStream});
      });
    });
  };
  changeAudioOutput = (deviceId: string): void => {
    if (!this.hasDeviceExists('audiooutput', deviceId)) {
      throw Error(`audiooutput device with id ${deviceId} not found`);
    }
    this._changeDeviceConfig('audiooutput', deviceId);
    if (this._config) {
      const configAudioOutput = this._config.audio.out;
      configAudioOutput.element!.setSinkId(configAudioOutput.deviceIds[0]);
      configAudioOutput.element!.autoplay = true;
    }
  };
  changeVideoInput = (deviceId: string): void => {
    if (!this.hasDeviceExists('videoinput', deviceId)) {
      throw Error(`videoinput device with id ${deviceId} not found`);
    }
    this._changeDeviceConfig('videoinput', deviceId);
    this._inStreamContexts.forEach((ctxt) => {
      const reqId = ctxt.id;
      const amplStream = ctxt.amplStream;
      amplStream.getVideoTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        amplStream.removeTrack(track);
      });
      const opts = this._getMediaConstraints(false, true);
      navigator.mediaDevices.getUserMedia(opts).then((mediaStream) => {
        mediaStream.getVideoTracks().forEach((track) => {
          ctxt.amplStream.addTrack(track);
        })
      }).then(() => {
        this._eventEmitter.emit('video.input.update', {'reqId': reqId, 'stream': ctxt.amplStream});
      });
    });
  };
  getConfiguredDevice = (deviceKind: string): string => {
    let deviceId = 'default';
    const devices = this._availableDevices.filter((item) => item.kind === deviceKind);
    if (devices.length > 0) {
      if (devices.length === 1) {
        return devices[0].deviceId;
      }
    } else {
      return 'none';
    }
    switch (deviceKind) {
      case 'audioinput':
        if (this._config!.audio.in.deviceIds.length > 0) {
          deviceId = this._config!.audio.in.deviceIds[0];
        }
        break;
      case 'audiooutput':
        if (this._config!.audio.out.deviceIds.length > 0) {
          deviceId = this._config!.audio.out.deviceIds[0];
        }
        break;
      case 'videoinput':
        if (this._config!.video.in.deviceIds.length > 0) {
          deviceId = this._config!.video.in.deviceIds[0];
        }
        break;
    }
    return deviceId;
  };
  _changeDeviceConfig = (deviceKind: string, deviceId: string): void => {
    // TO DO change out & in device
    switch (deviceKind) {
      case 'audioinput':
        // @ts-ignore
        this._config.audio.in.deviceIds[0] = deviceId;
        break;
      case 'audiooutput':
        // @ts-ignore
        this._config.audio.out.deviceIds[0] = deviceId;
        break;
      case 'videoinput':
        // @ts-ignore
        this._config.video.in.deviceIds[0] = deviceId;
        break;
    }
  };
  _flushDeviceConfig = (deviceKind:string, deviceId:string): void => {
    switch (deviceKind) {
      case 'audioinput':
        if (this._config!.audio.in.deviceIds.length > 0 &&
            this._config!.audio.in.deviceIds[0] === deviceId) {
          this._config!.audio.in.deviceIds = [];
        }
        break;
      case 'audiooutput':
        if (this._config!.audio.out.deviceIds.length > 0 &&
          this._config!.audio.out.deviceIds[0] === deviceId) {
          this._config!.audio.out.deviceIds = [];
        }
        break;
      case 'videoinput':
        if (this._config!.video.in.deviceIds.length > 0 &&
          this._config!.video.in.deviceIds[0] === deviceId) {
          this._config!.video.in.deviceIds = [];
        }
        break;
    }
  };
  _prepareConfig(config: MediaEngineConfig | null) {
    if (!config) {
      // Default config
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
      };
      const audioOut = this._config!.audio.out;
      audioOut.element = window.document.createElement('audio') as WebAudioHTMLMediaElement;
      audioOut.element.setSinkId(audioOut.deviceIds[0]);
      audioOut.element.autoplay = true;
      audioOut.element.volume = this._outputVolume;
    } else {
      let deviceId: string | null = null;
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
        if(!this.hasDeviceExists('audiooutput', deviceId)) {
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
  }
  // NOTE: Only input device is muted.
  _enableAudioChannels = (isEnable: boolean): void => {
    if (!this._isAudioEnabled()) {
      // Audio not enabled
      throw Error(`Audio device is not enabled`);
    }
    const options = {
      audio: true,
      video: false,
    };
    navigator.mediaDevices.getUserMedia(options).then((mediaStream) => {
      mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = isEnable;
      })
    }).catch((err) => {
      throw Error(`Mute Audio`);
    });
  };
  // TODO: check the all configured devices exists or not
  _isAudioEnabled = (): boolean => {
    // @ts-ignore
    return this._config.audio.in.enabled;
  };
  _isVideoEnabled = (): boolean => {
    // @ts-ignore
    return this._config.video.in.enabled;
  };
  _refreshDevices = (): void => {
    const channels = [ 'audioinput', 'audiooutput', 'videoinput' ];
    const deviceList: MediaDeviceInfo[] = [];
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        devices.forEach((deviceInfo) => {
          const isSupported = channels.includes(deviceInfo.kind);
          if (isSupported) {
            deviceList.push(deviceInfo);
          }
        });
        const oldList = this._availableDevices;
        this._availableDevices = [];
        deviceList.forEach((device) => {
          const index = oldList.findIndex((item) =>
            (item.deviceId === device.deviceId && item.kind === device.kind));
          if (index < 0) {
            // new device found
          } else {
            oldList.splice(index, 1);
          }
          let label = device.label;
          const defStr = 'default -';
          const commStr = 'communications -';
          if (device.label.toLowerCase().startsWith(defStr)) {
            label = device.label.substring(defStr.length);
            label = label.trim();
          } else if (device.label.toLowerCase().startsWith(commStr)) {
            label = device.label.substring(commStr.length);
            label = label.trim()
          }
          const exists = this._availableDevices.find((item) =>
            item.label.toLowerCase() === label.toLowerCase() && item.kind === device.kind);
          if (exists === undefined) {
            this._availableDevices.push({
              deviceId: device.deviceId,
              kind: device.kind,
              label
            });
          }
        });
        oldList.forEach((item) => {
          this._flushDeviceConfig(item.kind, item.deviceId);
        });
        this._eventEmitter.emit('media.device.update', {});
      })
      .then(() => {
        channels.forEach((chnl) => {
          const devices = this._availableDevices.filter((item) => item.kind === chnl);
          const defaultExists = devices.find((item) => item.deviceId === 'default');
          if (devices.length > 0) {
            switch (chnl) {
              case 'audioinput':
                if (this._config?.audio.in.deviceIds.length === 0 && defaultExists === undefined) {
                  this._config.audio.in.deviceIds[0] = devices[0].deviceId;
                }
                break;
              case 'audiooutput':
                if (this._config?.audio.out.deviceIds.length === 0 && defaultExists === undefined) {
                  this._config.audio.out.deviceIds[0] = devices[0].deviceId;
                }
                break;
              case 'videoinput':
                if (this._config?.video.in.deviceIds.length === 0 && defaultExists === undefined) {
                  this._config.video.in.deviceIds[0] = devices[0].deviceId;
                }
                break;
            }
          }
        });
      })
      .catch((err) => {
        // log error
        // tslint:disable-next-line:no-console
        console.log(`Enumerate devices error ${err.cause}`);
      })
  };
  _initDevices = (): void => {
    this._audioContext = new AudioContext();
    this._refreshDevices();
    navigator.mediaDevices.ondevicechange = (event) => {
      this._refreshDevices();
    };
  };
  _getMediaConstraints = (isAudio: boolean, isVideo: boolean): MediaStreamConstraints => {
    const constraints: MediaStreamConstraints = {
      audio: isAudio,
    };
    // if configured use the configured device
    if (isAudio &&
      // @ts-ignore
      this._config.audio.in.deviceIds.length > 0) {
      constraints.audio = {
        // @ts-ignore
        deviceId: this._config.audio.in.deviceIds,
      };
    }
    if (isVideo) {
      // @ts-ignore
      if (this._config.video.in.deviceIds.length > 0) {
        constraints.video = {
          // @ts-ignore
          deviceId: this._config.video.in.deviceIds,
          width: this._config!.video.width,
          height:this._config!.video.height
        };
      } else {
        constraints.video = {
          width: this._config!.video.width,
          height: this._config!.video.height,
        }
      }
    }
    return constraints;
  };
}
