import { rateLimit } from 'express-rate-limit';

export const matchCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de matchs créés. Réessaie dans une heure.' },
});
