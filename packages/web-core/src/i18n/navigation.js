"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRouter = exports.usePathname = exports.redirect = exports.Link = void 0;
exports.createCustomNavigation = createCustomNavigation;
const navigation_1 = require("next-intl/navigation");
const routing_1 = require("./routing");
_a = (0, navigation_1.createNavigation)(routing_1.defaultRouting), exports.Link = _a.Link, exports.redirect = _a.redirect, exports.usePathname = _a.usePathname, exports.useRouter = _a.useRouter;
// Fonction pour créer une navigation personnalisée si besoin
function createCustomNavigation(routing) {
    return (0, navigation_1.createNavigation)(routing);
}
