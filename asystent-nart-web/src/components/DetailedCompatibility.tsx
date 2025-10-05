/**
 * Komponent wyświetlający szczegółowe informacje o dopasowaniu narty
 * console.log(src/components/DetailedCompatibility.tsx: Wyświetlanie szczegółowych informacji o dopasowaniu)
 */

import React, { useState } from 'react';

interface DetailedCompatibilityProps {
  match: {
    ski: {
      WAGA_MIN: number;
      WAGA_MAX: number;
      WZROST_MIN: number;
      WZROST_MAX: number;
      POZIOM: string;
      PLEC: string;
      PRZEZNACZENIE: string;
    };
    compatibility: number;
    dopasowanie: {
      poziom: string;
      plec: string;
      waga: string;
      wzrost: string;
      przeznaczenie: string;
    };
    zielone_punkty: number;
    kategoria: 'idealne' | 'alternatywy' | 'poziom_za_nisko' | 'inna_plec' | 'na_sile';
  };
  userCriteria: {
    wzrost: number;
    waga: number;
    poziom: number;
    plec: string;
    styl_jazdy: string;
  };
}

export const DetailedCompatibility: React.FC<DetailedCompatibilityProps> = ({ match, userCriteria }) => {
  console.log('src/components/DetailedCompatibility.tsx: Wyświetlanie szczegółowych informacji:', match);
  
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Oblicza procent dopasowania dla konkretnego kryterium - zaawansowany system z uwzględnieniem kategorii
   */
  const getCriteriaScore = (criterion: string, status: string): number => {
    // Oblicz bazowy procent
    let baseScore = 0;
    
    if (status.includes('✅ zielony')) {
      // Dla zielonych oblicz procent na podstawie pozycji w zakresie
      switch (criterion) {
        case 'wzrost':
          baseScore = calculateRangeScore(userCriteria.wzrost, match.ski.WZROST_MIN, match.ski.WZROST_MAX);
          break;
        case 'waga':
          baseScore = calculateRangeScore(userCriteria.waga, match.ski.WAGA_MIN, match.ski.WAGA_MAX);
          break;
        case 'poziom':
          baseScore = calculateLevelScore(userCriteria.poziom, userCriteria.plec, match.ski.POZIOM);
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
          baseScore = calculateStyleScore(userCriteria.styl_jazdy, match.ski.PRZEZNACZENIE);
          break;
        default:
          baseScore = 100;
      }
    } else if (status.includes('🟡 żółty')) {
      // Dla żółtych oblicz procent na podstawie tolerancji
      switch (criterion) {
        case 'wzrost':
          baseScore = calculateToleranceScore(userCriteria.wzrost, match.ski.WZROST_MIN, match.ski.WZROST_MAX, 5);
          break;
        case 'waga':
          baseScore = calculateToleranceScore(userCriteria.waga, match.ski.WAGA_MIN, match.ski.WAGA_MAX, 5);
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
    
    // Zastosuj mnożnik kategorii
    const categoryMultiplier = getCategoryMultiplier(match.kategoria);
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
   * Oblicza procent na podstawie pozycji w zakresie (im bliżej środka, tym wyższy procent)
   */
  const calculateRangeScore = (userValue: number, min: number, max: number): number => {
    const center = (min + max) / 2;
    const range = max - min;
    const distanceFromCenter = Math.abs(userValue - center);
    const maxDistance = range / 2;
    
    // Im bliżej środka, tym wyższy procent (100% w środku, ~80% na krańcach)
    const score = Math.max(0, 100 - (distanceFromCenter / maxDistance) * 20);
    return Math.round(score);
  };

  /**
   * Oblicza procent na podstawie tolerancji (im dalej od zakresu, tym niższy procent)
   */
  const calculateToleranceScore = (userValue: number, min: number, max: number, tolerance: number): number => {
    const center = (min + max) / 2;
    const range = max - min;
    const distanceFromCenter = Math.abs(userValue - center);
    // const maxDistance = (range / 2) + tolerance;
    
    // Im dalej od środka (z tolerancją), tym niższy procent
    const score = Math.max(0, 100 - ((distanceFromCenter - range / 2) / tolerance) * 50);
    return Math.round(Math.max(25, score));
  };

  /**
   * Oblicza procent dla poziomu (specjalna logika z obsługą poziomu U i formatów M/D)
   */
  const calculateLevelScore = (userLevel: number, userGender: string, skiLevel: string): number => {
    // Parsuj poziom narty - obsługa różnych formatów
    const skiLevelForUser = parseSkiLevelForUser(skiLevel, userGender);
    
    if (skiLevelForUser === null) return 100; // Jeśli nie można sparsować, załóż 100%
    
    const diff = Math.abs(userLevel - skiLevelForUser);
    if (diff === 0) return 100;
    if (diff === 1) return 85;
    if (diff === 2) return 60;
    return Math.max(25, 100 - diff * 20);
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
   * Określa kolor na podstawie wyniku procentowego
   */
  const getScoreColor = (score: number): string => {
    if (score >= 100) return 'text-green-400';
    if (score >= 75) return 'text-yellow-400';
    if (score >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  /**
   * Określa ikonę na podstawie wyniku procentowego
   */
  const getScoreIcon = (score: number): string => {
    if (score >= 100) return '✅';
    if (score >= 75) return '⚠️';
    if (score >= 25) return '🔶';
    return '❌';
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
   * Konwertuje preferencje stylu jazdy na skróconą formę
   */
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
   */
  const calculateAverageCompatibility = (): number => {
    const scores = criteria.map(criterion => 
      getCriteriaScore(criterion.key, criterion.status)
    );
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(average);
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
          <span className={`text-lg font-bold ${getScoreColor(averageCompatibility)}`}>
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
              const colorClass = getScoreColor(score);
              const icon = getScoreIcon(score);
              
              return (
                <div key={criterion.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span>{icon}</span>
                    <span className="text-white font-medium">{criterion.label}:</span>
                    <span className="text-white/80">{criterion.skiValue} / {criterion.userValue}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-16 bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          score >= 100 ? 'bg-green-400' : 
                          score >= 75 ? 'bg-yellow-400' : 
                          score >= 25 ? 'bg-orange-400' : 'bg-red-400'
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
