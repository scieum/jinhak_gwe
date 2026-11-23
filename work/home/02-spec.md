# 02-spec — 홈 (home)

> 근거: PRD 5장 [홈] "D-day(수시 원서·수능), 내 요약(평균 등급·환산 9등급 범위), 바로가기" · PRD 3-1 학생 유저스토리 · PRD 13장 조건(데이터 기준일 + 공식 자료 고지)
> design.md(커밋 4c7321d 이후) Responsive Strategy 홈 행 · App Shell · Elevation(Page v2) · Shapes(모서리 0 · 캐릭터) · Components(stat-tile · range-bar-5to9 · judge-badge · promo-banner · mascot-illustration · brand-logo · page-header · sidebar-group · toast)
> work/admission-style/02-spec.md D23 · D24(진입 배너 결정), 5-0(배너 상태 프레임)
> 01-research.md 반영 포인트 P1~P7
> 필수 컴포넌트(requires_disclaimer_note): `disclaimer-note` 포함
> 개정 2026-11-24 (S2 개정): 전형 성향 탐색 배너를 두 번째 블록에 넣고, 최신 design.md와 어긋난 부분(서비스 이름 · 로고 · 모서리 · 앱 셸 · 탭바 · 범위 막대 · 같은 무게 타일 3개)을 고쳤어요.

## 0. 개정 결정 (2026-11-24)

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| H1 | 전형 성향 탐색 배너 | `promo-banner` 하나를 **두 번째 블록**(내 요약 카드 바로 아래, 5 to 9 미니 막대 위)에 둬요. 닫을 수 있어요(H2). 모바일 · PC 모두 | 사용자 결정(채팅), design.md Responsive Strategy 홈 행, admission-style D23 |
| H2 | 배너 닫기 | ✕ = 이번만 숨김(앱을 다시 열면 다시 보여요) · 배너 아래 텍스트 버튼 "다시 보지 않기" = 이 기기에서 계속 숨김. 둘 다 숨긴 뒤 `toast` "전형계획 목록에서 다시 볼 수 있어요" | 사용자 결정, admission-style D24, design.md promo-banner |
| H3 | 배너 색 | 배너 바탕 · 글자 · 테두리는 흑백. 색은 길콩 그림(`mascot-illustration`) 안 원본 색뿐(팔레트 예외). Route Blue · 판정 색 · 숫자 배지 · 퍼센트 없음 | 사용자 결정, design.md 캐릭터 · promo-banner |
| H4 | 5 to 9 막대 자리 | 내 요약 카드 안에 있던 막대를 **배너 아래 별도 카드**로 떼어요(내 요약 → 배너 → 5 to 9 미니 막대) | design.md Responsive Strategy 홈 행 순서 |
| H5 | 서비스 이름 · 로고 | 글자 워드마크 "진학 내비"를 없애고 `brand-logo`(U:NAVI 로고 원본)로 바꿔요. 크기 폭 기준 모바일 머리 92 · PC 사이드바 124 | design.md brand-logo(2026-11-24 크기) |
| H6 | 앱 셸 | 모바일 하단 탭 = 대분류 5개(홈 · 성적 · 대학 찾기 · 수시 전략 · 더보기). PC 사이드바 = `sidebar-group` 4개(홈 · 성적 · 대학 찾기 · 수시 전략), PC 상단 바 대신 `page-header`. 전형 성향 탐색은 메뉴에 없어요(배너로만 들어가요) | design.md App Shell |
| H7 | 모양 | 모든 모서리 0(버튼 · 칩 · 배지 · 카드 · 탭바 · 모노그램 · 토스트). 원형은 범위 막대의 점 · 내 위치 표시, 판정 아이콘 ●만. 화면 바탕 Page {colors.canvas-soft} 위 흰 카드는 테두리 없음 | design.md Shapes · Elevation v2 |
| H8 | PC 숫자 타일 | 같은 무게 `stat-tile` 3개 나란히 → 핵심 `stat-tile` 1개 + 보조 숫자 한 줄로 줄여요 | design.md stat-tile "같은 무게 타일 3개 이상 금지" |

## 공통 원칙

- 화면 바탕은 Page {colors.canvas-soft}, 내용은 테두리 없는 흰 카드예요. 카드에 그림자를 넣지 않아요. 그림자는 `toast`(배너 닫은 상태)에만 있어요.
- 색은 의미가 있을 때만: ① 내 환산 9등급 범위 숫자와 5 to 9 막대의 내 위치 표시(Route Blue) ② 선택 표시(`tab-bar-pill` 선택 아이콘) ③ 관심 대학 판정 배지(판정 색 쌍 + 아이콘 + 이름) ④ 5 to 9 막대 트랙의 등급 색. D-day 숫자와 배너는 잉크색이에요. 길콩 그림 안 색은 팔레트 예외예요.
- 숫자(등급, 점수, 날짜, D-day)는 모두 고정폭 숫자예요.
- 추정값에는 "약", "범위", "추정"을 붙여요. 아래 수치는 모두 가상값이에요.
- 주요 버튼(`button-primary`)은 성적이 없는 상태에서만 하나 나와요. 성적이 있는 상태에는 주요 버튼이 없고, 이동은 `button-pill-soft` · 배너 · 바로가기 행으로 해요.

---

## 모바일 390 × 844 (frame home/390 — 배너 보이는 기본 상태)

위에서 아래 순서예요. 좌우 패딩 16px(콘텐츠 358), 4열 그리드. 블록 간격은 아래에 따로 적은 곳 말고는 {spacing.lg} 24px. 첫 화면에 M1~M5가 보이고, M6 D-day는 탭바 위에서 잘려 스크롤로 이어져요.

### M1. 머리 줄 (y 0, 높이 56)

- 왼쪽: `brand-logo` 폭 92(원본 비율 1273:297 → 높이 약 21). 홈이라 뒤로가기는 없어요.
- 오른쪽: `data-status-badge` "시행계획 기준 · 2026-11-18"(흑백, Page 위라 채움 {colors.canvas}).

### M2. 인사 문구 (화면 제목)

- 제목 {typography.heading-1}: "민지님, 지금 내 위치예요"
- 리드 {typography.body-lg} Light 300, 잉크: "입력한 성적으로 계산한 추정 범위예요."

### M3. 내 요약 카드 [P1, P2]

흰 카드(테두리 없음), 모서리 0, 패딩 {spacing.card} 20.

1. `stat-tile` (홈 핵심 숫자: 값 {typography.display} 32px)
   - 라벨 {typography.caption} {colors.text-muted}: "내 환산 9등급"
   - 값 {typography.display}, Route Blue, 고정폭: "약 2.2~2.8"
   - 보조 설명 {typography.body-sm}: "5등급 평균 2.1을 9등급 기준으로 옮긴 추정 범위예요."
2. 보조 숫자 한 줄: 라벨 "5등급 평균" + `grade-chip` "2.1"(회색 채움 5등급 칩), 라벨 "대표값" + `grade-chip` "2.5₉"(잉크 외곽선 9등급 환산 칩). 칩 숫자에 색을 넣지 않아요.

### M4. 전형 성향 탐색 배너 [H1~H3] (두 번째 블록)

M3 아래 간격 {spacing.md} 16.

- `promo-banner` 폭 358 × 높이 72(보조 줄이 두 줄로 흐르면 늘어남). 채움 {colors.canvas-soft} + Page 위라 1px {colors.hairline} 테두리, 모서리 0, 그림자 없음.
  - 왼쪽(패딩 {spacing.md} 16): 굵은 줄 "나의 준비 방식 찾기" {typography.title} {colors.ink} → 간격 2 → 보조 줄 "길콩과 15문항 · 약 3분 · 가입 없이" {typography.body-sm} {colors.ink-soft}(고정폭 숫자). text-muted는 이 바탕에서 대비가 모자라서 쓰지 않아요.
  - 오른쪽: `mascot-illustration` 길콩 guide(gilkong.png) 60×60, 투명 배경 그대로(배경 원 · 도형 없음) → 간격 8 → › 16 {colors.ink} → 닫기 ✕(icon/x 16 {colors.ink}, 누르는 칸 44×44, 배너 오른쪽 끝).
  - ✕ 칸을 뺀 배너 전체가 링크 하나 → 전형 성향 탐색 소개 화면(admission-style).
- 배너 바로 아래 오른쪽 정렬 텍스트 버튼 "다시 보지 않기" {typography.caption} {colors.ink-soft} 밑줄. 누르는 영역 높이 44(글자 주변 여백 포함).
- 다음 블록(M5)까지 간격 {spacing.sm} 12.

### M5. 5 to 9 미니 막대 카드 [P1, P2, H4]

흰 카드(테두리 없음), 모서리 0, 패딩 20.

1. `range-bar-5to9` (미니, 카드 안쪽 폭 318)
   - 1~9 구간을 등급 색(grade-1~grade-9)으로 채운 트랙 높이 12, 눈금 숫자는 트랙 아래 {typography.caption} {colors.ink}
   - 방법별 추정값 A-1 · A-2 · A-3은 트랙 위 작은 잉크 점(흰 1px 테두리), 그 사이 범위는 트랙 위쪽 2px 잉크 괄호선
   - 대표값 2.5 = Route Blue 원(지름 20) + 흰 3px 테두리 + 바깥 1px 잉크 선 + 트랙을 가로지르는 2px 잉크 세로선 + 위쪽 말풍선 "2.5"
   - 아래 신뢰도 흑백 배지 "신뢰도 보통"
   - 대체 텍스트: "환산 9등급 약 2.2에서 2.8 사이, 대표값 2.5"
2. 해석 한 줄 {typography.body-sm} {colors.text-muted}: "방법마다 값이 조금씩 달라서 범위로 보여드려요."
3. `button-pill-soft` "5 to 9 자세히 보기 >" (카드 맨 아래, 높이 44 이상). 홈에서 5 to 9로 가는 진입점은 이것 하나예요.

### M6. D-day [P4]

2열 한 줄(각 171, 사이 16). 각 칸은 `stat-tile`(흰 카드, 테두리 없음, 모서리 0).

| 칸 | 라벨 (caption, text-muted) | 값 ({typography.numeric}, 잉크, 고정폭) | 보조 설명 (body-sm, text-muted) |
|---|---|---|---|
| 왼쪽 | 수시 원서 접수 | D-294 | 2027-09-08 예정 |
| 오른쪽 | 수능 | D-365 | 2027-11-18 예정 |

- 날짜는 가상값이에요. Route Blue를 쓰지 않아요. 섹션 제목은 따로 두지 않아요.

### M7. 바로가기 [P5]

- 섹션 제목 {typography.heading-2}: "바로가기"
- 1열 세로 목록 흰 카드(테두리 없음, 모서리 0). 행 = 흑백 선 아이콘 + 이름({typography.title}) + 오른쪽 ›. 행 높이 56, 행 사이 1px {colors.hairline-soft}.
- 행 4개:
  1. "성적 입력하기" — 성적 입력
  2. "대학별 환산 보기" — 대학별 환산
  3. "전형계획 둘러보기" — 전형계획 목록
  4. "생기부 AI로 내 기록 살펴보기" — 생기부 AI
- 전형 성향 탐색은 바로가기에 넣지 않아요(배너 M4가 진입점, 메뉴 없음). 바로가기 안에 배너 · 색 배경 카드를 더 두지 않아요(한 화면에 `promo-banner` 1개).

### M8. 고지

- `disclaimer-note`: "ⓘ 대학 공식 자료가 최종 기준이에요 · 데이터 기준일 2026-11-18" ({typography.caption}, {colors.text-muted})
- 아래 여백 = 탭바 높이 64 + 띄움 16 + 안전 영역. 고지가 탭바에 가리지 않아요.

### M9. 하단 탭바

- `tab-bar-pill`: 홈 · 성적 · 대학 찾기 · 수시 전략 · 더보기. 홈 선택(Route Blue 아이콘 + 잉크 SemiBold 이름). 화면 아래 16 띄움, 높이 64, {colors.canvas} + 1px {colors.hairline}, 모서리 0. 스크롤해도 그대로 있어요.

### 모바일 상태: 성적 없음 [P3] (프레임으로 그리지 않음)

- M3 자리를 `empty-state`로 바꿔요. 가운데 정렬, 흑백 선 아이콘, 제목 {typography.heading-4} "아직 입력한 성적이 없어요", 설명 {typography.body-sm} "성적표를 한 번 입력하면 환산 9등급 범위를 여기에서 볼 수 있어요.", `button-primary` "성적 입력하기"(높이 52). 화면 전체에서 주요 버튼은 이것 하나예요.
- M4 배너는 그대로 두 번째 블록에 있어요(성적과 관계없는 체험이라). M5 막대 카드는 빠져요.
- M6 D-day, M7 바로가기, M8 `disclaimer-note`, M9 `tab-bar-pill`은 그대로. 바로가기의 "성적 입력하기" 행은 주요 버튼과 겹치므로 빼요.

---

## PC 1440 × 900 (frame home/1440 — 배너 보이는 기본 상태)

앱 셸: 왼쪽 `sidebar` 248 + 본문. 본문 1192, 좌우 패딩 32 → 콘텐츠 1128, 12열(열 72, 여백 24). 바탕 Page {colors.canvas-soft}. 블록 간격 {spacing.lg} 24.

### P1. 사이드바 (248, 전체 높이) [P7]

- `sidebar`: {colors.canvas} + 오른쪽 1px {colors.hairline-soft}. 맨 위 `brand-logo` 폭 124.
- 그룹 이름 {typography.caption} {colors.text-muted} "학생" → `sidebar-group` 4행: 홈(지금 대분류, 잉크 글자, 소분류 없음) · 성적 › · 대학 찾기 › · 수시 전략 ›(접힘, {colors.ink-soft}). 대분류 행에는 선택 채움을 쓰지 않아요.
- 교사 그룹은 교사 모드에서만 보여서 이 화면에는 없어요. 전형 성향 탐색 메뉴는 없어요.
- 맨 아래: 데이터 기준일 caption "데이터 기준일 2026-11-18" + `button-pill-soft` "백업".

### P2. 화면 머리 [P7]

- `page-header`(위 여백 32): 제목 {typography.heading-1} 32px "민지님, 지금 내 위치예요" → 리드 {typography.body-lg} 18px Light 300 "입력한 성적으로 계산한 추정 범위예요."
- 오른쪽 끝: `data-status-badge` "시행계획 기준 · 2026-11-18" → `mode-switch` 학생 · 교사(학생 선택) → `button-pill-soft` "잠금". 주요 버튼 없음.
- 아래 여백 24 뒤에 2열 본문.

### P3. 2열 본문 [P6]

왼쪽 8열(744) + 오른쪽 4열(360), 사이 24.

#### P3-L. 왼쪽 열: 내 요약 → 배너 → 5 to 9 막대

1. 내 요약 카드 [P1, P2, H8] — 흰 카드(테두리 없음), 모서리 0, 패딩 24
   - `stat-tile` 홈 핵심 숫자: 라벨 "내 환산 9등급" → 값 {typography.display} 44px Route Blue "약 2.2~2.8" → 보조 설명 "5등급 평균 2.1을 9등급 기준으로 옮긴 추정 범위예요."
   - 보조 숫자 한 줄({typography.body-sm}, 라벨 {colors.text-muted} · 값 잉크 고정폭, 항목 사이 24): "5등급 평균" `grade-chip` "2.1" · "대표값" `grade-chip` "2.5₉" · "입력 과목 24개"
2. 전형 성향 탐색 배너 [H1~H3] — 간격 16
   - `promo-banner` 폭 744 × 높이 72. 구성은 M4와 같아요: 왼쪽 "나의 준비 방식 찾기" / "길콩과 15문항 · 약 3분 · 가입 없이"(한 줄) → 오른쪽 `mascot-illustration` guide 60 → › → 닫기 ✕ 칸 44×44.
   - 배너 아래 오른쪽 정렬 "다시 보지 않기"({typography.caption} {colors.ink-soft} 밑줄, 누르는 영역 높이 32 이상).
   - 다음 카드까지 간격 12.
3. 5 to 9 막대 카드 [P1, P2, H4] — 흰 카드(테두리 없음), 모서리 0, 패딩 24
   - `range-bar-5to9` 카드 안쪽 폭 696(최대 720 이내). 구성은 M5와 같아요(등급 색 트랙 12 · 방법별 잉크 점 · 괄호선 · Route Blue 내 위치 20 + 세로선 + 말풍선 "2.5" · 신뢰도 배지 "신뢰도 보통").
   - 대체 텍스트: "환산 9등급 약 2.2에서 2.8 사이, 대표값 2.5"
   - 해석 한 줄 {typography.body-sm} {colors.text-muted}: "방법마다 값이 조금씩 달라서 범위로 보여드려요."
   - `button-pill-soft` "5 to 9 자세히 보기 >"(높이 40, 카드 맨 아래 왼쪽).

#### P3-R. 오른쪽 열: D-day + 관심 대학 될각 요약 [P4, P6]

1. D-day: `stat-tile` 2개 나란히(각 168, 사이 24). 흰 카드, 값은 잉크.
   - "수시 원서 접수" → "D-294" → "2027-09-08 예정"
   - "수능" → "D-365" → "2027-11-18 예정"
2. 관심 대학 될각 요약 카드(흰 카드, 테두리 없음, 모서리 0, 패딩 24)
   - 카드 제목 {typography.heading-3}: "관심 대학 될각"
   - 보조 캡션 {typography.caption} {colors.text-muted}: "교과전형 · 입결과 비교한 판정이에요"
   - 짧은 행 4개(행 사이 12). 행 = `univ-monogram`(정사각, 모서리 0, {colors.canvas-soft} 바탕 + 잉크 글자) + 대학명 {typography.title} / 전형명 {typography.body-sm} {colors.text-muted}(길면 두 줄) + 오른쪽 `judge-badge`(색 쌍 + 아이콘 + 이름)

     | 모노그램 | 대학 · 전형 (가상) | 판정 |
     |---|---|---|
     | 한 | 한빛대학교 · 학교장추천 | ● 안정 |
     | 새 | 새솔대학교 · 지역인재 | ◐ 적정 |
     | 누 | 누리대학교 · 교과우수자 | ▲ 소신 |
     | 다 | 다온대학교 · 지역균형 | 경계(점선 외곽선, 이름 "경계") |

   - 맨 아래 `button-pill-soft` "될각 전체 보기 >"
   - 판정 색은 배지 안에만 쓰고 행 배경이나 모노그램에 칠하지 않아요. 가상 대학이라 로고가 없어서 모노그램을 써요.

### P4. 고지 (12열 전체, 본문 맨 아래)

- `disclaimer-note`: "ⓘ 대학 공식 자료가 최종 기준이에요 · 데이터 기준일 2026-11-18"
- 앱 화면이라 `footer`는 두지 않아요.

### PC에서 빠지는 것

- 바로가기 목록은 두지 않아요. 같은 이동을 `sidebar` 메뉴가 맡아요(design.md Responsive Strategy 홈 PC 행에 바로가기 없음).

### PC 상태: 성적 없음 [P3] (프레임으로 그리지 않음)

- 내 요약 카드를 `empty-state`로 바꿔요. 제목 "아직 입력한 성적이 없어요", 설명 "성적표를 한 번 입력하면 환산 9등급 범위를 여기에서 볼 수 있어요.", `button-primary` "성적 입력하기"(높이 44). 화면의 주요 버튼은 이것 하나예요. 배너는 그 아래 그대로, 5 to 9 막대 카드는 빠져요.
- P3-R D-day는 그대로. 관심 대학 카드는 판정 자리에 `judge-badge` 판정 없음 변형(회색, 아이콘 없음, "성적 입력 후 보여요")을 두고, 관심 대학이 0개면 설명 "관심 대학을 담으면 여기에서 될각 판정을 볼 수 있어요." + `button-pill-soft` "전형계획 둘러보기"를 둬요.
- P4 `disclaimer-note`는 그대로.

---

## 배너 동작 · 접근성 (모바일 · PC 공통)

| 항목 | 결정 |
|---|---|
| 누르기 | ✕ 칸과 "다시 보지 않기"를 뺀 배너 전체가 링크 하나 → 전형 성향 탐색 소개. 소개 화면의 ‹ 뒤로는 홈으로 돌아와요 |
| ✕ | 이번 실행 동안만 숨김. 배너와 "다시 보지 않기" 줄이 함께 닫히고 아래 5 to 9 카드가 올라와요(150~200ms, ease-out, 움직임 줄이기 설정이면 바로) → `toast` |
| 다시 보지 않기 | 이 기기에 "홈 배너 숨김" 표시 하나만 기억(서버 전송 없음, 탐색 답변과 무관) → 같은 닫힘 + 같은 `toast`. 다시 켜는 설정은 두지 않고, 전형계획 목록 배너(닫기 없음)로 언제든 들어갈 수 있어요 |
| toast | "전형계획 목록에서 다시 볼 수 있어요". 모바일 탭바 위 12 · 좌우 16, PC 오른쪽 아래(오른쪽 · 아래 32). {colors.ink} 채움 + {colors.on-primary} 글자, 모서리 0, 그림자 overlay. 약 4초 뒤 사라져요 |
| 읽기 순서 | 링크 → ✕ → 다시 보지 않기 순으로 Tab이 닿아요. ✕는 링크 안에 넣지 않고 형제 버튼으로 둬요 |
| 이름(보조 기술) | 링크 "나의 준비 방식 찾기, 길콩과 15문항 · 약 3분 · 가입 없이, 전형 성향 탐색으로 가요" · ✕ "배너 닫기, 이번만 숨겨요" · 텍스트 버튼 "다시 보지 않기" |
| 그림 | `mascot-illustration`은 장식이라 대체 텍스트를 비워요 |
| 닫은 뒤 포커스 | 다음 블록(5 to 9 카드)의 첫 요소로 옮겨요. `toast`는 공손한 알림(polite)으로 읽혀요 |
| 포커스 · 터치 | 포커스 2px 잉크 링(배너 전체 · ✕ · 텍스트 버튼 각각). 모바일 ✕ 44×44, "다시 보지 않기" 높이 44. PC 그 밖 버튼 32~40 이상 |
| 대비 | 굵은 줄 ink · 보조 줄 ink-soft · 텍스트 버튼 ink-soft가 {colors.canvas-soft}(배너) · Page 위에서 4.5:1 이상 |
| 문구 | 해요체. 배너에 결과 · 점수 · 퍼센트 · 숫자 배지를 쓰지 않아요("15문항 · 약 3분"은 길이 안내) |

---

## 상태 프레임

G3은 03-draft.json `frames`의 두 프레임(home/390, home/1440)만 세요. 상태 프레임은 그 옆에 두고 `frames`에는 넣지 않아요. 이름은 "home 상태 · ○○", 03-draft.json `states`에 적어요. 규칙(팔레트 · 모서리 0 · 글꼴 · 그림자)은 본 프레임과 같아요.

| 프레임 | 크기 | 무엇을 그리나 |
|---|---|---|
| home/390 (갱신) | 390×844 | 기본 상태, 배너 보임. M1 → M2 → M3 내 요약 → **M4 배너(✕ 있음) + "다시 보지 않기"** → M5 5 to 9 카드 → M6 D-day 일부 → M9 탭바(홈 선택). 셸 · 로고 · 모서리 · 막대도 이 문서대로 고쳐 그려요 |
| home/1440 (갱신) | 1440×900 | 기본 상태, 배너 보임. 사이드바(`brand-logo` 124, `sidebar-group`) → `page-header` → 왼쪽 열 내 요약 → **배너 744(✕ 있음) + "다시 보지 않기"** → 5 to 9 카드 / 오른쪽 열 D-day · 관심 대학 될각 → 고지 |
| home 상태 · 배너 닫음 390 | 390×844 | ✕를 누른 뒤. 배너 · "다시 보지 않기" 자리가 닫혀 M5 5 to 9 카드가 M3 바로 아래(간격 24)로 올라오고 M6 D-day가 더 보여요. 탭바 위 12에 `toast` "전형계획 목록에서 다시 볼 수 있어요" |
| home 상태 · 배너 닫음 1440 | 1440×900 | ✕를 누른 뒤. 왼쪽 열에서 배너가 빠져 5 to 9 카드가 내 요약 바로 아래로. 오른쪽 아래(오른쪽 · 아래 32)에 `toast` 같은 문구 |

"다시 보지 않기"를 누른 뒤 모습은 "배너 닫음"과 같아서 따로 그리지 않아요. 성적 없음 상태도 그리지 않아요.

---

## 사용 컴포넌트

`brand-logo`, `stat-tile`, `grade-chip`, `range-bar-5to9`, `promo-banner`, `mascot-illustration`, `button-pill-soft`, `button-primary`, `empty-state`, `data-status-badge`, `disclaimer-note`, `tab-bar-pill`, `sidebar`, `sidebar-group`, `page-header`, `mode-switch`, `univ-monogram`, `judge-badge`, `toast`

- 컴포넌트가 없는 요소의 연결: D-day 칸 → stat-tile, 홈 핵심 숫자 → stat-tile(display 크기), 바로가기 목록 → 흰 카드 + 목록 행(별도 컴포넌트 없음), 관심 대학 요약 카드 → 흰 카드 + univ-monogram · judge-badge 행, "다시 보지 않기" → 텍스트 버튼(promo-banner 규칙 안).
- 백틱 안 이름은 모두 rules `components`에 있어요. 필수 `disclaimer-note` 있음. NEVER-2 금지 표현 0.

## 디자이너 메모

- 03-draft.json `frames`에는 home/390, home/1440 두 개만 적고(기존 노드 320:4 · 320:49를 고쳐 그리거나 같은 이름으로 다시 그림), 상태 프레임 2개는 `states`에 적어요.
- 레이어 이름 = 컴포넌트 이름이에요. 예: 배너는 promo-banner, 길콩 그림은 mascot-illustration, 토스트는 toast, 내 요약 숫자 · D-day 칸은 stat-tile, 막대는 range-bar-5to9, 고지는 disclaimer-note. J6 그림자 검사가 레이어 이름을 보니 이름을 바꾸지 마세요(그림자는 toast에만).
- 모서리는 모두 0이에요(radius 9999 · 스퀴클 없음). 원형(ELLIPSE)은 막대 위 방법별 점 · 내 위치 표시와 판정 아이콘 ●뿐이에요.
- 색은 rules/design-rules.json colors 안에서만, Figma 변수에 연결해서 써요. 예외는 `brand-logo` · `mascot-illustration` 안 원본 색(팔레트 예외, 변수 연결 · 색 수정 금지). 길콩 PNG는 app/public/assets/admission-style/gilkong.png(투명 배경)를 이미지 채움 노드 하나로 둬요.
- Route Blue는 내 환산 9등급 범위 숫자, 막대의 내 위치 표시, 탭바 선택 아이콘에만. 배너에는 없어요.
- 글꼴 Pretendard(Figma에 없으면 IBM Plex Sans KR), 굵기 300/400/600/700, 자간 0.
