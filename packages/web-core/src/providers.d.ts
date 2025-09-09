import { AbstractIntlMessages, Locale } from 'next-intl';
import * as React from 'react';
export interface WebProvidersProps {
    children: React.ReactNode;
    messages?: AbstractIntlMessages;
    locale?: Locale;
    timeZone?: string;
    authConfig: {
        baseURL: string;
        appName: string;
        redirectUri: string;
    };
}
export declare function WebProviders({ children, messages, locale, timeZone, authConfig, }: WebProvidersProps): import("react/jsx-runtime").JSX.Element;
export declare function SimpleWebProviders({ children, authConfig, }: {
    children: React.ReactNode;
    authConfig: {
        baseURL: string;
        appName: string;
        redirectUri: string;
    };
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=providers.d.ts.map