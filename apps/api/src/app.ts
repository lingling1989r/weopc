import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './shared/middleware/error-handler';

// Import routes
import authRoutes from './modules/auth/routes';
import projectRoutes from './modules/projects/routes';
import leadRoutes from './modules/leads/routes';
import showcaseRoutes from './modules/showcase/routes';
import invitationRoutes from './modules/invitation/routes';
import adminRoutes from './modules/admin/routes';
import userRoutes from './modules/users/routes';
import reviewRoutes from './modules/reviews/routes';
import preferenceRoutes from './modules/preferences/routes';
import recommendationRoutes from './modules/recommendations/routes';
import informationRoutes from './modules/information/routes';
import linkRoutes from './modules/links/routes';
import skillRoutes from './modules/skills/routes';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/invitation', invitationRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1', leadRoutes);
app.use('/api/v1/showcase', showcaseRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/preferences', preferenceRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);
app.use('/api/v1/information', informationRoutes);
app.use('/api/v1/links', linkRoutes);
app.use('/api/v1/skills', skillRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      timestamp: new Date().toISOString(),
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
