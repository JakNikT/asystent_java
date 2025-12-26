/**
 * src/server/routes/rentals.ts: Route'y dla wypożyczeń
 */

import express from 'express';
import { rentalController } from '../controllers/rentalController.js';

const router = express.Router();

router.get('/aktualne', rentalController.getActive);
router.get('/przeszle', rentalController.getPast);

export default router;




