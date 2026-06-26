<div align="center">

# ⏳ ChronoTask

**Organize sua rotina do jeito que ela realmente é: flexível.**

App de **rotina e agenda local-first** para Android — 100% offline, sem conta e sem nuvem.

[![CI](https://github.com/jotavLabs/chronotask/actions/workflows/ci.yml/badge.svg)](https://github.com/jotavLabs/chronotask/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-blue)
![Tests](https://img.shields.io/badge/tests-134%20passing-success)
![Expo](https://img.shields.io/badge/Expo-SDK%2056-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)

<!-- DEMO: grave a tela (15-30s), gere um GIF, arraste-o no editor web do GitHub, troque a URL
     abaixo e descomente as duas linhas internas. Um GIF no topo é o que mais "vende".
<img src="docs/demo.gif" alt="Demonstração do ChronoTask" width="280" />
-->

[**⬇️ Baixar APK**](https://github.com/jotavLabs/chronotask/releases) ·
[Funcionalidades](#-funcionalidades) ·
[Arquitetura](#️-arquitetura--decisões) ·
[Como rodar](#️-como-rodar)

</div>

---

## 💡 Sobre

O **ChronoTask** nasceu de uma necessidade pessoal: organizar uma rotina sem a rigidez dos apps de tarefas e sem a burocracia de agendas corporativas. Virou um app que uso no dia a dia e compartilho com **amigos próximos** — a ideia é planejar o dia de forma **flexível e acessível**, sem precisar de conta, internet ou assinatura.

Ele tem **dois modos**, porque rotina e agenda são coisas diferentes:

- **🗓️ Agenda** (padrão) — cada bloco e compromisso fica no horário que você definiu. Direto, como uma agenda de papel.
- **🔁 Rotina** — o dia é um template adaptável: quando entra um compromisso, um **motor de adaptação** reorganiza os blocos ao redor dele (encurtando o tempo livre, nunca o sono), e você pode reordenar arrastando.

Como projeto, ele também é meu **portfólio**: local-first de verdade, motor de adaptação determinístico e testado, migrações de banco escritas à mão e 134 testes — com as decisões registradas no histórico de commits.

> **Por que Android e por que APK?** É um app pessoal e de amigos, então não passei pelo custo/burocracia da Play Store — a distribuição é por **APK direto**. Web não é suportado (o `expo-sqlite` exige headers `SharedArrayBuffer`/COEP-COOP que o navegador padrão não fornece).

## ⬇️ Baixar

Como não está na Play Store, o app é distribuído como **APK**:

➡️ **[Baixar a última versão](https://github.com/jotavLabs/chronotask/releases)**

No Android, ative **"instalar apps de fontes desconhecidas"** para o navegador ou gerenciador de arquivos antes de abrir o `.apk`. É um app local — seus dados ficam só no aparelho.

## ✨ Funcionalidades

- 📆 **Dia, Semana e Mês** — visão de hoje, calendário mensal e a semana (que abre ao tocar um dia no mês).
- 🔔 **Compromissos recorrentes** (semanal / mensal / anual) com **lembrete por evento** (antecedência configurável).
- 🔀 **Modo Agenda ou Rotina** — escolha entre posicionamento livre ou rotina adaptável.
- 🧠 **Motor de adaptação** (modo rotina) — encaixa compromissos cortando o tempo livre por prioridade, com **reordenar arrastando**.
- ✅ **Conclusão em 3 estados** — feito, **não feito** ou não marcado, para acompanhar adesão à rotina.
- ⭐ **Blocos importantes** com lembrete dedicado.
- ⏰ **Lembretes com alarme exato** — disparam no horário mesmo com a tela apagada.
- 💾 **Backup** local (exportar/importar JSON) e **automático** numa pasta à sua escolha (ex.: pasta sincronizada com o Drive).
- 🇧🇷 **Feriados brasileiros** + regra "sai em feriado" por categoria.
- 📊 **Estatísticas** — horas por tema, consistência.
- 💪📚 Módulos opcionais de **Treino** (séries/reps/descanso) e **Estudos**.
- 🌗 **Tema** claro / escuro / sistema.
- 📴 **100% offline**, sem conta e sem rastreamento.

<!-- SCREENSHOTS: substitua pelos seus prints (3-4 telas: Hoje, Mês, criar compromisso, Ajustes).
<div align="center">
  <img src="docs/hoje.png" width="200" /> <img src="docs/mes.png" width="200" /> <img src="docs/compromisso.png" width="200" />
</div>
-->

## 🧱 Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Expo SDK 56 · React Native 0.85 |
| Linguagem | TypeScript (strict) |
| Navegação | Expo Router (file-based) |
| Banco | expo-sqlite + Drizzle ORM (driver síncrono) |
| Estilo | NativeWind 4 (Tailwind CSS) |
| Estado | Zustand 5 |
| Datas | date-fns |
| Notificações | expo-notifications (locais, alarme exato) |
| Arquivos | expo-file-system + expo-sharing + expo-document-picker |
| Testes | Jest (jest-expo) |

## 🏗️ Arquitetura & decisões

As escolhas que tornam este projeto interessante de ler:

- **Local-first de verdade.** Todo o estado vive no SQLite do aparelho via Drizzle. Não há backend, login nem nuvem — o app abre e funciona offline. (Houve uma camada de sync com Supabase; foi removida ao decidir manter o app local.)

- **Camadas puras, separadas por responsabilidade.** `lib/` é lógica **pura** (sem UI nem SQL — totalmente testável), `repositories/` é o **único** lugar com SQL, `services/` isola efeitos async (notificações, arquivos) e `store/` é estado de UI (Zustand). O motor de adaptação é uma função pura; as telas só consomem o resultado.

- **Motor de adaptação determinístico.** No modo rotina, encaixar um compromisso de _C_ minutos libera exatamente _C_ minutos de outras atividades: uma **cascata de sacrifício** corta as categorias de menor prioridade em **minutos inteiros cuja soma é exata** (largest-remainder, sem criar buracos), pulando blocos protegidos e o sono; em seguida um **reflow por barreiras** reposiciona tudo dentro da janela do dia, com o tempo livre funcionando como folga elástica e o sono imóvel. Coberto por testes de cenário.

- **Migrações escritas à mão.** Um bundle versionado (`m0000` → `m0009`) aplicado no boot via `useMigrations`. Cada mudança de schema é uma migração incremental — bancos já instalados evoluem sem perder dados.

- **Recorrência sob demanda.** Eventos recorrentes são expandidos na própria consulta (`getEventsByDate`), então as telas de Dia/Semana/Mês **e** as notificações herdam a recorrência de graça, sem materializar ocorrências no banco.

- **134 testes** (Jest) nas funções puras — motor de adaptação, recorrência, validação, repack de horários, backup e mais.

```
src/
├── app/            # telas (Expo Router): (tabs), gerenciar, ajustes, semana, mês…
├── components/     # UI reutilizável
├── db/             # schema Drizzle, client, migrations (à mão), seed
├── lib/            # lógica PURA e testável (motor, recorrência, validação…)
├── repositories/   # ÚNICO lugar com SQL
├── services/       # efeitos async (notificações, backup)
└── store/          # estado de UI (Zustand)
```

## ▶️ Como rodar

```bash
npm install
npx expo start --dev-client
```

O SDK 56 ainda não está no Expo Go público, então é preciso um **development build** (EAS):

```bash
eas build --profile development --platform android
```

Gerar o **APK distribuível** (instalável direto, não pacote de loja):

```bash
eas build -p android --profile preview
```

**Pré-requisitos:** Node 20+ · conta Expo gratuita (para o EAS Build) · um device/emulador Android. Web não é suportado.

## 🧪 Testes

```bash
npm test
```

## 🤝 Desenvolvimento

Projeto pessoal desenvolvido por **João Victor**, em **colaboração com o [Claude Code](https://claude.com/claude-code)** (assistente de IA da Anthropic) usado como par de programação — da arquitetura aos testes.

## 📄 Licença

[MIT](LICENSE) © João Victor
