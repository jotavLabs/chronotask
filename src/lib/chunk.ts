// Quebra de strings em pedaços de tamanho máximo — usado pelo armazenamento seguro do
// token (expo-secure-store limita cada valor a ~2KB no Android). Puro, sem dependências.
export const CHUNK_SIZE = 1800;

export function splitChunks(value: string, size: number = CHUNK_SIZE): string[] {
  if (value.length === 0) return [''];
  const out: string[] = [];
  for (let i = 0; i < value.length; i += size) out.push(value.slice(i, i + size));
  return out;
}
