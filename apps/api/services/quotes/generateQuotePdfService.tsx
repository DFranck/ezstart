import { QuotePdfTemplate } from '@ezstart/templates';
import { Quote } from '@ezstart/types';
import puppeteer from 'puppeteer';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export async function generateQuotePdfService(quote: Quote): Promise<Buffer> {
  const html = renderToStaticMarkup(<QuotePdfTemplate quote={quote} />);
  const fullHtml = `
    <html>
      <head>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.3/dist/tailwind.min.css" rel="stylesheet">
        <meta charset="utf-8"/>
      </head>
      <body>${html}</body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  return Buffer.from(pdfBuffer);
}
