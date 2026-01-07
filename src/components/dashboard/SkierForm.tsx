import React from 'react';
import type { FormData } from '../../types/dashboard.types';
import type { FormErrors } from '../../utils/formValidation';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { DatePickerButton } from '../DatePickerButton';

interface SkierFormProps {
  formData: FormData;
  formErrors: FormErrors;
  onFieldChange: (section: keyof FormData | string, field: string, value: string, el?: HTMLInputElement) => void;
  onDateChange: (section: 'dateFrom' | 'dateTo', value: string) => void;
  // Refs dla automatycznego przechodzenia między polami
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
  onDateChange,
  heightRef,
  weightRef,
  levelRef,
  genderRef,
  shoeSizeRef
}) => {

  return (
    <>
      {/* Left Section - Personal Data */}
      <div className="w-full lg:w-auto flex-1 p-3 lg:p-5 bg-black/20 rounded-xl border border-white/10 flex flex-col justify-center gap-3 lg:gap-4 shadow-2xl shadow-black/40 backdrop-blur-md">

        <div className="flex flex-col gap-3">
          <DatePickerButton
            label="Data od"
            icon="📅"
            value={formData.dateFrom}
            onChange={(date) => onDateChange('dateFrom', date)}
            maxDate={formData.dateTo || undefined}
          />
          <DatePickerButton
            label="Data do"
            icon="📅"
            value={formData.dateTo}
            onChange={(date) => onDateChange('dateTo', date)}
            minDate={formData.dateFrom || undefined}
          />
        </div>

        {/* Ukryte na mobile - widoczne tylko na lg+ */}
        <div className="hidden lg:flex flex-row gap-3">
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

      {/* Center Section - Level, Gender and Shoe Size - Ukryte na mobile */}
      <div className="hidden lg:flex w-full lg:w-auto flex-1 p-5 bg-black/20 rounded-xl border border-white/10 flex-col justify-center gap-4 shadow-2xl shadow-black/40 backdrop-blur-md">

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
