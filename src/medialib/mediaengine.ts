import { WebAudioHTMLMediaElement } from "..";

import * as FILES from '../sounds.json';

const TONES = new Map([
  [ 'ringback', { audio: new Audio(FILES['ringback']), volume: 1.0 } ],
  [ 'ringing', { audio: new Audio(FILES['ringing']), volume: 1.0 } ],
  [ 'answered', { audio: new Audio(FILES['answered']), volume: 1.0 } ],
  [ 'rejected', { audio: new Audio(FILES['rejected']), volume: 1.0 } ],
]);

export interface MediaConfig {
  enabled: boolean,
  deviceIds: string[],
  element: WebAudioHTMLMediaElement | null,
}
export interface MediaEngineConfig {
  audio: {
    in: MediaConfig,
    out: MediaConfig,
  },
  video: {
    in: MediaConfig,
    out: MediaConfig,
  },
}

export interface MediaDevice {
  deviceId: string,
  label: string,
}
export class MediaEngine {
  _config: MediaEngineConfig | null;
  _availableDevices: MediaDeviceInfo[];
  _openedStreams: MediaStream[];
  _isCapturing: boolean;
  _supportedDeviceTypes: string[];

  constructor(config: MediaEngineConfig | null) {
    this._isCapturing = false;
    this._availableDevices = [];
    this._openedStreams = [];
    this._supportedDeviceTypes = ['audioinput', 'audiooutput', 'videoinput'];
    this._prepareConfig(config);
    this._initDevices();
    // this._initInputStreams();

  }

  // Fetch available devices
  availableDevices = (deviceKind: "audioinput" | "audiooutput" | "videoinput"): MediaDevice[] => {
    const result: MediaDevice[] = [];
    this._availableDevices.forEach((device) => {
      if (device.kind === deviceKind) {
        const tmpDevice: MediaDevice = {
          deviceId: device.deviceId,
          label: device.label,
        };
        result.push(tmpDevice);
      }
    });
    return result;
  };

  reConfigure = (config: MediaEngineConfig): void => {
    this._prepareConfig(config);
  };

  // Open
  openStreams = async (audio: boolean, video: boolean): Promise<MediaStream | null> => {
    const opts = this._getMediaConstraints(audio, video);

    // If already capturing
    if (this._isCapturing) {
      return navigator.mediaDevices.getUserMedia(opts).then((mediaStream) => {
        return this._startStreams(mediaStream);
      }).catch((err) => {
        // log the error
        return null;
      });
    } else {
      this._isCapturing = true;
      return navigator.mediaDevices.getUserMedia(opts).then((mediaStream) => {
        mediaStream.getTracks().forEach((track) => {
          // if already live
          if (track.readyState === 'live') {
            delete opts[track.kind];
          } else {
            mediaStream.removeTrack(track);
          }
        });

        if (Object.keys(opts).length === 0) {
          return Promise.resolve(mediaStream);
        }

        return navigator.mediaDevices.getUserMedia(opts).then((unattachedStream) => {
          unattachedStream.getTracks().forEach((track) => {
            unattachedStream.addTrack(track);
          })
          return unattachedStream;
        }).then((stream: MediaStream) => {
          this._attachMediaStream(stream, 'audio');
          this._attachMediaStream(stream, 'video');
          return stream;
        })

      }).then((tobeStarted) => {
        return this._startStreams(tobeStarted);
      })
    }
  };
  closeStream = (mediaStream: MediaStream): void => {
    mediaStream.getTracks().forEach((track) => {
      track.enabled = false;
      track.stop();
    })
    // tslint:disable-next-line:no-console
    console.log(this._openedStreams);
    const index = this._openedStreams.findIndex((item) => item.id === mediaStream.id);
    if (index !== -1) {
      this._openedStreams.splice(index, 1);
    }
  };

  addTrack = (mediaStream: MediaStream, track: MediaStreamTrack): void => {
    // check if track is already present or not
    const trackExists = mediaStream.getTracks().find((t) => t.id === track.id);
    if (!trackExists) {
      mediaStream.addTrack(track);
    }
    // @ts-ignore
    const element = this._config[track.kind]['out'].element;
    if (element) {
      element.srcObject = mediaStream;
      element.play()
        .then(() => {
          // log
        })
        .catch((err) => {
          // log
        })
    }
  };
  startOutputStream = (mediaStream: MediaStream): void => {
    // @ts-ignore
    const element = this._config['audio']['out'].element;
    if (element) {
      element.srcObject = mediaStream;
      element.play()
        .then(() => {
          // log
        })
        .catch((err) => {
          // log
        })
    }
  };

  closeAll = () => {
    // close all opened streams
    this._openedStreams.forEach((mediaStream) => {
      mediaStream.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      })
    })
    this._openedStreams = [];
    const opts = this._getMediaConstraints(true, true);
    navigator.mediaDevices.getUserMedia(opts).then((mediaStream) => {
      mediaStream.getTracks().forEach((track) => {
        mediaStream.removeTrack(track);
      });
      this._isCapturing = false;
    });
  };
  muteAudio = (): void => {
    this._enableAudioChannels(false);
  };
  unMuteAudio = (): void => {
    this._enableAudioChannels(true);
  };
  // TODO: Implement playing tones
  playTone = (name: string, volume: number=1.0): void => {
    // play tone to the output device
    if (volume === undefined) {
      volume = 1.0
    }
    const toneRes = TONES.get(name);
    if (!toneRes) {
      return;
    }
    toneRes.audio.pause();
    toneRes.audio.currentTime = 0.0;
    toneRes.audio.volume = (toneRes.volume || 1.0) * volume;
    toneRes.audio.play()
      .catch((err) => {
        // log the error
      });
  };
  stopTone = (name: string): void => {
    const toneRes = TONES.get(name);
    if (!toneRes) {
      return;
    }
    toneRes.audio.pause();
    toneRes.audio.currentTime = 0.0;
  };
  hasDeviceExists = (deviceKind: string, deviceId: string | null): boolean => {
    const isValid = this._supportedDeviceTypes.includes(deviceKind);
    if (!isValid) {
      throw Error("UnSupported Device Kind");
    }
    let deviceInfo = this._availableDevices.find((device) => device.kind === deviceKind);
    if (deviceInfo && deviceInfo !== undefined) {
      if(deviceId) {
        deviceInfo = this._availableDevices.find((device) =>
          device.kind === deviceKind && device.deviceId === deviceId);
        if(deviceInfo === undefined) {
          return false
        }
      }
      return true;
    }
    return false;
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
            element: null,
          },
          out: {
            enabled: false,
            deviceIds: [],
            element: null,
          },
        },
      };
      const audioOut = this._config.audio.out;
      audioOut.element = window.document.createElement('audio') as WebAudioHTMLMediaElement;
      audioOut.element!.setSinkId(audioOut.deviceIds[0]);
      audioOut.element.autoplay = true;
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
  _startStreams = (mediaStream: MediaStream): MediaStream => {
    const newStream = new MediaStream();

    mediaStream.getTracks().forEach((track) => {
      newStream.addTrack(track.clone());
    })
    this._openedStreams.push(newStream);
    return newStream;
  };

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

  _initDevices = (): void => {
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        devices.forEach((deviceInfo) => {
          const isRequired = ['audioinput', 'audiooutput', 'videoinput'].includes(deviceInfo.kind);
          if (isRequired) {
            this._availableDevices.push(deviceInfo);
          }
        });
      })
      .catch((err) => {
        // log error
        // tslint:disable-next-line:no-console
        console.log(`Enumerate devices error ${err.cause}`);
      })
    // CHROME: Media element
  };

  _getMediaConstraints = (isAudio: boolean, isVideo: boolean): MediaStreamConstraints => {
    const constraints: MediaStreamConstraints = {
      audio: isAudio,
      video: isVideo,
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
    if (isVideo &&
      // @ts-ignore
      this._config.video.in.deviceIds.length > 0) {
      constraints.video = {
        // @ts-ignore
        deviceId: this._config.video.in.deviceIds,
      };
    }
    return constraints;
  };
  // initialize input streams
  // Only the configured devices
  _initInputStreams = (): void => {

    const constraints = this._getMediaConstraints(this._isAudioEnabled(), this._isVideoEnabled());
    // attach media elements for each track
    navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
      mediaStream.getTracks().forEach((track) => {
        if (track && track !== undefined) {
          // stop the current stream if any
          track.stop();
          // attach input media streams to configured HTML element
          this._attachMediaStream(mediaStream, track.kind);
          mediaStream.addTrack(track);
        }
      });
    }).catch((err) => {
      // log
      // TODO re-try with audio only
    })
  };
  _attachMediaStream = (mediaStream: MediaStream, trackKind: string): void => {
    let element: HTMLMediaElement | undefined | null = null;
    // attach audio element ?? not required
    if (trackKind === 'audio') {
      element = this._config?.audio.in.element;
    } else if (trackKind === 'video') {
      element = this._config?.video.in.element;
    }
    // @ts-ignore
    if (element && element !== undefined && element.srcObject.id !== mediaStream.id) {
      element.srcObject = mediaStream;
    }
  };

  changeDevice = async (deviceKind: string, deviceId: string): Promise<any> => {
    // TO DO change out & in device
  };

}
