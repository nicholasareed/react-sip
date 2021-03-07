export const LINE_STATUS_DISCONNECTED = 'lineStatus/DISCONNECTED';
export const LINE_STATUS_CONNECTING = 'lineStatus/CONNECTING';
export const LINE_STATUS_CONNECTED = 'lineStatus/CONNECTED';
export type LineStatus =
  | 'lineStatus/DISCONNECTED'
  | 'lineStatus/CONNECTING'
  | 'lineStatus/CONNECTED';

export const SIP_STATUS_UNREGISTERED = 'sipStatus/UNREGISTERED';
export const SIP_STATUS_REGISTERED = 'sipStatus/REGISTERED';
export const SIP_STATUS_ERROR = 'sipStatus/ERROR';
export type SipStatus =
  | 'sipStatus/UNREGISTERED'
  | 'sipStatus/REGISTERED'
  | 'sipStatus/ERROR';

export const SIP_ERROR_TYPE_NONE = 'sipErrorType/NONE';
export const SIP_ERROR_TYPE_CONFIGURATION = 'sipErrorType/CONFIGURATION';
export const SIP_ERROR_TYPE_CONNECTION = 'sipErrorType/CONNECTION';
export const SIP_ERROR_TYPE_REGISTRATION = 'sipErrorType/REGISTRATION';
export type SipErrorType = 'sipErrorType/NONE' | 'sipErrorType/CONFIGURATION' | 'sipErrorType/CONNECTION' | 'sipErrorType/REGISTRATION';

export const CALL_STATUS_IDLE = 'callStatus/IDLE';
export const CALL_STATUS_DIALING = 'callStatus/DIALING';
export const CALL_STATUS_PROGRESS = 'callStatus/PROGRESS';
export const CALL_STATUS_RINGING = 'callStatus/RINGING';
export const CALL_STATUS_CONNECTING = 'callStatus/CONNECTING';
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

export const MEDIA_DEVICE_KIND_AUDIO_IN = 'audioinput';
export const MEDIA_DEVICE_KIND_AUDIO_OUT = 'audiooutput';
export const MEDIA_DEVICE_KIND_VIDEO_IN = 'videoinput'
export type MediaDeviceKind =
  | 'audioinput'
  | 'audiooutput'
  | 'videoinput';

export const MEDIA_TONE_RINGING = 'mediaTone/RINGING';
export const MEDIA_TONE_DIALING = 'mediaTone/DIALING';
export type MediaTone =
  | 'mediaTone/RINGING'
  | 'mediaTone/DIALING';

export const TRANSFER_STATUS_NONE = 'transfer/NONE';
export const TRANSFER_STATUS_INITIATED = 'transfer/INITIATED';
export const TRANSFER_STATUS_FAILED = 'transfer/FAILED';
export const TRANSFER_STATUS_REFER_SUCCESS = 'transfer/REFER_SUCCESS';
export const TRANSFER_STATUS_COMPLETE = 'transfer/COMPLETE';
export type TransferStatus =
  | 'transfer/NONE'
  | 'transfer/INITIATED'
  | 'transfer/FAILED'
  | 'transfer/REFER_SUCCESS'
  | 'transfer/COMPLETE';

export const SDP_OFFER_PENDING = 'sdp/OFFER_PENDING';
export const SDP_OFFER_SENT = 'sdp/OFFER_SENT';
export const SDP_OFFER_RECEIVED = 'sdp/OFFER_RECEIVED';
export const SDP_OFFER_ANSWER_COMPLETE = 'sdp/OFFER_ANSWER_COMPLETE';
export type SdpOfferAnswerStatus =
  | 'sdp/OFFER_PENDING'
  | 'sdp/OFFER_SENT'
  | 'sdp/OFFER_RECEIVED'
  | 'sdp/OFFER_ANSWER_COMPLETE';
