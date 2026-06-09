import { topicFor } from '../topics';

describe('topicFor', () => {
  it('maps English variants to Inglês', () => {
    expect(topicFor('Inglês (Anki + escuta)')).toBe('Inglês');
    expect(topicFor('Estudo: Inglês (TOEFL ativo)')).toBe('Inglês');
    expect(topicFor('Estudo matinal', 'Inglês')).toBe('Inglês'); // from note
  });

  it('maps the other subjects', () => {
    expect(topicFor('Estudo matinal', 'Matemática')).toBe('Matemática');
    expect(topicFor('Redação')).toBe('Redação');
    expect(topicFor('Estudo: Cloud / AWS')).toBe('Cloud/AWS');
    expect(topicFor('Estudo: Claude / IA')).toBe('Claude/IA');
  });

  it('returns null for unmatched text', () => {
    expect(topicFor('Estudo prioritário 2')).toBeNull();
    expect(topicFor('Tempo livre')).toBeNull();
  });
});
