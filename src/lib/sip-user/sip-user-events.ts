import { Session } from 'sip.js';
import { OutgoingRegisterRequest } from 'sip.js/lib/core';

export interface SipUserEvents {
  'network:online': () => void;
  'network:reconnecting': () => void;
  'connecting': () => void;
  'connected': () => void;
  'disconnected': () => void;
  'registered': (data: OutgoingRegisterRequest) => void;
  'unregistered': () => void;
  'registrationFailed': (error: Error) => void;
  'newRTCSession': (originator: 'local' | 'remote' | 'system', session: Session, request) => void;
}
