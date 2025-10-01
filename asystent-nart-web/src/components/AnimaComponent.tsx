import React, { useState, useEffect } from 'react';
import { CSVParser } from '../utils/csvParser';
import { SkiMatchingService } from '../services/skiMatchingService';
import type { SkiData, SearchResults } from '../types/ski.types';

interface FormData {
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
  height: {
    value: string;
    unit: string;
  };
  weight: {
    value: string;
    unit: string;
  };
  level: string;
  gender: string;
  preferences: string[];
}

const AnimaComponent: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    dateFrom: { day: '', month: '', year: '' },
    dateTo: { day: '', month: '', year: '' },
    height: { value: '', unit: 'cm' },
    weight: { value: '', unit: 'kg' },
    level: '',
    gender: '',
    preferences: []
  });

  const [skisDatabase, setSkisDatabase] = useState<SkiData[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Ładowanie bazy danych przy starcie
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        setIsLoading(true);
        const skis = await CSVParser.loadFromPublic();
        setSkisDatabase(skis);
        console.log(`Załadowano ${skis.length} nart z bazy danych`);
      } catch (err) {
        console.error('Błąd ładowania bazy:', err);
        setError('Nie udało się załadować bazy danych nart');
      } finally {
        setIsLoading(false);
      }
    };

    loadDatabase();
  }, []);

  const handleInputChange = (section: keyof FormData, field: string, value: string) => {
    if (section === 'dateFrom' || section === 'dateTo') {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else if (section === 'height' || section === 'weight') {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: value
      }));
    }
  };

  const handlePreferenceChange = (preference: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: [preference] // Tylko jeden wybór (radio button)
    }));
  };

  const handleSubmit = () => {
    // Walidacja
    if (!formData.height.value || !formData.weight.value || !formData.level || !formData.gender) {
      setError('Proszę wypełnić wszystkie wymagane pola: wzrost, waga, poziom, płeć');
      return;
    }

    if (formData.preferences.length === 0) {
      setError('Proszę wybrać preferencje stylu jazdy');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Przygotuj kryteria wyszukiwania
      const criteria = {
        wzrost: parseInt(formData.height.value),
        waga: parseInt(formData.weight.value),
        poziom: parseInt(formData.level),
        plec: formData.gender as 'M' | 'K',
        styl_jazdy: formData.preferences[0] // Tylko jedna preferencja (radio button)
      };

      console.log('Kryteria wyszukiwania:', criteria);

      // Wyszukaj pasujące narty
      const results = SkiMatchingService.findMatchingSkis(skisDatabase, criteria);
      setSearchResults(results);

      console.log('Znaleziono wyników:', {
        idealne: results.idealne.length,
        bardzo_dobre: results.bardzo_dobre.length,
        dobre: results.dobre.length,
        akceptowalne: results.akceptowalne.length,
        wszystkie: results.wszystkie.length
      });
    } catch (err) {
      console.error('Błąd wyszukiwania:', err);
      setError('Wystąpił błąd podczas wyszukiwania nart');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      dateFrom: { day: '', month: '', year: '' },
      dateTo: { day: '', month: '', year: '' },
      height: { value: '', unit: 'cm' },
      weight: { value: '', unit: 'kg' },
      level: '',
      gender: '',
      preferences: []
    });
    setSearchResults(null);
    setError('');
  };

  return (
    <div className="w-[1100px] h-[650px] relative bg-[#386BB2] overflow-hidden">
      {/* Header Section */}
      <div className="w-[1100px] h-[200px] absolute top-0 left-0 bg-[#386BB2] flex items-start justify-between p-2">
        {/* Avatar */}
        <div className="w-[180px] h-[180px] bg-[#D9D9D9] rounded-full" />
        
        {/* Main Content Container */}
        <div className="w-[890px] h-[180px] bg-[#194576] rounded-[20px] flex items-center justify-start gap-3 p-2">
            
            {/* Left Section - Personal Data */}
            <div className="w-[307px] h-[160px] p-2.5 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-start items-center gap-1.5">
              {/* Date From */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[29px] bg-[#194576] rounded-[5px] border border-white flex items-center justify-center px-1">
                  <span className="text-white text-sm font-black font-['Inter'] italic underline leading-tight">📅 Data od:</span>
                </div>
                <input
                  type="text"
                  placeholder="DD"
                  value={formData.dateFrom.day}
                  onChange={(e) => handleInputChange('dateFrom', 'day', e.target.value)}
                  className="w-[38px] h-[29px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <input
                  type="text"
                  placeholder="MM"
                  value={formData.dateFrom.month}
                  onChange={(e) => handleInputChange('dateFrom', 'month', e.target.value)}
                  className="w-[38px] h-[29px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <input
                  type="text"
                  placeholder="YYYY"
                  value={formData.dateFrom.year}
                  onChange={(e) => handleInputChange('dateFrom', 'year', e.target.value)}
                  className="w-[61px] h-[29px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                />
            </div>

              {/* Date To */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[29px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1">
                  <span className="text-white text-sm font-black font-['Inter'] italic underline leading-tight">📅 Data do:</span>
                </div>
                <input
                  type="text"
                  placeholder="DD"
                  value={formData.dateTo.day}
                  onChange={(e) => handleInputChange('dateTo', 'day', e.target.value)}
                  className="w-[38px] h-[29px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <input
                  type="text"
                  placeholder="MM"
                  value={formData.dateTo.month}
                  onChange={(e) => handleInputChange('dateTo', 'month', e.target.value)}
                  className="w-[38px] h-[29px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                />
                <span className="text-white text-xs font-black font-['Inter'] italic underline leading-none">/</span>
                <input
                  type="text"
                  placeholder="YYYY"
                  value={formData.dateTo.year}
                  onChange={(e) => handleInputChange('dateTo', 'year', e.target.value)}
                  className="w-[61px] h-[29px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                />
              </div>

              {/* Height */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[31px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-base font-black font-['Inter'] italic underline leading-snug">📏 Wzrost:</span>
                </div>
                <input
                  type="text"
                  placeholder="180"
                  value={formData.height.value}
                  onChange={(e) => handleInputChange('height', 'value', e.target.value)}
                  className="w-[112px] h-[31px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                />
                <input
                  type="text"
                  placeholder="cm"
                  value={formData.height.unit}
                  onChange={(e) => handleInputChange('height', 'unit', e.target.value)}
                  className="w-[48px] h-[31px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                />
              </div>

              {/* Weight */}
              <div className="w-full flex items-center gap-1">
                <div className="w-[111px] h-[31px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                  <span className="text-white text-base font-black font-['Inter'] italic underline leading-snug">⚖️ Waga:</span>
                </div>
                <input
                  type="text"
                  placeholder="70"
                  value={formData.weight.value}
                  onChange={(e) => handleInputChange('weight', 'value', e.target.value)}
                  className="w-[112px] h-[31px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                />
                <input
                  type="text"
                  placeholder="kg"
                  value={formData.weight.unit}
                  onChange={(e) => handleInputChange('weight', 'unit', e.target.value)}
                  className="w-[48px] h-[31px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                />
              </div>
            </div>

            {/* Center Section - Level and Gender */}
            <div className="w-[230px] h-[140px] flex flex-col justify-start items-center gap-[5px]">
              {/* Client Data Title */}
              <div className="w-[197px] h-[39px] bg-[#2C699F] rounded-[10px] border border-white flex justify-center items-center">
                <div className="text-center justify-center text-white text-[21px] font-black font-['Inter'] italic underline leading-[29px]">Dane klienta</div>
              </div>
              
              {/* Level and Gender Section */}
              <div className="w-[230px] h-[96px] p-2.5 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-start items-start gap-1.5">
                {/* Level */}
                <div className="w-full flex items-center gap-2">
                  <div className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-lg font-black font-['Inter'] italic underline leading-[25px]">Poziom:</span>
                  </div>
                  <input
                    type="text"
                    placeholder="1-10"
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', 'value', e.target.value)}
                    className="w-[60px] h-[35px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                  />
                </div>

                {/* Gender */}
                <div className="w-full flex items-center gap-2">
                  <div className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                    <span className="text-white text-lg font-black font-['Inter'] italic underline leading-[25px]">👤 Płeć:</span>
                  </div>
                  <input
                    type="text"
                    placeholder="M/K"
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', 'value', e.target.value)}
                    className="w-[60px] h-[35px] bg-[#194576] rounded-[5px] text-white text-center text-xs font-black font-['Inter']"
                  />
                </div>
              </div>
            </div>

            {/* Right Section - Preferences and Buttons */}
            <div className="w-[300px] h-[160px] p-1 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-start items-center gap-[5px]">
              {/* Preferences Title */}
              <div className="w-[140px] h-[25px] bg-[#194576] rounded-[5px] flex items-center justify-center">
                <div className="text-center justify-center text-white text-[20px] font-black font-['Inter'] italic underline leading-[28px]">Preferencje:</div>
              </div>

              {/* Radio Buttons Grid - 2 rzędy po 3 */}
              <div className="w-[300px] flex flex-col justify-center items-center gap-1">
                {/* Pierwszy rząd */}
                <div className="w-full flex justify-center items-center gap-3">
                  {['Wszystkie', 'Slalom', 'Poza trase'].map((pref) => (
                    <label key={pref} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="preferences"
                        checked={formData.preferences.includes(pref)}
                        onChange={() => handlePreferenceChange(pref)}
                        className="flex-shrink-0"
                      />
                      <span className="text-white text-xs font-extrabold font-['Inter'] italic underline leading-[17px] whitespace-nowrap">{pref}</span>
                    </label>
                  ))}
                </div>
                
                {/* Drugi rząd */}
                <div className="w-full flex justify-center items-center gap-3">
                  {['Cały dzień', 'Gigant', 'Pomiędzy'].map((pref) => (
                    <label key={pref} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="preferences"
                        checked={formData.preferences.includes(pref)}
                        onChange={() => handlePreferenceChange(pref)}
                        className="flex-shrink-0"
                      />
                      <span className="text-white text-xs font-extrabold font-['Inter'] italic underline leading-[17px] whitespace-nowrap">{pref}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-[299px] h-[75px] flex justify-center items-center gap-[5px] flex-wrap">
                <button
                  onClick={handleSubmit}
                  className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1"
                >
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight">🔍 Wyszukaj</span>
                </button>
                <button
                  onClick={handleClear}
                  className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1"
                >
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight">🗑️ Wyczyść</span>
                </button>
                <button className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1">
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight whitespace-nowrap">📋 Przeglądaj</span>
                </button>
                <button className="w-[140px] h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1">
                  <span className="text-white text-xs font-black font-['Inter'] italic underline leading-tight whitespace-nowrap">🔄 Rezerwacje</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Results Section */}
      <div className="w-[1100px] h-[450px] absolute top-[200px] left-0 bg-[#386BB2] flex flex-col justify-start items-start gap-2.5 p-5">
        {/* Results Header */}
        <div className="w-[344px] h-[50px] bg-[#194576] rounded-tl-[20px] rounded-tr-[20px] rounded-bl-[10px] rounded-br-[10px] flex justify-center items-center">
          <div className="text-white text-[30px] font-normal font-['ADLaM_Display'] underline leading-[42px]">🔍 Wyniki Doboru Nart</div>
        </div>
        
          {/* Results Container */}
          <div className="w-[1062px] h-[365px] bg-[#194576] rounded-[20px] flex justify-start items-start gap-2.5 p-2">
            <div className="flex-1 h-[343px] bg-[#A6C2EF] rounded-[20px] p-4 overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <span className="text-white text-xl font-black font-['Inter'] italic">
                    ⏳ Wyszukiwanie nart...
                  </span>
                </div>
              )}

              {error && !isLoading && (
                <div className="flex items-center justify-center h-full">
                  <span className="text-red-600 text-lg font-black font-['Inter'] italic">
                    ❌ {error}
                  </span>
                </div>
              )}

              {!isLoading && !error && !searchResults && (
                <div className="flex items-center justify-center h-full text-center">
                  <span className="text-white text-lg font-black font-['Inter'] italic">
                    👋 Witaj! Wypełnij formularz i kliknij "Wyszukaj" aby znaleźć idealne narty
                  </span>
                </div>
              )}

              {!isLoading && !error && searchResults && (
                <div className="space-y-4">
                  {searchResults.wszystkie.length === 0 && (
                    <div className="text-center">
                      <span className="text-white text-lg font-black font-['Inter'] italic">
                        😔 Nie znaleziono nart pasujących do Twoich kryteriów
                      </span>
                    </div>
                  )}

                  {searchResults.idealne.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        🏆 IDEALNE DOPASOWANIE ({searchResults.idealne.length})
                      </h3>
                      {searchResults.idealne.map((match, idx) => (
                        <div key={idx} className="bg-white/20 p-3 rounded-lg mb-2">
                          <div className="text-white font-black text-base">
                            {match.ski.MARKA} {match.ski.MODEL} - {match.ski.DLUGOSC}cm
                          </div>
                          <div className="text-white/90 text-sm">
                            {match.ski.PRZEZNACZENIE} | Poziom: {match.ski.POZIOM} | Płeć: {match.ski.PLEC}
                          </div>
                          <div className="text-green-300 text-sm font-bold">
                            ✅ Kompatybilność: {match.compatibility}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.bardzo_dobre.length > 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        ⭐ BARDZO DOBRE ({searchResults.bardzo_dobre.length})
                      </h3>
                      {searchResults.bardzo_dobre.slice(0, 5).map((match, idx) => (
                        <div key={idx} className="bg-white/15 p-3 rounded-lg mb-2">
                          <div className="text-white font-black text-base">
                            {match.ski.MARKA} {match.ski.MODEL} - {match.ski.DLUGOSC}cm
                          </div>
                          <div className="text-white/80 text-sm">
                            {match.ski.PRZEZNACZENIE} | Poziom: {match.ski.POZIOM}
                          </div>
                          <div className="text-yellow-300 text-sm font-bold">
                            ⭐ Kompatybilność: {match.compatibility}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.dobre.length > 0 && searchResults.idealne.length === 0 && searchResults.bardzo_dobre.length === 0 && (
                    <div>
                      <h3 className="text-white text-xl font-black font-['Inter'] italic mb-2">
                        👍 DOBRE ({searchResults.dobre.length})
                      </h3>
                      {searchResults.dobre.slice(0, 5).map((match, idx) => (
                        <div key={idx} className="bg-white/10 p-3 rounded-lg mb-2">
                          <div className="text-white font-black text-base">
                            {match.ski.MARKA} {match.ski.MODEL} - {match.ski.DLUGOSC}cm
                          </div>
                          <div className="text-white/70 text-sm">
                            Kompatybilność: {match.compatibility}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default AnimaComponent;