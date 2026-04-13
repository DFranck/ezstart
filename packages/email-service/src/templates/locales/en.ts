export interface LocaleDict {
  passwordReset: {
    subject: string
    heading: string
    intro: string
    ctaLabel: string
    outro: string
  }
  emailVerification: {
    subject: string
    heading: string
    intro: string
    ctaLabel: string
    outro: string
  }
  welcomeSetPassword: {
    subject: string
    heading: string
    intro: string
    ctaLabel: string
    outro: string
    promoMessage: string
  }
  common: {
    footerRights: string
    footerNoreply: string
  }
}

export const en: LocaleDict = {
  passwordReset: {
    subject: 'Reset your {appName} password',
    heading: 'Reset your {appName} password',
    intro: 'Click the button below to reset your password:',
    ctaLabel: 'Reset Password',
    outro: "If you didn't request this, simply ignore this email.",
  },
  emailVerification: {
    subject: 'Verify your {appName} email',
    heading: 'Verify your {appName} email',
    intro: 'Click the button below to verify your email address:',
    ctaLabel: 'Verify Email',
    outro: "If you didn't create this account, simply ignore this email.",
  },
  welcomeSetPassword: {
    subject: 'Welcome to {appName}',
    heading: 'Welcome to {appName}, {username}!',
    intro:
      'Your account has been created. To secure it, please set up a password using the button below:',
    ctaLabel: 'Set My Password',
    outro:
      'You can also log in without a password for now, but we recommend setting one. This link expires in 24 hours.',
    promoMessage: '🎁 Promo code {promoCode} has been applied to your account!',
  },
  common: {
    footerRights: '© {year} {appName}. All rights reserved.',
    footerNoreply: 'This is an automated message — please do not reply.',
  },
}
