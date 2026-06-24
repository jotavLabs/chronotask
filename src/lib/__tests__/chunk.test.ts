import { splitChunks } from '../chunk';

describe('splitChunks', () => {
  it('returns a single empty chunk for empty input', () => {
    expect(splitChunks('', 1800)).toEqual(['']);
  });

  it('keeps a short value in one chunk', () => {
    expect(splitChunks('abc', 1800)).toEqual(['abc']);
  });

  it('splits into chunks no larger than size and rejoins to the original', () => {
    const value = 'x'.repeat(4100);
    const chunks = splitChunks(value, 1800);
    expect(chunks).toHaveLength(3); // 1800 + 1800 + 500
    expect(chunks.every((c) => c.length <= 1800)).toBe(true);
    expect(chunks.join('')).toBe(value);
  });

  it('handles an exact multiple of size', () => {
    const value = 'y'.repeat(3600);
    const chunks = splitChunks(value, 1800);
    expect(chunks).toHaveLength(2);
    expect(chunks.join('')).toBe(value);
  });
});
