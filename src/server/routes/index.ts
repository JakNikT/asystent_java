/**
 * src/server/routes/index.ts: Główny router aplikacji
 * Agreguje wszystkie route'y w jednym miejscu
 */

import express from 'express';
import reservationsRouter from './reservations.js';
import rentalsRouter from './rentals.js';
import skisRouter from './skis.js';
import historyRouter from './history.js';
import fireSnowRouter from './firesnow.js';
import authRouter from './auth.js';
import { fireSnowController } from '../controllers/fireSnowController.js';
import { optionalEmployeeAuth } from '../middleware/authMiddleware.js';
import type { AppRequest, AppResponse } from '../types/express.types.js';
import { ERROR_CODES } from '../middleware/errorHandler.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/reservations', reservationsRouter);
router.use('/wypozyczenia', rentalsRouter);
router.use('/skis', skisRouter);
router.use('/historia', historyRouter);
router.use('/firesnow', fireSnowRouter);

router.get('/dostepnosc/okres', optionalEmployeeAuth, fireSnowController.getAvailability);

// Health check
router.get('/health', (_req: AppRequest, res: AppResponse) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Serwer asystenta nart działa poprawnie'
    });
});

// Nieznane endpointy API - JSON zamiast HTML
router.use((_req: AppRequest, res: AppResponse) => {
    res.status(404).json({ success: false, error: { message: 'Nie znaleziono zasobu', code: ERROR_CODES.NOT_FOUND } });
});

export default router;






