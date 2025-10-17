/**
 * src/components/SkiEditModal.tsx: Modal do edycji i dodawania nart
 */

import React, { useState, useEffect } from 'react';
import type { SkiData } from '../types/ski.types';

interface SkiEditModalProps {
  isOpen: boolean;
  mode: 'edit' | 'add';
  ski?: SkiData;
  onClose: () => void;
  onSave: (skiData: Partial<SkiData>) => Promise<void>;
}

export const SkiEditModal: React.FC<SkiEditModalProps> = ({
  isOpen,
  mode,
  ski,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<SkiData>>({
    MARKA: '',
    MODEL: '',
    DLUGOSC: 150,
    ILOSC: 1,
    POZIOM: '',
    PLEC: 'U',
    WAGA_MIN: 50,
    WAGA_MAX: 90,
    WZROST_MIN: 160,
    WZROST_MAX: 180,
    PRZEZNACZENIE: 'SLG',
    ATUTY: '',
    ROK: new Date().getFullYear(),
    KOD: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Załaduj dane narty przy edycji
  useEffect(() => {
    if (mode === 'edit' && ski) {
      setFormData(ski);
    } else if (mode === 'add') {
      // Resetuj formularz dla nowej narty
      setFormData({
        MARKA: '',
        MODEL: '',
        DLUGOSC: 150,
        ILOSC: 1,
        POZIOM: '',
        PLEC: 'U',
        WAGA_MIN: 50,
        WAGA_MAX: 90,
        WZROST_MIN: 160,
        WZROST_MAX: 180,
        PRZEZNACZENIE: 'SLG',
        ATUTY: '',
        ROK: new Date().getFullYear(),
        KOD: ''
      });
    }
  }, [mode, ski]);

  // Walidacja formularza
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.MARKA?.trim()) {
      newErrors.MARKA = 'Marka jest wymagana';
    }
    if (!formData.MODEL?.trim()) {
      newErrors.MODEL = 'Model jest wymagany';
    }
    if (!formData.POZIOM?.trim()) {
      newErrors.POZIOM = 'Poziom jest wymagany';
    }
    if ((formData.DLUGOSC || 0) < 100 || (formData.DLUGOSC || 0) > 220) {
      newErrors.DLUGOSC = 'Długość musi być między 100 a 220 cm';
    }
    if ((formData.WAGA_MIN || 0) >= (formData.WAGA_MAX || 0)) {
      newErrors.WAGA_MIN = 'Waga minimalna musi być mniejsza niż maksymalna';
    }
    if ((formData.WZROST_MIN || 0) >= (formData.WZROST_MAX || 0)) {
      newErrors.WZROST_MIN = 'Wzrost minimalny musi być mniejszy niż maksymalny';
    }
    if ((formData.ILOSC || 0) < 1) {
      newErrors.ILOSC = 'Ilość musi być większa niż 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Obsługa zmiany pól
  const handleChange = (field: keyof SkiData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Usuń błąd dla tego pola
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Obsługa zapisu
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Błąd zapisywania narty:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#194576] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#194576] border-b border-[#2C699F] p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'edit' ? '✏️ Edytuj nartę' : '➕ Dodaj nową nartę'}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-red-400 text-2xl font-bold"
              disabled={isSaving}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Formularz */}
        <div className="p-6 space-y-6">
          {/* Podstawowe dane */}
          <div className="bg-[#2C699F] p-4 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4">📋 Podstawowe dane</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Marka */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Marka *
                </label>
                <input
                  type="text"
                  value={formData.MARKA || ''}
                  onChange={(e) => handleChange('MARKA', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-2 rounded-lg ${
                    errors.MARKA 
                      ? 'bg-red-100 border-2 border-red-500 text-red-900' 
                      : 'bg-[#A6C2EF] text-[#194576]'
                  }`}
                  placeholder="np. ATOMIC, ROSSIGNOL"
                />
                {errors.MARKA && (
                  <p className="text-red-300 text-sm mt-1">{errors.MARKA}</p>
                )}
              </div>

              {/* Model */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Model *
                </label>
                <input
                  type="text"
                  value={formData.MODEL || ''}
                  onChange={(e) => handleChange('MODEL', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-2 rounded-lg ${
                    errors.MODEL 
                      ? 'bg-red-100 border-2 border-red-500 text-red-900' 
                      : 'bg-[#A6C2EF] text-[#194576]'
                  }`}
                  placeholder="np. REDSTER G9"
                />
                {errors.MODEL && (
                  <p className="text-red-300 text-sm mt-1">{errors.MODEL}</p>
                )}
              </div>

              {/* Długość */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Długość (cm) *
                </label>
                <input
                  type="number"
                  value={formData.DLUGOSC || ''}
                  onChange={(e) => handleChange('DLUGOSC', parseInt(e.target.value))}
                  className={`w-full px-4 py-2 rounded-lg ${
                    errors.DLUGOSC 
                      ? 'bg-red-100 border-2 border-red-500 text-red-900' 
                      : 'bg-[#A6C2EF] text-[#194576]'
                  }`}
                  min="100"
                  max="220"
                />
                {errors.DLUGOSC && (
                  <p className="text-red-300 text-sm mt-1">{errors.DLUGOSC}</p>
                )}
              </div>

              {/* Ilość */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Ilość sztuk *
                </label>
                <input
                  type="number"
                  value={formData.ILOSC || ''}
                  onChange={(e) => handleChange('ILOSC', parseInt(e.target.value))}
                  className={`w-full px-4 py-2 rounded-lg ${
                    errors.ILOSC 
                      ? 'bg-red-100 border-2 border-red-500 text-red-900' 
                      : 'bg-[#A6C2EF] text-[#194576]'
                  }`}
                  min="1"
                />
                {errors.ILOSC && (
                  <p className="text-red-300 text-sm mt-1">{errors.ILOSC}</p>
                )}
              </div>

              {/* Rok */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Rok produkcji
                </label>
                <input
                  type="number"
                  value={formData.ROK || ''}
                  onChange={(e) => handleChange('ROK', parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg bg-[#A6C2EF] text-[#194576]"
                  min="2020"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              {/* Kod */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Kod {mode === 'add' && '(automatyczny)'}
                </label>
                <input
                  type="text"
                  value={formData.KOD || ''}
                  onChange={(e) => handleChange('KOD', e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 rounded-lg bg-[#A6C2EF] text-[#194576]"
                  placeholder={mode === 'add' ? 'Zostanie wygenerowany' : 'np. A01234'}
                  disabled={mode === 'add'}
                />
              </div>
            </div>
          </div>

          {/* Charakterystyka użytkownika */}
          <div className="bg-[#2C699F] p-4 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4">👤 Charakterystyka użytkownika</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Poziom */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Poziom zaawansowania *
                </label>
                <input
                  type="text"
                  value={formData.POZIOM || ''}
                  onChange={(e) => handleChange('POZIOM', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-2 rounded-lg ${
                    errors.POZIOM 
                      ? 'bg-red-100 border-2 border-red-500 text-red-900' 
                      : 'bg-[#A6C2EF] text-[#194576]'
                  }`}
                  placeholder="np. 6M, 8K, 10M"
                />
                {errors.POZIOM && (
                  <p className="text-red-300 text-sm mt-1">{errors.POZIOM}</p>
                )}
                <p className="text-[#A6C2EF] text-xs mt-1">
                  Format: liczba + M (męskie) lub K (kobiece), np. 6M, 8K
                </p>
              </div>

              {/* Płeć */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Płeć
                </label>
                <select
                  value={formData.PLEC || 'U'}
                  onChange={(e) => handleChange('PLEC', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[#A6C2EF] text-[#194576]"
                >
                  <option value="M">Mężczyzna</option>
                  <option value="K">Kobieta</option>
                  <option value="U">Uniwersalne</option>
                </select>
              </div>

              {/* Waga MIN */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Waga minimalna (kg)
                </label>
                <input
                  type="number"
                  value={formData.WAGA_MIN || ''}
                  onChange={(e) => handleChange('WAGA_MIN', parseInt(e.target.value))}
                  className={`w-full px-4 py-2 rounded-lg ${
                    errors.WAGA_MIN 
                      ? 'bg-red-100 border-2 border-red-500 text-red-900' 
                      : 'bg-[#A6C2EF] text-[#194576]'
                  }`}
                />
                {errors.WAGA_MIN && (
                  <p className="text-red-300 text-sm mt-1">{errors.WAGA_MIN}</p>
                )}
              </div>

              {/* Waga MAX */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Waga maksymalna (kg)
                </label>
                <input
                  type="number"
                  value={formData.WAGA_MAX || ''}
                  onChange={(e) => handleChange('WAGA_MAX', parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg bg-[#A6C2EF] text-[#194576]"
                />
              </div>

              {/* Wzrost MIN */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Wzrost minimalny (cm)
                </label>
                <input
                  type="number"
                  value={formData.WZROST_MIN || ''}
                  onChange={(e) => handleChange('WZROST_MIN', parseInt(e.target.value))}
                  className={`w-full px-4 py-2 rounded-lg ${
                    errors.WZROST_MIN 
                      ? 'bg-red-100 border-2 border-red-500 text-red-900' 
                      : 'bg-[#A6C2EF] text-[#194576]'
                  }`}
                />
                {errors.WZROST_MIN && (
                  <p className="text-red-300 text-sm mt-1">{errors.WZROST_MIN}</p>
                )}
              </div>

              {/* Wzrost MAX */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Wzrost maksymalny (cm)
                </label>
                <input
                  type="number"
                  value={formData.WZROST_MAX || ''}
                  onChange={(e) => handleChange('WZROST_MAX', parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg bg-[#A6C2EF] text-[#194576]"
                />
              </div>
            </div>
          </div>

          {/* Charakterystyka nart */}
          <div className="bg-[#2C699F] p-4 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4">⛷️ Charakterystyka nart</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Przeznaczenie */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Przeznaczenie
                </label>
                <select
                  value={formData.PRZEZNACZENIE || 'SLG'}
                  onChange={(e) => handleChange('PRZEZNACZENIE', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[#A6C2EF] text-[#194576]"
                >
                  <option value="SL">Slalom (SL)</option>
                  <option value="G">Gigant (G)</option>
                  <option value="SLG">Pomiędzy (SLG)</option>
                  <option value="OFF">Poza trasę (OFF)</option>
                </select>
              </div>

              {/* Atuty */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Atuty
                </label>
                <input
                  type="text"
                  value={formData.ATUTY || ''}
                  onChange={(e) => handleChange('ATUTY', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[#A6C2EF] text-[#194576]"
                  placeholder="np. C (carving), premium"
                />
                <p className="text-[#A6C2EF] text-xs mt-1">
                  Oddziel przecinkami, np: C, premium
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#194576] border-t border-[#2C699F] p-6">
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Zapisywanie...
                </>
              ) : (
                <>
                  💾 {mode === 'edit' ? 'Zapisz zmiany' : 'Dodaj nartę'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

