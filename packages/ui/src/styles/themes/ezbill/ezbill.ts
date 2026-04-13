/**
 * Ezbill Theme CSS
 * Source: packages/ui/src/styles/themes/ezbill/ezbill.css
 *
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run `pnpm generate:themes` to regenerate from CSS source
 */
export const ezbillThemeCss = `/* EZBill Theme Variables and Utilities */

:root[data-app='ezbill'] {
  /* Override shadcn primary/secondary/accent tokens */
  --primary: oklch(0.65 0.17 240);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.95 0.02 240);
  --secondary-foreground: oklch(0.3 0.08 240);
  --accent: oklch(0.93 0.03 240);
  --accent-foreground: oklch(0.3 0.08 240);

  /* EZBill - Entity Colors */
  --ezbill-client: oklch(0.7 0.15 210); /* Cyan-Blue - Friendly, professional */
  --ezbill-client-foreground: oklch(0.25 0.08 210);
  --ezbill-company: oklch(0.68 0.18 290); /* Purple - Corporate, premium */
  --ezbill-company-foreground: oklch(0.22 0.09 290);
  --ezbill-payment: oklch(0.75 0.16 150); /* Green-Emerald - Money, success */
  --ezbill-payment-foreground: oklch(0.2 0.07 150);

  /* EZBill - Document Status Colors */
  --ezbill-invoice: oklch(0.65 0.17 240); /* Blue-Indigo - Official, trust */
  --ezbill-invoice-foreground: oklch(0.22 0.08 240);
  --ezbill-quote: oklch(0.75 0.18 80); /* Orange-Amber - Awaiting decision */
  --ezbill-quote-foreground: oklch(0.25 0.09 80);
  --ezbill-receipt: oklch(0.68 0.2 310); /* Purple-Pink - Confirmation, complete */
  --ezbill-receipt-foreground: oklch(0.22 0.1 310);

  /* EZBill - Status States */
  --ezbill-draft: oklch(0.68 0.05 250); /* Gray-Blue - Work in progress */
  --ezbill-draft-foreground: oklch(0.4 0.02 250);
  --ezbill-sent: oklch(0.7 0.18 240); /* Blue - In transit */
  --ezbill-sent-foreground: oklch(0.22 0.09 240);
  --ezbill-paid: oklch(0.75 0.17 145); /* Green - Success, money received */
  --ezbill-paid-foreground: oklch(0.2 0.08 145);
  --ezbill-accepted: oklch(0.73 0.16 135); /* Green - Approved */
  --ezbill-accepted-foreground: oklch(0.2 0.07 135);
  --ezbill-rejected: oklch(0.65 0.22 25); /* Red - Declined */
  --ezbill-rejected-foreground: oklch(0.22 0.11 25);
  --ezbill-pending: oklch(0.75 0.18 80); /* Orange-Amber - Awaiting action */
  --ezbill-pending-foreground: oklch(0.25 0.09 80);
}

:root[data-app='ezbill'].dark {
  /* Override shadcn primary/secondary/accent tokens */
  --primary: oklch(0.64 0.178 251);
  --primary-foreground: oklch(0.98 0.01 250);
  --secondary: oklch(0.25 0.04 240);
  --secondary-foreground: oklch(0.95 0.01 240);
  --accent: oklch(0.28 0.05 240);
  --accent-foreground: oklch(0.95 0.01 240);

  /* EZBill - Semantic colors for badges and text */
  --ezbill-client: oklch(0.731 0.165 210);
  --ezbill-client-foreground: oklch(0.98 0.01 210);
  --ezbill-company: oklch(0.667 0.223 295);
  --ezbill-company-foreground: oklch(0.98 0.01 295);
  --ezbill-payment: oklch(0.754 0.184 146);
  --ezbill-payment-foreground: oklch(0.98 0.01 145);
  --ezbill-invoice: oklch(0.64 0.178 251);
  --ezbill-invoice-foreground: oklch(0.98 0.01 250);
  --ezbill-quote: oklch(0.723 0.174 75);
  --ezbill-quote-foreground: oklch(0.98 0.01 75);
  --ezbill-receipt: oklch(0.667 0.223 295);
  --ezbill-receipt-foreground: oklch(0.98 0.01 295);

  /* EZBill - Status states */
  --ezbill-draft: oklch(0.6 0.05 250);
  --ezbill-draft-foreground: oklch(0.9 0.02 250);
  --ezbill-sent: oklch(0.64 0.178 251);
  --ezbill-sent-foreground: oklch(0.98 0.01 250);
  --ezbill-paid: oklch(0.754 0.184 146);
  --ezbill-paid-foreground: oklch(0.98 0.01 145);
  --ezbill-accepted: oklch(0.754 0.184 146);
  --ezbill-accepted-foreground: oklch(0.98 0.01 145);
  --ezbill-rejected: oklch(0.627 0.221 25);
  --ezbill-rejected-foreground: oklch(0.98 0.01 25);
  --ezbill-pending: oklch(0.723 0.174 75);
  --ezbill-pending-foreground: oklch(0.98 0.01 75);
}

@theme inline {
  /* EZBill Semantic Colors */
  --color-ezbill-client: var(--ezbill-client);
  --color-ezbill-client-foreground: var(--ezbill-client-foreground);
  --color-ezbill-company: var(--ezbill-company);
  --color-ezbill-company-foreground: var(--ezbill-company-foreground);
  --color-ezbill-payment: var(--ezbill-payment);
  --color-ezbill-payment-foreground: var(--ezbill-payment-foreground);
  --color-ezbill-invoice: var(--ezbill-invoice);
  --color-ezbill-invoice-foreground: var(--ezbill-invoice-foreground);
  --color-ezbill-quote: var(--ezbill-quote);
  --color-ezbill-quote-foreground: var(--ezbill-quote-foreground);
  --color-ezbill-receipt: var(--ezbill-receipt);
  --color-ezbill-receipt-foreground: var(--ezbill-receipt-foreground);
  --color-ezbill-draft: var(--ezbill-draft);
  --color-ezbill-draft-foreground: var(--ezbill-draft-foreground);
  --color-ezbill-sent: var(--ezbill-sent);
  --color-ezbill-sent-foreground: var(--ezbill-sent-foreground);
  --color-ezbill-paid: var(--ezbill-paid);
  --color-ezbill-paid-foreground: var(--ezbill-paid-foreground);
  --color-ezbill-accepted: var(--ezbill-accepted);
  --color-ezbill-accepted-foreground: var(--ezbill-accepted-foreground);
  --color-ezbill-rejected: var(--ezbill-rejected);
  --color-ezbill-rejected-foreground: var(--ezbill-rejected-foreground);
  --color-ezbill-pending: var(--ezbill-pending);
  --color-ezbill-pending-foreground: var(--ezbill-pending-foreground);
}

@layer utilities {
  /* EZBill Gradient Classes - Vibrant semantic gradients */

  /* Client gradients (cyan → blue) */
  .bg-gradient-client {
    background: linear-gradient(to right, oklch(0.805 0.161 210), oklch(0.705 0.143 247));
  }
  .bg-gradient-client-hover {
    background: linear-gradient(to right, oklch(0.651 0.156 210), oklch(0.557 0.196 256));
  }

  /* Invoice gradients (blue → indigo) */
  .bg-gradient-invoice {
    background: linear-gradient(to right, oklch(0.705 0.143 247), oklch(0.675 0.151 273));
  }
  .bg-gradient-invoice-hover {
    background: linear-gradient(to right, oklch(0.557 0.196 256), oklch(0.549 0.193 279));
  }

  /* Quote gradients (orange → amber) */
  .bg-gradient-quote {
    background: linear-gradient(to right, oklch(0.805 0.185 80), oklch(0.782 0.165 60));
  }
  .bg-gradient-quote-hover {
    background: linear-gradient(to right, oklch(0.682 0.175 80), oklch(0.654 0.155 60));
  }

  /* Payment gradients (green → emerald) */
  .bg-gradient-payment {
    background: linear-gradient(to right, oklch(0.805 0.175 145), oklch(0.782 0.147 166));
  }
  .bg-gradient-payment-hover {
    background: linear-gradient(to right, oklch(0.682 0.172 148), oklch(0.654 0.148 168));
  }

  /* Company gradients (indigo → purple) */
  .bg-gradient-company {
    background: linear-gradient(to right, oklch(0.675 0.151 273), oklch(0.715 0.206 298));
  }
  .bg-gradient-company-hover {
    background: linear-gradient(to right, oklch(0.549 0.193 279), oklch(0.597 0.219 291));
  }

  /* Receipt gradients (purple → pink) */
  .bg-gradient-receipt {
    background: linear-gradient(to right, oklch(0.715 0.206 298), oklch(0.703 0.195 340));
  }
  .bg-gradient-receipt-hover {
    background: linear-gradient(to right, oklch(0.597 0.219 291), oklch(0.577 0.206 344));
  }

  /* Light background gradients (for empty states) */
  .bg-gradient-client-light {
    background: linear-gradient(
      to right,
      oklch(0.805 0.161 210 / 0.2),
      oklch(0.705 0.143 247 / 0.2)
    );
  }
  .bg-gradient-invoice-light {
    background: linear-gradient(
      to right,
      oklch(0.705 0.143 247 / 0.2),
      oklch(0.675 0.151 273 / 0.2)
    );
  }
  .bg-gradient-quote-light {
    background: linear-gradient(to right, oklch(0.805 0.185 80 / 0.2), oklch(0.782 0.165 60 / 0.2));
  }
  .bg-gradient-payment-light {
    background: linear-gradient(
      to right,
      oklch(0.805 0.175 145 / 0.2),
      oklch(0.782 0.147 166 / 0.2)
    );
  }
  .bg-gradient-company-light {
    background: linear-gradient(
      to right,
      oklch(0.675 0.151 273 / 0.2),
      oklch(0.715 0.206 298 / 0.2)
    );
  }
  .bg-gradient-receipt-light {
    background: linear-gradient(
      to right,
      oklch(0.715 0.206 298 / 0.2),
      oklch(0.703 0.195 340 / 0.2)
    );
  }
}
`
