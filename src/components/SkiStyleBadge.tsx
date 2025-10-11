import React from 'react';

interface SkiStyleBadgeProps {
  przeznaczenie: string; // "SL", "SLG", etc.
  atuty: string;         // "C" lub ""
}

/**
 * Komponent wyświetlający plakietkę stylu narty w formacie [PRZEZNACZENIE/ATUTY]
 * 
 * Przykłady:
 * - [SLG/C] - narta SLG z atrybutem "cały dzień"
 * - [SL] - narta SL bez atrybutów
 * - [OFF] - narta OFF bez atrybutów
 */
export const SkiStyleBadge: React.FC<SkiStyleBadgeProps> = ({ przeznaczenie, atuty }) => {
  const displayText = atuty 
    ? `${przeznaczenie}/${atuty}` 
    : przeznaczenie;
    
  return (
    <div className="ski-badge inline-flex items-center justify-center min-w-[60px] h-6 px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded border border-blue-400 shadow-sm self-center">
      [{displayText}]
    </div>
  );
};

