# 02-spec — 회원가입 (signup)

> 근거: 사용자 결정(2026-11-18) "lab-stock-app의 기능과 시안을 그대로 유지, 그 옆 부분(PC 오른쪽 소개 패널)만 바꿔서"
> 예정 문장: work/_pending/apply5.py (PRD 7-3 교사 계정 로그인·NEIS 학교 선택·메일 확인, 7-4 관리자는 가입으로 될 수 없음, design.md "로그인·회원가입" 셸 문장)
> 레퍼런스: work/_ref/lab-stock-auth.md, 캡처 signup-1440.png(모바일은 login-390.png 셸), 01-research.md 반영 포인트 P1~P8
> 필수 컴포넌트: signup은 requires_trace_accordion · requires_disclaimer_note 대상이 아니에요.

## 공통 원칙

- 폼 구성·순서·라벨·placeholder·흐름은 lab-stock 캡처 그대로예요. 바뀌는 것: 워드마크 "진학 내비", 모서리 0, 글꼴 IBM Plex Sans KR, design.md 색 토큰, 오른쪽 소개 패널 내용.
- 가입자는 모두 교사예요. 역할(교사/관리자) 선택을 두지 않아요. 관리자는 서버에서만 지정돼요. 학생 가입 경로 없음.
- 로그인 전 화면이라 탭바·사이드바·sub-nav 없음(`tab-bar-pill`, `sidebar` 쓰지 않음).
- 주요 버튼은 "가입하기" 하나(`button-primary`). 머리줄 "로그인"은 `button-outline`(캡처 그대로).
- Route Blue({colors.accent})는 강조 아이콘(안내 띠 정보 아이콘, 소개 카드 아이콘, › 화살표), 진행 막대 채움, 선택된 학교급 세그먼트 표시 막대에만 써요. {colors.accent-soft}는 선택된 세그먼트 칸 채움에만 쓰고 안내 띠에는 쓰지 않아요.
- design.md 규칙 때문에 캡처와 달라지는 점 3가지: ① 약관 체크 동그라미 → 직각 체크박스 ② "1 학교 선택"과 "2 계정" 사이 구분선 → 빈 공간 48(Whitespace 원칙, 섹션 사이 구분선 없음) ③ "필수" 표시 글자는 {colors.text-faint}가 아니라 {colors.text-muted}(읽어야 하는 글자).
- 아이콘 이름(icon/info, icon/eye, icon/chevron-down, icon/chevron-right, icon/check, icon/alert 등)은 S3에서 Figma 파일에 있는 아이콘으로 맞춰요.

### 공통 부품(목록에 없는 요소는 기존 규칙으로 조합)

- 드롭다운 칸: `text-input` 모양(field 채움, 높이 48) + 오른쪽 안쪽 16에 icon/chevron-down 16 {colors.text-muted}. 앞 단계를 고르기 전에는 placeholder와 화살표가 {colors.text-faint}(비활성). 펼친 목록은 떠 있는 레이어라 노드 이름을 dropdown으로 두고 {shadow.overlay}를 써요(그림자 허용 목록).
- 체크박스: 20 × 20 직각, 꺼짐 = {colors.canvas} + 1px {colors.hairline}, 켜짐 = {colors.ink} 채움 + 흰 icon/check. 행 전체가 터치 영역(높이 44).
- 안내 띠: {colors.canvas-soft} 채움, 모서리 0, 패딩 12 16, 왼쪽 icon/info 16 {colors.accent} + {typography.body-sm} {colors.ink}.
- 진행 막대: 4칸(시/도 · 지역 · 학교급 · 학교), 높이 4, 칸 사이 4, 빈 칸 {colors.hairline}, 채운 칸 {colors.accent}(design.md "진행 표시" 허용). 채운 항목 수만큼 왼쪽부터 채워요.
- 필드 라벨: {typography.label} {colors.ink} + 6 띄워 "필수" {typography.caption} {colors.text-muted}.

---

## PC 1440 × 900

가입 폼은 약 1460 높이라 900 프레임보다 길어요. 오른쪽 소개 패널은 고정, 왼쪽 폼 열만 세로 스크롤이고 프레임 아래에서 잘려요. 첫 화면에 "1 학교 선택" 전체(제목·안내 띠·진행 막대·시/도·지역·학교급·학교)가 다 보여야 해요.

### P1. 상단 머리줄 (높이 64, 전체 폭)

- 로그인 화면과 같은 조합(design.md 컴포넌트 목록에 없음): {colors.canvas} + 아래 1px {colors.hairline-soft}, 좌우 패딩 32.
- 왼쪽 워드마크 "진학 내비" {typography.heading-4} Bold 700. 오른쪽 `button-outline` "로그인"(높이 44) → 로그인 화면.

### P2. 왼쪽 반 — 가입 폼 (x 0~720, 스크롤 영역 y 64~900)

폼 폭 440, 가로 가운데(x 140~580), 위쪽 시작 y 128. 입력칸 높이 48, 라벨→칸 8, 칸→다음 라벨 16.

1. 제목 {typography.heading-2} Bold 700: "회원가입"
2. 부제(8 아래) {typography.body-lg} Light 300 {colors.text-muted}: "우리 학교를 고르고 계정을 만드세요"

**1 학교 선택** (부제 아래 32)
3. 소제목 {typography.heading-4} Bold 700: "1 학교 선택"
4. (12 아래) 안내 띠 440 폭: "고른 학교의 기록만 보여요. 가입한 뒤에는 바꿀 수 없어요"
5. (12 아래) 진행 막대 4칸 — 기본 상태는 학교급(고등학교)만 고른 상태라 1칸 채움.
6. 라벨 "시/도" → 드롭다운 칸 placeholder "시/도 선택"
7. 라벨 "지역(시/군/구)" → 드롭다운 칸 placeholder "시/도를 먼저 선택하세요"(비활성)
8. 라벨 "학교급" + "필수" → `segmented-control` 440 × 48, 선택지 3개 "초등학교 · 중학교 · 고등학교". "고등학교"가 기본 선택 `segmented-control-active`({colors.accent-soft} 채움 + 아래 2px {colors.accent} 막대 + {colors.ink} SemiBold 글자), 나머지 {colors.text-muted}. 트랙 {colors.canvas-soft}. 초·중도 고를 수 있어요(lab-stock 그대로).
9. 라벨 "학교" → 드롭다운 칸 placeholder "지역을 먼저 선택하세요"(비활성)
- 여기까지 y 약 660에서 끝나요(첫 화면 안).

**2 계정** (학교 칸 아래 48, 구분선 없음)
10. 소제목 {typography.heading-4}: "2 계정"
11. 라벨 "이름" + "필수" → `text-input` placeholder "이름을 입력하세요"
12. 라벨 "개인 이메일" + "필수" → `text-input` placeholder "name@example.com"
13. 라벨 "비밀번호" + "필수" → `text-input` placeholder "8자 이상 입력하세요" + 보기 토글 icon/eye 20 {colors.text-muted}(터치 영역 44)
14. 라벨 "비밀번호 확인" + "필수" → `text-input` placeholder "비밀번호를 한 번 더 입력하세요"
- 900 프레임에서는 "2 계정" 소제목과 이름 칸까지 보이고 그 아래는 잘려요.

**약관** (확인 칸 아래 32)
15. 행 "모두 동의" {typography.title} SemiBold + 왼쪽 체크박스, 아래 1px {colors.hairline-soft} 구분선(같은 묶음 안 목록 구분).
16. 행 3개, 각 높이 44, 왼쪽 체크박스 + {typography.body-sm} {colors.ink} + 오른쪽 icon/chevron-right 16 {colors.text-muted}(누르면 약관 보기):
   - "서비스 이용약관 동의 (필수)"
   - "개인정보 수집·이용 동의 (필수)"
   - "만 14세 이상입니다 (필수)"
17. (32 아래) `button-primary` "가입하기" 440 × 44, {colors.ink} 채움(캡처처럼 처음부터 활성, 누를 때 입력을 검사).
18. (32 아래) 가운데 한 줄: "이미 계정이 있으신가요?" {typography.body-sm} {colors.text-muted} + `button-pill-soft` "로그인 ›"(› {colors.accent}).
19. 아래 여백 64.

### P3. 오른쪽 반 — 서비스 소개 패널 (x 720~1440, y 64~900, 고정)

로그인 화면 P3과 같은 내용·위치예요(같은 컴포넌트 묶음을 재사용).

- 바탕 {colors.canvas-soft}, 패딩 64 → 내용 폭 592, 내용 묶음 세로 가운데.
1. 제목 {typography.heading-2} Bold 700: "우리 반 진학 상담, 한 화면에서 이어 봐요"
2. 리드 {typography.body-lg} Light 300 {colors.text-muted}: "학생이 보낸 상담카드·성적을 모아 수능 최저·수시 6장을 한눈에 봐요"
3. (24 아래) 소개 카드 4장, 사이 12 — {colors.canvas} + 1px {colors.hairline-soft}, 모서리 0, 그림자 없음, 패딩 24, 아이콘 24 {colors.accent} + 제목 {typography.heading-4} + 설명 {typography.body-sm} {colors.text-muted}:

| # | 제목 | 설명 |
|---|---|---|
| 1 | 학교별 분리 | 우리 학교·우리 반 학생 기록만 보여요. 학생은 번호·별칭으로만 저장해요 |
| 2 | NEIS 학교 선택 | 회원가입 때 시/도 → 지역 → 학교급 → 학교 순서로 우리 학교를 골라요 |
| 3 | 상담카드 수합 | 학생이 보낸 QR·파일 상담카드를 한 표로 모아요 |
| 4 | 수능 최저 충족 현황 | 반 학생의 수능 최저 충족 현황을 한눈에 정리해요. 예측이 아니에요 |

4. (24 아래) 캡션 {typography.caption} {colors.text-muted}: "학생은 로그인 없이 써요. 상담카드는 QR·파일로 선생님께 보내요"

- 예측·가능성 표현 없음. NEVER-2 금지어(rules forbidden_words) 0개.

---

## 모바일 390 × 844

로그인 모바일과 같은 셸이에요. 소개 패널·탭바·사이드바 없음. 좌우 여백 20, 바탕 {colors.canvas}.

### M1. 상단 `nav-pill` (y 16, 350 × 48)

- {colors.canvas-soft}, 모서리 0, 왼쪽 패딩 24에 워드마크 "진학 내비" {typography.heading-4} Bold. 오른쪽 비움.

### M2. 가입 폼 카드 (y 88, 폭 350, 아래로 길어지고 스크롤)

- {colors.canvas} + 1px {colors.hairline-soft}, 모서리 0, 패딩 24 → 안쪽 폭 302. 입력칸 302 × 48, 라벨→칸 8, 칸→다음 라벨 12.
- 순서는 PC P2의 1~16과 같아요: 제목 "회원가입"(22) → 부제 → "1 학교 선택" → 안내 띠(두 줄로 흘림) → 진행 막대 → 시/도 → 지역(시/군/구) → 학교급 `segmented-control`(302 폭, "고등학교" `segmented-control-active`) → 학교 → "2 계정"(위 32) → 이름 → 개인 이메일 → 비밀번호(보기 토글) → 비밀번호 확인 → 약관 4행.
- 첫 화면(844)에 "1 학교 선택" 전체가 보여야 해요(학교 칸이 y 약 800 안쪽). 넘치면 부제·소제목 사이 간격을 줄여 맞추고(24 → 16), 글자 크기는 줄이지 않아요. "2 계정"부터는 잘려요.
- 약관 행의 ›를 누르면 상태 S2(약관 보기 `bottom-sheet`).
- `button-primary` "가입하기" 302 × 52.

### M3. 로그인 줄 (카드 아래 24)

- 가운데: "이미 계정이 있으신가요?" + `button-pill-soft` "로그인 ›"(높이 44).

---

## 상태 프레임 (03-draft.json `states` 키, frames에는 넣지 않음)

G3는 signup/390 · signup/1440 두 프레임만 세요. 상태 프레임 이름은 signup:상태-폭 형식으로 그 패턴과 겹치지 않게 지어요.

문구 원칙: 원문은 lab-stock app/signup/signup-form.tsx에서 옮겨요. "초안"이라고 적은 문구는 S3에서 원문을 확인해 다르면 원문으로 바꿔요.

### S1. signup:sent-1440 — 확인 메일 보냄 안내

- PC 셸 그대로(머리줄 + 오른쪽 소개 패널), 왼쪽 폼 자리만 바뀌어요.
1. 제목 {typography.heading-2} 초안: "메일을 확인해 주세요"
2. 부제 {typography.body-lg} Light {colors.text-muted} 초안: "teacher@example.com으로 확인 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나요"
3. 안내 띠(icon/info) 초안: "메일이 안 보이면 스팸함도 확인해 주세요"
4. `button-primary` 초안 "로그인하러 가기" 440 × 44 → 로그인 화면.
- 메일 확인 전에 로그인하면 로그인 화면의 "아직 이메일 확인이 끝나지 않았어요…" 안내(login 02-spec S2)로 이어져요.

### S2. signup:terms-390 — 약관 보기 (모바일)

- 가입 폼(M2) 위에 {colors.scrim} 막 + `bottom-sheet`: 위쪽 모서리 0, 손잡이 막대(40 × 4, {colors.hairline}), {shadow.overlay}, 높이 화면의 약 80%.
- 머리: 제목 {typography.heading-4} "서비스 이용약관"(누른 행의 약관 이름) + 오른쪽 닫기 아이콘(터치 영역 44).
- 본문: 약관 전문 {typography.body-sm} {colors.ink}, 이 영역만 스크롤.
- 아래 고정 줄: `button-primary` "동의하기"(초안) 350 × 52 → 시트 닫힘 + 그 행 체크박스 켜짐. 하단 안전 영역 지킴.
- PC에서는 같은 내용이 `modal`(최대 폭 560)로 열려요(design.md "PC 모달 ↔ 모바일 바텀시트", 따로 그리지 않음).

### S3. signup:error-1440 — 입력 오류

- "가입하기"를 눌렀을 때 화면. 폼 열을 "2 계정"~"가입하기"가 보이게 스크롤한 상태로 그려요.
- 오류 칸은 `text-input-error`(2px {colors.judge-risk} 링) + 칸 아래 8에 icon/alert 14 + {typography.caption} {colors.judge-risk}. 색 + 아이콘 + 글자.
- 보여줄 오류 4가지(문구는 원문 우선, 아래는 초안):
  - 개인 이메일: "이미 가입한 이메일이에요. 로그인하거나 비밀번호 찾기를 써 주세요"
  - 비밀번호: "비밀번호를 8자 이상으로 입력해 주세요"
  - 비밀번호 확인: "비밀번호가 서로 달라요. 한 번 더 확인해 주세요"
  - 약관: 필수 행 아래 "필수 약관에 동의해 주세요"(약관 묶음 아래 한 줄, 체크박스 꺼짐 행은 그대로)
- 학교를 고르지 않은 경우: 학교 드롭다운 칸 `text-input-error` + "학교를 골라 주세요"(초안).

---

## 03-draft.json 메모

- frames: signup/390, signup/1440 두 개만.
- states: S1 signup:sent-1440, S2 signup:terms-390, S3 signup:error-1440.
- 쓰는 컴포넌트: `nav-pill`, `text-input`, `text-input-focused`, `text-input-error`, `segmented-control`, `segmented-control-active`, `button-primary`, `button-outline`, `button-pill-soft`, `bottom-sheet`, `modal`.
- 목록에 없어서 조합으로 그리는 요소: 상단 머리줄, 소개 카드, 안내 띠, 진행 막대, 드롭다운 칸·목록, 체크박스. 노드 이름에 새 컴포넌트 이름을 붙이지 않아요(펼친 목록 노드만 그림자 허용을 위해 dropdown).
