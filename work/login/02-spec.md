# 02-spec — 로그인 (login)

> 근거: 사용자 결정(2026-11-18) "lab-stock-app의 기능과 시안을 그대로 유지, 그 옆 부분(PC 오른쪽 소개 패널)만 바꿔서"
> 개정(2026-11-23 사용자 결정): "로그인도 2x2로 맞춰줘" + signup 개정("메일은 없앴어! 메일 대신 아이디로 가입할거임") → ① 소개 카드 4장을 signup과 같은 2×2 격자로 ② 이메일 로그인·메일 확인·메일 비밀번호 찾기 삭제, 아이디 로그인
> 개정(2026-11-23 사용자 결정 2): NEIS 카드 설명을 앱 문구 "회원가입 때 시/도와 학교 이름으로 우리 고등학교를 골라요"로(signup과 같음)
> 앱 기준: app/src/screens/Auth.tsx(Login), app/src/domain/auth.ts(validId), app/src/io/account.ts(오류 문구)
> 레퍼런스: work/_ref/lab-stock-auth.md, 캡처 login-1440.png · login-390.png, 01-research.md 반영 포인트 P1~P8
> 필수 컴포넌트: login은 requires_trace_accordion · requires_disclaimer_note 대상이 아니에요(환산·판정이 나오지 않는 화면).

## 공통 원칙

- 폼 배치는 lab-stock 캡처를 따르되, 칸과 문구는 앱(아이디 로그인)에 맞춰요. 바뀌는 것: 로고 `brand-logo`(U:NAVI, 글자 워드마크를 따로 만들지 않음), 모서리 0, 글꼴 IBM Plex Sans KR(Light 300 · Regular 400 · SemiBold 600 · Bold 700), design.md 색 토큰, 오른쪽 소개 패널 내용(2×2), 이메일 → 아이디.
- 메일을 쓰지 않아요: 이메일 입력·메일 확인 안내·비밀번호 찾기 메일·재설정 링크 화면 없음. 비밀번호를 잊으면 관리자에게 초기화를 요청해요(폼 아래 안내 한 줄).
- 대상은 교사·관리자예요. 관리자도 같은 화면이고 역할 선택(탭·세그먼트)도, "관리자" 문구도 두지 않아요. 역할은 서버에서만 정해져서 로그인 뒤 역할에 따라 이동해요(교사 → 교사 학급 대시보드, 관리자 → 규칙 편집기). 학생은 로그인하지 않아요.
- 로그인 전 화면이라 탭바·사이드바·sub-nav 없음(`tab-bar-pill`, `sidebar` 쓰지 않음).
- 색: 주요 버튼 = {colors.ink} 채움. Route Blue({colors.accent})는 강조 아이콘(소개 카드 아이콘, 회원가입 버튼의 › 화살표, 안내 띠 정보 아이콘)에만 써요. 판정 색은 오류(위험 쌍) 상태에서만 나와요.
- 그림자 없음. 숫자는 고정폭, 자간 0.
- 한 화면 주요 버튼 1개 규칙(design.md Buttons): 머리줄 "회원가입"은 `button-outline`, 폼의 "로그인"이 유일한 `button-primary`.
- 아이콘 이름(icon/info, icon/eye, icon/eye-off, icon/chevron-right, icon/alert, icon/users, icon/search, icon/qr-code, icon/check 등)은 S3에서 Figma 파일에 있는 아이콘으로 맞춰요.

---

## PC 1440 × 900

위에서 아래, 왼쪽에서 오른쪽 순서예요. 전체 바탕 {colors.canvas}.

### P1. 상단 머리줄 (높이 64, 전체 폭)

- design.md "로그인·회원가입" web-header 조합: 바탕 {colors.canvas}, 아래 1px {colors.hairline-soft}. 좌우 패딩 32.
- 왼쪽: `brand-logo`(U:NAVI) → 누르면 홈.
- 오른쪽: `button-outline` "회원가입"(높이 44, 좌우 {spacing.md}, {typography.link}) → 회원가입 화면.

### P2. 왼쪽 반 — 로그인 폼 (x 0~720, y 64~900, 바탕 {colors.canvas})

폼 폭 440, 왼쪽 반 안에서 가로 가운데(x 140~580). 폼 위쪽 시작 y 128.

1. 제목 {typography.heading-2} Bold 700 {colors.ink}: "로그인"
2. 부제(8 아래) {typography.body-lg} Light 300 {colors.text-muted}: "아이디로 로그인하세요"
3. (32 아래) 라벨 {typography.label} {colors.ink}: "아이디" → 8 아래 `text-input` 440 × 48, placeholder "아이디를 입력하세요"({colors.text-faint}, {typography.body}). 자동 대문자 끔(구현 메모).
4. (16 아래) 라벨 "비밀번호" → `text-input` 440 × 48, placeholder "비밀번호를 입력하세요", 오른쪽 안쪽 16에 보기 토글 icon/eye 20({colors.text-muted}, 터치 영역 44 × 44). 누르면 icon/eye-off + 글자 보임.
5. (12 아래) `button-primary` "로그인" 440 × 44. 두 칸 중 하나라도 비면 비활성: 채움 {colors.hairline} + 글자 {colors.text-muted}(비활성 컨트롤이라 대비 기준 예외). 두 칸이 다 채워지면 {colors.ink} 채움 + {colors.on-primary} 글자.
6. (16 아래) 가운데 안내 한 줄 {typography.caption} {colors.text-muted}: "비밀번호를 잊으면 관리자에게 초기화를 요청해 주세요." (링크·버튼 아님)
7. (48 아래) 가운데 정렬 한 줄: "아직 회원이 아니신가요?" {typography.body-sm} {colors.text-muted} + 8 간격 + `button-pill-soft` "회원가입 ›"(높이 44, 글자 {typography.link} {colors.ink}, › = icon/chevron-right 16 {colors.accent}).
- 포커스 상태는 `text-input-focused`(2px {colors.ink} 링). 입력칸에 평소 테두리는 없어요.

### P3. 오른쪽 반 — 서비스 소개 패널 (x 720~1440, y 64~900) — 2×2 격자, signup P3과 같음

- 바탕 {colors.canvas-soft}, 안쪽 패딩 {spacing.section-lg} 64 → 내용 폭 592. 내용 묶음은 패널 안에서 세로 가운데.

1. 제목 {typography.heading-2} Bold 700 {colors.ink}: "우리 반 진학 상담, 한 화면에서 이어 봐요"
2. (8 아래) 리드 {typography.body-lg} Light 300 {colors.text-muted}: "학생이 보낸 상담카드·성적을 모아 수능 최저·수시 6장을 한눈에 봐요"(두 줄 허용, 단어 사이에서만 줄바꿈)
3. (32 아래) 소개 카드 4장, **2열 × 2행 격자, 모두 같은 크기**:
   - 카드 290 × 180 고정, 가로·세로 사이 12(290 + 12 + 290 = 592).
   - 카드: {colors.canvas} 흰 카드, 선 없음(design.md Elevation 2 — {colors.canvas-soft} 바탕 위), 모서리 0, 그림자 없음, 패딩 24.
   - 카드 안 세로 쌓기, 위 정렬: 아이콘 24 {colors.accent} → (12 아래) 제목 {typography.heading-4} {colors.ink} → (8 아래) 설명 {typography.body-sm} {colors.text-muted}(폭 242, 최대 3줄).
   - 읽는 순서(왼→오, 위→아래):

| 자리 | 아이콘 | 제목 | 설명 |
|---|---|---|---|
| 왼쪽 위 | icon/qr-code | 상담카드 수합 | 학생이 보낸 QR·파일 상담카드를 한 표로 모아요 |
| 오른쪽 위 | icon/users | 학교별 분리 | 우리 학교·우리 반 학생 기록만 보여요. 학생은 번호·별칭으로만 저장해요 |
| 왼쪽 아래 | icon/search | NEIS 학교 선택 | 회원가입 때 시/도와 학교 이름으로 우리 고등학교를 골라요 |
| 오른쪽 아래 | icon/check | 수능 최저 충족 현황 | 반 학생의 수능 최저 충족 현황을 한눈에 정리해요. 예측이 아니에요 |

4. (24 아래) 캡션 {typography.caption} {colors.text-muted}: "학생은 로그인 없이 써요. 상담카드는 QR·파일로 선생님께 보내요"

- S3에서는 signup 시안의 소개 패널 묶음을 그대로 복사해 써요(문구·아이콘·크기·여백 일치).
- 문구 점검: 예측·가능성 표현 없음, "예상" 대신 "충족 현황". NEVER-2 금지어(rules forbidden_words) 0개.

---

## 모바일 390 × 844

소개 패널·탭바·사이드바 없음(2×2 변경은 PC만 해당). 좌우 여백 20({spacing.card}), 바탕 {colors.canvas}.

### M1. 상단 `nav-pill` (y 16, 350 × 48)

- {colors.canvas-soft} 채움, 모서리 0, 그림자 없음. 왼쪽 패딩 24에 `brand-logo`(U:NAVI). 오른쪽 비움.

### M2. 로그인 폼 카드 (y 88, 폭 350)

- {colors.canvas} + 1px {colors.hairline-soft}(흰 바탕 위 카드), 모서리 0, 패딩 24 → 안쪽 폭 302.
1. 제목 {typography.heading-2} 22 Bold: "로그인"
2. (4 아래) 부제 {typography.body-lg} 17 Light 300 {colors.text-muted}: "아이디로 로그인하세요"
3. (24 아래) 라벨 "아이디" → `text-input` 302 × 48, placeholder "아이디를 입력하세요"
4. (16 아래) 라벨 "비밀번호" → `text-input` 302 × 48, placeholder "비밀번호를 입력하세요" + 보기 토글(터치 영역 44 × 44)
5. (16 아래) `button-primary` "로그인" 302 × 52, 입력 전 비활성(PC와 같은 모양)
6. (16 아래) 가운데 안내 {typography.caption} {colors.text-muted}: "비밀번호를 잊으면 관리자에게 초기화를 요청해 주세요."

### M3. 회원가입 줄 (카드 아래 24)

- 가운데 정렬: "아직 회원이 아니신가요?" {typography.body-sm} {colors.text-muted} + `button-pill-soft` "회원가입 ›"(높이 44, › {colors.accent}).

---

## 상태 프레임 (03-draft.json `states` 키, frames에는 넣지 않음)

G3는 login/390 · login/1440 두 프레임만 세요. 상태 키는 signup과 같은 폭-상태 형식이에요. PC 1440 셸(머리줄 + 왼쪽 폼 + 오른쪽 2×2 소개 패널)에서 왼쪽 폼만 바뀌고, 모바일은 같은 폼 카드 안에서 똑같이 바뀌어요(따로 그리지 않음).

| 키 | 내용 | 바뀜 |
|---|---|---|
| 1440-error | 아이디·비밀번호 틀림 | 이메일 → 아이디 문구 |
| ~~unverified~~ | 메일 미확인 안내 | 삭제 |
| ~~forgot~~ · ~~forgot-sent~~ · ~~reset~~ · ~~reset-done~~ | 메일 비밀번호 찾기·재설정 | 삭제(관리자 초기화 안내 한 줄로 대체) |

### S1. 1440-error — 아이디·비밀번호 틀림

- 두 칸 입력됨(아이디 "kimteacher", 비밀번호 ●●●●●●●●), "로그인" 버튼 활성(ink).
- 비밀번호 칸 아래 8에 icon/alert 14 + {typography.caption} {colors.judge-risk} 앱 원문: "아이디 또는 비밀번호가 올바르지 않아요." 비밀번호 칸은 `text-input-error`(2px {colors.judge-risk} 링).
- 오류 = 색 + 아이콘 + 글자(design.md Accessibility).
- 같은 자리 다른 문구(프레임 없음, 앱 원문): 아이디 형식이 틀림 "아이디를 다시 확인해 주세요" / 서버 오류 "서버에 연결하지 못했어요. 잠시 후 다시 시도하세요." / 계정 확인 설정이 켜짐 "계정 확인이 아직 켜져 있어요. 관리자에게 알려 주세요." / 학교 정보 없는 계정 "학교 정보가 없는 계정이에요. 회원가입을 다시 해 주세요."

---

## 03-draft.json 메모

- frames: login/390, login/1440 두 개만(노드 346:262094 · 346:261947 고쳐 씀).
- states: 1440-error 하나.
- 쓰는 컴포넌트: `brand-logo`, `nav-pill`, `text-input`, `text-input-focused`, `text-input-error`, `button-primary`, `button-outline`, `button-pill-soft`.
- 목록에 없어서 조합으로 그리는 요소: 상단 머리줄(P1), 소개 카드 2×2(P3). 노드 이름에 새 컴포넌트 이름을 붙이지 않아요.
- S3 고칠 곳: P3 카드 세로 4장(592 × 96, 왼쪽 아이콘) → 2×2(290 × 180, 위 아이콘) + NEIS 카드 설명 앱 문구 / "개인 이메일" → "아이디" / "비밀번호 찾기" 링크 → 관리자 초기화 안내 한 줄 / 워드마크 → `brand-logo`.
