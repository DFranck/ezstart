export declare const createIntlMiddleware: (routing?: {
    locales: readonly ["fr", "en"];
    defaultLocale: "fr" | "en";
    localePrefix?: import("next-intl/routing", { with: { "resolution-mode": "import" } }).LocalePrefix<readonly ["fr", "en"], "always"> | undefined;
    domains?: undefined;
    localeCookie?: boolean | {
        maxAge?: number | undefined | undefined;
        priority?: "low" | "medium" | "high" | undefined | undefined;
        domain?: string | undefined | undefined;
        path?: string | undefined | undefined;
        secure?: boolean | undefined | undefined;
        sameSite?: true | false | "lax" | "strict" | "none" | undefined | undefined;
        partitioned?: boolean | undefined | undefined;
        name?: string | undefined;
    };
    alternateLinks?: boolean;
    localeDetection?: boolean;
}) => (request: import("next/server").NextRequest) => import("next/server").NextResponse<unknown>;
declare const _default: (request: import("next/server").NextRequest) => import("next/server").NextResponse<unknown>;
export default _default;
//# sourceMappingURL=middleware.d.ts.map