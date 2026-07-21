import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips Polish diacritics (NFD-decomposable)', () => {
    expect(slugify('Zażółć gęślą jaźń')).toBe('zazolc-gesla-jazn');
  });

  it('handles ł/Ł which have no NFD decomposition', () => {
    expect(slugify('Łódź miłość')).toBe('lodz-milosc');
  });

  it('collapses multiple non-alphanumeric runs into a single dash', () => {
    expect(slugify('a  --  b__c!!!d')).toBe('a-b-c-d');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('  --Hello--  ')).toBe('hello');
  });

  it('returns empty string for input with no alphanumerics', () => {
    expect(slugify('!!! ??? ...')).toBe('');
  });
});
