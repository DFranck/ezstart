"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntlMiddleware = void 0;
const middleware_1 = __importDefault(require("next-intl/middleware"));
const routing_1 = require("./i18n/routing");
const createIntlMiddleware = (routing = routing_1.defaultRouting) => {
    return (0, middleware_1.default)(routing);
};
exports.createIntlMiddleware = createIntlMiddleware;
exports.default = (0, exports.createIntlMiddleware)();
