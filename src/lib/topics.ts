// Pure normalization of free-text study blocks into a canonical topic.
// Topic rules are domain-specific and ship EMPTY by default — no personal data.
// Add entries here to auto-classify study blocks for the topic stats.

const TOPIC_RULES: { topic: string; pattern: RegExp }[] = [];

/** Maps an Estudo block's activity (+ note) to a normalized topic, or null. */
export function topicFor(activity: string, note?: string | null): string | null {
  const text = `${activity} ${note ?? ''}`;
  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(text)) return rule.topic;
  }
  return null;
}

export const KNOWN_TOPICS = TOPIC_RULES.map((r) => r.topic);
