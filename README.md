# Routine App

App mobile de controle de rotina pessoal. Local-first, offline-first.

## Como rodar

```bash
npm install
npx expo start --dev-client
```

Abra no **development build** (APK gerado via EAS — necessário porque o SDK 56 ainda não está no Expo Go público). Para gerar/atualizar o build:

```bash
eas build --profile development --platform android
```

Web não é suportado (expo-sqlite exige SharedArrayBuffer/headers COEP-COOP); mostra tela informativa.

No primeiro launch o banco é criado e populado automaticamente com toda a rotina seed.

### Pré-requisitos

- Node 20+
- Development build instalado no device (ver `eas.json`, perfil `development`)
- Conta Expo (gratuita) para rodar EAS Build

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
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator (6 abas) + botão Gerenciar no header
│   │   ├── index.tsx        # Hoje — blocos do dia com checkbox
│   │   ├── semana.tsx       # Semana — strip de dias + lista
│   │   ├── treino.tsx       # Placeholder Sprint 4
│   │   ├── estudos.tsx      # Placeholder Sprint 4
│   │   ├── stats.tsx        # Placeholder Sprint 5
│   │   └── chat.tsx         # Placeholder Sprint 5
│   └── gerenciar/           # Edição + config (Stack, fora das abas)
│       ├── _layout.tsx      # Stack do módulo de edição
│       ├── index.tsx        # Hub: Blocos / Mensais / Compromissos / Categorias
│       ├── blocos.tsx       # Lista por dia, reordenar, excluir, FAB
│       ├── bloco-form.tsx   # Criar/editar bloco
│       ├── mensais.tsx      # Lista com status, agendar, marcar feita, FAB
│       ├── mensal-form.tsx  # Criar/editar rotina mensal
│       ├── eventos.tsx      # Próximos compromissos agrupados por data, FAB
│       ├── evento-form.tsx  # Criar/editar compromisso
│       ├── categorias.tsx   # Lista de categorias por ordem de corte
│       └── categoria-form.tsx # Cor, protegida, ordem de corte, grupo de empate
├── components/
│   ├── BlockCard.tsx        # Card de bloco (checkbox, cor, toque = editar)
│   ├── DayList.tsx          # FlatList de blocos para um dia
│   ├── TimelineRow.tsx      # Item do Dia Adaptado (horário, Δ, selos)
│   ├── AdaptedSummary.tsx   # Painel de resumo (modo, cortes, conflitos, veredito)
│   ├── CheckBox.tsx         # Checkbox acessível
│   ├── FormField.tsx        # Label + erro + campo
│   ├── TimeInput.tsx        # Input mascarado HH:MM
│   ├── DateField.tsx        # Campo de data com mini-calendário (JS puro)
│   ├── CategoryPicker.tsx   # Chips de categorias
│   ├── DayPicker.tsx        # Chips Seg…Dom + Feriado
│   ├── PriorityPicker.tsx   # Alta / Média / Baixa
│   └── ConfirmDialog.tsx    # Modal de confirmação
├── db/
│   ├── schema.ts            # Drizzle schema (6 tabelas)
│   ├── client.ts            # openDatabaseSync + drizzle()
│   ├── migrations/index.ts  # Migration bundle (formato drizzle-orm/expo-sqlite/migrator)
│   └── seed.ts              # Seed completo: categorias, blocos, feriados 2026, rotinas mensais
├── lib/                     # Funções puras (sem deps de UI ou SQLite)
│   ├── dayResolver.ts       # resolveDayLabel, toIsoDate, getWeekDates
│   ├── holidays.ts          # isHolidayPure, getHolidayNamePure
│   ├── validation.ts        # tempo (parse/duração/midnight wrap) + validações de form
│   ├── recurrence.ts        # getMonthlyStatus, isDoneThisMonth, getRoutinesForDate
│   ├── adaptationEngine.ts  # Motor: cascata, conflitos, reflow, buildAdaptedDay
│   └── __tests__/           # 60 testes unitários
├── repositories/            # Único lugar com SQL
│   ├── blocksRepo.ts        # CRUD + reorder/move de blocos (+ limpa completions órfãs)
│   ├── monthlyRoutinesRepo.ts # CRUD + scheduleMonthly + markMonthlyDone
│   ├── eventsRepo.ts        # CRUD + getUpcomingEvents + getEventsByDate
│   ├── completionsRepo.ts   # getDoneBlockIds, setBlockDone
│   ├── categoriesRepo.ts    # CRUD de categorias + isCuttable + holidays helpers
│   └── adaptedDayRepo.ts    # loadAdaptedDay (monta deps e chama o motor)
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

## Sprint 2 — entregue

Edição completa dentro do app, acessível pelo botão **⚙️ Gerenciar** no header de Hoje/Semana (hub com 3 áreas). Sem dependências nativas novas: date picker e time input em JS puro; reordenação por setas.

- **Blocos da rotina**: criar, editar, excluir e reordenar blocos de qualquer dia (Seg…Dom e Feriado). Duração derivada automaticamente do início/fim, **com virada de meia-noite** (ex.: Sono 22:00→06:00 = 8h). Excluir um bloco remove suas marcações de conclusão órfãs. Tocar num bloco em Hoje/Semana abre o editor.
- **Rotinas mensais**: criar/editar/excluir com janela flexível (dia início–fim, 1–31), duração e categoria. Agendar para o mês (date picker) e marcar como feita. Badge de status calculado: HOJE / agendada / agendar / ATRASADA / feita este mês.
- **Compromissos**: criar/editar/excluir eventos pontuais (data, hora, título, categoria, prioridade), listados por data.
- Validações puras em `lib/validation.ts`; status mensal puro em `lib/recurrence.ts`. **35 testes** no total.
- Hoje/Semana recarregam ao ganhar foco, refletindo as edições na hora.

## Sprint 3 — entregue

O **motor de adaptação** (`lib/adaptationEngine.ts`, puro e testável) transforma a rotina-base no **Dia Adaptado** de uma data. Telas só consomem o resultado via `repositories/adaptedDayRepo.ts`.

- **Hoje** renderiza o Dia Adaptado (não mais a rotina crua): horários recalculados, duração original riscada + nova com selo "ajustado", itens "cortado hoje" esmaecidos, compromissos/mensais destacados, selo "⚠ conflito". Painel de resumo (modo, demanda, cortes por nível, veredito) e seletor de data.
- **Semana**: dot laranja nos dias com ajustes (evento/mensal agendada) + botão "Ver dia adaptado".
- **Categorias & prioridades**: editar `cut_order`, `protected`, `tie_group` e cor; criar/excluir. Reflete direto no motor; valida que sempre exista um nível cortável.
- **60 testes** cobrindo cascata, conflitos, reflow e os 6 cenários de aceitação.

### Como o motor funciona

Dois modos opostos por data:

- **MODO A — Feriado** (`day_label = 'Feriado'`): estende o template e **encaixa** compromissos/mensais no tempo livre. Nada é cortado.
- **MODO B — Carga extra** (dia normal/fim de semana com compromisso e/ou rotina mensal agendada): a demanda `D = Σ eventos + Σ mensais agendadas` é retirada da rotina.

**Cascata de sacrifício** (determinística): blocos agrupados por `cut_order` crescente (1 corta primeiro), pulando os `protected`. Em cada nível corta-se a mesma fração (`cut/avail`), arredondada a múltiplos de 5 min — então empates (Treino+Estudo) encolhem proporcionalmente. Blocos zerados são removidos. Se a demanda excede todo o tempo cortável → veredito **IMPOSSÍVEL** com o déficit.

**Reflow guloso** (não-ótimo; pequenos ajustes manuais aceitáveis): opera numa linha do tempo linear `[início-do-dia, +1440]` para tratar o Sono que cruza a meia-noite. As **âncoras fixas** dividem o dia em *slots* livres; cada bloco flutuante é alocado ao slot do seu **horário original** (manhã fica de manhã, noite à noite) e preserva esse horário quando há folga — desliza para frente só quando uma âncora ocupa seu lugar, e o excedente transborda para o próximo slot. Isso evita re-empilhar o dia inteiro a partir do amanhecer.

O **tempo livre (categoria Lazer)** é um *buffer divisível*: quando um compromisso cai no meio dele, o bloco é **partido** — parte antes da âncora, parte depois (ex.: Lazer 09:00–18:00 com compromisso 13:00–15:00 vira Lazer 09:00–13:00 + compromisso + Lazer 15:00–19:00). Os demais blocos não se dividem (transbordam inteiros).

**Âncoras fixas:** blocos `protected` (Trabalho), o bloco de **Sono** (fim ancorado — encurtado começa mais tarde) e **todos os compromissos** (têm hora marcada). As rotinas mensais entram como flutuantes, posicionadas perto do `suggested_block` (ou após o último bloco de Lazer).

**Conflito:** compromisso que se sobrepõe a uma âncora protegida (Trabalho/Sono). O motor não corta blocos protegidos — devolve o conflito para a UI avisar.

## Sprint 4 — próxima

Abas **Treino** e **Estudos**: detalhamento e acompanhamento dos blocos dessas categorias (sem mexer no motor, que já consome os dados).

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
