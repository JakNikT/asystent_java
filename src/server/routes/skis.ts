/**
 * src/server/routes/skis.ts: Route'y dla sprzętu narciarskiego
 */

import express from 'express';
import { equipmentController } from '../controllers/equipmentController.js';

const router = express.Router();

router.get('/', equipmentController.getAll);
router.post('/', equipmentController.create);
router.put('/bulk', equipmentController.bulkUpdate); // Must be before /:id
router.put('/:id', equipmentController.update);

export default router;



