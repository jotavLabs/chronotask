// Pure normalization of free-text study blocks into a canonical topic.
// Shared by the seed (new installs) and the backfill (existing DBs).

const TOPIC_RULES: { topic: string; pattern: RegExp }[] = [
  { topic: 'Inglês', pattern: /ingl[êe]s|toefl|anki/i },
  { topic: 'Matemática', pattern: /matem[áa]tica/i },
  { topic: 'Redação', pattern: /reda[çc][ãa]o/i },
  { topic: 'PM/CAPM', pattern: /\bpm\b|capm|gest[ãa]o de projetos/i },
  { topic: 'Cloud/AWS', pattern: /cloud|aws/i },
  { topic: 'Claude/IA', pattern: /claude|intelig[êe]ncia artificial|\bia\b/i },
];

/** Maps an Estudo block's activity (+ note) to a normalized topic, or null. */
export function topicFor(activity: string, note?: string | null): string | null {
  const text = `${activity} ${note ?? ''}`;
  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(text)) return rule.topic;
  }
  return null;
}

export const KNOWN_TOPICS = TOPIC_RULES.map((r) => r.topic);
