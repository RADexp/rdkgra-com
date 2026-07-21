import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from './sanitize-url';

describe('sanitizeUrl', () => {
  it('accepts http and https URLs', () => {
    expect(sanitizeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('rejects javascript: and other protocols', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('data:text/html,x')).toBeNull();
    expect(sanitizeUrl('ftp://example.com')).toBeNull();
  });

  it('returns null for empty/invalid input', () => {
    expect(sanitizeUrl(null)).toBeNull();
    expect(sanitizeUrl(undefined)).toBeNull();
    expect(sanitizeUrl('')).toBeNull();
    expect(sanitizeUrl('not a url')).toBeNull();
  });
});
