import React from 'react';

interface StyleFilterPanelProps {
  selectedStyles: string[];
  onStyleChange: (styles: string[]) => void;
  isDisabled?: boolean;
}

/**
 * Panel filtrów stylu jazdy z 4 checkboxami i przyciskiem reset
 * 
 * Zachowanie:
 * - Panel jest nieaktywny dopóki isDisabled=true
 * - Multi-select: można zaznaczyć wiele stylów jednocześnie
 * - Przycisk "Pokaż wszystkie" odznacza wszystkie checkboxy
 */
export const StyleFilterPanel: React.FC<StyleFilterPanelProps> = ({ 
  selectedStyles, 
  onStyleChange, 
  isDisabled = false 
}) => {
  
  const styleOptions = [
    { value: 'SL', label: 'Slalom (SL)' },
    { value: 'G', label: 'Gigant (G)' },
    { value: 'SLG', label: 'Pomiędzy (SLG)' },
    { value: 'OFF', label: 'Poza trasę (OFF)' }
  ];

  const handleStyleToggle = (styleValue: string) => {
    if (isDisabled) return;
    
    const newStyles = selectedStyles.includes(styleValue)
      ? selectedStyles.filter(s => s !== styleValue)
      : [...selectedStyles, styleValue];
    
    onStyleChange(newStyles);
  };

  const handleReset = () => {
    if (isDisabled) return;
    onStyleChange([]);
  };

  return (
    <div className="style-filter-panel bg-[#2C699F] rounded-[10px] border border-white p-4">
      {/* Tytuł panelu */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-lg font-black font-['Inter'] italic underline">
          🎯 Filtruj po stylu jazdy:
        </h3>
        <button
          onClick={handleReset}
          disabled={isDisabled}
          className={`px-3 py-1 rounded text-xs font-bold ${
            isDisabled 
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
              : 'bg-[#194576] text-white hover:bg-[#0f2a4a]'
          }`}
        >
          🔄 Pokaż wszystkie
        </button>
      </div>

      {/* Checkboxy stylów */}
      <div className="grid grid-cols-2 gap-3">
        {styleOptions.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-2 cursor-pointer ${
              isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-500/20'
            } p-2 rounded`}
          >
            <input
              type="checkbox"
              checked={selectedStyles.includes(option.value)}
              onChange={() => handleStyleToggle(option.value)}
              disabled={isDisabled}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <span className="text-white text-sm font-bold font-['Inter'] italic">
              {option.label}
            </span>
          </label>
        ))}
      </div>

      {/* Status informacyjny */}
      {selectedStyles.length > 0 && (
        <div className="mt-3 text-center">
          <span className="text-blue-200 text-xs font-bold">
            Zaznaczono: {selectedStyles.length} styl(ów)
          </span>
        </div>
      )}
      
      {isDisabled && (
        <div className="mt-3 text-center">
          <span className="text-yellow-200 text-xs font-bold">
            ⚠️ Najpierw wyszukaj narty aby aktywować filtry
          </span>
        </div>
      )}
    </div>
  );
};





