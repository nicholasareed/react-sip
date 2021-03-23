import { WebAudioHTMLMediaElement } from "..";
export interface AudioConfig {
    enabled: boolean;
    deviceIds: string[];
    element: WebAudioHTMLMediaElement | null;
}
export interface VideoConfig {
    enabled: boolean;
    deviceIds: string[];
    element: HTMLMediaElement | null;
}
export interface MediaEngineConfig {
    audio: {
        in: AudioConfig;
        out: AudioConfig;
    };
    video: {
        in: VideoConfig;
        out: VideoConfig;
    };
}
export interface MediaDevice {
    deviceId: string;
    label: string;
}
export declare class MediaEngine {
    _config: MediaEngineConfig | null;
    _availableDevices: MediaDeviceInfo[];
    _openedStreams: MediaStream[];
    _inputVolume: number;
    _outputVolume: number;
    _audioContext: AudioContext;
    _gainNode: GainNode;
    _isPlaying: boolean;
    _supportedDeviceTypes: string[];
    constructor(config: MediaEngineConfig | null);
    availableDevices: (deviceKind: 'audioinput' | 'audiooutput' | 'videoinput') => MediaDevice[];
    reConfigure: (config: MediaEngineConfig) => void;
    openStreams: (audio: boolean, video: boolean) => Promise<MediaStream | null>;
    updateStream: (appStream: MediaStream | null, audio: boolean, video: boolean) => Promise<MediaStream | null>;
    closeStream: (mediaStream: MediaStream) => void;
    closeAll: () => void;
    startOrUpdateOutStreams: (mediaStream: MediaStream | null, track: MediaStreamTrack, audioElement: HTMLMediaElement | null, videoElement: HTMLMediaElement | null) => void;
    muteAudio: () => void;
    unMuteAudio: () => void;
    playTone: (name: string, volume?: number) => void;
    stopTone: (name: string) => void;
    changeOutputVolume: (vol: number) => void;
    changeInputVolume: (vol: number) => void;
    getOutputVolume: () => number;
    getInputVolume: () => number;
    hasDeviceExists: (deviceKind: string, deviceId: string | null) => boolean;
    changeDevice: (deviceKind: string, deviceId: string) => Promise<any>;
    _prepareConfig(config: MediaEngineConfig | null): void;
    _startInputStreams: (mediaStream: MediaStream) => MediaStream;
    _enableAudioChannels: (isEnable: boolean) => void;
    _isAudioEnabled: () => boolean;
    _isVideoEnabled: () => boolean;
    _refreshDevices: () => void;
    _initDevices: () => void;
    _getMediaConstraints: (isAudio: boolean, isVideo: boolean) => MediaStreamConstraints;
    _attachMediaStream: (mediaStream: MediaStream, trackKind: string, direction: string) => void;
}
