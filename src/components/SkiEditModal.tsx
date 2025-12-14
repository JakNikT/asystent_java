/**
 * src/components/SkiEditModal.tsx: Modal do edycji i dodawania nart
 */

import React, { useState, useEffect } from 'react';
import type { SkiData } from '../types/ski.types';
import { createLogger } from '../utils/logger';

interface SkiEditModalProps {
  isOpen: boolean;
  mode: 'edit' | 'add';
  ski?: SkiData;
  allSkisInGroup?: SkiData[]; // NOWE: tablica wszystkich nart w grupie
  onClose: () => void;
  onSave: (skiData: Partial<SkiData>, selectedSkiId?: string, updateAll?: boolean) => Promise<void>;
}

export const SkiEditModal: React.FC<SkiEditModalProps> = ({
  isOpen,
  mode,
  ski,
  allSkisInGroup,
  onClose,
  onSave
}) => {
  // src/components/SkiEditModal.tsx: Logger dla SkiEditModal
  const logger = createLogger('SkiEditModal');

  const [formData, setFormData] = useState<Partial<SkiData>>({
    TYP_SPRZETU: 'NARTY',
    KATEGORIA: '',
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
    KOD: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]); // NOWE: Ostrzeżenia o niekompletnych danych
  const [selectedSkiIndex, setSelectedSkiIndex] = useState<number>(-1); // -1 = wszystkie
  const [skisInGroup, setSkisInGroup] = useState<SkiData[]>([]);

  // Załaduj listę nart w grupie
  useEffect(() => {
    if (allSkisInGroup && allSkisInGroup.length > 0) {
      setSkisInGroup(allSkisInGroup);
      setSelectedSkiIndex(-1); // Domyślnie "Wszystkie"
      logger.info('Załadowano grupę nart:', allSkisInGroup.length);
    } else {
      setSkisInGroup([]);
      setSelectedSkiIndex(-1);
    }
  }, [allSkisInGroup]);

  // Załaduj dane narty przy edycji
  useEffect(() => {
    if (mode === 'edit' && ski) {
      // Przy edycji: ustaw domyślne wartości dla pustych pól
      setFormData({
        ...ski,
        TYP_SPRZETU: ski.TYP_SPRZETU || 'NARTY',
        KATEGORIA: ski.KATEGORIA || '',
        PRZEZNACZENIE: ski.PRZEZNACZENIE || 'SLG'
      });
      logger.info('Załadowano nartę do edycji:', ski.ID, {
        TYP_SPRZETU: ski.TYP_SPRZETU || 'NARTY',
        KATEGORIA: ski.KATEGORIA || 'brak',
        PRZEZNACZENIE: ski.PRZEZNACZENIE || 'SLG'
      });
    } else if (mode === 'add') {
      // Resetuj formularz dla nowej narty
      setFormData({
        TYP_SPRZETU: 'NARTY',
        KATEGORIA: '',
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
        KOD: ''
      });
    }
  }, [mode, ski]);

  // Walidacja formularza - UPROSZCZONA: tylko krytyczne pola
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newWarnings: string[] = [];

    // === KRYTYCZNE POLA (wymagane do zapisu) ===
    if (!formData.MARKA?.trim()) {
      newErrors.MARKA = 'Marka jest wymagana';
    }
    if (!formData.MODEL?.trim()) {
      newErrors.MODEL = 'Model jest wymagany';
    }
    if ((formData.DLUGOSC || 0) < 100 || (formData.DLUGOSC || 0) > 220) {
      newErrors.DLUGOSC = 'Długość musi być między 100 a 220 cm';
    }
    if ((formData.ILOSC || 0) < 1) {
      newErrors.ILOSC = 'Ilość musi być większa niż 0';
    }

    // === WALIDACJA LOGICZNA (jeśli pola są uzupełnione) ===
    if (formData.WAGA_MIN && formData.WAGA_MAX && formData.WAGA_MIN >= formData.WAGA_MAX) {
      newErrors.WAGA_MIN = 'Waga minimalna musi być mniejsza niż maksymalna';
    }
    if (formData.WZROST_MIN && formData.WZROST_MAX && formData.WZROST_MIN >= formData.WZROST_MAX) {
      newErrors.WZROST_MIN = 'Wzrost minimalny musi być mniejszy niż maksymalny';
    }

    // === OSTRZEŻENIA (pola potrzebne do wyszukiwania) ===
    const missingFields: string[] = [];
    
    if (!formData.POZIOM?.trim()) {
      missingFields.push('POZIOM');
    }
    if (!formData.PLEC?.trim()) {
      missingFields.push('PŁEĆ');
    }
    if (!formData.WAGA_MIN || !formData.WAGA_MAX) {
      missingFields.push('ZAKRES WAGI');
    }
    if (!formData.WZROST_MIN || !formData.WZROST_MAX) {
      missingFields.push('ZAKRES WZROSTU');
    }
    if (!formData.PRZEZNACZENIE?.trim()) {
      missingFields.push('PRZEZNACZENIE');
    }

    if (missingFields.length > 0) {
      newWarnings.push(
        `⚠️ UWAGA: Brakuje pól: ${missingFields.join(', ')}.`
      );
      newWarnings.push(
        `Ta narta NIE BĘDZIE WYŚWIETLANA w wynikach wyszukiwania, dopóki nie uzupełnisz wszystkich danych.`
      );
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
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
      logger.info('Zapisuję dane narty:', formData);
      logger.debug('KATEGORIA przed zapisem:', formData.KATEGORIA);
      logger.debug('TYP_SPRZETU przed zapisem:', formData.TYP_SPRZETU);
      logger.debug('PRZEZNACZENIE przed zapisem:', formData.PRZEZNACZENIE);

      const updateAll = selectedSkiIndex === -1 && skisInGroup.length > 1;
      const targetSkiId = updateAll ? undefined : (selectedSkiIndex >= 0 ? skisInGroup[selectedSkiIndex]?.ID : ski?.ID);

      logger.debug('updateAll:', updateAll, 'targetSkiId:', targetSkiId);

      await onSave(formData, targetSkiId, updateAll);
      // Toast success i error są już pokazywane przez skiDataService
      onClose();
    } catch (error) {
      // src/components/SkiEditModal.tsx: Logowanie błędu
      // Wszystkie błędy są już obsłużone przez skiDataService (pokazuje toast i zwraca null)
      // BrowseSkisComponent rzuca błąd tylko gdy skiDataService zwróci null (już pokazał toast)
      // Więc nie musimy pokazywać toast tutaj - wszystkie błędy są już obsłużone
      logger.error('Błąd zapisywania narty:', error);
      // NIE zamykamy modala w przypadku błędu - użytkownik może spróbować ponownie
      // isSaving zostanie zresetowany w finally
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-[#194576] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
        {/* Header - responsywny */}
        <div className="sticky top-0 bg-[#194576] border-b border-[#2C699F] p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
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

        {/* Dropdown wyboru narty - tylko w trybie edycji z wieloma nartami */}
        {mode === 'edit' && skisInGroup.length > 1 && (
          <div className="bg-[#2C699F] p-4 mx-6 mt-4 rounded-lg">
            <label className="block text-white font-medium mb-2">
              Która narta edytować?
            </label>
            <select
              value={selectedSkiIndex}
              onChange={(e) => setSelectedSkiIndex(parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-lg bg-[#A6C2EF] text-[#194576] font-medium"
            >
              <option value={-1}>✨ Wszystkie ({skisInGroup.length} szt.)</option>
              {skisInGroup.map((s, idx) => (
                <option key={s.ID} value={idx}>
                  {idx + 1}/{s.KOD}
                </option>
              ))}
            </select>
            {selectedSkiIndex === -1 && (
              <p className="text-[#A6C2EF] text-sm mt-2">
                ⚠️ Zmiany zostaną zastosowane do wszystkich {skisInGroup.length} nart (oprócz kodu)
              </p>
            )}
            {selectedSkiIndex >= 0 && (
              <p className="text-[#A6C2EF] text-sm mt-2">
                ✏️ Edytujesz nartę: {skisInGroup[selectedSkiIndex].ID} / {skisInGroup[selectedSkiIndex].KOD}
              </p>
            )}
          </div>
        )}

        {/* Formularz - responsywny */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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

              {/* Typ sprzętu */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Typ sprzętu
                </label>
                <select
                  value={formData.TYP_SPRZETU || 'NARTY'}
                  onChange={(e) => handleChange('TYP_SPRZETU', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[#A6C2EF] text-[#194576]"
                >
                  <option value="NARTY">⛷️ Narty</option>
                  <option value="BUTY">🥾 Buty narciarskie</option>
                  <option value="DESKI">🏂 Deski snowboard</option>
                  <option value="BUTY_SNOWBOARD">👢 Buty snowboardowe</option>
                </select>
              </div>

              {/* Kategoria */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Kategoria 🏷️
                  <span className="text-xs text-[#A6C2EF] ml-2">(poziom cenowy/jakości)</span>
                </label>
                <select
                  value={formData.KATEGORIA || ''}
                  onChange={(e) => handleChange('KATEGORIA', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[#A6C2EF] text-[#194576]"
                  title="Wybierz kategorię: VIP (najdroższe), TOP (zaawansowane), JUNIOR (dzieci), DOROSŁE (standard)"
                >
                  <option value="">Brak kategorii</option>
                  <option value="VIP">⭐ VIP (Premium)</option>
                  <option value="TOP">🔵 TOP (Zaawansowane)</option>
                  <option value="JUNIOR">👶 Junior (Dzieci)</option>
                  <option value="DOROSLE">👤 Dorosłe (Standard)</option>
                </select>
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

              {/* Kod */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Kod {mode === 'add' && '(automatyczny)'}
                  {selectedSkiIndex === -1 && skisInGroup.length > 1 && ' (zablokowane dla wszystkich)'}
                </label>
                <input
                  type="text"
                  value={formData.KOD || ''}
                  onChange={(e) => handleChange('KOD', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-2 rounded-lg ${
                    (selectedSkiIndex === -1 && skisInGroup.length > 1) || mode === 'add'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#A6C2EF] text-[#194576]'
                  }`}
                  placeholder={mode === 'add' ? 'Zostanie wygenerowany' : 'np. A01234'}
                  disabled={mode === 'add' || (selectedSkiIndex === -1 && skisInGroup.length > 1)}
                  title={selectedSkiIndex === -1 && skisInGroup.length > 1 ? 'Wybierz konkretną nartę aby zmienić kod' : ''}
                />
                {selectedSkiIndex === -1 && skisInGroup.length > 1 && (
                  <p className="text-yellow-300 text-xs mt-1">
                    ⚠️ Aby zmienić kod, wybierz konkretną nartę z listy powyżej
                  </p>
                )}
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
                  Poziom zaawansowania
                  <span className="text-xs text-[#A6C2EF] ml-2">(potrzebne do wyszukiwania)</span>
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
                  <span className="text-xs text-[#A6C2EF] ml-2">(potrzebne do wyszukiwania)</span>
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
                  <span className="text-xs text-[#A6C2EF] ml-2">(potrzebne do wyszukiwania)</span>
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
                  <span className="text-xs text-[#A6C2EF] ml-2">(potrzebne do wyszukiwania)</span>
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
                  <span className="text-xs text-[#A6C2EF] ml-2">(potrzebne do wyszukiwania)</span>
                </label>
                <select
                  value={formData.PRZEZNACZENIE || 'SLG'}
                  onChange={(e) => handleChange('PRZEZNACZENIE', e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg ${
                    errors.PRZEZNACZENIE 
                      ? 'bg-red-100 border-2 border-red-500 text-red-900' 
                      : 'bg-[#A6C2EF] text-[#194576]'
                  }`}
                >
                  <option value="SL">Slalom (SL)</option>
                  <option value="G">Gigant (G)</option>
                  <option value="SLG">Pomiędzy (SLG)</option>
                  <option value="OFF">Poza trasę (OFF)</option>
                </select>
                {errors.PRZEZNACZENIE && (
                  <p className="text-red-300 text-sm mt-1">{errors.PRZEZNACZENIE}</p>
                )}
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

        {/* Ostrzeżenia o niekompletnych danych */}
        {warnings.length > 0 && (
          <div className="px-4 sm:px-6 pb-4">
            <div className="bg-yellow-500 border-2 border-yellow-600 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-lg mb-2">
                    Niekompletne dane
                  </h4>
                  {warnings.map((warning, index) => (
                    <p key={index} className="text-white text-sm mb-1">
                      {warning}
                    </p>
                  ))}
                  <p className="text-white text-sm font-bold mt-3">
                    💡 Możesz zapisać mimo to, ale uzupełnij dane później, aby narta była widoczna w wyszukiwarce.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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

