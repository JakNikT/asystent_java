import { useState } from 'react';
import { createLogger } from '../../../utils/logger';
import type { AppMode } from '../../../types/dashboard.types';

const logger = createLogger('useEmployeeAuth');
const EMPLOYEE_PASSWORD = "0000";

export interface UseEmployeeAuthReturn {
    isEmployeeMode: boolean;
    isPasswordModalOpen: boolean;
    passwordError: string;
    handlePasswordSubmit: (password: string) => void;
    handleToggleEmployeeMode: (appMode: AppMode, setAppMode: (mode: AppMode) => void) => void;
    setIsPasswordModalOpen: (isOpen: boolean) => void;
    setPasswordError: (error: string) => void;
    setIsEmployeeMode: (isEmployee: boolean) => void;
}

export const useEmployeeAuth = (): UseEmployeeAuthReturn => {
    const [isEmployeeMode, setIsEmployeeMode] = useState<boolean>(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordError, setPasswordError] = useState<string>('');

    const handlePasswordSubmit = (password: string) => {
        logger.info('useEmployeeAuth: Weryfikacja hasła pracownika');
        if (password === EMPLOYEE_PASSWORD) {
            logger.info('useEmployeeAuth: Hasło poprawne - przełączanie na tryb pracownika');
            setIsEmployeeMode(true);
            setIsPasswordModalOpen(false);
            setPasswordError('');
        } else {
            logger.info('useEmployeeAuth: Hasło błędne - pozostanie w trybie klienta');
            setPasswordError('Nieprawidłowe hasło. Spróbuj ponownie.');
        }
    };

    const handleToggleEmployeeMode = (appMode: AppMode, setAppMode: (mode: AppMode) => void) => {
        if (isEmployeeMode) {
            logger.info('useEmployeeAuth: Wylogowanie - przełączanie na tryb klienta');
            setIsEmployeeMode(false);
            if (appMode === 'reservations') {
                setAppMode('search');
            }
        } else {
            setIsPasswordModalOpen(true);
            setPasswordError('');
        }
    };

    return {
        isEmployeeMode,
        isPasswordModalOpen,
        passwordError,
        handlePasswordSubmit,
        handleToggleEmployeeMode,
        setIsPasswordModalOpen,
        setPasswordError,
        setIsEmployeeMode
    };
};
