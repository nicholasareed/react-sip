export interface SipUAConfig {
    host?: string;
    sessionTimers: boolean;
    registerExpires: number;
    registrar?: string;
    userAgent: string;
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
