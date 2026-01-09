import React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pl';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// src/components/DatePickerButton.tsx: Ustawienie polskiej lokalizacji
dayjs.locale('pl');

interface DatePickerButtonProps {
  label: string;
  value: string; // Format YYYY-MM-DD
  onChange: (date: string) => void;
  icon?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}

// src/components/DatePickerButton.tsx: Motyw dopasowany do aplikacji (primary: #386BB2, ciemne tło)
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#386BB2', // Twój kolor brand
      light: '#5088CC',
      dark: '#2C5A99',
    },
    background: {
      default: '#0f2744',
      paper: '#1a3a5c',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(56, 107, 178, 0.1)',
            borderRadius: '8px',
            fontSize: '1rem',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#386BB2',
            },
          },
          '& .MuiInputBase-input': {
            padding: '16px',
            fontSize: '1rem',
            fontWeight: 500,
            minHeight: '44px', // Touch-friendly
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
    },
  },
});

// src/components/DatePickerButton.tsx: Komponent do wyboru daty z polską lokalizacją i ciemnym motywem
export const DatePickerButton: React.FC<DatePickerButtonProps> = ({
  label,
  value,
  onChange,
  icon = '📅',
  minDate,
  maxDate,
  disabled = false,
}) => {
  // src/components/DatePickerButton.tsx: Konwersja string (YYYY-MM-DD) na Dayjs
  const dayjsValue = value ? dayjs(value) : null;

  // src/components/DatePickerButton.tsx: Obsługa zmiany daty
  const handleChange = (newValue: Dayjs | null) => {
    if (newValue && newValue.isValid()) {
      // Konwersja Dayjs na string (YYYY-MM-DD)
      onChange(newValue.format('YYYY-MM-DD'));
    } else {
      onChange('');
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pl">
        <div className="flex flex-col gap-2 w-full">
          <DatePicker
            label={`${icon} ${label}`}
            value={dayjsValue}
            onChange={handleChange}
            disabled={disabled}
            openTo="day"
            views={['year', 'month', 'day']}
            closeOnSelect={true}
            minDate={minDate ? dayjs(minDate) : undefined}
            maxDate={maxDate ? dayjs(maxDate) : undefined}
            format="DD MMMM YYYY" // "12 stycznia 2025"
            slotProps={{
              textField: {
                fullWidth: true,
                variant: 'outlined',
                placeholder: 'Wybierz datę',
                sx: {
                  minHeight: '56px',
                  '& input': {
                    cursor: 'pointer',
                  },
                },
              },
              actionBar: {
                actions: ['clear', 'today'],
              },
              // src/components/DatePickerButton.tsx: Dostosowanie panelu kalendarza dla desktop
              desktopPaper: {
                sx: {
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                  borderRadius: '12px',
                },
              },
              // src/components/DatePickerButton.tsx: Dostosowanie dla mobile
              mobilePaper: {
                sx: {
                  borderRadius: '12px',
                },
              },
            }}
            sx={{
              width: '100%',
            }}
          />
        </div>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

