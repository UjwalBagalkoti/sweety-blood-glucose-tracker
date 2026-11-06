import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} is required`);
}
if (process.env.JWT_SECRET.length < 32 && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development'
};
