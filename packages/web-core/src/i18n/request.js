"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestConfig = createRequestConfig;
const server_1 = require("next-intl/server");
const routing_1 = require("./routing");
exports.default = (0, server_1.getRequestConfig)(async ({ requestLocale }) => {
    let locale = await requestLocale;
    if (!locale || !routing_1.defaultRouting.locales.includes(locale)) {
        locale = routing_1.defaultRouting.defaultLocale;
    }
    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});
// Fonction pour créer une config request personnalisée
function createRequestConfig(messagesPath) {
    return (0, server_1.getRequestConfig)(async ({ requestLocale }) => {
        let locale = await requestLocale;
        if (!locale || !routing_1.defaultRouting.locales.includes(locale)) {
            locale = routing_1.defaultRouting.defaultLocale;
        }
        const messagePath = messagesPath || `../../messages/${locale}.json`;
        return {
            locale,
            messages: (await import(messagePath)).default,
        };
    });
}
