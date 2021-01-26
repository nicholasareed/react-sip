export const SIP_STATUS_DISCONNECTED = 'sipStatus/DISCONNECTED';
export const SIP_STATUS_CONNECTING = 'sipStatus/CONNECTING';
export const SIP_STATUS_CONNECTED = 'sipStatus/CONNECTED';
export const SIP_STATUS_REGISTERED = 'sipStatus/REGISTERED';
export const SIP_STATUS_ERROR = 'sipStatus/ERROR';
export type SipStatus =
  | 'sipStatus/DISCONNECTED'
  | 'sipStatus/CONNECTING'
  | 'sipStatus/CONNECTED'
  | 'sipStatus/REGISTERED'
  | 'sipStatus/ERROR';

export const SIP_ERROR_TYPE_CONFIGURATION = 'sipErrorType/CONFIGURATION';
export const SIP_ERROR_TYPE_CONNECTION = 'sipErrorType/CONNECTION';
export const SIP_ERROR_TYPE_REGISTRATION = 'sipErrorType/REGISTRATION';
export type SipErrorType = 'sipErrorType/CONFIGURATION' | 'sipErrorType/CONNECTION' | 'sipErrorType/REGISTRATION';

export const CALL_STATUS_IDLE = 'callStatus/IDLE';
export const CALL_STATUS_DIALING = 'callStatus/DIALING';
export const CALL_STATUS_PROGRESS = 'callStatus/PROGRESS';
export const CALL_STATUS_RINGING = 'callStatus/RINGING';
export const CALL_STATUS_CONNECTING = 'callStatus/RINGING';
export const CALL_STATUS_ACTIVE = 'callStatus/ACTIVE';
export const CALL_STATUS_TERMINATING = 'callStatus/TERMINATING';
export type CallStatus =
  | 'callStatus/IDLE'
  | 'callStatus/DIALING'
  | 'callStatus/PROGRESS'
  | 'callStatus/RINGING'
  | 'callStatus/CONNECTING'
  | 'callStatus/ACTIVE'
  | 'callStatus/TERMINATING';

export const CALL_DIRECTION_INCOMING = 'callDirection/INCOMING';
export const CALL_DIRECTION_OUTGOING = 'callDirection/OUTGOING';
export type CallDirection = 'callDirection/INCOMING' | 'callDirection/OUTGOING';

export const MEDIA_SESSION_STATUS_IDLE = 'mediaSessionStatus/IDLE';
export const MEDIA_SESSION_STATUS_SENDONLY = 'mediaSessionStatus/SENDONLY';
export const MEDIA_SESSION_STATUS_RECVONLY = 'mediaSessionStatus/RECVONLY';
export const MEDIA_SESSION_STATUS_INACTIVE = 'mediaSessionStatus/INACTIVE';
export const MEDIA_SESSION_STATUS_ACTIVE = 'mediaSessionStatus/ACTIVE';
export type MediaSessionStatus =
  | 'mediaSessionStatus/IDLE'
  | 'mediaSessionStatus/SENDONLY'
  | 'mediaSessionStatus/RECVONLY'
  | 'mediaSessionStatus/INACTIVE'
  | 'mediaSessionStatus/ACTIVE';

export const MEDIA_DEVICE_STATUS_INACTIVE = 'mediaDeviceStatus/INACTIVE';
export const MEDIA_DEVICE_STATUS_ACTIVE = 'mediaDeviceStatus/ACTIVE';
export const MEDIA_DEVICE_STATUS_MUTE = 'mediaDeviceStatus/MUTE';
export type MediaDeviceStatus =
  | 'mediaDeviceStatus/INACTIVE'
  | 'mediaDeviceStatus/ACTIVE'
  | 'mediaDeviceStatus/MUTE';

export const MEDIA_DEVICE_KIND_AUDIO_IN = 'mediaDeviceKind/AUDIO_IN';
export const MEDIA_DEVICE_KIND_AUDIO_OUT = 'mediaDeviceKind/AUDIO_OUT';
export const MEDIA_DEVICE_KIND_VIDEO_IN = 'mediaDeviceKind/VIDEO_IN'
export type MediaDeviceKind =
  | 'mediaDeviceKind/AUDIO_IN'
  | 'mediaDeviceKind/AUDIO_OUT'
  | 'mediaDeviceKind/VIDEO_IN';


