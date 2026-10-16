/**
 * src/server/routes/firesnow.ts: Route'y dla FireSnow API
 */

import express from 'express';
import { fireSnowController } from '../controllers/fireSnowController.js';
import { requireEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/status', fireSnowController.checkHealth);
router.post('/refresh', requireEmployeeAuth, fireSnowController.refreshCache);

export default router;






