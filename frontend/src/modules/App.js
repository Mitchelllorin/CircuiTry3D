import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense, useMemo, useState } from 'react';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { OhmsLawPanel } from '@components/OhmsLawPanel';
import { Scene3D } from '@components/Scene3D';
export function App() {
    const [apiBaseUrl, setApiBaseUrl] = useState(import.meta.env.VITE_API_BASE_URL ?? '/api');
    const api = useMemo(() => ({ baseUrl: apiBaseUrl, setBaseUrl: setApiBaseUrl }), [apiBaseUrl]);
    return (_jsx(ErrorBoundary, { children: _jsxs("div", { style: { width: '100vw', height: '100vh', background: '#0b1020', color: '#fff' }, children: [_jsx(Suspense, { fallback: _jsx("div", { style: { padding: 16 }, children: "Loading 3D scene\u2026" }), children: _jsx(Scene3D, {}) }), _jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, padding: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }, children: _jsx(OhmsLawPanel, { apiBaseUrl: api.baseUrl, onApiBaseUrlChange: api.setBaseUrl }) })] }) }));
}
