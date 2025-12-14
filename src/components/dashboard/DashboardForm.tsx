/**
 * src/components/dashboard/DashboardForm.tsx: Komponent formularza Dashboard
 * Wrapper dla SkierForm z logiką formularza
 */

import React from 'react';
import SkierForm from './SkierForm';
import type { FormData } from '../../types/dashboard.types';
import type { FormErrors } from '../../utils/formValidation';

interface DashboardFormProps {
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

/**
 * src/components/dashboard/DashboardForm.tsx: Komponent formularza Dashboard
 * Opakowuje SkierForm i przekazuje wszystkie potrzebne props
 */
export const DashboardForm: React.FC<DashboardFormProps> = (props) => {
  return <SkierForm {...props} />;
};
