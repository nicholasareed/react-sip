"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaDeviceListPropType = exports.callInfoListPropType = exports.callHistoryPropType = exports.sipPropType = exports.iceServersPropType = exports.extraHeadersPropType = void 0;
var PropTypes = require("prop-types");
exports.extraHeadersPropType = PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string));
exports.iceServersPropType = PropTypes.arrayOf(PropTypes.object);
exports.sipPropType = PropTypes.shape({
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
    extraHeaders: exports.extraHeadersPropType,
    iceServers: exports.iceServersPropType,
    debug: PropTypes.bool,
    debugNamespaces: PropTypes.string,
});
exports.callHistoryPropType = PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string,
    _direction: PropTypes.string,
    _remoteName: PropTypes.string,
    _remoteUser: PropTypes.string,
    _startTime: PropTypes.string,
    _endTime: PropTypes.string,
    _endMode: PropTypes.string,
    _errorReason: PropTypes.string,
}));
exports.callInfoListPropType = PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string,
    _direction: PropTypes.string,
    _remoteUri: PropTypes.string,
    _status: PropTypes.string,
    _isActive: PropTypes.bool,
    _mediaSessionStatus: PropTypes.string,
    _startTime: PropTypes.string,
    _endTime: PropTypes.string,
    _endMode: PropTypes.string,
    _errorReason: PropTypes.string,
}));
exports.mediaDeviceListPropType = PropTypes.arrayOf(PropTypes.shape({
    deviceId: PropTypes.string,
    kind: PropTypes.string,
    label: PropTypes.string
}));
//# sourceMappingURL=types.js.map