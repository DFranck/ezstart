'use client';
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebProviders = WebProviders;
exports.SimpleWebProviders = SimpleWebProviders;
const jsx_runtime_1 = require("react/jsx-runtime");
const auth_sdk_1 = require("@ezstart/auth-sdk");
const next_intl_1 = require("next-intl");
const next_themes_1 = require("next-themes");
const React = __importStar(require("react"));
function WebProviders({ children, messages, locale, timeZone, authConfig, }) {
    const authClient = React.useMemo(() => new auth_sdk_1.AuthClient(authConfig), [authConfig]);
    return ((0, jsx_runtime_1.jsx)(next_themes_1.ThemeProvider, { attribute: "class", defaultTheme: "system", enableSystem: true, disableTransitionOnChange: true, enableColorScheme: true, children: (0, jsx_runtime_1.jsx)(auth_sdk_1.AuthProvider, { client: authClient, children: messages && locale && timeZone ? ((0, jsx_runtime_1.jsx)(next_intl_1.NextIntlClientProvider, { messages: messages, locale: locale, timeZone: timeZone, children: children })) : (children) }) }));
}
// Pour les apps sans i18n
function SimpleWebProviders({ children, authConfig, }) {
    return ((0, jsx_runtime_1.jsx)(WebProviders, { authConfig: authConfig, children: children }));
}
