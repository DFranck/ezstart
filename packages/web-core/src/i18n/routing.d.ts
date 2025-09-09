export declare const defaultRouting: {
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
};
export type AppLocale = (typeof defaultRouting.locales)[number];
export declare function getTimeZoneFromLocale(locale: AppLocale): string;
export declare function createRouting(config?: {
    locales?: string[];
    defaultLocale?: string;
    localeDetection?: boolean;
}): {
    locales: readonly ["fr", "en"] | string[];
    defaultLocale: string;
    localePrefix?: import("next-intl/routing", { with: { "resolution-mode": "import" } }).LocalePrefix<readonly ["fr", "en"] | string[], "always"> | undefined;
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
};
//# sourceMappingURL=routing.d.ts.map