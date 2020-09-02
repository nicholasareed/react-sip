import * as PropTypes from 'prop-types';
import * as React from 'react';
import {
  InvitationAcceptOptions,
  Inviter,
  InviterOptions,
  RegistererUnregisterOptions,
} from 'sip.js';
import dummyLogger from '../../lib/logger';
import {
  CALL_DIRECTION_INCOMING,
  CALL_DIRECTION_OUTGOING,
  CALL_STATUS_ACTIVE,
  CALL_STATUS_IDLE,
  CALL_STATUS_STARTING,
  CALL_STATUS_STOPPING,
  CallDirection,
  CallStatus,
  SIP_ERROR_TYPE_CONFIGURATION,
  SIP_ERROR_TYPE_CONNECTION,
  SIP_ERROR_TYPE_REGISTRATION,
  SIP_STATUS_CONNECTED,
  SIP_STATUS_CONNECTING,
  SIP_STATUS_DISCONNECTED,
  SIP_STATUS_ERROR,
  SIP_STATUS_REGISTERED,
  SipErrorType,
  SipStatus,
} from '../../lib/enums';
import { SipUser, SipUserDelegate } from '../../lib/sip-user';
import {
  callPropType,
  ExtraHeaders,
  extraHeadersPropType,
  Logger,
  sipPropType,
  WebAudioHTMLMediaElement,
} from '../../lib/types';

export interface JsSipConfig {
  host: string;
  port: number;
  pathname: string;
  secure: boolean;
  user: string;
  password: string;
  autoRegister: boolean;
  autoAnswer: boolean;
  extraHeaders: ExtraHeaders;
  iceServers: RTCIceServer[];
  debug: boolean;
  inputAudioDeviceId: string;
  outputAudioDeviceId: string;
  debugNamespaces?: string | null;
}

export interface JsSipState {
  sipStatus: SipStatus;
  sipErrorType: SipErrorType | null;
  sipErrorMessage: string | null;
  callStatus: CallStatus;
  callDirection: CallDirection | null;
  callCounterpart: string | null;
  dtmfSender: RTCDTMFSender | null;
  callIsOnHold: boolean;
  callMicrophoneIsMuted: boolean;
}

export default class SipProvider extends React.Component<JsSipConfig, JsSipState> {
  static childContextTypes = {
    sip: sipPropType,
    call: callPropType,
    registerSip: PropTypes.func,
    unregisterSip: PropTypes.func,

    answerCall: PropTypes.func,
    startCall: PropTypes.func,
    stopCall: PropTypes.func,
    sendDTMF: PropTypes.func,
    audioSinkId: PropTypes.string,
    setAudioSinkId: PropTypes.func,
  };

  static propTypes = {
    host: PropTypes.string,
    port: PropTypes.number,
    pathname: PropTypes.string,
    secure: PropTypes.bool,
    user: PropTypes.string,
    password: PropTypes.string,
    autoRegister: PropTypes.bool,
    autoAnswer: PropTypes.bool,
    iceRestart: PropTypes.bool,
    extraHeaders: extraHeadersPropType,
    debug: PropTypes.bool,
    inputAudioDeviceId: PropTypes.string,
    outputAudioDeviceId: PropTypes.string,

    children: PropTypes.node,
  };

  static defaultProps = {
    host: null,
    port: null,
    pathname: '',
    secure: true,
    user: null,
    password: null,
    autoRegister: true,
    autoAnswer: false,
    extraHeaders: { register: [], invite: [], hold: [] },
    iceServers: [],
    debug: false,
    inputAudioDeviceId: '',
    outputAudioDeviceId: '',

    children: null,
  };
  private ua: SipUser | null = null;
  private remoteAudio: WebAudioHTMLMediaElement | null = null;
  private logger: Logger;

  constructor(props) {
    super(props);

    this.state = {
      sipStatus: SIP_STATUS_DISCONNECTED,
      sipErrorType: null,
      sipErrorMessage: null,

      callStatus: CALL_STATUS_IDLE,
      callDirection: null,
      callCounterpart: null,
      dtmfSender: null,
      callIsOnHold: false,
      callMicrophoneIsMuted: false,
    };

    this.ua = null;
  }

  getChildContext() {
    return {
      sip: {
        ...this.props,
        status: this.state.sipStatus,
        errorType: this.state.sipErrorType,
        errorMessage: this.state.sipErrorMessage,
      },
      call: {
        id: 'UNKNOWN',
        status: this.state.callStatus,
        direction: this.state.callDirection,
        counterpart: this.state.callCounterpart,
        dtmfSender: this.state.dtmfSender,
        isOnHold: this.state.callIsOnHold,
        hold: this.hold,
        unhold: this.unhold(),
        toggleHold: this.toggleHold,
        microphoneIsMuted: this.state.callMicrophoneIsMuted,
        muteMicrophone: this.mute,
        unmuteMicrophone: this.unmute,
        toggleMuteMicrophone: this.toggleMuteMicrophone,
      },
      registerSip: this.registerSip,
      unregisterSip: this.unregisterSip,
      audioSinkId: this.audioSinkId,
      setAudioSinkId: this.setAudioSinkId,
      answerCall: this.answer,
      startCall: this.call,
      stopCall: this.hangup,
      sendDTMF: this.sendDTMF,
    };
  }

  getUA(): SipUser | null {
    return this.ua;
  }

  getUAOrFail(): SipUser {
    const ua = this.getUA();

    if (!ua) {
      throw new Error('UserAgent not initialized');
    }

    return ua;
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.remoteAudio;
  }

  componentDidMount(): void {
    if (window.document.getElementById('sip-provider-audio')) {
      throw new Error(
        `Creating two SipProviders in one application is forbidden. If that's not the case ` +
        `then check if you're using "sip-provider-audio" as id attribute for any existing ` +
        `element`,
      );
    }

    this.remoteAudio = this.createRemoteAudioElement();
    window.document.body.appendChild(this.remoteAudio);

    this.reconfigureDebug();
    this.reinitialize();
  }

  componentDidUpdate(prevProps): void {
    if (this.props.debug !== prevProps.debug) {
      this.reconfigureDebug();
    }
    if (
      this.props.host !== prevProps.host ||
      this.props.port !== prevProps.port ||
      this.props.pathname !== prevProps.pathname ||
      this.props.secure !== prevProps.secure ||
      this.props.user !== prevProps.user ||
      this.props.password !== prevProps.password ||
      this.props.inputAudioDeviceId !== prevProps.inboundAudioDeviceId ||
      this.props.outputAudioDeviceId !== prevProps.outboundAudioDeviceId
    ) {
      this.reinitialize();
    }
  }

  componentWillUnmount(): void {
    this.deleteRemoteAudio();
    if (this.ua) {
      this.ua.disconnect().then(() => this.ua = null);
    }
  }

  async reinitialize(): Promise<void> {
    this.ua = await this.initUA();

    await this.ua.connect();
    await this.ua.register();
  }

  private async initUA(): Promise<SipUser> {
    if (this.ua) {
      await this.ua.unregister();
      this.ua = null;
    }

    const {
      host,
      port,
      pathname,
      secure,
      user,
      password,
      inputAudioDeviceId,
      outputAudioDeviceId,
    } = this.props;

    if (!host || !port || !user) {
      this.setState({
        sipStatus: SIP_STATUS_DISCONNECTED,
        sipErrorType: null,
        sipErrorMessage: null,
      });
      throw new Error('missing either host, port or user');
    }

    this.logger.debug({ host, port, pathname, secure, user, inputAudioDeviceId, outputAudioDeviceId });

    try {
      if (outputAudioDeviceId) {
        this.remoteAudio = this.createRemoteAudioElement();
        this.logger.debug(`Audio.Inbound: Setting sinkId to ${outputAudioDeviceId}`);
        await this.remoteAudio.setSinkId(outputAudioDeviceId);
      }
    } catch (e) {
      this.logger.error('AUDIO.INCOMING: Could not set sinkId', e);
      this.setState({
        sipStatus: SIP_STATUS_ERROR,
        sipErrorType: SIP_ERROR_TYPE_CONFIGURATION,
        sipErrorMessage: e.message,
      });
      throw e;
    }

    const ua = new SipUser(`${secure ? 'wss' : 'ws'}://${host}:${port}${pathname}`, {
      aor: `sip:${user}@${host}`,
      userAgentOptions: {
        authorizationUsername: user,
        authorizationPassword: password,
        logConnector: (level, category, label, content) => {
          let msg = `[sip][${category}]`;
          if (label) {
            msg += `(${label})`;
          }

          msg += `: ${content}`;

          this.logger[level](msg);
        },
      },
      media: {
        constraints: {
          audio: true,
          video: false,
        },
        remote: {
          audio: this.getRemoteAudioOrFail(),
        },
      },
    });

    ua.delegate = this.getDelegate(ua);

    return ua;
  }

  private getDelegate(ua: SipUser): SipUserDelegate {
   return {
      onCallOutgoing(inviter: Inviter) {
        const foundUri = inviter.localIdentity.toString();
        const delimiterPosition = foundUri.indexOf(';') || null;
        this.setState({
          callDirection: CALL_DIRECTION_OUTGOING,
          callStatus: CALL_STATUS_STARTING,
          callCounterpart: delimiterPosition ? foundUri.substring(0, delimiterPosition) || foundUri : foundUri,
          callIsOnHold: ua.isHeld(),
          callMicrophoneIsMuted: ua.isMuted() || false,
        });
      },
      onCallReceived(request) {
        if (ua.session) {
          ua.decline();
        } else {
          ua.answer()
            .then(() => {
              const foundUri = request.from.toString();
              const delimiterPosition = foundUri.indexOf(';') || null;
              this.setState({
                callDirection: CALL_DIRECTION_INCOMING,
                callStatus: CALL_STATUS_STARTING,
                callCounterpart: delimiterPosition ? foundUri.substring(0, delimiterPosition) || foundUri : foundUri,
                callIsOnHold: ua.isHeld(),
                callMicrophoneIsMuted: ua.isMuted() || false,
              });
            });
        }
      },
     onCallAnswered() {
       this.setState({ callStatus: CALL_STATUS_ACTIVE });
     },
     onCallHangup() {
        this.setState({
          callStatus: CALL_STATUS_IDLE,
          callDirection: null,
          callCounterpart: null,
          callIsOnHold: false,
          dtmfSender: null,
          callMicrophoneIsMuted: false,
        });
      },
     onServerConnect() {
        this.setState({
          sipStatus: SIP_STATUS_CONNECTED,
          sipErrorType: null,
          sipErrorMessage: null,
        });
      },
      onServerDisconnect(error?: Error) {
        if (!error) {
          this.setState({
            sipStatus: SIP_STATUS_ERROR,
            sipErrorType: SIP_ERROR_TYPE_CONNECTION,
            sipErrorMessage: 'disconnected',
          });
        } else {
          this.setState({
            sipStatus: SIP_STATUS_ERROR,
            sipErrorType: SIP_ERROR_TYPE_CONNECTION,
            sipErrorMessage: `${error.name} | ${error.message}`,
          });
          // tslint:disable-next-line:no-console
          console.error(error);
        }
      },
      onRegistering() {
        this.setState({
          sipStatus: SIP_STATUS_CONNECTING,
          callStatus: CALL_STATUS_IDLE,
        });
      },
      onRegistered() {
        this.setState({
          sipStatus: SIP_STATUS_REGISTERED,
          callStatus: CALL_STATUS_IDLE,
        });
      },
     onRegisterFailed(error?: any) {
       this.setState({
         sipStatus: SIP_STATUS_ERROR,
         sipErrorType: SIP_ERROR_TYPE_REGISTRATION,
         sipErrorMessage: error || undefined,
       });
     },
     onUnregistered() {
        if (ua.isConnected()) {
          this.setState({
            sipStatus: SIP_STATUS_CONNECTED,
            callStatus: CALL_STATUS_IDLE,
            callDirection: null,
          });
        } else {
          this.setState({
            sipStatus: SIP_STATUS_DISCONNECTED,
            callStatus: CALL_STATUS_IDLE,
            callDirection: null,
          });
        }
      },
    };
  }


  registerSip(): Promise<void> {
    if (!this.ua) {
      throw new Error('Calling registerSip is not allowed when UserAgent isn\'t initialized');
    }
    if (this.state.sipStatus !== SIP_STATUS_CONNECTED) {
      throw new Error(
        `Calling registerSip is not allowed when sip status is ${this.state.sipStatus} (expected ${SIP_STATUS_CONNECTED})`,
      );
    }

    return this.ua.register();
  }

  unregisterSip(options?: RegistererUnregisterOptions): Promise<void> {
    if (!this.ua) {
      throw new Error('Calling unregisterSip is not allowed when UserAgent isn\'t initialized');
    }
    if (this.state.sipStatus !== SIP_STATUS_REGISTERED) {
      throw new Error(
        `Calling unregisterSip is not allowed when sip status is ${this.state.sipStatus} (expected ${SIP_STATUS_CONNECTED})`,
      );
    }

    return this.ua.unregister(options);
  }

  answer = (options?: InvitationAcceptOptions): Promise<void> => {
    const opts: InvitationAcceptOptions = {
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: false,
        },
      },
    };

    Object.assign(opts, options);

    if (this.state.callStatus !== CALL_STATUS_STARTING || this.state.callDirection !== CALL_DIRECTION_INCOMING) {
      throw new Error(
        `Calling answerCall() is not allowed when call status is ${this.state.callStatus} and call direction is ${this.state.callDirection}  (expected ${CALL_STATUS_STARTING} and ${CALL_DIRECTION_INCOMING})`,
      );
    }

    return this.getUAOrFail().answer(opts);
  };

  decline = (): Promise<void> => {
    return this.getUAOrFail().decline();
  };

  call = (destination: string | number, anonymous?: boolean): Promise<void> => {
    if (!destination) {
      throw new Error(`Destination must be defined (${destination} given)`);
    }
    if (!this.ua) {
      throw new Error('Calling startCall is not allowed when UserAgent isn\'t initialized');
    }
    if (this.state.sipStatus !== SIP_STATUS_CONNECTED && this.state.sipStatus !== SIP_STATUS_REGISTERED) {
      throw new Error(
        `Calling startCall() is not allowed when sip status is ${this.state.sipStatus} (expected ${SIP_STATUS_CONNECTED} or ${SIP_STATUS_REGISTERED})`,
      );
    }

    if (this.state.callStatus !== CALL_STATUS_IDLE) {
      throw new Error(
        `Calling startCall() is not allowed when call status is ${this.state.callStatus} (expected ${CALL_STATUS_IDLE})`,
      );
    }

    if (!anonymous) {
      anonymous = false;
    }

    const extraHeaders = this.props.extraHeaders.invite;

    const options: InviterOptions = {
      extraHeaders,
      anonymous,
    };

    this.setState({ callStatus: CALL_STATUS_STARTING });

    return this.ua.call(String(destination), options);
  };

  hangup = (): Promise<void> => {
    if (!this.ua) {
      throw new Error('Calling stopCall is not allowed when UserAgent isn\'t initialized');
    }
    this.setState({ callStatus: CALL_STATUS_STOPPING });

    return this.ua.hangup();
  };

  sendDTMF = (tones: string, duration: number = 100, interToneGap: number = 70) => {
    if (this.state.callStatus === 'callStatus/ACTIVE' && this.state.dtmfSender) {
      this.state.dtmfSender.insertDTMF(tones, duration, interToneGap);
    } else {
      this.logger.debug('Warning:', 'You are attempting to send DTMF, but there is no active call.');
    }
  };

  reconfigureDebug(): void {
    const { debug } = this.props;

    if (debug) {
      this.logger = console;
    } else {
      this.logger = dummyLogger;
    }
  }

  setAudioSinkId = (sinkId: string): Promise<undefined> => {
    return this.getRemoteAudioOrFail().setSinkId(sinkId);
  };

  get audioSinkId(): string {
    return this.remoteAudio?.sinkId || 'undefined';
  }

  render(): React.ReactNode {
    return this.props.children;
  }

  hold = (): Promise<void> => {
    this.setState({ callIsOnHold: true });
    return this.getUAOrFail().hold();
  };

  unhold = (): Promise<void> => {
    this.setState({ callIsOnHold: false });
    return this.getUAOrFail().unhold();
  };

  toggleHold = (): Promise<void> => {
    const ua = this.getUAOrFail();

    if (ua.isHeld()) {
      return ua.unhold();
    }

    return ua.hold();
  };

  mute = () => {
    this.setState({ callMicrophoneIsMuted: true });
    this.getUAOrFail().mute();
  };

  unmute = () => {
    this.setState({ callMicrophoneIsMuted: false });
    this.getUAOrFail().unmute();
  };

  toggleMuteMicrophone = () => this.getUAOrFail().isMuted() ? this.unmute() : this.mute();

  private deleteRemoteAudio(): void {
    let element: WebAudioHTMLMediaElement;

    try {
      element = this.getRemoteAudioOrFail();
    } catch (e) {
      return;
    }

    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }

    this.remoteAudio = null;
  }

  private getRemoteAudioOrFail(): WebAudioHTMLMediaElement {
    if (!this.remoteAudio) {
      throw new Error('remoteAudio is not initiliazed');
    }

    return this.remoteAudio;
  };

  private createRemoteAudioElement(): WebAudioHTMLMediaElement {
    let el = window.document.getElementById('sip-provider-audio');

    if (el) {
      return el as WebAudioHTMLMediaElement;
    }

    el = window.document.createElement('audio');
    el.id = 'sip-provider-audio';
    window.document.body.appendChild(el);

    return el as WebAudioHTMLMediaElement;
  }
}
