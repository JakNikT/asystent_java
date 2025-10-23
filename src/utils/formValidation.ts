// System walidacji formularza dla Asystenta Doboru Nart
// console.log(src/utils/formValidation.ts: System walidacji załadowany)

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export interface FormErrors {
  dateFrom: {
    day: string;
    month: string;
    year: string;
  };
  dateTo: {
    day: string;
    month: string;
    year: string;
  };
  height: string;
  weight: string;
  level: string;
  gender: string;
  shoeSize?: string; // NOWE: błąd walidacji rozmiaru buta (opcjonalny)
}

export const initialFormErrors: FormErrors = {
  dateFrom: { day: '', month: '', year: '' },
  dateTo: { day: '', month: '', year: '' },
  height: '',
  weight: '',
  level: '',
  gender: '',
  shoeSize: '' // NOWE: początkowy błąd rozmiaru buta
};

/**
 * Waliduje pojedynczy dzień (01-31)
 * console.log(src/utils/formValidation.ts: Walidacja dnia - zakres 01-31)
 */
export function validateDay(day: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja dnia - wartość: "${day}", długość: ${day.length}`);
  
  if (!day) {
    return { isValid: true, message: '' }; // Puste pole jest OK podczas wpisywania
  }

  // Sprawdź czy zawiera tylko cyfry
  if (!/^\d*$/.test(day)) {
    return { isValid: false, message: 'Dzień może zawierać tylko cyfry' };
  }

  // Pozwól na wpisanie pierwszego znaku
  if (day.length === 1) {
    console.log(`src/utils/formValidation.ts: Pierwszy znak - OK`);
    return { isValid: true, message: '' };
  }

  // Sprawdź dwucyfrową liczbę
  if (day.length === 2) {
    const dayNum = parseInt(day);
    if (dayNum >= 1 && dayNum <= 31) {
      console.log(`src/utils/formValidation.ts: Dwucyfrowa liczba ${dayNum} - OK`);
      return { isValid: true, message: '' };
    } else {
      console.log(`src/utils/formValidation.ts: Dwucyfrowa liczba ${dayNum} poza zakresem - BŁĄD`);
      return { isValid: false, message: 'Dzień musi być między 01-31' };
    }
  }

  // Jeśli więcej niż 2 cyfry
  return { isValid: false, message: 'Dzień może mieć maksymalnie 2 cyfry' };
}

/**
 * Waliduje pojedynczy miesiąc (01-12)
 * console.log(src/utils/formValidation.ts: Walidacja miesiąca - zakres 01-12)
 */
export function validateMonth(month: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja miesiąca - wartość: "${month}", długość: ${month.length}`);
  
  if (!month) {
    return { isValid: true, message: '' }; // Puste pole jest OK podczas wpisywania
  }

  // Sprawdź czy zawiera tylko cyfry
  if (!/^\d*$/.test(month)) {
    return { isValid: false, message: 'Miesiąc może zawierać tylko cyfry' };
  }

  // Pozwól na wpisanie pierwszego znaku
  if (month.length === 1) {
    console.log(`src/utils/formValidation.ts: Pierwszy znak miesiąca - OK`);
    return { isValid: true, message: '' };
  }

  // Sprawdź dwucyfrową liczbę
  if (month.length === 2) {
    const monthNum = parseInt(month);
    if (monthNum >= 1 && monthNum <= 12) {
      console.log(`src/utils/formValidation.ts: Dwucyfrowa liczba miesiąca ${monthNum} - OK`);
      return { isValid: true, message: '' };
    } else {
      console.log(`src/utils/formValidation.ts: Dwucyfrowa liczba miesiąca ${monthNum} poza zakresem - BŁĄD`);
      return { isValid: false, message: 'Miesiąc musi być między 01-12' };
    }
  }

  // Jeśli więcej niż 2 cyfry
  return { isValid: false, message: 'Miesiąc może mieć maksymalnie 2 cyfry' };
}

/**
 * Waliduje pojedynczy rok (2025-2026)
 * console.log(src/utils/formValidation.ts: Walidacja roku - zakres 2025-2026)
 */
export function validateYear(year: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja roku - wartość: ${year}`);
  
  if (!year) {
    return { isValid: true, message: '' }; // Puste pole jest OK podczas wpisywania
  }

  const yearNum = parseInt(year);
  if (isNaN(yearNum)) {
    return { isValid: false, message: 'Rok musi być liczbą' };
  }

  if (yearNum < 2025 || yearNum > 2026) {
    return { isValid: false, message: 'Rok musi być 2025 lub 2026' };
  }

  return { isValid: true, message: '' };
}

/**
 * Waliduje datę w formacie DD/MM/YYYY
 * console.log(src/utils/formValidation.ts: Walidacja daty - format DD/MM/YYYY)
 */
export function validateDate(day: string, month: string, year: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja daty - dzień: "${day}", miesiąc: "${month}", rok: "${year}"`);
  console.log(`src/utils/formValidation.ts: Sprawdzanie pustych pól - day empty: ${!day || day.trim() === ''}, month empty: ${!month || month.trim() === ''}, year empty: ${!year || year.trim() === ''}`);
  
  // Jeśli wszystkie pola są puste, data jest opcjonalna
  if ((!day || day.trim() === '') && (!month || month.trim() === '') && (!year || year.trim() === '')) {
    console.log(`src/utils/formValidation.ts: Data opcjonalna - wszystkie pola puste`);
    return { isValid: true, message: '' };
  }
  
  // Jeśli tylko niektóre pola są wypełnione, to błąd
  const hasDay = day && day.trim() !== '';
  const hasMonth = month && month.trim() !== '';
  const hasYear = year && year.trim() !== '';
  
  if ((hasDay && !hasMonth) || (hasDay && !hasYear) || (hasMonth && !hasDay) || (hasMonth && !hasYear) || (hasYear && !hasDay) || (hasYear && !hasMonth)) {
    return {
      isValid: false,
      message: 'Jeśli wypełniasz datę, wszystkie pola muszą być wypełnione'
    };
  }

  // Sprawdź format liczbowy (tylko jeśli pola nie są puste)
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
    return {
      isValid: false,
      message: 'Data musi zawierać tylko cyfry'
    };
  }

  // Sprawdź zakresy
  if (dayNum < 1 || dayNum > 31) {
    return {
      isValid: false,
      message: 'Dzień musi być między 1-31'
    };
  }

  if (monthNum < 1 || monthNum > 12) {
    return {
      isValid: false,
      message: 'Miesiąc musi być między 1-12'
    };
  }

  if (yearNum < 2025 || yearNum > 2026) {
    return {
      isValid: false,
      message: 'Rok musi być 2025 lub 2026'
    };
  }

  // Sprawdź czy data jest prawidłowa (np. 31.02.2024 nie istnieje)
  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (date.getDate() !== dayNum || date.getMonth() !== monthNum - 1 || date.getFullYear() !== yearNum) {
    return {
      isValid: false,
      message: 'Nieprawidłowa data (np. 31.02.2024)'
    };
  }

  console.log(`src/utils/formValidation.ts: Data poprawna - ${day}/${month}/${year}`);
  return {
    isValid: true,
    message: ''
  };
}

/**
 * Waliduje wzrost w czasie rzeczywistym (100-250 cm)
 * console.log(src/utils/formValidation.ts: Walidacja wzrostu w czasie rzeczywistym - zakres 100-250 cm)
 */
export function validateHeightRealtime(height: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja wzrostu w czasie rzeczywistym - wartość: ${height}`);
  
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
 * console.log(src/utils/formValidation.ts: Walidacja wagi w czasie rzeczywistym - zakres 20-200 kg)
 */
export function validateWeightRealtime(weight: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja wagi w czasie rzeczywistym - wartość: ${weight}`);
  
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
 * console.log(src/utils/formValidation.ts: Walidacja poziomu w czasie rzeczywistym - zakres 1-6)
 */
export function validateLevelRealtime(level: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja poziomu w czasie rzeczywistym - wartość: ${level}`);
  
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
 * console.log(src/utils/formValidation.ts: Walidacja płci w czasie rzeczywistym - M lub K)
 */
export function validateGenderRealtime(gender: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja płci w czasie rzeczywistym - wartość: ${gender}`);
  
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
 * console.log(src/utils/formValidation.ts: Walidacja rozmiaru buta w czasie rzeczywistym - zakres 20-35 cm)
 */
export function validateShoeSizeRealtime(shoeSize: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja rozmiaru buta w czasie rzeczywistym - wartość: ${shoeSize}`);
  
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
 * console.log(src/utils/formValidation.ts: Walidacja wzrostu - zakres 100-250 cm)
 */
export function validateHeight(height: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja wzrostu - wartość: ${height}`);
  
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

  console.log(`src/utils/formValidation.ts: Wzrost poprawny - ${heightNum} cm`);
  return {
    isValid: true,
    message: ''
  };
}

/**
 * Waliduje wagę w zakresie 20-200 kg
 * console.log(src/utils/formValidation.ts: Walidacja wagi - zakres 20-200 kg)
 */
export function validateWeight(weight: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja wagi - wartość: ${weight}`);
  
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

  console.log(`src/utils/formValidation.ts: Waga poprawna - ${weightNum} kg`);
  return {
    isValid: true,
    message: ''
  };
}

/**
 * Waliduje poziom umiejętności w zakresie 1-6
 * console.log(src/utils/formValidation.ts: Walidacja poziomu - zakres 1-6)
 */
export function validateLevel(level: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja poziomu - wartość: ${level}`);
  
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

  console.log(`src/utils/formValidation.ts: Poziom poprawny - ${levelNum}`);
  return {
    isValid: true,
    message: ''
  };
}

/**
 * Waliduje końcowy format dnia (sprawdza czy jest w formacie 01-09 lub 10-31)
 * console.log(src/utils/formValidation.ts: Walidacja końcowa dnia)
 */
export function validateDayFinal(day: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja końcowa dnia - wartość: "${day}"`);
  
  if (!day) {
    return { isValid: false, message: 'Dzień jest wymagany' };
  }

  const dayNum = parseInt(day);
  
  // Sprawdź czy jest w poprawnym formacie
  if (day.startsWith('0') && day.length === 2) {
    // Format 01-09
    if (dayNum >= 1 && dayNum <= 9) {
      return { isValid: true, message: '' };
    }
  } else if (day.length === 2 && dayNum >= 10 && dayNum <= 31) {
    // Format 10-31
    return { isValid: true, message: '' };
  }
  
  return { isValid: false, message: 'Dzień musi być w formacie 01-09 lub 10-31' };
}

/**
 * Waliduje końcowy format miesiąca (sprawdza czy jest w formacie 01-09 lub 10-12)
 * console.log(src/utils/formValidation.ts: Walidacja końcowa miesiąca)
 */
export function validateMonthFinal(month: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja końcowa miesiąca - wartość: "${month}"`);
  
  if (!month) {
    return { isValid: false, message: 'Miesiąc jest wymagany' };
  }

  const monthNum = parseInt(month);
  
  // Sprawdź czy jest w poprawnym formacie
  if (month.startsWith('0') && month.length === 2) {
    // Format 01-09
    if (monthNum >= 1 && monthNum <= 9) {
      return { isValid: true, message: '' };
    }
  } else if (month.length === 2 && monthNum >= 10 && monthNum <= 12) {
    // Format 10-12
    return { isValid: true, message: '' };
  }
  
  return { isValid: false, message: 'Miesiąc musi być w formacie 01-09 lub 10-12' };
}

/**
 * Waliduje płeć (M lub K)
 * console.log(src/utils/formValidation.ts: Walidacja płci - M lub K)
 */
export function validateGender(gender: string): ValidationResult {
  console.log(`src/utils/formValidation.ts: Walidacja płci - wartość: ${gender}`);
  
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

  console.log(`src/utils/formValidation.ts: Płeć poprawna - ${normalizedGender}`);
  return {
    isValid: true,
    message: ''
  };
}

/**
 * Waliduje cały formularz
 * console.log(src/utils/formValidation.ts: Walidacja całego formularza)
 */
export function validateForm(formData: any): { isValid: boolean; errors: FormErrors } {
  console.log('src/utils/formValidation.ts: Rozpoczęcie walidacji całego formularza');
  
  const errors: FormErrors = { ...initialFormErrors };
  let isValid = true;

  // Waliduj datę od
  console.log(`src/utils/formValidation.ts: Walidacja daty od - day: "${formData.dateFrom.day}", month: "${formData.dateFrom.month}", year: "${formData.dateFrom.year}"`);
  const dateFromResult = validateDate(formData.dateFrom.day, formData.dateFrom.month, formData.dateFrom.year);
  console.log(`src/utils/formValidation.ts: Wynik walidacji daty od - isValid: ${dateFromResult.isValid}, message: "${dateFromResult.message}"`);
  if (!dateFromResult.isValid) {
    errors.dateFrom.day = dateFromResult.message;
    errors.dateFrom.month = dateFromResult.message;
    errors.dateFrom.year = dateFromResult.message;
    isValid = false;
  }

  // Waliduj datę do
  console.log(`src/utils/formValidation.ts: Walidacja daty do - day: "${formData.dateTo.day}", month: "${formData.dateTo.month}", year: "${formData.dateTo.year}"`);
  const dateToResult = validateDate(formData.dateTo.day, formData.dateTo.month, formData.dateTo.year);
  console.log(`src/utils/formValidation.ts: Wynik walidacji daty do - isValid: ${dateToResult.isValid}, message: "${dateToResult.message}"`);
  if (!dateToResult.isValid) {
    errors.dateTo.day = dateToResult.message;
    errors.dateTo.month = dateToResult.message;
    errors.dateTo.year = dateToResult.message;
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

  console.log(`src/utils/formValidation.ts: Walidacja zakończona - poprawny: ${isValid}`);
  return { isValid, errors };
}
