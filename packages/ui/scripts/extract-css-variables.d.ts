/**
 * Extract CSS variables from theme files
 * Used to avoid duplication between .css and .ts files
 */
/**
 * Extract CSS variable blocks from a CSS file
 * Returns only :root and .dark sections
 */
export declare function extractCssVariables(cssPath: string): string;
/**
 * Read entire CSS file (for app-specific themes)
 */
export declare function readCssFile(cssPath: string): string;
//# sourceMappingURL=extract-css-variables.d.ts.map