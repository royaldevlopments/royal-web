const API_BASE = import.meta.env.VITE_API_URL || '/devlopment/api';
const BILLING_URL = import.meta.env.VITE_BILLING_URL || '/devlopment';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function billingUrl(path: string): string {
  return `${BILLING_URL}${path}`;
}

export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), options);
}
