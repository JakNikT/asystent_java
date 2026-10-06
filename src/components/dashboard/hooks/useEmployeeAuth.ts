import { useState, useEffect } from 'react';
import { createLogger } from '../../../utils/logger';
import { AuthService } from '../../../services/authService';
import type { AppMode } from '../../../types/dashboard.types';

const logger = createLogger('useEmployeeAuth');

export interface UseEmployeeAuthReturn {
    isEmployeeMode: boolean;
    isPasswordModalOpen: boolean;
    passwordError: string;
    handlePasswordSubmit: (password: string) => Promise<void>;
    handleToggleEmployeeMode: (appMode: AppMode, setAppMode: (mode: AppMode) => void) => Promise<void>;
    setIsPasswordModalOpen: (isOpen: boolean) => void;
    setPasswordError: (error: string) => void;
    setIsEmployeeMode: (isEmployee: boolean) => void;
}

export const useEmployeeAuth = (): UseEmployeeAuthReturn => {
    const [isEmployeeMode, setIsEmployeeMode] = useState<boolean>(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordError, setPasswordError] = useState<string>('');

    // Weryfikacja aktywnej sesji pracownika przy uruchomieniu aplikacji
    useEffect(() => {
        AuthService.checkStatus().then(authenticated => {
            if (authenticated) {
                logger.info('useEmployeeAuth: Wykryto aktywną sesję pracownika');
                setIsEmployeeMode(true);
            }
        });
    }, []);

    const handlePasswordSubmit = async (password: string): Promise<void> => {
        logger.info('useEmployeeAuth: Weryfikacja hasła pracownika przez serwer');
        const result = await AuthService.login(password);
        if (result.success) {
            logger.info('useEmployeeAuth: Hasło poprawne - przełączanie na tryb pracownika');
            setIsEmployeeMode(true);
            setIsPasswordModalOpen(false);
            setPasswordError('');
        } else {
            logger.warn('useEmployeeAuth: Hasło błędne lub brak uprawnień');
            setPasswordError(result.error || 'Nieprawidłowe hasło. Spróbuj ponownie.');
        }
    };

    const handleToggleEmployeeMode = async (appMode: AppMode, setAppMode: (mode: AppMode) => void): Promise<void> => {
        if (isEmployeeMode) {
            logger.info('useEmployeeAuth: Wylogowanie - przełączanie na tryb klienta');
            await AuthService.logout();
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
