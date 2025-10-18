import React, { useCallback, useMemo, useState } from 'react';

type OhmsLawRequest = {
  voltage?: number;
  current?: number;
  resistance?: number;
};

type OhmsLawResponse = {
  voltage: number;
  current: number;
  resistance: number;
};

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export function OhmsLawPanel(props: { apiBaseUrl: string; onApiBaseUrlChange: (url: string) => void }): JSX.Element {
  const { apiBaseUrl, onApiBaseUrlChange } = props;
  const [voltage, setVoltage] = useState<string>('');
  const [current, setCurrent] = useState<string>('');
  const [resistance, setResistance] = useState<string>('');
  const [result, setResult] = useState<OhmsLawResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const disabledField = useMemo(() => {
    const emptyCount = [voltage, current, resistance].filter((v) => v.trim() === '').length;
    if (emptyCount !== 1) return 'none';
    if (voltage.trim() === '') return 'voltage';
    if (current.trim() === '') return 'current';
    if (resistance.trim() === '') return 'resistance';
    return 'none';
  }, [voltage, current, resistance]);

  const handleCalculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const ctrl = new AbortController();
    const payload: OhmsLawRequest = {
      voltage: voltage.trim() === '' ? undefined : Number(voltage),
      current: current.trim() === '' ? undefined : Number(current),
      resistance: resistance.trim() === '' ? undefined : Number(resistance)
    };
    try {
      const data = await postJson<OhmsLawResponse>(`${apiBaseUrl}/ohms-law`, payload, ctrl.signal);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, voltage, current, resistance]);

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <strong>CircuiTry3D • Ohm’s Law</strong>
      <label>
        API:
        <input value={apiBaseUrl} onChange={(e) => onApiBaseUrlChange(e.target.value)} style={{ width: 220, marginLeft: 6 }} />
      </label>
      <label>
        V (volts):
        <input type="number" value={voltage} onChange={(e) => setVoltage(e.target.value)} disabled={disabledField === 'voltage'} />
      </label>
      <label>
        I (amps):
        <input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={disabledField === 'current'} />
      </label>
      <label>
        R (ohms):
        <input type="number" value={resistance} onChange={(e) => setResistance(e.target.value)} disabled={disabledField === 'resistance'} />
      </label>
      <button onClick={handleCalculate} disabled={loading || disabledField === 'none'}>
        {loading ? 'Calculating…' : 'Calculate'}
      </button>
      {error && <span style={{ color: '#ff6b6b' }}>{error}</span>}
      {result && (
        <span style={{ marginLeft: 12 }}>
          V={result.voltage.toFixed(4)} • I={result.current.toFixed(4)} • R={result.resistance.toFixed(4)}
        </span>
      )}
      <a href="/legacy.html" target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: '#9ef01a' }}>
        Open Legacy UI
      </a>
    </div>
  );
}
