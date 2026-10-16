/**
 * src/server/app.ts: Główna konfiguracja Express aplikacji
 * Integruje routing, middleware i globalny error handler
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const app = express();

// Middleware
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// API Routes
app.use('/api', routes);

// Static files - serve ONLY in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(rootDir, 'dist')));

    // Catch-all route for React
    app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(rootDir, 'dist', 'index.html'));
    });
} else {
    // In development, just send a message or 404 for non-API routes
    app.get('/', (_req, res) => {
        res.send('Backend API server is running in DEVELOPMENT mode. Use frontend dev server (Vite) to access the app.');
    });
}

// Global Error Handler Middleware (MUSI być ostatnim middleware)
app.use(errorHandler);

export default app;






