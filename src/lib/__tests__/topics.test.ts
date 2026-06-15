import { KNOWN_TOPICS, topicFor } from '../topics';

describe('topicFor', () => {
  it('ships with no topic rules → always null (no personal data)', () => {
    expect(topicFor('Inglês (Anki + escuta)')).toBeNull();
    expect(topicFor('Estudo matinal', 'Matemática')).toBeNull();
    expect(topicFor('Tempo livre')).toBeNull();
  });

  it('exposes no known topics by default', () => {
    expect(KNOWN_TOPICS).toEqual([]);
  });
});
