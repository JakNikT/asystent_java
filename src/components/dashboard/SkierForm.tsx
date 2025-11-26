import React from 'react';
import type { FormData } from '../../types/dashboard.types';
import type { FormErrors } from '../../utils/formValidation';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';

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

  // Pomocnicza funkcja do renderowania grupy inputów daty
  const renderDateInputs = (
    label: string,
    section: 'dateFrom' | 'dateTo',
    dayRef: React.RefObject<HTMLInputElement | null>,
    monthRef: React.RefObject<HTMLInputElement | null>
  ) => (
    <div className="flex flex-row items-center justify-between gap-3 bg-[#0f2744]/50 p-2 rounded-lg border border-white/5 shadow-md shadow-black/20">
      <Label className="text-white font-bold text-sm uppercase tracking-wider opacity-90 flex items-center gap-2 min-w-[100px]">
        📅 {label}
      </Label>
      <div className="flex items-center gap-1">
        <Input
          ref={dayRef}
          type="text"
          placeholder="DD"
          value={formData[section].day}
          onClick={handleDateFieldClick}
          onChange={(e) => onFieldChange(section, 'day', e.target.value, e.target)}
          className={`w-24 h-10 text-center font-bold text-xl bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-shadow ${formErrors[section].day ? 'border-red-500 ring-2 ring-red-500' : ''}`}
          maxLength={2}
        />
        <span className="text-white/50 font-bold text-xl">/</span>
        <Input
          ref={monthRef}
          type="text"
          placeholder="MM"
          value={formData[section].month}
          onClick={handleDateFieldClick}
          onChange={(e) => onFieldChange(section, 'month', e.target.value, e.target)}
          className={`w-24 h-10 text-center font-bold text-xl bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-shadow ${formErrors[section].month ? 'border-red-500 ring-2 ring-red-500' : ''}`}
          maxLength={2}
        />
        <span className="text-white/50 font-bold text-xl">/</span>
        <Input
          type="text"
          placeholder="YY"
          value={formData[section].year}
          onClick={handleDateFieldClick}
          onChange={(e) => onFieldChange(section, 'year', e.target.value, e.target)}
          className={`w-24 h-10 text-center font-bold text-xl bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-shadow ${formErrors[section].year ? 'border-red-500 ring-2 ring-red-500' : ''}`}
          maxLength={2}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Left Section - Personal Data */}
      <div className="w-full lg:w-auto flex-1 p-5 bg-black/20 rounded-xl border border-white/10 flex flex-col justify-center gap-4 shadow-2xl shadow-black/40 backdrop-blur-md">

        <div className="flex flex-col gap-3">
          {renderDateInputs('Data od:', 'dateFrom', dayFromRef, monthFromRef)}
          {renderDateInputs('Data do:', 'dateTo', dayToRef, monthToRef)}
        </div>

        <div className="flex flex-row gap-3">
          {/* Height */}
          <div className="flex flex-row items-center justify-between gap-2 bg-[#0f2744]/50 p-2 rounded-lg border border-white/5 shadow-md shadow-black/20 flex-1">
            <Label className="text-white font-bold text-xs uppercase tracking-wider opacity-90 flex items-center gap-1 min-w-[60px]">
              📏 Wzrost:
            </Label>
            <div className="flex items-center gap-1">
              <Input
                ref={heightRef}
                type="text"
                placeholder="180"
                value={formData.height.value}
                onChange={(e) => onFieldChange('height', 'value', e.target.value, e.target)}
                className={`w-24 h-10 text-center font-bold text-xl bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-shadow ${formErrors.height ? 'border-red-500 ring-2 ring-red-500' : ''}`}
                maxLength={3}
              />
              <span className="text-white/70 text-sm font-medium w-6">cm</span>
            </div>
          </div>

          {/* Weight */}
          <div className="flex flex-row items-center justify-between gap-2 bg-[#0f2744]/50 p-2 rounded-lg border border-white/5 shadow-md shadow-black/20 flex-1">
            <Label className="text-white font-bold text-xs uppercase tracking-wider opacity-90 flex items-center gap-1 min-w-[60px]">
              ⚖️ Waga:
            </Label>
            <div className="flex items-center gap-1">
              <Input
                ref={weightRef}
                type="text"
                placeholder="70"
                value={formData.weight.value}
                onChange={(e) => onFieldChange('weight', 'value', e.target.value, e.target)}
                className={`w-24 h-10 text-center font-bold text-xl bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-shadow ${formErrors.weight ? 'border-red-500 ring-2 ring-red-500' : ''}`}
                maxLength={3}
              />
              <span className="text-white/70 text-sm font-medium w-6">kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Section - Level, Gender and Shoe Size */}
      <div className="w-full lg:w-auto flex-1 p-5 bg-black/20 rounded-xl border border-white/10 flex flex-col justify-center gap-4 shadow-2xl shadow-black/40 backdrop-blur-md">

        {/* Level */}
        <div className="flex flex-row items-center justify-between gap-3 bg-[#0f2744]/50 p-2 rounded-lg border border-white/5 shadow-md shadow-black/20">
          <Label className="text-white font-bold text-sm uppercase tracking-wider opacity-90 flex items-center gap-2 min-w-[100px]">
            🎖️ Poziom:
          </Label>
          <div className="relative">
            <Input
              ref={levelRef}
              type="text"
              placeholder="1-6"
              value={formData.level}
              onChange={(e) => onFieldChange('level', 'value', e.target.value, e.target)}
              className={`w-24 h-10 text-center font-bold text-xl bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-shadow ${formErrors.level ? 'border-red-500 ring-2 ring-red-500' : ''}`}
              maxLength={1}
            />
          </div>
        </div>

        {/* Gender */}
        <div className="flex flex-row items-center justify-between gap-3 bg-[#0f2744]/50 p-2 rounded-lg border border-white/5 shadow-md shadow-black/20">
          <Label className="text-white font-bold text-sm uppercase tracking-wider opacity-90 flex items-center gap-2 min-w-[100px]">
            👤 Płeć:
          </Label>
          <Input
            ref={genderRef}
            type="text"
            placeholder="M/K"
            value={formData.gender}
            onChange={(e) => onFieldChange('gender', 'value', e.target.value, e.target)}
            className={`w-24 h-10 text-center font-bold text-xl uppercase bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-shadow ${formErrors.gender ? 'border-red-500 ring-2 ring-red-500' : ''}`}
            maxLength={1}
          />
        </div>

        {/* Shoe Size */}
        <div className="flex flex-row items-center justify-between gap-3 bg-[#0f2744]/50 p-2 rounded-lg border border-white/5 shadow-md shadow-black/20">
          <Label className="text-white font-bold text-sm uppercase tracking-wider opacity-90 flex items-center gap-2 min-w-[100px]">
            👟 Rozmiar:
          </Label>
          <Input
            ref={shoeSizeRef}
            type="text"
            placeholder="23-35"
            value={formData.shoeSize || ''}
            onChange={(e) => onFieldChange('shoeSize', 'value', e.target.value, e.target)}
            className={`w-24 h-10 text-center font-bold text-xl bg-primary text-white border-transparent focus:border-blue-400 placeholder:text-white/30 rounded-md shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40 transition-shadow ${formErrors.shoeSize ? 'border-red-500 ring-2 ring-red-500' : ''}`}
            maxLength={5}
          />
        </div>
      </div>
    </>
  );
};

export default SkierForm;
