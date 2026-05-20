/**
 * Public texts + props contract for `<AuthOverviewSection>`.
 *
 * Extracted from the section component so the main file stays under the
 * 400-line policy ceiling. SDK-i18n-agnostic — every label has an English
 * default the consumer can override via the `texts` prop.
 *
 * @internal
 */

export interface AuthOverviewSectionTexts {
  title?: string
  subtitle?: string

  // Stat cards
  totalUsers?: string
  newUsersThisMonth?: string
  activeUsersLast30Days?: string
  activeUsersHint?: string
  verifiedUsers?: string
  twoFactorEnabled?: string
  totalApplications?: string
  totalApiKeys?: string

  // Chart
  signupTrendTitle?: string
  signupTrendDescription?: string
  signupTrendEmpty?: string
  signupSeriesLabel?: string
  signupAxisLabel?: string

  // Top apps
  topAppsTitle?: string
  topAppsDescription?: string
  topAppsEmpty?: string
  topAppsAppColumn?: string
  topAppsUsersColumn?: string

  // Errors
  loadError?: string
  retry?: string
}

export const DEFAULT_OVERVIEW_TEXTS: Required<AuthOverviewSectionTexts> = {
  title: 'Platform analytics',
  subtitle: 'Real-time platform-wide stats. Superadmin only.',
  totalUsers: 'Total users',
  newUsersThisMonth: 'New this month',
  activeUsersLast30Days: 'Active (30d)',
  activeUsersHint: 'Users seen in the last 30 days',
  verifiedUsers: 'Verified',
  twoFactorEnabled: '2FA enabled',
  totalApplications: 'Applications',
  totalApiKeys: 'API keys',
  signupTrendTitle: 'Signups (last 30 days)',
  signupTrendDescription: 'Daily new accounts',
  signupTrendEmpty: 'No signups in the last 30 days.',
  signupSeriesLabel: 'Signups',
  signupAxisLabel: 'Date',
  topAppsTitle: 'Top apps by users',
  topAppsDescription: 'Applications ranked by registered user count.',
  topAppsEmpty: 'No app registrations yet.',
  topAppsAppColumn: 'App',
  topAppsUsersColumn: 'Users',
  loadError: 'Failed to load analytics.',
  retry: 'Retry',
}

export interface AuthOverviewSectionProps {
  className?: string
  texts?: Partial<AuthOverviewSectionTexts>
}
