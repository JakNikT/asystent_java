// src/components/PasswordModal.tsx
import React, { useState, useEffect, useId } from 'react';

interface PasswordModalProps {
  onClose: () => void;
  onSubmit: (password: string) => Promise<void> | void;
  errorMessage?: string;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onClose, onSubmit, errorMessage }) => {
  const [password, setPassword] = useState('');
  const titleId = useId();
  const inputId = useId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  // Wyczyść pole hasła gdy pojawia się błąd
  useEffect(() => {
    if (errorMessage) {
      setPassword('');
    }
  }, [errorMessage]);

  // Zamykanie klawiszem Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-[#2C699F] p-6 rounded-lg shadow-2xl border border-white/20 min-w-[320px]"
      >
        <h2 id={titleId} className="text-white text-lg font-bold mb-4">Wprowadź hasło</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor={inputId} className="sr-only">Hasło pracownika</label>
          <input
            id={inputId}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-[#194576] text-white border border-gray-400"
            autoFocus
          />
          {errorMessage && (
            <div role="alert" className="mt-2 text-red-300 text-sm font-medium">
              {errorMessage}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Zatwierdź
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;
