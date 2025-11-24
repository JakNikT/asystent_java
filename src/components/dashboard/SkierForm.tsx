// src/components/dashboard/SkierForm.tsx: Komponent formularza danych narciarza

import React from 'react';
import type { FormData } from '../../types/dashboard.types';
import type { FormErrors } from '../../utils/formValidation';

interface SkierFormProps {
  formData: FormData;
  formErrors: FormErrors;
  onFieldChange: (section: keyof FormData | string, field: string, value: string, el?: HTMLInputElement) => void;
  handleDateFieldClick: (e: React.MouseEvent<HTMLInputElement>) => void;
  // Refs dla automatycznego przechodzenia między polami
  dayFromRef: React.RefObject<HTMLInputElement | null>;
  monthFromRef: React.RefObject<HTMLInputElement | null>;
  dayToRef: React.RefObject<HTMLInputElement | null>;
  monthToRef: React.RefObject<HTMLInputElement | null>;
  heightRef: React.RefObject<HTMLInputElement | null>;
  weightRef: React.RefObject<HTMLInputElement | null>;
  levelRef: React.RefObject<HTMLInputElement | null>;
  genderRef: React.RefObject<HTMLInputElement | null>;
  shoeSizeRef: React.RefObject<HTMLInputElement | null>;
}

const SkierForm: React.FC<SkierFormProps> = ({
  formData,
  formErrors,
  onFieldChange,
  handleDateFieldClick,
  dayFromRef,
  monthFromRef,
  dayToRef,
  monthToRef,
  heightRef,
  weightRef,
  levelRef,
  genderRef,
  shoeSizeRef
}) => {
  return (
    <>
      {/* Left Section - Personal Data - POWIĘKSZONA responsywna szerokość */}
      <div className="w-auto h-auto lg:min-h-[200px] p-2 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-center items-center gap-1.5" style={{ boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)' }}>
        {/* Date From - responsywne inputy */}
        <div className="w-auto flex items-center gap-1">
          <div className="w-28 lg:w-[111px] h-12 lg:h-[35px] bg-[#194576] rounded-[5px] flex items-center justify-center px-1" style={{ boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)' }}>
            <span className="text-white text-sm font-black font-['Inter'] italic leading-tight">📅 Data od:</span>
          </div>
          <input
            ref={dayFromRef}
            type="text"
            placeholder="DD"
            value={formData.dateFrom.day}
            onClick={handleDateFieldClick}
            onChange={(e) => onFieldChange('dateFrom', 'day', e.target.value, e.target)}
            className={`w-12 lg:w-[38px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-sm lg:text-xs font-black font-['Inter'] ${
              formErrors.dateFrom.day ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
            style={{ boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)' }}
          />
          <span className="text-white text-sm lg:text-xs font-black font-['Inter'] italic leading-none">/</span>
          <input
            ref={monthFromRef}
            type="text"
            placeholder="MM"
            value={formData.dateFrom.month}
            onClick={handleDateFieldClick}
            onChange={(e) => onFieldChange('dateFrom', 'month', e.target.value, e.target)}
            className={`w-12 lg:w-[38px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-sm lg:text-xs font-black font-['Inter'] shadow-md ${
              formErrors.dateFrom.month ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
          />
          <span className="text-white text-sm lg:text-xs font-black font-['Inter'] italic leading-none">/</span>
          <input
            type="text"
            placeholder="25"
            value={formData.dateFrom.year}
            onClick={handleDateFieldClick}
            onChange={(e) => onFieldChange('dateFrom', 'year', e.target.value, e.target)}
            className={`w-16 lg:w-[61px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-sm lg:text-xs font-black font-['Inter'] shadow-md ${
              formErrors.dateFrom.year ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
          />
        </div>

        {/* Date To - responsywne inputy */}
        <div className="w-auto flex items-center gap-1">
          <div className="w-28 lg:w-[111px] h-12 lg:h-[35px] bg-[#194576] rounded-[5px] shadow-md flex items-center justify-center px-1">
            <span className="text-white text-sm font-black font-['Inter'] italic leading-tight">📅 Data do:</span>
          </div>
          <input
            ref={dayToRef}
            type="text"
            placeholder="DD"
            value={formData.dateTo.day}
            onClick={handleDateFieldClick}
            onChange={(e) => onFieldChange('dateTo', 'day', e.target.value, e.target)}
            className={`w-12 lg:w-[38px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-sm lg:text-xs font-black font-['Inter'] shadow-md ${
              formErrors.dateTo.day ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
          />
          <span className="text-white text-sm lg:text-xs font-black font-['Inter'] italic leading-none">/</span>
          <input
            ref={monthToRef}
            type="text"
            placeholder="MM"
            value={formData.dateTo.month}
            onClick={handleDateFieldClick}
            onChange={(e) => onFieldChange('dateTo', 'month', e.target.value, e.target)}
            className={`w-12 lg:w-[38px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-sm lg:text-xs font-black font-['Inter'] shadow-md ${
              formErrors.dateTo.month ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
          />
          <span className="text-white text-sm lg:text-xs font-black font-['Inter'] italic leading-none">/</span>
          <input
            type="text"
            placeholder="25"
            value={formData.dateTo.year}
            onClick={handleDateFieldClick}
            onChange={(e) => onFieldChange('dateTo', 'year', e.target.value, e.target)}
            className={`w-16 lg:w-[61px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-sm lg:text-xs font-black font-['Inter'] shadow-md ${
              formErrors.dateTo.year ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
          />
        </div>

        {/* Height - responsywne */}
        <div className="w-auto flex items-center gap-1">
          <div className="w-28 lg:w-[111px] h-12 lg:h-[35px] bg-[#194576] rounded-[5px] shadow-md flex items-center justify-center">
            <span className="text-white text-base font-black font-['Inter'] italic leading-snug">📏 Wzrost:</span>
          </div>
          <input
            ref={heightRef}
            type="text"
            placeholder="180"
            value={formData.height.value}
            onChange={(e) => onFieldChange('height', 'value', e.target.value, e.target)}
            className={`w-20 lg:w-[102px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-sm lg:text-xs font-black font-['Inter'] shadow-md ${
              formErrors.height ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
          />
          <div className="w-10 lg:w-[35px] h-12 lg:h-[35px] bg-[#194576] rounded-[5px] shadow-md flex items-center justify-center">
            <span className="text-white text-sm lg:text-xs font-black font-['Inter'] italic leading-none">cm</span>
          </div>
        </div>

        {/* Weight - responsywne */}
        <div className="w-auto flex items-center gap-1">
          <div className="w-28 lg:w-[111px] h-12 lg:h-[35px] bg-[#194576] rounded-[5px] shadow-md flex items-center justify-center">
            <span className="text-white text-base font-black font-['Inter'] italic leading-snug">⚖️ Waga:</span>
          </div>
          <input
            ref={weightRef}
            type="text"
            placeholder="70"
            value={formData.weight.value}
            onChange={(e) => onFieldChange('weight', 'value', e.target.value, e.target)}
            className={`w-20 lg:w-[102px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-sm lg:text-xs font-black font-['Inter'] shadow-md ${
              formErrors.weight ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
          />
          <div className="w-10 lg:w-[35px] h-12 lg:h-[35px] bg-[#194576] rounded-[5px] shadow-md flex items-center justify-center">
            <span className="text-white text-sm lg:text-xs font-black font-['Inter'] italic leading-none">kg</span>
          </div>
        </div>
      </div>

      {/* Center Section - Level, Gender and Shoe Size - POWIĘKSZONA responsywna szerokość */}
      <div className="w-full lg:w-[270px] h-auto lg:min-h-[200px] p-2 bg-[#2C699F] rounded-[10px] border border-white flex flex-col justify-center items-start gap-1.5" style={{ boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)' }}>
        {/* Level - responsywny */}
        <div className="w-full flex items-center gap-2">
          <div className="flex-1 lg:w-[140px] h-12 lg:h-[35px] bg-[#194576] rounded-[5px] shadow-md flex items-center justify-center">
            <span className="text-white text-lg font-black font-['Inter'] italic leading-[25px]">🎖️ Poziom:</span>
          </div>
          <input
            ref={levelRef}
            type="text"
            placeholder="1-6"
            value={formData.level}
            onChange={(e) => onFieldChange('level', 'value', e.target.value, e.target)}
            className={`w-20 lg:w-[60px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-base lg:text-xs font-black font-['Inter'] shadow-md ${
              formErrors.level ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
          />
        </div>

        {/* Gender - responsywny */}
        <div className="w-full flex items-center gap-2">
          <div className="flex-1 lg:w-[140px] h-12 lg:h-[35px] bg-[#194576] rounded-[5px] shadow-md flex items-center justify-center">
            <span className="text-white text-lg font-black font-['Inter'] italic leading-[25px]">👤 Płeć:</span>
          </div>
          <input
            ref={genderRef}
            type="text"
            placeholder="M/K"
            value={formData.gender}
            onChange={(e) => onFieldChange('gender', 'value', e.target.value, e.target)}
            className={`w-20 lg:w-[60px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-base lg:text-xs font-black font-['Inter'] shadow-md ${
              formErrors.gender ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
          />
        </div>

        {/* Shoe Size - responsywny */}
        <div className="w-full flex items-center gap-2">
          <div className="flex-1 lg:w-[140px] h-12 lg:h-[35px] bg-[#194576] rounded-[5px] shadow-md flex items-center justify-center">
            <span className="text-white text-lg font-black font-['Inter'] italic leading-[25px]">👟 Rozmiar:</span>
          </div>
          <input
            ref={shoeSizeRef}
            type="text"
            placeholder="23-35"
            value={formData.shoeSize || ''}
            onChange={(e) => onFieldChange('shoeSize', 'value', e.target.value, e.target)}
            className={`w-20 lg:w-[60px] h-12 lg:h-[35px] rounded-[5px] text-white text-center text-base lg:text-xs font-black font-['Inter'] shadow-md ${
              formErrors.shoeSize ? 'bg-red-600 border-2 border-red-400' : 'bg-[#194576]'
            }`}
          />
        </div>
      </div>
    </>
  );
};

export default SkierForm;

