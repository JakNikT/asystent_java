/**
 * src/server/routes/skis.ts: Route'y dla sprzętu narciarskiego
 */

import express from 'express';
import { equipmentController } from '../controllers/equipmentController.js';
import { requireEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', equipmentController.getAll);
router.put('/bulk', requireEmployeeAuth, equipmentController.bulkUpdate); // Must be before /:id
router.put('/:id', requireEmployeeAuth, equipmentController.update);

export default router;






