import * as PropTypes from 'prop-types';
import { DTMF_TRANSPORT } from 'jssip/lib/Constants'

export const extraHeadersPropType = PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string));

// https://developer.mozilla.org/en-US/docs/Web/API/RTCIceServer
export type IceServers = {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: string;
  password?: string;
}[];
export const iceServersPropType = PropTypes.arrayOf(PropTypes.object);

/*
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
*/
export const sipPropType = PropTypes.shape({
  status: PropTypes.string,
  errorType: PropTypes.string,
  errorMessage: PropTypes.string,
  addr: PropTypes.string,
  host: PropTypes.string,
  port: PropTypes.number,
  user: PropTypes.string,
  pathname: PropTypes.string,
  secure: PropTypes.bool,
  password: PropTypes.string,
  autoRegister: PropTypes.bool,
  autoAnswer: PropTypes.bool,
  sessionTimersExpires: PropTypes.number,
  extraHeaders: extraHeadersPropType,
  iceServers: iceServersPropType,
  debug: PropTypes.bool,
  debugNamespaces: PropTypes.string,
});

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
export const callHistoryPropType = PropTypes.arrayOf(PropTypes.shape({
  _id: PropTypes.string,
  _direction: PropTypes.string,
  _remoteName: PropTypes.string,
  _remoteUser: PropTypes.string,
  _startTime: PropTypes.string,
  _endTime: PropTypes.string,
  _endMode: PropTypes.string, // 'hangup' | 'failure'
  _errorReason: PropTypes.string,
}));

export const callInfoListPropType = PropTypes.arrayOf(PropTypes.shape({
  _id: PropTypes.string,
  _direction: PropTypes.string,
  _remoteUri: PropTypes.string,
  _status: PropTypes.string,
  _isActive: PropTypes.bool,  // is call Active
  _mediaSessionStatus: PropTypes.string,  // 'active', 'local hold', 'remote hold'
  _startTime: PropTypes.string,
  _endTime: PropTypes.string,
  _endMode: PropTypes.string, // 'hangup' | 'failure'
  _errorReason: PropTypes.string,
}));

export const mediaDeviceListPropType = PropTypes.arrayOf(PropTypes.shape({
  deviceId: PropTypes.string,
  kind: PropTypes.string,
  label: PropTypes.string
}));

export interface DtmfOptions {
  duration: number,
  interToneGap: number,
  channelType: DTMF_TRANSPORT | undefined,
}

/**
 * Extended version of {HTMLAudioElement} with typings for the Audio Output Devices API
 *
 * @link https://w3c.github.io/mediacapture-output/#htmlmediaelement-extensions
 */
export interface WebAudioHTMLMediaElement extends HTMLAudioElement {
  readonly sinkId: string;

  /**
   * Sets the ID of the audio device to use for output and returns a Promise.
   * This only works when the application is authorized to use the specified device.
   *
   * @link @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
   *
   * @param id
   */
  setSinkId(id: string): Promise<undefined>;
}

export interface Logger {
  debug(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
  info(message?: any, ...optionalParams: any[]): void;
  warn(message?: any, ...optionalParams: any[]): void;
  log(message?: any, ...optionalParams: any[]): void;
}

// application call event handler
export type AppCallEventHandler = (event: string, params: any) => void;
