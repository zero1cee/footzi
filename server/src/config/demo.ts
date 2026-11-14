/**
 * The two accounts behind the public "Demo" sign-in buttons. Anyone can use them, so whatever one visitor
 * enters (an address, a phone number) would be visible to the next. They never show customer details, and
 * their own profile cannot be edited.
 */
export const DEMO_ACCOUNT_EMAILS = new Set(['patron@footzi.in', 'demo-admin@footzi.in']);

export const isSharedDemoAccount = (user?: { email?: string; role?: string } | null): boolean =>
  Boolean(user && (user.role === 'demo_admin' || (user.email && DEMO_ACCOUNT_EMAILS.has(user.email))));
