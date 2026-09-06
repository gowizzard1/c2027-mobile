import * as SecureStore from 'expo-secure-store';
import type { Candidate, TeamProfile } from './types';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://c2027-backend-production.up.railway.app').replace(/\/+$/, '');
export const TOKEN_KEY = 'campaign_team_token';

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string) {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message: string, public status = 0, public code?: string, public payload?: any) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.message || 'Request failed.', response.status, payload.error, payload);
  return payload as T;
}

export async function login(email: string, password: string) {
  return request<{ token: string } & TeamProfile>('/api/volunteers/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function loadProfile(token: string) {
  return request<TeamProfile>('/api/volunteers/me', {}, token);
}

export async function switchRole(token: string, assignmentId: string) {
  return request<{ token: string } & TeamProfile>('/api/volunteers/switch-role', { method: 'POST', body: JSON.stringify({ assignmentId }) }, token);
}

export async function requestStipend(token: string) {
  return request<any>('/api/volunteers/stipend/request', { method: 'POST' }, token);
}

export async function submitMobilizerReport(token: string, body: Record<string, unknown>) {
  return request<any>('/api/volunteers/mobilizer/report', { method: 'POST', body: JSON.stringify(body) }, token);
}

export async function getCandidates() {
  return request<Candidate[]>('/api/volunteers/election-candidates');
}

export async function submitPollingResult(token: string, form: FormData) {
  return request<any>('/api/volunteers/polling-result', { method: 'POST', body: form }, token);
}
