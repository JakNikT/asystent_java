/**
 * Komponent wyświetlający szczegółowe informacje o dopasowaniu narty
 * console.log(src/components/DetailedCompatibility.tsx: Wyświetlanie szczegółowych informacji o dopasowaniu)
 */

import React, { useState } from 'react';
import { SkiMatchingServiceV2 } from '../services/skiMatchingServiceV2';
import type { SkiMatch, SearchCriteria, DetailedCompatibilityInfo } from '../types/ski.types';

interface DetailedCompatibilityProps {
  match: SkiMatch;
  userCriteria: SearchCriteria;
}

export const DetailedCompatibility: React.FC<DetailedCompatibilityProps> = ({ match, userCriteria }) => {
  console.log('src/components/DetailedCompatibility.tsx: Wyświetlanie szczegółowych informacji:', match);
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Generuj informacje o dostępności (jedyna aktywna funkcja)
  const availability = SkiMatchingServiceV2.checkAvailability(match.ski);
  const availabilityMessage = SkiMatchingServiceV2.generateAvailabilityMessage(availability);

  /**
   * Oblicza procent dopasowania dla konkretnego kryterium - zaawansowany system z uwzględnieniem kategorii
   */
  const getCriteriaScore = (criterion: string, status: string): number => {
    // Oblicz bazowy procent
    let baseScore = 0;
    
    if (status.includes('✅ zielony')) {
      // Dla zielonych - zawsze wysoki procent, ale różnicowany w zależności od pozycji w zakresie
      switch (criterion) {
        case 'wzrost':
          baseScore = calculateRangeScore(userCriteria.wzrost, match.ski.WZROST_MIN, match.ski.WZROST_MAX);
          // Zapewnij minimum 80% dla zielonych statusów
          baseScore = Math.max(80, baseScore);
          break;
        case 'waga':
          baseScore = calculateRangeScore(userCriteria.waga, match.ski.WAGA_MIN, match.ski.WAGA_MAX);
          // Zapewnij minimum 80% dla zielonych statusów
          baseScore = Math.max(80, baseScore);
          break;
        case 'poziom':
          // Dla zielonych statusów zawsze 100%
          baseScore = 100;
          break;
        case 'plec':
          // Sprawdź czy poziom narty ma format M/D lub U (uniwersalny)
          if (match.ski.POZIOM.includes('/') || match.ski.POZIOM.includes('U')) {
            baseScore = 100; // Poziom uniwersalny lub M/D pasuje do obu płci
          } else {
            baseScore = userCriteria.plec === match.ski.PLEC ? 100 : 0;
          }
          break;
        case 'przeznaczenie':
          // Dla zielonych statusów zawsze 100%
          baseScore = 100;
          break;
        default:
          baseScore = 100;
      }
    } else if (status.includes('🟡 żółty')) {
      // Dla żółtych oblicz procent na podstawie rzeczywistej odległości od zakresu
      switch (criterion) {
        case 'wzrost':
          baseScore = calculateDistanceScore(userCriteria.wzrost, match.ski.WZROST_MIN, match.ski.WZROST_MAX);
          break;
        case 'waga':
          baseScore = calculateDistanceScore(userCriteria.waga, match.ski.WAGA_MIN, match.ski.WAGA_MAX);
          break;
        case 'poziom':
          baseScore = 75; // Poziom niżej
          break;
        case 'plec':
          // Sprawdź czy poziom narty ma format M/D lub U (uniwersalny)
          if (match.ski.POZIOM.includes('/') || match.ski.POZIOM.includes('U')) {
            baseScore = 100; // Poziom uniwersalny lub M/D pasuje do obu płci
          } else {
            baseScore = 25; // Inna płeć ale akceptowalna
          }
          break;
        case 'przeznaczenie':
          baseScore = calculateStyleScore(userCriteria.styl_jazdy, match.ski.PRZEZNACZENIE);
          break;
        default:
          baseScore = 75;
      }
    } else if (status.includes('🔴 czerwony')) {
      // Dla czerwonych niskie procenty
      switch (criterion) {
        case 'wzrost':
          baseScore = calculateToleranceScore(userCriteria.wzrost, match.ski.WZROST_MIN, match.ski.WZROST_MAX, 10);
          break;
        case 'waga':
          baseScore = calculateToleranceScore(userCriteria.waga, match.ski.WAGA_MIN, match.ski.WAGA_MAX, 10);
          break;
        case 'poziom':
          baseScore = 25; // 2 poziomy niżej
          break;
        case 'plec':
          // Sprawdź czy poziom narty ma format M/D lub U (uniwersalny)
          if (match.ski.POZIOM.includes('/') || match.ski.POZIOM.includes('U')) {
            baseScore = 100; // Poziom uniwersalny lub M/D pasuje do obu płci
          } else {
            baseScore = 0; // Niezgodna płeć
          }
          break;
        case 'przeznaczenie':
          baseScore = calculateStyleScore(userCriteria.styl_jazdy, match.ski.PRZEZNACZENIE);
          break;
        default:
          baseScore = 25;
      }
    }
    
    // Zastosuj mnożnik kategorii tylko do kryteriów, które nie są zielone
    // Dla zielonych kryteriów zawsze pełne procenty
    const categoryMultiplier = status.includes('✅ zielony') ? 1.0 : getCategoryMultiplier(match.kategoria);
    return Math.round(baseScore * categoryMultiplier);
  };

  /**
   * Zwraca mnożnik procentów na podstawie kategorii narty
   */
  const getCategoryMultiplier = (category: string): number => {
    switch (category) {
      case 'idealne':
        return 1.0; // 100% - pełne procenty
      case 'alternatywy':
        return 0.85; // 85% - nieco niższe procenty
      case 'poziom_za_nisko':
        return 0.7; // 70% - niższe procenty
      case 'inna_plec':
        return 0.6; // 60% - jeszcze niższe procenty
      case 'na_sile':
        return 0.5; // 50% - najniższe procenty
      default:
        return 1.0;
    }
  };

  /**
   * Oblicza procent dopasowania stylu jazdy
   */
  const calculateStyleScore = (userStyle: string, skiStyle: string): number => {
    const skiTypes = skiStyle.split(',').map(t => t.trim());
    
    // Jeśli użytkownik wybrał "Wszystkie", wszystko pasuje
    if (userStyle === 'Wszystkie') {
      return 100;
    }
    
    // Sprawdź dokładne dopasowanie dla każdego stylu
    switch (userStyle) {
      case 'Slalom':
        if (skiTypes.includes('SL')) {
          return 100; // Idealne dopasowanie
        } else if (skiTypes.includes('SLG')) {
          return 75; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return 60; // Uniwersalne narty
        } else {
          return 0; // Brak dopasowania
        }
        
      case 'Gigant':
        if (skiTypes.includes('G')) {
          return 100; // Idealne dopasowanie
        } else if (skiTypes.includes('SLG')) {
          return 75; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return 60; // Uniwersalne narty
        } else {
          return 0; // Brak dopasowania
        }
        
      case 'Cały dzień':
        if (skiTypes.includes('C')) {
          return 100; // Idealne dopasowanie
        } else if (skiTypes.includes('SL,C') || skiTypes.includes('SLG,C')) {
          return 75; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return 60; // Uniwersalne narty
        } else {
          return 0; // Brak dopasowania
        }
        
      case 'Poza trase':
        if (skiTypes.includes('OFF')) {
          return 100; // Idealne dopasowanie
        } else if (skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return 60; // Uniwersalne narty
        } else {
          return 0; // Brak dopasowania
        }
        
      case 'Pomiędzy':
        if (skiTypes.includes('SLG')) {
          return 100; // Idealne dopasowanie
        } else if (skiTypes.includes('SL') || skiTypes.includes('G')) {
          return 75; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return 60; // Uniwersalne narty
        } else {
          return 0; // Brak dopasowania
        }
        
      default:
        return 0;
    }
  };

  /**
   * Oblicza procent na podstawie funkcji gaussowskiej - im bliżej środka zakresu, tym lepszy wynik
   * Zgodnie z dokumentacją: używa funkcji gaussowskich dla wagi i wzrostu
   */
  const calculateRangeScore = (userValue: number, min: number, max: number): number => {
    const center = (min + max) / 2;
    const range = max - min;
    const sigma = range / 6; // 99.7% wartości w zakresie 3*sigma
    
    // Funkcja gaussowska: e^(-0.5 * ((x - center) / sigma)^2)
    const distanceFromCenter = Math.abs(userValue - center);
    const gaussianScore = Math.exp(-0.5 * Math.pow(distanceFromCenter / sigma, 2));
    
    // Konwertuj na procent (0-100%)
    return Math.round(gaussianScore * 100);
  };

  /**
   * Oblicza procent na podstawie tolerancji (im dalej od zakresu, tym niższy procent)
   */
  const calculateToleranceScore = (userValue: number, min: number, max: number, tolerance: number): number => {
    // Oblicz odległość od zakresu (nie od środka!)
    let distanceFromRange = 0;
    
    if (userValue < min) {
      distanceFromRange = min - userValue; // Za mały
    } else if (userValue > max) {
      distanceFromRange = userValue - max; // Za duży
    } else {
      // W zakresie - użyj funkcji gaussowskiej
      return calculateRangeScore(userValue, min, max);
    }
    
    // Im dalej od zakresu, tym niższy procent
    const score = Math.max(0, 100 - (distanceFromRange / tolerance) * 50);
    return Math.round(Math.max(25, score));
  };

  /**
   * Oblicza procent na podstawie rzeczywistej odległości od zakresu
   */
  const calculateDistanceScore = (userValue: number, min: number, max: number): number => {
    // Oblicz odległość od zakresu
    let distanceFromRange = 0;
    
    if (userValue < min) {
      distanceFromRange = min - userValue; // Za mały
    } else if (userValue > max) {
      distanceFromRange = userValue - max; // Za duży
    } else {
      // W zakresie - użyj funkcji gaussowskiej
      return calculateRangeScore(userValue, min, max);
    }
    
    // Im dalej od zakresu, tym niższy procent
    // Dla tolerancji 5: 1cm = 10% spadek, 2cm = 20% spadek, itd.
    const score = Math.max(25, 100 - distanceFromRange * 10);
    return Math.round(score);
  };

  /**
   * Oblicza procent dla poziomu zgodnie z dokumentacją
   * 1.0 za idealne, 0.7 za 1 poziom różnicy
   */
  const calculateLevelScore = (userLevel: number, userGender: string, skiLevel: string): number => {
    // Parsuj poziom narty - obsługa różnych formatów
    const skiLevelForUser = parseSkiLevelForUser(skiLevel, userGender);
    
    if (skiLevelForUser === null) return 100; // Jeśli nie można sparsować, załóż 100%
    
    const diff = Math.abs(userLevel - skiLevelForUser);
    if (diff === 0) return 100; // Idealne dopasowanie
    if (diff === 1) return 70;   // 1 poziom różnicy = 70%
    if (diff === 2) return 40;   // 2 poziomy różnicy = 40%
    return Math.max(10, 100 - diff * 30); // Więcej niż 2 poziomy
  };

  /**
   * Parsuje poziom narty dla konkretnego użytkownika
   * Obsługuje formaty: "4M", "5D", "4M/5D", "5M/6D", "4U", "4"
   */
  const parseSkiLevelForUser = (skiLevel: string, userGender: string): number | null => {
    // Usuń spacje i przekształć na wielkie litery
    const cleanLevel = skiLevel.replace(/\s+/g, '').toUpperCase();
    
    // Sprawdź czy zawiera format M/D (np. "4M/5D")
    if (cleanLevel.includes('/')) {
      const parts = cleanLevel.split('/');
      for (const part of parts) {
        if (part.includes(userGender.toUpperCase())) {
          const level = parseInt(part.replace(/[^\d]/g, ''));
          if (!isNaN(level)) return level;
        }
      }
      // Jeśli nie znaleziono odpowiedniej płci, zwróć pierwszy poziom
      const firstLevel = parseInt(parts[0].replace(/[^\d]/g, ''));
      return isNaN(firstLevel) ? null : firstLevel;
    }
    
    // Sprawdź czy zawiera tylko jedną płć (np. "4M", "5D")
    if (cleanLevel.includes(userGender.toUpperCase())) {
      const level = parseInt(cleanLevel.replace(/[^\d]/g, ''));
      return isNaN(level) ? null : level;
    }
    
    // Sprawdź czy jest uniwersalny (np. "4U", "4")
    if (cleanLevel.includes('U') || !/[MD]/.test(cleanLevel)) {
      const level = parseInt(cleanLevel.replace(/[^\d]/g, ''));
      return isNaN(level) ? null : level;
    }
    
    // Jeśli nie pasuje do żadnego formatu, zwróć null
    return null;
  };

  /**
   * Sprawdza czy poziom narty pasuje do użytkownika (z obsługą U)
   */
  // const isLevelCompatible = (_userLevel: number, _userGender: string, _skiLevel: string): boolean => {
  //   // Jeśli poziom narty zawiera "U", pasuje do obu płci
  //   if (_skiLevel.includes('U')) return true;
  //   
  //   // Sprawdź czy płeć się zgadza
  //   const skiGender = _skiLevel.replace(/[^\d]/g, '').length > 0 ? 
  //     _skiLevel.replace(/[^\d]/g, '').slice(-1) : _skiLevel.slice(-1);
  //   
  //   if (skiGender === 'U') return true;
  //   if (skiGender === _userGender) return true;
  //   
  //   return false;
  // };

  /**
   * Określa kolor na podstawie statusu dopasowania (nie procentów)
   */
  const getScoreColor = (status: string): string => {
    if (status.includes('✅ zielony')) {
      return 'text-green-400'; // W zakresie - zawsze zielony
    } else if (status.includes('🟡 żółty')) {
      return 'text-yellow-400'; // Poza zakresem ale akceptowalne
    } else if (status.includes('🔴 czerwony')) {
      return 'text-red-400'; // Znacznie poza zakresem
    }
    return 'text-gray-400'; // Domyślny
  };

  /**
   * Określa ikonę na podstawie statusu dopasowania
   */
  const getScoreIcon = (status: string): string => {
    if (status.includes('✅ zielony')) {
      return '✅'; // W zakresie
    } else if (status.includes('🟡 żółty')) {
      return '⚠️'; // Poza zakresem ale akceptowalne
    } else if (status.includes('🔴 czerwony')) {
      return '❌'; // Znacznie poza zakresem
    }
    return '❓'; // Domyślny
  };

  /**
   * Określa ikonę na podstawie statusu dopasowania (dla przycisku)
   */
  const getShortStatus = (_criterion: string, status: string): string => {
    if (status.includes('✅ zielony')) {
      return '✅';
    } else if (status.includes('🟡 żółty')) {
      return '⚠️';
    } else if (status.includes('🔴 czerwony')) {
      return '❌';
    }
    return '❓';
  };

  /**
   * Formatuje wyświetlanie kryterium zgodnie z dokumentacją
   * Format: 🟢 P:4(4)→OK | 🟢 Pł:M(M)→OK
   * Dla wagi i wzrostu: konkretne odchylenie zamiast "→OK"
   */
  const formatCriterionDisplay = (criterion: any): string => {
    const icon = getScoreIcon(criterion.status);
    
    // Dla wagi i wzrostu - pokaż konkretne odchylenie
    if (criterion.key === 'waga' || criterion.key === 'wzrost') {
      if (criterion.status.includes('✅ zielony')) {
        return `${icon} ${criterion.key === 'waga' ? 'W' : 'Wz'}:${criterion.userValue}(${criterion.skiValue})→OK`;
      } else {
        // Wyciągnij odchylenie ze statusu (działa dla żółtych i czerwonych)
        const match = criterion.status.match(/o (\d+)/);
        if (match) {
          const odchylenie = match[1];
          const kierunek = criterion.status.includes('za duża') || criterion.status.includes('za duży') ? '↑' : '↓';
          return `${icon} ${criterion.key === 'waga' ? 'W' : 'Wz'}:${criterion.userValue}(${criterion.skiValue})→${odchylenie}${kierunek}`;
        }
        // Jeśli nie ma odchylenia w statusie, pokaż "NIE"
        return `${icon} ${criterion.key === 'waga' ? 'W' : 'Wz'}:${criterion.userValue}(${criterion.skiValue})→NIE`;
      }
    }
    
    // Dla pozostałych kryteriów - standardowy format
    const statusText = criterion.status.includes('✅ zielony') ? 'OK' : 
                      criterion.status.includes('🟡 żółty') ? 'OK' : 'NIE';
    
    switch (criterion.key) {
      case 'poziom':
        return `${icon} P:${criterion.userValue}(${criterion.skiValue})→${statusText}`;
      case 'plec':
        return `${icon} Pł:${criterion.userValue}(${criterion.skiValue})→${statusText}`;
      case 'przeznaczenie':
        return `${icon} Pr:${criterion.userValue}/${criterion.skiValue}→${statusText}`;
      default:
        return `${icon} ${criterion.label}:${criterion.userValue}(${criterion.skiValue})→${statusText}`;
    }
  };
  const getStyleShortcut = (style: string): string => {
    const shortcuts: { [key: string]: string } = {
      'Slalom': 'SL',
      'Gigant': 'G',
      'Cały dzień': 'C',
      'Poza trase': 'OFF',
      'Pomiędzy': 'SLG',
      'Wszystkie': 'ALL'
    };
    return shortcuts[style] || style;
  };

  /**
   * Oblicza średnią kompatybilność z wszystkich 5 parametrów
   * Zgodnie z dokumentacją: POZIOM 35%, WAGA 25%, WZROST 20%, PŁEĆ 15%, PRZEZNACZENIE 5%
   */
  const calculateAverageCompatibility = (): number => {
    const poziomScore = getCriteriaScore('poziom', match.dopasowanie.poziom);
    const wagaScore = getCriteriaScore('waga', match.dopasowanie.waga);
    const wzrostScore = getCriteriaScore('wzrost', match.dopasowanie.wzrost);
    const plecScore = getCriteriaScore('plec', match.dopasowanie.plec);
    const przeznaczenieScore = getCriteriaScore('przeznaczenie', match.dopasowanie.przeznaczenie);
    
    // Wagi zgodnie z dokumentacją
    const weightedAverage = (
      poziomScore * 0.35 +      // POZIOM - 35% (najważniejsze - bezpieczeństwo)
      wagaScore * 0.25 +       // WAGA - 25% (bardzo ważne - kontrola nart)
      wzrostScore * 0.20 +     // WZROST - 20% (ważne - stabilność)
      plecScore * 0.15 +       // PŁEĆ - 15% (mniej ważne - ergonomia)
      przeznaczenieScore * 0.05 // PRZEZNACZENIE - 5% (najmniej ważne - styl jazdy)
    );
    
    return Math.round(weightedAverage);
  };

  const criteria = [
    { 
      key: 'poziom', 
      label: 'Poziom', 
      status: match.dopasowanie.poziom,
      skiValue: match.ski.POZIOM,
      userValue: `${userCriteria.poziom}${userCriteria.plec}`
    },
    { 
      key: 'plec', 
      label: 'Płeć', 
      status: match.dopasowanie.plec,
      skiValue: match.ski.PLEC,
      userValue: userCriteria.plec
    },
    { 
      key: 'waga', 
      label: 'Waga', 
      status: match.dopasowanie.waga,
      skiValue: `${match.ski.WAGA_MIN}-${match.ski.WAGA_MAX}kg`,
      userValue: `${userCriteria.waga}kg`
    },
    { 
      key: 'wzrost', 
      label: 'Wzrost', 
      status: match.dopasowanie.wzrost,
      skiValue: `${match.ski.WZROST_MIN}-${match.ski.WZROST_MAX}cm`,
      userValue: `${userCriteria.wzrost}cm`
    },
    { 
      key: 'przeznaczenie', 
      label: 'Styl', 
      status: match.dopasowanie.przeznaczenie,
      skiValue: match.ski.PRZEZNACZENIE,
      userValue: getStyleShortcut(userCriteria.styl_jazdy)
    }
  ];

  // Oblicz średnią kompatybilność
  const averageCompatibility = calculateAverageCompatibility();

  return (
    <div className="mt-2">
      {/* Przycisk rozwijania z parametrami */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 bg-black/20 rounded-lg border border-white/10 hover:bg-black/30 transition-colors duration-200"
      >
        <div className="flex items-center space-x-2">
          {/* Parametry dopasowania */}
          <div className="flex flex-wrap gap-1">
            {criteria.map((criterion) => {
              const icon = getShortStatus(criterion.key, criterion.status);
              return (
                <span
                  key={criterion.key}
                  className="px-1 py-0.5 rounded text-xs font-medium bg-white/10 text-white"
                  title={criterion.status}
                >
                  {icon}{criterion.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Dostępność */}
          <span className="text-xs text-white">
            {availabilityMessage}
          </span>
          <span className={`text-lg font-bold ${
            averageCompatibility >= 90 ? 'text-green-400' :
            averageCompatibility >= 70 ? 'text-yellow-400' :
            averageCompatibility >= 50 ? 'text-orange-400' : 'text-red-400'
          }`}>
            {averageCompatibility}%
          </span>
          <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Rozwijane szczegóły */}
      {isExpanded && (
        <div className="mt-2 p-3 bg-black/20 rounded-lg border border-white/10 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            {criteria.map((criterion) => {
              const score = getCriteriaScore(criterion.key, criterion.status);
              const colorClass = getScoreColor(criterion.status);
              
              return (
                <div key={criterion.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{formatCriterionDisplay(criterion)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-16 bg-gray-700 rounded-full h-2 border border-gray-600">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          criterion.status.includes('✅ zielony') ? 'bg-green-400 shadow-green-400/50' : 
                          criterion.status.includes('🟡 żółty') ? 'bg-yellow-400 shadow-yellow-400/50' : 
                          criterion.status.includes('🔴 czerwony') ? 'bg-red-400 shadow-red-400/50' : 'bg-gray-400'
                        }`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                    <span className={`font-bold ${colorClass}`}>
                      {score}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-3 pt-2 border-t border-white/10">
            <div className="flex justify-between text-xs text-white/70">
              <span>Kategoria: {averageCompatibility >= 100 ? 'Idealne' : averageCompatibility >= 80 ? 'Bardzo dobre' : averageCompatibility >= 60 ? 'Dobre' : 'Akceptowalne'}</span>
              <span>Dostępność: {availabilityMessage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
