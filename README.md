# PulseFit Academia · React + Vite + Supabase + Vercel

Migração do protótipo HTML/CSS/JS da PulseFit para React. Identidade visual original preservada: preto/cinza com verde-limão `#b7ff34`. Layout responsivo com página institucional, login e painéis separados de administrador, aluno e treinador.

## Executar no seu PC

**Requisitos:** Node.js 20.19+ ou 22.12+ e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

No Windows, copie `.env.example` para `.env.local` pelo Explorador ou execute `copy .env.example .env.local`. Abra a URL fornecida pelo Vite (geralmente `http://localhost:5173`).

## Modo demonstração (sem Supabase)

Com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` vazios, a aplicação usa localStorage e contas **somente de demonstração**:

| Papel | E-mail | Senha |
| --- | --- | --- |
| Admin | admin@pulsefit.com | admin123 |
| Aluno | aluno@pulsefit.com | aluno123 |
| Treinador | treinador@pulsefit.com | treino123 |

Essas senhas só existem no modo demonstrativo, que **não oferece segurança nem sincronização entre dispositivos**. O projeto exige configuração do Supabase para uso com dados reais. Não use dados pessoais de verdade no modo demonstrativo. A home apresenta algumas estatísticas e imagens ilustrativas que não são dados reais de ocupação.

## Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, execute `supabase/schema.sql` uma única vez em um projeto vazio (o arquivo cria tipo, tabelas, índices, políticas RLS e gatilhos).
3. Em **Project Settings → API** (ou página de API Keys), copie **Project URL** e a **anon/publishable key**.
4. Preencha `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON_OU_PUBLISHABLE
```

5. Em **Authentication → Users**, crie pelo menos 3 usuários, usando endereços de e-mail válidos e senhas próprias. O gatilho cria `profiles` automaticamente com papel **aluno**.
6. No SQL Editor, altere os papéis dos usuários escolhidos usando **o e-mail, nunca senha no SQL**:

```sql
update public.profiles set role='admin', full_name='Marina Costa'
where id=(select id from auth.users where email='EMAIL_DO_ADMIN');
update public.profiles set role='treinador', full_name='Rafael Souza'
where id=(select id from auth.users where email='EMAIL_DO_TREINADOR');
```

7. Para que o aluno apareça na lista de membros e possa receber treinos, vincule seu usuário criado no Auth:

```sql
insert into public.members (profile_id,full_name,plan,status)
select id,'Lucas Almeida','Performance','active' from auth.users where email='EMAIL_DO_ALUNO';
```

**Importante:** perfis só recebem permissão de administrador/treinador pelo SQL seguro. Nunca coloque `service_role`, senhas ou segredos no código React nem em variáveis `VITE_`. A `anon` key é pública e segura **quando o RLS está corretamente configurado**. Quando Supabase está configurado, não existe login hardcoded; use suas contas do Auth.

## Vercel

1. Publique o projeto em seu repositório GitHub.
2. Na [Vercel](https://vercel.com), importe o repositório. Framework: **Vite**, build command `npm run build`, output `dist`.
3. Em **Settings → Environment Variables**, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores reais; marque Production / Preview / Development conforme necessário.
4. Faça **Redeploy**. O arquivo `vercel.json` direciona rotas React para `index.html`.
5. Configure **Authentication → URL Configuration** no Supabase com o domínio de produção da Vercel (Site URL / Redirect URLs, quando utilizar fluxos de e-mail).

## Organização

```text
src/
  main.jsx                 # Router e entrada React
  auth.jsx                 # Contexto de autenticação e rotas protegidas
  components.jsx           # Shell, cards, avisos
  pages/                   # Home, Login, Admin, Student, Trainer
  lib/supabase.js          # Cliente Supabase
  lib/api.js               # Acesso a dados, Supabase ou demonstração
  lib/data.js              # Dados de exemplo e utilitários
  templates/index.html     # Markup original da página institucional
  style.css                # CSS original preservado
  react-additions.css      # Pequenas adaptações React/responsivo
supabase/schema.sql        # Tabelas, políticas RLS e regras de capacidade
vercel.json                # SPA fallback
.env.example               # Nomes das variáveis, sem segredos
```

## Observações técnicas

- React Router bloqueia visualmente acesso a páginas de perfis diferentes; **segurança real** é implementada com Supabase RLS no banco de dados.
- Agendamento é para **o dia atual**, máximo de uma reserva por aluno/dia, com restrição de capacidade validada no banco por gatilho.
- Administrador pode cadastrar registro de aluno e alterar status; **cadastro com acesso ao sistema** deve ser feito pelo Supabase Auth, nunca criando usuário diretamente do navegador com uma chave de administrador.
- Os painéis leem e escrevem dados reais via Supabase quando conectado; modo demo usa localStorage.
- Integrações reais de Instagram, WhatsApp, endereço e galeria exigem substituir os dados ilustrativos da página pública.
- Os dados da home (lotação, planos, estatísticas) são demonstrativos; não representam telemetria real.
