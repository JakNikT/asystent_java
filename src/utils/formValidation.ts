// System walidacji formularza dla Asystenta Doboru Nart
// logger.debug(src/utils/formValidation.ts: System walidacji załadowany)

import type { FormData } from '../types/dashboard.types';
import { createLogger } from './logger';

const logger = createLogger('formValidation');

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export interface FormErrors {
  dateFrom: string;
  dateTo: string;
  height: string;
  weight: string;
  level: string;
  gender: string;
  shoeSize?: string; // NOWE: błąd walidacji rozmiaru buta (opcjonalny)
}

export const initialFormErrors: FormErrors = {
  dateFrom: '',
  dateTo: '',
  height: '',
  weight: '',
  level: '',
  gender: '',
  shoeSize: '' // NOWE: początkowy błąd rozmiaru buta
};

/**
 * Waliduje wzrost w czasie rzeczywistym (100-250 cm)
 * logger.debug(src/utils/formValidation.ts: Walidacja wzrostu w czasie rzeczywistym - zakres 100-250 cm)
 */
export function validateHeightRealtime(height: string): ValidationResult {
  logger.debug(`src/utils/formValidation.ts: Walidacja wzrostu w czasie rzeczywistym - wartość: ${height}`);
  
  if (!height) {
    return { isValid: true, message: '' }; // Puste pole jest OK podczas wpisywania
  }

  // Sprawdź czy zawiera tylko cyfry
  if (!/^\d*$/.test(height)) {
    return { isValid: false, message: 'Wzrost może zawierać tylko cyfry' };
  }

  const heightNum = parseInt(height);
  if (heightNum > 250) {
    return { isValid: false, message: 'Wzrost nie może być większy niż 250 cm' };
  }

  return { isValid: true, message: '' };
}

/**
 * Waliduje wagę w czasie rzeczywistym (20-200 kg)
 * logger.debug(src/utils/formValidation.ts: Walidacja wagi w czasie rzeczywistym - zakres 20-200 kg)
 */
export function validateWeightRealtime(weight: string): ValidationResult {
  logger.debug(`src/utils/formValidation.ts: Walidacja wagi w czasie rzeczywistym - wartość: ${weight}`);
  
  if (!weight) {
    return { isValid: true, message: '' }; // Puste pole jest OK podczas wpisywania
  }

  // Sprawdź czy zawiera tylko cyfry
  if (!/^\d*$/.test(weight)) {
    return { isValid: false, message: 'Waga może zawierać tylko cyfry' };
  }

  const weightNum = parseInt(weight);
  if (weightNum > 200) {
    return { isValid: false, message: 'Waga nie może być większa niż 200 kg' };
  }

  return { isValid: true, message: '' };
}

/**
 * Waliduje poziom w czasie rzeczywistym (1-6)
 * logger.debug(src/utils/formValidation.ts: Walidacja poziomu w czasie rzeczywistym - zakres 1-6)
 */
export function validateLevelRealtime(level: string): ValidationResult {
  logger.debug(`src/utils/formValidation.ts: Walidacja poziomu w czasie rzeczywistym - wartość: ${level}`);
  
  if (!level) {
    return { isValid: true, message: '' }; // Puste pole jest OK podczas wpisywania
  }

  // Sprawdź czy zawiera tylko cyfry
  if (!/^\d*$/.test(level)) {
    return { isValid: false, message: 'Poziom może zawierać tylko cyfry' };
  }

  const levelNum = parseInt(level);
  if (levelNum > 6) {
    return { isValid: false, message: 'Poziom nie może być większy niż 6' };
  }

  return { isValid: true, message: '' };
}

/**
 * Waliduje płeć w czasie rzeczywistym (M/K)
 * logger.debug(src/utils/formValidation.ts: Walidacja płci w czasie rzeczywistym - M lub K)
 */
export function validateGenderRealtime(gender: string): ValidationResult {
  logger.debug(`src/utils/formValidation.ts: Walidacja płci w czasie rzeczywistym - wartość: ${gender}`);
  
  if (!gender) {
    return { isValid: true, message: '' }; // Puste pole jest OK podczas wpisywania
  }

  const normalizedGender = gender.toUpperCase().trim();
  if (normalizedGender !== 'M' && normalizedGender !== 'K' && normalizedGender !== '') {
    return { isValid: false, message: 'Płeć może być tylko M lub K' };
  }

  return { isValid: true, message: '' };
}

/**
 * Waliduje rozmiar buta w czasie rzeczywistym (20-35 cm)
 * logger.debug(src/utils/formValidation.ts: Walidacja rozmiaru buta w czasie rzeczywistym - zakres 20-35 cm)
 */
export function validateShoeSizeRealtime(shoeSize: string): ValidationResult {
  logger.debug(`src/utils/formValidation.ts: Walidacja rozmiaru buta w czasie rzeczywistym - wartość: ${shoeSize}`);
  
  if (!shoeSize) {
    return { isValid: true, message: '' }; // Puste pole jest OK (opcjonalne)
  }

  // Sprawdź czy zawiera tylko cyfry i ewentualnie kropkę lub przecinek
  if (!/^[\d.,]*$/.test(shoeSize)) {
    return { isValid: false, message: 'Rozmiar może zawierać tylko cyfry i kropkę/przecinek' };
  }

  // Podczas wpisywania (1-2 cyfry) nie waliduj zakresu - pozwól użytkownikowi dokończyć
  // Zamień przecinek na kropkę
  const normalizedSize = shoeSize.replace(',', '.');
  const sizeNum = parseFloat(normalizedSize);
  
  // Waliduj zakres tylko dla liczb >= 10 (użytkownik skończył wpisywać pierwszą cyfrę)
  if (!isNaN(sizeNum) && sizeNum >= 10) {
    if (sizeNum < 20) {
      return { isValid: false, message: 'Rozmiar nie może być mniejszy niż 20 cm' };
    }
    if (sizeNum > 35) {
      return { isValid: false, message: 'Rozmiar nie może być większy niż 35 cm' };
    }
  }
  
  // Dla liczb < 10 (pierwsza cyfra 2-9) - pozwól na wpisywanie
  return { isValid: true, message: '' };
}

/**
 * Waliduje wzrost w zakresie 100-250 cm
 * logger.debug(src/utils/formValidation.ts: Walidacja wzrostu - zakres 100-250 cm)
 */
export function validateHeight(height: string): ValidationResult {
  logger.debug(`src/utils/formValidation.ts: Walidacja wzrostu - wartość: ${height}`);
  
  if (!height) {
    return {
      isValid: false,
      message: 'Wzrost jest wymagany'
    };
  }

  const heightNum = parseInt(height);
  if (isNaN(heightNum)) {
    return {
      isValid: false,
      message: 'Wzrost musi być liczbą'
    };
  }

  if (heightNum < 100 || heightNum > 250) {
    return {
      isValid: false,
      message: 'Wzrost musi być między 100-250 cm'
    };
  }

  logger.debug(`src/utils/formValidation.ts: Wzrost poprawny - ${heightNum} cm`);
  return {
    isValid: true,
    message: ''
  };
}

/**
 * Waliduje wagę w zakresie 20-200 kg
 * logger.debug(src/utils/formValidation.ts: Walidacja wagi - zakres 20-200 kg)
 */
export function validateWeight(weight: string): ValidationResult {
  logger.debug(`src/utils/formValidation.ts: Walidacja wagi - wartość: ${weight}`);
  
  if (!weight) {
    return {
      isValid: false,
      message: 'Waga jest wymagana'
    };
  }

  const weightNum = parseInt(weight);
  if (isNaN(weightNum)) {
    return {
      isValid: false,
      message: 'Waga musi być liczbą'
    };
  }

  if (weightNum < 20 || weightNum > 200) {
    return {
      isValid: false,
      message: 'Waga musi być między 20-200 kg'
    };
  }

  logger.debug(`src/utils/formValidation.ts: Waga poprawna - ${weightNum} kg`);
  return {
    isValid: true,
    message: ''
  };
}

/**
 * Waliduje poziom umiejętności w zakresie 1-6
 * logger.debug(src/utils/formValidation.ts: Walidacja poziomu - zakres 1-6)
 */
export function validateLevel(level: string): ValidationResult {
  logger.debug(`src/utils/formValidation.ts: Walidacja poziomu - wartość: ${level}`);
  
  if (!level) {
    return {
      isValid: false,
      message: 'Poziom jest wymagany'
    };
  }

  const levelNum = parseInt(level);
  if (isNaN(levelNum)) {
    return {
      isValid: false,
      message: 'Poziom musi być liczbą'
    };
  }

  if (levelNum < 1 || levelNum > 6) {
    return {
      isValid: false,
      message: 'Poziom musi być między 1-6'
    };
  }

  logger.debug(`src/utils/formValidation.ts: Poziom poprawny - ${levelNum}`);
  return {
    isValid: true,
    message: ''
  };
}

/**
 * Waliduje płeć (M lub K)
 * logger.debug(src/utils/formValidation.ts: Walidacja płci - M lub K)
 */
export function validateGender(gender: string): ValidationResult {
  logger.debug(`src/utils/formValidation.ts: Walidacja płci - wartość: ${gender}`);
  
  if (!gender) {
    return {
      isValid: false,
      message: 'Płeć jest wymagana'
    };
  }

  const normalizedGender = gender.toUpperCase().trim();
  if (normalizedGender !== 'M' && normalizedGender !== 'K') {
    return {
      isValid: false,
      message: 'Płeć musi być M (mężczyzna) lub K (kobieta)'
    };
  }

  logger.debug(`src/utils/formValidation.ts: Płeć poprawna - ${normalizedGender}`);
  return {
    isValid: true,
    message: ''
  };
}

/**
 * Waliduje datę w formacie YYYY-MM-DD (opcjonalna)
 * logger.debug(src/utils/formValidation.ts: Walidacja daty w formacie YYYY-MM-DD)
 */
export function validateDateString(dateStr: string): ValidationResult {
  logger.debug(`src/utils/formValidation.ts: Walidacja daty string - wartość: "${dateStr}"`);
  
  // Pusta data jest OK (opcjonalna)
  if (!dateStr || dateStr.trim() === '') {
    logger.debug(`src/utils/formValidation.ts: Data opcjonalna - pusta`);
    return { isValid: true, message: '' };
  }
  
  // Sprawdź format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return { isValid: false, message: 'Data musi być w formacie YYYY-MM-DD' };
  }
  
  // Sprawdź czy data jest prawidłowa
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { isValid: false, message: 'Nieprawidłowa data' };
  }
  
  logger.debug(`src/utils/formValidation.ts: Data string poprawna - ${dateStr}`);
  return { isValid: true, message: '' };
}

/**
 * Waliduje cały formularz
 * logger.debug(src/utils/formValidation.ts: Walidacja całego formularza)
 */
export function validateForm(formData: FormData): { isValid: boolean; errors: FormErrors } {
  logger.debug('src/utils/formValidation.ts: Rozpoczęcie walidacji całego formularza');
  
  const errors: FormErrors = { ...initialFormErrors };
  let isValid = true;

  // Waliduj datę od (teraz string w formacie YYYY-MM-DD)
  logger.debug(`src/utils/formValidation.ts: Walidacja daty od - wartość: "${formData.dateFrom}"`);
  const dateFromResult = validateDateString(formData.dateFrom);
  logger.debug(`src/utils/formValidation.ts: Wynik walidacji daty od - isValid: ${dateFromResult.isValid}, message: "${dateFromResult.message}"`);
  if (!dateFromResult.isValid) {
    errors.dateFrom = dateFromResult.message;
    isValid = false;
  }

  // Waliduj datę do (teraz string w formacie YYYY-MM-DD)
  logger.debug(`src/utils/formValidation.ts: Walidacja daty do - wartość: "${formData.dateTo}"`);
  const dateToResult = validateDateString(formData.dateTo);
  logger.debug(`src/utils/formValidation.ts: Wynik walidacji daty do - isValid: ${dateToResult.isValid}, message: "${dateToResult.message}"`);
  if (!dateToResult.isValid) {
    errors.dateTo = dateToResult.message;
    isValid = false;
  }

  // Waliduj wzrost
  const heightResult = validateHeight(formData.height.value);
  if (!heightResult.isValid) {
    errors.height = heightResult.message;
    isValid = false;
  }

  // Waliduj wagę
  const weightResult = validateWeight(formData.weight.value);
  if (!weightResult.isValid) {
    errors.weight = weightResult.message;
    isValid = false;
  }

  // Waliduj poziom
  const levelResult = validateLevel(formData.level);
  if (!levelResult.isValid) {
    errors.level = levelResult.message;
    isValid = false;
  }

  // Waliduj płeć
  const genderResult = validateGender(formData.gender);
  if (!genderResult.isValid) {
    errors.gender = genderResult.message;
    isValid = false;
  }

  logger.debug(`src/utils/formValidation.ts: Walidacja zakończona - poprawny: ${isValid}`);
  return { isValid, errors };
}
