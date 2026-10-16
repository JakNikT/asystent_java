/**
 * src/server/routes/rentals.ts: Route'y dla wypożyczeń
 */

import express from 'express';
import { rentalController } from '../controllers/rentalController.js';
import { requireEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Wypożyczenia (dane osobowe klientów) wymagają autoryzacji pracownika
router.use(requireEmployeeAuth);

router.get('/aktualne', rentalController.getActive);
router.get('/przeszle', rentalController.getPast);

export default router;






