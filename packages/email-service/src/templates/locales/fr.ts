import type { LocaleDict } from './en.js'

export const fr: LocaleDict = {
  passwordReset: {
    subject: 'Réinitialiser votre mot de passe {appName}',
    heading: 'Réinitialiser votre mot de passe {appName}',
    intro: 'Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :',
    ctaLabel: 'Réinitialiser le mot de passe',
    outro: "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
  },
  emailVerification: {
    subject: 'Vérifiez votre e-mail {appName}',
    heading: 'Vérifiez votre e-mail {appName}',
    intro: 'Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail :',
    ctaLabel: "Vérifier l'e-mail",
    outro: "Si vous n'avez pas créé ce compte, ignorez simplement cet e-mail.",
  },
  welcomeSetPassword: {
    subject: 'Bienvenue sur {appName}',
    heading: 'Bienvenue sur {appName}, {username} !',
    intro:
      'Votre compte a été créé. Pour le sécuriser, veuillez définir un mot de passe via le bouton ci-dessous :',
    ctaLabel: 'Définir mon mot de passe',
    outro:
      'Vous pouvez aussi vous connecter sans mot de passe pour l’instant, mais nous vous recommandons d’en définir un. Ce lien expire dans 24 heures.',
    promoMessage: '🎁 Le code promo {promoCode} a été appliqué à votre compte !',
  },
  common: {
    footerRights: '© {year} {appName}. Tous droits réservés.',
    footerNoreply: 'Ceci est un message automatique — merci de ne pas y répondre.',
  },
} as const
