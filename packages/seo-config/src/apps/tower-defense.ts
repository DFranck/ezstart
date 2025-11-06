/**
 * Enhanced SEO Configuration for Tower Defense
 *
 * Real-time multiplayer tower defense game built with Next.js and Socket.IO.
 * Data extracted from docs/seo/ALL-APPS-SUMMARY.md
 */

import type { AppSEOConfig } from './ezstart'

export const towerDefenseSEO: AppSEOConfig = {
  appName: 'Tower Defense',
  tagline: 'Multiplayer Strategy Game - Learn Real-Time Web Dev',
  shortDescription: 'Browser-based tower defense game demonstrating real-time web technologies with Socket.IO.',
  longDescription: `Tower Defense is a real-time multiplayer strategy game built entirely with modern web technologies - Next.js, Socket.IO, and TypeScript. More than just a game, it's a complete demonstration of how to build real-time applications with complex state management, multiplayer synchronization, and engaging gameplay. Players defend against 50+ waves of increasingly difficult enemies by strategically placing 10+ tower types, upgrading defenses, and competing on global leaderboards. Built with production-quality code that developers can learn from, Tower Defense showcases WebSocket connections for real-time multiplayer, game state synchronization across clients, performant canvas rendering, complex game logic with TypeScript, and scalable server architecture. Whether you're a casual gamer looking for strategic tower defense fun or a developer learning how to build real-time applications, Tower Defense delivers. The same WebSocket patterns used in chat applications, collaborative editors, and live dashboards - demonstrated through engaging gameplay. Study the code to understand real-time state management, see how multiplayer synchronization works, learn canvas rendering techniques, and discover patterns for complex TypeScript applications. Open-source and fully documented, Tower Defense is the perfect example project for understanding modern real-time web development.`,

  mission: {
    what: 'Real-time multiplayer tower defense game built with Next.js and Socket.IO.',
    why: 'Learning real-time web technologies is hard without practical, engaging examples.',
    how: 'Demonstrate real-time tech through an engaging game with open-source code.',
  },

  features: [
    {
      title: 'Real-Time Multiplayer - Socket.IO Powered',
      description: 'Play with friends in synchronized multiplayer matches',
      longDescription: 'True real-time multiplayer using Socket.IO for WebSocket connections. Join lobbies with friends, synchronized game state across all players, see other players\' tower placements in real-time, compete on shared waves and leaderboards. Behind the scenes: efficient state synchronization, lag compensation, disconnect handling, and reconnection logic. The same patterns used in production chat apps, collaborative tools, and live dashboards - demonstrated through multiplayer gaming.',
      icon: 'lucide:Users',
      keywords: ['multiplayer game', 'real-time game', 'socketio game', 'browser game multiplayer', 'web game'],
      useCases: [
        'Casual gamers playing tower defense with friends',
        'Developers learning real-time multiplayer implementation',
        'Portfolio projects showcasing WebSocket expertise',
      ],
    },
    {
      title: 'Strategic Gameplay - 10+ Tower Types',
      description: '10+ unique towers with different strategies and upgrade paths',
      longDescription: 'Deep strategic gameplay with diverse tower types: basic gun towers for consistent damage, laser towers for multiple targets, missile towers for area damage, slow towers for enemy debuffs, sniper towers for high single-target damage. Each tower has unique upgrade paths affecting damage, range, fire rate, and special abilities. Plan your defense strategy, manage resources wisely, and adapt to different enemy types. 50+ waves with progressive difficulty mean long-term engagement and replayability.',
      icon: 'lucide:Castle',
      keywords: ['tower defense strategy', 'td game', 'strategy game', 'tower types', 'game tactics'],
      useCases: [
        'Strategy gamers enjoying tower defense challenges',
        'Players competing for high scores and achievements',
        'Casual gaming during breaks',
      ],
    },
    {
      title: 'Educational Code - Learn from Production Quality',
      description: 'Open-source code demonstrates real-time patterns and game logic',
      longDescription: 'Every line of code is available for learning. Study production-quality implementations of: WebSocket connections and state synchronization, game loop and canvas rendering, complex TypeScript types for game entities, state management for multiplayer games, server-client architecture, collision detection and pathfinding algorithms. Comprehensive comments explain why decisions were made. Perfect for developers learning real-time web development, game development, or advanced TypeScript patterns.',
      icon: 'lucide:Code',
      keywords: ['socketio example', 'real-time tutorial', 'game development web', 'websocket game code', 'typescript game'],
      useCases: [
        'Developers learning Socket.IO and real-time patterns',
        'Students studying game development concepts',
        'Interviews discussing real-time application architecture',
      ],
    },
  ],

  targetAudience: [
    {
      persona: 'Casual Gamers',
      painPoints: [
        'Want quick, engaging games in browser',
        'Tired of pay-to-win mobile games',
        'Looking for strategic gameplay',
        'Play during work breaks or commutes',
      ],
      goals: [
        'Fun, free tower defense game',
        'No installation required',
        'Play with friends online',
        'Strategic challenge with progression',
      ],
      characteristics: [
        'Enjoy strategy and puzzle games',
        'Limited gaming time',
        'Prefer browser over downloads',
        'Social gaming with friends',
      ],
    },
    {
      persona: 'Developers Learning Real-Time Tech',
      painPoints: [
        'Socket.IO tutorials are toy examples',
        'Don\'t understand real-time state management',
        'Need practical real-world example',
        'Want to add real-time features to portfolio',
      ],
      goals: [
        'Learn Socket.IO from working code',
        'Understand game state synchronization',
        'Build real-time features confidently',
        'Create impressive portfolio projects',
      ],
      characteristics: [
        'Comfortable with JavaScript/TypeScript',
        'Building web applications',
        'Want to level up real-time skills',
        'Appreciate well-documented code',
      ],
    },
    {
      persona: 'Agencies Needing Demo Projects',
      painPoints: [
        'Clients want to see real-time capabilities',
        'Need impressive demo for proposals',
        'Struggle to explain WebSocket benefits',
        'Want proof of technical expertise',
      ],
      goals: [
        'Showcase real-time development skills',
        'Demonstrate complex state management',
        'Impress technical decision-makers',
        'Win projects requiring real-time features',
      ],
      characteristics: [
        'Building client proposals',
        'Need portfolio pieces',
        'Value impressive demos',
        'Technically sophisticated clients',
      ],
    },
  ],

  useCases: [
    {
      title: 'Learning Real-Time Web Development',
      before: 'Wanted to learn Socket.IO for chat feature. Tutorials showed "hello world" examples. Didn\'t understand how to structure real apps with complex state.',
      after: 'Studied Tower Defense codebase for 2 weeks. Understood state synchronization, room management, disconnect handling. Built chat feature confidently. Code worked first try.',
      metrics: {
        timelineBefore: 'Stuck on tutorials',
        timelineAfter: 'Built real feature in 2 weeks',
      },
    },
    {
      title: 'Portfolio Project That Stands Out',
      before: 'Portfolio had standard CRUD apps. Interviews asked about real-time experience. Had to say "I haven\'t built that yet."',
      after: 'Customized Tower Defense for portfolio - different theme, new features. Interviewers impressed by multiplayer game. Asked detailed architecture questions. Got offer.',
      metrics: {
        timelineBefore: 'Standard portfolio',
        timelineAfter: 'Impressive multiplayer game',
      },
    },
  ],

  keywords: {
    primary: [
      { term: 'tower defense game', volume: 18100 },
      { term: 'browser game', volume: 6600 },
      { term: 'multiplayer game online', volume: 3600 },
      { term: 'strategy game free', volume: 2900 },
      { term: 'td game', volume: 1800 },
    ],
    secondary: [
      { term: 'online tower defense', volume: 880 },
      { term: 'web game multiplayer', volume: 720 },
      { term: 'socketio game example', volume: 320 },
      { term: 'real-time browser game', volume: 210 },
    ],
    longTail: [
      { term: 'tower defense game browser free', volume: 390 },
      { term: 'multiplayer tower defense online', volume: 260 },
      { term: 'how to build multiplayer game', volume: 170 },
      { term: 'socketio real-time game tutorial', volume: 90 },
    ],
  },

  usps: {
    title: 'Play for Fun, Learn from Code',
    description: 'Engaging game + Educational codebase',
    differentiators: [
      'True Multiplayer: Real-time Socket.IO synchronization, not turn-based',
      'Production Quality: Code you can learn from, not toy example',
      'Open Source: Study every line, understand every pattern',
      'Strategic Depth: 10+ towers, 50+ waves, multiple strategies',
      'Educational: Comprehensive comments explain real-time patterns',
      'Portfolio-Worthy: Impressive demo of technical capabilities',
      'Free Forever: No ads, no in-app purchases, no premium tiers',
      'Modern Stack: Next.js, Socket.IO, TypeScript, Canvas',
    ],
  },

  vsCompetition: [
    {
      category: 'VS Mobile TD Games',
      competitors: ['Bloons TD', 'Kingdom Rush', 'Clash of Clans'],
      ourAdvantage: 'They\'re pay-to-win with ads and in-app purchases. Tower Defense is 100% free, no ads, no purchases. Plus, browser-based means play anywhere without installation. And the code is open-source for learning.',
    },
    {
      category: 'VS Socket.IO Tutorials',
      competitors: ['Socket.IO chat tutorial', 'Real-time tutorial sites'],
      ourAdvantage: 'Tutorials show "hello world" chat apps. Tower Defense demonstrates complex real-time state management, multiplayer synchronization, and scalable architecture in a real, engaging application.',
    },
  ],

  visualAssets: [
    {
      type: 'video',
      title: 'Gameplay Trailer',
      description: '60-second gameplay showing towers, enemies, multiplayer',
      specs: {
        duration: '60 seconds',
        resolution: '1920×1080',
        format: 'MP4',
        size: '<10MB',
      },
    },
    {
      type: 'gif',
      title: 'Tower Placement',
      description: 'Player placing towers and defending waves',
      specs: {
        duration: '10 seconds loop',
        resolution: '1200×800',
        format: 'GIF',
        size: '<3MB',
      },
    },
    {
      type: 'screenshot',
      title: 'Game Screenshot',
      description: 'Mid-game action with multiple tower types',
      specs: {
        resolution: '1600×900',
        format: 'WebP',
      },
    },
  ],

  callToAction: {
    primary: 'Play Now Free',
    secondary: 'View Code on GitHub',
    url: 'https://td.ezstart.xyz',
  },

  socialProof: {
    stats: [
      { label: 'Tower Types', value: '10+' },
      { label: 'Waves', value: '50+' },
      { label: 'Players Online', value: 'Live' },
      { label: 'Cost', value: 'Free' },
    ],
  },

  faq: [
    {
      question: 'Is Tower Defense really free with no ads?',
      answer: 'Yes, 100% free with zero ads, no in-app purchases, no premium tiers. Open-source project built for fun and education.',
    },
    {
      question: 'Can I play with friends?',
      answer: 'Yes, multiplayer is built-in using Socket.IO. Create a lobby and share the link with friends. Real-time synchronized gameplay.',
    },
    {
      question: 'Can I use the code for my own game?',
      answer: 'Absolutely! MIT licensed - use it, modify it, learn from it. Many developers have customized it for their portfolios or projects.',
    },
    {
      question: 'How do I learn from the codebase?',
      answer: 'Start with the GitHub repo. Code is well-commented with explanations of real-time patterns, game logic, and architecture decisions. README guides you through the structure.',
    },
  ],

  brandVoice: {
    tone: [
      'Fun and engaging for gamers',
      'Educational and helpful for developers',
      'Casual but technically accurate',
      'Enthusiastic about open-source learning',
    ],
    avoid: [
      'Overpromising game features (it\'s a demo)',
      'Comparing to AAA games unfairly',
      'Too technical for casual gamers',
      'Too casual for serious developers',
    ],
  },
}

export default towerDefenseSEO
