import * as JsSIP from 'jssip';
import * as EventEmitter from 'eventemitter3';
import { RTCSession } from "jssip/lib/RTCSession";
import { CallStatus, MediaDeviceStatus, MediaSessionStatus, CallDirection, TransferStatus, SdpOfferAnswerStatus } from "..";
import { SipExtraHeaders } from "./sipua";
import { Logger } from "../lib/types";
import { DTMF_TRANSPORT } from "jssip/lib/Constants";
import { MediaEngine } from "../medialib/mediaengine";
export interface SipCallConfig {
    extraHeaders: SipExtraHeaders;
    sessionTimerExpires: number;
}
export interface DtmfOptions {
    duration: number;
    interToneGap: number;
    channelType: DTMF_TRANSPORT | undefined;
}
export interface PayloadInfo {
    num: number;
    codec: string;
    params: string;
}
export interface SdpMediaInfo {
    type: string;
    mode: string;
    payloads: PayloadInfo[];
}
export declare class SipCall {
    _id: string;
    _callStatus: CallStatus;
    _rtcSession: RTCSession | null;
    _callConfig: SipCallConfig;
    _rtcConfig: RTCConfiguration;
    _dtmfOptions: DtmfOptions;
    _additionalInfo: object;
    _request: object;
    _mediaSessionStatus: MediaSessionStatus;
    _mediaDeviceStatus: {
        audio: MediaDeviceStatus;
        video: MediaDeviceStatus;
    };
    _transferStatus: TransferStatus;
    _logger: Logger;
    _debug: boolean;
    _debugNamespaces?: string;
    _inputMediaStream: MediaStream | null;
    _outputMediaStream: MediaStream | null;
    _peerConnection: RTCPeerConnection | null;
    _mediaEngine: MediaEngine;
    _eventEmitter: EventEmitter;
    _endType: 'hangup' | 'failure' | 'none';
    _errorCause: string;
    _isPlaying: boolean;
    _direction: CallDirection;
    _hasLocalVideo: boolean;
    _hasRemoteVideo: boolean;
    _localVideoEl: HTMLMediaElement | null;
    _remoteVideoEl: HTMLMediaElement | null;
    _sdpStatus: SdpOfferAnswerStatus;
    _localMedia: SdpMediaInfo[];
    _remoteMedia: SdpMediaInfo[];
    _modifySdp: boolean;
    _audioCodecs: string[];
    _videoCodecs: string[];
    startTime: string | undefined;
    endTime: string | undefined;
    remoteUri: string;
    remoteName: string;
    remoteUser: string;
    constructor(isIncoming: boolean, remoteName: string, callConfig: SipCallConfig, rtcConfig: RTCConfiguration, dtmfOptions: DtmfOptions, mediaEngine: MediaEngine, eventEmitter: EventEmitter, additionalInfo: object);
    _init: (isIncoming: boolean) => void;
    getId: () => string;
    getAdditionalInfo: () => object;
    getExtraHeaders: () => SipExtraHeaders;
    getSessionTimerExpires: () => number;
    setRTCSession: (rtcSession: RTCSession) => void;
    getRTCSession: () => RTCSession | null;
    isSessionActive: () => boolean;
    getCallStatus: () => CallStatus;
    setCallStatus: (status: CallStatus) => void;
    isEstablished: () => boolean;
    isActive: () => boolean;
    isMediaActive: () => boolean;
    hasLocalVideo: () => boolean;
    hasRemoteVideo: () => boolean;
    getMediaSessionStatus: () => MediaSessionStatus;
    setMediaSessionStatus: (status: MediaSessionStatus) => void;
    getDtmfOptions: () => DtmfOptions;
    getRTCConfig: () => RTCConfiguration;
    getRTCOfferConstraints: () => RTCOfferOptions;
    getInputMediaStream: () => MediaStream | null;
    onNewRTCSession: (rtcSession: RTCSession, request: any) => void;
    setPeerConnection: (conn: RTCPeerConnection | null) => void;
    isDialing: () => boolean;
    isRinging: () => boolean;
    isEstablishing: () => boolean;
    errorReason: () => string;
    isFailed: () => boolean;
    getDisposition: () => string;
    changeOutputVolume: (vol: number) => void;
    getOutputVolume: () => number;
    _setInputMediaStream: (stream: MediaStream | null) => void;
    _configureDebug: () => void;
    _uuid: () => string;
    dial: (ua: JsSIP.UA, target: string, hasAudio: boolean, hasVideo: boolean, localVideoEl?: HTMLMediaElement | null, remoteVideoEl?: HTMLMediaElement | null) => void;
    accept: (hasAudio?: boolean, hasVideo?: boolean, localVideoEl?: HTMLMediaElement | null, remoteVideoEl?: HTMLMediaElement | null) => void;
    reject: (code?: number, reason?: string) => void;
    hangup: () => void;
    sendDTMF: (tones: string) => void;
    sendInfo: (contentType: string, body?: string | undefined) => void;
    hold: () => void;
    unhold: () => void;
    toggleHold: () => void;
    isOnLocalHold: () => boolean;
    isOnRemoteHold: () => boolean;
    offerVideo: (localVideoEl: HTMLMediaElement | null) => void;
    changeInputVolume: (vol: number) => void;
    getInputVolume: () => number;
    renegotiate: () => boolean;
    _mute: (isAudio?: boolean) => void;
    _unmute: (isAudio?: boolean) => void;
    muteAudio: () => void;
    muteVideo: () => void;
    unMuteAudio: () => void;
    unMuteVideo: () => void;
    toggleAudioMute: () => void;
    toggleVideoMute: () => void;
    isAudioOnMute: () => boolean;
    isVideoOnMute: () => boolean;
    blindTransfer: (target: string) => void;
    attendedTransfer: (replaceCall: SipCall) => void;
    parkCall: (dest: string) => void;
    _onReferSuccess: (data: any) => void;
    _onReferfailed: (data: any) => void;
    _onTransferAcceptNotify: (data: any) => void;
    _onTransferFailureNotify: (data: any) => void;
    _handleRemoteTrack: (track: MediaStreamTrack) => void;
    _handleLocalSdp: (sdp: string) => string;
    _handleRemoteOffer: (sdp: string) => void;
    _handleRemoteAnswer: (sdp: string) => void;
    _initSessionEventHandler: () => void;
    _mediaEventHandler: () => void;
}
