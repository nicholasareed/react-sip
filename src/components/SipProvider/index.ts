import * as PropTypes from 'prop-types';
import * as React from 'react';
import * as JsSIP from 'jssip';
import * as EventEmitter from 'eventemitter3';
import { UnRegisterOptions } from 'jssip/lib/UA';
import {MediaEngine} from "../../medialib/mediaengine"
import dummyLogger from '../../lib/dummyLogger';
import { SipUAConfig, SipExtraHeaders } from "../../siplib/sipua";
import {
  DtmfOptions,
  SipCall,
  SipCallConfig,
} from "../../siplib/sipcall";
import {
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
import {
  extraHeadersPropType,
  iceServersPropType,
  Logger,
  sipPropType,
  WebAudioHTMLMediaElement,
  callInfoListPropType,
} from '../../lib/types';
import {DTMF_TRANSPORT} from "jssip/lib/Constants";

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
  registrar?: string,
  // TODO: Phone event handlers
}

export interface JsSipState {
  sipStatus: SipStatus;
  sipErrorType: SipErrorType | null;
  sipErrorMessage: string | null;
  callList: SipCall[];
  callHistory: SipCall[];
}

export default class SipProvider extends React.Component<JsSipConfig, JsSipState> {
  static childContextTypes = {
    sip: sipPropType,
    calls: callInfoListPropType,
    callHistory: callInfoListPropType,
    getCalls: PropTypes.func,
    // Status
    isLineConnected: PropTypes.func,
    isLineReady: PropTypes.func,
    // REGISTER
    registerSip: PropTypes.func,
    unregisterSip: PropTypes.func,
    // CALL
    makeCall: PropTypes.func,
    acceptCall: PropTypes.func,
    rejectCall: PropTypes.func,
    sendDTMF: PropTypes.func,
    hangup: PropTypes.func,
    holdCall: PropTypes.func,
    unHoldCall: PropTypes.func,
    muteCall: PropTypes.func,
    unMuteCall: PropTypes.func,
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
  private remoteAudio: WebAudioHTMLMediaElement | null = null;
  private logger: Logger;
  // private currentSinkId: string | null = null;
  // @ts-ignore
  private isPlaying = false;
  private mediaEngine: MediaEngine | null = null;
  // @ts-ignore
  private uaConfig: SipUAConfig | null = null;
  private callConfig: SipCallConfig | null = null;
  private rtcConfig: RTCConfiguration | null = null;
  private dtmfOptions: DtmfOptions | null = null;
  private eventBus: EventEmitter | null = null;

  constructor(props) {
    super(props);
    // console.log('reactsip: constructor Sipprovider');
    this.state = {
      sipStatus: SIP_STATUS_DISCONNECTED,
      sipErrorType: null,
      sipErrorMessage: null,
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
        status: this.state.sipStatus,
        errorType: this.state.sipErrorType,
        errorMessage: this.state.sipErrorMessage,
      },
      calls: [...this.state.callList],
      callHistory: [...this.state.callHistory],
      getCalls: this.getCalls.bind(this),
      isLineConnected: this.isLineConnected.bind(this),
      isLineReady: this.isLineReady.bind(this),
      registerSip: this.registerSip.bind(this),
      unregisterSip: this.unregisterSip.bind(this),
      // audioSinkId: this.audioSinkId,
      // setAudioSinkId: this.setAudioSinkId,
      // CALL RELATED
      makeCall: this.makeCall.bind(this),
      acceptCall: this.acceptCall.bind(this),
      rejectCall: this.rejectCall.bind(this),
      sendDTMF: this.sendDTMF.bind(this),
      hangup: this.hangup.bind(this),
      holdCall: this.holdCall.bind(this),
      unHoldCall: this.unHoldCall.bind(this),
      muteCall: this.muteCall.bind(this),
      unMuteCall: this.unMuteCall.bind(this),
    };
  }

  initProperties = () : void => {
    this.uaConfig = {
      sessionTimers: true,
      registerExpires: 600,
      // registrar: this.props.registrar,
      userAgent: 'KlipPhone UA v0.1', // Change this to one from props
    };
    // initialize sip call config
    this.callConfig = {
      extraHeaders: this.props.extraHeaders,
      sessionTimerExpires: this.props.sessionTimersExpires,
    };
    // initialize RTC config
    this.rtcConfig = {
      iceServers: this.props.iceServers,
    };
    // initialize DTMF
    this.dtmfOptions = {
      duration: 100,
      interToneGap: 500,
      channelType: DTMF_TRANSPORT.RFC2833,  // INFO based ??
    };
    // initialize the media engine
    this.mediaEngine = new MediaEngine(null);

  }
  getCallConfig = (): SipCallConfig | null => {
    return this.callConfig;
  }
  getRTCConfig = (): RTCConfiguration | null => {
    return this.rtcConfig;
  }
  getDtmfOptions = (): DtmfOptions | null => {
    return this.dtmfOptions;
  }
  /**
   * Get the underlying UserAgent from JsSIP
   */
  getUA(): JsSIP.UA | null {
    return this.ua;
  }

  getUAOrFail(): JsSIP.UA {
    const ua = this.getUA();
    if (!ua) {
      throw new Error('JsSIP.UA not initialized');
    }
    return ua;
  }

  componentDidMount(): void {
    if (window.document.getElementById('sip-provider-audio')) {
      throw new Error(
        `Creating two SipProviders in one application is forbidden. If that's not the case ` +
          `then check if you're using "sip-provider-audio" as id attribute for any existing ` +
          `element`,
      );
    }
    // this.remoteAudio = this.createRemoteAudioElement();
    // window.document.body.appendChild(this.remoteAudio);
    this.reconfigureDebug();
    this.initProperties();
    this.reinitializeJsSIP();
    // TODO: reinitialize media device here
  }

  componentDidUpdate(prevProps): void {
    if (this.props.debug !== prevProps.debug) {
      this.reconfigureDebug();
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
      // console.log('reactsip: reinitializeJsSIP'); // we dont seem to hit this ever..
      this.reinitializeJsSIP();
    }
  }

  componentWillUnmount(): void {
    if (this.ua) {
      // hangup all the calls
      this.terminateAll();
      this.ua.stop();
      this.ua = null;
    }
    if (this.mediaEngine) {
      // close all opened streams
      this.mediaEngine.closeAll();
    }
  }
  getCalls = (): SipCall[] => {
    const { callList } = this.state;
    return [ ...callList ];
  }
  getActiveCall = (): SipCall | undefined => {
    const { callList } = this.state;
    const activeCall = callList.find((item) => item.isMediaActive() === true);
    return activeCall;
  }
  getLastCall = (): SipCall | undefined => {
    const { callList } = this.state;
    if(callList.length > 0) {
      return callList[callList.length - 1];
    }
  }

  isLineConnected = (): boolean => {
    if(this.state.sipStatus === SIP_STATUS_CONNECTED) {
      return true;
    }
    return false;
  }
  isLineReady = (): boolean => {
    if (this.state.sipStatus === SIP_STATUS_REGISTERED) {
      return true;
    }
    return false;
  }

  isDialReady = (): boolean => {
    if(!this.mediaEngine) {
      this.logger.debug("Media device is not ready")
      return false;
    }
    // check if max call limit has reached
    if(this.state.callList.length >= this.props.maxAllowedCalls) {
      this.logger.debug("Max allowed call limit has reached")
      return false;
    }
    // check if any calls are in dialing state
    // dont allow new call, if one is still in progress state
    const { callList } = this.state;
    const dialled  = callList.find((call) => { return call.isDialing() === true });
    // Already a call is
    if(dialled && dialled !== undefined) {
      this.logger.debug("Already a call is in dialled state");
      return false;
    }
    // TODO Allow even in dialing state ??

    return true;
  }

  registerSip(): void {
    if (!this.ua) {
      throw new Error("Calling registerSip is not allowed when JsSIP.UA isn't initialized");
    }
    if (this.props.autoRegister) {
      throw new Error('Calling registerSip is not allowed when autoRegister === true');
    }
    if (this.state.sipStatus !== SIP_STATUS_CONNECTED) {
      throw new Error(
        `Calling registerSip is not allowed when sip status is ${this.state.sipStatus} (expected ${SIP_STATUS_CONNECTED})`,
      );
    }
    this.ua.register();
  }

  unregisterSip(options?: UnRegisterOptions): void {
    if (!this.ua) {
      throw new Error("Calling unregisterSip is not allowed when JsSIP.UA isn't initialized");
    }
    if (this.props.autoRegister) {
      throw new Error('Calling registerSip is not allowed when autoRegister === true');
    }
    if (this.state.sipStatus !== SIP_STATUS_REGISTERED) {
      throw new Error(
        `Calling unregisterSip is not allowed when sip status is ${this.state.sipStatus} (expected ${SIP_STATUS_CONNECTED})`,
      );
    }
    this.ua.unregister(options);
  }

  makeCall = (callee: string, isVideoCall: boolean, anonymous?: boolean): string => {
    if (!callee) {
      throw new Error(`Destination must be defined (${callee} given)`);
    }
    if (!this.ua) {
      throw new Error("Calling startCall is not allowed when JsSIP.UA isn't initialized");
    }
    if(!this.isLineReady()) {
      throw new Error(`Phone connection is not active, current state - ${this.state.sipStatus}`);
    }
    if(!this.isDialReady()) {
      throw new Error(`Max limit reached, new calls are not allowed`);
    }
    if (!anonymous) {
      anonymous = false;
    }
    // check if any active calls are present or not
    const { callList } = this.state;
    callList.forEach((call) => {
      // check if call & media session is active
      if(call.isActive() && !call.isOnLocalHold())  {
        // TODO : Auto Hold
        throw new Error(`An active call found, hold the call before making new call`);
      }
    });

    // create sip call configuartion
    const rtcConfig = this.getRTCConfig();
    const dtmfOptions = this.getDtmfOptions();
    // @ts-ignore
    const sipCall = new SipCall(true, this.getCallConfig(),
              rtcConfig, dtmfOptions, this.mediaEngine, this.eventBus);
    const ua = this.getUA();

    // create Input MediaStream from MediaDevice
    // @ts-ignore
    sipCall.dial(ua, callee, true, true);
    callList.push(sipCall);
    this.setState({callList});

    return sipCall.getId();
  }

  acceptCall = (callId: string, isVideoCall: boolean): void => {
    const {callList} = this.state;
    const incomingCall = callList.find((call) => {
      return call.getId() === callId;
    })
    if (incomingCall && incomingCall !== undefined) {
      incomingCall.accept(true, true);
    }
  }

  rejectCall = (callId: string): void => {
    const { callList } = this.state;
    callList.forEach((call) => {
      if(call.getId() === callId) {
        call.reject(486, "Busy Here")
      }
    })
  }

  hangup = (callId: string) => {
    this.state.callList.forEach((call) => {
      if(call.getId() === callId) {
        call.hangup();
        // remove from call list after event
      }
    });
    // TODO close all the media streams
  };

  sendDTMF = (callId: string, tones: string) => {
    this.state.callList.forEach((call) => {
      if(call.getId() === callId) {
        call.sendDTMF(tones);
        // remove from call list after event
      }
    });
  };

  // Hold Call
  holdCall = (callId: string) => {
    this.state.callList.forEach((call) => {
      if(call.getId() === callId) {
        call.hold();
      }
    });
  }
  // Unhold Call
  unHoldCall = (callId: string) => {
    this.state.callList.forEach((call) => {
      if(call.getId() === callId) {
        call.unhold();
      }
    });
  }
  // RTCSession provides mute on the session
  muteCall = (callId: string) => {
    this.state.callList.forEach((call) => {
      if(call.getId() === callId) {
        call.mute();
        // Media device mute
      }
    });
  }
  unMuteCall = (callId: string) => {
    this.state.callList.forEach((call) => {
      if(call.getId() === callId) {
        call.unmute();
        // Media device mute
      }
    });
  }
  // Clear all existing sessions from the UA
  terminateAll = () => {
    if(!this.ua) {
      throw Error(`UA is not connected`);
    }
    this.ua.terminateSessions();
  }
  reconfigureDebug(): void {
    const { debug } = this.props;
    if (debug) {
      JsSIP.debug.enable(this.props.debugNamespaces || 'JsSIP:*');
      this.logger = console;
    } else {
      JsSIP.debug.disable();
      this.logger = dummyLogger;
    }
  }

  // setAudioSinkId = async (sinkId: string): Promise<void> => {
  //   if (this.currentSinkId && sinkId === this.currentSinkId) {
  //     return;
  //   }

  //   this.currentSinkId = sinkId;

  //   return this.getRemoteAudioOrFail().setSinkId(sinkId);
  // };

  get audioSinkId(): string {
    return this.remoteAudio?.sinkId || 'undefined';
  }

  async reinitializeJsSIP(): Promise<void> {
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }
    const {
      uri,
      socket,
      // realm,
      // host,
      // port,
      // pathname,
      // secure,
      user,
      password,
      autoRegister,
    } = this.props;

    if (!user) {
      this.setState({
        sipStatus: SIP_STATUS_DISCONNECTED,
        sipErrorType: null,
        sipErrorMessage: null,
      });
      return;
    }
    try {
      // const socket = new JsSIP.WebSocketInterface(`${secure ? 'wss' : 'ws'}://${host}:${port}${pathname}`);
      // const socketJsSip = new JsSIP.WebSocketInterface(socket);
      const socketJsSip = new JsSIP.WebSocketInterface(socket);
      this.ua = new JsSIP.UA({
        // NOT CORRECT
        // Modify to user@domain
        uri,
        authorization_user: user,
        // realm,
        password,
        sockets: [socketJsSip],
        register: autoRegister,
        session_timers: this.uaConfig?.sessionTimers,
        // instance_id  - ADD UUID here
        // registrar_server: this.uaConfig?.registrar,
        // register_expires: this.uaConfig?.registerExpires,
        // user_agent: this.uaConfig?.userAgent,
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
        sipErrorType: SIP_ERROR_TYPE_CONFIGURATION,
        sipErrorMessage: error.message,
      });
      this.logger.debug(error.message);
      return;
    }

    const { ua, eventBus } = this;
    ua.on('connecting', () => {
      this.logger.debug('UA "connecting" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_CONNECTING,
        sipErrorType: null,
        sipErrorMessage: null,
      });
    });

    ua.on('connected', () => {
      this.logger.debug('UA "connected" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_CONNECTED,
        sipErrorType: null,
        sipErrorMessage: null,
      });
    });

    ua.on('disconnected', () => {
      this.logger.debug('UA "disconnected" event');
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_ERROR,
        sipErrorType: SIP_ERROR_TYPE_CONNECTION,
        sipErrorMessage: 'disconnected',
      });
    });

    ua.on('registered', (data) => {
      this.logger.debug('UA "registered" event', data);
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_REGISTERED,
      });
    });

    ua.on('unregistered', () => {
      this.logger.debug('UA "unregistered" event');
      if (this.ua !== ua) {
        return;
      }
      if (ua.isConnected()) {
        this.setState({
          sipStatus: SIP_STATUS_CONNECTED,
        });
      } else {
        this.setState({
          sipStatus: SIP_STATUS_DISCONNECTED,
        });
      }
    });

    ua.on('registrationFailed', (data) => {
      this.logger.debug('UA "registrationFailed" event');
      // tslint:disable-next-line:no-console
      console.log(data.response.reason_phrase);
      if (this.ua !== ua) {
        return;
      }
      this.setState({
        sipStatus: SIP_STATUS_ERROR,
        sipErrorType: SIP_ERROR_TYPE_REGISTRATION,
        sipErrorMessage: data.cause || data.response.reason_phrase,
      });
    });

    ua.on('newRTCSession', (data) => {
      const {callList} = this.state;
      // @ts-ignore
      if (!this || this.ua !== ua) {
        return;
      }
      // check the originator
      const {originator, session} = data;
      // INCOMING CALL
      if (originator === 'remote') {
        // @ts-ignore
        const sipCall: SipCall = new SipCall(false,this.getCallConfig(),
                      this.getRTCConfig(), this.getDtmfOptions(), this.mediaEngine, this.eventBus);
        sipCall.onNewRTCSession(session);
        callList.push(sipCall);
        this.setState({callList});

        if (!this.isDialReady()) {
          sipCall.reject(486, "Busy Here");
        }
      } else {
        // fetch
        const outCall = callList.find((call) => call.isDialing() === true);
        if(outCall !== undefined) {
          outCall.onNewRTCSession(session);
        }
      }
    });

    // CALL UPDATE
    eventBus!.on('call.update', (event) => {
      const { call } = event;
      const { callList } = this.state;
      // tslint:disable-next-line:no-console
      console.log("Event emitter on call.update");
      // tslint:disable-next-line:no-console
      console.log(event.call.getCallStatus());

      const index = callList.findIndex((item) => item.getId() === call.getId());
      if(index !== -1) {
        callList[index] = call;
        this.setState({callList});
      }
    });
    // CALL ENDED
    eventBus!.on('call.ended', (event) => {
      const { call } = event;
      const { callList } = this.state;
      // tslint:disable-next-line:no-console
      console.log("Event emitter on call.ended");
      const index = callList.findIndex((item) => item.getId() === call.getId());
      if(index !== -1) {
        callList.splice(index, 1);
        this.setState({callList});
      }
      // add the call to history
      const callHistory = [call, ...this.state.callHistory];
      this.setState({callHistory});
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
