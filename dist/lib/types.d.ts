import * as PropTypes from 'prop-types';
export interface ExtraHeaders {
    register?: string[];
    invite?: string[];
    hold?: string[];
}
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
export interface Sip {
    status?: string;
    errorType?: string;
    errorMessage?: string;
    host?: string;
    port?: number;
    pathname?: string;
    secure?: boolean;
    user?: string;
    password?: string;
    autoRegister?: boolean;
    autoAnswer: boolean;
    sessionTimersExpires: number;
    extraHeaders: ExtraHeaders;
    iceServers: RTCIceServer[];
    debug: boolean;
    debugNamespaces?: string;
}
export declare const sipPropType: PropTypes.Requireable<PropTypes.InferProps<{
    status: PropTypes.Requireable<string>;
    errorType: PropTypes.Requireable<string>;
    errorMessage: PropTypes.Requireable<string>;
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
export interface Call {
    id: string;
    status: string;
    direction: string;
    counterpart: string;
}
export declare const callPropType: PropTypes.Requireable<PropTypes.InferProps<{
    id: PropTypes.Requireable<string>;
    status: PropTypes.Requireable<string>;
    direction: PropTypes.Requireable<string>;
    counterpart: PropTypes.Requireable<string>;
    isOnHold: PropTypes.Requireable<boolean>;
    hold: PropTypes.Requireable<(...args: any[]) => any>;
    unhold: PropTypes.Requireable<(...args: any[]) => any>;
    toggleHold: PropTypes.Requireable<(...args: any[]) => any>;
    microphoneIsMuted: PropTypes.Requireable<boolean>;
    muteMicrophone: PropTypes.Requireable<(...args: any[]) => any>;
    unmuteMicrophone: PropTypes.Requireable<(...args: any[]) => any>;
    toggleMuteMicrophone: PropTypes.Requireable<(...args: any[]) => any>;
}>>;
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
