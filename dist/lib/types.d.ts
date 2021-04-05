import * as PropTypes from 'prop-types';
import { DTMF_TRANSPORT } from 'jssip/lib/Constants';
export declare const extraHeadersPropType: PropTypes.Requireable<{
    [x: string]: (string | null | undefined)[] | null | undefined;
}>;
export declare type IceServers = {
    urls: string | string[];
    username?: string;
    credential?: string;
    credentialType?: string;
    password?: string;
}[];
export declare const iceServersPropType: PropTypes.Requireable<(object | null | undefined)[]>;
export declare const sipPropType: PropTypes.Requireable<PropTypes.InferProps<{
    status: PropTypes.Requireable<string>;
    errorType: PropTypes.Requireable<string>;
    errorMessage: PropTypes.Requireable<string>;
    addr: PropTypes.Requireable<string>;
    host: PropTypes.Requireable<string>;
    port: PropTypes.Requireable<number>;
    user: PropTypes.Requireable<string>;
    pathname: PropTypes.Requireable<string>;
    secure: PropTypes.Requireable<boolean>;
    password: PropTypes.Requireable<string>;
    autoRegister: PropTypes.Requireable<boolean>;
    autoAnswer: PropTypes.Requireable<boolean>;
    sessionTimersExpires: PropTypes.Requireable<number>;
    extraHeaders: PropTypes.Requireable<{
        [x: string]: (string | null | undefined)[] | null | undefined;
    }>;
    iceServers: PropTypes.Requireable<(object | null | undefined)[]>;
    debug: PropTypes.Requireable<boolean>;
    debugNamespaces: PropTypes.Requireable<string>;
}>>;
export interface CallInfo {
    _id: string;
    _direction: string;
    _remoteName: string;
    _remoteUser: string;
    _startTime: string;
    _endTime: string;
    _endType: string;
    _errorReason: string;
}
export declare const callHistoryPropType: PropTypes.Requireable<(PropTypes.InferProps<{
    _id: PropTypes.Requireable<string>;
    _direction: PropTypes.Requireable<string>;
    _remoteName: PropTypes.Requireable<string>;
    _remoteUser: PropTypes.Requireable<string>;
    _startTime: PropTypes.Requireable<string>;
    _endTime: PropTypes.Requireable<string>;
    _endMode: PropTypes.Requireable<string>;
    _errorReason: PropTypes.Requireable<string>;
}> | null | undefined)[]>;
export declare const callInfoListPropType: PropTypes.Requireable<(PropTypes.InferProps<{
    _id: PropTypes.Requireable<string>;
    _direction: PropTypes.Requireable<string>;
    _remoteUri: PropTypes.Requireable<string>;
    _status: PropTypes.Requireable<string>;
    _isActive: PropTypes.Requireable<boolean>;
    _mediaSessionStatus: PropTypes.Requireable<string>;
    _startTime: PropTypes.Requireable<string>;
    _endTime: PropTypes.Requireable<string>;
    _endMode: PropTypes.Requireable<string>;
    _errorReason: PropTypes.Requireable<string>;
}> | null | undefined)[]>;
export declare const mediaDeviceListPropType: PropTypes.Requireable<(PropTypes.InferProps<{
    deviceId: PropTypes.Requireable<string>;
    kind: PropTypes.Requireable<string>;
    label: PropTypes.Requireable<string>;
}> | null | undefined)[]>;
export interface DtmfOptions {
    duration: number;
    interToneGap: number;
    channelType: DTMF_TRANSPORT | undefined;
}
export interface WebAudioHTMLMediaElement extends HTMLAudioElement {
    readonly sinkId: string;
    setSinkId(id: string): Promise<undefined>;
}
export interface Logger {
    debug(message?: any, ...optionalParams: any[]): void;
    error(message?: any, ...optionalParams: any[]): void;
    info(message?: any, ...optionalParams: any[]): void;
    warn(message?: any, ...optionalParams: any[]): void;
    log(message?: any, ...optionalParams: any[]): void;
}
