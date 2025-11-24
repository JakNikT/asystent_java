import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Static files
app.use(express.static(path.join(rootDir, 'dist')));

// Catch-all route for React
app.use((req, res) => {
    res.sendFile(path.join(rootDir, 'dist', 'index.html'));
});

export default app;
