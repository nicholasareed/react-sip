import { WebAudioHTMLMediaElement } from "..";
export interface MediaConfig {
    enabled: boolean;
    deviceIds: string[];
    element: WebAudioHTMLMediaElement | null;
}
export interface MediaEngineConfig {
    audio: {
        in: MediaConfig;
        out: MediaConfig;
    };
    video: {
        in: MediaConfig;
        out: MediaConfig;
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
    _isCapturing: boolean;
    _supportedDeviceTypes: string[];
    constructor(config: MediaEngineConfig | null);
    availableDevices: (deviceKind: "audioinput" | "audiooutput" | "videoinput") => MediaDevice[];
    reConfigure: (config: MediaEngineConfig) => void;
    openStreams: (audio: boolean, video: boolean) => Promise<MediaStream | null>;
    closeStream: (mediaStream: MediaStream) => void;
    addTrack: (mediaStream: MediaStream, track: MediaStreamTrack) => void;
    startOutputStream: (mediaStream: MediaStream) => void;
    closeAll: () => void;
    muteAudio: () => void;
    unMuteAudio: () => void;
    playTone: (name: string, volume?: number) => void;
    stopTone: (name: string) => void;
    hasDeviceExists: (deviceKind: string, deviceId: string | null) => boolean;
    _prepareConfig(config: MediaEngineConfig | null): void;
    _startStreams: (mediaStream: MediaStream) => MediaStream;
    _enableAudioChannels: (isEnable: boolean) => void;
    _isAudioEnabled: () => boolean;
    _isVideoEnabled: () => boolean;
    _initDevices: () => void;
    _getMediaConstraints: (isAudio: boolean, isVideo: boolean) => MediaStreamConstraints;
    _initInputStreams: () => void;
    _attachMediaStream: (mediaStream: MediaStream, trackKind: string) => void;
    changeDevice: (deviceKind: string, deviceId: string) => Promise<any>;
}
