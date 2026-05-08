export interface WordFrequency {
  word: string
  count: number
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'it', 'its', 'this',
  'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'he', 'she', 'they', 'them', 'his', 'her', 'their', 'what', 'which',
  'who', 'how', 'when', 'where', 'why', 'not', 'no', 'so', 'if', 'then',
  'just', 'also', 'very', 'too', 'more', 'most', 'much', 'many', 'some',
  'all', 'any', 'each', 'about', 'up', 'out', 'get', 'got', 'like', 'well',
  'yes', 'yeah', 'yep', 'nope', 'ok', 'okay',
])

export function extractWordFrequencies(answers: string[]): WordFrequency[] {
  const counts: Record<string, number> = {}

  for (const answer of answers) {
    const words = answer
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))

    for (const word of words) {
      counts[word] = (counts[word] ?? 0) + 1
    }
  }

  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
}

export function extractPhraseFrequencies(answers: string[]): WordFrequency[] {
  const counts: Record<string, number> = {}

  for (const answer of answers) {
    const normalized = answer.trim().toLowerCase()
    if (normalized) {
      counts[normalized] = (counts[normalized] ?? 0) + 1
    }
  }

  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
}
