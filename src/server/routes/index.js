import express from 'express';
import reservationsRouter from './reservations.js';
import rentalsRouter from './rentals.js';
import skisRouter from './skis.js';
import historyRouter from './history.js';
import fireSnowRouter from './firesnow.js';
import { fireSnowController } from '../controllers/fireSnowController.js';

const router = express.Router();

router.use('/reservations', reservationsRouter);
router.use('/wypozyczenia', rentalsRouter);
router.use('/skis', skisRouter);
router.use('/historia', historyRouter);
router.use('/firesnow', fireSnowRouter);

// Special route from server.js
router.get('/dostepnosc/okres', fireSnowController.getAvailability);

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Serwer asystenta nart działa poprawnie'
    });
});

export default router;
