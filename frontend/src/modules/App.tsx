import React, { Suspense, useMemo, useState } from 'react';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { OhmsLawPanel } from '@components/OhmsLawPanel';
import { Scene3D } from '@components/Scene3D';

export function App(): JSX.Element {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(
    import.meta.env.VITE_API_BASE_URL ?? '/api'
  );

  const api = useMemo(() => ({ baseUrl: apiBaseUrl, setBaseUrl: setApiBaseUrl }), [apiBaseUrl]);

  return (
    <ErrorBoundary>
      <div style={{ width: '100vw', height: '100vh', background: '#0b1020', color: '#fff' }}>
        <Suspense fallback={<div style={{ padding: 16 }}>Loading 3D scene…</div>}>
          <Scene3D />
        </Suspense>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
          <OhmsLawPanel apiBaseUrl={api.baseUrl} onApiBaseUrlChange={api.setBaseUrl} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
