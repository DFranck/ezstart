"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRouting = void 0;
exports.getTimeZoneFromLocale = getTimeZoneFromLocale;
exports.createRouting = createRouting;
const routing_1 = require("next-intl/routing");
exports.defaultRouting = (0, routing_1.defineRouting)({
    locales: ['fr', 'en'],
    defaultLocale: 'en',
    localeDetection: true,
});
function getTimeZoneFromLocale(locale) {
    switch (locale) {
        case 'fr':
            return 'Europe/Paris';
        case 'en':
            return 'America/New_York';
        default:
            return 'UTC';
    }
}
// Fonction pour créer une config i18n personnalisée si besoin
function createRouting(config) {
    return (0, routing_1.defineRouting)({
        locales: config?.locales || exports.defaultRouting.locales,
        defaultLocale: config?.defaultLocale || exports.defaultRouting.defaultLocale,
        localeDetection: config?.localeDetection ?? exports.defaultRouting.localeDetection,
    });
}
