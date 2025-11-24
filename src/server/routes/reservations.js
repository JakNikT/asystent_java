import express from 'express';
import { reservationController } from '../controllers/reservationController.js';

const router = express.Router();

router.get('/', reservationController.getAll);
router.post('/', reservationController.create);
router.put('/:id', reservationController.update);
router.delete('/:id', reservationController.delete);

export default router;
