import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService, AUTH_EXPIRED_EVENT } from '../services/authService';

describe('AuthService.fetch', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const listen = () => {
    const handler = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, handler);
    return { handler, stop: () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler) };
  };

  it('dokleja Bearer i scala nagłówki wywołującego (nagłówek wywołującego wygrywa)', async () => {
    AuthService.setToken('abc');
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    await AuthService.fetch('/api/x', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer own' } });

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(init.method).toBe('PUT');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('authorization')).toBe('Bearer own');
  });

  it('401 usuwa token i wysyła auth:expired (także gdy token został już usunięty ze storage)', async () => {
    const { handler, stop } = listen();
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }));

    AuthService.setToken('stary');
    await AuthService.fetch('/api/reservations');
    expect(AuthService.getToken()).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);

    await AuthService.fetch('/api/reservations'); // brak tokenu w sessionStorage
    expect(handler).toHaveBeenCalledTimes(2);
    stop();
  });

  it('odpowiedzi inne niż 401 nie wysyłają zdarzenia i zachowują token', async () => {
    const { handler, stop } = listen();
    AuthService.setToken('ok');
    for (const status of [200, 403, 500]) {
      fetchMock.mockResolvedValueOnce(new Response('{}', { status }));
      await AuthService.fetch('/api/x');
    }
    expect(handler).not.toHaveBeenCalled();
    expect(AuthService.getToken()).toBe('ok');
    stop();
  });
});
