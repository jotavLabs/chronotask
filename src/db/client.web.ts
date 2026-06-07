// expo-sqlite on web requires SharedArrayBuffer with COEP/COOP headers.
// This is a mobile-first app; web shows an unsupported screen instead.
export const db = null as any;
export type DB = typeof db;
