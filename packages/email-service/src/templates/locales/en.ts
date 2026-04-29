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
  accountDeletion: {
    subject: string
    heading: string
    intro: string
    schedule: string
    grace: string
    ifNotYou: string
    signature: string
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
  accountDeletion: {
    subject: 'Your {appName} account is scheduled for deletion',
    heading: 'Account deletion scheduled',
    intro: 'Hi {username}, we received a request to delete your {appName} account ({email}).',
    schedule:
      'Your account is now scheduled for permanent deletion on {date} ({gracePeriodDays} days from now).',
    grace:
      'If you change your mind during this period, simply sign in again and your account will be restored.',
    ifNotYou: "If you didn't request this, please contact our support team immediately.",
    signature: '— The {appName} team',
  },
  common: {
    footerRights: '© {year} {appName}. All rights reserved.',
    footerNoreply: 'This is an automated message — please do not reply.',
  },
}
