# 02-spec — 우리 반 홈 (teacher-dashboard, 교사)

작성일 2026-11-18 · 담당 planner (S2) · 개정 1(2026-11-24 상세화: 상태 프레임 34장 추가 · 최신 design.md에 맞춰 기본 프레임 설명 바로잡음)
근거: PRD 6-10 교사 모드(학급 대시보드) · PRD 6-12 "우리 반 홈"(숫자 타일 4개, 우리 반 브리핑 — 최저 근접 · 카드 위험 경고 · 성적 하락, 학생 한눈에) · PRD 13장(규칙 계산, 데이터 기준일 + 공식 자료 고지)
design.md(2026-11-24 — U:NAVI 이름 · brand-logo 124/92 · App Shell 교사 대분류 · page-header · 수능 최저 판정 배지 ▲·✕ · 확인 창 규칙과 내 기기 파일 저장 예외 · text-input 변형 select · multiline · text-input-error 아이콘 · empty-state 화면 오류 줄 · 불러오는 중 · lock-screen) · 01-research.md 반영 포인트 P1~P7 · work/_data/demo-dataset.md(개정 2)
앱: app/src/screens/TeacherDashboard.tsx · app/src/components/ClassGate.tsx · ClassWelcome.tsx · ServerSync.tsx · TeacherLock.tsx · app/src/domain/classroom.ts · teacherLock.ts · app/src/io/classSync.ts
프레임: teacher-dashboard/390 (390×844), teacher-dashboard/1440 (1440×900) = 기본 2장(승인 v2, 2026-11-23). 상태 프레임 34장은 5장 표 — 03-draft.json의 states 목록에만 적고 frames 목록에는 넣지 않아요.
필수 컴포넌트: `disclaimer-note` (trace 아코디언은 이 화면 필수 아님)

## 0. 최신 design.md에 맞춰 바로잡은 점 (2026-11-24, 승인 레이아웃은 그대로)

| # | 어디 | 지금 설명 → 바꿀 것 | 근거 |
|---|---|---|---|
| R1 | 서비스 이름 · 로고 | 사이드바 위 글자 워드마크 "진학 내비" → `brand-logo`(U:NAVI 로고, 폭 124, 원본 비율). 모바일 머리는 `brand-logo` 폭 92(우리 반 홈 = 교사 대분류 "우리 반"의 첫 화면) | brand-logo |
| R2 | PC 사이드바 | 평평한 학생 9 · 교사 5 메뉴 → 교사 대분류 `sidebar-group` 3개: 우리 반 ▾(펼침, {colors.ink}) · 성적 관리 ›(접힘) · 수합·집계 ›(접힘). 우리 반 아래 `sidebar-item` 3개(들여쓰기 16): **우리 반 홈**(선택, icon/users) · 학생 기록 · 학생 상담. 그 아래 캡션 "학생" + 학생 대분류 4개 접힘(홈 · 성적 · 대학 찾기 · 수시 전략). 바탕 {colors.canvas} + 오른쪽 1px {colors.hairline-soft}. 맨 아래 데이터 기준일 · 백업 · 로그아웃(icon/log-out). 소분류 아이콘은 승인 시안 그대로 | App Shell, sidebar |
| R3 | PC 머리 | 상단 바 64 → `page-header`: 경로 "우리 반 › 우리 반 홈" {typography.caption} {colors.text-muted} → 제목 "우리 반 홈" {typography.heading-1} → 캡션 "2학년 3반 · 28명 · 학급 코드 7Q4K — 학생에게 이 코드를 알려 주세요"(앱 문구). 오른쪽: `data-status-badge` "데이터 기준일 2026-11-18" → `button-outline` "학급 관리"(새, 5장 1440-class-manage) → `mode-switch` → 잠금 버튼(위치 그대로) | page-header, 앱 학급 관리 |
| R4 | 수능 최저 아이콘 | 근접 ◐ → ▲(적정 쌍, 속이 찬 세모), 미충족 ■ → ✕(위험 쌍). 타일 3 라벨 · 표 · 브리핑 · 모바일 모두 | 수능 최저 판정 배지 |
| R5 | 바탕 · 카드 | 흰 캔버스 + 카드 1px 선 → 앱 셸 안 바탕 Page({colors.canvas-soft}), 카드 · 표 묶음은 선 없는 흰 카드(Level 2). Page 위에 바로 놓이는 `filter-chip` off · `data-status-badge` 채움은 {colors.canvas} | Elevation v2 |
| R6 | 표 판정 칸 | 28행이라 판정 칸이 10개를 넘어요 → `judge-badge` compact(채움 없이 판정 글자색 아이콘 + 이름). 미충족 행은 번호 칸 앞에 ✕ {colors.judge-risk}를 둬서 먼저 읽히게 해요 | data-table |
| R7 | 환산 9등급 칸 | 범위 "약 a~b" → 앱과 같은 A-1 대표값 "약 x.x"(R-CONV-003 검수 완료), 머리글 "환산 9등급 (추정)". 성적이 없으면 `data-status-badge` "성적 없음" | 앱 g9Label, NEVER-1 |
| R8 | 모바일 머리 · 탭바 | 앱바 "우리 반 홈" + 뒤로가기 → 머리 줄 56(왼쪽 `brand-logo` 92, 오른쪽 잠금 icon/lock 44×44) + 바로 아래 `sub-nav` 44: **우리 반 홈**(선택) · 학생 기록 · 학생 상담. `tab-bar-pill` 홈·성적·될각·수시로·메뉴 → 교사 대분류 **우리 반**(선택) · 성적 관리 · 수합·집계 · 더보기 | App Shell 모바일, sub-nav |
| R9 | 엑셀 내보내기 | 확인 창 없이 바로 저장하고 `toast`로 알려요(내 기기 파일 저장 예외) | 확인 창 예외 |
| R10 | 예시 값 | 3학년 2반 · 임의 별칭 → demo-dataset 개정 2(2학년 3반 28명, 번호표 별칭). 승인 v2 프레임이 이미 이 값이면 그대로 둬요 | demo-dataset |
| R11 | 학생 0명 상태 | "성적 불러오기" 빈 상태 → 앱처럼 학급이 없을 때 "우리 반 시작하기"(학급 만들기). 5장 1440-welcome | 앱 ClassGate |

## 1. 공통 원칙

- 바탕은 Page({colors.canvas-soft}), 내용은 선 없는 흰 카드. 모든 모서리 0. 그림자는 `modal` · `bottom-sheet` · `toast`에만.
- 판정 · 경고는 늘 색 + 아이콘 + 이름을 같이 써요.
  - 수능 최저(1순위 목표, 충족 현황): 충족 = 안정 쌍 ● / 근접 = 적정 쌍 ▲ / 미충족 = 위험 쌍 ✕ / 자료 부족 · 판정 불가 = 판정 없음 쌍(아이콘 없이 이름만).
  - 카드 조합 경고(수시로 경고): 소신 쌍 ▲ + "경고 n". 근접 ▲와 모양이 같아도 색 쌍과 이름("근접" / "경고 n")으로 구분해요.
  - 성적 하락은 판정이 아니라 신호라서 흑백 `data-status-badge`로 둬요.
- Route Blue: ① 선택 상태(선택된 `sidebar-item`, 켜진 `filter-chip`, `mode-switch` 교사 칸, `sub-nav` 선택 막대, `tab-bar-pill` 우리 반 탭, 단일 선택 목록의 고른 행) ② 핵심 숫자 1개("상담 필요 9명"의 숫자) ③ 텍스트 링크. 판정 배지 안 · 버튼 채움 · 확인 창 · toast에는 쓰지 않아요.
- 문구는 "충족 현황", "충족해요/아직 못 미쳐요"처럼 지금 성적 기준 사실만 써요. 환산값에는 "약"과 "(추정)"을 붙여요.
- 학생은 번호 · 별칭으로만 보여요(실명 없음). 숫자(번호, 등급, 명수, 날짜, 학급 코드)는 모두 고정폭.
- 확인 창: 지우기 · 되돌리기 어려운 저장 · 저장하지 않고 닫기 · 서버로 보내기 전에 PC `modal`(최대 폭 560) / 모바일 `bottom-sheet`. 제목 질문 {typography.heading-4} + 함께 바뀌는 것 한 줄 {typography.body} + `button-outline` "취소" · `button-primary` 실행(잉크, 오른쪽 정렬). 위험 색 채움 없음. 끝나면 `toast` 한 줄.
- 오류: 입력칸 하나의 형식 오류는 `text-input-error`(2px 위험 링 + icon/triangle-alert 14 + 위험 글자색 문장), 읽기 · 저장 실패는 화면 오류 줄(icon/triangle-alert 20 {colors.ink} + {typography.body} 문장 + `button-outline` 다시 하기, 판정 색 없음).
- 불러오는 중: 자리에 "학급 데이터를 읽고 있어요." {typography.body-sm} {colors.text-muted} 한 줄만.
- 주요 버튼(`button-primary`)은 한 화면에 하나. 평소 기본 화면에는 주요 버튼이 없어요(학급 시작 · 확인 창 · 잠금 풀기에서만).

## 2. 예시 데이터 (demo-dataset 개정 2 — 2학년 3반 28명, 10월 모의고사, 오늘 2026-11-20)

| 번호 | 별칭 | 5등급 평균 | 환산 9등급 (추정) | 수능 최저(1순위) | 관심 대학 | 카드 | 경고 | 신호 |
|---|---|---|---|---|---|---|---|---|
| 05 | 햇살 | 2.0 | 약 3.3 | ● 충족 | 4 | 제출 | ▲ 경고 2 | |
| 15 | 바다 | 2.2 | 약 3.7 | ✕ 미충족 | 6 | 제출 | ▲ 경고 2 | |
| 18 | 여울 | 1.9 | 약 3.2 | ▲ 근접 | 5 | 제출 | ▲ 경고 1 | |
| 22 | 은하 | 2.5 | 약 4.2 | ✕ 미충족 | 6 | 제출 | ▲ 경고 1 | |
| 01 | 새벽 | 1.6 | 약 2.8 | ● 충족 | 3 | 제출 | – | |
| 02 | 들꽃 | 2.3 | 약 3.9 | ● 충족 | 4 | 제출 | – | |
| 03 | 노을 | 2.8 | 약 4.7 | ✕ 미충족 | 3 | 미제출 | – | 성적 하락 |
| 07 | 하늘 | 1.4 | 약 2.5 | ▲ 근접 | 6 | 제출 | – | |
| 11 | 구름 | 2.6 | 약 4.4 | ✕ 미충족 | 2 | 미제출 | – | |
| 16 | 봄비 | – | 성적 없음 | 자료 부족 | 2 | 미제출 | – | |
| 24 | 파도 | 1.8 | 약 3.1 | ▲ 근접 | 5 | 제출 | – | |
| 26 | 서리 | 3.0 | 약 5.0 | ✕ 미충족 | 3 | 미제출 | – | 성적 하락 |

- 위 6행(05~02)이 기본 프레임 표에 보이는 행이고, 아래 6행은 상태 프레임(거르기)에서 보여요. 환산 값은 5등급 평균을 A-1(검수 완료 규칙)로 옮긴 대표값이에요. 하늘의 범위 약 2.2~2.8은 학생 5 to 9 화면 값이고 이 표에는 대표값만 둬요.
- 5등급 평균 · 관심 대학 수 · 미제출 학생은 demo-dataset에 없는 값이라 모순되지 않게 정했어요(하늘 1.4는 dataset 값).
- 정렬: 경고 많은 순 → 같으면 번호 순.
- 숫자 타일: 학생 수 28명(성적 있음 27명) · 카드 제출 21명(미제출 7명) · 최저 미충족 5명(근접 3명은 따로) · 상담 필요 9명.
- 상담 필요 = 최저 근접 · 미충족, 카드 위험 경고, 성적 하락 신호가 하나 이상인 학생(05 · 15 · 18 · 22 · 03 · 07 · 11 · 24 · 26).
- 브리핑 3명 = 신호 수 많은 순 → 번호 순: 03 노을 · 15 바다 · 18 여울.
- 학급 코드 7Q4K(카드 수합 시안과 같음).

## 3. 모바일 390 × 844 — 보기 전용 요약

좌우 패딩 16px, 4열 그리드, 섹션 간격 24~32px. 프레임 안에서 `disclaimer-note`까지 보여야 해요. 넘치면 M5 학생 행을 3개로 줄여요.

### M1. 머리 줄 + sub-nav (56 + 44) [R8]
- 머리 줄 56: 왼쪽 `brand-logo` 폭 92, 오른쪽 icon/lock "잠금"(44×44, 자동 잠금이 켜져 있을 때만).
- `sub-nav`: 우리 반 홈(선택: {colors.ink} SemiBold + 아래 2px {colors.accent}) · 학생 기록 · 학생 상담.

### M2. 보기 전용 안내 띠 [P6]
- 흰 띠(Page 위, 선 없음, 높이 40, 좌우 16): icon/info + {typography.body-sm} "보기 전용이에요. PC에서 열면 전체 기능을 쓸 수 있어요."
- 아래 캡션 {typography.caption} {colors.text-muted}: "2학년 3반 · 학급 코드 7Q4K · 10월 모의고사 기준"

### M3. 숫자 타일 2×2 [P1]
`stat-tile` 4개, 각 흰 카드(선 없음), 칸 사이 8px. 보조 설명은 한 줄.

| 칸 | 라벨 | 값 ({typography.numeric}) | 보조 설명 |
|---|---|---|---|
| 왼쪽 위 | 학생 수 | 28명 | 2학년 3반 |
| 오른쪽 위 | 카드 제출 | 21명 | 미제출 7명 |
| 왼쪽 아래 | `judge-badge` ✕ 미충족(위험 쌍) | 5명 (잉크) | 수능 최저 · 근접 3명 따로 |
| 오른쪽 아래 | 상담 필요 | 9명 (Route Blue, 핵심 숫자) | 신호가 있는 학생 |

### M4. 우리 반 브리핑 [P2]
흰 카드 1장, 패딩 16.
- 머리 줄: {typography.heading-4} "우리 반 브리핑" + 오른쪽 `data-status-badge` "규칙으로 고름"
- 규칙 문장 {typography.body}: "먼저 볼 학생 3명 · 최저 근접 3명 · 카드 위험 경고 4명 · 성적 하락 2명"
- 규칙 설명 {typography.caption} {colors.text-muted}: "최저 근접 · 카드 위험 경고 · 성적 하락 신호가 많은 학생부터 골라요"
- `button-pill-soft` "먼저 볼 학생 보기 ›"(높이 44) → 390-brief-sheet

### M5. 학생 한눈에 [P6]
- {typography.heading-2} "학생 한눈에" + 오른쪽 캡션 "경고 많은 순"
- `student-row-card` 4행(05 햇살 · 15 바다 · 18 여울 · 22 은하), 행 높이 60, 행 구분 1px {colors.hairline}. 왼쪽 번호 {typography.title} 고정폭 + 별칭, 오른쪽 환산 "약 3.3" {typography.table} · 카드 칩 "제출/미제출"(흑백) · 경고 ▲ "경고 2"(소신 쌍). 경고가 없으면 자리를 비워요. 행을 누르면 학생 상담으로 가요.
- `button-pill-soft` "28명 전체 보기 ›"(폭 전체, 44) → 390-all-students

### M6. 고지
- `disclaimer-note`: "ⓘ 환산 9등급은 추정값이에요 · 수능 최저는 10월 모의고사 · 교사 입력 기준 충족 현황이에요 · 대학 공식 자료가 최종 기준이에요 · 학급 데이터는 이 기기에만 저장돼요 · 데이터 기준일 2026-11-18"
- 아래 여백 = 탭바 64 + 띄움 16 + 안전 영역.

### M7. 하단 탭바 [R8]
- `tab-bar-pill`: 우리 반(선택: {colors.accent} 아이콘 + {colors.ink} SemiBold) · 성적 관리 · 수합·집계 · 더보기.

## 4. PC 1440 × 900 — 전체 기능

앱 셸: 왼쪽 `sidebar` 248 + 본문 1192(좌우 패딩 32 → 콘텐츠 1128, 12열). 데이터 화면이라 폭을 모두 쓰고 블록 사이 24. 오른쪽 보조 패널 없음. 세로 예산은 승인 v2 프레임 그대로이고, 표는 머리글 고정 + 표 안 세로 스크롤로 나머지 22명을 담아요.

### P1. 사이드바 [R1 · R2]
- `brand-logo` 폭 124 → 교사 `sidebar-group` 3개(우리 반 ▾ 펼침) → `sidebar-item` 우리 반 홈(선택: {colors.accent-soft} + 왼쪽 3px {colors.accent} + {colors.ink}) · 학생 기록 · 학생 상담 → 캡션 "학생" + 학생 `sidebar-group` 4개 접힘.
- 맨 아래: 캡션 "데이터 기준일 2026-11-18" + `button-pill-soft` "백업" + "로그아웃"(icon/log-out).

### P2. `page-header` [R3]
- 왼쪽: 경로 → 제목 → 캡션(R3 문구).
- 오른쪽: `data-status-badge` "데이터 기준일 2026-11-18" · `button-outline` "학급 관리" · `mode-switch` 학생 · 교사(교사 선택) · `button-outline` "잠금"(icon/lock 16, 자동 잠금이 켜져 있을 때만).

### P3. 숫자 타일 4개 (한 줄, 각 3열) [P1]
`stat-tile` 4개, 흰 카드, 패딩 20. 라벨 → 값 → 보조 설명.

| 타일 | 라벨 | 값 ({typography.numeric}) | 보조 설명 |
|---|---|---|---|
| 1 | 학생 수 | 28명 | 2학년 3반 · 성적 있음 27명 |
| 2 | 카드 제출 | 21명 | 미제출 7명 · 상담카드 기준 |
| 3 | `judge-badge` ✕ 미충족(위험 쌍) | 5명 (잉크) | 1순위 목표 · 교사 입력 기준 · 근접 3명은 따로 세요 |
| 4 | 상담 필요 | 9명 (Route Blue — 화면의 유일한 파란 숫자) | 최저 근접·미충족 · 카드 경고 · 성적 하락 |

- 판정색은 배지 안에만, 숫자는 잉크. 타일 3을 누르면 "최저 미충족" 칩, 타일 4는 "상담 필요" 칩이 켜져요.

### P4. 우리 반 브리핑 (12열 전체) [P2]
흰 카드 1장, 패딩 20.
- 머리 줄: {typography.heading-3} "우리 반 브리핑" + `data-status-badge` "규칙으로 고름" + 오른쪽 `button-outline` "접기"(누르면 규칙 문장 한 줄만 남고 "펼치기"로 바뀌어요)
- 규칙 문장 · 규칙 설명은 모바일과 같고 설명 끝에 "같으면 번호 순이에요."
- 아래 3칸 가로(각 4열, 칸 사이 세로 1px {colors.hairline-soft}):

| 칸 | 번호 · 별칭 ({typography.title}) | 신호 배지(최대 2개) | 이유 한 줄 ({typography.body-sm}) | 동작 |
|---|---|---|---|---|
| 1 | 03 · 노을 | `judge-badge` ✕ 미충족 + `data-status-badge` "성적 하락" | 지난 학기보다 5등급 평균이 0.3 내려갔어요 | `button-pill-soft` "상담 화면 열기 ›" |
| 2 | 15 · 바다 | `judge-badge` ✕ 미충족 + ▲ 경고 2(소신 쌍) | 소신·위험 카드가 4장이라 조합 경고가 있어요 | 같음 |
| 3 | 18 · 여울 | `judge-badge` ▲ 근접(적정 쌍) + ▲ 경고 1(소신 쌍) | 국어가 1등급 오르면 1순위 최저를 충족해요 | 같음 |

### P5. 표 도구줄 [P4]
- 왼쪽 {typography.heading-2} "학생 한눈에"
- 가운데 `filter-chip` 3개: "전체 28"(on) · "최저 미충족 5" · "상담 필요 9"(off = {colors.canvas} 채움, Page 위). 칩 안 숫자는 잉크.
- 오른쪽 `button-outline` "성적 불러오기"(성적 불러오기 화면으로) · `button-outline` "엑셀 내보내기"(R9)

### P6. 학생 한눈에 표 [P3]
`data-table`(흰 카드 안), 행 44, 행 구분 1px {colors.hairline}, 머리글 {colors.canvas-soft} + {typography.table-head}, 본문 {typography.table} 고정폭, 첫 열 · 머리글 고정.

| 열 | 머리글 | 폭 | 정렬 | 내용 |
|---|---|---|---|---|
| 1 | 번호 | 72 | 가운데, 정렬 화살표 | 05 (미충족 행은 앞에 ✕) |
| 2 | 별칭 | 160 | 왼쪽 | 햇살 |
| 3 | 5등급 평균 | 112 | 오른쪽 | 2.0 |
| 4 | 환산 9등급 (추정) | 160 | 오른쪽, 정렬 화살표 | 약 3.3 / `data-status-badge` "성적 없음" |
| 5 | 수능 최저(1순위) | 160 | 왼쪽 | `judge-badge` compact ● 충족 / ▲ 근접 / ✕ 미충족 / 자료 부족 |
| 6 | 관심 대학 | 104 | 오른쪽 | 4 |
| 7 | 카드 | 112 | 가운데 | `data-status-badge` "제출" / "미제출" |
| 8 | 경고 | 나머지(약 248) | 왼쪽, 정렬 화살표(기본) | `judge-badge` ▲ 경고 2(소신 쌍) / 없으면 "–" {colors.text-muted} |

- 행 6개 = 2장 위 6행. 행을 누르면 학생 상담으로 가요. 마우스를 올린 행은 Elevation 3(1px {colors.ink} 안쪽 테두리).
- 표 아래 오른쪽 캡션 {colors.text-muted} "28명 중 6명 보는 중 · 표 안에서 스크롤해요"
- 판정 칸은 배지 이름 글자가 그대로 읽혀요(아이콘은 장식 처리).

### P7. 고지 (12열 전체, 본문 맨 아래)
- `disclaimer-note`: "ⓘ 5등급 평균은 불러온 학기 평균의 단순 평균이에요 · 환산 9등급은 추정값이에요 · 수능 최저는 10월 모의고사 · 교사 입력 기준 충족 현황이에요 · 카드 경고는 학생이 카드를 보낸 때 기준이에요 · 대학 공식 자료가 최종 기준이에요 · 학급 데이터는 이 기기에만 저장돼요 · 데이터 기준일 2026-11-18"
- 앱 화면이라 `footer`는 두지 않아요.

## 5. 상태 프레임 (34장, 03-draft.json states 목록에만)

모두 1440×900 또는 390×844. 이름은 teacher-dashboard/<폭>-<상태>. 기본 프레임(0장 바로잡은 뒤 모양)을 복제해 바뀌는 곳만 고쳐요. 출처 "앱" = 앱에 있는 상태 · 팝업, "새" = 앱에 없는 안전장치 · 완료 알림(디자인으로 넣고 구현은 8장 메모로 넘김).

### 5-1. PC 1440 (26장)

| 프레임 | 출처 | 그릴 것 |
|---|---|---|
| teacher-dashboard/1440-loading | 앱 | 사이드바 · `page-header`(캡션 없음) 그대로, 본문 자리에 "학급 데이터를 읽고 있어요." {typography.body-sm} {colors.text-muted} 한 줄만. 타일 · 브리핑 · 표 없음 |
| teacher-dashboard/1440-error | 앱 | 본문 맨 위 흰 카드 안 화면 오류 줄: icon/triangle-alert 20 {colors.ink} + "학급 데이터를 읽지 못했어요. 다시 읽어 주세요." {typography.body} + `button-outline` "다시 읽기". 판정 색 없음 |
| teacher-dashboard/1440-welcome | 앱 | 학급이 없을 때(R11). `page-header` 캡션 없음, 오른쪽은 기준일 배지 · `mode-switch`만. 본문: 흰 카드 안 `empty-state` — 흑백 선 아이콘 icon/users → {typography.heading-4} "우리 반 시작하기" → {typography.body-sm} "반 이름과 번호·별칭 명단만 준비해 주세요. 학급을 만들면 학생 자료와 상담 기록을 한곳에 모을 수 있어요." → `button-primary` "+ 학급 만들기"(44) → 캡션 "새 학급은 이 기기에 저장돼요." 아래 흰 카드 2장 나란히(각 6열): ① "준비할 정보" {typography.heading-4} — 반 이름 / 예: 2학년 3반 · 번호·별칭 명단 / 입력 예시: 1 새벽 / 2 들꽃 / 3 노을 · 캡션 "한 줄에 한 명씩, 실명 대신 별칭을 적어요." ② "학급을 만든 다음에는" — 01 학급 코드 안내 "만든 학급 코드를 학생에게 알려 주세요." · 02 학생 자료 모으기 "학생이 전달한 .jnavi 파일 또는 QR을 불러와요." · 03 상담 기록 "학생별 성적·지원 계획을 보며 상담을 남겨요."(번호 {typography.caption} 고정폭). 맨 아래 `disclaimer-note` |
| teacher-dashboard/1440-welcome-restore | 앱 | 1440-welcome 맨 위(`empty-state` 카드 위)에 흰 카드 하나: {typography.body-sm} "서버에 저장한 학급이 있어요." + 단일 선택 목록 행 1개(높이 40, 행 사이 1px {colors.hairline-soft}): {typography.title} "2학년 3반 불러오기" + {typography.body-sm} {colors.text-muted} "학급 코드 7Q4K · 2026-11-19 17:40 저장" + 오른쪽 ›. 누르면 바로 불러오고(이 기기에 학급이 없어 지워질 것이 없음) `toast` "2학년 3반을 불러왔어요" |
| teacher-dashboard/1440-class-new | 앱 | 1440-welcome 위 {colors.scrim} + `modal` 560(패딩 24): 제목 {typography.heading-3} "학급 만들기" + 닫기 ✕(32) → 라벨 "반 이름" + `text-input` 값 "2학년 3반" → 라벨 "명단(한 줄에 한 명 · 번호 별칭)" + `text-input` 변형 multiline 8줄 208, 값 "1 새벽 / 2 들꽃 / 3 노을 / 4 단비 / 5 햇살 / 6 바람 / 7 하늘 / 8 이슬"(한 줄씩, 칸 안 스크롤) + 오른쪽 아래 바깥 캡션 "28명" 고정폭 → 캡션 "실명 대신 별칭을 써요. 학급 데이터는 이 기기에만 저장돼요." → 아래 오른쪽 `button-outline` "닫기" · `button-primary` "학급 만들기" |
| teacher-dashboard/1440-class-new-error | 앱 | 1440-class-new에서 "학급 만들기"를 눌렀는데 명단 3번째 줄이 "3 노을노을노을노을노을"(11자)일 때: 명단 칸 `text-input-error` + 아래 icon/triangle-alert 14 + "3번째 줄: 별칭을 1~10자로 적어 주세요. 실명 대신 별칭을 써요." 창은 닫히지 않아요. 다른 오류(문구만, 같은 모양): 반 이름 칸 "반 이름을 1~20자로 적어 주세요. 예: 2학년 3반" · 명단 칸 "n번째 줄: 번호는 1~99 숫자로 적어 주세요." · "7번이 두 번 있어요." · "명단을 한 줄 이상 적어 주세요." |
| teacher-dashboard/1440-class-new-leave | 새 | 1440-class-new에서 내용을 적은 뒤 "닫기": 만들기 창 위 {colors.scrim} 한 겹 더 + 확인 `modal` 560 "학급을 만들지 않고 닫을까요?" / "적은 반 이름과 명단 28명이 사라져요." / `button-outline` "계속 적기" · `button-primary` "닫기" |
| teacher-dashboard/1440-class-created | 새 | 학급을 막 만든 뒤(성적 · 카드 없음): 캡션 "2학년 3반 · 28명 · 학급 코드 7Q4K — 학생에게 이 코드를 알려 주세요". 타일 28명 "성적 있음 0명" · 0명 "미제출 28명 · 상담카드 기준" · ✕ 미충족 "–" "모의고사 성적을 불러오면 보여요" · 상담 필요 0명(Route Blue 그대로). 브리핑 카드 = 머리 줄 + 가운데 {colors.text-muted} 한 줄 "지금 먼저 챙길 학생이 없어요"(3칸 없음). 칩 "전체 28" · "최저 미충족 0" · "상담 필요 0". 표 위 한 줄 {typography.body-sm} "아직 성적과 상담카드가 없어요 — 성적 불러오기 · 카드 수합을 하면 채워져요", 표 28행은 번호 · 별칭만 있고 나머지 칸 "–" {colors.text-muted}(같은 배지를 칸마다 반복하지 않음). 오른쪽 아래 `toast` "2학년 3반을 만들었어요 · 학급 코드 7Q4K" |
| teacher-dashboard/1440-no-mock | 앱 | 모의고사 성적(또는 교사 입력 최저 기준)이 없을 때: 타일 3 값 "–", 보조 "모의고사 성적을 불러오면 보여요". 칩 "최저 미충족"은 숨겨요. 브리핑 문장 "먼저 볼 학생 3명 · 카드 위험 경고 4명 · 성적 하락 2명", 3칸은 15 바다 · 22 은하 · 03 노을(최저 배지 없이 경고 · 성적 하락만). 표 5열 머리글 옆 캡션 "모의고사 성적이 없어요", 칸은 모두 "–"(28칸 반복 배지 대신). 기준이 없어서일 때 타일 보조 문구는 "수능 최저 기준이 없어 세지 않아요 · 수능 최저 판정에서 넣어요" |
| teacher-dashboard/1440-brief-empty | 앱 | 신호 있는 학생이 0명일 때: 브리핑 카드 = 머리 줄 + 가운데 {colors.text-muted} 한 줄 "지금 먼저 챙길 학생이 없어요", 3칸 · "접기" 없음. 타일 4 "0명", 칩 "상담 필요 0". 나머지 기본과 같음 [P7] |
| teacher-dashboard/1440-filter-minimum | 앱 | 타일 3을 눌렀거나 칩 "최저 미충족 5" on(accent-soft + 1px {colors.accent}), "전체 28" off. 표 5행: 15 바다 · 22 은하(경고 순) → 03 노을 · 11 구름 · 26 서리(번호 순), 모든 행 번호 앞 ✕. 캡션 "28명 중 5명 보는 중" |
| teacher-dashboard/1440-filter-counsel | 앱 | 칩 "상담 필요 9" on. 표 9행(6행 보이고 표 안 스크롤): 05 햇살 · 15 바다 · 18 여울 · 22 은하 · 03 노을 · 07 하늘 · 11 구름 · 24 파도 · 26 서리. 경고 열 옆에 "신호" 없음(열 추가 안 함), 캡션 "28명 중 9명 보는 중 · 표 안에서 스크롤해요" |
| teacher-dashboard/1440-filter0 | 앱 | 1440-class-created에서 칩 "상담 필요 0" on: 표 머리 아래 한 행 가운데 {typography.body-sm} "해당하는 학생이 없어요 · ‘전체’를 누르면 모두 보여요" + `button-outline` "전체 보기"(높이 32). `toast` 없음 [P7] |
| teacher-dashboard/1440-export-toast | 새 | "엑셀 내보내기"를 누른 뒤(확인 창 없음, R9): 화면은 기본과 같고 오른쪽 아래(가장자리 24) `toast` "우리 반 표를 xlsx 파일로 저장했어요 · 28명". 칩이 켜져 있으면 "· 5명"처럼 보는 행 수 |
| teacher-dashboard/1440-class-manage | 앱 | "학급 관리"를 누른 뒤 {colors.scrim} + `modal` 560(높이 최대 80%, 본문만 스크롤): 제목 "학급 관리" + 닫기 ✕ → {typography.body-sm} "학급 코드 7Q4K · 만든 날 2026-03-04" → {typography.heading-4} "서버 보관" + 캡션 "U고등학교 · 담임 · 아이디 class23" + `button-outline` 3개 "서버에 저장" · "서버에서 불러오기" · "로그아웃" → {typography.heading-4} "자동 잠금" + 캡션 "꺼져 있어요. 잠금 번호를 정하면 쓰지 않을 때 교사 화면을 잠가요. 화면 잠금이라 기기 자체의 잠금도 함께 써 주세요." + 라벨 "잠금 번호(숫자 4~8자리)" `text-input` 빈 값 · "잠금 번호 확인" `text-input` · "잠그기까지" `text-input` 변형 select "10분"(누르면 칸 아래 떠 있는 목록 5분 · 10분 · 30분) + `button-outline` "자동 잠금 켜기" → 위 1px {colors.hairline-soft} 아래 `button-danger-text` "이 기기에서 학급 데이터 지우기" → 아래 고정 줄 `button-outline` "닫기". 로그인 전이면 "서버 보관" 자리에 {typography.body-sm} "로그인하면 학급 데이터를 서버에 보관하고 다른 기기에서 이어 쓸 수 있어요." + 링크 "로그인 ›"({colors.accent}) |
| teacher-dashboard/1440-lock-error | 앱 | 1440-class-manage에서 잠금 번호 "1234", 확인 "1243"으로 "자동 잠금 켜기": 확인 칸 `text-input-error` + "두 번 입력한 잠금 번호가 달라요." 다른 오류(문구만): 잠금 번호 칸 "잠금 번호는 숫자 4~8자리로 정해 주세요." |
| teacher-dashboard/1440-lock-on | 앱 | 켠 뒤: 자동 잠금 캡션 "켜져 있어요 · 10분 동안 쓰지 않으면 잠가요." + 입력칸 빈 값 + `button-outline` "잠금 번호 바꾸기" · "자동 잠금 끄기". 뒤 `page-header`에 잠금 버튼이 생겨요. 오른쪽 아래 `toast` "자동 잠금을 켰어요 · 10분" |
| teacher-dashboard/1440-lock-off-confirm | 새 | "자동 잠금 끄기" → 학급 관리 창 위 {colors.scrim} 한 겹 더 + 확인 `modal` 560 "자동 잠금을 끌까요?" / "끄면 자리를 비워도 교사 화면이 잠기지 않아요. 정한 잠금 번호도 지워져요." / "취소" · "자동 잠금 끄기". 끈 뒤 `toast` "자동 잠금을 껐어요" |
| teacher-dashboard/1440-server-save-confirm | 새 | "서버에 저장" → 확인 `modal` 560 "서버에 저장할까요?" / "서버의 2026-11-19 17:40 저장본을 지금 이 기기의 학급 데이터(명단·카드·메모·성적)로 바꿔요." / "취소" · "서버에 저장" |
| teacher-dashboard/1440-server-saved | 새 | 저장 뒤: 학급 관리 창 그대로 + "서버 보관" 캡션 아래 {typography.caption} {colors.text-muted} "마지막 서버 저장 2026-11-20 17:40" + 오른쪽 아래 `toast` "서버에 저장했어요 · 2026-11-20 17:40" |
| teacher-dashboard/1440-server-error | 앱 | 저장 실패: "서버 보관" 버튼 줄 아래 화면 오류 줄(icon/triangle-alert 20 {colors.ink} + "서버에 저장하지 못했어요. 잠시 후 다시 시도해 주세요." + `button-outline` "다시 저장"). `toast` 없음. 같은 모양 문구: "서버의 학급 목록을 읽지 못했어요." · "서버에서 학급을 읽지 못했어요." |
| teacher-dashboard/1440-server-load-confirm | 앱 | "서버에서 불러오기" → 버튼 줄 아래 단일 선택 목록 1행("2학년 3반" + "학급 코드 7Q4K · 2026-11-19 17:40 저장"), 그 행을 누른 뒤 {colors.scrim} 한 겹 더 + 확인 `modal` 560 "2학년 3반을 불러올까요?" / "이 기기의 학급 데이터(명단·카드·메모·성적)를 2026-11-19 17:40에 서버에 저장한 내용으로 바꿔요. 이 기기에서 그 뒤에 고친 내용은 사라져요." / "취소" · "바꿔서 불러오기". 불러온 뒤 `toast` "2학년 3반을 불러왔어요". 서버에 학급이 없으면 목록 자리에 "서버에 저장한 학급이 없어요." {colors.text-muted} |
| teacher-dashboard/1440-clear-confirm | 앱 | `button-danger-text`를 누른 뒤 확인 `modal` 560 "학급 데이터를 지울까요?" / "2학년 3반 명단·받은 카드·상담 메모·성적을 이 기기에서 모두 지워요. 자동 잠금도 꺼져요. 되돌릴 수 없어요." / "취소" · "모두 지우기"(잉크 채움, 위험 색 채움 없음). 기본 초점 "취소" |
| teacher-dashboard/1440-cleared | 새 | 지운 뒤: 1440-welcome 화면 + 오른쪽 아래 `toast` "이 기기에서 학급 데이터를 지웠어요" |
| teacher-dashboard/1440-locked | 앱 | 자동 잠금 시간이 지났을 때: 사이드바 · 표를 모두 가리고 화면 전체 {colors.canvas-soft} 위 가운데 `lock-screen` 흰 카드(폭 400, 패딩 32, 그림자 없음): icon/lock 32 → {typography.heading-3} "교사 화면이 잠겼어요" → {typography.body-sm} {colors.text-muted} "10분 동안 쓰지 않아 잠갔어요. 학급 데이터를 보려면 잠금 번호를 입력해 주세요." → 라벨 "잠금 번호" + `text-input` 값 "●●●●" → `button-primary` "잠금 풀기"(폭 전체 44, 비어 있으면 비활성) → 캡션 "학급 데이터는 이 기기에만 암호화해서 저장돼요 · 잠금 번호를 잊었으면 이 기기의 학급 데이터를 지우고 다시 만들어야 해요." |
| teacher-dashboard/1440-locked-error | 앱 | 1440-locked에서 틀린 번호: 입력칸 `text-input-error` + "잠금 번호가 달라요. 다시 입력해 주세요." 입력값은 비워요 |

PC 문구만(프레임 없음): 브리핑 "접기"를 누르면 3칸이 접히고 버튼이 "펼치기"로 바뀌어요 · 정렬 화살표를 누르면 그 열 오름차순 ↑ / 내림차순 ↓, 다른 열 화살표는 {colors.text-muted} · "잠그기까지" 떠 있는 목록(고른 행 = Elevation Selected + 오른쪽 icon/check {colors.accent}).

### 5-2. 모바일 390 (8장)

| 프레임 | 출처 | 그릴 것 |
|---|---|---|
| teacher-dashboard/390-loading | 앱 | 머리 줄 · `sub-nav` · 탭바 그대로, 본문에 "학급 데이터를 읽고 있어요." 한 줄 |
| teacher-dashboard/390-error | 앱 | 흰 카드 화면 오류 줄(1440-error와 같은 문구) + `button-outline` "다시 읽기"(높이 44) |
| teacher-dashboard/390-welcome | 앱 | 학급이 없을 때: M2 안내 띠 → 흰 카드 `empty-state` 아이콘 icon/users → "우리 반 시작하기" → "반 이름과 번호·별칭 명단만 준비해 주세요." → 캡션 "학급 만들기는 PC에서 해요. 만든 PC에서 이 화면을 열면 우리 반 요약을 볼 수 있어요." 버튼 없음(보기 전용) → `disclaimer-note` → 탭바 |
| teacher-dashboard/390-no-mock | 앱 | 타일 3 값 "–" + "모의고사 성적을 불러오면 보여요", 브리핑 문장 "먼저 볼 학생 3명 · 카드 위험 경고 4명 · 성적 하락 2명", 학생 행은 그대로(최저 배지는 원래 행에 없음) |
| teacher-dashboard/390-brief-sheet | 앱 | "먼저 볼 학생 보기" 뒤 {colors.scrim} + `bottom-sheet`(손잡이, 높이 약 60%): 제목 {typography.heading-4} "먼저 볼 학생 3명" + `data-status-badge` "규칙으로 고름" → 3행(PC P4 표와 같은 학생 · 배지 · 이유, 행마다 오른쪽 › = 학생 상담으로) → 아래 `button-outline` "닫기"(폭 전체 44). 편집 동작 없음 |
| teacher-dashboard/390-brief-empty | 앱 | 브리핑 카드 안 가운데 {colors.text-muted} "지금 먼저 챙길 학생이 없어요", 버튼 없음. 타일 4 "0명" |
| teacher-dashboard/390-all-students | 앱 | "28명 전체 보기"를 누른 뒤 같은 화면에서 목록이 펼쳐진 모양으로 스크롤: 화면 위쪽 = "학생 한눈에" 머리 + `student-row-card` 05 햇살 · 15 바다 · 18 여울 · 22 은하 · 01 새벽 · 02 들꽃 · 03 노을 · 04 단비 · 06 바람(9행 보임) + 캡션 "28명 · 경고 많은 순", 맨 끝 `button-pill-soft` "접기"는 화면 밖. 탭바는 그대로 떠 있어요 |
| teacher-dashboard/390-locked | 앱 | 머리 줄 · sub-nav · 내용 · 탭바를 모두 가리고 {colors.canvas-soft} 위 가운데 `lock-screen`(폭 358, 1440-locked 문구 그대로), `text-input` 높이 48, `button-primary` "잠금 풀기" 높이 52. 틀린 번호 모양은 1440-locked-error와 같아요(프레임 없음) |

학급 만들기 · 학급 관리 · 내보내기 · 거르기는 PC에만 있어요(보기 전용, design.md Responsive Strategy). 그래서 그 상태의 390 프레임은 그리지 않아요.

03-draft.json states 예정 목록(34, 이 순서): 1440-loading · 1440-error · 1440-welcome · 1440-welcome-restore · 1440-class-new · 1440-class-new-error · 1440-class-new-leave · 1440-class-created · 1440-no-mock · 1440-brief-empty · 1440-filter-minimum · 1440-filter-counsel · 1440-filter0 · 1440-export-toast · 1440-class-manage · 1440-lock-error · 1440-lock-on · 1440-lock-off-confirm · 1440-server-save-confirm · 1440-server-saved · 1440-server-error · 1440-server-load-confirm · 1440-clear-confirm · 1440-cleared · 1440-locked · 1440-locked-error · 390-loading · 390-error · 390-welcome · 390-no-mock · 390-brief-sheet · 390-brief-empty · 390-all-students · 390-locked (모두 앞에 "teacher-dashboard/").

## 6. 문구 모음

| 위치 | 문구 |
|---|---|
| 모바일 안내 | 보기 전용이에요. PC에서 열면 전체 기능을 쓸 수 있어요. |
| 학급 코드 | 학급 코드 7Q4K — 학생에게 이 코드를 알려 주세요 |
| 학급 시작 | 우리 반 시작하기 / 반 이름과 번호·별칭 명단만 준비해 주세요. / 새 학급은 이 기기에 저장돼요. |
| 불러오는 중 · 오류 | 학급 데이터를 읽고 있어요. / 학급 데이터를 읽지 못했어요. 다시 읽어 주세요. |
| 빈 결과 | 지금 먼저 챙길 학생이 없어요 / 해당하는 학생이 없어요 · ‘전체’를 누르면 모두 보여요 / 아직 성적과 상담카드가 없어요 — 성적 불러오기 · 카드 수합을 하면 채워져요 |
| 확인 창 | 학급을 만들지 않고 닫을까요? / 자동 잠금을 끌까요? / 서버에 저장할까요? / 2학년 3반을 불러올까요? / 학급 데이터를 지울까요? |
| 완료 toast | 2학년 3반을 만들었어요 · 학급 코드 7Q4K / 우리 반 표를 xlsx 파일로 저장했어요 · 28명 / 자동 잠금을 켰어요 · 10분 / 자동 잠금을 껐어요 / 서버에 저장했어요 · 2026-11-20 17:40 / 2학년 3반을 불러왔어요 / 이 기기에서 학급 데이터를 지웠어요 |
| 잠금 | 교사 화면이 잠겼어요 / 잠금 번호가 달라요. 다시 입력해 주세요. |

- 모두 해요체. 결과를 약속하는 말은 쓰지 않아요(NEVER-2). 오류는 무엇이 틀렸고 어떻게 고치는지 함께 써요.

## 7. 사용 컴포넌트

`brand-logo`, `sidebar`, `sidebar-group`, `sidebar-item`, `page-header`, `sub-nav`, `tab-bar-pill`, `mode-switch`, `stat-tile`, `judge-badge`, `data-status-badge`, `button-pill-soft`, `button-outline`, `button-primary`, `button-danger-text`, `filter-chip`, `data-table`, `student-row-card`, `empty-state`, `disclaimer-note`, `bottom-sheet`, `modal`, `toast`, `text-input`, `text-input-error`, `lock-screen`

- 컴포넌트 없이 그리는 것: 보기 전용 안내 띠(흰 띠 + icon/info), 우리 반 브리핑 카드(흰 카드 + 배지 · 버튼 조합), 학급 시작의 "준비할 정보" · "학급을 만든 다음에는" 카드(흰 카드 + 글자), 서버 학급 목록 행(design.md 단일 선택 목록 모양).

## 8. 디자이너 메모

- 색이 나오는 곳: 판정(`judge-badge`, 미충족 행 앞 ✕) = 판정 색 쌍 / 선택 · 링크 · 핵심 숫자 1개 = Route Blue / 입력 오류 = 위험 글자색. 타일 숫자 · 칩 숫자 · `toast` · 확인 창 · 빈 상태 · 화면 오류 줄 · `lock-screen`에는 판정 색을 쓰지 않아요.
- 그림자는 `modal` · `bottom-sheet` · `toast`에만, 노드 이름을 정확히 "modal" · "bottom-sheet" · "toast"로 지어요(J6). `lock-screen` 카드는 그림자 없음. 모서리 전부 0, 원형은 ● 판정 아이콘만 ELLIPSE.
- 파란색 위치 점검: 선택된 sidebar-item · mode-switch 교사 칸 · sub-nav 막대 · 탭바 우리 반 아이콘 · 켜진 filter-chip · "9명" · 텍스트 링크 · 떠 있는 목록의 고른 행 체크. 그 밖에는 없어야 해요.
- 글꼴 Pretendard(없으면 IBM Plex Sans KR), 굵기 300/400/600/700, 자간 0, 숫자 고정폭.
- **이번 상세화 그리는 순서**(Figma 호출 한도 때문에 정해 둬요):
  ① 기본 2장에 0장 R1~R10 반영(로고 · 사이드바 · page-header · 학급 관리 버튼 · ▲✕ · 바탕 · compact 판정 · 환산 대표값 · 모바일 머리/sub-nav/탭바 · 예시 값) — 상태 프레임이 이걸 복제하니 먼저 끝내요.
  ② 공통 오버레이 틀 3개를 한 장씩: 1440-class-manage(긴 `modal`) → 1440-clear-confirm(확인 `modal` 560) → 1440-export-toast(`toast`). 나머지 모달 · toast 프레임은 이 셋을 복제해요.
  ③ 학급 관리 파생: lock-error → lock-on → lock-off-confirm → server-save-confirm → server-saved → server-error → server-load-confirm → cleared(1440-welcome이 먼저 있어야 하니 ⑤ 뒤로 미뤄도 돼요).
  ④ 표 · 브리핑 상태: filter-minimum → filter-counsel → brief-empty → no-mock.
  ⑤ 학급 시작 흐름: 1440-welcome → welcome-restore → class-new → class-new-error → class-new-leave → class-created → filter0 → cleared.
  ⑥ 화면 단위 상태: 1440-loading → 1440-error → 1440-locked → 1440-locked-error.
  ⑦ 모바일 8장: 390-brief-sheet → 390-brief-empty → 390-all-students → 390-no-mock → 390-welcome → 390-loading → 390-error → 390-locked.
- 03-draft.json에 5장 끝의 states 예정 목록 34장을 적고, frames에는 기본 2장만 둬요(G3는 frames만 세요).
- 구현 메모(디자인 범위 밖, 오케스트레이터 전달용): ① 앱 표는 학생 · 5등급 평균 · 환산 · 카드 · 경고 5열이에요 — 시안은 번호/별칭 분리 + 수능 최저 · 관심 대학 열이 더 있어요 ② 앱에는 filter-chip · 엑셀 내보내기 · 브리핑 접기가 없어요 ③ 앱 최저 미충족 타일은 늘 "–"(검수된 기준 없음)이고 브리핑에 최저 근접 신호가 없어요 — 교사 입력 기준(수능 최저 판정)과 이어야 해요 ④ 학급 관리는 앱에서 화면 맨 아래 접힘 영역이에요 — 시안은 page-header "학급 관리" 버튼 → 모달 ⑤ 학급 만들기 닫기 확인 · 자동 잠금 끄기 확인 · 서버 저장 확인 창, 만들기 · 내보내기 · 잠금 켜기/끄기 · 서버 저장/불러오기 · 지우기 toast가 앱에 없어요(앱은 창 안 한 줄 메시지) ⑥ 앱 오류는 창 아래 한 줄이에요 — 시안은 해당 칸 아래 `text-input-error` ⑦ 앱 "학급 데이터 지우기"는 outline 버튼이에요 — 시안은 `button-danger-text` ⑧ 앱은 모바일에서도 학급 만들기가 돼요 — 시안은 보기 전용이라 PC 안내만.

## 9. design.md 수정 제안 (사용자 확인 후 반영 — planner는 design.md · rules를 고치지 않아요)

1. **stat-tile "같은 무게 타일 3개 이상 금지"와 승인 시안의 4타일.** 승인 v2 시안은 같은 무게 타일 4개이고, 타일 3 · 4를 누르면 아래 표 칩이 켜져요. 둘 중 하나로 정해 주세요: (가) 우리 반 홈 타일을 stat-tile 변형 filter로 보고 칩 줄을 없애기 (나) 교사 대시보드 4타일은 예외라고 한 줄 추가.
   - 대체안(지금 시안): 승인 시안 그대로 4타일 + filter-chip 줄. 상태 프레임도 이 모양으로 그려요.
2. **lock-screen에 자동 잠금 규칙 추가.** 지금 design.md는 "교사로 바꾸면 lock-screen이 먼저"만 있어요. 앱은 학급 관리에서 잠금 번호(숫자 4~8자리) · 잠그기까지(5 · 10 · 30분)를 정하고, 시간이 지나면 화면 전체를 가리는 잠금이에요. 제안 문장: "자동 잠금: 정한 시간 동안 쓰지 않으면 앱 셸 전체를 {colors.canvas-soft}로 가리고 가운데 lock-screen 카드(제목 · 이유 한 줄 · 잠금 번호 text-input · 잠금 풀기 · 잊었을 때 안내 캡션). 잠금 번호 설정은 text-input 2칸 + select."
   - 대체안(지금 시안): 1440-locked · 390-locked를 기존 `lock-screen` + `text-input`으로, 설정은 `modal` 안 `text-input` · 변형 select로 그려요.
3. **확인 창 대상에 "서버에 저장 · 서버에서 불러오기" 명시.** 지금 문장은 "내보내기 전에"라서 학급 묶음을 서버로 보내는 저장이 들어가는지 애매해요. 제안: 확인 창 문장에 "서버 저장본을 바꾸는 저장 · 이 기기 데이터를 바꾸는 불러오기"를 더해요.
   - 대체안(지금 시안): 1440-server-save-confirm · 1440-server-load-confirm을 확인 `modal` 560으로 그려요.
4. **empty-state 변형 setup(선택).** 학급 시작 화면은 `empty-state` 한 개로 담기에 정보가 많아요(준비할 정보 · 다음 단계). 다른 교사 화면에도 같은 시작 안내가 생기면 "empty-state + 보조 카드 2장" 묶음을 변형으로 올릴지 정해 주세요.
   - 대체안(지금 시안): `empty-state` 카드 + 흰 카드 2장으로 그려요(새 부품 없음).
