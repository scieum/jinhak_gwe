# 02-spec — 학생 기록 상세 (student-record, 교사)

> 개정 2026-11-24(상세화): 사용자 요청 "전체적으로 기존에 시안에도 자세하게 만들지 않고 하나씩만 있는 경우가 많은데 그것들 전부 자세하게 만들어줘". ① 5장 앱 구현 목록 새로 씀 ② 6장 상태 프레임 35장(모바일 17 · PC 18) ③ 기본 프레임을 최신 design.md에 맞춤(아래 "바로잡기" 표) ④ 8장 그리는 순서 ⑤ 9장 design.md 수정 제안. 승인된 배치(머리 → 숫자 2칸 → 탭 → 내신 · 모의고사 카드, PC 2열)는 그대로예요.
> 근거: PRD 6-12 담임 기록 "학생 기록 상세(student-record): 탭 = 성적 추이 / 수능 최저 / 상담 / 수시로. 성적 추이 = 내신 학기별 평균 등급(전 교과·국수영사과) 선 차트 + 모의고사 회차별 영역 등급(국·수·영·탐1·탐2) 선 차트. 등급 축은 1이 위." · 누가기록은 2026-11-23 사용자 결정으로 빠졌어요.
> design.md App Shell(교사 대분류 우리 반 › 학생 기록, "학생 기록 상세는 우리 반 아래의 상세 화면") · Components · 확인 창 · 화면 오류 줄 · 불러오는 중
> 01-research.md 반영 포인트 P1~P7 · 앱 구현 app/src/screens/StudentRecord.tsx · app/src/components/ClassGate.tsx
> 필수 컴포넌트(requires_disclaimer_note): `disclaimer-note` 포함

## 0. 바로잡기 (최신 design.md 기준, 2026-11-24)

| 어디 | 승인 시안 | 바로잡기 |
|---|---|---|
| 탭 머리 M3 · D4 | 5칸(… 누가기록 12 …) | 4칸 성적 추이 · 수능 최저 · 상담 5 · 수시로(누가기록 삭제, 상담 수는 counsel 가상 데이터 5회에 맞춤). PC 칸 폭만 다시 나눠요 |
| PC 사이드바 위 | 글자 워드마크 "진학 내비" | `brand-logo` 폭 124(U:NAVI 로고 원본 비율, 글자 워드마크 따로 만들지 않음) |
| PC 사이드바 메뉴 | "교사" 그룹 한 줄 목록(학급 대시보드 · 학생 상담 · 카드 수합 · 가채점 수합 · 결과 집계), 학급 대시보드 선택 | `sidebar-group` 우리 반(펼침 ▾) / 성적 관리(접힘 ›) / 수합·집계(접힘 ›) + 우리 반 아래 `sidebar-item` 우리 반 홈(icon/users) · 학생 기록(icon/user, **선택**) · 학생 상담(icon/message-square) |
| PC 사이드바 바탕 | canvas-soft | canvas + 오른쪽 1px hairline-soft(v2). 맨 아래 "로그아웃"(icon/log-out) 추가 |
| PC 상단 바 D2 | 경로 "학급 대시보드 ›" 잉크 밑줄 링크 | `page-header` 이름으로 맞춤(64 띠 높이 그대로). 경로 {typography.caption} text-muted "우리 반 › 학생 기록", 오른쪽에 `button-outline` "상담 쓰기" 추가(앱에 있는 동작) |
| 모바일 앱바 M1 | 뒤로가기 → 학급 대시보드, 오른쪽 "상담 쓰기" 아이콘 | 뒤로가기 → 우리 반 홈. 오른쪽 아이콘 icon/message-square(이름 "상담 쓰기"). 상세 화면이라 `sub-nav` · `brand-logo` · `tab-bar-pill` 없음 |
| 학생 머리 M2 · D3 | 학생을 바꾸는 곳 없음 | 이름 줄 오른쪽 `button-pill-soft` "학생 바꾸기"(높이 32, 터치 44). 모바일 = 학생 고르기 `bottom-sheet`, PC = 떠 있는 목록(6장) |
| 고지 M7 · D6 | "… 공식 성적표가 최종 기준이에요 · 데이터 기준일" | 앱 문구에 맞춰 "흐름은 저장된 값을 그대로 이은 선이에요" 한 마디를 더해요 |
| 차트 축 | 세로축 전체 눈금(1~5 / 1~9) | design.md는 기본 = 데이터 범위 ±0.5로 좁힌 보기, 전체 눈금은 토글. 승인 시안의 전체 눈금은 그대로 두고 좁힌 보기는 상태 프레임 axis-narrow로 그려요(9장 제안 1) |

## 1. 공통 원칙

- 기본 프레임은 **성적 추이 탭이 열린 상태**예요. 수능 최저 · 상담 · 수시로 탭 내용은 상태 프레임(6장)에서 그려요.
- 학생은 번호와 별칭으로만 보여요("7번 하늘"). 사진·실명·아바타 없음. 아래 수치는 모두 가상값이에요.
- 이 화면은 **읽기 전용**이에요. 지우기 · 저장 · 내보내기가 없어서 확인 창과 완료 `toast`는 두지 않아요(design.md 확인 창 규칙의 대상 동작이 없음). 상담 쓰기 · 성적 불러오기 · 기준 넣기는 다른 화면으로 가는 이동이에요.
- 바탕은 흰 캔버스, 카드는 흰 바탕 + 1px hairline-soft, 모서리 0, 그림자 없음(바텀시트 · 떠 있는 목록만 overlay 그림자).
- Route Blue는 ① 선택 상태(탭 아래 2px 막대, 선택된 필터 칩 테두리, 사이드바 선택 메뉴, 시트 · 목록의 고른 행) ② 차트에서 고른 계열 1개의 2px 선 + 점 ③ 핵심 숫자 1개(내신 3-1 전 교과 평균 "2.0")에만 써요. 나머지 숫자는 잉크예요.
- 등급 숫자에는 색을 넣지 않아요. 등급 색(5 to 9 막대 전용)은 쓰지 않아요.
- 판정 색은 판정 배지 안에만 써요: 수능 최저 탭 = 수능 최저 판정 배지(충족 ● 안정 쌍 · 근접 ▲ 적정 쌍 · 미충족 ✕ 위험 쌍 · 자료 부족/판정 불가 = 판정 없음 쌍, 아이콘 없이 이름만), 수시로 탭 = `judge-badge`(안정 ● · 적정 ◐ · 소신 ▲ · 위험 ■). 조합 경고는 `warning-callout`(소신 쌍). 성적 추이 탭에는 판정이 없어요.
- 계열은 색으로 나누지 않아요. 고른 계열 1개만 Route Blue, 나머지는 1px text-faint 선 + 선 끝 이름표({typography.caption} text-muted)예요.
- 숫자(등급, 학기, 회차, 날짜)는 모두 고정폭 숫자예요. 표의 숫자 열은 오른쪽 정렬, 빈 값은 "–".
- 추이 문장은 저장된 값끼리 단순 비교한 규칙 문장이에요. 환산·합산·예측은 하지 않아요(NEVER-1, NEVER-2). 수능 최저 합은 교사가 넣은 기준의 영역 등급 합이고 "교사 입력 · 미검수" 배지를 함께 둬요.
- 이 화면의 주요 버튼은 없어요. `empty-state` 안에서만 `button-primary` 하나가 나와요.

## 2. 가상 데이터 (모든 프레임 공통)

학생: 3학년 2반 7번 · 별칭 하늘 · 희망 진로 간호 · 상담 5회 · 데이터 기준일 2026-11-18

내신 학기별 평균 등급 (5등급, 세로축 1~5, 1이 위)

| 계열 | 1-1 | 1-2 | 2-1 | 2-2 | 3-1 |
|---|---|---|---|---|---|
| 전 교과 (선택) | 2.6 | 2.4 | 2.3 | 2.1 | 2.0 |
| 국어 | 2.8 | 2.5 | 2.4 | 2.2 | 2.0 |
| 수학 | 3.0 | 2.8 | 2.7 | 2.5 | 2.4 |
| 영어 | 2.2 | 2.0 | 2.0 | 1.8 | 1.7 |
| 사회 | 2.4 | 2.3 | 2.1 | 2.0 | 2.0 |
| 과학 | 2.7 | 2.6 | 2.4 | 2.3 | 2.1 |

모의고사 회차별 영역 등급 (9등급, 세로축 1~9, 1이 위)

| 영역 | 3월 학평 | 5월 학평 | 6월 모평 | 7월 학평 | 9월 모평 | 10월 학평 |
|---|---|---|---|---|---|---|
| 국어 | 3 | 3 | 2 | 3 | 2 | 2 |
| 수학 (선택) | 4 | 4 | 3 | 3 | 3 | 3 |
| 영어 | 2 | 2 | 2 | 1 | 2 | 1 |
| 탐구1 | 3 | 2 | 3 | 2 | 2 | 2 |
| 탐구2 | 4 | 3 | 3 | 3 | 2 | – |

- 10월 학평 탐구2는 빈 값(결시)이라 점을 찍지 않고 선을 9월에서 끝내요. 표에는 "–".

수능 최저 (수능 최저 탭) — 1순위 목표 강원대학교 간호학과 · 기준 "국·수·영·탐 중 3개 합 6"(담임이 넣은 기준, `data-status-badge` "교사 입력 · 미검수"). 탐구는 두 과목 중 좋은 쪽.

| 시험 (최근이 위) | 국 | 수 | 영 | 탐 | 판정 | 이유 |
|---|---|---|---|---|---|---|
| 10월 학평 | 2 | 3 | 1 | 2 | 충족 ● | 합 5 (기준 6) |
| 9월 모평 | 2 | 3 | 2 | 2 | 충족 ● | 합 6 (기준 6) |
| 7월 학평 | 3 | 3 | 1 | 2 | 충족 ● | 합 6 (기준 6) |
| 6월 모평 | 2 | 3 | 2 | 3 | 근접 ▲ | 국어 1등급만 오르면 충족 |
| 5월 학평 | 3 | 4 | 2 | 2 | 근접 ▲ | 국어 1등급만 오르면 충족 |
| 3월 학평 | 3 | 4 | 2 | 3 | 미충족 ✕ | 합 8 (기준 6) |

상담 메모 (상담 탭, 최신이 위 — counsel 가상 데이터와 같아요)

| 날짜 | 영역 | 내용 | 다음에 볼 것 |
|---|---|---|---|
| 2026-11-12 | 수시로 | 6장 가운데 소신은 3번 칸 하나예요. 3번 칸은 최저가 근접이라 10월 학평 수학을 같이 봤어요. | 11-25까지 · 수학 오답 유형 같이 보기 · 대기 |
| 2026-11-03 | 성적 | 10월 학평 국·수·영·탐 2·3·1·2예요. 6월 모평부터 수학이 3등급에 머물러 있어요. | 11-10까지 · 자습 시간표 보여 주기 · 완료 |
| 2026-10-20 | 진로 | 간호 계열 희망은 그대로예요. 강원 지역인재 전형이 있는 대학을 같이 정리했어요. | |
| 2026-09-22 | 생활 | 등교 전 1시간 영어 단어 공부를 시작했다고 해요. | |
| 2026-09-08 | 진로 | 간호와 보건행정 사이에서 고민 중이에요. 병원 실습 이야기를 듣고 간호 쪽으로 기울었다고 해요. | 09-15까지 · 간호 학과 설명 자료 주기 · 기한 지남 |

수시로 카드 (수시로 탭) — "A안 · 카드 v3 · 2026-11-10 받음", 6칸

| 칸 | 대학 · 모집단위 | 전형 | 고사 | 판정 | 메모 |
|---|---|---|---|---|---|
| 1 | 강원대 간호 | 교과 지역인재 | – | 적정 ◐ | 최저 있음 |
| 2 | 강릉원주대 간호 | 교과 지역인재 | – | 안정 ● | – |
| 3 | 연세대 미래 간호 | 교과 학교추천 | 면접 11-21 | 소신 ▲ | 최저 근접 |
| 4 | 한림대 간호 | 교과 지역인재 | – | 적정 ◐ | – |
| 5 | 가톨릭관동대 간호 | 교과 일반 | – | 안정 ● | – |
| 6 | 상지대 간호 | 교과 지역인재 | – | 안정 ● | – |

- 대학 이름은 실제 대학이지만 판정·숫자는 예시예요. 수시로 탭이 보이는 프레임의 `disclaimer-note`에 "시안의 대학·숫자는 예시예요"를 더해요.
- 경고가 있는 학생(상태 프레임 susiro-warning): 3번 다온 · "B안 · 카드 v2 · 2026-11-14 받음" · 소신 3 · 안정 0, 6번 칸 판정 "준비 중", 경고 1개 "소신 칸이 3개예요 — 안정 칸이 하나도 없어요. 한 칸은 안정으로 바꿀지 같이 봐 주세요."

---

## 3. 모바일 390 × 844 (frame student-record/390)

좌우 패딩 20px({spacing.card}), 4열 그리드, 섹션 간격 24px. 상세 하위 화면이라 하단 탭바 · 소분류 탭은 두지 않고 앱바 뒤로가기로 돌아가요.
프레임 높이는 844로 고정이고 내용은 세로로 이어 그려요. 첫 화면(844)에는 M1~M5(내신 카드 끝)까지 보이고, M6 모의고사 카드와 M7 고지는 스크롤 아래(프레임 안 clip 영역)에 둬요.

### M1. 상단 앱바 (56px)

- `app-bar`: 왼쪽 icon/chevron-left(우리 반 홈으로), 가운데 제목 {typography.heading-4} "학생 기록", 오른쪽 보조 동작 1개 = icon/message-square "상담 쓰기"(지금 학생으로 학생 상담 화면, 터치 영역 44×44).

### M2. 학생 머리 [P5]

- 이름 줄 {typography.heading-3}: "7번 하늘" + 오른쪽 `button-pill-soft` "학생 바꾸기"(높이 32, 터치 44) → 390-student-sheet
- 메타 줄 {typography.caption} text-muted: "3학년 2반 · 희망 진로 간호"
- 숫자 2칸(2열, 사이 12px). 각 칸 `stat-tile`, Level 2 흰 카드 + 1px hairline-soft, 패딩 16px.

| 칸 | 라벨 (caption, text-muted) | 값 ({typography.numeric}, 고정폭) | 보조 설명 (body-sm, text-muted) |
|---|---|---|---|
| 왼쪽 | 3-1 내신 전 교과 | 2.0 (Route Blue, 화면 핵심 숫자) | 5등급 평균 |
| 오른쪽 | 10월 학평 국 · 수 · 영 | 2 · 3 · 1 (잉크) | 9등급 |

- 모의고사 숫자는 합치거나 평균 내지 않고 영역 등급을 그대로 보여요.

### M3. 탭 머리 [P5, P6]

- `segmented-control` 한 줄 4칸(높이 44, 폭 350, 넘치지 않아 스크롤 없음): 성적 추이 · 수능 최저 · 상담 5 · 수시로
- 선택 = `segmented-control-active` "성적 추이"(accent-soft 채움 + 아래 2px Route Blue 막대 + 잉크 SemiBold). 나머지 text-muted.

### M4. 섹션 제목

- {typography.heading-2} 없이 바로 카드로 시작해요(탭 이름이 제목 역할). 카드 사이 24px.

### M5. 내신 카드 [P1, P2, P3, P4]

흰 카드 + 1px hairline-soft, 모서리 0, 패딩 16px, 카드 안쪽 폭 318px.

1. 카드 머리
   - 제목 {typography.heading-4}: "내신 학기별 평균 등급"
   - 추이 문장 {typography.body-sm} 잉크: "3-1 전 교과 평균 2.0이에요. 지난 학기보다 0.1등급 올랐어요."
2. 계열 칩 줄(가로 스크롤, 칩 높이 32px + 위아래 여유로 터치 44px): `filter-chip` 전 교과(on) · 국어 · 수학 · 영어 · 사회 · 과학. 하나만 고를 수 있어요. on = accent-soft 채움 + 1px Route Blue 테두리 + 잉크 글자, off = canvas-soft 채움.
3. `grade-trend-chart` (318 × 180)
   - 세로축 1~5 눈금(1이 위, 전체 눈금 보기), 눈금 숫자 {typography.caption} text-muted. 가로축 1-1 · 1-2 · 2-1 · 2-2 · 3-1.
   - 차트 오른쪽 아래 글자 버튼 {typography.caption} 잉크 밑줄 "좁혀 보기"(터치 44) → 390-axis-narrow.
   - 전 교과: 2px Route Blue 선 + 점. 국어·수학·영어·사회·과학: 1px text-faint 선, 선 끝(3-1 오른쪽)에 과목 이름표. 이름표가 겹치면 위아래로 4px씩 비켜 놓아요.
   - 가장 최근 점(3-1 전 교과)에 값 라벨 "2.0" {typography.label} 잉크.
   - 기준선 1개: 1-1 전 교과 2.6 높이에 1px hairline 점선 + 캡션 "1-1 2.6".
   - 대체 텍스트: "내신 전 교과 평균 등급, 1이 위, 1-1 2.6, 1-2 2.4, 2-1 2.3, 2-2 2.1, 3-1 2.0"
4. `data-table` (차트 바로 아래, 위 가상 데이터 내신 표 그대로)
   - 열: 과목(첫 열 고정 64px) | 1-1 | 1-2 | 2-1 | 2-2 | 3-1 (각 50px). 318px 안에 들어가서 가로 스크롤 없음.
   - 머리글 canvas-soft + {typography.table-head}, 행 높이 32px, 행 구분 1px hairline, 본문 {typography.table} 고정폭 오른쪽 정렬.
   - 고른 계열 행(전 교과)은 accent-soft 채움 + 잉크 글자. 숫자 색은 바꾸지 않아요.

### M6. 모의고사 카드 [P1, P2, P3, P4, P7] (스크롤 아래)

M5와 같은 카드 틀.

1. 카드 머리
   - 제목 {typography.heading-4}: "모의고사 회차별 영역 등급"
   - 오른쪽 위 `segmented-control` 전체(선택, `segmented-control-active`) · 최근 4회
   - 추이 문장 {typography.body-sm} 잉크: "10월 학평 수학 3등급이에요. 6월 모평부터 같은 등급이에요."
2. 계열 칩 줄: `filter-chip` 국어 · 수학(on) · 영어 · 탐구1 · 탐구2
3. `grade-trend-chart` (318 × 200)
   - 세로축 1~9 눈금(1이 위), 가로축 3월 · 5월 · 6월 · 7월 · 9월 · 10월(시험 종류 학평·모평은 표 머리에 적어요). 오른쪽 아래 "좁혀 보기" 글자 버튼.
   - 수학: 2px Route Blue 선 + 점, 나머지 영역 1px text-faint 선 + 선 끝 이름표. 탐구2는 9월에서 선이 끝나고 이름표도 9월 점 옆에 둬요.
   - 최근 점(10월 수학)에 값 라벨 "3".
   - 기준선 1개: 3월 학평 수학 4 높이에 1px hairline 점선 + 캡션 "3월 4".
   - 대체 텍스트: "모의고사 수학 등급, 1이 위, 3월 4, 5월 4, 6월 3, 7월 3, 9월 3, 10월 3"
4. `data-table`: 영역(첫 열 고정 60px) | 3월 학평 | 5월 학평 | 6월 모평 | 7월 학평 | 9월 모평 | 10월 학평 (각 43px, 머리글 두 줄 "3월" / "학평"). 수학 행 accent-soft 채움. 빈 값 "–".

### M7. 고지 (스크롤 맨 아래)

- `disclaimer-note`: "ⓘ 불러온 성적표 기준이에요 · 학교·평가기관 공식 성적표가 최종 기준이에요 · 흐름은 저장된 값을 그대로 이은 선이에요 · 데이터 기준일 2026-11-18" ({typography.caption}, text-muted)
- 아래 여백 32px + 안전 영역.

---

## 4. PC 1440 × 900 (frame student-record/1440)

앱 셸: 왼쪽 `sidebar` 248px + 화면 머리 64px. 본문 1192px, 좌우 패딩 32px → 콘텐츠 1128px, 12열(열 72px, 여백 24px). 데이터 화면이라 행 간격을 촘촘하게 둬요. 한 화면(900) 안에 두 차트와 두 표, 고지까지 다 들어오게 맞춰요.

### D1. 사이드바 (248px, 전체 높이)

- `sidebar`: canvas 배경 + 오른쪽 1px hairline-soft, 맨 위 `brand-logo` 폭 124.
- 대분류 행 `sidebar-group`: 우리 반(icon/users, 펼침 ▾, 잉크) / 성적 관리(icon/chart-column, 접힘 ›, ink-soft) / 수합·집계(icon/layout-grid, 접힘 ›, ink-soft). 대분류 행에는 선택 채움을 쓰지 않아요.
- 우리 반 아래 소분류 `sidebar-item`(들여쓰기 16): 우리 반 홈(icon/users) · 학생 기록(icon/user) · 학생 상담(icon/message-square). 선택 = 학생 기록: accent-soft 채움 + 왼쪽 3px Route Blue 막대 + 잉크 글자.
- 맨 아래: "데이터 기준일 2026-11-18" 캡션 + `button-pill-soft` "백업" + "로그아웃"(icon/log-out).

### D2. 화면 머리 `page-header` (64px 띠, 승인 높이 그대로)

- 왼쪽: 경로 {typography.caption} text-muted "우리 반 › 학생 기록" + 페이지 제목 {typography.heading-4} "학생 기록".
- 오른쪽: `button-outline` "상담 쓰기"(지금 학생으로 학생 상담) → `data-status-badge` "데이터 기준일 2026-11-18" → `mode-switch` 학생 · 교사(교사 선택) → `button-pill-soft` "잠금".

### D3. 학생 머리 (높이 72px, 12열 한 줄) [P5]

- 왼쪽 6열: 이름 {typography.heading-1} "7번 하늘" + 이름 오른쪽 16 띄워 `button-pill-soft` "학생 바꾸기"(높이 32) → 1440-student-dropdown. 아래 메타 {typography.caption} text-muted "3학년 2반 · 희망 진로 간호".
- 오른쪽 6열: `stat-tile` 2개 나란히(각 200px, 사이 24px, 카드 테두리 없이 숫자만)
  - 라벨 "3-1 내신 전 교과" → 값 "2.0" Route Blue(화면 핵심 숫자) → 보조 "5등급 평균"
  - 라벨 "10월 학평 국 · 수 · 영" → 값 "2 · 3 · 1" 잉크 → 보조 "9등급"
- 학생 사진·아바타는 두지 않아요.

### D4. 탭 머리 (높이 48px, 12열 전체) [P5]

- `segmented-control` 4칸(각 282px): 성적 추이 · 수능 최저 · 상담 5 · 수시로. 선택 = `segmented-control-active` "성적 추이".
- 탭 아래 16px 뒤 본문.

### D5. 두 카드 나란히 (각 6열 552px, 사이 24px) [P6]

카드 = 흰 바탕 + 1px hairline-soft, 모서리 0, 패딩 24px → 안쪽 504px. 카드 높이 같게 맞춰요(약 580px).

#### D5-L. 내신 카드 [P1, P2, P3, P4]

1. 머리: 제목 {typography.heading-3} "내신 학기별 평균 등급" / 추이 문장 {typography.body-sm} "3-1 전 교과 평균 2.0이에요. 지난 학기보다 0.1등급 올랐어요."
2. `filter-chip` 줄: 전 교과(on) · 국어 · 수학 · 영어 · 사회 · 과학 (높이 32px).
3. `grade-trend-chart` (504 × 200): 모바일 M5-3과 같은 규칙. 세로축 1~5, 전 교과 2px Route Blue, 나머지 1px text-faint + 선 끝 이름표, 3-1 값 라벨 "2.0", 점선 기준선 "1-1 2.6", 오른쪽 아래 "좁혀 보기" 글자 버튼, 대체 텍스트 동일.
4. `data-table`: 과목(첫 열 104px) | 1-1 | 1-2 | 2-1 | 2-2 | 3-1 (각 80px). 행 높이 32px(촘촘한 데이터 표), 전 교과 행 accent-soft 채움.

#### D5-R. 모의고사 카드 [P1, P2, P3, P4, P7]

1. 머리: 제목 {typography.heading-3} "모의고사 회차별 영역 등급", 오른쪽 위 `segmented-control` 전체(`segmented-control-active`) · 최근 4회 / 추이 문장 "10월 학평 수학 3등급이에요. 6월 모평부터 같은 등급이에요."
2. `filter-chip` 줄: 국어 · 수학(on) · 영어 · 탐구1 · 탐구2.
3. `grade-trend-chart` (504 × 200): 모바일 M6-3과 같은 규칙. 세로축 1~9, 수학 2px Route Blue, 탐구2는 9월에서 끝, 10월 수학 값 라벨 "3", 점선 기준선 "3월 4", "좁혀 보기" 글자 버튼.
4. `data-table`: 영역(첫 열 84px) | 3월 학평 | 5월 학평 | 6월 모평 | 7월 학평 | 9월 모평 | 10월 학평 (각 70px, 머리글 한 줄). 수학 행 accent-soft 채움, 빈 값 "–".

### D6. 고지 (12열 전체, 카드 아래 16px)

- `disclaimer-note`: M7과 같은 문구.
- 앱 화면이라 `footer`는 두지 않아요.

### PC 높이 맞춤 (참고)

화면 머리 64 + 24 + 머리 72 + 16 + 탭 48 + 16 + 카드 580 + 16 + 고지 20 = 856 → 900 안에 들어와요.

---

## 5. 앱 구현 목록 (app/src, 2026-11-24 확인)

| 앱 동작 (파일) | 시안 프레임 |
|---|---|
| 학급 저장소 읽는 중 role=status "학급 데이터를 읽고 있어요."(ClassGate) | 390-loading · 1440-loading |
| 학급 저장소 읽기 오류 role=alert(ClassGate) | 390-load-error · 1440-load-error |
| 학급·학생 없음 `empty-state` "아직 불러온 학생이 없어요" + "우리 반 홈에서 학급 만들기 ›"(ClassGate) | 390-no-class · 1440-no-class |
| 학생 바꾸기 select(StudentRecord) → 모바일 `bottom-sheet` 단일 선택 목록 / PC 떠 있는 목록 | 390-student-sheet · 1440-student-dropdown |
| "상담 쓰기" 이동 링크(StudentRecord) | 기본 프레임 앱바 아이콘 · page-header 버튼(이동만, 상태 없음) |
| 탭 SegmentedControl 4칸 · 상담 수 표시(StudentRecord) | 기본 프레임 M3 · D4 |
| 성적 추이 · 내신 · 모의고사 모두 없음 `empty-state` "아직 불러온 성적이 없어요" + "성적 불러오기"(StudentRecord) | 390-no-scores · 1440-no-scores |
| 차트 점 2개 미만 "두 번 이상 있어야 흐름을 볼 수 있어요." + 표만(TrendChart) | 390-one-point · 1440-one-point |
| 한쪽만 없음(내신 없음 · 모의고사만) — 앱은 빈 표 + 같은 문장 | 1440-school-missing(빈 카드 문구를 따로 정함) |
| 계열 전환 SegmentedControl(TrendChart) → 시안은 `filter-chip` | 390-series-korean · 1440-series-korean |
| 전체 · 최근 4회 전환(앱에 없음, 승인 시안 요소) | 390-recent4 · 1440-recent4 |
| 축 좁혀 보기 토글(앱에 없음, design.md 기본 보기) | 390-axis-narrow · 1440-axis-narrow |
| 수능 최저 탭: 1순위 목표 + 기준 + "교사 입력 · 미검수" + 시험별 표 · VerdictBadge · 이유 + "수능 최저 판정에서 기준 넣기 ›"(MinimumTab) | 390-minimum · 1440-minimum |
| 수능 최저 탭: 목표 없음 "1순위 목표: 없음", 판정 불가(MinimumTab · judgeMinimum) | 390-minimum-no-target · 1440-minimum-no-target |
| 수능 최저 탭: 모의고사 없음 "모의고사 성적이 없어요. 성적 불러오기에서 올리면 …"(MinimumTab) | 390-minimum-no-mock · 1440-minimum-no-mock |
| 상담 탭: 메모 타임라인 · 다음에 볼 것 대기/완료/기한 지남(StudentRecord · nextState) | 390-counsel · 1440-counsel |
| 상담 탭: 메모 0건 "아직 남긴 상담 메모가 없어요. 상담 쓰기 ›" | 390-counsel-empty · 1440-counsel-empty |
| 수시로 탭: 최신 카드 표 · JudgeMark · "판정 준비 중" · 경고 warning-callout(StudentRecord) | 390-susiro · 1440-susiro · 390-susiro-warning · 1440-susiro-warning |
| 수시로 탭: 카드 없음 "아직 받은 수시로 카드가 없어요." | 390-susiro-empty · 1440-susiro-empty |
| 주소의 학생 번호가 없으면 첫 학생으로 조용히 열림(StudentRecord) | 그리지 않음(오류 아님) |
| Modal · window.confirm · toast · 입력칸 오류 · 필터 결과 0건 | 이 화면엔 없음(읽기 전용, 1장) |

## 6. 상태 프레임 (03-draft.json · 05-build.json states에만 적고 frames에는 넣지 않아요)

이름 = student-record/<폭>-<상태>. 모바일 17장 + PC 18장 = 35장. 별말 없으면 기본 프레임(0장 바로잡기 반영)을 복제해서 적힌 곳만 바꿔요.
떠 있는 레이어 노드 이름은 정확히 bottom-sheet · dropdown으로 지어요(J6 그림자 검사). PC 떠 있는 목록은 `text-input` 변형 select의 PC 목록 모양이고 노드 이름만 dropdown이에요.
탭 내용 프레임(minimum · counsel · susiro 묶음)은 탭 머리 아래 성적 추이 카드 자리를 그 탭 내용으로 바꾸고, 학생 머리 · 숫자 2칸 · 고지는 그대로 둬요. PC는 탭 내용을 12열 전체 흰 카드 하나(패딩 24)에 넣어요.

### 6-1. 모바일 390 × 844 (17)

| 프레임 | 무엇을 그리나 |
|---|---|
| student-record/390-loading | M1 앱바만 두고 아래 흰 바탕에 "학급 데이터를 읽고 있어요." {typography.body-sm} text-muted 한 줄(불러오는 중 규칙). 학생 머리 · 탭 · 카드 · 고지 없음 |
| student-record/390-load-error | M1 아래 화면 오류 줄: icon/triangle-alert 20 잉크 + "저장된 학급 기록을 열지 못했어요. 화면을 다시 열거나 백업 파일로 복원해 주세요." {typography.body} 잉크 + `button-outline` "다시 열기". 판정 색 없음 |
| student-record/390-no-class | M1 아래 `empty-state`: 흑백 선 아이콘(icon/users 48) → "아직 불러온 학생이 없어요" {typography.heading-4} → "반 이름과 번호·별칭 명단을 넣으면 학급 코드가 생겨요. 학생은 이 코드를 넣어 카드를 보내요." {typography.body-sm} → `button-primary` "우리 반 홈으로 가기" |
| student-record/390-student-sheet | "학생 바꾸기"를 누른 뒤. 뒤 scrim, `bottom-sheet`(손잡이, 높이 화면의 80%): 제목 "학생 고르기" {typography.heading-4} + 오른쪽 닫기 44×44 → 단일 선택 목록(행 48, 번호순, 스크롤): "1번 바다" · "2번 솔" · "3번 다온" · … · "7번 하늘"(고른 행 = accent-soft + 왼쪽 3px Route Blue 막대 + 오른쪽 icon/check Route Blue) · "8번 가람" …. 행 설명 한 줄 caption text-muted "3-1 내신 2.0 · 상담 5회". 고르면 바로 닫히고 같은 탭으로 그 학생을 보여요 |
| student-record/390-no-scores | 학생 2번 솔. 숫자 2칸 값 "–" · 라벨 "내신" / "모의고사", 탭은 그대로. M5 · M6 자리에 `empty-state`: 선 아이콘(icon/chart-line 48) → "아직 불러온 성적이 없어요" → "성적표를 불러오면 학기별·회차별 등급 흐름을 여기에서 볼 수 있어요." → `button-primary` "성적 불러오기". `disclaimer-note`는 그대로 |
| student-record/390-one-point | 학생 28번 새솔(전학, 내신 3-1 2.9 · 10월 학평 2 · 4 · 3 · 3 · 3만 있음). 두 카드 모두 칩 줄 · 차트 대신 한 줄 {typography.body-sm} text-muted "학기가 두 개 이상 있어야 흐름을 볼 수 있어요."(모의고사 카드는 "모의고사가 두 번 이상 …") + 아래 `data-table`(내신 3-1 한 열 · 모의고사 10월 한 열). 추이 문장 · 기준선 · 최근 4회 세그먼트 없음. 숫자 2칸은 "2.9"(Route Blue) · "2 · 4 · 3" |
| student-record/390-series-korean | 내신 칩 "국어" on(전 교과 off). 차트 국어 2px Route Blue 선 + 점 · 값 라벨 "2.0", 전 교과는 1px text-faint + 이름표 "전 교과". 기준선 "1-1 2.8". 추이 문장 "3-1 국어 2.0이에요. 지난 학기보다 0.2등급 올랐어요." 표 국어 행 accent-soft. 숫자 2칸의 Route Blue "2.0"(전 교과)은 그대로 |
| student-record/390-recent4 | 스크롤해 M6이 위로 온 모습. `segmented-control` "최근 4회" 선택. 가로축 6월 · 7월 · 9월 · 10월, 기준선 "6월 3", 탐구2는 9월에서 끝. 표 열 4개(각 64px, 머리글 두 줄). 추이 문장 그대로 |
| student-record/390-axis-narrow | M5 차트 "좁혀 보기"를 누른 뒤. 세로축 1.0~3.5(0.5 눈금, 데이터 1.7~3.0 ±0.5), 축 아래 caption text-muted "1.0~3.5등급만 보여요" + 글자 버튼 "전체 눈금 보기". 선 · 이름표 · 기준선은 같은 값으로 다시 놓아요 |
| student-record/390-minimum | "수능 최저" 탭 선택. 흰 카드: 머리 {typography.heading-4} "1순위 목표 · 강원대학교 간호학과" → caption "국·수·영·탐 중 3개 합 6" + `data-status-badge` "교사 입력 · 미검수" → `data-table` 행 두 줄(행 높이 56): 1줄 시험 {typography.table} + 국 · 수 · 영 · 탐 등급(각 32, 고정폭 오른쪽 정렬) + 수능 최저 판정 배지 compact(충족 ● · 근접 ▲ · 미충족 ✕), 2줄 이유 {typography.caption} text-muted. 가상 데이터 6행(최근이 위), 미충족 행은 첫 칸 앞 ✕ 아이콘 → 아래 링크 "수능 최저 판정에서 기준 넣기 ›"(잉크 밑줄) → 고지 "ⓘ 대학 공식 모집요강이 최종 기준이에요 · 교사가 넣은 기준이라 판정은 참고로만 봐 주세요 · 데이터 기준일 2026-11-18" |
| student-record/390-minimum-no-target | 학생 4번 이음. 머리 "1순위 목표 · 없음", 배지 없음. 표 판정 칸 모두 "판정 불가"(판정 없음 쌍, 아이콘 없이 이름만), 이유 "대학 기준이 없어요". 표 위 한 줄 {typography.body-sm} "1순위 목표 대학의 최저 기준을 넣으면 시험마다 충족 현황을 보여요." + 링크 "수능 최저 판정에서 기준 넣기 ›" |
| student-record/390-minimum-no-mock | 학생 2번 솔(모의고사 없음). 카드 자리에 `empty-state`: 선 아이콘(icon/book-open 48) → "모의고사 성적이 없어요" → "성적 불러오기에서 모의고사를 올리면 1순위 목표 충족 현황을 볼 수 있어요." → `button-primary` "성적 불러오기" |
| student-record/390-counsel | "상담 5" 탭 선택. 머리 {typography.heading-4} "상담 메모" + caption "5건 · 최근이 위" → `counsel-timeline` 5건(마디 점 8 잉크 + 1px hairline 세로선): 머리 줄 날짜 caption 고정폭 + 영역 라벨(canvas-soft + {typography.label}) → 본문 {typography.body} → 다음에 볼 것 줄 {typography.body-sm} "다음에 볼 것 · 11-25까지 · 수학 오답 유형 같이 보기" + 상태 글자 "대기"(잉크) · "완료"(text-muted) · "기한 지남"(잉크 Bold). 색 없음. 읽기 전용이라 수정 · 완료로 표시 버튼 없음 → 맨 아래 `button-pill-soft` "학생 상담에서 쓰기 ›"(폭 350, 높이 44) |
| student-record/390-counsel-empty | 학생 2번 솔. 탭 "상담 0". `empty-state`: 선 아이콘(icon/message-square 48) → "아직 남긴 상담 메모가 없어요" → "학생 상담에서 메모를 남기면 여기에 날짜순으로 쌓여요." → `button-primary` "상담 쓰기" |
| student-record/390-susiro | "수시로" 탭 선택. caption text-muted "A안 · 카드 v3 · 2026-11-10 받음" → `data-table` 행 세 줄(행 높이 72): 칸 번호 고정폭(폭 24) | 1줄 대학 · 모집단위 {typography.title} + 오른쪽 `judge-badge` compact(안정 ● · 적정 ◐ · 소신 ▲) / 2줄 전형 {typography.caption} text-muted / 3줄 고사 · 메모 {typography.caption}("면접 11-21 · 최저 근접", 없으면 "–"). 가상 데이터 6행. 경고 없음 → 고지에 "시안의 대학·숫자는 예시예요" 더함 |
| student-record/390-susiro-warning | 학생 3번 다온. 표 위에 `warning-callout`(소신 쌍, ▲ 제목 "소신 칸이 3개예요" + 잉크 설명 "안정 칸이 하나도 없어요. 한 칸은 안정으로 바꿀지 같이 봐 주세요."). 6번 칸 판정 자리 `data-status-badge` "준비 중". 카드 줄 "B안 · 카드 v2 · 2026-11-14 받음" |
| student-record/390-susiro-empty | 학생 2번 솔. `empty-state`: 선 아이콘(icon/layout-grid 48) → "아직 받은 수시로 카드가 없어요" → "학생이 수시로 카드를 보내면 카드 수합에서 받아 여기에서 6칸과 판정을 볼 수 있어요." → `button-primary` "카드 수합으로 가기" |

### 6-2. PC 1440 × 900 (18)

| 프레임 | 무엇을 그리나 |
|---|---|
| student-record/1440-loading | D1 사이드바 · D2 화면 머리(상담 쓰기 버튼 숨김)만, 콘텐츠 위 "학급 데이터를 읽고 있어요." 한 줄 |
| student-record/1440-load-error | 390-load-error와 같은 화면 오류 줄을 콘텐츠 위 흰 카드(폭 1128)에 |
| student-record/1440-no-class | 콘텐츠 가운데 `empty-state`(390-no-class와 같은 문구 · 버튼). 화면 머리의 "상담 쓰기" 숨김 |
| student-record/1440-student-dropdown | "학생 바꾸기" 아래 4px 떠 있는 목록(노드 이름 dropdown, 폭 320, 행 40, 최대 높이 400 스크롤, overlay 그림자): 390-student-sheet와 같은 행 · 고른 표시. ↑↓ · Enter · Esc |
| student-record/1440-no-scores | D5 두 카드 자리(12열)에 `empty-state` 하나(390-no-scores 문구 · `button-primary` "성적 불러오기"). 숫자 2칸 "–" |
| student-record/1440-one-point | 390-one-point와 같은 학생 · 문장. 두 카드 높이는 내용에 맞춰 줄이고 같게 맞춰요 |
| student-record/1440-school-missing | 학생 11번 라온(내신 없음, 모의고사 6회 있음). 왼쪽 내신 카드 = 제목 + 한 줄 {typography.body-sm} text-muted "아직 불러온 내신이 없어요. 성적 불러오기에서 내신 성적표를 올려요." + 링크 "성적 불러오기 ›"(차트 · 표 없음, `empty-state` 아님 — 오른쪽 카드가 살아 있어서). 오른쪽 모의고사 카드는 기본과 같은 모양. 숫자 왼쪽 칸 "–" 라벨 "내신" |
| student-record/1440-series-korean | 390-series-korean과 같은 변화(내신 카드) |
| student-record/1440-recent4 | 390-recent4와 같은 변화(모의고사 카드, 표 열 4개 각 105px) |
| student-record/1440-axis-narrow | 390-axis-narrow와 같은 변화를 두 카드 모두에(모의고사 1~5, 데이터 1~4 ±0.5) |
| student-record/1440-minimum | 수능 최저 탭. 12열 흰 카드: 머리 줄 "1순위 목표 · 강원대학교 간호학과" {typography.heading-3} + caption 기준 + `data-status-badge` "교사 입력 · 미검수" → `data-table` 한 줄 행(높이 44): 시험 160 | 국 · 수 · 영 · 탐 각 80(오른쪽 정렬) | 판정 140(수능 최저 판정 배지 기본 크기) | 이유 나머지. 미충족 행 첫 칸 앞 ✕ → 링크 → 고지(390-minimum과 같은 문구) |
| student-record/1440-minimum-no-target | 390-minimum-no-target과 같은 내용, 한 줄 행 표 |
| student-record/1440-minimum-no-mock | 12열 카드 안 `empty-state`(390-minimum-no-mock 문구 · 버튼) |
| student-record/1440-counsel | 12열 카드를 둘로: 왼쪽 8열 `counsel-timeline` 5건(390-counsel과 같은 규칙), 오른쪽 4열 요약 줄 "다음에 볼 것 · 대기 1 · 기한 지남 1"(글자만, 색 없음). 맨 아래 링크 "학생 상담에서 쓰기 ›"(화면 머리에 "상담 쓰기" 버튼이 있어서 버튼으로 겹치지 않게) |
| student-record/1440-counsel-empty | 12열 카드 안 `empty-state`(390-counsel-empty 문구). 화면 머리 "상담 쓰기" `button-outline`과 같은 동작이라 `empty-state` 버튼 문구는 "상담 쓰기"로 같게 |
| student-record/1440-susiro | 12열 카드: caption 카드 줄 → `data-table` 한 줄 행(높이 52): 칸 48 | 대학 · 전형 360(1줄 대학 · 모집단위, 2줄 전형 caption) | 고사 160 | 판정 140(`judge-badge` 기본 크기) | 메모 나머지. 고지에 "시안의 대학·숫자는 예시예요" |
| student-record/1440-susiro-warning | 390-susiro-warning과 같은 학생. `warning-callout`은 표 위 12열 전체, 6번 칸 판정 "준비 중" `data-status-badge` |
| student-record/1440-susiro-empty | 12열 카드 안 `empty-state`(390-susiro-empty 문구 · 버튼) |

### 6-3. 묶음별 수

| 묶음 | 390 | 1440 |
|---|---|---|
| 셸 · 학생 | loading · load-error · no-class · student-sheet | loading · load-error · no-class · student-dropdown |
| 성적 추이 | no-scores · one-point · series-korean · recent4 · axis-narrow | no-scores · one-point · school-missing · series-korean · recent4 · axis-narrow |
| 수능 최저 | minimum · minimum-no-target · minimum-no-mock | 같음 |
| 상담 | counsel · counsel-empty | 같음 |
| 수시로 | susiro · susiro-warning · susiro-empty | 같음 |
| 합 | 17 | 18 |

---

## 7. 사용 컴포넌트

`app-bar`, `stat-tile`, `segmented-control`, `segmented-control-active`, `filter-chip`, `grade-trend-chart`, `data-table`, `disclaimer-note`, `sidebar`, `sidebar-group`, `sidebar-item`, `brand-logo`, `page-header`, `data-status-badge`, `mode-switch`, `button-pill-soft`, `button-outline`, `button-primary`, `empty-state`, `bottom-sheet`, `judge-badge`, `warning-callout`, `counsel-timeline`

- 컴포넌트가 없는 요소의 연결: 학생 머리(이름·메타) → 텍스트만, 카드 틀 → Level 2 흰 카드, 탭 머리 · 기간 선택 → segmented-control, PC 학생 목록 → `text-input` 변형 select의 PC 떠 있는 목록 모양(노드 이름 dropdown), 축 토글 → 글자 버튼(9장 제안 1), 화면 오류 줄 · 불러오는 중 → design.md 문장 규칙.
- 이 화면에서 쓰지 않는 것: `tab-bar-pill` · `sub-nav`(모바일 상세 화면), `modal` · `toast`(읽기 전용, 1장), `text-input-error`(입력칸 없음), 등급 색 · `range-bar-5to9`, `univ-logo`(수시로 표는 글자만, 앱과 같음), `interest-heart`, `footer`.

## 8. 디자이너 메모 — 이번 상세화 그리는 순서

Figma MCP 호출 한도가 있으니 한 번에 몇 장씩 묶어 그려요. 파일 AqkVdYZ4hvPYuAlewoBs4W, 섹션 346:57234, 본 프레임 student-record/390 = 346:64549 · student-record/1440 = 346:57235.
1. 본 프레임 2장을 0장 바로잡기대로 고쳐요: 탭 4칸(누가기록 삭제, "상담 5"), PC 사이드바(`brand-logo` 124 · canvas + 오른쪽 선 · 대분류 3행 · 우리 반 소분류 3행 아이콘 · 학생 기록 선택 · 로그아웃), PC 화면 머리 경로 "우리 반 › 학생 기록" + "상담 쓰기" 버튼, 모바일 앱바 오른쪽 icon/message-square, 이름 줄 "학생 바꾸기", 차트 "좁혀 보기" 글자 버튼, 고지 문구. 카드 · 차트 · 표 좌표는 그대로.
2. 본 프레임을 복제해 바꾸는 쪽(성적 추이 묶음): series-korean → recent4 → axis-narrow → one-point → school-missing(1440) → no-scores.
3. 탭 내용 묶음: 탭 선택만 바꾼 복제본을 한 장 만들고 그 위에 minimum → minimum-no-target → minimum-no-mock → counsel → counsel-empty → susiro → susiro-warning → susiro-empty 순서(390 먼저, 같은 내용으로 1440).
4. 셸만 남기는 쪽: loading → load-error → no-class.
5. 오버레이: student-sheet(390) → student-dropdown(1440). 노드 이름 bottom-sheet · dropdown, 그림자는 이 두 레이어에만.
6. 섹션 안에 묶음 순(6-3 표)으로 390 줄 · 1440 줄 두 줄로 놓고, 05-build.json states에 이름 → 노드 id를 적어요(frames는 본 프레임 2개만).
7. 끝나면 판정 배지 쓰인 곳(minimum 3장씩, susiro 2장씩)만 아이콘 · 이름 · 색 쌍을 한 번 더 봐요: 수능 최저 = ● 충족 · ▲ 근접 · ✕ 미충족 · 판정 불가(아이콘 없음), 수시로 = ● 안정 · ◐ 적정 · ▲ 소신. 판정 색이 배지 · 경고 밖(상담 영역 라벨, 표 숫자, 차트)에 없는지도 봐요.
- 공통: 레이어 이름 = 컴포넌트 이름(J6). 모서리는 모두 0(바텀시트 위쪽만 rounded.sm). ELLIPSE는 차트 점 · 타임라인 마디 · 판정 아이콘 ●에만. 색은 rules colors 안에서 Figma 변수로, 로고만 팔레트 예외. 글꼴 Pretendard(없으면 IBM Plex Sans KR), 굵기 300/400/600/700, 자간 0. Route Blue 숫자는 "2.0" 하나예요.

## 9. design.md 수정 제안 (사람 확인 필요)

1. grade-trend-chart 축 토글: design.md는 "기본 보기는 데이터 범위 ±0.5로 좁히고 전체 눈금은 토글"이라고만 하고 토글 모양이 없어요. 승인된 이 화면은 전체 눈금이 기본이라 정의와도 어긋나요. 제안: ① 토글 = 차트 오른쪽 아래 글자 버튼 {typography.caption} 잉크 밑줄 "좁혀 보기" / "전체 눈금 보기"(터치 44) + 좁힌 보기일 때 축 아래 caption "a~b등급만 보여요" 한 줄 ② 교사 상세(student-record)처럼 여러 학생을 같은 눈으로 비교하는 화면은 전체 눈금을 기본으로 둘 수 있다는 예외 한 줄. 이 문서는 새 부품 없이 글자 버튼으로만 그려요(axis-narrow 2장).
