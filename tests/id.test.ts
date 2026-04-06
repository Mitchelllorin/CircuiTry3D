import { describe, it, expect } from 'vitest';
import { createId } from '../src/utils/id';

describe('ID Utilities', () => {
  describe('createId', () => {
    it('should return a string', () => {
      const id = createId('test');
      expect(typeof id).toBe('string');
    });

    it('should start with the given prefix', () => {
      expect(createId('node').startsWith('node_')).toBe(true);
      expect(createId('wire').startsWith('wire_')).toBe(true);
      expect(createId('circuit').startsWith('circuit_')).toBe(true);
    });

    it('should produce unique values on repeated calls', () => {
      const ids = new Set(Array.from({ length: 50 }, () => createId('x')));
      expect(ids.size).toBe(50);
    });

    it('should accept an empty string prefix', () => {
      const id = createId('');
      expect(id.startsWith('_')).toBe(true);
    });

    it('should produce non-empty IDs', () => {
      for (let i = 0; i < 10; i++) {
        expect(createId('item').length).toBeGreaterThan(1);
      }
    });

    it('should handle special-character prefixes', () => {
      const id = createId('my-prefix');
      expect(id.startsWith('my-prefix_')).toBe(true);
    });
  });
});
