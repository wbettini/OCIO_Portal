/** Thin fetch wrapper: always sends X-Persona, returns typed JSON, and
 * surfaces failures as a typed ApiError.
 */

const STORAGE_KEY = 'ocio-portal:persona';
const DEFAULT_PERSONA = 'admin';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function getCurrentPersona(): string {
  if (typeof window === 'undefined') return DEFAULT_PERSONA;
  return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_PERSONA;
}

export function setCurrentPersona(personaKey: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, personaKey);
}

const API_BASE_URL = import.meta.env['VITE_API_BASE_URL'] || '/api/v1';

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { persona?: string } = {},
): Promise<T> {
  const { persona, headers, ...rest } = options;
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-Persona': persona ?? getCurrentPersona(),
      ...headers,
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'detail' in payload
        ? String((payload as { detail: unknown }).detail)
        : undefined) ?? `Request to ${path} failed with status ${response.status}`;
    throw new ApiError(response.status, payload, message);
  }

  return payload as T;
}
