import * as JsSIP from 'jssip';
import * as EventEmitter from 'eventemitter3';
import { RTCSession } from "jssip/lib/RTCSession";
import dummyLogger from '../lib/dummyLogger'
import {
  CALL_STATUS_IDLE,
  CALL_STATUS_ACTIVE,
  CALL_STATUS_CONNECTING,
  CALL_STATUS_DIALING,
  CALL_STATUS_PROGRESS,
  CALL_STATUS_RINGING,
  CallStatus,
  MEDIA_DEVICE_STATUS_ACTIVE,
  MEDIA_DEVICE_STATUS_MUTE,
  MEDIA_SESSION_STATUS_IDLE,
  MEDIA_SESSION_STATUS_ACTIVE,
  MEDIA_SESSION_STATUS_INACTIVE,
  MEDIA_SESSION_STATUS_RECVONLY,
  MEDIA_SESSION_STATUS_SENDONLY,
  MediaSessionStatus,
  MediaDeviceStatus
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
  _mediaDeviceStatus: {
    audio: MediaDeviceStatus,
    video: MediaDeviceStatus,
  };
  _logger: Logger;
  _debug: boolean;
  _debugNamespaces?: string;
  // Media Streams
  _inputMediaStream: MediaStream | null;
  _outputMediaStream: MediaStream;
  _peerConnection: RTCPeerConnection | null;
  _mediaEngine: MediaEngine; // Media Engine instance
  _eventEmitter: EventEmitter;
  // call variables
  _startTime: string | undefined;
  _endTime: string | undefined;
  _remoteUri: string;
  _endType: 'hangup' | 'failure' | 'none';
  _errorCause: string;
  _isPlaying: boolean;

  constructor(isDialing: boolean,
              callConfig: SipCallConfig,
              rtcConfig: RTCConfiguration,
              dtmfOptions: DtmfOptions,
              mediaEngine: MediaEngine,
              eventEmitter: EventEmitter) {
    this._rtcSession = null;
    this._callConfig = callConfig;
    this._rtcConfig = rtcConfig;
    this._dtmfOptions = dtmfOptions;
    this._mediaEngine = mediaEngine;
    this._eventEmitter = eventEmitter;
    this._remoteUri = '';
    this._endType = 'none';
    this._errorCause = '';
    this._id = this._uuid();
    this._isPlaying = false;
    this._init(isDialing);
  }

  _init = (isDialing: boolean): void => {
    if (isDialing === true) {
      this.setCallStatus(CALL_STATUS_DIALING);
    } else {
      this.setCallStatus(CALL_STATUS_RINGING);
      this._mediaEngine.playTone('ringing', 1.0);
    }
    this._configureDebug();
    this._mediaSessionStatus = MEDIA_SESSION_STATUS_IDLE;
    this._mediaDeviceStatus = {
      audio: MEDIA_DEVICE_STATUS_ACTIVE,
      video: MEDIA_DEVICE_STATUS_ACTIVE,
    };
    this._outputMediaStream = new MediaStream();
  };

  getId = (): string => {
    return this._id;
  };
  getExtraHeaders = (): SipExtraHeaders => {
    return this._callConfig.extraHeaders;
  };
  getSessionTimerExpires = (): number => {
    return this._callConfig.sessionTimerExpires;
  };
  setRTCSession = (rtcSession: RTCSession): void => {
    this._rtcSession = rtcSession;
  };
  getRTCSession = (): RTCSession | null => {
    return this._rtcSession;
  };
  isSessionActive = (): boolean => {
    return this._rtcSession != null;
  };
  getCallStatus = (): CallStatus => {
    return this._callStatus;
  };
  setCallStatus = (status: CallStatus): void => {
    this._callStatus = status;
  };
  isActive = (): boolean => {
    if (this._callStatus === CALL_STATUS_CONNECTING ||
       this._callStatus === CALL_STATUS_ACTIVE) {
      return true;
    }
    return false;
  };
  isMediaActive = (): boolean => {
    if (this._callStatus === CALL_STATUS_ACTIVE &&
        this._mediaSessionStatus === MEDIA_SESSION_STATUS_ACTIVE) {
      return true;
    }
    return false;
  };
  getMediaSessionStatus = (): MediaSessionStatus => {
    return this._mediaSessionStatus;
  };
  setMediaSessionStatus = (status: MediaSessionStatus): void => {
    this._mediaSessionStatus = status;
  };
  getDtmfOptions = (): DtmfOptions => {
    return this._dtmfOptions;
  };
  getRTCConfig = (): RTCConfiguration => {
    return this._rtcConfig;
  };
  getRTCOfferConstraints = (): RTCOfferOptions => {
    return {
      iceRestart: false,
    }
  };
  setInputMediaStream = (stream: MediaStream | null): void => {
    this._inputMediaStream = stream;
  };
  getInputMediaStream = (): MediaStream | null => {
    return this._inputMediaStream;
  };
  onNewRTCSession = (rtcSession: RTCSession): void => {
    // tslint:disable-next-line:no-console
    console.log('ON NEW RTC Session');
    if (!rtcSession) {
      throw Error(`New Session is not active`);
    }
    this._remoteUri = rtcSession.remote_identity.uri.toAor();
    this.setRTCSession(rtcSession);
    this._initSessionEventHandler();
    this._eventEmitter.emit('call.update', {'call': this});
  };
  setPeerConnection = (conn: RTCPeerConnection | null): void => {
    this._peerConnection = conn;
  };
  isDialing = (): boolean => {
    if ((this._callStatus === CALL_STATUS_DIALING) ||
       (this._callStatus === CALL_STATUS_PROGRESS)) {
      return true;
    }
    return false;
  };
  isRinging = (): boolean => {
    return (this._callStatus === CALL_STATUS_RINGING);
  };
  startTime = (): string | undefined => {
    return this._startTime;
  };
  endTime = (): string | undefined => {
    return this._endTime;
  };
  remoteUri = (): string => {
    return this._remoteUri;
  };
  errorReason = (): string => {
    return this._errorCause;
  };
  isFailed = (): boolean => {
    return this._endType === 'failure';
  };

  _configureDebug = (): void => {
    if (this._debug) {
      JsSIP.debug.enable(this._debugNamespaces || 'JsSIP:*');
      this._logger = console;
    } else {
      JsSIP.debug.disable();
      this._logger = dummyLogger;
    }
  };
  _uuid = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // tslint:disable-next-line:no-bitwise
      const r = Math.random() * 16 | 0;
      // tslint:disable-next-line:no-bitwise
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  // Dial a new call
  dial = (ua: JsSIP.UA,  // SIP UA instance
          target: string, // target uri
          hasAudio: boolean, // has audio
          hasVideo: boolean): void => {

    this._mediaEngine.openStreams(hasAudio, hasVideo).then((stream) => {
      if (!stream) {
        throw Error('Failed to open the input streams');
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
        sessionTimersExpires: this.getSessionTimerExpires(),
      };
      this._remoteUri = target;
      this.setCallStatus(CALL_STATUS_DIALING);
      this._eventEmitter.emit('call.update', {'call': this});
      ua.call(target, opts);
      // set the input stream
      this.setInputMediaStream(stream);
    });
  };

  // ACCEPT incoming call
  accept = (hasAudio: boolean, hasVideo: boolean): void => {
    if (!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    if (this.getCallStatus() !== CALL_STATUS_RINGING) {
      this._logger.error(
        `Calling answer() is not allowed when call status is ${this.getCallStatus()}`,
      );
      return;
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
      this._mediaEngine.stopTone('ringing');
    });
  };
  // REJECT incoming call
  reject = (code: number=486, reason: string='Busy Here'): void => {
    if (!this.isSessionActive()) {
      this._logger.error('RtcSession is not active');
      return;
    }
    if (this.getCallStatus() !== CALL_STATUS_RINGING) {
      this._logger.error(
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
    this._mediaEngine.stopTone('ringing');
  };

  // HANGUP
  hangup = (): void => {
    if (!this.isSessionActive()) {
      throw new Error('RtcSession is not active');
    }

    if (this.getCallStatus() !== CALL_STATUS_DIALING &&
       this.getCallStatus() !== CALL_STATUS_PROGRESS &&
       this.getCallStatus() !== CALL_STATUS_CONNECTING &&
       this.getCallStatus() !== CALL_STATUS_ACTIVE )  {
      this._logger.error(
        `Calling hangup() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const options = {
      extraHeaders: this.getExtraHeaders().nonInvite,
    };

    this.getRTCSession()!.terminate(options);
    // close the input stream
    const inputStream = this.getInputMediaStream();
    if (inputStream) {
      this._mediaEngine.closeStream(inputStream);
      this.setInputMediaStream(null);
    }
  };

  // send DTMF
  sendDTMF = (tones: string ): void => {
    if (!this.isSessionActive()) {
      throw new Error('RtcSession is not active');
    }
    if (this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Calling sendDTMF() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    // DTMF should not be send while on hold
    // Allow for local hold (SEND ONLY) ??
    if (this._mediaSessionStatus === MEDIA_SESSION_STATUS_SENDONLY ||
        this._mediaSessionStatus === MEDIA_SESSION_STATUS_RECVONLY ||
        this._mediaSessionStatus === MEDIA_SESSION_STATUS_INACTIVE) {
      this._logger.error('DTMF is not allowed while call is on hold');
      return;
    }

    const options = {
      duration: this.getDtmfOptions().duration,
      interToneGap: this.getDtmfOptions().interToneGap,
      transportType: this.getDtmfOptions().channelType
    };
    this.getRTCSession()!.sendDTMF(tones, options);
  };

  // Send INFO
  sendInfo = (contentType: string, body?: string): void => {
    if (!this.isSessionActive()) {
      throw new Error("RtcSession is not active");
    }
    // currently INFO is supported only on active call
    if (this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Calling sendInfo() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const options = {
      extraHeaders: this.getExtraHeaders().info,
    };
    this.getRTCSession()!.sendInfo(contentType, body, options);
  };

  hold = (): void => {
    if (!this.isSessionActive()) {
      this._logger.error("RTCSession is not active");
      return;
    }
    if (this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      this._logger.error(
        `Calling hold() is not allowed when call status is ${this.getCallStatus()}`,
      );
      return;
    }
    if (this.getMediaSessionStatus() === MEDIA_SESSION_STATUS_SENDONLY ||
       this.getMediaSessionStatus() === MEDIA_SESSION_STATUS_INACTIVE) {
      this._logger.error(
        `Calling hold() is not allowed when call is already on local hold`,
      );
      return;
    }
    const options = {
      useUpdate: false, // UPDATE based hold is not supported by most vendors
      extraHeaders: this.getExtraHeaders().invite,
    };
    this.getRTCSession()!.hold(options);
  };

  unhold = (): void => {
    if (!this.isSessionActive()) {
      this._logger.error('RTC Session is not valid');
      return;
    }
    if (this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      this._logger.error(`Calling unhold() is not allowed when call status is ${this.getCallStatus()}`);
      return;
    }
    if(this.getMediaSessionStatus() !== MEDIA_SESSION_STATUS_SENDONLY &&
       this.getMediaSessionStatus() !== MEDIA_SESSION_STATUS_INACTIVE) {
      this._logger.error(`Calling unhold() is not allowed when call is not on hold`);
      return;
    }
    const options = {
      useUpdate: false, // UPDATE based hold is not supported by most vendors
      extraHeaders: this.getExtraHeaders().invite,
    };
    this.getRTCSession()!.unhold(options);
  };
  // toggle between hold
  toggleHold = (): void => {
    if (this.isOnLocalHold()) {
      this.unhold();
    } else {
      this.hold();
    }
  };

  isOnLocalHold = (): boolean => {
    if (!this.isSessionActive()) {
      return false;
    }
    if (this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      return false;
    }
    const holdStatus = this.getRTCSession()!.isOnHold();
    if (holdStatus) {
      return holdStatus.local;
    }
    return false;
  };
  isOnRemoteHold = (): boolean => {
    if (!this.isSessionActive()) {
      return false;
    }
    if (this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      return false;
    }
    const holdStatus = this.getRTCSession()!.isOnHold();
    if (holdStatus) {
      return holdStatus.remote;
    }
    return false;
  };

  renegotiate = (): boolean => {
    if (!this.isSessionActive()) {
      throw new Error('RtcSession is not active');
    }
    if (this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      throw new Error(
        `Calling reject() is not allowed when call status is ${this.getCallStatus()}`,
      );
    }
    const options = {
      useUpdate: false,
      extraHeaders: this.getExtraHeaders().invite,
    };
    return this.getRTCSession()!.renegotiate(options);
  };

  _mute = (isAudio: boolean=true): void => {
    if (!this.isSessionActive()) {
      this._logger.error('RTCSession is not active');
      return;
    }
    if (this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      this._logger.error(`Calling mute is not allowed when call status is ${this._callStatus}`);
      return;
    }
    if (isAudio && this._mediaDeviceStatus.audio === MEDIA_DEVICE_STATUS_MUTE) {
      this._logger.warn('Audio device is already in mute state');
      return;
    }
    if (!isAudio && this._mediaDeviceStatus.video === MEDIA_DEVICE_STATUS_MUTE) {
      this._logger.warn('Video device is already in mute state');
      return;
    }
    const options = {
      audio: isAudio,
      video: !isAudio,
    };
    this.getRTCSession()!.mute(options);
  };

  _unmute = (isAudio: boolean=true): void => {
    if (!this.getRTCSession()) {
      this._logger.error('RTCSession is not active');
      return;
    }
    if (this.getCallStatus() !== CALL_STATUS_ACTIVE) {
      this._logger.error(`Calling mute is not allowed when call status is ${this._callStatus}`);
      return;
    }
    if (isAudio && this._mediaDeviceStatus.audio !== MEDIA_DEVICE_STATUS_MUTE) {
      this._logger.warn('Audio device not in mute state');
      return;
    }
    if (!isAudio && this._mediaDeviceStatus.video !== MEDIA_DEVICE_STATUS_MUTE) {
      this._logger.warn('Video device not in mute state');
      return;
    }
    const options = {
      audio: isAudio,
      video: !isAudio,
    };
    this.getRTCSession()!.unmute(options);
  };
  muteAudio = (): void => {
    this._mute(true);
  };
  muteVideo = (): void => {
    this._mute(false);
  };
  unMuteAudio = (): void => {
    this._unmute(true);
  };
  unMuteVideo = (): void => {
    this._unmute(false);
  };
  toggleAudioMute = (): void => {
    if (this._mediaDeviceStatus.audio === MEDIA_DEVICE_STATUS_ACTIVE) {
      this.muteAudio();
    } else {
      this.unMuteAudio();
    }
  };
  toggleVideoMute = (): void => {
    if (this._mediaDeviceStatus.video === MEDIA_DEVICE_STATUS_ACTIVE) {
      this.muteVideo();
    } else {
      this.unMuteVideo();
    }
  };
  isAudioOnMute = (): boolean => {
    return this._mediaDeviceStatus.audio === MEDIA_DEVICE_STATUS_MUTE;
  };
  isVideoOnMute = (): boolean => {
    return this._mediaDeviceStatus.video === MEDIA_DEVICE_STATUS_MUTE;
  }
  attendedTransfer = (): void => {
    if (!this.getRTCSession()) {
      throw new Error('RtcSession is not active');
    }
    // TODO implement transfer logic
  };

  unattendedTransfer = (): void => {
    if (!this.getRTCSession()) {
      throw new Error('RtcSession is not active');
    }
    // TODO implement transfer logic
  };

  _handleRemoteTrack = (track: MediaStreamTrack): void => {
    this._mediaEngine.addTrack(this._outputMediaStream, track);
  };

  _initSessionEventHandler = (): void => {
    const rtcSession = this.getRTCSession();
    if (!this.isSessionActive()) {
      throw Error(`SM Init failed - Session is not ACTIVE`);
    }

    if (rtcSession?.connection) {
      const peerConnection = rtcSession.connection;
      peerConnection.addEventListener('track', (event: RTCTrackEvent) => {
        // tslint:disable-next-line:no-console
        console.log('ON track event');
        this._logger.debug('PeerConnection "ontrack" event received');
        this._handleRemoteTrack(event.track);
      })
    }

    rtcSession!.on('peerconnection', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON peerconnection event');
      // handle peer connection events
      this._logger.debug('RTCSession "peerconnection" event received', data)
      // pass the event to the provider
      this.setPeerConnection(data.peerconnection);
      data.peerconnection.addEventListener('track', (event: RTCTrackEvent) => {
        // tslint:disable-next-line:no-console
        console.log('ON track event');
        this._logger.debug('PeerConnection "ontrack" event received');
        this._handleRemoteTrack(event.track);
      })
      /*
      data.peerconnection.addEventListener('addstream', (event) => {
        // tslint:disable-next-line:no-console
        console.log("add stream event");
        this._logger.debug('PeerConnection "addstream" event received');
        this._mediaEngine.startOutputStream(this._outputMediaStream);
      })
       */
    });


    // CONNECTING EVENT
    rtcSession!.on('connecting', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON connecting event');
      // log it
      this._logger.debug('RTCSession "connecting" event received', data)
    });
    // SENDING
    rtcSession!.on('sending', (data) => {
      // log it
      this._logger.debug('RTCSession "sending" event received', data)
    });
    rtcSession!.on('progress', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON session Progress event');
      this._logger.debug('RTCSession "progress" event received', data)
      if(this.getCallStatus() === CALL_STATUS_DIALING) {
        this.setCallStatus(CALL_STATUS_PROGRESS);
        this._mediaEngine.playTone('ringback', 1.0);
        this._eventEmitter.emit('call.update', {'call': this});
      }
    });
    // 200 OK received/send
    rtcSession!.on('accepted', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON session accepted event');
      this._logger.debug('RTCSession "accepted" event received', data)
      if (rtcSession?.start_time && rtcSession.start_time !== undefined) {
        this._startTime = rtcSession?.start_time.toString();
      }
      this.setCallStatus(CALL_STATUS_CONNECTING);
      this._mediaEngine.stopTone('ringback');
      this._eventEmitter.emit('call.update', {'call': this});
    });
    rtcSession!.on('confirmed', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON session confirmed event');
      this._logger.debug('RTCSession "confirmed" event received', data)
      this.setCallStatus(CALL_STATUS_ACTIVE);
      this.setMediaSessionStatus(MEDIA_SESSION_STATUS_ACTIVE);
      this._eventEmitter.emit('call.update', {'call': this});
    });
    rtcSession!.on('ended', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON session ended event');
      this._logger.debug('RTCSession "ended" event received', data)
      // const originator: string = data.originator;
      // const reason: string = data.cause;
      if(this._inputMediaStream) {
        this._mediaEngine.closeStream(this._inputMediaStream);
        this.setInputMediaStream(null);
      }
      if(this._outputMediaStream) {
        this._mediaEngine.closeStream(this._outputMediaStream);
      }
      if(rtcSession?.end_time && rtcSession.end_time !== undefined) {
        this._endTime = rtcSession?.end_time.toString();
      }
      this._endType = 'hangup';
      this.setCallStatus(CALL_STATUS_IDLE);
      this.setMediaSessionStatus(MEDIA_SESSION_STATUS_IDLE);
      this._eventEmitter.emit('call.ended', {'call': this});
    });
    rtcSession!.on('failed', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON session failed event');
      this._logger.debug('RTCSession "failed" event received', data)
      // const originator: string = data.originator;
      // const reason: string = data.cause;
      if(this._inputMediaStream) {
        this._mediaEngine.closeStream(this._inputMediaStream);
        this.setInputMediaStream(null);
      }
      this._endType = 'failure';
      this._errorCause = `${data.originator}: ${data.cause}`;
      this.setCallStatus(CALL_STATUS_IDLE);
      this.setMediaSessionStatus(MEDIA_SESSION_STATUS_IDLE);
      this._eventEmitter.emit('call.ended', {'call': this});
    });
    rtcSession!.on('newDTMF', (data) => {
      this._logger.debug('RTCSession "newDtmf" event received', data)
    });
    rtcSession!.on('newInfo', (data) => {
      this._logger.debug('RTCSession "newInfo" event received', data)
    });
    rtcSession!.on('hold', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON session hold event');
      const originator = data.originator;
      const mediaSessionStatus  = this.getMediaSessionStatus();

      this._logger.debug('RTCSession "hold" event received', data)
      if (originator === 'remote') {
        if (mediaSessionStatus === MEDIA_SESSION_STATUS_ACTIVE) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_RECVONLY);
        } else if (mediaSessionStatus === MEDIA_SESSION_STATUS_SENDONLY) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_INACTIVE);
        }
      } else {
        if (mediaSessionStatus === MEDIA_SESSION_STATUS_ACTIVE) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_SENDONLY);
        } else if (mediaSessionStatus === MEDIA_SESSION_STATUS_RECVONLY) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_INACTIVE);
        }
      }
      // Notify app - so app can play tones if required
      this._eventEmitter.emit('call.update', {'call': this});
    });
    rtcSession!.on('unhold', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON session unhold event');
      const originator = data.originator;
      const mediaSessionStatus = this.getMediaSessionStatus();

      this._logger.debug('RTCSession "unhold" event received', data)
      if (originator === 'remote') {
        if (mediaSessionStatus === MEDIA_SESSION_STATUS_RECVONLY) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_ACTIVE);
        } else if (mediaSessionStatus === MEDIA_SESSION_STATUS_INACTIVE) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_SENDONLY);
        }
      } else {
        if (mediaSessionStatus === MEDIA_SESSION_STATUS_SENDONLY) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_ACTIVE);
        } else if (mediaSessionStatus === MEDIA_SESSION_STATUS_INACTIVE) {
          this.setMediaSessionStatus(MEDIA_SESSION_STATUS_RECVONLY);
        }
      }
      this._eventEmitter.emit('call.update', {'call': this});
    });
    rtcSession!.on('muted', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON session muted event');
      const { audio, video } = data;
      this._logger.debug('RTCSession "muted" event received', data)
      if(audio) {
        this._mediaDeviceStatus.audio = MEDIA_DEVICE_STATUS_MUTE;
      }
      if(video) {
        this._mediaDeviceStatus.video = MEDIA_DEVICE_STATUS_MUTE;
      }
      this._eventEmitter.emit('call.update', {'call': this});
    });
    rtcSession!.on('unmuted', (data) => {
      // tslint:disable-next-line:no-console
      console.log('ON session unmuted event');
      const { audio, video } = data;
      this._logger.debug('RTCSession "unmuted" event received', data)
      if(audio) {
        this._mediaDeviceStatus.audio = MEDIA_DEVICE_STATUS_ACTIVE;
      }
      if(video) {
        this._mediaDeviceStatus.video = MEDIA_DEVICE_STATUS_ACTIVE;
      }
      this._eventEmitter.emit('call.update', {'call': this});
    });
    rtcSession!.on('reinvite', (data) => {
      this._logger.debug('RTCSession "re-invite" event received', data)
      // tslint:disable-next-line:no-console
      console.log("ON session re-invite event");
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
  };
}
