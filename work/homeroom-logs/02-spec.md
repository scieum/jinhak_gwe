# 02-spec — 누가기록 (homeroom-logs, 교사)

> 근거: PRD 6-12 담임 기록 "누가기록: 영역(자율·자치 / 진로)과 날짜를 고르고 여러 학생에게 한 번에 관찰 기록을 남기는 보드, 학생별 기록 수" · PRD 7-3(교사 기기에만 암호화 저장) · PRD 13장(실행 중 AI 호출 없음)
> 참고 원본: work/_ref/schs_lms-homeroom.md 2-4, 3(e) "조각 모으기"
> design.md App Shell · Elevation(Selected) · Components (2026-11-18, 모서리 0)
> 01-research.md 반영 포인트 P1~P7
> 필수 컴포넌트: 이 화면은 requires 목록에 없어요. 환산·판정 숫자가 없어서 산출 근거·고지 블록은 두지 않아요.

## 공통 원칙

- 바탕은 흰 캔버스, 구조는 옅은 회색 단계와 1px 선으로 나눠요. 모든 모서리 0, 그림자 없음(떠 있는 레이어 제외).
- 흐름은 하나예요: 영역 고르기 → 날짜 고르기 → 기록 쓰기 → 학생 고르기 → "n명에게 기록 남기기". 같은 날 같은 글은 고른 학생 모두에게 같은 기록 하나로 남아요.
- 체크박스 컴포넌트가 없어서 학생 선택은 선택 행으로 표시해요: {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + 행 맨 왼쪽 체크 아이콘(icon/check, 잉크). 색만으로 선택을 알리지 않도록 체크 아이콘을 같이 둬요. 고르지 않은 행은 흰 바탕, 체크 자리는 비워 둬요.
- Route Blue는 선택 표시(영역 세그먼트, 고른 날짜, 선택 행, 사이드바 선택 메뉴)에만 써요. 기록 수·날짜 같은 숫자는 모두 잉크 고정폭 숫자예요. 이 화면에는 Route Blue 숫자가 없어요.
- 판정 색은 쓰지 않아요. 영역 구분(자율·자치 / 진로)도 흑백 글자로만 해요.
- 주요 버튼(`button-primary`, 잉크 채움)은 화면에 하나뿐이에요: "n명에게 기록 남기기". 고른 학생이 0명이거나 기록 칸이 비어 있으면 비활성({colors.canvas-soft} 채움 + {colors.text-faint} 글자, 문구 "학생을 골라 주세요" 또는 "기록을 적어 주세요").
- 학생은 번호·별칭(학생A, 학생B …)만, 기록 문장은 모두 가상이에요. 실명·학교명은 쓰지 않아요. AI 기능이 없어서 AI 라벨도 두지 않아요.
- 시안 기준 상태: 영역 "자율·자치", 날짜 11-18(수, 오늘), 학생 3명 선택(3번 학생C, 7번 학생G, 12번 학생L), 기록 칸에 문장 입력됨, 우리 반 25명.

---

## 모바일 390 × 844

위에서 아래 순서예요. 좌우 패딩 16px(콘텐츠 358px), 섹션 간격 24px. 교사 화면이라 하단 탭바 대신 하단 고정 버튼 줄을 둬요(메뉴에서 들어오는 하위 화면, 뒤로가기로 나가요).

### M1. 상단 앱바 (56px)

- 왼쪽 뒤로가기(icon/chevron-left, 터치 44×44), 가운데 제목 {typography.heading-4} "누가기록".
- 오른쪽 보조: {typography.caption} 잉크 고정폭 "오늘 4건" (오늘 남긴 기록 수, 원본의 "오늘 n").

### M2. 영역 고르기 [P4]

- `segmented-control` 2칸, 폭 358, 높이 44: "자율·자치"(선택: {colors.accent-soft} 채움 + 아래 2px {colors.accent} 막대 + 잉크 SemiBold) | "진로"({colors.text-muted}).

### M3. 날짜 줄 [P4]

- 머리 한 줄: 왼쪽 {typography.title} "11월 3주" + 오른쪽 `button-pill-soft` "오늘"(높이 32) + 이전·다음 주 아이콘 버튼(icon/chevron-left, icon/chevron-right, 터치 44×44).
- 아래 7칸 날짜 줄(칸 폭 약 51, 높이 56): 요일 {typography.caption} {colors.text-muted} 위, 날짜 숫자 {typography.title} 고정폭 아래. 월 16 · 화 17 · 수 18 · 목 19 · 금 20 · 토 21 · 일 22.
- 고른 날짜(18)는 {colors.accent-soft} 채움 + 아래 2px {colors.accent} 막대 + 잉크 Bold. 다른 날짜는 흰 바탕 잉크 글자, 오늘 이후 날짜(19~22)는 {colors.text-faint}로 비활성.
- 날짜 머리를 누르면 `bottom-sheet`로 월 달력이 열려요(시안 프레임에는 그리지 않아요).

### M4. 기록 쓰기 [P5]

- 라벨 {typography.label} 잉크 "관찰 기록".
- `text-input` 여러 줄, 폭 358, 높이 96, {colors.field} 채움, 평소 테두리 없음(포커스 때만 2px 잉크 링 = `text-input-focused`).
  - 안내 문구({colors.text-faint}): "관찰한 내용을 한두 문장으로 적어 주세요"
  - 시안 입력값(가상): "학급 회의에서 체육대회 역할 분담안을 정리해 친구들 앞에서 설명함."
- 아래 보조 문구 {typography.caption} {colors.text-muted}: "고른 학생 모두에게 같은 기록이 남아요."

> 순서 메모: 01-research P5는 모바일 입력칸을 학생 목록 아래에 두라고 했지만, 844 프레임 안에서 입력칸과 선택 상태를 함께 보이게 하려고 목록 위로 올렸어요. 버튼은 P1대로 하단 고정이에요.

### M5. 학생 선택 머리 [P1, P2]

- 첫 줄: 왼쪽 {typography.title} 잉크 "3명 선택" + {typography.caption} {colors.text-muted} " · 25명 중", 오른쪽 `button-pill-soft` "전체 선택"(모두 고르면 "선택 해제"로 바뀜, 높이 32, 터치 44).
- 둘째 줄: 정렬 `segmented-control` 작은 크기(높이 32, 폭 180) "적은 순 | 번호 순", "적은 순" 선택. 적은 순 = 지금 고른 영역의 기록 수가 적은 학생부터.

### M6. 학생 목록 [P2, P3]

- `student-row-card` 세로 목록, 행 높이 56, 행 사이 1px {colors.hairline}. 프레임 안에는 5행이 보여요.
- 행 구성: 맨 왼쪽 체크 자리 24 → 번호 고정폭 + 별칭 {typography.title} → 아래 줄 {typography.caption} {colors.text-muted} "마지막 기록 11-14" → 오른쪽 기록 수 {typography.table} 잉크 고정폭 "n건".
- 선택 행: {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + 체크 아이콘. 행 전체가 터치 영역이에요.

| 번호 · 별칭 | 마지막 기록 | 자율·자치 기록 수 | 선택 |
|---|---|---|---|
| 3 학생C | 기록 없음 | 0건 | 선택 |
| 12 학생L | 기록 없음 | 0건 | 선택 |
| 7 학생G | 11-11 | 1건 | 선택 |
| 15 학생O | 11-13 | 1건 | — |
| 21 학생U | 11-14 | 2건 | — |

- 기록 0건도 잉크 숫자예요. 경고 색을 쓰지 않아요.

### M7. 최근 기록 (스크롤 아래, 프레임 밖) [P6]

- 섹션 제목 {typography.heading-2} "최근 기록".
- `counsel-timeline` 4마디. 세로 1px {colors.hairline} 선 + 마디 점(잉크 원형 표식, ELLIPSE 허용). 마디 순서: 날짜 {typography.caption} 고정폭 · 영역 이름(흑백 글자) → 학생 묶음 {typography.title} → 내용 {typography.body} 2줄까지.
  1. "11-18 · 자율·자치" / "5번 학생E 외 2명" / "학급 회의 진행을 맡아 안건을 순서대로 정리함."
  2. "11-18 · 진로" / "9번 학생I" / "관심 학과 탐색 자료를 찾아 친구들과 비교해 봄."
  3. "11-14 · 자율·자치" / "21번 학생U 외 4명" / "교실 환경 정리 활동에서 분리배출 안내문을 만듦."
  4. "11-13 · 진로" / "2번 학생B 외 1명" / "직업인 인터뷰 질문지를 미리 써 와서 발표함."
- 기록이 하나도 없으면 타임라인 자리에 {typography.body-sm} {colors.text-muted} 한 줄 "아직 남긴 기록이 없어요".

### M8. 하단 고정 버튼 줄 [P1]

- 흰 바탕 + 위쪽 1px {colors.hairline}, 패딩 16, 아래 안전 영역 34.
- `button-primary` 폭 358, 높이 52: "3명에게 기록 남기기" (고른 수가 바뀌면 숫자도 바뀌어요).
- 저장하면 `toast` "3명에게 기록을 남겼어요"가 버튼 줄 위에 떠요(시안 프레임에는 그리지 않아요). 기록 칸은 비우고 선택은 유지해요.

---

## PC 1440 × 900

앱 셸: 왼쪽 `sidebar` 248px + 상단 바 64px. 본문 1192px, 좌우 패딩 32px → 콘텐츠 1128px. 섹션 간격 24px(데이터 화면이라 촘촘하게).

### P1. 사이드바 (248px, 전체 높이) [P7]

- `sidebar`: {colors.canvas-soft} 배경, 맨 위 워드마크 "진학 내비".
- 그룹 이름 {typography.caption} {colors.text-muted} "교사", 메뉴 행(직각, {typography.link}): 학급 대시보드 · 학생 상담 · 누가기록 · 카드 수합 · 가채점 수합 · 결과 집계.
- 선택 메뉴 "누가기록": {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + 잉크 글자.
- 맨 아래: {typography.caption} {colors.text-muted} "학급 데이터는 이 기기에만 암호화해서 저장돼요" + `button-pill-soft` "백업".

### P2. 상단 바 (64px) [P7]

- 왼쪽: 페이지 제목 {typography.heading-1} "누가기록".
- 오른쪽: `mode-switch` 학생 · 교사(교사 선택) → `button-pill-soft` "잠금".

### P3. 숫자 타일 줄 (콘텐츠 전체 폭) [P7]

- `stat-tile` 4개 가로(각 264px, 사이 24px, 흰 바탕 + 1px {colors.hairline-soft}). 값은 모두 잉크 {typography.numeric} 고정폭, Route Blue 쓰지 않음.

| 라벨 | 값 | 보조 설명 |
|---|---|---|
| 오늘 남긴 기록 | 4건 | 11-18 기준이에요 |
| 이번 주 기록 | 12건 | 11-16부터 세었어요 |
| 이 영역 기록 0건 | 3명 | 자율·자치 기준이에요 |
| 우리 반 | 25명 | 번호·별칭으로 보여요 |

### P4. 본문 2단

왼쪽 보드 744px + 오른쪽 보조 패널 360px, 사이 24px.

#### P4-L. 보드 (744px) [P1, P2, P3, P4, P5]

1. 조건 줄 (한 줄, 높이 44)
   - 왼쪽 `segmented-control` 2칸(폭 240) "자율·자치"(선택) | "진로".
   - 오른쪽 날짜 줄: `button-pill-soft` "오늘" + 이전·다음 주 아이콘 버튼(32×32) + 7칸 날짜(칸 폭 52, 요일 caption + 날짜 title 고정폭). 고른 날짜 18(수)은 {colors.accent-soft} 채움 + 아래 2px {colors.accent} 막대, 오늘 이후는 {colors.text-faint} 비활성. 날짜 칸을 길게 보려면 달력 아이콘(icon/calendar)을 눌러 `modal`로 월 달력을 열어요(시안 프레임에는 그리지 않아요).
2. 기록 쓰기 줄
   - 라벨 {typography.label} "관찰 기록".
   - `text-input` 여러 줄(폭 520, 높이 88), 안내 문구 "관찰한 내용을 한두 문장으로 적어 주세요", 시안 입력값은 모바일 M4와 같아요.
   - 입력칸 오른쪽(폭 200, 위쪽 맞춤): {typography.title} "3명 선택" + {typography.caption} {colors.text-muted} "3번 학생C, 12번 학생L, 7번 학생G" 한 줄 요약(넘치면 "외 n명") → 아래 `button-primary`(높이 44, 폭 200) "3명에게 기록 남기기".
   - 입력칸 아래 {typography.caption} {colors.text-muted}: "고른 학생 모두에게 같은 기록이 남아요."
3. 표 작업 줄 (높이 40)
   - 왼쪽 {typography.title} "학생 25명" + `button-pill-soft` "전체 선택"(모두 고르면 "선택 해제").
   - 오른쪽 정렬 `segmented-control` 작은 크기 "적은 순 | 번호 순"("적은 순" 선택).
4. 학생 표 `data-table` (폭 744, 머리글 고정, 첫 열 고정, 표 안에서만 세로 스크롤)
   - 머리글 {colors.canvas-soft} + {typography.table-head}. 열: 선택(40, 체크 자리) | 번호(56, 고정폭) | 별칭(200) | 자율·자치 기록(120, 오른쪽 정렬) | 진로 기록(120, 오른쪽 정렬) | 마지막 기록(오른쪽 정렬, 고정폭).
   - 지금 고른 영역의 열 머리("자율·자치 기록")에 정렬 화살표(icon/arrow-up-down)를 붙여요. 영역을 바꾸면 정렬 기준 열도 바뀌어요.
   - 행 높이 40, 행 구분 1px {colors.hairline}, 본문 {typography.table} 잉크 고정폭. 행 전체가 클릭 영역이에요(표 안 컨트롤 최소 32px).
   - 선택 행: {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + 선택 열 체크 아이콘(icon/check, 잉크). (design.md data-table의 "1px 잉크 안쪽 테두리" 대신 Elevation Selected 단계를 따라요 — 여러 행을 동시에 고르는 화면이라 채움이 더 잘 보여요.)
   - 프레임 안에 보이는 행(가상):

| 선택 | 번호 | 별칭 | 자율·자치 기록 | 진로 기록 | 마지막 기록 |
|---|---|---|---|---|---|
| 선택 | 3 | 학생C | 0 | 1 | 11-06 |
| 선택 | 12 | 학생L | 0 | 2 | 11-10 |
| — | 18 | 학생R | 0 | 0 | 기록 없음 |
| 선택 | 7 | 학생G | 1 | 1 | 11-11 |
| — | 15 | 학생O | 1 | 3 | 11-13 |
| — | 21 | 학생U | 2 | 1 | 11-14 |
| — | 1 | 학생A | 2 | 2 | 11-14 |
| — | 9 | 학생I | 2 | 3 | 11-18 |

   - 0도 잉크 숫자예요. 경고 색이나 판정 색을 쓰지 않아요.

#### P4-R. 오른쪽 보조 패널: 최근 기록 (360px) [P6]

- 흰 바탕 + 1px {colors.hairline-soft}, 패딩 24.
- 제목 {typography.heading-3} "최근 기록" + {typography.caption} {colors.text-muted} "같은 날 같은 글은 한 줄로 묶어요".
- `counsel-timeline` 4마디, 내용은 모바일 M7과 같아요(날짜 · 영역 → 학생 묶음 → 내용 2줄).
- 맨 아래 `button-pill-soft` "전체 기록 보기 >".
- 기록이 없으면 "아직 남긴 기록이 없어요" 한 줄.

### PC 상태 메모 (시안 프레임에는 그리지 않아요)

- 저장 후 `toast` "3명에게 기록을 남겼어요"(오른쪽 아래). 기록 칸은 비우고 선택은 유지해요.
- 우리 반 학생이 0명이면 표 자리에 `empty-state`: 제목 "우리 반 학생이 아직 없어요", 설명 "학급 명단을 먼저 불러와 주세요.", `button-primary` "학급 명단 불러오기". 이때 "n명에게 기록 남기기" 버튼은 숨겨서 주요 버튼은 하나만 남아요.

---

## 사용 컴포넌트

`segmented-control`, `segmented-control-active`, `text-input`, `text-input-focused`, `student-row-card`, `data-table`, `counsel-timeline`, `button-primary`, `button-pill-soft`, `stat-tile`, `sidebar`, `mode-switch`, `bottom-sheet`, `modal`, `toast`, `empty-state`

- 컴포넌트가 없는 요소의 연결: 학생 선택(체크박스) → 선택 행(Elevation Selected 단계) + icon/check, 일괄 작업 바 → "n명 선택" 요약 글자 + `button-primary`, 날짜 줄 → 7칸 행(선택 칸은 세그먼트 선택 모양과 같음), 모바일 상단 앱바 → design.md App Shell 모바일 앱바(Figma 컴포넌트 app-bar), PC 사이드바 메뉴 행 → Figma 컴포넌트 sidebar-item.

## 디자이너 메모

- 프레임은 homeroom-logs/390 (390×844), homeroom-logs/1440 (1440×900) 두 개만 만들어요.
- 레이어 이름 = 컴포넌트 이름이에요(예: segmented-control, student-row-card, data-table, counsel-timeline, button-primary). 모바일 M7은 프레임 아래로 넘쳐서 잘려도 돼요.
- 모서리는 모두 0이에요. 원형은 타임라인 마디 점만 ELLIPSE예요.
- 그림자 없음(이 시안에는 모달·바텀시트·토스트를 그리지 않아요).
- 색은 rules/design-rules.json colors 안에서만, Figma 변수에 연결해서 써요. Route Blue·accent-soft는 선택 표시(영역 세그먼트, 고른 날짜, 선택 행, 사이드바 선택 메뉴)에만 써요.
- 글꼴 IBM Plex Sans KR(Figma 시안), 굵기 300/400/600/700, 자간 0, 숫자는 고정폭.
