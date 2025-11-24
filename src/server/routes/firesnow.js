import express from 'express';
import { fireSnowController } from '../controllers/fireSnowController.js';

const router = express.Router();

router.get('/status', fireSnowController.checkHealth);
router.post('/refresh', fireSnowController.refreshCache);

export default router;
