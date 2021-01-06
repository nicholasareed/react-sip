"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callPropType = exports.sipPropType = exports.iceServersPropType = exports.extraHeadersPropType = void 0;
var PropTypes = require("prop-types");
exports.extraHeadersPropType = PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string));
exports.iceServersPropType = PropTypes.arrayOf(PropTypes.object);
exports.sipPropType = PropTypes.shape({
    status: PropTypes.string,
    errorType: PropTypes.string,
    errorMessage: PropTypes.string,
    host: PropTypes.string,
    port: PropTypes.number,
    user: PropTypes.string,
    pathname: PropTypes.string,
    secure: PropTypes.bool,
    password: PropTypes.string,
    autoRegister: PropTypes.bool,
    autoAnswer: PropTypes.bool,
    sessionTimersExpires: PropTypes.number,
    extraHeaders: exports.extraHeadersPropType,
    iceServers: exports.iceServersPropType,
    debug: PropTypes.bool,
    debugNamespaces: PropTypes.string,
});
exports.callPropType = PropTypes.shape({
    id: PropTypes.string,
    status: PropTypes.string,
    direction: PropTypes.string,
    counterpart: PropTypes.string,
    isOnHold: PropTypes.bool,
    hold: PropTypes.func,
    unhold: PropTypes.func,
    toggleHold: PropTypes.func,
    microphoneIsMuted: PropTypes.bool,
    muteMicrophone: PropTypes.func,
    unmuteMicrophone: PropTypes.func,
    toggleMuteMicrophone: PropTypes.func,
});
//# sourceMappingURL=types.js.map