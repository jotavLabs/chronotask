# Segurança da sincronização (Supabase)

Modelo: o app é **local-first**; a nuvem é um **espelho** opcional. A sync está
**dormente** até existir um `.env` com as chaves (ver `.env.example`). Este documento
registra o que protege os dados/credenciais e o que falta fazer antes de ligar a sync.

## Princípios

- **A anon key é pública por design.** Ela vai embutida no APK; sozinha, sem login,
  não dá acesso a nada. A segurança real vem do **RLS** (Row Level Security).
- **A app nunca guarda senha.** Com e-mail/senha, a senha vai por HTTPS direto ao
  Supabase Auth, que guarda só um hash (bcrypt). A app só retém o **token de sessão**.
  Com Google/Apple ou magic link, não há senha alguma.
- **Isolamento por usuário no banco.** Mesmo todos compartilhando um Postgres, cada
  linha pertence a um `user_id` e o Postgres barra acesso cruzado em toda query.

## Já implementado

**App (este repositório):**
- Token de sessão no **keystore com respaldo de hardware** (Android Keystore / iOS
  Keychain) via `expo-secure-store`, fatiado para driblar o limite de ~2KB por valor —
  ver `src/lib/secureStorage.ts`. (Antes ficava em texto plano no SQLite local.)
- `keychainAccessible: AFTER_FIRST_UNLOCK` — token inacessível/cifrado antes do
  primeiro desbloqueio pós-boot e fora de backups utilizáveis.
- Cliente Supabase só é criado se `EXPO_PUBLIC_SUPABASE_URL` + `..._ANON_KEY` existirem
  (`src/lib/supabase.ts`); telas degradam graciosamente quando ausente.
- `.env` no `.gitignore`; `.env.example` avisa para nunca usar a service_role key.

**Servidor (`supabase/schema.sql`):**
- **RLS habilitado nas 10 tabelas** sincronizadas, política `owner_all`:
  `for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())`.
  Só usuário logado, só as próprias linhas. Role `anon` (sem login): acesso nenhum.

## Checklist do operador (antes de ligar a sync)

Você é o dono do projeto Supabase, logo o controlador dos dados. Antes de configurar:

- [ ] Rodar `supabase/schema.sql` no SQL Editor (cria tabelas + RLS + índices).
- [ ] Confirmar **RLS ligado** em todas as tabelas (Database → Tables → RLS = on).
- [ ] **Nunca** colocar a `service_role`/secret key no app nem no `.env` (só no servidor,
      se algum dia houver função de borda).
- [ ] Auth → ativar **confirmação de e-mail** (ou provedor OAuth Google/Apple).
- [ ] Auth → ativar **leaked password protection** e manter os rate limits padrão.
- [ ] Testar isolamento: logar com **2 contas** e confirmar que uma não vê dados da outra.
- [ ] Definir retenção/backup do projeto no painel.

## Adiado (quando a sync for integrada)

- **Escolher o método de login**: Google/Apple (OAuth, sem senha) ou magic link —
  ambos eliminam o manuseio de senha. E-mail+senha funciona, mas é o menos seguro dos três.
- **Botão "sair e apagar meus dados da nuvem"** na tela de conta (direito de exclusão).
- **Reexecutar o teste de 2 contas** após qualquer mudança de policy.

## LGPD

Os dados sincronizados são de rotina/treino/estudo + o e-mail de login — pouco PII e
nenhum dado financeiro. Ainda assim, como operador você responde por eles: guarde o
mínimo, ofereça exclusão a pedido e não exponha a service_role key.

## Privacidade máxima (opcional, não planejado)

Criptografia **ponta-a-ponta**: cifrar no aparelho com chave derivada de uma senha do
usuário antes de subir, de modo que nem você nem o Supabase consigam ler. Custo: perda
da senha = dados irrecuperáveis, e bem mais complexidade. Exagero para dados de rotina,
mas é o caminho se algum dia o conteúdo for sensível.
