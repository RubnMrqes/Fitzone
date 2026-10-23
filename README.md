# FitZone — React + Supabase

Sistema de academia com login por e-mail e painéis de administrador, aluno e treinador. O visual PulseFit original foi mantido.

## Banco já configurado

O projeto Supabase fitzone já recebeu as tabelas e permissões nesta sessão. Não execute novamente a instalação nele. As instruções de SQL abaixo servem para uma instalação futura em outro banco vazio.

## Onde colocar o SQL

O arquivo SQL no GitHub é a cópia do código do banco. Salvar o arquivo no projeto não executa o SQL.

Para instalar em um novo projeto Supabase sem as tabelas:

1. Abra o painel Supabase e selecione **fitzone**.
2. Entre em **SQL Editor → New query**.
3. Abra `supabase/schema.sql` neste repositório e copie o conteúdo inteiro.
4. Cole na consulta e clique em **Run**.
5. Execute apenas uma vez na instalação inicial. O arquivo já reúne tabelas, gatilhos, políticas e correções, dentro de uma transação. A tabela `usuarios` preexistente é preservada.

Não cole SQL no terminal do VS Code, no JavaScript nem no Table Editor.

| Arquivo | Para que serve | Quando executar |
| --- | --- | --- |
| `supabase/schema.sql` | Instalação completa atualizada | Uma vez em OUTRO banco sem as tabelas da academia; o fitzone atual já foi instalado |

O antigo bloco `INSTALACAO_FITZONE.sql` do guia foi consolidado em `schema.sql`. Não execute os dois, pois criam as mesmas tabelas. Criar ou mover arquivos no GitHub não sincroniza automaticamente o banco.

Se aparecer `app_role already exists` ou `relation profiles already exists`, não apague tabelas. A instalação inicial já foi executada ou o banco tem uma estrutura parcial; confira o que existe antes de tentar novamente.

## Conexão do aplicativo

Na raiz, copie `.env.example` para `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://enzqaaxhipqnpshzskco.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA_PUBLISHABLE
VITE_DEMO_MODE=false
```

Copie a chave pública do projeto em Settings / API Keys. `.env.local` está no .gitignore e não deve ser enviado ao GitHub. Não coloque senha do banco, service_role, sb_secret ou connection string PostgreSQL no React. A publishable key é pública; permissões de tabela e RLS protegem os dados.

A chave antiga `VITE_SUPABASE_ANON_KEY` continua aceita por compatibilidade. Demonstração exige `VITE_DEMO_MODE=true`, chaves vazias e `npm run dev`; nunca é habilitada em produção por falta de configuração.

## Primeiro administrador

1. Depois de executar o SQL, vá a **Authentication → Users → Add user / Create user**.
2. Crie a conta com seu e-mail e uma senha individual; confirme o e-mail conforme sua configuração.
3. O gatilho cria um perfil `aluno`. Para promover sua conta, abra outra consulta no **SQL Editor**, substitua o e-mail abaixo e clique **Run**:

```sql
update public.profiles
set role = 'admin', full_name = 'Administrador FitZone'
where id = (select id from auth.users where email = 'SEU_EMAIL_AQUI')
returning id, full_name, role;
```

O comando deve retornar seu perfil como `admin`. Se retornar zero linhas, confira o e-mail e se a conta Auth foi criada. Entre no site pela aba Administrador usando o e-mail e a senha da conta Auth. A senha do banco não é a senha de login dos alunos.

Para treinador, use outra conta criada no Auth e altere seu perfil para `treinador` pelo SQL Editor. Nunca permita que o navegador escolha ou altere o próprio papel.

## Vincular um aluno

Cadastro no painel administrativo não cria conta Auth. Crie a conta em Authentication > Users e vincule o UUID ao campo `members.profile_id` do cadastro do aluno no Table Editor. `members.id` é o identificador do cadastro; `members.profile_id` é o identificador de Auth.

Para aluno que ainda não tem cadastro em members, pode usar no SQL Editor:

```sql
insert into public.members (profile_id, full_name, plan, status)
select id, 'Nome do aluno', 'Essencial', 'active'
from auth.users where email = 'EMAIL_DO_ALUNO'
on conflict (profile_id) do update set full_name = excluded.full_name
returning id, profile_id, full_name;
```

Se o cadastro já existir sem vínculo, atualize esse cadastro no Table Editor em vez de inserir outro.

## Executar no computador

Node 20.19+ ou 22.12+ e npm:

```bash
npm ci
npm run lint
npm run dev
```

Reinicie o Vite após editar .env.local. Para produção: `npm run build` gera dist.

Na Vercel ou em outra hospedagem, configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY antes do build e publique novamente. Configure o domínio real em Authentication > URL Configuration para os fluxos por e-mail.

## Correções incluídas

- Autenticação com sessão persistente e erros de configuração/perfil visíveis.
- Demonstração só com opt-in explícito em desenvolvimento.
- Presenças usam o UUID correto do aluno vinculado.
- Horários são normalizados para HH:mm; troca de reserva é atômica e preserva a anterior quando não há vaga.
- Presença e conclusão repetidas são idempotentes.
- Helpers de autorização ficam no schema privado; permissões explícitas e RLS separam admin, treinador e aluno.
- Datas de reservas usam America/Recife no aplicativo e no banco. Se necessário, altere src/lib/data.js e gym_today() juntos.

## Verificação

`npm run lint` e `npm run build`.

No ambiente real, entre com contas de cada papel, recarregue a página, registre presença e treino, faça reserva e saída. Aluno não deve abrir /admin nem consultar registros privados de outro aluno. Confira os registros no Table Editor.

## Limites atuais

Recuperação de senha e convites ainda precisam de interface. Cadastro de aluno no painel não cria automaticamente uma conta Auth e status inativo não suspende automaticamente o login. Automatizar gestão de contas exige backend/Edge Function com autorização administrativa.

A home contém números ilustrativos; total de treinadores no painel admin é fixo; o checklist de exercícios do aluno tem exemplos fixos. As descrições de treinos cadastradas pelo treinador são persistidas no banco. Um catálogo estruturado de exercícios é uma evolução separada.
