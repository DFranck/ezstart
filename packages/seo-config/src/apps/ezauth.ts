/**
 * Enhanced SEO Configuration for EZAuth
 *
 * Enterprise-grade SSO authentication system with OAuth, JWT, and multi-app SSO support.
 * Data extracted from docs/seo/ALL-APPS-SUMMARY.md
 */

import type { AppSEOConfig } from './ezstart'

export const ezauthSEO: AppSEOConfig = {
  appName: 'EZAuth',
  tagline: 'Enterprise SSO Authentication - Production Ready',
  shortDescription: 'Secure, scalable authentication that works across all your applications without the complexity.',
  longDescription: `EZAuth is an enterprise-grade Single Sign-On (SSO) authentication system that eliminates the complexity and security risks of building authentication from scratch. Supporting multiple OAuth providers (Google, GitHub, Discord), JWT token management with httpOnly cookies for XSS protection, and seamless multi-app SSO, EZAuth provides the same authentication infrastructure used by banks and financial applications - but open-source and ready to deploy. Whether you're a SaaS founder needing secure user authentication, an enterprise team requiring SSO across multiple services, or a developer tired of rebuilding auth for every project, EZAuth handles user registration, email verification, password reset, session management, and role-based access control out of the box. Built with security-first principles, tested against real-world attacks, and production-proven with thousands of daily logins, EZAuth lets you add authentication to your application in minutes, not weeks. Log in once, access everything - true Single Sign-On across your entire ecosystem. TypeScript throughout, comprehensive test coverage, OWASP security headers, and detailed documentation mean you can integrate with confidence. Stop wasting weeks on authentication and focus on building features that make your product unique.`,

  mission: {
    what: 'Enterprise-grade authentication system with OAuth, JWT, and multi-app SSO support.',
    why: 'Authentication is complex, security-critical, and time-consuming to build correctly. Most developers rebuild it for every project, introducing security vulnerabilities.',
    how: 'Provide production-tested authentication that handles 10,000+ users. Just plug and play.',
  },

  features: [
    {
      title: 'OAuth Providers - Social Login Ready',
      description: 'Google, GitHub, and Discord OAuth integration out of the box',
      longDescription: 'Users expect to log in with their existing accounts. EZAuth supports the most popular OAuth providers with full implementation - not just documentation links. Google for mainstream users, GitHub for developers, Discord for gaming/community apps. Adding new providers is straightforward thanks to our modular architecture. Each provider is configured with proper scopes, handles token refresh automatically, and includes error handling for edge cases like denied permissions or expired tokens.',
      icon: 'lucide:Users',
      keywords: ['oauth', 'social login', 'google auth', 'github auth', 'discord auth'],
      useCases: [
        'SaaS apps wanting to reduce signup friction with social login',
        'Developer tools requiring GitHub authentication',
        'Community platforms using Discord for authentication',
      ],
    },
    {
      title: 'httpOnly Cookies - XSS-Proof Security',
      description: 'JWT tokens stored in httpOnly cookies, immune to XSS attacks',
      longDescription: 'Storing tokens in localStorage or regular cookies is a common security vulnerability. EZAuth uses httpOnly cookies that JavaScript cannot access, making your authentication immune to XSS (Cross-Site Scripting) attacks - the most common web vulnerability. Even if an attacker injects malicious JavaScript into your site, they cannot steal user tokens. Cookies are automatically sent with requests, support secure flags for HTTPS-only transmission, and include SameSite protection against CSRF attacks. This is the same approach used by banks and financial applications.',
      icon: 'lucide:Shield',
      keywords: ['httponly cookies', 'xss protection', 'jwt security', 'secure authentication', 'csrf protection'],
      useCases: [
        'Applications handling sensitive user data requiring maximum security',
        'Financial or healthcare apps needing compliance with security standards',
        'Any app that cannot afford authentication vulnerabilities',
      ],
    },
    {
      title: 'Multi-App SSO - Single Sign-On Ecosystem',
      description: 'Log in once, access all applications in your ecosystem',
      longDescription: 'True Single Sign-On means users authenticate once and gain access to all your applications seamlessly. EZAuth provides SSO across your entire monorepo - log into EZStart and you\'re automatically authenticated in EZBill, EZPay, and all other apps. No repeated logins, no separate accounts, no password fatigue. Behind the scenes, EZAuth uses shared JWT tokens with proper domain configuration and refresh token rotation for security. Users experience seamless authentication while you maintain centralized user management and security policies.',
      icon: 'lucide:Link',
      keywords: ['sso', 'single sign on', 'multi-app auth', 'unified authentication', 'seamless login'],
      useCases: [
        'Companies with multiple products (CRM, Dashboard, Admin) sharing users',
        'Platforms with separate web, mobile, and desktop applications',
        'Enterprise clients requiring unified authentication across services',
      ],
    },
  ],

  targetAudience: [
    {
      persona: 'SaaS Founders Needing Secure Auth',
      painPoints: [
        'Building authentication takes weeks away from product development',
        'Security vulnerabilities in DIY auth solutions',
        'Need OAuth providers but integration is complex',
        'User management and session handling is complicated',
      ],
      goals: [
        'Launch with secure authentication immediately',
        'Support social login to reduce signup friction',
        'Pass security audits and compliance requirements',
        'Focus on product features, not infrastructure',
      ],
      characteristics: [
        'Technical founders building MVP',
        'Security-conscious but not security experts',
        'Need production-ready solutions fast',
        'Willing to use proven solutions over DIY',
      ],
    },
    {
      persona: 'Enterprise Teams Requiring SSO',
      painPoints: [
        'Multiple applications with separate login systems',
        'Users frustrated by password fatigue',
        'Centralized user management is difficult',
        'Compliance requires audit trails and security',
      ],
      goals: [
        'Unified authentication across all services',
        'Centralized user management and policies',
        'Meet enterprise security requirements',
        'Improve user experience with SSO',
      ],
      characteristics: [
        'Managing multiple internal/external apps',
        'Enterprise security and compliance requirements',
        'Need scalability for thousands of users',
        'Require audit logs and monitoring',
      ],
    },
    {
      persona: 'Developers Tired of Rebuilding Auth',
      painPoints: [
        'Spent weeks building auth for previous projects',
        'Authentication is complex and easy to get wrong',
        'Testing authentication flows is tedious',
        'Security best practices keep changing',
      ],
      goals: [
        'Never build authentication from scratch again',
        'Use battle-tested, secure implementation',
        'Understand how proper auth works',
        'Customize when needed, use defaults when possible',
      ],
      characteristics: [
        'Experienced developers who\'ve built auth before',
        'Value clean code and best practices',
        'Want to learn from production-quality implementation',
        'Appreciate good documentation and examples',
      ],
    },
  ],

  useCases: [
    {
      title: 'SaaS Launch: Secure Auth in 2 Hours',
      before: 'Spent 3 weeks building authentication, still not secure enough for GDPR. Users complained about lack of Google login. Password reset flow was buggy.',
      after: 'Integrated EZAuth in 2 hours, passed security audit first try. Google, GitHub, and Discord login working. Users love the seamless experience.',
      metrics: {
        timelineBefore: '3 weeks',
        timelineAfter: '2 hours',
        costBefore: 'Failed security audit + user complaints',
        costAfter: 'Passed audit + positive user feedback',
      },
    },
    {
      title: 'Enterprise: Unified SSO Across 5 Apps',
      before: 'Company had 5 separate applications, each with own login system. Users had 5 different passwords, constant password resets. IT spent hours on user management.',
      after: 'Implemented EZAuth SSO across all 5 apps. Users log in once, access everything. Password reset tickets dropped 80%. IT team freed up for actual projects.',
      metrics: {
        timelineBefore: '5 separate login systems',
        timelineAfter: '1 unified SSO system',
        costBefore: '20 hrs/week IT support',
        costAfter: '4 hrs/week IT support (-80%)',
      },
    },
  ],

  keywords: {
    primary: [
      { term: 'sso authentication', volume: 2900 },
      { term: 'oauth integration', volume: 1800 },
      { term: 'secure login system', volume: 1400 },
      { term: 'jwt authentication', volume: 1200 },
      { term: 'multi-tenant auth', volume: 880 },
    ],
    secondary: [
      { term: 'nodejs authentication', volume: 720 },
      { term: 'google oauth implementation', volume: 590 },
      { term: 'httponly cookie auth', volume: 320 },
      { term: 'single sign on solution', volume: 290 },
      { term: 'authentication as a service', volume: 210 },
    ],
    longTail: [
      { term: 'how to implement sso authentication', volume: 90 },
      { term: 'secure jwt authentication nodejs', volume: 70 },
      { term: 'oauth2 implementation example', volume: 50 },
      { term: 'multi app authentication system', volume: 40 },
      { term: 'httponly cookie vs localstorage', volume: 30 },
    ],
  },

  usps: {
    title: 'Production-Tested Authentication You Can Trust',
    description: 'Not a tutorial - a real authentication system handling thousands of daily logins',
    differentiators: [
      'Production-Proven: Handling 10,000+ users in real applications',
      'Security-First: httpOnly cookies, OWASP headers, XSS/CSRF protection',
      'True SSO: Single sign-on across unlimited applications',
      'Multiple OAuth: Google, GitHub, Discord ready - add more easily',
      'Complete Features: Registration, verification, password reset, role-based access',
      'TypeScript Throughout: Full type safety from database to API to SDK',
      'Well Tested: Comprehensive test coverage for all auth flows',
      'Easy Integration: Add to any app in 5 minutes with auth-sdk',
    ],
  },

  vsCompetition: [
    {
      category: 'VS Auth0 / Firebase Auth',
      competitors: ['Auth0', 'Firebase Auth', 'Supabase Auth'],
      ourAdvantage: 'They charge monthly based on active users. We\'re open-source and free forever. Own your user data, no vendor lock-in, no surprise bills. Plus, you can customize anything - not limited to their features.',
    },
    {
      category: 'VS DIY Authentication',
      competitors: ['Custom built auth', 'Passport.js', 'NextAuth'],
      ourAdvantage: 'DIY takes weeks and is error-prone. EZAuth is production-ready today with security best practices built-in. We\'ve already handled the edge cases, security vulnerabilities, and testing. You get working code, not just a library.',
    },
  ],

  visualAssets: [
    {
      type: 'gif',
      title: 'OAuth Login Flow',
      description: 'Click login → Choose provider → Authenticated in 3 seconds',
      specs: {
        duration: '5 seconds loop',
        resolution: '1000×700',
        format: 'GIF',
        size: '<2MB',
      },
    },
    {
      type: 'gif',
      title: 'Multi-App SSO',
      description: 'Login to App 1 → Navigate to App 2 → Already authenticated',
      specs: {
        duration: '8 seconds loop',
        resolution: '1200×800',
        format: 'GIF',
        size: '<2MB',
      },
    },
    {
      type: 'screenshot',
      title: 'User Dashboard',
      description: 'Clean user management interface',
      specs: {
        resolution: '1400×900',
        format: 'WebP',
      },
    },
  ],

  callToAction: {
    primary: 'Add Auth in 5 Minutes',
    secondary: 'View Documentation',
    url: 'https://auth.ezstart.xyz',
  },

  socialProof: {
    stats: [
      { label: 'Daily Logins', value: '10,000+' },
      { label: 'OAuth Providers', value: '3' },
      { label: 'Security Score', value: 'A+' },
      { label: 'Integration Time', value: '5 min' },
    ],
  },

  faq: [
    {
      question: 'How is EZAuth different from Auth0 or Firebase Auth?',
      answer: 'EZAuth is open-source and self-hosted. You own your user data, pay no monthly fees, and can customize everything. Auth0/Firebase charge per active user and lock you into their platform.',
    },
    {
      question: 'Is EZAuth secure enough for production?',
      answer: 'Yes, EZAuth is handling thousands of daily logins in production right now. Built with httpOnly cookies (XSS-proof), OWASP security headers, CSRF protection, and tested against common attacks.',
    },
    {
      question: 'Can I add more OAuth providers?',
      answer: 'Absolutely! The architecture is modular. We include Google, GitHub, and Discord, but you can add any OAuth2 provider following the same pattern.',
    },
    {
      question: 'Does SSO work across different domains?',
      answer: 'Yes, with proper CORS and cookie configuration. EZAuth handles cross-domain authentication securely. Documentation covers subdomain SSO and cross-domain SSO setups.',
    },
    {
      question: 'How hard is it to integrate into my existing app?',
      answer: 'Very easy. Install @ezstart/auth-sdk, add AuthProvider to your React app, use useAuth() hook. Takes about 5 minutes for basic integration. Detailed guide in documentation.',
    },
  ],

  brandVoice: {
    tone: [
      'Security-focused but not paranoid',
      'Technical accuracy over marketing claims',
      'Confident in production-readiness',
      'Helpful for developers, not IT managers',
    ],
    avoid: [
      '"Unhackable" or "100% secure" - nothing is',
      'FUD about other solutions',
      'Over-technical jargon without explanation',
      'Downplaying complexity - auth IS complex',
    ],
  },
}

export default ezauthSEO
