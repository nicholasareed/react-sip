import * as PropTypes from 'prop-types';
import * as React from 'react';
import * as JsSIP from 'jssip';
import * as EventEmitter from 'eventemitter3';
import { UnRegisterOptions } from 'jssip/lib/UA';
import { MediaEngine } from '../../medialib/mediaengine';
import dummyLogger from '../../lib/dummyLogger';
import { SipUAConfig, SipExtraHeaders } from '../../siplib/sipua';
import { DtmfOptions, SipCall, SipCallConfig } from '../../siplib/sipcall';
import {
  LINE_STATUS_CONNECTED,
  LINE_STATUS_CONNECTING,
  LINE_STATUS_DISCONNECTED,
  LineStatus,
  SIP_STATUS_ERROR,
  SIP_STATUS_REGISTERED,
  SIP_STATUS_UNREGISTERED,
  SipStatus,
  SIP_ERROR_TYPE_NONE,
  SIP_ERROR_TYPE_CONFIGURATION,
  SIP_ERROR_TYPE_CONNECTION,
  SIP_ERROR_TYPE_REGISTRATION,
  SipErrorType,
  CALL_DIRECTION_OUTGOING,
} from '../../lib/enums';
import {
  extraHeadersPropType,
  iceServersPropType,
  Logger,
  sipPropType,
  CallInfo,
  callInfoListPropType,
  callHistoryPropType,
} from '../../lib/types';
import { DTMF_TRANSPORT } from 'jssip/lib/Constants';

export interface JsSipConfig {
  socket: string;
  // TODO: sockets[]
  user: string;
  uri: string;
  password: string;
  realm: string;
  host: string;
  port: number;
  pathname: string;
  secure: boolean;
  autoRegister: boolean;
  autoAnswer: boolean;
  iceRestart: boolean;
  sessionTimersExpires: number;
  extraHeaders: SipExtraHeaders;
  iceServers: RTCIceServer[];
  maxAllowedCalls: number;
  debug: boolean;
  debugNamespaces?: string | null;
  registrar?: string;
  // TODO: Phone event handlers
}

export interface JsSipState {
  lineStatus: LineStatus;
  sipStatus: SipStatus;
  errorType: SipErrorType;
  errorMessage: string;
  callList: SipCall[];
  callHistory: CallInfo[];
}

export default class SipProvider extends React.Component<JsSipConfig, JsSipState> {
  static childContextTypes = {
    sip: sipPropType,
    calls: callInfoListPropType,
    callHistory: callHistoryPropType,
    // Status
    isLineConnected: PropTypes.func,
    isRegistered: PropTypes.func,
    hasError: PropTypes.func,
    getErrorMessage: PropTypes.func,
    // REGISTER
    registerSip: PropTypes.func,
    unregisterSip: PropTypes.func,
    // CALL
    makeCall: PropTypes.func,
    // media
    playTone: PropTypes.func,
    stopTone: PropTypes.func,
    getMediaDevices: PropTypes.func,
    setSpeakerVolume: PropTypes.func,
    setMicVolume: PropTypes.func,
    getSpeakerVolume: PropTypes.func,
    getMicVolume: PropTypes.func,
    setRingVolume: PropTypes.func,
  };

  static propTypes = {
    socket: PropTypes.string,
    user: PropTypes.string,
    uri: PropTypes.string,
    password: PropTypes.string,
    realm: PropTypes.string,
    // port: PropTypes.number,
    // pathname: PropTypes.string,
    secure: PropTypes.bool,
    autoRegister: PropTypes.bool,
    autoAnswer: PropTypes.bool,
    iceRestart: PropTypes.bool,
    sessionTimersExpires: PropTypes.number,
    extraHeaders: extraHeadersPropType,
    iceServers: iceServersPropType,
    maxAllowedCalls: PropTypes.number,
    debug: PropTypes.bool,
    registrar: PropTypes.string,
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
    iceRestart: false,
    sessionTimersExpires: 120,
    maxAllowedCalls: 4,
    extraHeaders: {
      register: [],
      invite: [],
      nonInvite: [],
      info: [],
      refer: [],
      resp2xx: [],
      resp4xx: [],
    },
    iceServers: [],
    debug: false,
    children: null,
  };
  // TODO: Move UA logic to siplib
  private ua: JsSIP.UA | null = null;
  private eventBus: EventEmitter;
  // local
  private _logger: Logger;
  private _localAddr: string;
  private _mediaEngine: MediaEngine;
  // @ts-ignore
  private _uaConfig: SipUAConfig | null = null;
  private _callConfig: SipCallConfig;
  private _rtcConfig: RTCConfiguration;
  private _dtmfOptions: DtmfOptions;

  constructor(props) {
    super(props);
    // console.log('reactsip: constructor Sipprovider');
    this.state = {
      lineStatus: LINE_STATUS_DISCONNECTED,
      sipStatus: SIP_STATUS_UNREGISTERED,
      errorType: SIP_ERROR_TYPE_NONE,
      errorMessage: '',
      callList: [],
      callHistory: [],
    };
    this.ua = null;
    this.eventBus = new EventEmitter();
  }

  getChildContext() {
    return {
      sip: {
        ...this.props,
        addr: this._localAddr,
        status: this.state.sipStatus,
        errorType: this.state.errorType,
        errorMessage: this.state.errorMessage,
      },
      calls: [...this.state.callList],
      callHistory: [...this.state.callHistory],
      isLineConnected: this.isLineConnected.bind(this),
      isRegistered: this.isRegistered.bind(this),
      hasError: this.hasError.bind(this),
      getErrorMessage: this.getErrorMessage.bind(this),
      registerSip: this.registerSip.bind(this),
      unregisterSip: this.unregisterSip.bind(this),
      // CALL RELATED
      makeCall: this.makeCall.bind(this),
      playTone: this.playTone.bind(this),
      stopTone: this.stopTone.bind(this),
      setSpeakerVolume: this.setSpeakerVolume.bind(this),
      setMicVolume: this.setMicVolume.bind(this),
      getSpeakerVolume: this.getSpeakerVolume.bind(this),
      getMicVolume: this.getMicVolume.bind(this),
      getMediaDevices: this.getMediaDevices.bind(this)
    };
  }

  _initProperties = (): void => {
    this._uaConfig = {
      host: this.props.host,
      sessionTimers: true,
      registerExpires: 600,
      // registrar: this.props.registrar,
      userAgent: 'CioPhone UA v0.1', // Change this to one from props
    };
    // initialize sip call config
    this._callConfig = {
      extraHeaders: this.props.extraHeaders,
      sessionTimerExpires: this.props.sessionTimersExpires,
    };
    // initialize RTC config
    this._rtcConfig = {
      iceServers: this.props.iceServers,
    };
    // initialize DTMF
    this._dtmfOptions = {
      duration: 100,
      interToneGap: 500,
      channelType: DTMF_TRANSPORT.RFC2833, // INFO based ??
    };
    // initialize the media engine
    this._mediaEngine = new MediaEngine(null);
  };
  _getCallConfig = (): SipCallConfig => {
    return this._callConfig;
  };
  _getRTCConfig = (): RTCConfiguration => {
    return this._rtcConfig;
  };
  _getDtmfOptions = (): DtmfOptions => {
    return this._dtmfOptions;
  };
  /**
   * Get the underlying UserAgent from JsSIP
   */
  _getUA = (): JsSIP.UA | null => {
    return this.ua;
  };
  _getUAOrFail = (): JsSIP.UA => {
    const ua = this._getUA();
    if (!ua) {
      throw new Error('JsSIP.UA not initialized');
    }
    return ua;
  };

  componentDidMount(): void {
    if (window.document.getElementById('sip-provider-audio')) {
      throw new Error(
        `Creating two SipProviders in one application is forbidden. If that's not the case ` +
          `then check if you're using "sip-provider-audio" as id attribute for any existing ` +
          `element`,
      );
    }
    this._reconfigureDebug();
    this._initProperties();
    this._reinitializeJsSIP();
    // TODO: reinitialize media device here
  }

  componentDidUpdate(prevProps): void {
    if (this.props.debug !== prevProps.debug) {
      this._reconfigureDebug();
    }
    if (
      this.props.socket !== prevProps.socket ||
      this.props.host !== prevProps.host ||
      this.props.port !== prevProps.port ||
      this.props.pathname !== prevProps.pathname ||
      this.props.secure !== prevProps.secure ||
      this.props.user !== prevProps.user ||
      this.props.realm !== prevProps.realm ||
      this.props.password !== prevProps.password ||
      this.props.autoRegister !== prevProps.autoRegister
    ) {
      // console.log('reactsip: _reinitializeJsSIP'); // we dont seem to hit this ever..
      this._reinitializeJsSIP();
    }
  }

  componentWillUnmount(): void {
    if (this.ua) {
      // hangup all the calls
      this._terminateAll();
      this.ua.stop();
      this.ua = null;
    }
    if (this._mediaEngine) {
      // close all opened streams
      this._mediaEngine.closeAll();
    }
  }
  getActiveCall = (): SipCall | undefined => {
    const { callList } = this.state;
    const activeCall = callList.find((item) => item.isMediaActive() === true);
    return activeCall;
  };
  getLastCall = (): SipCall | undefined => {
    const { callList } = this.state;
    if (callList.length > 0) {
      return callList[callList.length - 1];
    }
  };
  isLineConnected = (): boolean => {
    return this.state.lineStatus === LINE_STATUS_CONNECTED;
  };
  isRegistered = (): boolean => {
    return this.state.sipStatus === SIP_STATUS_REGISTERED;
  };
  hasError = (): boolean => {
    return this.state.errorType !== SIP_ERROR_TYPE_NONE;
  };
  getErrorMessage = (): string => {
    return this.state.errorMessage;
  };

  _isCallAllowed = (): boolean => {
    if (!this._mediaEngine) {
      this._logger.debug('Media device is not ready');
      return false;
    }
    // registration check required ??
    if (!this.isRegistered()) {
      this._logger.error('Sip device is not registered with the network');
      return false;
    }
    // check if max call limit has reached
    if (this.state.callList.length >= this.props.maxAllowedCalls) {
      this._logger.debug('Max allowed call limit has reached');
      return false;
    }
    // check if any calls are in establishing state
    // dont allow new call, if one is still in progress state
    const { callList } = this.state;
    const establishing = callList.find((call) => {
      return call.isEstablishing() === true;
    });
    // Already a call is
    if (establishing && establishing !== undefined) {
      this._logger.debug('Already a call is in establishing state');
      return false;
    }
    // TODO Allow even in dialing state ??
    return true;
  };

  _addToHistory = (call) => {
    const direction = call._direction === CALL_DIRECTION_OUTGOING ? 'outgoing' : 'incoming';
    const callInfo = {
      _id: call.getId(),
      _direction: direction,
      _remoteName: call.remoteName,
      _remoteUser: call.remoteUser,
      _startTime: call.startTime,
      _endTime: call.endTime,
      _endType: call._endType,
      _errorReason: call._errorReason,
    };
    const callHistory: CallInfo[] = [callInfo, ...this.state.callHistory];
    this.setState({ callHistory });
  };

  registerSip(): void {
    if (!this.ua) {
      throw new Error(`Calling registerSip is not allowed when JsSIP.UA isn't initialized`);
    }
    if (this.props.autoRegister) {
      throw new Error('Calling registerSip is not allowed when autoRegister === true');
    }
    if (this.state.lineStatus !== LINE_STATUS_CONNECTED) {
      throw new Error(
        `Calling registerSip is not allowed when line status is ${this.state.lineStatus} (expected ${LINE_STATUS_CONNECTED})`,
      );
    }
    this.ua.register();
  }
  unregisterSip(options?: UnRegisterOptions): void {
    if (!this.ua) {
      throw new Error("Calling unregisterSip is not allowed when JsSIP.UA isn't initialized");
    }
    if (this.state.sipStatus !== SIP_STATUS_REGISTERED) {
      throw new Error(
        `Calling unregisterSip is not allowed when sip status is ${this.state.sipStatus} (expected ${SIP_STATUS_REGISTERED})`,
      );
    }
    this.ua.unregister(options);
  }

  makeCall = (callee: string, isVideoCall: boolean, localVideoEl: HTMLMediaElement, remoteVideoEl: HTMLMediaElement): string => {
    if (!callee) {
      throw new Error(`Destination must be defined (${callee} given)`);
    }
    if (!this.ua) {
      throw new Error("Calling startCall is not allowed when JsSIP.UA isn't initialized");
    }
    if (!this.isLineConnected()) {
      throw new Error(`Phone is not connected to the network, current state - ${this.state.lineStatus}`);
    }
    if (!this._isCallAllowed()) {
      throw new Error(`Max limit reached, new calls are not allowed`);
    }
    // check if any active calls are present or not
    const { callList } = this.state;
    const activeCall = callList.find((item) => item.isMediaActive());
    if (activeCall) {
      // TODO : Auto Hold
      throw new Error(`An active call found, hold the call before making new call`);
    }
    // create sip call configuartion
    const rtcConfig = this._getRTCConfig();
    const dtmfOptions = this._getDtmfOptions();
    // @ts-ignore
    const sipCall = new SipCall(
      false,
      callee,
      this._getCallConfig(),
      rtcConfig,
      dtmfOptions,
      this._mediaEngine,
      this.eventBus,
    );
    const ua = this._getUA();

    // @ts-ignore
    sipCall.dial(ua, callee, true, isVideoCall, localVideoEl, remoteVideoEl);
    callList.push(sipCall);
    this.setState({ callList });

    return sipCall.getId();
  };
  playTone = (tone: string) => {
    this._mediaEngine.playTone(tone);
  };
  stopTone = (tone: string) => {
    this._mediaEngine.stopTone(tone);
  };
  setSpeakerVolume = (vol: number) => {
    this._mediaEngine.changeOutputVolume(vol);
  };
  setMicVolume = (vol: number) => {
    this._mediaEngine.changeInputVolume(vol);
  };
  getSpeakerVolume = () => {
    return this._mediaEngine.getOutputVolume();
  };
  getMicVolume = () => {
    return this._mediaEngine.getInputVolume();
  };
  // available devices
  getMediaDevices = (deviceKind: MediaDeviceKind) => {
    return this._mediaEngine.availableDevices(deviceKind);
  };
  // Clear all existing sessions from the UA
  _terminateAll = () => {
    if (!this.ua) {
      throw Error(`UA is not connected`);
    }
    this.ua.terminateSessions();
  };
  _reconfigureDebug(): void {
    const { debug } = this.props;
    if (debug) {
      JsSIP.debug.enable(this.props.debugNamespaces || 'JsSIP:*');
      this._logger = console;
    } else {
      JsSIP.debug.disable();
      this._logger = dummyLogger;
    }
  }

  async _reinitializeJsSIP(): Promise<void> {
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }
    const { socket, user, password, realm, autoRegister } = this.props;
    this._localAddr = `${user}@${realm}`;

    if (!user) {
      this.setState({
        sipStatus: SIP_STATUS_UNREGISTERED,
        errorType: SIP_ERROR_TYPE_CONFIGURATION,
        errorMessage: 'user parameter is missing in config',
      });
      return;
    }
    try {
      const socketJsSip = new JsSIP.WebSocketInterface(socket);
      this.ua = new JsSIP.UA({
        // Modify to user@domain
        uri: `${user}@${realm}`,
        authorization_user: user,
        realm,
        password,
        sockets: [socketJsSip],
        register: autoRegister,
        session_timers: this._uaConfig?.sessionTimers,
        // instance_id  - ADD UUID here
        // registrar_server: this._uaConfig?.registrar,
        // register_expires: this._uaConfig?.registerExpires,
        // user_agent: this._uaConfig?.userAgent,
      });
      // @ts-ignore
      window.UA = this.ua;
      // @ts-ignore
      window.UA_SOCKET = socketJsSip;
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.log(error.message);
      this.setState({
        sipStatus: SIP_STATUS_ERROR,
        errorType: SIP_ERROR_TYPE_CONFIGURATION,
        errorMessage: error.message,
      });
      this._logger.debug(error.message);
      return;
    }

    const { ua, eventBus } = this;
    ua.on('connecting', () => {
      this._logger.debug('UA "connecting" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        lineStatus: LINE_STATUS_CONNECTING,
      });
    });

    ua.on('connected', () => {
      this._logger.debug('UA "connected" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        lineStatus: LINE_STATUS_CONNECTED,
        errorType: SIP_ERROR_TYPE_NONE,
        errorMessage: '',
      });
    });

    ua.on('disconnected', () => {
      this._logger.debug('UA "disconnected" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        lineStatus: LINE_STATUS_DISCONNECTED,
        sipStatus: SIP_STATUS_ERROR,
        errorType: SIP_ERROR_TYPE_CONNECTION,
        errorMessage: 'disconnected',
      });
    });

    ua.on('registered', (data) => {
      this._logger.debug('UA "registered" event', data);
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_REGISTERED,
        errorType: SIP_ERROR_TYPE_NONE,
        errorMessage: '',
      });
    });

    ua.on('unregistered', () => {
      this._logger.debug('UA "unregistered" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_UNREGISTERED,
      });
    });

    ua.on('registrationFailed', (data) => {
      this._logger.debug('UA "registrationFailed" event');
      // tslint:disable-next-line:no-console
      console.log(data.cause);
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_ERROR,
        errorType: SIP_ERROR_TYPE_REGISTRATION,
        errorMessage: data.cause === undefined ? '' : data.cause,
      });
    });

    // ua.on('sipEvent', (data) => {
    //   this.logger.debug('UA "sipEvent" event');
    //   if (this.ua !== ua) {
    //     return;
    //   }
    //   // TODO: fix this so we dont mis sipEvent messages (probably a better way to handle them??)
    //   // console.log('ua sipEvent', data);
    //   this.setState((state) => ({
    //     ...state,
    //     sipEvent: { ...data, _: Date.now() },
    //   }));
    // });

    ua.on('newRTCSession', (data) => {
      const { callList } = this.state;
      // @ts-ignore
      if (!this || this.ua !== ua) {
        return;
      }
      // check the originator
      const { originator, session } = data;
      // INCOMING CALL
      if (originator === 'remote') {
        let remoteName = session.remote_identity.display_name;
        if (remoteName === null || remoteName === '') {
          remoteName = session.remote_identity.uri.user;
        }
        if (!this._isCallAllowed()) {
          const rejectOptions = {
            status_code: 486,
            reason_phrase: 'Busy Here',
          };
          session.terminate(rejectOptions);
          return;
        }

        // @ts-ignore
        const sipCall: SipCall = new SipCall(
          true,
          remoteName,
          this._getCallConfig(),
          this._getRTCConfig(),
          this._getDtmfOptions(),
          this._mediaEngine,
          this.eventBus,
        );
        sipCall.onNewRTCSession(session);
        callList.push(sipCall);
        this.setState({ callList });
      } else {
        // fetch
        const outCall = callList.find((call) => call.isDialing() === true);
        if (outCall !== undefined) {
          outCall.onNewRTCSession(session);
        }
      }
    });

    // CALL UPDATE
    eventBus!.on('call.update', (event) => {
      const { call } = event;
      const { callList } = this.state;
      // tslint:disable-next-line:no-console
      console.log('Event emitter on call.update');
      // tslint:disable-next-line:no-console
      console.log(event.call.getCallStatus());

      const index = callList.findIndex((item) => item.getId() === call.getId());
      if (index !== -1) {
        callList[index] = call;
        this.setState({ callList });
      }
    });
    // CALL ENDED
    eventBus!.on('call.ended', (event) => {
      const { call } = event;
      const { callList } = this.state;
      // tslint:disable-next-line:no-console
      console.log('Event emitter on call.ended');
      const index = callList.findIndex((item) => item.getId() === call.getId());
      if (index !== -1) {
        callList.splice(index, 1);
        this.setState({ callList });
        // add the call to history
        this._addToHistory(call);
      }
      // tslint:disable-next-line:no-console
      console.log(callList);
    });

    const extraHeadersRegister = this.props.extraHeaders.register || [];
    if (extraHeadersRegister.length) {
      ua.registrator().setExtraHeaders(extraHeadersRegister);
    }
    ua.start();
  }

  render(): React.ReactNode {
    return this.props.children;
  }
}
