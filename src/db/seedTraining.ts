import { db } from './client';
import { exercises, trainingDays } from './schema';

type ExSeed = {
  name: string;
  pattern: string;
  type: string;
  sets: string;
  reps: string;
  rest: string;
  ladder: string;
};

// Reused progression ladders
const L_PUXAR_VERT = 'negativa → barra → barra c/ peso/archer → progressões one-arm → one-arm pull-up';
const L_EMPURRAR_HORIZ =
  'incline → push-up → diamante/archer → pseudo planche → tuck planche push-up → one-arm → planche push-up';
const L_AGACHAR = 'agachamento → afundo → búlgaro → pistol assistido → pistol → shrimp → pistol c/ peso';
const L_POSTERIOR = 'ponte → elevação quadril unilateral → nordic negativa → nordic → unilateral';

const UPPER_A: ExSeed[] = [
  { name: 'Empurrar vertical (ex.: HSPU na parede)', pattern: 'empurrar vertical', type: 'força', sets: '5', reps: '3–5', rest: '3–5 min', ladder: 'pike push-up → pike elevado → HSPU parede → HSPU livre → HSPU deficit → 90° push-up' },
  { name: 'Puxar vertical (ex.: barra com peso)', pattern: 'puxar vertical', type: 'força', sets: '5', reps: '3–5', rest: '3–5 min', ladder: L_PUXAR_VERT },
  { name: 'Empurrar horizontal (ex.: PPP)', pattern: 'empurrar horizontal', type: 'força', sets: '4', reps: '4–6', rest: '3 min', ladder: L_EMPURRAR_HORIZ },
  { name: 'Puxar horizontal (ex.: tuck FL row)', pattern: 'puxar horizontal', type: 'força', sets: '4', reps: '5–6', rest: '3 min', ladder: 'remada inclinada → australiana → tuck FL row → adv. tuck FL row → front lever' },
  { name: 'Core pesado (ex.: hanging leg raise/ab wheel)', pattern: 'core', type: 'core', sets: '4', reps: '4–6', rest: '2 min', ladder: 'hollow → L-sit → tuck front lever → front lever / ab wheel / hanging leg raise' },
];

const LOWER_A: ExSeed[] = [
  { name: 'Agachar unilateral (ex.: pistol assistido)', pattern: 'agachar', type: 'força', sets: '5', reps: '3–5 (cada)', rest: '3 min', ladder: L_AGACHAR },
  { name: 'Cadeia posterior (ex.: nordic negativa)', pattern: 'posterior', type: 'força', sets: '4', reps: '3–5', rest: '3 min', ladder: L_POSTERIOR },
  { name: 'Búlgaro (com peso/lento)', pattern: 'agachar', type: 'acessório', sets: '3', reps: '5–6 (cada)', rest: '2–3 min', ladder: 'búlgaro peso corporal → lento → com peso' },
  { name: 'Panturrilha unilateral', pattern: 'posterior', type: 'acessório', sets: '4', reps: '6–8', rest: '2 min', ladder: 'calf raise 2 pernas → 1 perna → 1 perna c/ peso/ADM completa' },
  { name: 'Core iso (ex.: hollow body / L-sit)', pattern: 'core', type: 'isometria', sets: '4', reps: 'hold 5–10 s', rest: '2 min', ladder: 'hollow → L-sit progressões → tuck front lever' },
];

const UPPER_B: ExSeed[] = [
  { name: 'Puxar vertical (ex.: archer pull-up)', pattern: 'puxar vertical', type: 'força', sets: '5', reps: '3–5', rest: '3–5 min', ladder: L_PUXAR_VERT },
  { name: 'Empurrar vertical/skill (planche lean/tuck)', pattern: 'empurrar vertical', type: 'isometria', sets: '6', reps: 'hold 3–8 s', rest: '2–4 min', ladder: 'planche lean → tuck planche → adv tuck → straddle → full planche' },
  { name: 'Front lever progressão (iso)', pattern: 'puxar horizontal', type: 'isometria', sets: '6', reps: 'hold 5–10 s', rest: '2–4 min', ladder: 'tuck FL → adv. tuck → straddle → full front lever' },
  { name: 'Empurrar horizontal (archer/one-arm prog.)', pattern: 'empurrar horizontal', type: 'força', sets: '4', reps: '4–6', rest: '3 min', ladder: L_EMPURRAR_HORIZ },
  { name: 'Core (dragon flag negativa)', pattern: 'core', type: 'core', sets: '4', reps: '3–5', rest: '2 min', ladder: 'tuck dragon flag → negativa → completa' },
];

const LOWER_B: ExSeed[] = [
  { name: 'Agachar unilateral pesado (pistol completo/c/ peso)', pattern: 'agachar', type: 'força', sets: '5', reps: '3–5 (cada)', rest: '3 min', ladder: L_AGACHAR },
  { name: 'Cadeia posterior (nordic completo / hip thrust 1 perna)', pattern: 'posterior', type: 'força', sets: '4', reps: '4–6', rest: '3 min', ladder: L_POSTERIOR },
  { name: 'Salto/explosivo (agachamento com salto)', pattern: 'agachar', type: 'potência', sets: '4', reps: '3–5', rest: '3 min', ladder: 'agachamento salto → profundo → unilateral' },
  { name: 'Core (ab wheel de pé progressão)', pattern: 'core', type: 'core', sets: '4', reps: '3–6', rest: '2 min', ladder: 'ab wheel ajoelhado → negativa em pé → em pé' },
];

const TRAINING: { label: string; weekday: string; exercises: ExSeed[] }[] = [
  { label: 'Upper A', weekday: 'Seg', exercises: UPPER_A },
  { label: 'Lower A', weekday: 'Ter', exercises: LOWER_A },
  { label: 'Upper B', weekday: 'Qui', exercises: UPPER_B },
  { label: 'Lower B', weekday: 'Sex', exercises: LOWER_B },
];

/** Seeds the 4 training days + their exercises once (guarded by training_days). */
export function seedTraining(): void {
  const existing = db.select({ id: trainingDays.id }).from(trainingDays).limit(1).all();
  if (existing.length > 0) return;

  for (const day of TRAINING) {
    const row = db
      .insert(trainingDays)
      .values({ label: day.label, weekday: day.weekday })
      .returning({ id: trainingDays.id })
      .get();
    const dayId = row!.id;
    const exRows = day.exercises.map((e, i) => ({
      trainingDayId: dayId,
      name: e.name,
      pattern: e.pattern,
      type: e.type,
      sets: e.sets,
      reps: e.reps,
      rest: e.rest,
      ladder: e.ladder,
      note: null,
      sortOrder: i + 1,
    }));
    db.insert(exercises).values(exRows).run();
  }
}
