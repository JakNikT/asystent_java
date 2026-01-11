import { useState } from 'react';
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
            // W przypadku błędu, SkiDataService powinien obsłużyć fallback do CSV,
            // ale tutaj możemy dodać dodatkową obsługę błędów UI jeśli potrzebna
        }
    };

    return {
        skisDatabase,
        loadDatabase,
        setSkisDatabase
    };
};
