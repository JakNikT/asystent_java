/**
 * src/App.tsx: Główny komponent aplikacji
 * Integruje Error Boundary i Toast Provider dla globalnej obsługi błędów i powiadomień
 */

import { Dashboard } from './components/dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './hooks/useToast';
import './App.css';

function App() {
    return (
        <ToastProvider>
            <ErrorBoundary>
                <Dashboard />
            </ErrorBoundary>
        </ToastProvider>
    );
}

export default App;
