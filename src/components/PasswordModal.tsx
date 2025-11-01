// src/components/PasswordModal.tsx
import React, { useState, useEffect } from 'react';

interface PasswordModalProps {
  onClose: () => void;
  onSubmit: (password: string) => void;
  errorMessage?: string;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onClose, onSubmit, errorMessage }) => {
  const [password, setPassword] = useState('');

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2C699F] p-6 rounded-lg shadow-xl border border-white">
        <h2 className="text-white text-lg font-bold mb-4">Wprowadź hasło</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-[#194576] text-white border border-gray-400"
            autoFocus
          />
          {errorMessage && (
            <div className="mt-2 text-red-300 text-sm font-medium">
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
