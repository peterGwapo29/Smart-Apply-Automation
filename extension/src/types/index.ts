export interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
  database?: string;
  message?: string;
}

export type ConnectionState = 'idle' | 'loading' | 'success' | 'error';
