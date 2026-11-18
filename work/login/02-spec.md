# 02-spec — 로그인 (login)

> 근거: 사용자 결정(2026-11-18) "lab-stock-app의 기능과 시안을 그대로 유지, 그 옆 부분(PC 오른쪽 소개 패널)만 바꿔서"
> 예정 문장: work/_pending/apply5.py (PRD 7-3·7-4 교사·관리자 로그인, design.md "로그인·회원가입" 셸 문장)
> 레퍼런스: work/_ref/lab-stock-auth.md, 캡처 login-1440.png · login-390.png, 01-research.md 반영 포인트 P1~P8
> 필수 컴포넌트: login은 requires_trace_accordion · requires_disclaimer_note 대상이 아니에요(환산·판정이 나오지 않는 화면).

## 공통 원칙

- 폼·흐름·문구·배치는 lab-stock 캡처 그대로예요. 바뀌는 것은 다섯 가지뿐이에요: 워드마크 "진학 내비", 모서리 0(입력칸·버튼·카드·알약 모두 직각), 글꼴 IBM Plex Sans KR(Light 300 · Regular 400 · SemiBold 600 · Bold 700), design.md 색 토큰, 오른쪽 소개 패널 내용.
- 대상은 교사·관리자예요. 관리자도 같은 화면이고 역할 선택(탭·세그먼트)도, "관리자" 문구도 두지 않아요. 역할은 서버에서만 정해져서 로그인 뒤 역할에 따라 이동해요. 학생은 로그인하지 않아요.
- 로그인 전 화면이라 탭바·사이드바·sub-nav 없음(`tab-bar-pill`, `sidebar` 쓰지 않음).
- 색: 주요 버튼 = {colors.ink} 채움. Route Blue({colors.accent})는 강조 아이콘(소개 카드 아이콘, 회원가입 버튼의 › 화살표)에만 써요. 판정 색은 오류(위험 쌍)·완료 안내(안정 쌍) 상태에서만 나와요.
- 그림자 없음. 깊이는 {colors.canvas-soft} 채움과 1px {colors.hairline-soft} 선으로만 만들어요.
- 숫자가 거의 없지만 나오는 곳(없음)은 고정폭 숫자예요. 자간 0.
- 한 화면 주요 버튼 1개 규칙(design.md Buttons): lab-stock PC 머리줄의 검정 "회원가입" 버튼은 `button-outline`으로 바꿔요(폼의 "로그인"이 이 화면의 유일한 `button-primary`). lab-stock 회원가입 화면 머리줄의 "로그인" 버튼과 같은 모양이 돼요.
- 아이콘 이름(icon/info, icon/eye, icon/eye-off, icon/chevron-right, icon/alert, icon/check 등)은 S3에서 Figma 파일에 있는 아이콘으로 맞춰요.

---

## PC 1440 × 900

위에서 아래, 왼쪽에서 오른쪽 순서예요. 전체 바탕 {colors.canvas}.

### P1. 상단 머리줄 (높이 64, 전체 폭)

design.md 컴포넌트 목록에 없는 요소라 기존 요소로 조합해요(아래 "design.md 수정 제안" 참고).

- 바탕 {colors.canvas}, 아래 1px {colors.hairline-soft}. 좌우 패딩 32.
- 왼쪽: 워드마크 "진학 내비" {typography.heading-4} Bold 700 {colors.ink}.
- 오른쪽: `button-outline` "회원가입"(높이 44, 좌우 {spacing.md}, {typography.link}) → 회원가입 화면.

### P2. 왼쪽 반 — 로그인 폼 (x 0~720, y 64~900, 바탕 {colors.canvas})

폼 폭 440, 왼쪽 반 안에서 가로 가운데(x 140~580). 폼 위쪽 시작 y 128(머리줄 아래 64).

1. 제목 {typography.heading-2} Bold 700 {colors.ink}: "로그인"
2. 부제(8 아래) {typography.body-lg} Light 300 {colors.text-muted}: "개인 이메일로 로그인하세요"
3. (32 아래) 라벨 {typography.label} {colors.ink}: "개인 이메일" → 8 아래 `text-input` 440 × 48, placeholder "name@example.com"({colors.text-faint}, {typography.body})
4. (16 아래) 라벨 "비밀번호" → `text-input` 440 × 48, placeholder "비밀번호를 입력하세요", 오른쪽 안쪽 16에 보기 토글 아이콘 icon/eye 20({colors.text-muted}, 터치 영역 44 × 44). 누르면 icon/eye-off + 글자 보임.
5. (12 아래) `button-primary` "로그인" 440 × 44. 기본 상태(두 칸이 비어 있음)는 비활성: 채움 {colors.hairline} + 글자 {colors.text-muted}(비활성 컨트롤이라 대비 기준 예외). 두 칸이 다 채워지면 {colors.ink} 채움 + {colors.on-primary} 글자.
6. (24 아래) 텍스트 링크 "비밀번호 찾기" {typography.body-sm} {colors.text-muted}, 가운데 정렬, 터치 영역 높이 44 → 상태 S3(비밀번호 찾기).
7. (48 아래) 가운데 정렬 한 줄: "아직 회원이 아니신가요?" {typography.body-sm} {colors.text-muted} + 8 간격 + `button-pill-soft` "회원가입 ›"(높이 44, {colors.canvas-soft} 채움, 글자 {typography.link} {colors.ink}, › = icon/chevron-right 16 {colors.accent}).
- 포커스 상태는 `text-input-focused`(2px {colors.ink} 링). 입력칸에 평소 테두리는 없어요.

### P3. 오른쪽 반 — 서비스 소개 패널 (x 720~1440, y 64~900) — 바꾸는 부분

- 바탕 {colors.canvas-soft}, 안쪽 패딩 {spacing.section-lg} 64 → 내용 폭 592. 내용 묶음은 패널 안에서 세로 가운데(캡처처럼 제목이 y 약 200).
- 구조는 lab-stock 그대로(제목 + 리드 + 카드 4장), 내용만 진학 내비로 바꿔요.

1. 제목 {typography.heading-2} Bold 700 {colors.ink}: "우리 반 진학 상담, 한 화면에서 이어 봐요"
2. 리드(8 아래) {typography.body-lg} Light 300 {colors.text-muted}: "학생이 보낸 상담카드·성적을 모아 수능 최저·수시 6장을 한눈에 봐요" (두 줄 허용, 단어 사이에서만 줄바꿈)
3. (24 아래) 소개 카드 4장, 세로 나열, 사이 12. 컴포넌트 목록에 없는 요소라 design.md Elevation Level 2(흰 바탕 + 1px 외곽선) 규칙으로 조합해요.
   - 카드: 592 × 약 96, {colors.canvas} 채움 + 1px {colors.hairline-soft}, 모서리 0, 그림자 없음, 패딩 {spacing.lg} 24.
   - 왼쪽 아이콘 24 {colors.accent}(design.md "강조 아이콘" 허용), 아이콘 오른쪽 16 띄워 글 묶음.
   - 카드 제목 {typography.heading-4} Bold 700 {colors.ink}, 4 아래 설명 {typography.body-sm} {colors.text-muted}.

| # | 아이콘(예) | 제목 | 설명 |
|---|---|---|---|
| 1 | icon/school (건물) | 학교별 분리 | 우리 학교·우리 반 학생 기록만 보여요. 학생은 번호·별칭으로만 저장해요 |
| 2 | icon/map-pin | NEIS 학교 선택 | 회원가입 때 시/도 → 지역 → 학교급 → 학교 순서로 우리 학교를 골라요 |
| 3 | icon/qr | 상담카드 수합 | 학생이 보낸 QR·파일 상담카드를 한 표로 모아요 |
| 4 | icon/check-list | 수능 최저 충족 현황 | 반 학생의 수능 최저 충족 현황을 한눈에 정리해요. 예측이 아니에요 |

4. (카드 아래 24) 캡션 {typography.caption} {colors.text-muted}: "학생은 로그인 없이 써요. 상담카드는 QR·파일로 선생님께 보내요"

- 문구 점검: 예측·가능성 표현 없음, "예상" 대신 "충족 현황"(design.md 수능 최저 규칙). NEVER-2 금지어(rules forbidden_words) 0개.

---

## 모바일 390 × 844

lab-stock 모바일 캡처 그대로예요. 소개 패널·탭바·사이드바 없음. 좌우 여백 20({spacing.card}), 바탕 {colors.canvas}.

### M1. 상단 `nav-pill` (y 16, 350 × 48)

- {colors.canvas-soft} 채움, 모서리 0, 그림자 없음. 왼쪽 패딩 24에 워드마크 "진학 내비" {typography.heading-4} Bold 700. 오른쪽 링크·버튼 없음(캡처 그대로).

### M2. 로그인 폼 카드 (y 88, 폭 350)

- {colors.canvas} + 1px {colors.hairline-soft}, 모서리 0, 패딩 24 → 안쪽 폭 302.
1. 제목 {typography.heading-2} 22 Bold: "로그인"
2. 부제(4 아래) {typography.body-lg} 17 Light 300 {colors.text-muted}: "개인 이메일로 로그인하세요"
3. (24 아래) 라벨 "개인 이메일" {typography.label} → `text-input` 302 × 48, placeholder "name@example.com"
4. (16 아래) 라벨 "비밀번호" → `text-input` 302 × 48, placeholder "비밀번호를 입력하세요" + 보기 토글 icon/eye(터치 영역 44 × 44)
5. (16 아래) `button-primary` "로그인" 302 × 52(모바일 높이), 입력 전 비활성(PC와 같은 비활성 모양)
6. (16 아래) "비밀번호 찾기" {typography.body-sm} {colors.text-muted}, 가운데, 터치 영역 44

### M3. 회원가입 줄 (카드 아래 24)

- 가운데 정렬: "아직 회원이 아니신가요?" {typography.body-sm} {colors.text-muted} + `button-pill-soft` "회원가입 ›"(높이 44, › {colors.accent}).
- 그 아래는 빈 흰 바탕(캡처 그대로).

---

## 상태 프레임 (03-draft.json `states` 키, frames에는 넣지 않음)

G3는 login/390 · login/1440 두 프레임만 세요. 상태 프레임 이름은 그 패턴과 겹치지 않게 login:상태-폭 형식(예: login:error-1440)으로 짓고, 같은 페이지 오른쪽이나 별도 페이지 "login 상태"에 둬요. 모두 PC 1440 셸(머리줄 + 왼쪽 폼 + 오른쪽 같은 소개 패널)에서 왼쪽 폼만 바뀌어요. 모바일은 같은 폼 카드 안에서 똑같이 바뀌어요(따로 그리지 않음).

문구 원칙: lab-stock 원문(app/login/login-form.tsx, /forgot-password)을 그대로 옮겨요. 아래에 "원문"이라고 적은 것은 확인된 원문이고, "초안"이라고 적은 것은 S3에서 lab-stock 원문을 확인해 다르면 원문으로 바꿔요(새 문구를 지어내지 않기 위함).

### S1. login:error-1440 — 비밀번호 틀림

- 두 칸 입력됨(이메일 "teacher@example.com", 비밀번호 ●●●●●●●●), "로그인" 버튼 활성(ink).
- 비밀번호 칸 `text-input-error`(2px {colors.judge-risk} 링), 칸 아래 8에 icon/alert 14 + {typography.caption} {colors.judge-risk} 원문: "이메일 또는 비밀번호가 올바르지 않아요."
- 오류 = 색 + 아이콘 + 글자(design.md Accessibility).
- 같은 자리 다른 문구(프레임 없음, 원문): 서버 오류 "서버에 연결하지 못했어요. 잠시 후 다시 시도하세요." / 메일 링크 만료 안내 / 학교 정보 없는 계정 안내(둘은 login-form.tsx 원문).

### S2. login:unverified-1440 — 메일 미확인 안내

- 로그인 버튼 위(비밀번호 칸 아래 12)에 안내 띠: {colors.canvas-soft} 채움, 모서리 0, 패딩 12 16, 왼쪽 icon/info 16 {colors.accent} + {typography.body-sm} {colors.ink} 원문 "아직 이메일 확인이 끝나지 않았어요…"(뒷부분은 login-form.tsx 원문 그대로).
- 오류가 아니라 안내라서 위험 색을 쓰지 않아요. {colors.accent-soft}는 선택 전용이라 띠 채움에 쓰지 않아요.
- 원문에 "확인 메일 다시 보내기" 같은 동작이 있으면 띠 안 오른쪽에 텍스트 링크로 둬요(없으면 두지 않음).

### S3. login:forgot-1440 — 비밀번호 찾기

1. 제목 {typography.heading-2}: "비밀번호 찾기"
2. 부제 {typography.body-lg} Light {colors.text-muted} 초안: "가입한 개인 이메일로 재설정 링크를 보내요"
3. 라벨 "개인 이메일" → `text-input` 440 × 48, placeholder "name@example.com"
4. `button-primary` 초안 "재설정 메일 보내기", 입력 전 비활성
5. 아래 가운데 텍스트 링크 "로그인으로 돌아가기"(초안) {typography.body-sm} {colors.text-muted}

### S4. login:forgot-sent-1440 — 메일 보냄 안내

- 제목 "비밀번호 찾기" 유지, 폼 대신 안내 띠(S2와 같은 모양, icon/info) 초안: "teacher@example.com으로 재설정 메일을 보냈어요. 메일의 링크를 눌러 새 비밀번호를 정하세요"
- 아래 `button-outline` "로그인으로 돌아가기"(초안) 440 × 44. 주요 버튼 없음.

### S5. login:reset-1440 — 새 비밀번호 정하기(메일 링크로 들어온 화면)

1. 제목 초안 "새 비밀번호 정하기" + 부제 초안 "8자 이상으로 정하세요"
2. 라벨 "새 비밀번호" → `text-input` placeholder "8자 이상 입력하세요" + 보기 토글
3. 라벨 "새 비밀번호 확인" → `text-input` placeholder "비밀번호를 한 번 더 입력하세요"
4. `button-primary` 초안 "비밀번호 바꾸기", 입력 전 비활성
- 확인 불일치·8자 미만은 `text-input-error` + 위험 색 캡션(문구는 원문).

### S6. login:reset-done-1440 — 재설정 완료 안내(로그인 화면으로 돌아옴)

- 기본 로그인 폼(P2) 그대로, 부제 아래 16에 완료 띠: {colors.judge-safe-bg} 채움 + icon/check 16 {colors.judge-safe} + {typography.body-sm} {colors.judge-safe} 원문 "비밀번호를 바꿨어요. 새 비밀번호로 로그인하세요."
- 완료는 안정 색 쌍(design.md Semantic). 색 + 아이콘 + 글자를 함께 써요.

---

## 03-draft.json 메모

- frames: login/390, login/1440 두 개만.
- states: S1~S6 (이름 login:error-1440, login:unverified-1440, login:forgot-1440, login:forgot-sent-1440, login:reset-1440, login:reset-done-1440).
- 쓰는 컴포넌트: `nav-pill`, `text-input`, `text-input-focused`, `text-input-error`, `button-primary`, `button-outline`, `button-pill-soft`.
- 목록에 없어서 조합으로 그리는 요소: 상단 머리줄(P1), 소개 카드(P3), 안내 띠·완료 띠(S2·S4·S6). 노드 이름에 새 컴포넌트 이름을 붙이지 않아요.
