-- 진학 내비 서버 1차 (PRD 6-10 · 7-3 · 7-4 · R-PRIV-003)
-- 교사 계정 + 교사별 학급 데이터. 학생은 계정이 없고, 학급 데이터 안에도 번호·별칭만 있어요.
-- 학급 데이터는 앱의 교사 기기 저장소(Dexie) 묶음을 그대로 한 행(jsonb)에 올려요.
-- shortcut: 학급 하나 = 행 하나(마지막 저장이 이김). 여러 기기 동시 편집이 잦아지면 표별 행으로 나눠요.

-- 1) 프로필: 가입 때 고른 학교·이름. 역할(role)은 서버에서만 바꿔요(가입으로 관리자가 될 수 없음, PRD 7-4).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  school_code text not null check (char_length(school_code) between 1 and 20),
  school_name text not null check (char_length(school_name) between 1 and 60),
  name text not null check (char_length(name) between 1 and 30),
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "본인 프로필 읽기" on public.profiles for select to authenticated using (id = (select auth.uid()));
-- 본인은 이름만 고칠 수 있어요. 학교·역할은 열 권한으로 막아요.
create policy "본인 프로필 고치기" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

-- 가입할 때 메타데이터(school_code·school_name·name)로 프로필을 만들어요. 역할은 늘 teacher.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, school_code, school_name, name)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'school_code', ''),
          coalesce(new.raw_user_meta_data ->> 'school_name', ''),
          coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 2) 학급 데이터: 교사 본인 것만(RLS). 학급 코드는 교사마다 겹치지 않게.
create table public.class_snapshots (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_code text not null check (class_code ~ '^[A-HJ-NP-Z2-9]{4}$'),
  class_name text not null check (char_length(class_name) between 1 and 20),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, class_code),
  -- 너무 큰 묶음은 받지 않아요(학급 1개 기준 넉넉히 5MB).
  constraint snapshot_size check (pg_column_size(data) < 5000000)
);
alter table public.class_snapshots enable row level security;

create policy "본인 학급 읽기" on public.class_snapshots for select to authenticated using (owner = (select auth.uid()));
create policy "본인 학급 만들기" on public.class_snapshots for insert to authenticated with check (owner = (select auth.uid()));
create policy "본인 학급 고치기" on public.class_snapshots for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy "본인 학급 지우기" on public.class_snapshots for delete to authenticated using (owner = (select auth.uid()));
-- 관리자도 학급 데이터는 못 봐요(PRD 7-4 "학생·교사 개인 데이터에는 접근할 수 없음"). 그래서 관리자용 정책을 두지 않아요.

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger class_snapshots_touch before update on public.class_snapshots for each row execute function public.touch_updated_at();
