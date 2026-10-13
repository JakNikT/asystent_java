import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickDatePicker, type QuickDatePickerProps } from '../components/date/QuickDatePicker';

const TODAY = new Date(2026, 9, 12); // 12 października 2026

/** Kontrolowany wrapper, by sprawdzić też aktualizację wyświetlanej wartości */
const Controlled: React.FC<Partial<QuickDatePickerProps> & { spy: (v: string) => void; initial?: string }> = ({
  spy,
  initial = '',
  ...rest
}) => {
  const [value, setValue] = useState(initial);
  return (
    <QuickDatePicker
      label="Data od"
      today={TODAY}
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        spy(v);
      }}
    />
  );
};

const byId = (id: string) => document.getElementById(id) as HTMLElement;

describe('QuickDatePicker', () => {
  it('dzień -> miesiąc: zapisuje datę z automatycznym rokiem', () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} />);

    fireEvent.click(byId('qdp-data-od-field'));
    fireEvent.click(byId('qdp-data-od-day-15'));
    // Po wyborze dnia automatycznie przechodzi do miesięcy
    expect(byId('qdp-data-od-month-1')).toBeTruthy();
    fireEvent.click(byId('qdp-data-od-month-1'));

    expect(spy).toHaveBeenCalledWith('2027-01-15');
    expect(byId('qdp-data-od-seg-day').textContent).toBe('15');
    expect(byId('qdp-data-od-seg-month').textContent).toBe('01');
    expect(byId('qdp-data-od-seg-year').textContent).toBe('2027');
    // Panel zamknięty
    expect(byId('qdp-data-od-panel')).toBeNull();
  });

  it('klik w segment roku przy istniejącej dacie zmienia tylko rok', () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} initial="2026-12-20" />);

    fireEvent.click(byId('qdp-data-od-seg-year'));
    expect(byId('qdp-data-od-year-2028')).toBeTruthy();
    fireEvent.click(byId('qdp-data-od-year-2028'));

    expect(spy).toHaveBeenCalledWith('2028-12-20');
  });

  it('klik w segment miesiąca przy istniejącej dacie zmienia tylko miesiąc', () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} initial="2026-12-20" />);

    fireEvent.click(byId('qdp-data-od-seg-month'));
    fireEvent.click(byId('qdp-data-od-month-11'));

    expect(spy).toHaveBeenCalledWith('2026-11-20');
  });

  it('wpisywanie z klawiatury "1501" ustawia 15.01 z rokiem auto', () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} />);
    const field = byId('qdp-data-od-field');

    for (const key of ['1', '5', '0', '1']) fireEvent.keyDown(field, { key });
    expect(spy).toHaveBeenLastCalledWith('2027-01-15');

    // Dopisanie roku nadpisuje rok auto
    fireEvent.keyDown(field, { key: '2' });
    fireEvent.keyDown(field, { key: '8' });
    expect(spy).toHaveBeenLastCalledWith('2028-01-15');
  });

  it('Enter zatwierdza wpisany dzień i miesiąc ("5.3")', () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} />);
    const field = byId('qdp-data-od-field');

    fireEvent.keyDown(field, { key: '5' });
    fireEvent.keyDown(field, { key: '.' });
    // "05" + "3" -> "0503" -> auto-zapis po 4 cyfrach
    fireEvent.keyDown(field, { key: '3' });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(spy).toHaveBeenLastCalledWith('2027-03-05');
  });

  it('skróty Dziś / Jutro', () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} />);

    fireEvent.click(byId('qdp-data-od-field'));
    fireEvent.click(byId('qdp-data-od-quick-tomorrow'));
    expect(spy).toHaveBeenLastCalledWith('2026-10-13');
  });

  it('skrót +3 w "Data do" liczy od "Data od"', () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} label="Data do" quickFrom="2026-12-30" minDate="2026-12-30" />);

    fireEvent.click(byId('qdp-data-do-field'));
    fireEvent.click(byId('qdp-data-do-quick-plus3'));
    expect(spy).toHaveBeenLastCalledWith('2027-01-02');
  });

  it('bez quickFrom nie pokazuje skrótów +N', () => {
    render(<Controlled spy={vi.fn()} />);
    fireEvent.click(byId('qdp-data-od-field'));
    expect(byId('qdp-data-od-quick-plus3')).toBeNull();
  });

  it('dzień 31 wyszarza miesiące krótsze', () => {
    render(<Controlled spy={vi.fn()} />);

    fireEvent.click(byId('qdp-data-od-field'));
    fireEvent.click(byId('qdp-data-od-day-31'));

    expect((byId('qdp-data-od-month-2') as HTMLButtonElement).disabled).toBe(true);
    expect((byId('qdp-data-od-month-4') as HTMLButtonElement).disabled).toBe(true);
    expect((byId('qdp-data-od-month-1') as HTMLButtonElement).disabled).toBe(false);
  });

  it('w "Data do" rok dobierany jest tak, by nie był przed "Data od"', () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} label="Data do" minDate="2026-12-28" />);

    fireEvent.click(byId('qdp-data-do-field'));
    fireEvent.click(byId('qdp-data-do-day-3'));
    fireEvent.click(byId('qdp-data-do-month-1'));
    expect(spy).toHaveBeenLastCalledWith('2027-01-03');
  });

  it('przycisk ✕ czyści datę', () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} initial="2026-12-20" />);

    fireEvent.click(byId('qdp-data-od-clear'));
    expect(spy).toHaveBeenLastCalledWith('');
    expect(byId('qdp-data-od-seg-day').textContent).toBe('DD');
  });

  it('Escape zamyka panel bez zmian', () => {
    const spy = vi.fn();
    render(<Controlled spy={spy} />);
    const field = byId('qdp-data-od-field');

    fireEvent.click(field);
    expect(screen.getByRole('listbox', { name: 'Dzień' })).toBeTruthy();
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(byId('qdp-data-od-panel')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
