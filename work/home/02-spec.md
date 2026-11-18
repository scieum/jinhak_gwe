# 02-spec — 홈 (home)

> 근거: PRD 5장 [홈] "D-day(수시 원서·수능), 내 요약(평균 등급·환산 9등급 범위), 바로가기" · PRD 3-1 학생 유저스토리 · PRD 13장 조건(데이터 기준일 + 공식 자료 고지)
> design.md Responsive Strategy 홈 행 · App Shell · Components
> 01-research.md 반영 포인트 P1~P7
> 필수 컴포넌트(requires_disclaimer_note): `disclaimer-note` 포함

## 공통 원칙

- 바탕은 흰 캔버스, 구조는 옅은 회색 단계와 1px 선으로 나눠요. 카드에 그림자를 넣지 않아요.
- 색은 두 곳에만 써요. 내 환산 9등급 범위 숫자와 5 to 9 막대의 내 위치 표시(Route Blue #0066ff), 관심 대학 판정 배지(판정 색 쌍 + 아이콘 + 이름). D-day 숫자는 내 위치가 아니라서 잉크색이에요.
- 숫자(등급, 점수, 날짜, D-day)는 모두 고정폭 숫자예요.
- 추정값에는 "약", "범위", "추정"을 붙여요. 아래 수치는 모두 가상값이에요.
- 주요 버튼(`button-primary`)은 성적이 없는 상태에서만 하나 나와요. 성적이 있는 상태에는 주요 버튼이 없고, 이동은 `button-pill-soft`로만 해요.

---

## 모바일 390 × 844

위에서 아래 순서예요. 좌우 패딩 16px, 4열 그리드, 섹션 간격 32px({spacing.xl}).

### M1. 상단 앱바 (56px)

- 왼쪽: 워드마크 "진학 내비" ({typography.heading-4}). 홈이라 뒤로가기는 없어요.
- 오른쪽 보조 영역: `data-status-badge` "시행계획 기준 · 2026-11-18" (흑백 알약, 판정 색 쓰지 않음).

### M2. 인사 문구

- 제목 {typography.heading-1}: "민지님, 지금 내 위치예요"
- 리드 {typography.body-lg} Light 300, text-muted 아님(잉크): "입력한 성적으로 계산한 추정 범위예요."

### M3. 내 요약 카드 [P1, P2]

흰 카드 + 1px hairline-soft, 모서리 24px, 패딩 16px. 카드 하나 안에서 숫자 → 막대 → 해석 → 이동으로 끝나요.

1. `stat-tile` (홈 핵심 숫자 변형: 값 크기를 {typography.display} 32px로 키움)
   - 라벨 {typography.caption} text-muted: "내 환산 9등급"
   - 값 {typography.display}, Route Blue, 고정폭: "약 2.2~2.8"
   - 보조 설명 {typography.body-sm}: "5등급 평균 2.1을 9등급 기준으로 옮긴 추정 범위예요."
2. 보조 숫자 한 줄: 라벨 "5등급 평균" + `grade-chip` "2.1" (회색 채움 5등급 칩), 라벨 "대표값" + `grade-chip` "2.5₉" (잉크 외곽선 9등급 환산 칩). 칩 숫자에 색을 넣지 않아요.
3. `range-bar-5to9` (미니 크기, 카드 안쪽 폭 전체 358px)
   - 1~9 눈금 알약 트랙, 방법별 추정값(A-1, A-2, A-3) 잉크 점, 그 사이 범위는 잉크 20% 채움
   - 대표값 2.5에 Route Blue 원형 표시 + 위쪽 말풍선 "2.5"
   - 아래 신뢰도 흑백 알약 "신뢰도 보통"
   - 대체 텍스트: "환산 9등급 약 2.2에서 2.8 사이, 대표값 2.5"
4. 해석 한 줄 {typography.body-sm} text-muted: "방법마다 값이 조금씩 달라서 범위로 보여드려요."
5. `button-pill-soft` "5 to 9 자세히 보기 >" (카드 맨 아래, 높이 44px 이상). 홈에서 5 to 9로 가는 진입점은 이것 하나예요.

### M4. D-day [P4]

2열 한 줄. 각 칸은 `stat-tile`(Level 2 흰 카드 + 1px hairline-soft, 모서리 24px)이에요.

| 칸 | 라벨 (caption, text-muted) | 값 ({typography.numeric}, 잉크, 고정폭) | 보조 설명 (body-sm, text-muted) |
|---|---|---|---|
| 왼쪽 | 수시 원서 접수 | D-294 | 2027-09-08 예정 |
| 오른쪽 | 수능 | D-365 | 2027-11-18 예정 |

- 날짜는 가상값이에요. Route Blue를 쓰지 않아요.
- 섹션 제목은 따로 두지 않고 라벨로 충분히 읽히게 해요.

### M5. 바로가기 [P5]

- 섹션 제목 {typography.heading-2}: "바로가기"
- 1열 세로 목록 카드(흰 카드 + 1px hairline-soft, 모서리 24px). 행은 흑백 선 아이콘 + 이름({typography.title}) + 오른쪽 ">" 표시. 행 높이 56px, 행 사이는 구분선 없이 여백 8px으로 나눠요.
- 행 4개 (하단 탭과 겹치지 않는 것만):
  1. "성적 입력하기" — 성적 입력 화면
  2. "대학별 환산 보기" — 대학별 환산 화면
  3. "전형계획 둘러보기" — 전형계획 목록
  4. "생기부 AI로 내 기록 살펴보기" — 생기부 AI
- 2열 장식 카드, 배너, 색 배경 카드는 쓰지 않아요.

### M6. 고지

- `disclaimer-note`: "ⓘ 대학 공식 자료가 최종 기준이에요 · 데이터 기준일 2026-11-18" ({typography.caption}, text-muted)
- 아래 여백 = 탭바 높이 64px + 띄움 16px + 안전 영역. 고지가 탭바에 가리지 않아요.

### M7. 하단 탭바

- `tab-bar-pill`: 홈 · 성적 · 될각 · 수시로 · 메뉴. 홈 선택(흰 알약 안 잉크 아이콘). 화면 아래 16px 띄움, 높이 64px, soft canvas 배경. 스크롤해도 그대로 있어요.

### 모바일 상태: 성적 없음 [P3]

- M3 자리를 `empty-state`로 바꿔요. 가운데 정렬, 흑백 선 아이콘, 제목 {typography.heading-4} "아직 입력한 성적이 없어요", 설명 {typography.body-sm} "성적표를 한 번 입력하면 환산 9등급 범위를 여기에서 볼 수 있어요.", `button-primary` "성적 입력하기"(높이 52px). 화면 전체에서 주요 버튼은 이것 하나예요.
- M4 D-day, M5 바로가기, M6 `disclaimer-note`, M7 `tab-bar-pill`은 그대로 둬요. 바로가기의 "성적 입력하기" 행은 주요 버튼과 겹치므로 이 상태에서는 빼요.

---

## PC 1440 × 900

앱 셸: 왼쪽 `sidebar` 248px + 상단 바 64px. 본문 영역 1192px, 좌우 패딩 32px → 콘텐츠 1128px, 12열(열 72px, 여백 24px). 섹션 간격 48px({spacing.section}).

### P1. 사이드바 (248px, 전체 높이) [P7]

- `sidebar`: soft canvas 배경, 맨 위 워드마크 "진학 내비".
- 그룹 이름 {typography.caption} text-muted "학생", 메뉴 행은 알약: 홈 · 전형계획 · 내 성적 · 5 to 9 · 대학별 환산 · 될각 · 수시로 · 생기부 AI · 가채점.
- 홈 선택: 잉크 알약 + 흰 글자. 교사 그룹은 교사 모드에서만 보여서 이 화면에는 없어요.
- 맨 아래: 데이터 기준일 캡션 "데이터 기준일 2026-11-18" + `button-pill-soft` "백업".

### P2. 상단 바 (64px, 본문 폭) [P7]

- 왼쪽: 페이지 제목 "홈".
- 오른쪽: `data-status-badge` "시행계획 기준 · 2026-11-18" → `mode-switch` 학생 · 교사(학생 선택) → `button-pill-soft` "잠금".
- 레퍼런스의 색 안내 띠 대신 이 흑백 배지 하나로 데이터 상태를 알려요.

### P3. 인사 문구 (12열 전체)

- 제목 {typography.heading-1} 32px: "민지님, 지금 내 위치예요"
- 리드 {typography.body-lg} 18px Light 300: "입력한 성적으로 계산한 추정 범위예요."

### P4. 2열 본문 [P6]

왼쪽 8열(744px) + 오른쪽 4열(360px), 사이 24px.

#### P4-L. 왼쪽 열: 내 요약 + 5 to 9 막대 [P1, P2]

흰 카드 + 1px hairline-soft, 모서리 24px, 패딩 24px.

1. 숫자 줄: `stat-tile` 3개를 가로로 나란히(구분선 없이 여백 24px)
   - `stat-tile` 홈 핵심 숫자 변형: 라벨 "내 환산 9등급" → 값 {typography.display} 44px Route Blue "약 2.2~2.8" → 보조 설명 "9등급 기준 추정 범위예요"
   - `stat-tile`: 라벨 "5등급 평균" → 값 {typography.numeric} 잉크 "2.1" → 보조 설명 "학점 가중 평균이에요"
   - `stat-tile`: 라벨 "신뢰도" → 값 {typography.numeric} 잉크 "보통" → 보조 설명 "입력 과목 24개 기준이에요"
2. `range-bar-5to9` (카드 안쪽 폭 696px, 최대 720px 이내)
   - 1~9 눈금 트랙, A-1·A-2·A-3 잉크 점 + 잉크 20% 범위 구간, 대표값 2.5에 Route Blue 원형 + 말풍선 "2.5", 아래 신뢰도 흑백 알약 "신뢰도 보통"
   - 대체 텍스트: "환산 9등급 약 2.2에서 2.8 사이, 대표값 2.5"
3. 해석 한 줄 {typography.body-sm} text-muted: "방법마다 값이 조금씩 달라서 범위로 보여드려요."
4. `button-pill-soft` "5 to 9 자세히 보기 >" (높이 40px, 카드 맨 아래 왼쪽).

#### P4-R. 오른쪽 열: D-day + 관심 대학 될각 요약 [P4, P6]

1. D-day: `stat-tile` 2개 나란히(각 168px). 값은 잉크, Route Blue 쓰지 않음.
   - 라벨 "수시 원서 접수" → "D-294" → "2027-09-08 예정"
   - 라벨 "수능" → "D-365" → "2027-11-18 예정"
2. 관심 대학 될각 요약 카드 (흰 카드 + 1px hairline-soft, 모서리 24px, 패딩 24px)
   - 카드 제목 {typography.heading-3}: "관심 대학 될각"
   - 보조 캡션 {typography.caption} text-muted: "교과전형 · 입결과 비교한 판정이에요"
   - 짧은 행 4개 반복(행 사이 여백 12px, 구분선 없음). 행 = `univ-monogram` + 대학명({typography.title}) / 전형명({typography.body-sm} text-muted, 길면 두 줄) + 오른쪽 `judge-badge`(색 쌍 + 아이콘 + 이름)

     | 모노그램 | 대학 · 전형 (가상) | 판정 |
     |---|---|---|
     | 한 | 한빛대학교 · 학교장추천 | ● 안정 |
     | 새 | 새솔대학교 · 지역인재 | ◐ 적정 |
     | 누 | 누리대학교 · 교과우수자 | ▲ 소신 |
     | 다 | 다온대학교 · 지역균형 | 경계(점선 외곽선 알약) |

   - 맨 아래 `button-pill-soft` "될각 전체 보기 >"
   - 판정 색은 배지 안에만 쓰고 행 배경이나 모노그램에 칠하지 않아요.

### P5. 고지 (12열 전체, 본문 맨 아래)

- `disclaimer-note`: "ⓘ 대학 공식 자료가 최종 기준이에요 · 데이터 기준일 2026-11-18"
- 앱 화면이라 `footer`는 두지 않아요.

### PC에서 빠지는 것

- 바로가기 목록은 두지 않아요. 같은 이동을 `sidebar` 메뉴가 맡아요(design.md Responsive Strategy 홈 PC 행에 바로가기 없음).

### PC 상태: 성적 없음 [P3]

- P4-L 카드를 `empty-state`로 바꿔요. 제목 "아직 입력한 성적이 없어요", 설명 "성적표를 한 번 입력하면 환산 9등급 범위를 여기에서 볼 수 있어요.", `button-primary` "성적 입력하기"(높이 44px). 화면의 주요 버튼은 이것 하나예요.
- P4-R D-day는 그대로 둬요. 관심 대학 카드는 판정 자리에 `judge-badge` 판정 없음 변형(회색 알약 "성적 입력 후 보여요")을 두고, 관심 대학이 0개면 설명 "관심 대학을 담으면 여기에서 될각 판정을 볼 수 있어요." + `button-pill-soft` "전형계획 둘러보기"를 둬요.
- P5 `disclaimer-note`는 그대로 둬요.

---

## 사용 컴포넌트

`stat-tile`, `grade-chip`, `range-bar-5to9`, `button-pill-soft`, `button-primary`, `empty-state`, `data-status-badge`, `disclaimer-note`, `tab-bar-pill`, `sidebar`, `mode-switch`, `univ-monogram`, `judge-badge`

- 컴포넌트가 없는 요소의 연결: D-day 칸 → stat-tile 변형, 홈 핵심 숫자 → stat-tile 변형(display 크기), 바로가기 목록 → Level 2 흰 카드 + 목록 행(별도 컴포넌트 없음), 관심 대학 요약 카드 → Level 2 흰 카드 + univ-monogram·judge-badge 행.

## 디자이너 메모

- 프레임 이름은 home/390 (390×844), home/1440 (1440×900) 두 개만 만들어요.
- 레이어 이름 = 컴포넌트 이름이에요. 예: 내 요약 숫자 레이어는 stat-tile, D-day 칸도 stat-tile, 막대는 range-bar-5to9, 고지는 disclaimer-note. 판정 J6 그림자 검사가 레이어 이름을 보기 때문에 이름을 바꾸지 마세요.
- 알약(버튼, 배지, 칩, 탭바, 사이드바 메뉴 행, 막대 트랙)은 radius 9999예요. 카드는 24, 입력칸·아코디언은 16. univ-monogram만 30% 스퀴클 예외예요.
- 그림자는 쓰지 않아요(이 화면에는 모달·바텀시트·토스트가 없어요).
- 색은 rules/design-rules.json colors 안에서만, Figma 변수에 연결해서 써요. Route Blue는 내 환산 9등급 범위 숫자와 막대의 내 위치 표시 두 곳뿐이에요.
- 글꼴 Pretendard, 굵기 300/400/600/700, 자간 0.
