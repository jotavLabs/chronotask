# Routine App

App mobile de controle de rotina pessoal. Local-first, offline-first.

## Como rodar

```bash
npm install
npx expo start
```

- iOS/Android: escaneie o QR code no Expo Go
- Web: `w` no terminal (ou `npx expo start --web`)
- Simulador iOS: `i` | Emulador Android: `a`

No primeiro launch o banco é criado e populado automaticamente com toda a rotina seed.

### Pré-requisitos

- Node 20+
- Expo Go no celular (para device físico)
- iOS Simulator / Android Emulator (opcional)

### Testes

```bash
npm test
```

---

## Estrutura

```
src/
├── app/
│   ├── _layout.tsx          # Root layout: migration + seed init
│   └── (tabs)/
│       ├── _layout.tsx      # Tab navigator (6 abas)
│       ├── index.tsx        # Hoje — blocos do dia com checkbox
│       ├── semana.tsx       # Semana — strip de dias + lista
│       ├── treino.tsx       # Placeholder Sprint 4
│       ├── estudos.tsx      # Placeholder Sprint 4
│       ├── stats.tsx        # Placeholder Sprint 5
│       └── chat.tsx         # Placeholder Sprint 5
├── components/
│   ├── BlockCard.tsx        # Card de bloco com checkbox e cor de categoria
│   ├── DayList.tsx          # FlatList de blocos para um dia
│   └── CheckBox.tsx         # Checkbox acessível
├── db/
│   ├── schema.ts            # Drizzle schema (6 tabelas)
│   ├── client.ts            # openDatabaseSync + drizzle()
│   ├── migrations/index.ts  # Migration bundle (formato drizzle-orm/expo-sqlite/migrator)
│   └── seed.ts              # Seed completo: categorias, blocos, feriados 2026, rotinas mensais
├── lib/                     # Funções puras (sem deps de UI ou SQLite)
│   ├── dayResolver.ts       # resolveDayLabel, toIsoDate, getWeekDates
│   ├── holidays.ts          # isHolidayPure, getHolidayNamePure
│   ├── recurrence.ts        # getRoutinesForDate (stub)
│   ├── adaptationEngine.ts  # Motor de adaptação (stub Sprint 3)
│   └── __tests__/           # 12 testes unitários
├── repositories/
│   ├── blocksRepo.ts        # getBlocksForDay (com join de categoria)
│   ├── completionsRepo.ts   # getDoneBlockIds, setBlockDone
│   └── categoriesRepo.ts    # buildHolidayDateSet, buildHolidayMap
└── store/
    └── routineStore.ts      # Zustand: days cache + dates done cache + toggleBlock
```

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Expo SDK 56 + React Native 0.85 |
| Navegação | Expo Router 4 (file-based) |
| Banco | expo-sqlite 14 |
| ORM | drizzle-orm 0.45 (sync driver) |
| Estilo | NativeWind 4 (Tailwind CSS 3) |
| Estado | Zustand 5 |
| Datas | date-fns 4 |
| Testes | jest-expo |

---

## Schema do banco

```
categories      — nome, cut_order, tie_group, protected, color
routine_blocks  — day_label, start, end, duration_min, activity, category_id, note, sort_order
monthly_routines — name, window_start/end_day, duration_min, scheduled_date, last_done
events          — date, start, end, title, category_id, duration_min, priority
holidays        — date, name, type (Nacional/Estadual/Municipal/Facultativo)
completions     — date, ref_type, ref_id, done, value_note, logged_at
```

Migrations versionadas via `drizzle-orm/expo-sqlite/migrator` (`useMigrations` hook).
Para adicionar Sprint N: acrescente `{ idx: N, ... }` no journal e `m000N: sql` no objeto.

### Lógica de resolução de dia

```
holiday DB → 'Feriado'
sábado     → 'Sab'
domingo    → 'Dom'
seg–sex    → 'Seg'|'Ter'|'Qua'|'Qui'|'Sex'
```

---

## Sprint 1 — entregue

- Projeto Expo + TS strict + Expo Router + NativeWind + Drizzle/expo-sqlite
- Schema completo do domínio de rotina com migration versionada
- Seed automático no primeiro launch (não duplica em reinícios)
- **Hoje**: resolve o dia correto (feriado, fim de semana), lista blocos com hora/duração/categoria, counter de progresso, checkbox persistente
- **Semana**: strip de 7 dias clicáveis, dot indicadores (feriado/todos concluídos), blocos do dia selecionado
- Marcar/desmarcar concluído persiste via SQLite entre reinícios
- 6 abas: Hoje, Semana + 4 placeholders
- Modo claro/escuro automático pelo sistema
- 12 testes unitários das funções puras

## Sprint 2 — próxima

CRUD de blocos de rotina, rotinas mensais e compromissos pontuais. Formulários inline para criar/editar diretamente no app.

## Mapa de sprints

| Sprint | Foco |
|--------|------|
| 1 | Setup + schema + tela Hoje + tela Semana + check persistente |
| 2 | Edição no app: CRUD de blocos, rotinas mensais, compromissos |
| 3 | Motor de adaptação (sacrifício em cascata + reflow de horários) |
| 4 | Abas Treino e Estudos |
| 5 | Estatísticas + Chat de comandos |
| 6 | Lembretes (notificações locais) + backup/exportação JSON |
| 7 | Sync multi-dispositivo (Supabase) + Google Agenda |
| 8 | Módulo financeiro |
