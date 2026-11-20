-- 생기부 AI 프록시 사용량(R-AI-005: 호출 횟수만 집계, 요청·응답 본문은 저장하지 않음).
-- 기기(브라우저)마다 한국 날짜 기준 하루 횟수를 세요. 학생은 계정이 없어서 기기 id로 셉니다.
-- shortcut: 기기 id는 브라우저가 만든 값이라 지우면 새로 세져요. 남용이 보이면 IP 기준 한도를 더해요.
create table public.ai_usage (
  device text not null check (char_length(device) between 8 and 64),
  day date not null,
  count int not null default 0,
  primary key (device, day)
);
alter table public.ai_usage enable row level security;
-- 정책을 두지 않아요: 브라우저(anon·authenticated)는 읽고 쓸 수 없고, 서버 함수만 아래 함수로 셉니다.

-- 한도 안이면 1 늘리고 true, 한도를 넘었으면 false.
create function public.take_ai_quota(p_device text, p_limit int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'Asia/Seoul')::date; c int;
begin
  insert into public.ai_usage (device, day, count) values (p_device, d, 0) on conflict do nothing;
  update public.ai_usage set count = count + 1 where device = p_device and day = d and count < p_limit returning count into c;
  return c is not null;
end $$;
revoke execute on function public.take_ai_quota(text, int) from public, anon, authenticated;
