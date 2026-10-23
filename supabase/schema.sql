-- INSTALAÇÃO INICIAL: copie todo este arquivo no SQL Editor do Supabase e clique Run.
-- Este schema.sql já inclui as correções. Não execute a migração separada depois dele.
-- Não execute em banco que já tenha profiles/members/bookings deste aplicativo.
-- A tabela public.usuarios não será alterada.
begin;
-- Execute no SQL Editor do Supabase, como proprietário do projeto.
create extension if not exists pgcrypto;
create type public.app_role as enum ('admin','aluno','treinador');
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade,full_name text not null,role public.app_role not null default 'aluno',created_at timestamptz not null default now());
create table public.members (id uuid primary key default gen_random_uuid(),profile_id uuid unique references public.profiles(id) on delete set null,full_name text not null,plan text not null default 'Essencial' check(plan in ('Essencial','Performance','Black')),status text not null default 'active' check(status in ('active','inactive','pending')),created_at timestamptz not null default now());
create table public.settings (id integer primary key default 1 check(id=1),capacity integer not null check(capacity between 10 and 10000));
insert into public.settings(id,capacity) values (1,80);
create table public.notices (id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 150),body text not null check(length(body) between 1 and 3000),created_at timestamptz not null default now());
create table public.bookings (id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id) on delete cascade,booking_date date not null,slot time not null,created_at timestamptz not null default now(),unique(student_id,booking_date));
create index bookings_slot_idx on public.bookings(booking_date,slot);
create table public.workouts (id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id) on delete cascade,trainer_id uuid not null default auth.uid() references public.profiles(id),goal text not null,description text not null,created_at timestamptz not null default now());
create table public.attendance (id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id) on delete cascade,attendance_date date not null,created_at timestamptz not null default now(),unique(student_id,attendance_date));
create table public.exercise_completions (id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id) on delete cascade,exercise_key text not null,completed_on date not null,unique(student_id,exercise_key,completed_on));
create or replace function public.my_role() returns public.app_role language sql stable security definer set search_path='' as $$select role from public.profiles where id=(select auth.uid())$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$select coalesce(public.my_role() in ('admin','treinador'),false)$$;
create or replace function public.valid_slot(t time) returns boolean language sql immutable as $$select t in ('06:00'::time,'07:00'::time,'08:00'::time,'12:00'::time,'17:00'::time,'18:00'::time,'19:00'::time,'20:00'::time)$$;
create or replace function public.booking_capacity_check() returns trigger language plpgsql security definer set search_path='' as $$
declare cap integer; n integer;
begin
 if new.booking_date<>current_date then raise exception 'Somente reservas para hoje são permitidas';end if;
 if not public.valid_slot(new.slot) then raise exception 'Horário inválido';end if;
 perform pg_advisory_xact_lock(hashtext(new.booking_date::text||new.slot::text));
 select capacity into cap from public.settings where id=1;
 select count(*) into n from public.bookings where booking_date=new.booking_date and slot=new.slot and (tg_op='INSERT' or id<>new.id);
 if n>=cap then raise exception 'Capacidade esgotada';end if;
 return new;
end;$$;
create trigger check_booking before insert or update on public.bookings for each row execute function public.booking_capacity_check();
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,full_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),'aluno');return new;end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.settings enable row level security;
alter table public.notices enable row level security;
alter table public.bookings enable row level security;
alter table public.workouts enable row level security;
alter table public.attendance enable row level security;
alter table public.exercise_completions enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()) or public.is_staff());
create policy members_read on public.members for select to authenticated using (public.is_staff() or profile_id=(select auth.uid()));
create policy members_insert on public.members for insert to authenticated with check(public.my_role()='admin');
create policy members_update on public.members for update to authenticated using(public.my_role()='admin') with check(public.my_role()='admin');
create policy settings_read on public.settings for select to anon,authenticated using(true);
create policy settings_write on public.settings for update to authenticated using(public.my_role()='admin') with check(public.my_role()='admin');
create policy notices_read on public.notices for select to authenticated using(true);
create policy notices_insert on public.notices for insert to authenticated with check(public.my_role()='admin');
create policy bookings_read on public.bookings for select to authenticated using(student_id=(select auth.uid()) or public.is_staff());
create policy bookings_insert on public.bookings for insert to authenticated with check(student_id=(select auth.uid()) and public.my_role()='aluno');
create policy bookings_delete on public.bookings for delete to authenticated using(student_id=(select auth.uid()) or public.my_role()='admin');
create policy workouts_read on public.workouts for select to authenticated using(student_id=(select auth.uid()) or public.is_staff());
create policy workouts_insert on public.workouts for insert to authenticated with check(public.is_staff() and (trainer_id=(select auth.uid())));
create policy attendance_read on public.attendance for select to authenticated using(student_id=(select auth.uid()) or public.is_staff());
create policy attendance_insert on public.attendance for insert to authenticated with check(public.is_staff());
create policy attendance_delete on public.attendance for delete to authenticated using(public.is_staff());
create policy completion_read on public.exercise_completions for select to authenticated using(student_id=(select auth.uid()));
create policy completion_insert on public.exercise_completions for insert to authenticated with check(student_id=(select auth.uid()));
create policy completion_delete on public.exercise_completions for delete to authenticated using(student_id=(select auth.uid()));
-- Nunca adicione policies permitindo alteração de role pelo navegador.
-- Promova administradores e treinadores manualmente no SQL Editor, após criar usuários em Auth.

-- Exibe somente a quantidade agregada de reservas, sem expor nomes de alunos.
create or replace function public.slot_occupancy(p_date date,p_slot time) returns integer language sql stable security definer set search_path='' as $$select count(*)::integer from public.bookings where booking_date=p_date and slot=p_slot$$;
revoke all on function public.slot_occupancy(date,time) from public;
grant execute on function public.slot_occupancy(date,time) to authenticated;

-- Execute DEPOIS de schema.sql. Pode executar esta migração novamente.
-- Ajuste America/Recife aqui e em src/lib/data.js se a academia usar outro fuso.

create or replace function public.gym_today()
returns date language sql stable set search_path = ''
as $$ select timezone('America/Recife', now())::date $$;

-- Recupera perfis de contas criadas antes da instalação do gatilho.
insert into public.profiles(id, full_name, role)
select id, coalesce(nullif(trim(raw_user_meta_data->>'full_name'), ''),
                    nullif(split_part(email, '@', 1), ''), 'Usuário'), 'aluno'
from auth.users
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
                          nullif(split_part(new.email, '@', 1), ''), 'Usuário'), 'aluno');
  return new;
end;
$$;

-- A mesma operação insere ou troca a reserva: uma falha preserva a anterior.
create or replace function public.booking_capacity_check()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  cap integer;
  n integer;
begin
  if new.booking_date <> public.gym_today() then
    raise exception 'Somente reservas para hoje são permitidas';
  end if;
  if not public.valid_slot(new.slot) then
    raise exception 'Horário inválido';
  end if;
  perform pg_advisory_xact_lock(hashtext(new.booking_date::text || new.slot::text));
  select capacity into cap from public.settings where id = 1;
  if cap is null then raise exception 'Capacidade da academia não configurada'; end if;
  -- ON CONFLICT dispara BEFORE INSERT e BEFORE UPDATE. Não contar o próprio aluno.
  select count(*) into n from public.bookings
  where booking_date = new.booking_date and slot = new.slot
    and student_id <> new.student_id;
  if n >= cap then raise exception 'Capacidade esgotada'; end if;
  return new;
end;
$$;

-- Funções internas de autorização não precisam ser endpoints RPC públicos.
create schema if not exists private;
grant usage on schema private to authenticated;
do $$
begin
  if to_regprocedure('public.my_role()') is not null then
    alter function public.my_role() set schema private;
  end if;
  if to_regprocedure('public.is_staff()') is not null then
    alter function public.is_staff() set schema private;
  end if;
end;
$$;
create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$select coalesce(private.my_role() in ('admin','treinador'),false)$$;
revoke all on function private.my_role(), private.is_staff() from public, anon;
grant execute on function private.my_role(), private.is_staff() to authenticated;

-- RPC pública retorna somente contagem agregada a uma sessão autenticada.
create or replace function public.slot_occupancy(p_date date,p_slot time)
returns integer language sql stable security definer set search_path = ''
as $$select case when (select auth.uid()) is not null then
  (select count(*)::integer from public.bookings where booking_date=p_date and slot=p_slot)
  else null end$$;


drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update to authenticated
using (student_id = (select auth.uid()) and private.my_role() = 'aluno')
with check (student_id = (select auth.uid()) and private.my_role() = 'aluno');

alter function public.valid_slot(time) set search_path = '';
create index if not exists workouts_student_created_idx on public.workouts(student_id, created_at desc);
create index if not exists workouts_trainer_idx on public.workouts(trainer_id);

-- Permissões de tabela + RLS trabalham juntas; nenhuma permite promover o próprio perfil.
revoke all on public.profiles, public.members, public.settings,
  public.notices, public.bookings, public.workouts, public.attendance,
  public.exercise_completions from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.settings to anon;
grant select on public.profiles, public.members, public.settings,
  public.notices, public.bookings, public.workouts, public.attendance,
  public.exercise_completions to authenticated;
grant insert, update on public.members to authenticated;
grant update on public.settings to authenticated;
grant insert on public.notices, public.workouts to authenticated;
grant insert, update, delete on public.bookings to authenticated;
grant insert, delete on public.attendance, public.exercise_completions to authenticated;

revoke all on function public.slot_occupancy(date,time) from public;
grant execute on function public.slot_occupancy(date,time) to authenticated;

create or replace function private.slot_occupancy(p_date date,p_slot time)
returns integer language sql stable security definer set search_path = ''
as $$select case when (select auth.uid()) is not null then
  (select count(*)::integer from public.bookings where booking_date=p_date and slot=p_slot)
  else null end$$;
create or replace function public.slot_occupancy(p_date date,p_slot time)
returns integer language sql stable security invoker set search_path = ''
as $$select private.slot_occupancy(p_date,p_slot)$$;
revoke all on function public.booking_capacity_check(), public.handle_new_user() from public, anon, authenticated;
revoke all on function public.slot_occupancy(date,time), private.slot_occupancy(date,time) from public, anon, authenticated;
grant execute on function public.slot_occupancy(date,time), private.slot_occupancy(date,time) to authenticated;

commit;
