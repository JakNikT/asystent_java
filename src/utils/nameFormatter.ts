// src/utils/nameFormatter.ts: Narzędzia do formatowania nazw sprzętu

import type { SkiData } from '../types/ski.types';

/**
 * Usuwa frazy związane z snowboardem z nazwy modelu desek snowboardowych
 * src/utils/nameFormatter.ts: Czyszczenie nazw modeli desek snowboardowych
 * Usuwa: "snowboardowa", "nowa snowb.", "snowboard", "SNOWB.", "UŻYWANA"
 */
export function cleanSnowboardModelName(model: string): string {
  if (!model) return model;
  
  let cleaned = model;
  
  // Usuń frazy związane z snowboardem (case-insensitive)
  // Usuń "SNOWB." na początku lub w środku (ze spacją przed i po)
  cleaned = cleaned.replace(/^snowb\.\s*/i, ''); // Na początku
  cleaned = cleaned.replace(/\s+snowb\.\s+/gi, ' '); // W środku
  cleaned = cleaned.replace(/\bsnowboardowa\b/gi, '');
  cleaned = cleaned.replace(/\bnowa\s+snowb\.?\b/gi, '');
  cleaned = cleaned.replace(/\bsnowboard\b/gi, '');
  // Usuń "UŻYWANA" z początku lub w środku
  cleaned = cleaned.replace(/^używana\s+/i, ''); // Na początku
  cleaned = cleaned.replace(/\s+używana\s+/gi, ' '); // W środku
  
  // Usuń podwójne spacje i trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Czyści markę z niepotrzebnych prefiksów
 * src/utils/nameFormatter.ts: Czyszczenie marki z prefiksów typu "NOWA", "SNOWBOARD", "SNOWBOARDOWA", "UŻYWANA", "SNOWB."
 */
export function cleanBrandName(brand: string): string {
  if (!brand) return brand;
  
  let cleaned = brand.trim();
  
  // Usuń prefiksy związane ze statusem/typem (case-insensitive)
  // Usuń jeśli marka składa się tylko z prefiksu lub jeśli prefiks jest na początku ze spacją
  cleaned = cleaned.replace(/^(NOWA|SNOWBOARD|SNOWBOARDOWA|UŻYWANA|SNOWB\.?)(\s+|$)/i, '');
  
  // Trim i zwróć
  cleaned = cleaned.trim();
  
  // Jeśli po usunięciu prefiksu zostało puste, zwróć pusty string
  return cleaned || '';
}

/**
 * Formatuje markę sprzętu do wyświetlenia
 * src/utils/nameFormatter.ts: Formatowanie marki z uwzględnieniem typu sprzętu
 */
export function formatBrandName(ski: SkiData): string {
  if (!ski.MARKA) return ski.MARKA || '';
  
  // Dla wszystkich typów sprzętu usuń niepotrzebne prefiksy
  let cleanedBrand = cleanBrandName(ski.MARKA);
  
  // Jeśli po usunięciu prefiksu marka jest pusta, spróbuj wziąć markę z modelu
  if (!cleanedBrand && ski.MODEL) {
    // Najpierw wyczyść model z niepotrzebnych prefiksów (dla desek snowboardowych)
    let cleanedModel = ski.MODEL;
    if (ski.TYP_SPRZETU === 'DESKI') {
      cleanedModel = cleanSnowboardModelName(ski.MODEL);
    }
    
    // Weź pierwsze słowo z wyczyszczonego modelu jako markę
    const modelWords = cleanedModel.trim().split(/\s+/);
    if (modelWords.length > 0 && modelWords[0]) {
      cleanedBrand = modelWords[0];
    }
  }
  
  return cleanedBrand;
}

/**
 * Wyciąga wartość flex z nazwy modelu butów dorosłych
 * src/utils/nameFormatter.ts: Wyciąganie flexu z nazwy modelu
 * Flex to liczba od 70 do 120 (co 5: 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120)
 * Obsługuje wzorce: liczba przed W/M/R, na końcu nazwy, oraz pojedyncza cyfra (7 lub 9) mnożona przez 10
 */
export function extractFlexFromModel(model: string): string | null {
  if (!model) return null;
  
  // Wzorzec 1: Liczba 2-3 cyfrowa przed W/M/R (np. "75 W", "85W", "110 M")
  const multiDigitMatch = model.match(/(\d{2,3})\s*[WMR]/i);
  if (multiDigitMatch) {
    const flexValue = parseInt(multiDigitMatch[1]);
    // Sprawdź czy to poprawna wartość flex (70-120, co 5)
    if (flexValue >= 70 && flexValue <= 120 && flexValue % 5 === 0) {
      return multiDigitMatch[1];
    }
  }
  
  // Wzorzec 2: Pojedyncza cyfra (7 lub 9) przed W/M/R (np. "7 W", "9W") - mnożymy przez 10
  const singleDigitMatch = model.match(/([79])\s*[WMR]/i);
  if (singleDigitMatch) {
    const digit = parseInt(singleDigitMatch[1]);
    return (digit * 10).toString();
  }
  
  // Wzorzec 3: Pojedyncza cyfra (7 lub 9) w nawiasach (np. "7(70)", "9(90)") - mnożymy przez 10
  const bracketMatch = model.match(/([79])\(/);
  if (bracketMatch) {
    const digit = parseInt(bracketMatch[1]);
    return (digit * 10).toString();
  }
  
  // Wzorzec 4: Liczba 2-3 cyfrowa na końcu nazwy modelu (np. "QUEST ACCESS 80", "ALPHA 110")
  // Szukamy liczby która jest na końcu lub przed rokiem w nawiasach (np. "MODEL 110 (2024)")
  const endNumberMatch = model.match(/\s(\d{2,3})(?:\s*\(|\s*$)/);
  if (endNumberMatch) {
    const flexValue = parseInt(endNumberMatch[1]);
    // Sprawdź czy to poprawna wartość flex (70-120, co 5)
    if (flexValue >= 70 && flexValue <= 120 && flexValue % 5 === 0) {
      return endNumberMatch[1];
    }
  }
  
  // Wzorzec 5: Liczba 2-3 cyfrowa w środku nazwy (np. "MACH SPORT MV 90", "SPEEDMACHINE 110")
  // Szukamy liczby która jest otoczona spacjami i jest w zakresie 70-120
  const middleNumberMatch = model.match(/\s(\d{2,3})\s/);
  if (middleNumberMatch) {
    const flexValue = parseInt(middleNumberMatch[1]);
    // Sprawdź czy to poprawna wartość flex (70-120, co 5)
    if (flexValue >= 70 && flexValue <= 120 && flexValue % 5 === 0) {
      return middleNumberMatch[1];
    }
  }
  
  return null;
}

/**
 * Usuwa flex z nazwy modelu butów dorosłych
 * src/utils/nameFormatter.ts: Usuwanie flexu z nazwy modelu
 * Obsługuje te same wzorce co extractFlexFromModel
 */
export function removeFlexFromModel(model: string): string {
  if (!model) return model;
  
  let cleaned = model;
  
  // Usuń liczbę 2-3 cyfrową przed W/M/R (np. "75 W", "85W")
  cleaned = cleaned.replace(/\d{2,3}\s*[WMR]/gi, '');
  
  // Usuń pojedynczą cyfrę (7 lub 9) przed W/M/R (np. "7 W", "9W")
  cleaned = cleaned.replace(/[79]\s*[WMR]/gi, '');
  
  // Usuń pojedynczą cyfrę (7 lub 9) w nawiasach (np. "7(70)", "9(90)")
  cleaned = cleaned.replace(/[79]\(\d+\)/g, '');
  
  // Usuń liczbę flex (70-120, co 5) przed rokiem w nawiasach (np. "QUEST ACCESS 80 (2024)")
  // Używamy lookahead aby zachować spację przed nawiasem
  cleaned = cleaned.replace(/\s(70|75|80|85|90|95|100|105|110|115|120)\s*\(/g, ' (');
  
  // Usuń liczbę flex (70-120, co 5) na końcu nazwy (np. "QUEST ACCESS 80")
  cleaned = cleaned.replace(/\s(70|75|80|85|90|95|100|105|110|115|120)\s*$/g, '');
  
  // Usuń liczbę flex (70-120, co 5) w środku nazwy otoczoną spacjami
  // (np. "MACH SPORT MV 90", "SPEEDMACHINE 110")
  cleaned = cleaned.replace(/\s(70|75|80|85|90|95|100|105|110|115|120)\s/g, ' ');
  
  // Usuń podwójne spacje i trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Formatuje nazwę modelu sprzętu do wyświetlenia
 * src/utils/nameFormatter.ts: Formatowanie nazwy modelu z uwzględnieniem typu sprzętu
 */
export function formatModelName(ski: SkiData): string {
  if (!ski.MODEL) return ski.MODEL || '';
  
  // Dla desek snowboardowych usuń frazy związane z snowboardem
  if (ski.TYP_SPRZETU === 'DESKI') {
    return cleanSnowboardModelName(ski.MODEL);
  }
  
  // Dla butów dorosłych usuń flex z nazwy modelu
  if (ski.TYP_SPRZETU === 'BUTY' && ski.KATEGORIA === 'DOROSLE') {
    return removeFlexFromModel(ski.MODEL);
  }
  
  // Dla innych typów sprzętu zwróć bez zmian
  return ski.MODEL;
}

