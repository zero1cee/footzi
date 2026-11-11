const DEV_JWT_SECRET = 'footzi_super_secret_jwt_key_development_only_change_in_prod';

export const isProduction = process.env.NODE_ENV === 'production';

/**
 * In production the server refuses to start without real secrets, so it can never
 * silently run on the development defaults baked into this repository.
 */
export const validateEnv = (): void => {
  if (!isProduction) return;

  const problems: string[] = [];

  if (!process.env.MONGODB_URI) {
    problems.push('MONGODB_URI is not set');
  }

  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32 || jwtSecret === DEV_JWT_SECRET) {
    problems.push('JWT_SECRET must be a unique random string of at least 32 characters');
  }

  if (problems.length > 0) {
    console.error('[Footzi Config] Refusing to start in production:');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
};

export const getJwtSecret = (): string => process.env.JWT_SECRET || DEV_JWT_SECRET;

/** Comma-separated list of allowed browser origins, e.g. "https://a.com,https://b.com". */
export const getCorsOrigins = (): string[] =>
  [
    ...(process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
    // Render sets this to the service's public URL
    process.env.RENDER_EXTERNAL_URL || '',
  ]
    .map((o) => o.trim())
    .filter(Boolean);
