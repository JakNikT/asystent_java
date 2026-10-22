/**
 * src/server/routes/history.ts: Route'y dla historii klientów
 */

import express from 'express';
import { historyController } from '../controllers/historyController.js';
import { requireEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Historia klientów (dane osobowe) wymaga autoryzacji pracownika
router.use(requireEmployeeAuth);

router.get('/klienci/wyszukaj', historyController.searchClients);
router.get('/klient/:id/daty', historyController.getClientDates);
router.get('/klient/:id/sprzet', historyController.getClientEquipment);

// Historia z FireSnow (wypożyczenia z bieżących sezonów)
router.get('/firesnow/klienci/wyszukaj', historyController.searchFireSnowClients);
router.get('/firesnow/klient/:id/daty', historyController.getFireSnowClientDates);
router.get('/firesnow/klient/:id/sprzet', historyController.getFireSnowClientEquipment);

export default router;






