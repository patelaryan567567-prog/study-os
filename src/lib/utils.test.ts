import { describe, expect, it } from 'vitest';
import {
  cn,
  getBorderColor,
  getCardBg,
  getInputBg,
  getMutedTextColor,
  getTextColor,
} from '@/lib/utils';

describe('cn', () => {
  it('merges class name arrays and objects', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });

  it('resolves conflicting tailwind utilities in favour of the last one', () => {
    expect(cn('bg-white', 'bg-gray-800')).toBe('bg-gray-800');
  });
});

describe('theme class helpers', () => {
  it.each([
    [getTextColor, 'text-gray-100', 'text-gray-900'],
    [getMutedTextColor, 'text-gray-400', 'text-gray-600'],
    [getCardBg, 'bg-gray-800/50', 'bg-white/80'],
    [getBorderColor, 'border-gray-700', 'border-gray-200'],
    [getInputBg, 'bg-gray-800', 'bg-white'],
  ])('returns the dark and light variant', (helper, dark, light) => {
    const get = helper as (theme: 'light' | 'dark') => string;
    expect(get('dark')).toBe(dark);
    expect(get('light')).toBe(light);
  });
});
