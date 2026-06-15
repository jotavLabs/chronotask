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

No primeiro launch o banco é criado e populado só com a estrutura (categorias padrão + feriados); a rotina vem da **escolha de início** (Sprint 8) — nenhuma rotina pessoal é embutida.

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
│   │   ├── _layout.tsx      # Tab navigator (6 abas) + botão Ajustes no header
│   │   ├── index.tsx        # Hoje — Dia Adaptado
│   │   ├── semana.tsx       # Semana — strip de dias + lista
│   │   ├── treino.tsx       # Treino — Hoje/Semana + log de reps
│   │   ├── estudos.tsx      # Estudos — temas + anotações
│   │   └── mais.tsx         # Hub: Estatísticas / Chat / Gerenciar / Ajustes
│   ├── ajustes/             # Ajustes (Stack): tema + links de config
│   ├── estatisticas/        # Estatísticas (Stack): gráficos + consistência
│   ├── chat/                # Chat de comandos (Stack)
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
│   ├── ConfirmDialog.tsx    # Modal de confirmação
│   ├── ExerciseLogCard.tsx  # Exercício + registro de séries (reps/hold)
│   └── StudyNoteCard.tsx    # Bloco de estudo + check + anotação
├── db/
│   ├── schema.ts            # Drizzle schema (10 tabelas)
│   ├── client.ts            # openDatabaseSync + drizzle()
│   ├── migrations/index.ts  # Migration bundle (m0000 + m0001 Sprint 4)
│   ├── seed.ts              # Seed: categorias, blocos, feriados 2026, rotinas mensais
│   └── seedTraining.ts      # Seed: 4 treinos + exercícios (guard próprio)
├── lib/                     # Funções puras (sem deps de UI ou SQLite)
│   ├── dayResolver.ts       # resolveDayLabel, toIsoDate, getWeekDates
│   ├── holidays.ts          # isHolidayPure, getHolidayNamePure
│   ├── validation.ts        # tempo (parse/duração/midnight wrap) + validações de form
│   ├── recurrence.ts        # getMonthlyStatus, isDoneThisMonth, getRoutinesForDate
│   ├── adaptationEngine.ts  # Motor: cascata, conflitos, reflow, buildAdaptedDay
│   ├── theme.ts             # Tokens (light/dark) + categoryColorFor + ThemeMode
│   ├── trainingResolver.ts  # treino do dia (puro, testável)
│   ├── topics.ts            # topicFor — normaliza estudos por tema
│   ├── stats.ts             # agregações (tempo/tema, consistência, volume)
│   ├── commands.ts          # parseCommand — parser do chat (deps injetados)
│   ├── notifications.ts     # buildNotificationPlan (plano do dia, puro)
│   ├── backup.ts            # buildBackup/parseBackup (serialização, puro)
│   └── __tests__/           # 107 testes unitários
├── repositories/            # Único lugar com SQL
│   ├── blocksRepo.ts        # CRUD + reorder/move + getBlocksForDayByCategory
│   ├── monthlyRoutinesRepo.ts # CRUD + scheduleMonthly + markMonthlyDone
│   ├── eventsRepo.ts        # CRUD + getUpcomingEvents + getEventsByDate
│   ├── completionsRepo.ts   # done + notas de sessão (get/setBlockNote)
│   ├── categoriesRepo.ts    # CRUD de categorias + isCuttable + holidays helpers
│   ├── adaptedDayRepo.ts    # loadAdaptedDay (monta deps e chama o motor)
│   ├── trainingRepo.ts      # treinos/exercícios + log de séries + última sessão
│   ├── settingsRepo.ts      # get/set settings + theme mode
│   ├── statsRepo.ts         # completed/scheduled/reps para as agregações
│   ├── commandDeps.ts       # monta os dados do chat via repos/motor
│   └── backupRepo.ts        # getAllData (export) + restoreData (import transacional)
├── services/                # efeitos colaterais (async, não-puro)
│   ├── notificationService.ts # configura/permite/reagenda via expo-notifications
│   └── backupService.ts     # export (file-system+sharing) / import (document-picker)
├── hooks/
│   └── useTheme.ts          # scheme efetivo + tokens
└── store/
    ├── routineStore.ts      # Zustand: days cache + dates done cache + toggleBlock
    └── themeStore.ts        # modo de tema (init no boot + setMode)
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
| Notificações | expo-notifications (locais) |
| Arquivos | expo-file-system + expo-sharing + expo-document-picker |
| Testes | jest-expo |

---

## Schema do banco

```
categories      — nome, cut_order, tie_group, protected, color, skip_on_holiday [S8]
routine_blocks  — day_label, start, end, duration_min, activity, category_id, note, sort_order, topic [S5]
monthly_routines — name, window_start/end_day, duration_min, scheduled_date, last_done
events          — date, start, end, title, category_id, duration_min, priority
holidays        — date, name, type (Nacional/Estadual/Municipal/Facultativo)
completions     — date, ref_type, ref_id, done, value_note, logged_at
settings        — key, value (ex.: theme_mode)                          [S4]
training_days   — label (Upper/Lower A/B), weekday (Seg/Ter/Qui/Sex)     [S4]
exercises       — training_day_id, name, pattern, type, sets, reps, rest, ladder, note, sort_order  [S4]
exercise_logs   — exercise_id, date, set_number, reps, hold_seconds, note, logged_at  [S4]
```

Migrations versionadas via `drizzle-orm/expo-sqlite/migrator` (`useMigrations` hook).
Para adicionar Sprint N: acrescente `{ idx: N, ... }` no journal e `m000N: sql` no objeto.

### Lógica de resolução de dia

```
sábado  → 'Sab'
domingo → 'Dom'
seg–sex → 'Seg'|'Ter'|'Qua'|'Qui'|'Sex'
```

Feriado **não** é mais um label de dia: usa-se a rotina do dia da semana e o motor
aplica a regra `skip_on_holiday` (ver Sprint 8).

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

**Cascata de sacrifício** (determinística): blocos agrupados por `cut_order` crescente (1 corta primeiro), pulando os `protected` **e o Sono** (imóvel). Em cada nível o corte é proporcional (`cut/avail`) e distribuído em **minutos inteiros cuja soma é exatamente a demanda** (largest-remainder) — **sem `round5`**, para não cortar a mais nem criar excedente (que virava buraco). Empates (Treino+Estudo) encolhem proporcionalmente; blocos zerados são removidos; o arredondamento fica só na **exibição** (`formatDuration`). Se a demanda excede todo o tempo cortável → veredito **IMPOSSÍVEL** com o déficit.

**Reflow por barreiras** (determinístico; pequenos ajustes manuais aceitáveis). Invariantes garantidos por construção (ver `checkWindowInvariants`):

- **Janela de atividades** `[winStart, winEnd]` derivada do Sono (padrão 06:00–22:00). Nenhum bloco cruza 06:00 ou 22:00.
- **Sono imóvel**: exatamente 22:00–06:00, nunca cortado nem deslocado.
- **Conservação de tempo**: a janela permanece cheia — encaixar um compromisso de `C` min libera `C` min de outras atividades (via cascata), nunca esticando o dia.

As **âncoras fixas** (Trabalho, compromissos) mantêm o horário e dividem a janela em *segmentos*. As atividades rígidas são recolocadas em ordem nos segmentos; o **tempo livre (Lazer/Leitura) é uma folga elástica** que encolhe, se divide e se reposiciona ao redor das âncoras — em vez de empurrar o dia para frente.

Exemplos (tempo livre 17:30–18:30): compromisso 17:30–18:00 → folga vira 18:00–18:30; compromisso 18:00–18:30 → folga fica 17:30–18:00; compromisso 17:45–18:15 → folga se divide (17:30–17:45 + 18:15–18:30). Em todos, o Sono permanece 22:00 e nada mais se move.

**Árvore de prioridade** quando o compromisso não cai sobre tempo livre: atividade de baixa prioridade cede o lugar e é realocada para um espaço livre; atividade de alta prioridade não encolhe — a cascata corta outras de menor prioridade e a importante é realocada; **Trabalho/Sono** geram **conflito** (o motor não corta protegidos — devolve para a UI avisar).

**Passe de fechamento de gaps** (`closeGaps`, rede de segurança): após o reflow, varre a janela 06:00→22:00 e elimina qualquer buraco residual — preferindo **estender o tempo livre adjacente** (de onde o tempo saiu) e, na falta de vizinho flexível, inserindo um bloco **"Tempo livre"**. Garante que a última atividade termine exatamente às 22:00, encostando no Sono, sem nenhum *sliver* vazio.

**Arredondamento para 5 min** (`snapTo5`, estética): passe final que arredonda toda borda interna da timeline para marcas de 5 minutos (ex.: `jantar 17:57–18:42` → `18:00–18:45`). As **âncoras** (eventos/Trabalho) e os limites `06:00`/`22:00` ficam no horário real — então a janela continua **contígua** e **conservada** (as bordas apenas deslizam, a soma se mantém). Atividades intactas preservam a duração; só o bloco onde o corte caiu absorve o ajuste. A matemática do agendamento permanece exata — o arredondamento é apenas de horário.

**Limitações**: o reflow é guloso (não busca o ótimo); o tempo livre é fundido por categoria (Lazer/Leitura) como buffer; o caso extremo de demanda maior que toda a janela vira IMPOSSÍVEL (o Sono não cede). As rotinas mensais entram como atividades rígidas perto do `suggested_block`. Compromissos com horário quebrado (ex.: 17:23) mantêm a hora real, e os blocos vizinhos encostam nessa borda.

## Sprint 4 — entregue

**Tema claro/escuro + Ajustes.** Tokens centralizados em `lib/theme.ts` (light/dark + `categoryColorFor`); três modos **Claro / Escuro / Seguir o sistema**, persistidos na tabela `settings` e aplicados no boot via `colorScheme` do NativeWind (`store/themeStore`). Tela **Ajustes** (rota `app/ajustes`, acessível pelo ⚙️ no header das abas): seletor de tema, links para Gerenciar rotina e Categorias & prioridades (S3), e espaço para Notificações/Backup (S6). As telas das S1–S3 já usavam classes `dark:`; a auditoria trocou os `useColorScheme` do RN por `useTheme` (reflete a escolha manual).

**Aba Treino.** Schema `training_days`/`exercises`/`exercise_logs` + seed dos 4 treinos (Upper/Lower A/B → Seg/Ter/Qui/Sex). `lib/trainingResolver` (puro, testado) resolve o treino do dia. A aba mostra **Hoje** (treino do dia com séries/reps/descanso/tipo, escada de progressão expansível e **registro de reps/hold por série** com "última vez") ou aviso em dia de descanso; **Semana** lista os 4 treinos; seção de **princípios** do roteiro. Logs em `exercise_logs` via `trainingRepo`.

**Aba Estudos.** Lê os blocos de categoria **Estudo** da rotina (Hoje e Semana). **Anotação por sessão** reaproveitando `completions.value_note` (data + bloco), mantendo o check de concluído. Sem tabela nova.

**Navegação:** 6 abas (Hoje · Semana · Treino · Estudos · Stats · Chat); Ajustes é rota empilhada acessível pelo ⚙️ no header.

## Sprint 5 — entregue

**Estatísticas.** Campo `routine_blocks.topic` agrupa os estudos por tema (`lib/topics.topicFor`, normalização pura; seed + backfill idempotente). `lib/stats` (puro, testado): `timeByTopic`/`timeByCategory` (sessões concluídas × duração planejada), `consistency` (feito/agendado), `trainingVolume`. Tela com seletor de mês, **gráfico de barras** de horas por tema (`react-native-gifted-charts`), cards por categoria (Treino/Cardio/Mobilidade/Leitura), consistência e volume de treino. Métrica documentada como **tempo planejado** (não o ajustado pela adaptação).

**Chat de comandos.** `lib/commands.parseCommand` — parser local **determinístico** (sem IA), puro e testado, com deps injetados. Comandos: `/hoje`, `/semana`, `/treino`, `/estudos`, `/mensais`, `/proximo`, `/feriados`, `/feriados-<mês>` (PT, com/sem acento), `/tempo <tema>`, `/ajuda`; desconhecido → dica de `/ajuda`. Tela de chat com bolhas e sugestões. Ponto de extensão aberto para encaminhar texto livre a um modelo no futuro.

**Navegação:** 5 abas (Hoje · Semana · Treino · Estudos · **Mais**). A aba **Mais** reúne Estatísticas, Chat, Gerenciar e Ajustes (rotas empilhadas) — evita tab bar lotada. O ⚙️ no header continua como atalho para Ajustes.

## Sprint 6 — entregue

**Lembretes (notificações locais).** `lib/notifications.buildNotificationPlan` (puro, testado) gera o plano do dia a partir do **Dia Adaptado** (feriado/compromissos/cortes já aplicados): lembrete por bloco conforme o **escopo** (Importantes = Treino/Estudo/Cardio + compromissos · Todos · Nenhum) e **antecedência** (0/5/10/15 min), avisos de rotina mensal (agendar/atrasada), e **resumo do dia ao acordar**. Nada dispara durante o sono (22:00–06:00), exceto o resumo. `services/notificationService` configura handler/canal, pede permissão e **reagenda** (cancela tudo + recria) para hoje + 2 dias. Preferências persistidas em `settings`, na tela Ajustes.

**Backup / restauração.** `lib/backup` (puro, testado com round-trip): `buildBackup`/`parseBackup` com `version` + validação. `backupRepo` lê todas as tabelas e restaura em **transação** (tudo ou nada, respeitando FKs). `backupService` exporta JSON via `expo-file-system` + `expo-sharing` e importa via `expo-document-picker` (valida → confirma sobrescrita → restaura → reaplica tema e reagenda). Arquivo inválido/corrompido não quebra o app. "Último backup" exibido em Ajustes.

**Reagendamento (gatilhos):** ao abrir o app (boot, cobre a virada de dia no uso normal), ao alterar qualquer preferência de lembrete, e após importar um backup. **Formato do backup:** `{ version, exportedAt, data: { settings, categories, routine_blocks, monthly_routines, events, holidays, completions, training_days, exercises, exercise_logs } }`.

## Sprint 7 — opcional (em andamento)

### Parte A — Sync em nuvem (Supabase)

**Premissa central:** o app continua **local-first**. A nuvem é um **espelho**, não a fonte da verdade. Tudo funciona offline; a sincronização apenas concilia cópias.

**Modelo de dados.** Toda tabela de domínio ganhou `updated_at TEXT` (ISO-8601, mantido por **gatilhos** do SQLite) e `deleted INTEGER` (soft delete). Os repositórios filtram `deleted = 0` na leitura e fazem soft-delete na exclusão — o registro apagado sobe como `deleted = 1` e o apagamento propaga entre aparelhos. Tabela local `sync_state(key,value)` guarda o cursor (`last_pulled_at`), o `user_id` e o `last_sync_at`. `settings` (inclui a sessão de auth) **não** sincroniza.

**Conflitos.** Resolução por **last-write-wins** comparando `updated_at` (não é CRDT). A função pura `lib/sync.ts` `mergeChanges(local, remote)` decide o que aplicar localmente e o que enviar; coberta por testes.

**Fluxo.** `syncService.syncNow()` percorre as tabelas: puxa do Supabase o que mudou desde o cursor, mescla (LWW), aplica os vencedores localmente e envia os locais. O cursor **só avança em caso de sucesso** — uma rodada offline/falha simplesmente deixa as mudanças pendentes para a próxima (fila offline implícita, sem tabela de fila).

**Identidade de registros.** O espelho usa o `id` inteiro local como chave. Funciona para o cenário previsto (um usuário, em geral um aparelho ativo por vez, com as edições propagando via sync). Criação simultânea de **novos** registros em dois aparelhos offline pode colidir `id` — limitação conhecida e aceita nesta versão (mirror, não CRDT).

**Setup (você faz uma vez):**
1. Crie um projeto no [Supabase](https://supabase.com) (free-tier basta: 500 MB de Postgres / 50 mil MAU).
2. SQL Editor → cole e rode `supabase/schema.sql` (cria as tabelas espelho + RLS por `user_id`).
3. Authentication → crie seu usuário (e-mail/senha). **O app não cria contas nem guarda credenciais no código.**
4. Copie `.env.example` para `.env` e preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Settings → API). O `.env` fica **fora do Git**.
5. No app: Ajustes → **Conta e sincronização** → entre com seu e-mail/senha → **Sincronizar agora**.

A anon key é pública por design; a segurança vem do **RLS** (cada usuário só lê/grava as próprias linhas). Sem `.env`, a tela mostra "Sincronização não configurada" e o app segue 100% local.

**Próximo:** módulo financeiro.

## Sprint 8 — templates/padrões editáveis + drag-and-drop

Desacopla a rotina pessoal do app: nada de rotina embutida; o início vem de uma escolha + templates editáveis. E reordenação dos blocos por arrastar, com recálculo de horários.

### Templates e padrões (Parte A)
- **Sem rotina pessoal no seed.** `db/seed` insere só **categorias padrão** + **feriados BR**. Nenhum bloco/treino embutido.
- **Categorias padrão enxutas e editáveis** (`Trabalho`, `Sono`, `Alimentação`, `Higiene/Pessoal`, `Estudo/Exercício`, `Tempo Livre`) com `cut_order`, `protected`, `tie_group`, `color` e a flag **`skip_on_holiday`** — tudo no CRUD de categorias.
- **Feriado é uma regra, não um dia.** O motor parte da rotina do dia da semana e remove os blocos das categorias com `skip_on_holiday = 1` (padrão: Trabalho); o tempo livre absorve o espaço. A lista de feriados continua editável. (`buildAdaptedDay({ isHoliday })`).
- **Templates como DADOS** em `lib/templates.ts` (não código acoplado): `Vazio` (sem blocos) e `Genérica` (dia útil simples + fins de semana livres). **Como adicionar um template:** acrescente uma entrada em `TEMPLATES` com seus `blocks` (`{ dayLabel, start, end, durationMin, activity, catName, sortOrder }`); ele aparece automaticamente na escolha de início e em Ajustes. `templatesRepo.applyTemplate(id, { replace })` resolve categorias e insere em transação.
- **Escolha de início:** no 1º acesso, tela "Como quer começar?" (Vazio / Rotina genérica), gravada na flag `start_choice_done`. Em Ajustes → **Trocar/redefinir ponto de partida** dá para reaplicar um template (substitui a rotina, com confirmação).

### Drag-and-drop + recálculo (Parte B)
- Em **Gerenciar → Blocos**, arraste pela alça `⠿` para reordenar. Ao soltar, os horários são **recalculados**.
- `lib/repack.ts` (puro, testado): re-empilha as durações na nova ordem dentro da janela do dia (barreiras `winStart`/`winEnd` derivadas do **Sono**, ex.: 07:00–22:30). Blocos rígidos mantêm a duração; **tempo livre** (Tempo Livre/Lazer/Leitura) é elástico e absorve a folga — **sem gaps**; **Sono** fica fixo no fim. Mesmo modelo de barreiras/folga do reflow da adaptação.
- `blocksRepo.applyReorder(dayLabel, orderedIds)` persiste a nova ordem (`sort_order`) e os horários em transação.
- **Biblioteca:** drag feito com `PanResponder` (core RN) — `react-native-gesture-handler`/`reanimated 4` estão no projeto, mas ainda não há lib de DnD estável para reanimated 4, então optei por um drag próprio (sem dependência nova).

**Próximo:** módulo financeiro.

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
| 8 | Templates/padrões editáveis + drag-and-drop dos blocos |
| 9 | Módulo financeiro |
