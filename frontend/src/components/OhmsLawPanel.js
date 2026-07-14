import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo, useState } from 'react';
async function postJson(url, body, signal) {
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
    return res.json();
}
export function OhmsLawPanel(props) {
    const { apiBaseUrl, onApiBaseUrlChange } = props;
    const [voltage, setVoltage] = useState('');
    const [current, setCurrent] = useState('');
    const [resistance, setResistance] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const disabledField = useMemo(() => {
        const emptyCount = [voltage, current, resistance].filter((v) => v.trim() === '').length;
        if (emptyCount !== 1)
            return 'none';
        if (voltage.trim() === '')
            return 'voltage';
        if (current.trim() === '')
            return 'current';
        if (resistance.trim() === '')
            return 'resistance';
        return 'none';
    }, [voltage, current, resistance]);
    const handleCalculate = useCallback(async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        const ctrl = new AbortController();
        const payload = {
            voltage: voltage.trim() === '' ? undefined : Number(voltage),
            current: current.trim() === '' ? undefined : Number(current),
            resistance: resistance.trim() === '' ? undefined : Number(resistance)
        };
        try {
            const data = await postJson(`${apiBaseUrl}/ohms-law`, payload, ctrl.signal);
            setResult(data);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setLoading(false);
        }
    }, [apiBaseUrl, voltage, current, resistance]);
    return (_jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("strong", { children: "CircuiTry3D \u2022 Ohm\u2019s Law" }), _jsxs("label", { children: ["API:", _jsx("input", { value: apiBaseUrl, onChange: (e) => onApiBaseUrlChange(e.target.value), style: { width: 220, marginLeft: 6 } })] }), _jsxs("label", { children: ["V (volts):", _jsx("input", { type: "number", value: voltage, onChange: (e) => setVoltage(e.target.value), disabled: disabledField === 'voltage' })] }), _jsxs("label", { children: ["I (amps):", _jsx("input", { type: "number", value: current, onChange: (e) => setCurrent(e.target.value), disabled: disabledField === 'current' })] }), _jsxs("label", { children: ["R (ohms):", _jsx("input", { type: "number", value: resistance, onChange: (e) => setResistance(e.target.value), disabled: disabledField === 'resistance' })] }), _jsx("button", { onClick: handleCalculate, disabled: loading || disabledField === 'none', children: loading ? 'Calculating…' : 'Calculate' }), error && _jsx("span", { style: { color: '#ff6b6b' }, children: error }), result && (_jsxs("span", { style: { marginLeft: 12 }, children: ["V=", result.voltage.toFixed(4), " \u2022 I=", result.current.toFixed(4), " \u2022 R=", result.resistance.toFixed(4)] })), _jsx("a", { href: "/legacy.html", target: "_blank", rel: "noreferrer", style: { marginLeft: 'auto', color: '#9ef01a' }, children: "Open Legacy UI" })] }));
}
