import { db } from './client';
import { categories, holidays } from './schema';

// Structural seed only: default categories + BR holidays. The routine itself
// (blocks/monthly) is NOT seeded here — it comes from the onboarding start choice
// (see lib/templates.ts). No personal routine ships with the app.

// ─── categories data ─────────────────────────────────────────────────────────

const CAT_DATA = [
  { name: 'Trabalho', cutOrder: null, tieGroup: null, protected: 1, color: '#3B82F6' },
  { name: 'Sono', cutOrder: 5, tieGroup: null, protected: 0, color: '#8B5CF6' },
  { name: 'Rotina', cutOrder: 4, tieGroup: null, protected: 0, color: '#6B7280' },
  { name: 'Alimentação', cutOrder: 3, tieGroup: null, protected: 0, color: '#F59E0B' },
  { name: 'Treino', cutOrder: 2, tieGroup: 'treino_estudo', protected: 0, color: '#EF4444' },
  { name: 'Estudo', cutOrder: 2, tieGroup: 'treino_estudo', protected: 0, color: '#10B981' },
  { name: 'Cardio', cutOrder: 2, tieGroup: 'treino_estudo', protected: 0, color: '#F97316' },
  { name: 'Mobilidade', cutOrder: 2, tieGroup: 'treino_estudo', protected: 0, color: '#EC4899' },
  { name: 'Lazer', cutOrder: 1, tieGroup: null, protected: 0, color: '#06B6D4' },
  { name: 'Leitura', cutOrder: 1, tieGroup: null, protected: 0, color: '#84CC16' },
];

// ─── holidays data (BR 2026, editable) ─────────────────────────────────────────

const HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'Confraternização Universal', type: 'Nacional' },
  { date: '2026-01-25', name: 'Aniversário de São Paulo', type: 'Municipal' },
  { date: '2026-02-16', name: 'Carnaval (segunda-feira)', type: 'Facultativo' },
  { date: '2026-02-17', name: 'Carnaval (terça-feira)', type: 'Facultativo' },
  { date: '2026-02-18', name: 'Quarta-feira de Cinzas', type: 'Facultativo' },
  { date: '2026-04-03', name: 'Paixão de Cristo', type: 'Nacional' },
  { date: '2026-04-21', name: 'Tiradentes', type: 'Nacional' },
  { date: '2026-05-01', name: 'Dia do Trabalho', type: 'Nacional' },
  { date: '2026-06-04', name: 'Corpus Christi', type: 'Facultativo' },
  { date: '2026-07-09', name: 'Revolução Constitucionalista', type: 'Estadual' },
  { date: '2026-09-07', name: 'Independência do Brasil', type: 'Nacional' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida', type: 'Nacional' },
  { date: '2026-11-02', name: 'Finados', type: 'Nacional' },
  { date: '2026-11-15', name: 'Proclamação da República', type: 'Nacional' },
  { date: '2026-11-20', name: 'Consciência Negra', type: 'Nacional' },
  { date: '2026-12-25', name: 'Natal', type: 'Nacional' },
  { date: '2027-01-01', name: 'Confraternização Universal', type: 'Nacional' },
];

// ─── main seed function ───────────────────────────────────────────────────────

export function runSeed(): void {
  // Guard: don't seed if categories already exist
  const existing = db.select({ id: categories.id }).from(categories).limit(1).all();
  if (existing.length > 0) return;

  db.insert(categories).values(CAT_DATA).run();

  for (let i = 0; i < HOLIDAYS_2026.length; i += 50) {
    db.insert(holidays).values(HOLIDAYS_2026.slice(i, i + 50)).run();
  }
}
