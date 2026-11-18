# signup — 01 리서치 (S1, 2026-11-18)

대상: 교사 회원가입(학생은 가입·로그인 없음, 관리자는 가입으로 될 수 없음).
사용자 결정(2026-11-18): lab-stock-app 로그인·가입의 기능과 시안을 그대로 유지하고, PC 오른쪽 서비스 소개 패널만 바꾼다.
기본 레퍼런스 = lab-stock-app 자체(L1~L4). uibowl은 바꾸는 부분(소개 패널)·학교급·메일 확인용(L5~L10).
정리 메모: work/_ref/lab-stock-auth.md · 캡처 work/_ref/lab-stock-auth/signup-1440.png · 예정 문장 work/_pending/apply5.py

## 레퍼런스

- [L1] lab-stock-app — 회원가입 PC(반 나눔: 왼쪽 "1 학교 선택"·"2 계정"·약관 폼, 오른쪽 회색 소개 패널) — https://lab-stock-app.vercel.app/signup
- [L2] lab-stock-app 소스 — 가입 폼(시/도 → 지역 → 학교급 → 학교, 4단계 진행 막대, 필수 표시, 약관 열기, 오류 문구) — https://github.com/scieum/lab-stock-app/blob/main/app/signup/signup-form.tsx
- [L3] lab-stock-app 소스 — 소개 패널 AuthIntro(로그인과 공유, 바꿀 부분의 구조) — https://github.com/scieum/lab-stock-app/blob/main/app/auth-intro.tsx
- [L4] lab-stock-app — 로그인(가입 뒤 메일 확인 → 이동 대상, 모바일 390 셸 기준) — https://lab-stock-app.vercel.app/login
- [L5] 피처링 — PC 가입: 왼쪽 단계 표시 + 약관 동의 목록, 오른쪽 옅은 패널에 헤드라인 + 기능 화면 썸네일 격자 + 버튼 — https://uibowl.io/website/%ED%94%BC%EC%B2%98%EB%A7%81?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmuz1e322002fjp04040gei4c
- [L6] 다비치마켓 — PC 로그인·가입: 한쪽 넓은 패널에 서비스 소개(헤드라인·프로모 카드·앱 QR), 다른 쪽 폼 — https://uibowl.io/website/%EB%8B%A4%EB%B9%84%EC%B9%98%EB%A7%88%EC%BC%93?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85
- [L7] 뮤즈바이 Museby — PC 로그인·가입: 왼쪽 반 폼, 오른쪽 반 브랜드 패널(워드마크 + 한 줄 소개) — https://uibowl.io/website/%EB%AE%A4%EC%A6%88%EB%B0%94%EC%9D%B4%20Museby?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85
- [L8] 열품타 — 모바일 가입: 초/중/고 학교급·학년을 칩으로 고르는 단계 — https://uibowl.io/name/%EC%97%B4%ED%92%88%ED%83%80?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmq9613iq000ejv04xv68xieo
- [L9] 리디(교육&도서) — 로그인·가입 12화면(이메일 인증 안내, 약관, 오류·완료 상태) — https://uibowl.io/website/%EB%A6%AC%EB%94%94?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmuq7ehfa001tkz04eikwddkc
- [L10] 레드프린팅 — PC 가입: 한 열 폼에 이메일 인증 + 약관 체크 목록 + 가입 버튼 — https://uibowl.io/website/%EB%A0%88%EB%93%9C%ED%94%84%EB%A6%B0%ED%8C%85?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmqqnzg8i000bjv049r8cylyw

uibowl 검색어: 회원가입(PC), OCR "학교 선택"(회원가입), OCR "이메일 인증"(PC·회원가입), 로그인(PC·교육&도서/비즈니스툴).

## 반영 포인트

- P1: 폼 구성·순서·문구는 lab-stock 그대로 — 제목 "회원가입" + 부제 "우리 학교를 고르고 계정을 만드세요" → "1 학교 선택"(안내 띠 + 진행 막대 + 시/도 → 지역(시/군/구) → 학교 드롭다운) → "2 계정"(이름·개인 이메일·비밀번호 "8자 이상"+보기 토글·비밀번호 확인, 각 "필수" 표시, `text-input`) → 약관(모두 동의 / 서비스 이용약관(필수) / 개인정보 수집·이용(필수) / 만 14세 이상(필수), 각 › 열기) → "가입하기" `button-primary` → "이미 계정이 있으신가요? [로그인 ›]" `button-pill-soft`. 바뀌는 것은 워드마크 "진학 내비", 모서리 0, 글꼴 IBM Plex Sans KR, 색 토큰뿐. [근거: L1, L2]
- P2: 학교급(제안, 사람 결정) — lab-stock은 학교급 `segmented-control`(초·중·고)로 학교 목록을 거른다. 진학 내비는 고등학교 진학 서비스라 ⓐ 학교급 단계를 빼고 학교 목록을 고등학교만으로 거르기(진행 막대 4 → 3칸, 소개 카드 문구도 "시/도 → 지역 → 학교") 를 1안, ⓑ 세그먼트는 남기되 고등학교 기본 선택·초·중 비활성 을 2안으로 제안. 교육 앱도 가입 때 학교급을 고르는 단계가 있으나(L8) 진학 내비 교사에게는 선택지가 하나뿐이다. [근거: L2, L8]
- P3: "1 학교 선택" 안내 띠 "고른 학교의 기록만 보여요. 가입한 뒤에는 바꿀 수 없어요" — lab-stock은 연파랑 띠지만 design.md에서 accent-soft는 선택·여기 표시 전용이라 그대로 못 쓴다. 1안 {colors.canvas-soft} 띠 + Route Blue 정보 아이콘(강조 아이콘 허용), 2안 `warning-callout`(되돌릴 수 없는 결정이라 경고 성격). S2 결정. [근거: L1, L2]
- P4: PC 셸은 로그인과 동일 — 상단 머리줄(왼쪽 워드마크, 오른쪽 "로그인" 테두리 버튼 → `button-outline`) + 왼쪽 반 폼 440 + 오른쪽 반 {colors.canvas-soft} 소개 패널(로그인과 같은 내용·위치 재사용). 가입 폼은 1440×900보다 길다(캡처 약 1460 높이) — G3는 `signup/1440`을 정확히 1440×900으로 보므로 프레임 안에서 폼 영역만 잘리거나 스크롤로 보이게 하고 소개 패널은 위쪽에 고정(L5·L6·L7도 패널은 고정, 폼만 길어짐). 상단 머리줄은 design.md 컴포넌트 목록에 없음 → S2에서 조합 또는 design.md 수정 제안. [근거: L1, L5, L6, L7]
- P5: 소개 패널 = 로그인과 같은 초안 — 제목 "우리 반 진학 상담, 한 화면에서 이어 봐요" / 리드 "학생이 보낸 상담카드·성적을 모아 수능 최저·수시 6장을 한눈에 봐요" / 카드 4장(학교별 분리 · NEIS 학교 선택 · 상담카드 수합 · 수능 최저 충족 현황 "예측이 아니에요") + 맨 아래 caption "학생은 로그인 없이 써요". 카드: 모서리 0, 흰 바탕 + 1px {colors.hairline-soft}, 그림자 없음, 아이콘 Route Blue. NEVER-2(rules forbidden_words) 표현 금지. [근거: L3, L5]
- P6: 가입 뒤 흐름과 안내 — "가입하기" → 확인 메일 보냄 안내(메일함 확인 + 로그인으로) → 메일 링크 → 로그인. 메일 미확인으로 로그인하면 "아직 이메일 확인이 끝나지 않았어요…", 메일 링크 만료 안내는 lab-stock 문구 그대로. 입력 오류(이미 가입된 이메일, 8자 미만, 비밀번호 확인 불일치, 필수 약관 미동의)는 `text-input-error` + 입력칸 아래 위험 색 쌍 글자, 원문은 signup-form.tsx에서 옮기고 새로 짓지 않는다. 메일 확인 안내 상태는 G3 대상 2개 프레임 밖 이름으로. [근거: L2, L4, L9, L10]
- P7: 역할 — 가입 폼에 역할(교사/관리자) 선택을 두지 않는다. 가입자는 모두 교사, 관리자 역할은 서버에서만 지정(apply5.py 7-4). 학생 가입 경로도 없음. [근거: L1, L2]
- P8: 모바일 390 — 로그인 390과 같은 셸: `nav-pill`(워드마크) + 폼만(소개 패널·탭바 없음). 시/도·지역·학교 선택은 드롭다운(그림자 허용 목록 dropdown), 약관 › 열기는 `bottom-sheet` 또는 `modal`. [근거: L4, L1]

## 열린 결정(사람)
- P2 학교급: 1안(고등학교만, 단계 제거) / 2안(고등학교 기본 선택).
- P3 안내 띠 색: canvas-soft + 아이콘 / warning-callout.
- 상단 머리줄·소개 카드 컴포넌트가 design.md에 없음 → design.md 수정 제안 필요 여부.
- 교사 가입에도 "만 14세 이상(필수)" 약관을 그대로 둘지(lab-stock 그대로가 기본).
