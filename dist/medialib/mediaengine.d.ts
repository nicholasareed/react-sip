import { WebAudioHTMLMediaElement } from "..";
import * as EventEmitter from 'eventemitter3';
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
        in: AudioConfig;
        out: AudioConfig;
    };
    video: {
        in: VideoConfig;
        out: VideoConfig;
        width: number;
        height: number;
    };
    screenShare: {
        cursor: string;
        logicalSurface: boolean;
        screenAudio: false;
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
    rawStream: MediaStream;
    amplStream: MediaStream;
}
export interface OutputStreamContext {
    id: string;
    stream: MediaStream;
    src: MediaStreamAudioSourceNode;
    dest: MediaStreamAudioDestinationNode;
    gainNode: GainNode;
    volume: number;
    amplified: boolean;
    multiplier: number;
}
export declare class MediaEngine {
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
    constructor(config: MediaEngineConfig | null, eventEmitter: EventEmitter);
    availableDevices: (deviceKind: 'audioinput' | 'audiooutput' | 'videoinput') => MediaDevice[];
    fetchAllDevices: () => MediaDevice[];
    reConfigure: (config: MediaEngineConfig) => void;
    openStreams: (reqId: string, audio: boolean, video: boolean) => Promise<MediaStream | null>;
    updateStream: (reqId: string, audio: boolean, video: boolean) => Promise<MediaStream | null>;
    closeStream: (reqId: string) => void;
    closeAll: () => void;
    startOrUpdateOutStreams: (reqId: string, mediaStream: MediaStream | null, track: MediaStreamTrack) => void;
    startScreenCapture: (reqId: string) => Promise<MediaStream | null>;
    stopScreenCapture: (reqId: string, resumeVideo: boolean) => Promise<MediaStream | null>;
    muteAudio: () => void;
    unMuteAudio: () => void;
    playTone: (name: string | any, continuous?: boolean) => any;
    stopTone: (name: string | any) => void;
    changeOutputVolume: (vol: number) => void;
    changeInputVolume: (vol: number) => void;
    changeOutStreamVolume: (reqId: string, value: number) => void;
    changeInStreamVolume: (reqId: string, vol: number) => void;
    getOutputVolume: () => number;
    getInputVolume: () => number;
    changeRingVolume: (vol: number) => void;
    getRingVolume: () => number;
    getOutStreamVolume: (reqId: string) => number;
    getInStreamVolume: (reqId: string) => number;
    hasDeviceExists: (deviceKind: string, deviceId: string | null) => boolean;
    changeAudioInput: (deviceId: string) => void;
    changeAudioOutput: (deviceId: string) => void;
    changeVideoInput: (deviceId: string) => void;
    amplifyAudioOn: (reqId: string, multiplier: number) => void;
    amplifyAudioOff: (reqId: string) => void;
    getConfiguredDevice: (deviceKind: string) => string;
    _changeDeviceConfig: (deviceKind: string, deviceId: string) => void;
    _flushDeviceConfig: (deviceKind: string, deviceId: string) => void;
    _prepareConfig(config: MediaEngineConfig | null): void;
    _enableAudioChannels: (isEnable: boolean) => void;
    _isAudioEnabled: () => boolean;
    _isVideoEnabled: () => boolean;
    _refreshDevices: () => void;
    _initDevices: () => void;
    _getMediaConstraints: (isAudio: boolean, isVideo: boolean) => MediaStreamConstraints;
}
