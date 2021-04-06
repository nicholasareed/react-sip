"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOUND_FILES = exports.SipProvider = void 0;
var SipProvider_1 = require("./components/SipProvider");
exports.SipProvider = SipProvider_1.default;
var SOUND_FILES = require("./sounds.json");
exports.SOUND_FILES = SOUND_FILES;
__exportStar(require("./lib/enums"), exports);
__exportStar(require("./lib/types"), exports);
//# sourceMappingURL=index.js.map