import React, { useState } from 'react';
import { checkApiHealth } from '../services/api';
import { ConnectionState, HealthResponse } from '../types';

export const App: React.FC = () => {
  const [state, setState] = useState<ConnectionState>('idle');
  const [data, setData] = useState<HealthResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setState('loading');
    setErrorMsg(null);
    try {
      const result = await checkApiHealth();
      setData(result);
      setState('success');
    } catch (err: unknown) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reach API server');
    }
  };

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div>
          <h1 className="popup-title">JobStreet Quick Apply</h1>
          <span className="popup-badge">Manifest V3</span>
        </div>
      </div>

      <div className="status-card">
        <div className="status-label">Backend API Status</div>
        <div className="status-value">
          <span className={`status-indicator ${state}`} />
          <span>
            {state === 'idle' && 'Not checked'}
            {state === 'loading' && 'Checking connection...'}
            {state === 'success' && 'Connected'}
            {state === 'error' && 'Connection Failed'}
          </span>
        </div>

        {state === 'success' && data && (
          <div className="status-details">
            <div><strong>Service:</strong> {data.service}</div>
            <div><strong>Status:</strong> {data.status}</div>
          </div>
        )}

        {state === 'error' && errorMsg && (
          <div className="status-details" style={{ color: '#b91c1c' }}>
            <strong>Error:</strong> {errorMsg}
          </div>
        )}
      </div>

      <button
        className="action-button"
        onClick={handleTestConnection}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? 'Testing Connection...' : 'Test API Connection'}
      </button>

      <div className="popup-footer">
        JobStreet Quick Apply Automation • Phase 1
      </div>
    </div>
  );
};
