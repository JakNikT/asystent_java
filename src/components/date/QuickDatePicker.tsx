// src/components/date/QuickDatePicker.tsx: Szybki wybór daty na komputerze (DD / MM / RRRR + skróty + klawiatura)
import React, { useEffect, useRef, useState } from 'react';
import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {
  addDays,
  appendKey,
  dateToISO,
  isOutOfRange,
  isValidDate,
  parseTypedDate,
  resolveYear,
  splitISO,
  toISO,
  yearRange,
  type DateParts,
} from '../../utils/dateParts';
import './QuickDatePicker.css';

type Step = 'day' | 'month' | 'year';
/** full = pełny przepływ dzień -> miesiąc (rok auto); single = poprawka jednego segmentu istniejącej daty */
type Mode = 'full' | 'single';

export interface QuickDatePickerProps {
  label: string;
  value: string; // Format YYYY-MM-DD
  onChange: (date: string) => void;
  icon?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  /** Data bazowa dla skrótów „+N dni” (np. Data od przy polu Data do) */
  quickFrom?: string;
  /** Wstrzykiwana data "dzisiaj" (testy) */
  today?: Date;
}

const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const QUICK_OFFSETS = [1, 2, 3, 5, 7];
const STEP_LABELS: Record<Step, string> = { day: 'Dzień', month: 'Miesiąc', year: 'Rok' };
const BUFFER_TIMEOUT_MS = 2000;

const pad2 = (n: number) => String(n).padStart(2, '0');

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const weekdayOf = ({ day, month, year }: DateParts): string => {
  if (!day || !month || !year || !isValidDate(day, month, year)) return '';
  return new Date(year, month - 1, day)
    .toLocaleDateString('pl-PL', { weekday: 'short' })
    .replace('.', '');
};

export const QuickDatePicker: React.FC<QuickDatePickerProps> = ({
  label,
  value,
  onChange,
  icon = '📅',
  minDate,
  maxDate,
  disabled = false,
  quickFrom,
  today: todayProp,
}) => {
  const today = todayProp ?? new Date();
  const todayISO = dateToISO(today);
  const slug = slugify(label) || 'data';
  const id = (suffix: string) => `qdp-${slug}-${suffix}`;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('day');
  const [mode, setMode] = useState<Mode>('full');
  const [draft, setDraft] = useState<DateParts>({});
  const fieldRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef('');
  const bufferTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (bufferTimer.current) clearTimeout(bufferTimer.current);
  }, []);

  const valueParts = splitISO(value);
  const shown = open ? draft : valueParts;
  const valueInvalid = !!value && isOutOfRange(value, minDate, maxDate);

  // --- Pomocnicze ---------------------------------------------------------
  const resetBuffer = () => {
    bufferRef.current = '';
    if (bufferTimer.current) clearTimeout(bufferTimer.current);
  };

  const close = () => {
    setOpen(false);
    resetBuffer();
  };

  const commit = (iso: string) => {
    onChange(iso);
    close();
  };

  const resolve = (day: number, month: number) =>
    resolveYear(day, month, { today, notBefore: minDate, notAfter: maxDate });

  const isAllowed = (day: number, month: number, year: number) =>
    isValidDate(day, month, year) && !isOutOfRange(toISO(day, month, year), minDate, maxDate);

  const openAt = (nextStep: Step, nextMode: Mode) => {
    if (disabled) return;
    resetBuffer();
    setDraft(splitISO(value));
    setStep(nextStep);
    setMode(nextMode);
    setOpen(true);
  };

  const handleSegmentClick = (segment: Step) => (e: React.MouseEvent) => {
    e.stopPropagation();
    // Pusta data -> zawsze pełny przepływ od dnia; istniejąca -> poprawka tylko tego segmentu
    if (value) openAt(segment, 'single');
    else openAt('day', 'full');
  };

  // --- Wybór kafelków -----------------------------------------------------
  const pickDay = (day: number) => {
    resetBuffer();
    if (mode === 'single' && draft.month && draft.year) {
      commit(toISO(day, draft.month, draft.year));
      return;
    }
    setDraft((d) => ({ ...d, day }));
    setStep('month');
  };

  const pickMonth = (month: number) => {
    resetBuffer();
    const { day } = draft;
    if (!day) {
      setDraft((d) => ({ ...d, month }));
      setStep('day');
      return;
    }
    if (mode === 'single' && draft.year) {
      commit(toISO(day, month, draft.year));
      return;
    }
    const year = resolve(day, month);
    if (year !== null) commit(toISO(day, month, year));
  };

  const pickYear = (year: number) => {
    resetBuffer();
    if (draft.day && draft.month) {
      commit(toISO(draft.day, draft.month, year));
      return;
    }
    setDraft((d) => ({ ...d, year }));
    setStep(draft.day ? 'month' : 'day');
  };

  // --- Blokowanie kafelków ------------------------------------------------
  const dayDisabled = (day: number) =>
    mode === 'single' && !!draft.month && !!draft.year && !isAllowed(day, draft.month, draft.year);

  const monthDisabled = (month: number) => {
    if (!draft.day) return false;
    if (mode === 'single' && draft.year) return !isAllowed(draft.day, month, draft.year);
    return resolve(draft.day, month) === null;
  };

  const yearDisabled = (year: number) =>
    !!draft.day && !!draft.month && !isAllowed(draft.day, draft.month, year);

  // --- Klawiatura ---------------------------------------------------------
  const applyBuffer = (buffer: string) => {
    bufferRef.current = buffer;
    if (bufferTimer.current) clearTimeout(bufferTimer.current);
    bufferTimer.current = setTimeout(() => {
      bufferRef.current = '';
    }, BUFFER_TIMEOUT_MS);

    const parts = parseTypedDate(buffer);
    let year = parts.year;
    if (!year && parts.day && parts.month) year = resolve(parts.day, parts.month) ?? undefined;

    setOpen(true);
    setMode('full');
    setDraft({ day: parts.day, month: parts.month, year });
    setStep(buffer.length < 2 ? 'day' : buffer.length < 4 ? 'month' : 'year');

    const complete = parts.day && parts.month && year && isAllowed(parts.day, parts.month, year);
    if (!complete) return;
    const iso = toISO(parts.day!, parts.month!, year!);
    if (buffer.length === 4) {
      onChange(iso); // zapis z rokiem auto, panel zostaje otwarty na ewentualny rok
    } else if (buffer.length === 6 || buffer.length === 8) {
      commit(iso);
    }
  };

  const confirmDraft = () => {
    const { day, month } = draft;
    if (day && month) {
      const year = draft.year ?? resolve(day, month);
      if (year && isAllowed(day, month, year)) {
        commit(toISO(day, month, year));
        return;
      }
    }
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const { key } = e;
    const isSeparator = /^[./\- ]$/.test(key);
    if (/^\d$/.test(key) || (isSeparator && bufferRef.current)) {
      e.preventDefault();
      applyBuffer(appendKey(bufferRef.current, key));
      return;
    }
    switch (key) {
      case 'Enter':
        e.preventDefault();
        if (open) confirmDraft();
        else openAt('day', 'full');
        break;
      case 'ArrowDown':
        if (!open) {
          e.preventDefault();
          openAt('day', 'full');
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
        break;
      case 'Backspace':
        if (!open && !bufferRef.current) break;
        e.preventDefault();
        if (bufferRef.current) {
          const next = bufferRef.current.slice(0, -1);
          if (next) applyBuffer(next);
          else {
            resetBuffer();
            setDraft({});
            setStep('day');
          }
        } else {
          setStep((s) => (s === 'year' ? 'month' : 'day'));
        }
        break;
      case 'Delete':
        e.preventDefault();
        onChange('');
        close();
        break;
    }
  };

  // --- Skróty ---------------------------------------------------------------
  const quickButtons = [
    { key: 'today', label: 'Dziś', iso: todayISO },
    { key: 'tomorrow', label: 'Jutro', iso: addDays(todayISO, 1) },
    ...(quickFrom
      ? QUICK_OFFSETS.map((n) => ({ key: `plus${n}`, label: `+${n}`, iso: addDays(quickFrom, n) }))
      : []),
  ];

  // --- Render -------------------------------------------------------------
  const segmentClass = (segment: Step) =>
    `qdp__seg ${open && step === segment ? 'qdp__seg--active' : ''} ${
      shown[segment] === undefined ? 'qdp__seg--empty' : ''
    }`;

  const tileClass = (selected: boolean, isToday: boolean) =>
    `qdp-tile ${selected ? 'qdp-tile--selected' : ''} ${isToday ? 'qdp-tile--today' : ''}`;

  const renderGrid = () => {
    if (step === 'day') {
      return (
        <div className="qdp-grid qdp-grid--days" key="day" role="listbox" aria-label="Dzień">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              type="button"
              id={id(`day-${d}`)}
              className={tileClass(draft.day === d, d === today.getDate())}
              disabled={dayDisabled(d)}
              onClick={() => pickDay(d)}
            >
              {d}
            </button>
          ))}
        </div>
      );
    }
    if (step === 'month') {
      return (
        <div className="qdp-grid qdp-grid--months" key="month" role="listbox" aria-label="Miesiąc">
          {MONTHS.map((name, i) => {
            const m = i + 1;
            return (
              <button
                key={m}
                type="button"
                id={id(`month-${m}`)}
                className={tileClass(draft.month === m, m === today.getMonth() + 1)}
                disabled={monthDisabled(m)}
                onClick={() => pickMonth(m)}
              >
                <span className="qdp-tile__main">{name}</span>
                <span className="qdp-tile__sub">{pad2(m)}</span>
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <div className="qdp-grid qdp-grid--years" key="year" role="listbox" aria-label="Rok">
        {yearRange(today).map((y) => (
          <button
            key={y}
            type="button"
            id={id(`year-${y}`)}
            className={tileClass(draft.year === y, y === today.getFullYear())}
            disabled={yearDisabled(y)}
            onClick={() => pickYear(y)}
          >
            {y}
          </button>
        ))}
      </div>
    );
  };

  const weekday = weekdayOf(shown);

  return (
    <ClickAwayListener onClickAway={() => open && close()}>
      <div className="qdp-root">
        <div
          ref={fieldRef}
          id={id('field')}
          role="group"
          aria-label={label}
          tabIndex={disabled ? -1 : 0}
          className={`qdp ${open ? 'qdp--open' : ''} ${disabled ? 'qdp--disabled' : ''} ${
            valueInvalid ? 'qdp--invalid' : ''
          }`}
          onClick={() => (open ? close() : openAt('day', 'full'))}
          onKeyDown={handleKeyDown}
        >
          <span className="qdp__label">
            {icon} {label}
          </span>
          <div className="qdp__row">
            <button
              type="button"
              tabIndex={-1}
              id={id('seg-day')}
              className={segmentClass('day')}
              onClick={handleSegmentClick('day')}
              disabled={disabled}
              aria-label="Dzień"
            >
              {shown.day ? pad2(shown.day) : 'DD'}
            </button>
            <span className="qdp__sep">.</span>
            <button
              type="button"
              tabIndex={-1}
              id={id('seg-month')}
              className={segmentClass('month')}
              onClick={handleSegmentClick('month')}
              disabled={disabled}
              aria-label="Miesiąc"
            >
              {shown.month ? pad2(shown.month) : 'MM'}
            </button>
            <span className="qdp__sep">.</span>
            <button
              type="button"
              tabIndex={-1}
              id={id('seg-year')}
              className={`${segmentClass('year')} qdp__seg--year`}
              onClick={handleSegmentClick('year')}
              disabled={disabled}
              aria-label="Rok"
            >
              {shown.year ?? 'RRRR'}
            </button>
            {weekday && <span className="qdp__weekday">{weekday}</span>}
            <span className="qdp__spacer" />
            {value && !disabled && (
              <button
                type="button"
                tabIndex={-1}
                id={id('clear')}
                className="qdp__clear"
                aria-label="Wyczyść datę"
                title="Wyczyść (Del)"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                  close();
                }}
              >
                ✕
              </button>
            )}
            <span className={`qdp__chevron ${open ? 'qdp__chevron--open' : ''}`} aria-hidden>
              ▾
            </span>
          </div>
        </div>

        <Popper
          open={open && !disabled}
          anchorEl={fieldRef.current}
          placement="bottom-start"
          style={{ zIndex: 1600 }}
          modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
        >
          {/* preventDefault na mousedown: fokus zostaje na polu -> klawiatura dalej działa */}
          <div
            className="qdp-panel"
            id={id('panel')}
            onMouseDown={(e) => e.preventDefault()}
            onKeyDown={handleKeyDown}
          >
            <div className="qdp-quick">
              {quickButtons.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  id={id(`quick-${q.key}`)}
                  className={`qdp-quick__btn ${q.key.startsWith('plus') ? 'qdp-quick__btn--rel' : ''}`}
                  disabled={isOutOfRange(q.iso, minDate, maxDate)}
                  title={q.iso.split('-').reverse().join('.')}
                  onClick={() => commit(q.iso)}
                >
                  {q.label}
                </button>
              ))}
              {quickFrom && <span className="qdp-quick__hint">dni od „Data od”</span>}
            </div>

            <div className="qdp-steps">
              {(['day', 'month', 'year'] as Step[]).map((s) => {
                const v = draft[s];
                const display = v === undefined ? '' : s === 'month' ? MONTHS[v - 1] : String(v);
                return (
                  <button
                    key={s}
                    type="button"
                    id={id(`step-${s}`)}
                    className={`qdp-steps__btn ${step === s ? 'qdp-steps__btn--active' : ''}`}
                    onClick={() => setStep(s)}
                  >
                    <span className="qdp-steps__name">{STEP_LABELS[s]}</span>
                    <span className="qdp-steps__value">{display || '—'}</span>
                  </button>
                );
              })}
            </div>

            {renderGrid()}

            <div className="qdp-hint">
              Wpisz np. <kbd>1501</kbd> · <kbd>Enter</kbd> zatwierdza · <kbd>Esc</kbd> zamyka
            </div>
          </div>
        </Popper>
      </div>
    </ClickAwayListener>
  );
};

export default QuickDatePicker;
