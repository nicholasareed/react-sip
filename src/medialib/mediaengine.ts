
export interface MediaConfig {
  enabled: boolean,
  deviceIds: string[],
  mediaElement: {
    elementId: string | null,
    element: HTMLMediaElement | null,
  }
}

export interface MediaEngineConfig {
  audio: {
    in: MediaConfig,
    out: MediaConfig,
  },
  video: {
    in: MediaConfig,
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

  constructor(config: MediaEngineConfig | null) {
    this._isCapturing = false;
    this._prepareConfig(config);
    this._initDevices();
    this._initInputStreams();
  }

  availableDevices = (deviceKind: "audioinput" | "audiooutput" | "videoinput"): MediaDevice[] => {
    const result: MediaDevice[] = [];
    this._availableDevices.forEach((device) => {
      if(device.kind === deviceKind) {
        const tmpDevice: MediaDevice = {
          deviceId: device.deviceId,
          label: device.label,
        };
        result.push(tmpDevice);
      }
    });
    return result;
  }

  reConfigure = (config: MediaEngineConfig): void => {
    this._prepareConfig(config);
  }

  // Open
  openStreams = async (audio: boolean, video: boolean): Promise<MediaStream | void> => {
    const opts = this._getMediaConstraints(audio, video);

    // If already capturing
    if(this._isCapturing) {
      return navigator.mediaDevices.getUserMedia(opts).then((mediaStream) => {
        return this._startStreams(mediaStream);
      }).catch((err) => {
        // log the error
        return;
      });
    } else {
      this._isCapturing = true;
      return navigator.mediaDevices.getUserMedia(opts).then((mediaStream) => {
        mediaStream.getTracks().forEach((track) => {
          // if already live
          if(track.readyState === 'live') {
            delete opts[track.kind];
          } else {
            mediaStream.removeTrack(track);
          }
        });

        return navigator.mediaDevices.getUserMedia(opts).then((unattachedStream) => {
          unattachedStream.getTracks().forEach((track) => {
            unattachedStream.addTrack(track);
          })
          return unattachedStream;
        }).then((stream: MediaStream) => {
          this._attachMediaStream(stream, 'video');
          return stream;
        })

      }).then((tobeStarted) => {
        return this._startStreams(tobeStarted);
      })
    }
  }
  closeStream = (mediaStream: MediaStream): void => {
    mediaStream.getTracks().forEach((track) => {
      track.enabled = false;
      track.stop();
    })
  }

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
  }
  muteAudio = (): void => {
    this._enableAudioChannels(false);
  }
  unMuteAudio = (): void => {
    this._enableAudioChannels(true);
  }

  _prepareConfig(config: MediaEngineConfig | null) {
    if(!config) {
      // Default config
      this._config = {
        audio: {
          in: {
            enabled: true,
            deviceIds: [],
            mediaElement: {
              element: null,
              elementId: null,
            },
          },
          out: {
            enabled: true,
            deviceIds: [],
            mediaElement: {
              element: null,
              elementId: null,
            },
          },
        },
        video: {
          in: {
            enabled: true,
            deviceIds: [],
            mediaElement: {
              element: null,
              elementId: null,
            },
          },
        },
      };
    } else {
      this._config = config;
    }
  }

  _startStreams = (mediaStream: MediaStream): MediaStream => {
    const newStream = new MediaStream();
    mediaStream.getTracks().forEach((track) => {
      newStream.addTrack(track.clone());
    })
    this._openedStreams.push(newStream);
    return newStream;
  }

  // NOTE: Only input device is muted.
  _enableAudioChannels = (isEnable: boolean): void => {
    if(!this._isAudioEnabled()) {
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
  }

  // TODO: check the all configured devices exists or not
  _isAudioEnabled = (): boolean => {
    // @ts-ignore
    return this._config.audio.in.enabled;
  }
  _isVideoEnabled = (): boolean => {
    // @ts-ignore
    return this._config.video.in.enabled;
  }

  _initDevices = (): void => {
    const options = {
      audio: true,
      video: true,
    }
    navigator.mediaDevices.getUserMedia(options)
      .then((mediaStream) => {
        navigator.mediaDevices.enumerateDevices()
          .then((devices) => {
            devices.forEach((deviceInfo) => {
              this._availableDevices.push(deviceInfo);
            });
            // dont stop the existing streams while phone init
          })
          .catch((err) => {
            // log error
          })
      })
      .catch((err) => {
        // log error
      })

    // CHROME: Media element
  }

  _getMediaConstraints = (isAudio: boolean, isVideo: boolean): MediaStreamConstraints => {
    const constraints: MediaStreamConstraints = {
      audio: isAudio,
      video: isVideo,
    };
    // if configured use the configured device
    if(isAudio &&
      // @ts-ignore
      this._config.audio.in.deviceIds.length > 0) {
      constraints.audio = {
        // @ts-ignore
        deviceId: this._config.audio.in.deviceIds,
      };
    }
    if(isVideo &&
      // @ts-ignore
      this._config.video.in.deviceIds.length > 0) {
      constraints.video = {
        // @ts-ignore
        deviceId: this._config.video.in.deviceIds,
      };
    }
    return constraints;
  }

  // initialize input streams
  // Only the configured devices
  _initInputStreams = (): void => {
    const constraints = this._getMediaConstraints(this._isAudioEnabled(), this._isVideoEnabled());

    // attach media elements for each track
    navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
      mediaStream.getTracks().forEach((track) => {
        // attach input media streams to HTML element
        this._attachMediaStream(mediaStream, track.kind);
      });
    }).catch((err) => {
      // log
      // TODO re-try with audio only
    })
  }

  _attachMediaStream = (mediaStream: MediaStream, trackKind: string): void => {
    let element: HTMLMediaElement | undefined | null = null;
    // attach audio element ?? not required
    if(trackKind === 'audio') {
      element = this._config?.audio.in.mediaElement.element;
    } else if(trackKind === 'video') {
      element = this._config?.video.in.mediaElement.element;
    }
    // @ts-ignore
    if(element && element !== undefined && element.srcObject.id !== mediaStream.id) {
      element.srcObject = mediaStream;
    }
  }

  changeDevice = async (deviceKind: string, deviceId: string): Promise<any> => {
    // TO DO change out & in device
  }

}
