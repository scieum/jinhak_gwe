# 02-spec — 회원가입 (signup)

> 근거: 사용자 결정(2026-11-18) "lab-stock-app의 기능과 시안을 그대로 유지, 그 옆 부분(PC 오른쪽 소개 패널)만 바꿔서"
> 개정(2026-11-23 사용자 결정, S3 시안 455:60948 승인 전): "여기 2x2로 해주고, 메일은 없앴어! 메일 대신 아이디로 가입할거임" → ① 소개 카드 4장을 같은 크기 2×2 격자로 ② 이메일 입력·확인 메일 흐름 삭제, 아이디 + 비밀번호로 가입
> 개정(2026-11-23 사용자 결정 2): 학교 선택을 앱처럼 3단계(시/도 → 학교 이름 검색 → 학교 고르기, 고등학교만, 진행 막대 3칸)로. 지역·학교급 칸 삭제. NEIS 카드 설명은 앱 문구. 이미 쓰는 아이디 오류는 아이디 칸 아래(앱은 나중에 맞춤).
> 앱 기준: app/src/domain/auth.ts(SignupForm · checkSignup · 아이디 규칙), app/src/io/account.ts(중복 아이디 문구, 가입 뒤 바로 로그인), app/src/screens/Auth.tsx(학교 검색 · 가입 완료)
> 레퍼런스: work/_ref/lab-stock-auth.md, 캡처 signup-1440.png(모바일은 login-390.png 셸), 01-research.md 반영 포인트 P1~P8
> 필수 컴포넌트: signup은 requires_trace_accordion · requires_disclaimer_note 대상이 아니에요.

## 공통 원칙

- 폼 배치는 lab-stock 캡처를 따르되, 학교 선택과 계정 칸은 앱에 맞춰요. 바뀌는 것: 로고 `brand-logo`(U:NAVI), 모서리 0, 글꼴 IBM Plex Sans KR, design.md 색 토큰, 오른쪽 소개 패널 내용, 학교 선택 3단계(고등학교만), 이메일 → 아이디.
- 메일을 쓰지 않아요: 이메일 입력·확인 메일·메일 링크·비밀번호 찾기 메일 없음. 비밀번호를 잊으면 관리자에게 초기화를 요청해요(login 화면 안내 문구와 같음, signup 화면에는 따로 두지 않음).
- 가입자는 모두 고등학교 교사예요. 역할(교사/관리자)·학교급 선택을 두지 않아요. 관리자는 서버에서만 지정돼요. 학생 가입 경로 없음.
- 로그인 전 화면이라 탭바·사이드바·sub-nav 없음(`tab-bar-pill`, `sidebar` 쓰지 않음).
- 주요 버튼은 "가입하기" 하나(`button-primary`). 머리줄 "로그인"은 `button-outline`(캡처 그대로).
- Route Blue({colors.accent})는 강조 아이콘(안내 띠 정보 아이콘, 소개 카드 아이콘, › 화살표), 진행 막대 채움, 고른 학교 행의 체크 아이콘에만 써요. {colors.accent-soft}는 고른 학교 행 채움에만 쓰고 안내 띠에는 쓰지 않아요.
- design.md 규칙 때문에 캡처와 달라지는 점 3가지: ① 약관 체크 동그라미 → 직각 `checkbox` ② "1 학교 선택"과 "2 계정" 사이 구분선 → 빈 공간 48(Whitespace 원칙) ③ "필수" 표시 글자는 {colors.text-faint}가 아니라 {colors.text-muted}(읽어야 하는 글자).
- 아이콘 이름(icon/info, icon/eye, icon/chevron-down, icon/chevron-right, icon/check, icon/alert, icon/users, icon/search, icon/qr-code 등)은 S3에서 Figma 파일에 있는 아이콘으로 맞춰요.

### 공통 부품(목록에 없는 요소는 기존 규칙으로 조합)

- 드롭다운 칸(시/도): `text-input` 모양(field 채움, 높이 48) + 오른쪽 안쪽 16에 icon/chevron-down 16 {colors.text-muted}. 펼친 목록은 떠 있는 레이어라 노드 이름을 dropdown으로 두고 {shadow.overlay}를 써요(그림자 허용 목록).
- 학교 검색 칸: `text-input`(높이 48) + 오른쪽 안쪽에 검색 버튼 icon/search 20 {colors.text-muted}(터치 영역 44, 이름 "학교 찾기"). Enter로도 찾아요.
- 학교 검색 결과 목록: 검색 칸 아래 8에 펼쳐지는 목록(떠 있지 않음, 그림자 없음). {colors.canvas} + 1px {colors.hairline-soft}, 행 높이 56, 행 사이 1px {colors.hairline-soft}. 행: 학교 이름 {typography.title} {colors.ink} + 아래 {typography.caption} {colors.text-muted} "지역 · 주소". 고른 행은 {colors.accent-soft} 채움 + 오른쪽 icon/check 20 {colors.accent}(design.md 선택 행).
- 고른 학교 줄: 목록 아래 8에 {typography.caption} {colors.ink} "고른 학교: " + 학교 이름 SemiBold.
- 약관 체크: `checkbox` 20 × 20 직각, 꺼짐 = {colors.canvas} + 1px {colors.hairline}, 켜짐 = {colors.ink} 채움 + 흰 icon/check. 행 전체가 터치 영역(높이 44).
- 안내 띠: {colors.canvas-soft} 채움, 모서리 0, 패딩 12 16, 왼쪽 icon/info 16 {colors.accent} + {typography.body-sm} {colors.ink}.
- 진행 막대: 3칸(시/도 고름 · 학교 이름 두 글자 이상 · 학교 고름), 높이 4, 칸 사이 4, 빈 칸 {colors.hairline}, 채운 칸 {colors.accent}(design.md "진행 표시" 허용). 채운 단계 수만큼 왼쪽부터 채워요.
- 필드 라벨: {typography.label} {colors.ink} + 6 띄워 "필수" {typography.caption} {colors.text-muted}.
- 입력 오류 줄: 칸은 `text-input-error`(2px {colors.judge-risk} 링), 칸 아래 8에 icon/alert 14 + {typography.caption} {colors.judge-risk}. 색 + 아이콘 + 글자.

### 아이디 규칙(앱 auth.ts 그대로)

- 영문 소문자로 시작, 영문 소문자·숫자·. _ - 만, 4~20자. 입력하면 대문자는 소문자로 바꿔 넣어요.
- placeholder: "영문 소문자로 시작, 4~20자"
- 규칙 오류 문구: "아이디는 영문 소문자로 시작하고, 영문·숫자·. _ - 로 4~20자예요"
- 중복 오류 문구(서버 응답): "이미 쓰는 아이디예요. 다른 아이디를 정해 주세요" — 아이디 칸 아래에 보여요(앱은 지금 "가입하기" 위 한 줄, 나중에 spec에 맞춤).
- 비밀번호: 8자 이상. 확인 칸과 같아야 해요.

---

## PC 1440 × 900

가입 폼은 약 1200 높이라 900 프레임보다 길어요. 오른쪽 소개 패널은 고정, 왼쪽 폼 열만 세로 스크롤이고 프레임 아래에서 잘려요. 첫 화면에 "1 학교 선택" 전체(제목·안내 띠·진행 막대·시/도·학교 이름)가 다 보여야 해요.

### P1. 상단 머리줄 (높이 64, 전체 폭)

- 로그인 화면과 같은 조합(design.md "로그인·회원가입" web-header): {colors.canvas} + 아래 1px {colors.hairline-soft}, 좌우 패딩 32.
- 왼쪽 `brand-logo`(U:NAVI). 오른쪽 `button-outline` "로그인"(높이 44) → 로그인 화면.

### P2. 왼쪽 반 — 가입 폼 (x 0~720, 스크롤 영역 y 64~900)

폼 폭 440, 가로 가운데(x 140~580), 위쪽 시작 y 128. 입력칸 높이 48, 라벨→칸 8, 칸→다음 라벨 16.

1. 제목 {typography.heading-2} Bold 700: "회원가입"
2. 부제(8 아래) {typography.body-lg} Light 300 {colors.text-muted}: "우리 고등학교를 고르고 계정을 만드세요"

**1 학교 선택** (부제 아래 32)
3. 소제목 {typography.heading-4} Bold 700: "1 학교 선택"
4. (12 아래) 안내 띠 440 폭: "고른 학교의 기록만 보여요. 가입한 뒤에는 바꿀 수 없어요"
5. (12 아래) 진행 막대 3칸 — 기본 상태는 아무것도 고르지 않아 0칸 채움.
6. 라벨 "시/도" → 드롭다운 칸 placeholder "시/도 선택"(17개 시·도)
7. 라벨 "학교 이름" → 학교 검색 칸 placeholder "예: 한빛고" + 검색 버튼
8. 검색하면 칸 아래 학교 검색 결과 목록 → 행을 누르면 고른 행 표시 + "고른 학교: ○○고등학교" 줄. 기본 프레임은 검색 전이라 목록·고른 학교 줄 없음.
- 검색 안내 문구(같은 "입력 오류 줄" 모양, 학교 이름 칸 아래, 앱 원문): 시/도 안 고름 또는 두 글자 미만 "시/도를 고르고 학교 이름을 두 글자 이상 적어 주세요." / 결과 없음 "찾는 고등학교가 없어요. 이름을 다시 확인해 주세요."
- 여기까지 y 약 520에서 끝나요(첫 화면 안).

**2 계정** (학교 이름 칸 아래 48, 구분선 없음)
9. 소제목 {typography.heading-4}: "2 계정"
10. 라벨 "이름" + "필수" → `text-input` placeholder "이름을 입력하세요"
11. 라벨 "아이디" + "필수" → `text-input` placeholder "영문 소문자로 시작, 4~20자"
12. 라벨 "비밀번호" + "필수" → `text-input` placeholder "8자 이상 입력하세요" + 보기 토글 icon/eye 20 {colors.text-muted}(터치 영역 44)
13. 라벨 "비밀번호 확인" + "필수" → `text-input` placeholder "비밀번호를 한 번 더 입력하세요" + 보기 토글(같음)
- 900 프레임에서는 "2 계정"부터 아이디 칸 언저리까지 보이고 그 아래는 잘려요.

**약관** (확인 칸 아래 32)
14. 행 "모두 동의" {typography.title} SemiBold + 왼쪽 `checkbox`, 아래 1px {colors.hairline-soft} 구분선(같은 묶음 안 목록 구분).
15. 행 3개, 각 높이 44, 왼쪽 `checkbox` + {typography.body-sm} {colors.ink} + 오른쪽 icon/chevron-right 16 {colors.text-muted}(누르면 약관 보기 `modal`):
   - "서비스 이용약관 동의 (필수)"
   - "개인정보 수집·이용 동의 (필수)"
   - "만 14세 이상입니다 (필수)"
16. (32 아래) `button-primary` "가입하기" 440 × 44, {colors.ink} 채움(처음부터 활성, 누를 때 입력을 검사).
17. (32 아래) 가운데 한 줄: "이미 계정이 있으신가요?" {typography.body-sm} {colors.text-muted} + `button-pill-soft` "로그인 ›"(› {colors.accent}).
18. 아래 여백 64.

### P3. 오른쪽 반 — 서비스 소개 패널 (x 720~1440, y 64~900, 고정) — 2×2 격자

- 바탕 {colors.canvas-soft}, 패딩 64 → 내용 폭 592, 내용 묶음 세로 가운데.
1. 제목 {typography.heading-2} Bold 700: "우리 반 진학 상담, 한 화면에서 이어 봐요"
2. (8 아래) 리드 {typography.body-lg} Light 300 {colors.text-muted}: "학생이 보낸 상담카드·성적을 모아 수능 최저·수시 6장을 한눈에 봐요"
3. (32 아래) 소개 카드 4장, **2열 × 2행 격자, 모두 같은 크기**:
   - 카드 290 × 180 고정, 가로·세로 사이 12(290 + 12 + 290 = 592). 큰 카드·작은 카드 구분 없음.
   - 카드: {colors.canvas} 흰 카드, 선 없음(design.md Elevation 2 — {colors.canvas-soft} 바탕 위), 모서리 0, 그림자 없음, 패딩 24.
   - 카드 안 세로 쌓기, 위 정렬: 아이콘 24 {colors.accent} → (12 아래) 제목 {typography.heading-4} {colors.ink} → (8 아래) 설명 {typography.body-sm} {colors.text-muted}(폭 242, 최대 3줄 흘림). 네 카드의 아이콘·제목·설명 시작 위치를 같게 맞춰요.
   - 읽는 순서(왼→오, 위→아래):

| 자리 | 아이콘 | 제목 | 설명 |
|---|---|---|---|
| 왼쪽 위 | icon/qr-code | 상담카드 수합 | 학생이 보낸 QR·파일 상담카드를 한 표로 모아요 |
| 오른쪽 위 | icon/users | 학교별 분리 | 우리 학교·우리 반 학생 기록만 보여요. 학생은 번호·별칭으로만 저장해요 |
| 왼쪽 아래 | icon/search | NEIS 학교 선택 | 회원가입 때 시/도와 학교 이름으로 우리 고등학교를 골라요 |
| 오른쪽 아래 | icon/check | 수능 최저 충족 현황 | 반 학생의 수능 최저 충족 현황을 한눈에 정리해요. 예측이 아니에요 |

4. (24 아래) 캡션 {typography.caption} {colors.text-muted}: "학생은 로그인 없이 써요. 상담카드는 QR·파일로 선생님께 보내요"

- NEIS 카드 설명은 앱 문구(2026-11-23 결정 2), 나머지 3장은 지금 시안 그대로예요. 예측·가능성 표현 없음, NEVER-2 금지어(rules forbidden_words) 0개 확인.
- login P3과 같은 패널이에요(2026-11-23 사용자 결정 "로그인도 2x2로 맞춰줘"). 한쪽을 고치면 다른 쪽도 같이 고쳐요.

---

## 모바일 390 × 844

로그인 모바일과 같은 셸이에요. 소개 패널·탭바·사이드바 없음(2×2 격자 변경은 PC만 해당). 좌우 여백 20, 바탕 {colors.canvas}.

### M1. 상단 `nav-pill` (y 16, 350 × 48)

- {colors.canvas-soft}, 모서리 0, 왼쪽 패딩 24에 `brand-logo`(U:NAVI). 오른쪽 비움.

### M2. 가입 폼 카드 (y 88, 폭 350, 아래로 길어지고 스크롤)

- {colors.canvas} + 1px {colors.hairline-soft}(흰 바탕 위 카드), 모서리 0, 패딩 24 → 안쪽 폭 302. 입력칸 302 × 48, 라벨→칸 8, 칸→다음 라벨 12.
- 순서는 PC P2의 1~15와 같아요: 제목 "회원가입"(22) → 부제 → "1 학교 선택" → 안내 띠(두 줄로 흘림) → 진행 막대 3칸 → 시/도 → 학교 이름(검색 버튼, 결과 목록은 칸 아래 펼침) → "2 계정"(위 32) → 이름 → 아이디 → 비밀번호(보기 토글) → 비밀번호 확인(보기 토글) → 약관 4행(`checkbox`).
- 아이디 칸은 `text-input`이고 자동 대문자·자동 고침을 끄는 칸이에요(구현 메모).
- 첫 화면(844)에 "1 학교 선택" 전체가 보여야 해요(학교 이름 칸이 y 약 640 안쪽). "2 계정" 소제목부터 일부 보여도 돼요. 글자 크기는 줄이지 않아요.
- 약관 행의 ›를 누르면 상태 390-terms(약관 보기 `bottom-sheet`).
- `button-primary` "가입하기" 302 × 52.

### M3. 로그인 줄 (카드 아래 24)

- 가운데: "이미 계정이 있으신가요?" + `button-pill-soft` "로그인 ›"(높이 44).

---

## 가입 뒤 흐름

- "가입하기" → 입력 검사(앱 checkSignup) → 오류가 있으면 상태 1440-error.
- 서버가 "이미 쓰는 아이디"로 돌려주면 상태 1440-id-taken.
- 성공하면 **바로 로그인되어 교사 학급 대시보드(teacher-dashboard)로 이동**해요(앱 기본 동작, 따로 프레임 없음).
- 서버의 계정 확인 설정이 켜져 있어 바로 로그인되지 않을 때만 상태 1440-done("가입했어요")을 보여요.
- 확인 메일 보냄 상태(구 1440-sent)는 삭제해요.

---

## 상태 프레임 (03-draft.json `states` 키, frames에는 넣지 않음)

G3는 signup/390 · signup/1440 두 프레임만 세요. 상태 키는 지금 03-draft.json 형식(폭-상태)을 그대로 써요.

| 키 | 내용 | 바뀜 |
|---|---|---|
| 390-terms | 약관 보기 바텀시트(모바일) | 유지 |
| 1440-error | 입력 형식 오류 | 이메일 오류 → 아이디 규칙 오류로 바꿈 |
| 1440-id-taken | 중복 아이디 오류(아이디 칸 아래) | 새로 |
| 1440-done | 가입 완료(바로 로그인 안 될 때) | 새로 |
| ~~1440-sent~~ | 확인 메일 보냄 | 삭제(Figma 455:61337 프레임 지움) |

### S1. 390-terms — 약관 보기 (모바일)

- 가입 폼(M2) 위에 {colors.scrim} 막 + `bottom-sheet`: 위쪽 모서리 0, 손잡이 막대(40 × 4, {colors.hairline}), {shadow.overlay}, 높이 화면의 약 80%.
- 머리: 제목 {typography.heading-4} "서비스 이용약관"(누른 행의 약관 이름) + 오른쪽 닫기 아이콘(터치 영역 44).
- 본문: 약관 전문 {typography.body-sm} {colors.ink}, 이 영역만 스크롤(앱 임시 문구 "약관 전문은 서비스를 공개하기 전에 확정해 여기에 실어요.").
- 아래 고정 줄: `button-primary` "동의하기" 350 × 52 → 시트 닫힘 + 그 행 `checkbox` 켜짐. 하단 안전 영역 지킴.
- PC에서는 같은 내용이 `modal`(최대 폭 560, 아래 `button-outline` "닫기" + `button-primary` "동의하기")로 열려요(design.md "PC 모달 ↔ 모바일 바텀시트", 따로 그리지 않음).

### S2. 1440-error — 입력 형식 오류

- "가입하기"를 눌렀을 때 화면. 폼 열을 "2 계정"~"가입하기"가 보이게 스크롤한 상태로 그려요.
- 오류 칸은 공통 부품 "입력 오류 줄". 보여줄 오류(문구는 앱 auth.ts 원문):
  - 아이디: "아이디는 영문 소문자로 시작하고, 영문·숫자·. _ - 로 4~20자예요"(예시 입력값 "1teacher")
  - 비밀번호: "비밀번호를 8자 이상으로 입력해 주세요"
  - 비밀번호 확인: "비밀번호가 서로 달라요. 한 번 더 확인해 주세요"
  - 약관: 약관 묶음 아래 한 줄 "필수 약관에 동의해 주세요"(꺼진 `checkbox` 행은 그대로)
- 그리지 않지만 같은 규칙: 이름 빈칸 "이름을 입력해 주세요", 학교 안 고름 "학교를 골라 주세요"(학교 이름 칸 아래).

### S3. 1440-id-taken — 중복 아이디 오류

- 형식은 맞지만 서버에서 이미 있는 아이디라고 돌려준 화면. 폼 열 스크롤 위치는 S2와 같아요.
- 아이디 칸만 `text-input-error`(입력값 예 "kimteacher") + 칸 아래 8에 icon/alert 14 + "이미 쓰는 아이디예요. 다른 아이디를 정해 주세요". 다른 칸은 정상, 비밀번호 칸은 입력값(가림 점) 유지.
- "가입하기" 버튼은 다시 누를 수 있는 기본 상태.

### S4. 1440-done — 가입 완료(바로 로그인되지 않을 때)

- PC 셸 그대로(머리줄 + 오른쪽 소개 패널 2×2), 왼쪽 폼 자리만 바뀌어요. 문구는 앱 Auth.tsx 원문.
1. 제목 {typography.heading-2}: "가입했어요"
2. 부제 {typography.body-lg} Light {colors.text-muted}: "계정은 만들어졌지만 바로 로그인되지 않았어요. 관리자가 계정 확인 설정을 끄면 로그인할 수 있어요."
3. (32 아래) `button-primary` "로그인하러 가기" 440 × 44 → 로그인 화면.
- 메일 안내·스팸함 안내 없음.

---

## 03-draft.json 메모

- frames: signup/390, signup/1440 두 개만(노드 그대로, 455:61169 · 455:60949 고쳐 씀).
- states: 390-terms, 1440-error, 1440-id-taken, 1440-done. 1440-sent 키와 Figma 프레임 455:61337은 지워요.
- 쓰는 컴포넌트: `brand-logo`, `nav-pill`, `text-input`, `text-input-focused`, `text-input-error`, `checkbox`, `button-primary`, `button-outline`, `button-pill-soft`, `bottom-sheet`, `modal`.
- 목록에 없어서 조합으로 그리는 요소: 상단 머리줄, 소개 카드(2×2), 안내 띠, 진행 막대, 시/도 드롭다운 칸·목록, 학교 검색 결과 목록. 노드 이름에 새 컴포넌트 이름을 붙이지 않아요(펼친 시/도 목록 노드만 그림자 허용을 위해 dropdown).
- S3 고칠 곳: P3 카드 4장 2×2(290 × 180, 사이 12) + NEIS 카드 설명 / 학교 선택: 지역·학교급 칸과 학교급 세그먼트 삭제, "학교" 드롭다운 → "학교 이름" 검색 칸, 진행 막대 4칸 → 3칸(0칸 채움) / 부제 "우리 고등학교를…" / 계정 칸 "개인 이메일" → "아이디" / 상태 프레임 위 표대로 정리.
- login도 같은 2×2 소개 패널로 맞춰요(2026-11-23 사용자 결정, work/login/02-spec.md P3). S3에서 두 화면 패널을 같은 묶음으로 그려요.
- 앱이 나중에 맞출 점: 중복 아이디 문구를 "가입하기" 위 한 줄이 아니라 아이디 칸 아래로(2026-11-23 사용자 결정).
