-- Түүх 6: Supabase мэдээллийн сангийн схем (Амжилтын схем дээр суурилсан).
-- Supabase → SQL Editor → энэ файлыг бүтнээр нь ажиллуулна. Дахин ажиллуулахад аюулгүй.
-- Сурагч, багш нар утасны дугаар + нууц үгээр бүртгүүлж нэвтэрнэ
-- (утасны дугаарыг <дугаар>@tuuh6.school гэсэн имэйл болгож хадгална).
-- Authentication → Providers → Email → "Confirm email"-ийг УНТРААНА.

-- 1. Тохиргоо: багшийн бүртгэлийн код
create table if not exists app_settings (
  key text primary key,
  value text not null
);
insert into app_settings (key, value) values ('teacher_code', 'ӨӨРЧЛӨӨРЭЙ-2026')
  on conflict (key) do nothing;
alter table app_settings enable row level security; -- хэн ч уншиж чадахгүй, зөвхөн функцууд

-- 2. Хэрэглэгчийн профайл
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  role text not null check (role in ('student', 'teacher')),
  last_name text not null,
  first_name text not null,
  grade int not null,            -- сурагч: 6 (7 = 6-р ангиа дүүргэсэн); багш: заадаг анги
  section text,                  -- бүлэг: 1, 2, 3...
  theme jsonb,
  login_count int not null default 0,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

create or replace function is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

drop policy if exists "own profile read" on profiles;
drop policy if exists "own profile update" on profiles;
create policy "own profile read" on profiles for select using (id = auth.uid() or is_teacher());
create policy "own profile update" on profiles for update using (id = auth.uid() or is_teacher());

-- Сурагч өөрийн анги, бүлэг, эрхээ өөрчилж чадахгүй — зөвхөн багш.
create or replace function guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_teacher() then
    if new.grade is distinct from old.grade or new.section is distinct from old.section
       or new.role is distinct from old.role or new.username is distinct from old.username then
      raise exception 'Анги, бүлгийг зөвхөн багш өөрчилнө';
    end if;
  elsif new.role is distinct from old.role then
    raise exception 'Эрхийг өөрчлөх боломжгүй';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on profiles;
create trigger profiles_guard before update on profiles for each row execute function guard_profile();

-- Бүртгүүлэхэд профайл автоматаар үүснэ; багшийн кодыг шалгана.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := new.raw_user_meta_data;
  r text := coalesce(m->>'role', 'student');
begin
  if r = 'teacher' and (m->>'teacher_code') is distinct from (select value from app_settings where key = 'teacher_code') then
    raise exception 'teacher code invalid';
  end if;
  if (m->>'grade')::int not in (6) then
    raise exception 'grade invalid';
  end if;
  insert into profiles (id, username, role, last_name, first_name, grade, section, login_count, last_seen)
  values (new.id, m->>'username', r, m->>'last_name', m->>'first_name', (m->>'grade')::int,
          case when r = 'student' then lower(m->>'section') end, 1, now());
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Нэвтрэлтийн тоо (хандалт)
create or replace function touch_login() returns void
language sql security definer set search_path = public as $$
  update profiles set login_count = login_count + 1, last_seen = now() where id = auth.uid();
$$;

-- Шинэ хичээлийн жил: 6-р ангийн сурагчдыг "дүүргэсэн" (7) болгоно. Зөвхөн багш.
create or replace function promote_all_students() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_teacher() then raise exception 'Зөвхөн багш'; end if;
  update profiles set grade = 7 where role = 'student' and grade = 6;
end $$;

-- 3. Оролдлого: хичээл уншсан (lesson), тоглоом тоглосон (mcq, match, order)
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  kind text not null check (kind in ('lesson', 'mcq', 'match', 'order')),
  grade int not null,
  topic_id text,
  title text,
  score int not null,
  total int not null,
  points int not null default 0, -- энэ оролдлогоор авсан оноо (lib/score.js)
  streak int not null default 0, -- хамгийн урт дараалсан зөв хариулт
  duration_sec int,
  answers jsonb,
  assignment_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists attempts_user on attempts (user_id, created_at);
alter table attempts enable row level security;
drop policy if exists "attempt read" on attempts;
drop policy if exists "attempt insert" on attempts;
create policy "attempt read" on attempts for select using (user_id = auth.uid() or is_teacher());
create policy "attempt insert" on attempts for insert with check (user_id = auth.uid());

-- 4. Багшийн нэмсэн асуулт
create table if not exists custom_questions (
  id uuid primary key default gen_random_uuid(),
  grade int not null,
  topic_id text not null,
  q text not null,
  o jsonb not null,
  a int not null,
  e text,
  created_by uuid references profiles,
  created_at timestamptz not null default now()
);
alter table custom_questions enable row level security;
drop policy if exists "questions read" on custom_questions;
drop policy if exists "questions write" on custom_questions;
drop policy if exists "questions delete" on custom_questions;
create policy "questions read" on custom_questions for select using (auth.uid() is not null);
create policy "questions write" on custom_questions for insert with check (is_teacher());
create policy "questions delete" on custom_questions for delete using (is_teacher());

-- 5. Даалгавар
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  grade int not null,
  section text,                 -- null = ангийн бүх бүлэг
  topic_id text not null,
  kind text not null default 'mcq' check (kind in ('lesson', 'mcq', 'match', 'order')),
  title text not null,
  due_date date,
  created_by uuid references profiles,
  created_at timestamptz not null default now()
);
alter table assignments enable row level security;
drop policy if exists "assignments read" on assignments;
drop policy if exists "assignments write" on assignments;
drop policy if exists "assignments delete" on assignments;
create policy "assignments read" on assignments for select using (auth.uid() is not null);
create policy "assignments write" on assignments for insert with check (is_teacher());
create policy "assignments delete" on assignments for delete using (is_teacher());

-- 6. Хурдасгах индекс
create index if not exists profiles_role_grade on profiles (role, grade, section, last_name);
create index if not exists assignments_grade on assignments (grade, created_at);

-- 7. Багш сурагчийн нууц үгийг шинэчлэх (Амжилтын reset_password.sql)
create or replace function teacher_reset_password(p_user uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not is_teacher() then
    raise exception 'Зөвхөн багш нууц үг шинэчилнэ';
  end if;
  if not exists (select 1 from profiles where id = p_user and role = 'student') then
    raise exception 'Сурагч олдсонгүй';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Нууц үг хамгийн багадаа 6 тэмдэгт';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user;
end $$;

revoke all on function teacher_reset_password(uuid, text) from public, anon;
grant execute on function teacher_reset_password(uuid, text) to authenticated;
