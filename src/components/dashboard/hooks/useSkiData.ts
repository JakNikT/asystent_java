
import React, { useState, useEffect, useRef } from 'react';
import { SkiDataService } from '../../../services/skiDataService';
import type { SkiData } from '../../../types/ski.types';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('useSkiData');

export interface UseSkiDataReturn {
    skisDatabase: SkiData[];
    loadDatabase: () => Promise<void>;
    setSkisDatabase: React.Dispatch<React.SetStateAction<SkiData[]>>;
}

export const useSkiData = (): UseSkiDataReturn => {
    const [skisDatabase, setSkisDatabase] = useState<SkiData[]>([]);

    // Dodajemy useRef żeby uniknąć podwójnego ładowania w React 18 Strict Mode
    const loadedRef = useRef(false);

    const loadDatabase = async () => {
        logger.info('useSkiData: Rozpoczynanie ładowania bazy danych nart...');
        try {
            // Wymuszamy odświeżenie cache przy starcie aplikacji
            SkiDataService.clearCache();
            const data = await SkiDataService.getAllSkis();
            setSkisDatabase(data);
            logger.info(`useSkiData: Załadowano ${data.length} nart do stanu`);
        } catch (error) {
            logger.error('useSkiData: Błąd podczas ładowania bazy nart:', error);
            // W przypadku błędu, SkiDataService powinien obsłużyć fallback do CSV
        }
    };

    // Automatyczne ładowanie przy starcie
    useEffect(() => {
        if (!loadedRef.current) {
            loadedRef.current = true;
            loadDatabase();
        }
    }, []);

    return {
        skisDatabase,
        loadDatabase,
        setSkisDatabase
    };
};
