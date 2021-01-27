import * as JsSIP from 'jssip';
import { RTCSession } from "jssip/lib/RTCSession";
import dummyLogger from '../lib/dummyLogger'
import {
  CALL_STATUS_ACTIVE,
  CALL_STATUS_CONNECTING,
  CALL_STATUS_DIALING, CALL_STATUS_IDLE,
  CALL_STATUS_PROGRESS,
  CALL_STATUS_RINGING,
  CallStatus,
  // MEDIA_DEVICE_STATUS_ACTIVE,
  // MEDIA_DEVICE_STATUS_MUTE,
  MEDIA_SESSION_STATUS_ACTIVE,
  MEDIA_SESSION_STATUS_INACTIVE,
  MEDIA_SESSION_STATUS_RECVONLY,
  MEDIA_SESSION_STATUS_SENDONLY,
  MediaSessionStatus
} from "..";
import { SipExtraHeaders } from "./sipua";

import {Logger} from "../lib/types"
import {DTMF_TRANSPORT} from "jssip/lib/Constants";
import {MediaEngine} from "../medialib/mediaengine";

export interface SipCallConfig {
  extraHeaders: SipExtraHeaders;
  sessionTimerExpires: number;
}

export interface DtmfOptions {
  duration: number;
  interToneGap: number;
  channelType: DTMF_TRANSPORT | undefined;
}

export interface OutputMediaStream {
  mediaStream: MediaStream;
  elements: {
    audio: HTMLAudioElement;
    video: HTMLVideoElement;
  },
}

export class SipCall {
  _id: string;
  _callStatus: CallStatus;
  _rtcSession: RTCSession | null;
  _callConfig: SipCallConfig;
  _rtcConfig: RTCConfiguration;
  _dtmfOptions: DtmfOptions;
  _mediaSessionStatus: MediaSessionStatus;
  _logger: Logger;
  _debug: boolean;
  _debugNamespaces?: string;
  // Media Streams
  _inputMediaStream: MediaStream | null;
  _outputStreams: OutputMediaStream;
  _outputMediaStream: MediaStream | null;
  _peerConnection: RTCPeerConnection | null;
  _mediaEngine: MediaEngine; // Media Engine instance

  constructor(callConfig: SipCallConfig,
              rtcConfig: RTCConfiguration,
              dtmfOptions: DtmfOptions,
              mediaEngine: MediaEngine) {
    this._rtcSession = null;
    this._callConfig = callConfig;
    this._rtcConfig = rtcConfig;
    this._dtmfOptions = dtmfOptions;
    this._mediaEngine = mediaEngine;
    this._id = this._uuid();
    this._init();
  }

  _init = (): void => {
    this.setCallStatus(CALL_STATUS_IDLE);
    this.configureDebug();
    this._outputStreams = {
      mediaStream: new MediaStream(),
      elements: {
        audio: document.createElement('audio'),
        video: document.createElement('video'),
      }
    };
  }

  getId = (): string => {
    return this._id;
  }

  getExtraHeaders = (): SipExtraHeaders => {
    return this._callConfig.extraHeaders;
  }
  getSessionTimerExpires = (): number => {
    return this._callConfig.sessionTimerExpires;
  }
  setRTCSession = (rtcSession: RTCSession): void => {
    this._rtcSession = rtcSession;
  }
  getRTCSession = (): RTCSession | null => {
    return this._rtcSession;
  }
  isSessionActive = (): boolean => {
    return this._rtcSession != null;
  }
  getCallStatus = (): CallStatus => {
    return this._callStatus;
  }
  setCallStatus = (status: CallStatus): void => {
    this._callStatus = status;
  }
  isActive = (): boolean => {
    return (this._callStatus === CALL_STATUS_ACTIVE);
  }
  getMediaSessionStatus = (): MediaSessionStatus => {
    return this._mediaSessionStatus;
  }
  setMediaSessionStatus = (status: MediaSessionStatus): void => {
    this._mediaSessionStatus = status;
  }
  getDtmfOptions = (): DtmfOptions => {
    return this._dtmfOptions;
  }
  getRTCConfig = (): RTCConfiguration => {
    return this._rtcConfig;
  }
  getRTCOfferConstraints = (): RTCOfferOptions => {
    return {
      iceRestart: false,
    }
  }
  setInputMediaStream = (stream: MediaStream | null): void => {
    this._inputMediaStream = stream;
  }
  getInputMediaStream = (): MediaStream | null => {
    return this._inputMediaStream;
  }
  onNewRTCSession = (rtcSession: RTCSession): void => {
    if(!rtcSession) {
      throw Error(`New Session is not active`);
    }
    this.setRTCSession(rtcSession);
    this.initSessionEventHandler();
  }
  setPeerConnection = (conn: RTCPeerConnection | null): void => {
    this._peerConnection = conn;
  }
  isDialing = (): boolean => {
    return (this.getCallStatus() === CALL_STATUS_DIALING);
  }

  configureDebug = (): void => {
    if (this._debug) {
      JsSIP.debug.enable(this._debugNamespaces || 'JsSIP:*');
      this._logger = console;
    } else {
      JsSIP.debug.disable();
      this._logger = dummyLogger;
    }
  }

  _uuid = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // tslint:disable-next-line:no-bitwise
      const r = Math.random() * 16 | 0;
      // tslint:disable-next-line:no-bitwise
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Dial a new call
  dial = (ua: JsSIP.UA,  // SIP UA instance
          target: string, // target uri
          hasAudio: boolean, // has audio
          hasVideo: boolean): void => {

    this._mediaEngine.openStreams(hasAudio, hasVideo).then((stream) => {
      if(!stream) {
        throw Error('Failed to opened input streams');
      }
      const opts = {
        mediaConstraints: {
          audio: hasAudio,
          video: hasVideo,
        },
        mediaStream: stream,
        rtcOfferConstraints: this.getRTCOfferConstraints(),
        pcConfig: this.getRTCConfig(),
        extraHeaders: this.getExtraHeaders().invite,
        sessionTimerExpires: this.getSessionTimerExpires(),
      };
      ua.call(target, opts);
      this.setCallStatus(CALL_STATUS_DIALING);
      // set the input stream
      this.setInputMediaStream(stream);
    });
  }

  // ACCEPT incoming call
  accept = (hasAudio: boolean, hasVideo: boolean): void => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    if(this.getCallStatus() !== CALL_STATUS_RINGING) {
      throw new Error(
        `Calling answer() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    this._mediaEngine.openStreams(hasAudio, hasVideo).then((inputStream) => {
      const options = {
        // if extra headers are required for a provider then enable it using config
        extraHeaders: this.getExtraHeaders().resp2xx,
        mediaConstraints: {
          audio: hasAudio,
          video: hasVideo,
        },
        pcConfig: this.getRTCConfig(),
        inputStream,
        sessionTimerExpires: this.getSessionTimerExpires(),
      };
      // JsSIP answer
      this.getRTCSession()!.answer(options);
      this.setCallStatus(CALL_STATUS_CONNECTING);
      this.setInputMediaStream(inputStream);

    });
  }

  // REJECT incoming call
  reject = (code: number, reason: string): void => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    if(this.getCallStatus() !== CALL_STATUS_RINGING) {
      throw new Error(
        `Calling reject() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    // Terminate options
    const options = {
      extraHeaders: this.getExtraHeaders().resp4xx,
      status_code: code,
      reason_phrase: reason,
    };
    this.getRTCSession()!.terminate(options);
  }

  // HANGUP
  hangup = (): void => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }

    if(this.getCallStatus() !== CALL_STATUS_DIALING &&
       this.getCallStatus() !== CALL_STATUS_PROGRESS &&
       this.getCallStatus() !== CALL_STATUS_CONNECTING &&
       this.getCallStatus() !== CALL_STATUS_ACTIVE )  {
      throw new Error(
        `Calling hangup() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const options = {
      extraHeaders: this.getExtraHeaders().nonInvite,
    };

    this.getRTCSession()!.terminate(options);
    // close the input stream
    const inputStream = this.getInputMediaStream();
    if(inputStream) {
      this._mediaEngine.closeStream(inputStream);
    }
  }

  // send DTMF
  sendDTMF = (tones: string ): void => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    if(this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Calling sendDTMF() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const options = {
      duration: this.getDtmfOptions().duration,
      interToneGap: this.getDtmfOptions().interToneGap,
      transportType: this.getDtmfOptions().channelType
    };
    this.getRTCSession()!.sendDTMF(tones, options);
  }

  // Send INFO
  sendInfo = (contentType: string, body?: string): void => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    // currently INFO is supported only on active call
    if(this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Calling sendInfo() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const options = {
      extraHeaders: this.getExtraHeaders().info,
    };
    this.getRTCSession()!.sendInfo(contentType, body, options);
  }

  hold = (): void => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    if(this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Calling hold() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    if(this.getMediaSessionStatus() === MEDIA_SESSION_STATUS_SENDONLY ||
       this.getMediaSessionStatus() === MEDIA_SESSION_STATUS_INACTIVE) {
      throw new Error(
        `Calling hold() is not allowed when call is already on local hold`,
      );
    }
    const options = {
      useUpdate: false, // UPDATE based hold is not supported by most vendors
      extraHeaders: this.getExtraHeaders().invite,
    };

    this.getRTCSession()!.hold(options);
  }

  unhold = (): void => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    if(this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Calling unhold() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    if(this.getMediaSessionStatus() !== MEDIA_SESSION_STATUS_SENDONLY &&
       this.getMediaSessionStatus() !== MEDIA_SESSION_STATUS_INACTIVE) {
      throw new Error(
        `Calling unhold() is not allowed when call is not on local hold`,
      );
    }
    const options = {
      useUpdate: false, // UPDATE based hold is not supported by most vendors
      extraHeaders: this.getExtraHeaders().invite,
    };
    this.getRTCSession()!.unhold(options);
  }

  renegotiate = (): boolean => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    if(this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Calling reject() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const options = {
      useUpdate: false,
      extraHeaders: this.getExtraHeaders().invite,
    };
    return this.getRTCSession()!.renegotiate(options);
  }

  mute = (): void => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    if(this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Calling reject() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const options = {
      audio: true,
      video: true,
    };
    this.getRTCSession()!.mute(options);
  }

  unmute = (): void => {
    if(!this.getRTCSession()) {
      throw new Error("RtcSession is not active");
    }
    if(this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Calling reject() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const options = {
      audio: true,
      video: true,
    };
    this.getRTCSession()!.unmute(options);
  }

  isOnLocalHold = (): boolean => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    if(this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Checking hold status is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const holdStatus = this.getRTCSession()!.isOnHold();
    if(holdStatus) {
      return holdStatus.local;
    } else {
      return false;
    }
  }

  isOnRemoteHold = (): boolean => {
    if(!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    if(this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Checking hold status is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const holdStatus = this.getRTCSession()!.isOnHold();
    if(holdStatus) {
      return holdStatus.remote;
    }
    return false;
  }

  isOnMute = (): boolean | undefined => {
    if(!this.getRTCSession()) {
      throw new Error("RtcSession is not active");
    }
    const muteStatus = this.getRTCSession()!.isMuted();
    if(muteStatus) {
      return muteStatus.audio;
    }
    return false;
  }

  attendedTransfer = (): void => {
    if(!this.getRTCSession()) {
      throw new Error("RtcSession is not active");
    }
    // TODO implement transfer logic
  }

  unattendedTransfer = (): void => {
    if(!this.getRTCSession()) {
      throw new Error("RtcSession is not active");
    }
    // TODO implement transfer logic
  }

  startOutStreams = (trackKind: string): void => {
    const peerConnection = this._peerConnection;
    const outMediaStream = this._outputStreams.mediaStream;

    peerConnection?.getReceivers().forEach((peer) =>{
      if(peer.track) {
        outMediaStream.addTrack(peer.track);
      }
    });

    const element = this._outputStreams.elements[trackKind];
    if(element && element.srcObject.id !== outMediaStream.id) {
      element.srcObject = outMediaStream;
    }
  }
  initSessionEventHandler = (): void => {
    const rtcSession = this.getRTCSession();
    if(!this.isSessionActive()) {
      throw Error(`SM Init failed - Session is not ACTIVE`);
    }

    rtcSession!.on('peerconnection', (data) => {
      // handle peer connection events
      this._logger.debug('RTCSession "peerconnection" event received', data)
      // pass the event to the provider
      this.setPeerConnection(data.peerconnection);
      data.peerconnection.addEventListener('ontrack', (event: RTCTrackEvent) => {
        this._logger.debug('PeerConnection "ontrack" event received');
        this.startOutStreams(event.track.kind);
      })
    });

    // CONNECTING EVENT
    rtcSession!.on('connecting', (data) => {
      // log it
      this._logger.debug('RTCSession "connecting" event received', data)
    });
    // SENDING
    rtcSession!.on('sending', (data) => {
      // log it
      this._logger.debug('RTCSession "sending" event received', data)
    });
    rtcSession!.on('progress', (data) => {
      this._logger.debug('RTCSession "progress" event received', data)
      this.setCallStatus(CALL_STATUS_PROGRESS);
      // Notify app
      // TODO: pass call id
      // this.props.onCallProgress();
    });
    // 200 OK received/send
    rtcSession!.on('accepted', (data) => {
      this._logger.debug('RTCSession "accepted" event received', data)
      this.setCallStatus(CALL_STATUS_CONNECTING);
      // TODO: pass call id
    });
    rtcSession!.on('confirmed', (data) => {
      this._logger.debug('RTCSession "confirmed" event received', data)
      this.setCallStatus(CALL_STATUS_ACTIVE);
      // Notify app - so app can play tones if required
    });
    rtcSession!.on('ended', (data) => {
      this._logger.debug('RTCSession "ended" event received', data)
      this.setCallStatus(CALL_STATUS_IDLE);
      // const originator: string = data.originator;
      // const reason: string = data.cause;
      if(this._inputMediaStream) {
        this._mediaEngine.closeStream(this._inputMediaStream);
        this.setInputMediaStream(null);
      }
    });
    rtcSession!.on('failed', (data) => {
      this._logger.debug('RTCSession "failed" event received', data)
      this.setCallStatus(CALL_STATUS_IDLE);
      // const originator: string = data.originator;
      // const reason: string = data.cause;
      if(this._inputMediaStream) {
        this._mediaEngine.closeStream(this._inputMediaStream);
        this.setInputMediaStream(null);
      }
    });
    rtcSession!.on('newDTMF', (data) => {
      this._logger.debug('RTCSession "newDtmf" event received', data)
    });
    rtcSession!.on('newInfo', (data) => {
      this._logger.debug('RTCSession "newInfo" event received', data)
    });
    rtcSession!.on('hold', (data) => {
      const originator = data.originator;
      const mediaSessionStatus  = this.getMediaSessionStatus();

      this._logger.debug('RTCSession "hold" event received', data)
      if(originator === 'remote') {
        if(mediaSessionStatus === MEDIA_SESSION_STATUS_ACTIVE) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_RECVONLY);
        } else if(mediaSessionStatus === MEDIA_SESSION_STATUS_SENDONLY) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_INACTIVE);
        }
      } else {
        if(mediaSessionStatus === MEDIA_SESSION_STATUS_ACTIVE) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_SENDONLY);
        } else if(mediaSessionStatus === MEDIA_SESSION_STATUS_RECVONLY) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_INACTIVE);
        }
      }
      // Notify app - so app can play tones if required
    });
    rtcSession!.on('unhold', (data) => {
      const originator = data.originator;
      const mediaSessionStatus = this.getMediaSessionStatus();

      this._logger.debug('RTCSession "unhold" event received', data)
      if(originator === 'remote') {
        if(mediaSessionStatus === MEDIA_SESSION_STATUS_RECVONLY) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_ACTIVE);
        } else if(mediaSessionStatus === MEDIA_SESSION_STATUS_INACTIVE) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_SENDONLY);
        }
      } else {
        if(mediaSessionStatus === MEDIA_SESSION_STATUS_SENDONLY) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_ACTIVE);
        } else if(mediaSessionStatus === MEDIA_SESSION_STATUS_INACTIVE) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_RECVONLY);
        }
      }
    });
    rtcSession!.on('muted', (data) => {
      const { audio, video } = data;
      this._logger.debug('RTCSession "muted" event received', data)
      if(audio) {
        // mediaDeviceStatus.audio = MEDIA_DEVICE_STATUS_MUTE;
      }
      if(video) {
        // mediaDeviceStatus.video = MEDIA_DEVICE_STATUS_MUTE;
      }
    });
    rtcSession!.on('unmuted', (data) => {
      this._logger.debug('RTCSession "unmuted" event received', data)
      if(data.audio) {
        // mediaDeviceStatus.audio = MEDIA_DEVICE_STATUS_ACTIVE;
      }
      if(data.video) {
        // mediaDeviceStatus.video = MEDIA_DEVICE_STATUS_ACTIVE;
      }
    });
    rtcSession!.on('reinvite', (data) => {
      this._logger.debug('RTCSession "re-invite" event received', data)
    });
    rtcSession!.on('update', (data) => {
      this._logger.debug('RTCSession "update" event received', data)
    });
    rtcSession!.on('refer', (data) => {
      this._logger.debug('RTCSession "refer" event received', data)
      // TODO Handle Refer for Transfer
    });
    rtcSession!.on('replaces', (data) => {
      this._logger.debug('RTCSession "replaces" event received', data)
      // TODO Handle Replaces for Transfer
    });
    rtcSession!.on('sdp', (data) => {
      this._logger.debug('RTCSession "sdp" event received', data)
      // TODO Implement SDP modification logic if required
    });
    rtcSession!.on('icecandidate', (data) => {
      this._logger.debug('RTCSession "icecandidate" event received', data)
    });
  }
}
