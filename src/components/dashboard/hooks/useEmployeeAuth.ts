import { useState, useEffect } from 'react';
import { createLogger } from '../../../utils/logger';
import { AuthService, AUTH_EXPIRED_EVENT } from '../../../services/authService';
import { clearHandoutState } from '../../../utils/localStorage';
import type { AppMode } from '../../../types/dashboard.types';

const logger = createLogger('useEmployeeAuth');

export interface UseEmployeeAuthReturn {
    isEmployeeMode: boolean;
    isPasswordModalOpen: boolean;
    passwordError: string;
    handlePasswordSubmit: (password: string) => Promise<void>;
    handleToggleEmployeeMode: () => Promise<void>;
    setIsPasswordModalOpen: (isOpen: boolean) => void;
    setPasswordError: (error: string) => void;
    setIsEmployeeMode: (isEmployee: boolean) => void;
}

export const useEmployeeAuth = (
    appMode: AppMode,
    setAppMode: (mode: AppMode) => void
): UseEmployeeAuthReturn => {
    const [isEmployeeMode, setIsEmployeeMode] = useState<boolean>(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordError, setPasswordError] = useState<string>('');

    // Wyjście z trybu pracownika: widoki z danymi klientów wracają do wyszukiwania, zapisany klient jest czyszczony
    const leaveEmployeeMode = () => {
        setIsEmployeeMode(false);
        clearHandoutState();
        if (appMode === 'reservations' || appMode === 'history') {
            setAppMode('search');
        }
    };

    // Sesja wygasła (401 z API) - wyloguj w UI
    useEffect(() => {
        const onExpired = () => {
            logger.warn('useEmployeeAuth: Sesja pracownika wygasła - przełączanie na tryb klienta');
            leaveEmployeeMode();
        };
        window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- leaveEmployeeMode zależy wyłącznie od appMode/setAppMode
    }, [appMode, setAppMode]);

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

    const handleToggleEmployeeMode = async (): Promise<void> => {
        if (isEmployeeMode) {
            logger.info('useEmployeeAuth: Wylogowanie - przełączanie na tryb klienta');
            await AuthService.logout();
            leaveEmployeeMode();
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
