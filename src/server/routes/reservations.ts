/**
 * src/server/routes/reservations.ts: Route'y dla rezerwacji
 */

import express from 'express';
import { reservationController } from '../controllers/reservationController.js';
import { requireEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Wszystkie operacje na rezerwacjach (dane osobowe klientów) wymagają autoryzacji pracownika
router.use(requireEmployeeAuth);

router.get('/date', reservationController.getForDate);
router.get('/', reservationController.getAll);

export default router;






