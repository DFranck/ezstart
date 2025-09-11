"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntlMiddleware = exports.SimpleWebProviders = exports.WebProviders = void 0;
// Providers
var providers_1 = require("./providers");
Object.defineProperty(exports, "WebProviders", { enumerable: true, get: function () { return providers_1.WebProviders; } });
Object.defineProperty(exports, "SimpleWebProviders", { enumerable: true, get: function () { return providers_1.SimpleWebProviders; } });
// i18n
__exportStar(require("./i18n"), exports);
// Middleware
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "createIntlMiddleware", { enumerable: true, get: function () { return middleware_1.createIntlMiddleware; } });
