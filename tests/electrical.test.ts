import { describe, it, expect } from 'vitest';
import {
  clamp,
  sanitiseMetric,
  roundTo,
  formatNumber,
  formatMetricValue,
  solveWireMetrics,
  mergeMetrics,
  emptyWireMetrics,
  calculateInductiveReactance,
  calculateCapacitiveReactance,
  calculateNetReactance,
  calculateImpedance,
  calculatePhaseAngle,
  calculatePowerFactor,
  getPhaseCharacteristic,
  calculateResonantFrequency,
  solveACCircuit,
  formatACMetricValue,
  emptyACMetrics,
  validateACInput,
  capacitanceToFarads,
  inductanceToHenries,
  formatFrequency,
  COMMON_AC_FREQUENCIES,
  DEFAULT_AC_FREQUENCY,
} from '../src/utils/electrical';

// ============================================================================
// DC utilities
// ============================================================================

describe('clamp', () => {
  it('should return the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('should clamp to minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('should clamp to maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('should return min for NaN input', () => {
    expect(clamp(NaN, 0, 10)).toBe(0);
  });

  it('should handle boundary values', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('sanitiseMetric', () => {
  it('should keep valid finite numbers', () => {
    const result = sanitiseMetric({ voltage: 5, current: 2 });
    expect(result.voltage).toBe(5);
    expect(result.current).toBe(2);
  });

  it('should remove non-finite values', () => {
    const result = sanitiseMetric({ voltage: Infinity, current: NaN, resistance: 10 });
    expect(result.voltage).toBeUndefined();
    expect(result.current).toBeUndefined();
    expect(result.resistance).toBe(10);
  });

  it('should handle an empty object', () => {
    expect(sanitiseMetric({})).toEqual({});
  });

  it('should keep zero as a valid value', () => {
    const result = sanitiseMetric({ watts: 0 });
    expect(result.watts).toBe(0);
  });
});

describe('roundTo', () => {
  it('should round to specified decimal places', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
  });

  it('should default to 3 decimal places', () => {
    expect(roundTo(1.23456)).toBe(1.235);
  });

  it('should handle integers', () => {
    expect(roundTo(5, 2)).toBe(5);
  });

  it('should round up correctly', () => {
    expect(roundTo(2.5, 0)).toBe(3);
  });
});

describe('formatNumber', () => {
  it('should format a normal number with 2 decimal places', () => {
    expect(formatNumber(3.14159)).toBe('3.14');
  });

  it('should return em-dash for non-finite values', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
  });

  it('should use fewer decimals for large numbers (≥1000)', () => {
    const result = formatNumber(1234.5678, 2);
    // magnitude ≥ 1000 → appliedDigits = 1
    expect(result).toBe('1234.6');
  });

  it('should use fewer decimals for numbers ≥100', () => {
    const result = formatNumber(123.456, 2);
    // magnitude ≥ 100 → min(2,1) = 1
    expect(result).toBe('123.5');
  });

  it('should respect the digits parameter for small numbers', () => {
    expect(formatNumber(0.12345, 4)).toBe('0.1235');
  });
});

describe('formatMetricValue', () => {
  it('should format voltage with V unit', () => {
    expect(formatMetricValue(12, 'voltage')).toBe('12.00 V');
  });

  it('should format current with A unit', () => {
    expect(formatMetricValue(0.5, 'current')).toBe('0.500 A');
  });

  it('should format resistance with Ω unit', () => {
    expect(formatMetricValue(100, 'resistance')).toBe('100.0 Ω');
  });

  it('should format watts with W unit', () => {
    expect(formatMetricValue(25, 'watts')).toBe('25.00 W');
  });

  it('should return em-dash for null/undefined/non-finite', () => {
    expect(formatMetricValue(null, 'voltage')).toBe('—');
    expect(formatMetricValue(undefined, 'voltage')).toBe('—');
    expect(formatMetricValue(NaN, 'voltage')).toBe('—');
  });
});

describe('solveWireMetrics', () => {
  it('should solve from voltage and resistance (Ohm\'s law)', () => {
    const result = solveWireMetrics({ voltage: 10, resistance: 5 });
    expect(result.current).toBeCloseTo(2);
    expect(result.watts).toBeCloseTo(20);
  });

  it('should solve from current and resistance', () => {
    const result = solveWireMetrics({ current: 2, resistance: 5 });
    expect(result.voltage).toBeCloseTo(10);
    expect(result.watts).toBeCloseTo(20);
  });

  it('should solve from voltage and current', () => {
    const result = solveWireMetrics({ voltage: 10, current: 2 });
    expect(result.resistance).toBeCloseTo(5);
    expect(result.watts).toBeCloseTo(20);
  });

  it('should solve from watts and voltage', () => {
    const result = solveWireMetrics({ watts: 20, voltage: 10 });
    expect(result.current).toBeCloseTo(2);
    expect(result.resistance).toBeCloseTo(5);
  });

  it('should solve from watts and current', () => {
    const result = solveWireMetrics({ watts: 20, current: 2 });
    expect(result.voltage).toBeCloseTo(10);
    expect(result.resistance).toBeCloseTo(5);
  });

  it('should solve from watts and resistance', () => {
    const result = solveWireMetrics({ watts: 20, resistance: 5 });
    expect(result.current).toBeCloseTo(2);
    expect(result.voltage).toBeCloseTo(10);
  });

  it('should accept all four values and return them unchanged when consistent', () => {
    const result = solveWireMetrics({ voltage: 10, current: 2, resistance: 5, watts: 20 });
    expect(result.voltage).toBeCloseTo(10);
    expect(result.current).toBeCloseTo(2);
    expect(result.resistance).toBeCloseTo(5);
    expect(result.watts).toBeCloseTo(20);
  });

  it('should throw when given insufficient information to solve', () => {
    expect(() => solveWireMetrics({ voltage: 10 })).toThrow();
    expect(() => solveWireMetrics({})).toThrow();
  });

  it('should include derived metadata for computed values', () => {
    const result = solveWireMetrics({ voltage: 10, resistance: 5 });
    expect(result.derived.current).toBeDefined();
    expect(result.derived.current?.formula).toContain('I');
  });
});

describe('mergeMetrics', () => {
  it('should merge base and overrides, with overrides taking precedence', () => {
    const result = mergeMetrics({ voltage: 5, current: 1 }, { voltage: 10 });
    expect(result.voltage).toBe(10);
    expect(result.current).toBe(1);
  });

  it('should handle undefined base', () => {
    const result = mergeMetrics(undefined, { voltage: 5 });
    expect(result.voltage).toBe(5);
  });

  it('should handle undefined overrides', () => {
    const result = mergeMetrics({ resistance: 10 }, undefined);
    expect(result.resistance).toBe(10);
  });

  it('should filter out non-finite values from both inputs', () => {
    const result = mergeMetrics({ voltage: Infinity }, { current: NaN, resistance: 5 });
    expect(result.voltage).toBeUndefined();
    expect(result.current).toBeUndefined();
    expect(result.resistance).toBe(5);
  });
});

describe('emptyWireMetrics', () => {
  it('should return all four metrics as zero', () => {
    const m = emptyWireMetrics();
    expect(m.voltage).toBe(0);
    expect(m.current).toBe(0);
    expect(m.resistance).toBe(0);
    expect(m.watts).toBe(0);
  });

  it('should return independent copies on each call', () => {
    const a = emptyWireMetrics();
    const b = emptyWireMetrics();
    a.voltage = 99;
    expect(b.voltage).toBe(0);
  });
});

// ============================================================================
// AC utilities
// ============================================================================

describe('calculateInductiveReactance', () => {
  it('should compute XL = 2πfL', () => {
    // f=60Hz, L=1H → XL ≈ 376.99 Ω
    const xl = calculateInductiveReactance(60, 1);
    expect(xl).toBeCloseTo(2 * Math.PI * 60 * 1, 4);
  });

  it('should return 0 for non-finite inputs', () => {
    expect(calculateInductiveReactance(NaN, 1)).toBe(0);
    expect(calculateInductiveReactance(60, NaN)).toBe(0);
  });

  it('should return 0 for zero inductance', () => {
    expect(calculateInductiveReactance(60, 0)).toBe(0);
  });
});

describe('calculateCapacitiveReactance', () => {
  it('should compute XC = 1/(2πfC)', () => {
    const xc = calculateCapacitiveReactance(60, 1e-3);
    expect(xc).toBeCloseTo(1 / (2 * Math.PI * 60 * 1e-3), 4);
  });

  it('should return 0 for zero capacitance or zero frequency', () => {
    expect(calculateCapacitiveReactance(60, 0)).toBe(0);
    expect(calculateCapacitiveReactance(0, 1e-3)).toBe(0);
  });

  it('should return 0 for non-finite inputs', () => {
    expect(calculateCapacitiveReactance(NaN, 1e-3)).toBe(0);
  });
});

describe('calculateNetReactance', () => {
  it('should return XL - XC', () => {
    expect(calculateNetReactance(50, 30)).toBe(20);
  });

  it('should return negative for capacitive-dominant circuit', () => {
    expect(calculateNetReactance(10, 40)).toBe(-30);
  });

  it('should return zero at resonance', () => {
    expect(calculateNetReactance(25, 25)).toBe(0);
  });
});

describe('calculateImpedance', () => {
  it('should compute Z = √(R² + X²)', () => {
    // R=3, X=4 → Z=5
    expect(calculateImpedance(3, 4)).toBe(5);
  });

  it('should equal resistance when reactance is zero', () => {
    expect(calculateImpedance(10, 0)).toBe(10);
  });

  it('should return 0 for non-finite inputs', () => {
    expect(calculateImpedance(NaN, 4)).toBe(0);
  });
});

describe('calculatePhaseAngle', () => {
  it('should return 0 for purely resistive circuit', () => {
    expect(calculatePhaseAngle(0, 10)).toBe(0);
  });

  it('should return 90 for pure inductive circuit (R=0, X>0)', () => {
    expect(calculatePhaseAngle(10, 0)).toBe(90);
  });

  it('should return -90 for pure capacitive circuit (R=0, X<0)', () => {
    expect(calculatePhaseAngle(-10, 0)).toBe(-90);
  });

  it('should return 45° for equal R and X (inductive)', () => {
    expect(calculatePhaseAngle(10, 10)).toBeCloseTo(45, 4);
  });

  it('should return 0 for non-finite inputs', () => {
    expect(calculatePhaseAngle(NaN, 10)).toBe(0);
  });
});

describe('calculatePowerFactor', () => {
  it('should return 1 for 0° phase angle', () => {
    expect(calculatePowerFactor(0)).toBeCloseTo(1);
  });

  it('should return 0 for 90° phase angle', () => {
    expect(calculatePowerFactor(90)).toBeCloseTo(0, 6);
  });

  it('should return cos(60°) ≈ 0.5 for 60° phase angle', () => {
    expect(calculatePowerFactor(60)).toBeCloseTo(0.5, 4);
  });

  it('should return 1 for non-finite input', () => {
    expect(calculatePowerFactor(NaN)).toBe(1);
  });
});

describe('getPhaseCharacteristic', () => {
  it('should return "unity" for a near-zero phase angle', () => {
    expect(getPhaseCharacteristic(0)).toBe('unity');
    expect(getPhaseCharacteristic(0.05)).toBe('unity');
  });

  it('should return "lagging" for positive phase angle (inductive)', () => {
    expect(getPhaseCharacteristic(30)).toBe('lagging');
  });

  it('should return "leading" for negative phase angle (capacitive)', () => {
    expect(getPhaseCharacteristic(-30)).toBe('leading');
  });
});

describe('calculateResonantFrequency', () => {
  it('should compute f₀ = 1/(2π√(LC))', () => {
    const L = 0.01;  // 10 mH
    const C = 1e-6;  // 1 µF
    const expected = 1 / (2 * Math.PI * Math.sqrt(L * C));
    expect(calculateResonantFrequency(L, C)).toBeCloseTo(expected, 2);
  });

  it('should return null for zero or negative inputs', () => {
    expect(calculateResonantFrequency(0, 1e-6)).toBeNull();
    expect(calculateResonantFrequency(0.01, 0)).toBeNull();
    expect(calculateResonantFrequency(-1, 1e-6)).toBeNull();
  });

  it('should return null for non-finite inputs', () => {
    expect(calculateResonantFrequency(NaN, 1e-6)).toBeNull();
    expect(calculateResonantFrequency(0.01, Infinity)).toBeNull();
  });
});

describe('solveACCircuit', () => {
  it('should solve a purely resistive AC circuit', () => {
    const result = solveACCircuit({ voltage: 120, frequencyHz: 60, resistance: 60 });
    expect(result.current).toBeCloseTo(2, 4);
    expect(result.realPower).toBeCloseTo(240, 2);
    expect(result.powerFactor).toBeCloseTo(1, 4);
    expect(result.phaseAngle).toBeCloseTo(0, 2);
    expect(result.inductiveReactance).toBeCloseTo(0, 4);
    expect(result.capacitiveReactance).toBeCloseTo(0, 4);
  });

  it('should compute inductive reactance when inductance is provided', () => {
    const L = 1 / (2 * Math.PI * 60); // XL = 1Ω at 60Hz
    const result = solveACCircuit({ voltage: 100, frequencyHz: 60, resistance: 0, inductance: L });
    expect(result.inductiveReactance).toBeCloseTo(1, 3);
    expect(result.phaseAngle).toBeCloseTo(90, 1);
  });

  it('should compute capacitive reactance when capacitance is provided', () => {
    const C = 1 / (2 * Math.PI * 60); // XC = 1Ω at 60Hz
    const result = solveACCircuit({ voltage: 100, frequencyHz: 60, resistance: 0, capacitance: C });
    expect(result.capacitiveReactance).toBeCloseTo(1, 3);
    expect(result.phaseAngle).toBeCloseTo(-90, 1);
  });

  it('should return near-zero current for zero impedance circuit (edge-case guard)', () => {
    // R=0, L=0, C=0 → impedance=0; result should not be NaN/Infinity
    const result = solveACCircuit({ voltage: 100, frequencyHz: 60, resistance: 0 });
    expect(Number.isFinite(result.current)).toBe(true);
  });
});

describe('formatACMetricValue', () => {
  it('should format inductiveReactance with Ω unit', () => {
    expect(formatACMetricValue(25, 'inductiveReactance')).toContain('Ω');
  });

  it('should format phaseAngle with ° unit', () => {
    expect(formatACMetricValue(45, 'phaseAngle')).toContain('°');
  });

  it('should return em-dash for non-finite values', () => {
    expect(formatACMetricValue(NaN, 'impedance')).toBe('—');
    expect(formatACMetricValue(null, 'impedance')).toBe('—');
    expect(formatACMetricValue(undefined, 'impedance')).toBe('—');
  });

  it('should format powerFactor without a unit (3 decimal places)', () => {
    // powerFactor precision is 3, so 0.85 → "0.850"
    const result = formatACMetricValue(0.85, 'powerFactor');
    expect(result).toBe('0.850');
  });
});

describe('emptyACMetrics', () => {
  it('should return all metrics as zero except powerFactor (which is 1)', () => {
    const m = emptyACMetrics();
    expect(m.inductiveReactance).toBe(0);
    expect(m.impedance).toBe(0);
    expect(m.powerFactor).toBe(1);
    expect(m.current).toBe(0);
  });

  it('should default frequency to DEFAULT_AC_FREQUENCY (60 Hz)', () => {
    const m = emptyACMetrics();
    expect(m.frequencyHz).toBe(DEFAULT_AC_FREQUENCY);
    expect(m.frequencyHz).toBe(60);
  });

  it('should accept a custom frequency', () => {
    const m = emptyACMetrics(50);
    expect(m.frequencyHz).toBe(50);
  });
});

describe('validateACInput', () => {
  it('should return valid for a correct input set', () => {
    const result = validateACInput({ voltage: 120, frequencyHz: 60, resistance: 10 });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report an error for negative voltage', () => {
    const result = validateACInput({ voltage: -5 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('voltage'))).toBe(true);
  });

  it('should report an error for non-positive frequency', () => {
    const result = validateACInput({ frequencyHz: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('frequency'))).toBe(true);
  });

  it('should report an error for negative resistance', () => {
    const result = validateACInput({ resistance: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('resistance'))).toBe(true);
  });

  it('should report an error for negative inductance', () => {
    const result = validateACInput({ inductance: -0.1 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('inductance'))).toBe(true);
  });

  it('should report an error for negative capacitance', () => {
    const result = validateACInput({ capacitance: -1e-6 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('capacitance'))).toBe(true);
  });

  it('should accumulate multiple errors', () => {
    const result = validateACInput({ voltage: -1, frequencyHz: -10 });
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('capacitanceToFarads', () => {
  it('should convert microfarads to Farads', () => {
    expect(capacitanceToFarads.fromMicrofarads(1)).toBeCloseTo(1e-6);
    expect(capacitanceToFarads.fromMicrofarads(100)).toBeCloseTo(1e-4);
  });

  it('should convert nanofarads to Farads', () => {
    expect(capacitanceToFarads.fromNanofarads(1)).toBeCloseTo(1e-9);
  });

  it('should convert picofarads to Farads', () => {
    expect(capacitanceToFarads.fromPicofarads(1)).toBeCloseTo(1e-12);
  });
});

describe('inductanceToHenries', () => {
  it('should convert millihenries to Henries', () => {
    expect(inductanceToHenries.fromMillihenries(1)).toBeCloseTo(1e-3);
    expect(inductanceToHenries.fromMillihenries(500)).toBeCloseTo(0.5);
  });

  it('should convert microhenries to Henries', () => {
    expect(inductanceToHenries.fromMicrohenries(1)).toBeCloseTo(1e-6);
  });
});

describe('formatFrequency', () => {
  it('should format sub-1kHz as Hz', () => {
    expect(formatFrequency(60)).toContain('Hz');
    expect(formatFrequency(60)).not.toContain('kHz');
  });

  it('should format kHz range', () => {
    expect(formatFrequency(1000)).toContain('kHz');
  });

  it('should format MHz range', () => {
    expect(formatFrequency(1_000_000)).toContain('MHz');
  });

  it('should format GHz range', () => {
    expect(formatFrequency(1_000_000_000)).toContain('GHz');
  });

  it('should return fallback for non-finite input', () => {
    expect(formatFrequency(NaN)).toBe('— Hz');
  });
});

describe('COMMON_AC_FREQUENCIES', () => {
  it('should define expected standard frequencies', () => {
    expect(COMMON_AC_FREQUENCIES.northAmerica).toBe(60);
    expect(COMMON_AC_FREQUENCIES.europe).toBe(50);
    expect(COMMON_AC_FREQUENCIES.aircraft400Hz).toBe(400);
  });
});
