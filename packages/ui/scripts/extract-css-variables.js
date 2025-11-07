/**
 * Extract CSS variables from theme files
 * Used to avoid duplication between .css and .ts files
 */
import { readFileSync } from 'fs';
/**
 * Extract `:root` and `.dark` blocks from CSS file
 * Handles nested braces correctly
 */
function extractBlockContent(cssContent, selector) {
    const selectorRegex = new RegExp(`${selector}\\s*\\{`, 'i');
    const match = selectorRegex.exec(cssContent);
    if (!match)
        return null;
    let startIndex = match.index + match[0].length;
    let braceCount = 1;
    let endIndex = startIndex;
    // Find matching closing brace
    for (let i = startIndex; i < cssContent.length; i++) {
        if (cssContent[i] === '{')
            braceCount++;
        if (cssContent[i] === '}')
            braceCount--;
        if (braceCount === 0) {
            endIndex = i;
            break;
        }
    }
    if (braceCount !== 0)
        return null;
    return cssContent.substring(startIndex, endIndex);
}
/**
 * Extract CSS variable blocks from a CSS file
 * Returns only :root and .dark sections
 */
export function extractCssVariables(cssPath) {
    const cssContent = readFileSync(cssPath, 'utf-8');
    const rootContent = extractBlockContent(cssContent, ':root');
    const darkContent = extractBlockContent(cssContent, '\\.dark');
    let result = '';
    if (rootContent) {
        result += `:root {\n${rootContent}\n}\n`;
    }
    if (darkContent) {
        result += `\n.dark {\n${darkContent}\n}`;
    }
    return result;
}
/**
 * Read entire CSS file (for app-specific themes)
 */
export function readCssFile(cssPath) {
    return readFileSync(cssPath, 'utf-8');
}
