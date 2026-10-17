import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabsState } from '../components/dashboard/hooks/useTabsState';

describe('useTabsState', () => {
  it('nadaje unikalne ID kartom po usunięciu karty ze środka', () => {
    const { result } = renderHook(() => useTabsState());

    act(() => result.current.addNewTab()); // 2
    act(() => result.current.addNewTab()); // 3
    act(() => result.current.removeTab('2'));
    act(() => result.current.addNewTab()); // dawniej (length + 1) = "3" -> duplikat

    const ids = result.current.tabs.map(t => t.id);
    expect(ids).toEqual(['1', '3', '4']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usunięcie aktywnej karty przełącza na pierwszą pozostałą, a nieaktywnej zachowuje aktywną', () => {
    const { result } = renderHook(() => useTabsState());
    act(() => result.current.addNewTab()); // aktywna "2"

    act(() => result.current.removeTab('1'));
    expect(result.current.activeTabId).toBe('2');

    act(() => result.current.addNewTab()); // aktywna "3"
    act(() => result.current.removeTab('3'));
    expect(result.current.activeTabId).toBe('2');
  });

  it('nie usuwa ostatniej karty', () => {
    const { result } = renderHook(() => useTabsState());
    act(() => result.current.removeTab('1'));
    expect(result.current.tabs).toHaveLength(1);
  });
});
