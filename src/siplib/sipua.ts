
export interface SipUAConfig {
  sessionTimers: boolean;
  registerExpires: number;
  registrar?: string; // sip server URI eg: sip:registrar.example.com
  host?: string;
  userAgent: string; // Useragent string used in all SIP messages
}

export interface SipExtraHeaders {
  register: string[];
  invite: string[];
  nonInvite: string[];
  info: string[];
  refer: string[];
  resp2xx: string[];
  resp4xx: string[];
}
