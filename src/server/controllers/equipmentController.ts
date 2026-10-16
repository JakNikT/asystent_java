/**
 * src/server/controllers/equipmentController.ts: Kontroler do obsługi sprzętu narciarskiego
 */

import { equipmentService } from '../services/equipmentService.js';
import type { NextFunction } from 'express';
import type { AppRequest, AppResponse } from '../types/express.types.js';
import type { UpdateEquipmentData } from '../types/services.types.js';

const MAX_TEXT_LENGTH = 255;
const TEXT_FIELDS = ['TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'PLEC', 'KOD', 'POZIOM', 'PRZEZNACZENIE', 'ATUTY'] as const;
const NUMERIC_FIELDS = ['DLUGOSC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX'] as const;

/**
 * Waliduje ciało żądania i zwraca kopię zawierającą wyłącznie znane pola
 * (teksty: string do 255 znaków; liczby: number lub null). Zwraca null dla nieprawidłowych danych.
 */
function parseUpdateData(body: unknown): UpdateEquipmentData | null {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;

    const source: Record<string, unknown> = { ...body };
    const result: UpdateEquipmentData = {};

    for (const field of TEXT_FIELDS) {
        const value = source[field];
        if (value === undefined) continue;
        if (typeof value !== 'string' || value.length > MAX_TEXT_LENGTH) return null;
        result[field] = value;
    }

    for (const field of NUMERIC_FIELDS) {
        const value = source[field];
        if (value === undefined) continue;
        if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) return null;
        result[field] = value;
    }

    return result;
}

export const equipmentController = {
    /**
     * Pobiera wszystkie urządzenia
     */
    async getAll(_req: AppRequest, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const data = await equipmentService.getAll();
            res.json(data);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Aktualizuje istniejący sprzęt
     */
    async update(req: AppRequest<{ id: string }, unknown, unknown>, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const updates = parseUpdateData(req.body);
            if (!updates) {
                res.status(400).json({ error: 'Nieprawidłowe dane wejściowe' });
                return;
            }

            const data = await equipmentService.update(req.params.id, updates);
            if (!data) {
                res.status(404).json({ error: 'Narta nie znaleziona' });
                return;
            }
            res.json(data);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Masowa aktualizacja wielu sprzętów
     */
    async bulkUpdate(
        req: AppRequest<unknown, unknown, unknown>,
        res: AppResponse,
        next: NextFunction
    ): Promise<void> {
        try {
            const body: Record<string, unknown> = typeof req.body === 'object' && req.body !== null ? { ...req.body } : {};
            const { ids } = body;
            const updates = parseUpdateData(body.updates);
            if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === 'string') || !updates) {
                res.status(400).json({ error: 'Nieprawidłowe dane wejściowe' });
                return;
            }

            const data = await equipmentService.bulkUpdate(ids, updates);
            if (data.length === 0) {
                res.status(404).json({ error: 'Nie znaleziono nart o podanych ID' });
                return;
            }

            res.json(data);
        } catch (error) {
            next(error);
        }
    }
};






