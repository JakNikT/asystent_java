/**
 * src/server/routes/auth.ts: Trasy uwierzytelniania pracowników
 */

import express from 'express';
import { authController } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/status', authController.status);

export default router;
