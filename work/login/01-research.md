# login — 01 리서치 (S1, 2026-11-18)

대상: 교사·관리자 로그인 (+ 비밀번호 찾기·재설정 상태). 학생은 로그인 없음.
사용자 결정(2026-11-18): "로그인은 lab-stock-app.vercel.app의 기능과 시안을 그대로 유지해서, 그 옆 부분(PC 오른쪽 서비스 소개 패널)만 바꿔줘."
기본 레퍼런스 = lab-stock-app 자체(L1~L5). uibowl은 바꾸는 부분(소개 패널)과 상태 화면용(L6~L13).
정리 메모: work/_ref/lab-stock-auth.md · 캡처 work/_ref/lab-stock-auth/login-1440.png, login-390.png · 예정 문장 work/_pending/apply5.py

## 레퍼런스

- [L1] lab-stock-app — 로그인 PC·모바일(가져올 원본: 반 나눔 폼 + 회색 소개 패널, 모바일 nav-pill + 폼 카드) — https://lab-stock-app.vercel.app/login
- [L2] lab-stock-app — 비밀번호 찾기(메일 발송 → 재설정 → 변경 완료 안내) — https://lab-stock-app.vercel.app/forgot-password
- [L3] lab-stock-app 소스 — 로그인 폼(입력 전 버튼 비활성, 보기 토글, 오류·메일 미확인 문구) — https://github.com/scieum/lab-stock-app/blob/main/app/login/login-form.tsx
- [L4] lab-stock-app 소스 — 소개 패널 AuthIntro(제목 + 리드 + 카드 4장, 바꿀 부분의 구조) — https://github.com/scieum/lab-stock-app/blob/main/app/auth-intro.tsx
- [L5] lab-stock-app — 회원가입(로그인의 "회원가입 ›" 이동 대상) — https://lab-stock-app.vercel.app/signup
- [L6] 다비치마켓 — PC 로그인: 한쪽 넓은 패널에 서비스 소개(헤드라인·프로모 카드·앱 내려받기 QR), 다른 쪽에 로그인 폼 — https://uibowl.io/website/%EB%8B%A4%EB%B9%84%EC%B9%98%EB%A7%88%EC%BC%93?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85
- [L7] 뮤즈바이 Museby — PC 로그인: 왼쪽 반 폼, 오른쪽 반 브랜드 패널(워드마크 + 한 줄 소개) — https://uibowl.io/website/%EB%AE%A4%EC%A6%88%EB%B0%94%EC%9D%B4%20Museby?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85
- [L8] 피처링 — PC 가입: 왼쪽 폼, 오른쪽 옅은 패널에 헤드라인 + 기능 화면 썸네일 격자 — https://uibowl.io/website/%ED%94%BC%EC%B2%98%EB%A7%81?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmuz1e322002fjp04040gei4c
- [L9] 핵클 — 비밀번호 찾기: 가운데 카드에 제목 + 한 줄 안내 + 이메일 1칸 + 입력 전 비활성 버튼 — https://uibowl.io/website/%ED%95%B5%ED%81%B4?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmvymv0vc0006ju08c0og8rd8
- [L10] 세이브티커 — 비밀번호 찾기 흐름 8화면(메일 입력 → 발송 안내 → 재설정) — https://uibowl.io/website/%EC%84%B8%EC%9D%B4%EB%B8%8C%ED%8B%B0%EC%BB%A4?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&imgId=cmvymeriw000nl508hqw2undu
- [L11] 잔디 — PC 로그인: 상단 머리줄 왼쪽 워드마크, 오른쪽 "회원가입" 채움 버튼(lab-stock 머리줄과 같은 구조) — https://uibowl.io/website/%EC%9E%94%EB%94%94?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&patternName=%EB%A1%9C%EA%B7%B8%EC%9D%B8
- [L12] 서울국제도서전(교육&도서) — PC 로그인: 환영 문구 아래 회원/비회원 이용을 두 칸으로 나눠 안내 — https://uibowl.io/website/%EC%84%9C%EC%9A%B8%EA%B5%AD%EC%A0%9C%EB%8F%84%EC%84%9C%EC%A0%84?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85&patternName=%EB%A1%9C%EA%B7%B8%EC%9D%B8
- [L13] 리디(교육&도서) — 로그인·회원가입 12화면(오류·완료 안내, 이메일 인증 안내 포함) — https://uibowl.io/website/%EB%A6%AC%EB%94%94?patterns=%EB%A1%9C%EA%B7%B8%EC%9D%B8%C2%B7%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85

uibowl 검색어: 로그인(PC·교육&도서), 회원가입(PC), 로그인(PC·비즈니스툴), OCR "비밀번호 재설정"(PC), OCR "이메일 인증"(회원가입), OCR "선생님 로그인"(관련 결과 없음 — 교사 전용 로그인 사례는 못 찾음).

## 반영 포인트

- P1: 폼·흐름·문구는 lab-stock 그대로 — 제목 "로그인" + 부제 "개인 이메일로 로그인하세요", 개인 이메일·비밀번호(눈 아이콘 보기 토글) `text-input`, "로그인" `button-primary`(입력 전 비활성), "비밀번호 찾기" 링크, "아직 회원이 아니신가요? [회원가입 ›]" `button-pill-soft`. 바뀌는 것은 워드마크 "진학 내비", 모서리 0(입력칸·버튼·카드 알약 모양 없앰), 글꼴 IBM Plex Sans KR, 색 토큰(주요 버튼 = ink 채움)뿐이다. [근거: L1, L3]
- P2: PC 1440 셸 그대로 — 상단 머리줄(왼쪽 워드마크, 오른쪽 "회원가입" 버튼) + 왼쪽 반 720(폼 폭 440, 가운데) + 오른쪽 반 720 소개 패널({colors.canvas-soft}). 모바일 390은 `nav-pill`(워드마크) + 폼만, 소개 패널·탭바·사이드바 없음. 주의: 상단 머리줄은 rules/design-rules.json components에 없다(apply5.py는 design.md에 문장만 추가) → S2에서 기존 컴포넌트로 조합하거나 "design.md 수정 제안"으로 멈출 것. [근거: L1, L11]
- P3: 바꾸는 부분 = 오른쪽 소개 패널. lab-stock 구조(제목 heading-2 700 + 리드 body-lg 300 {colors.text-muted} + 흰 카드 4장: 아이콘 + 제목 + 설명, padding 64, 사이 24)는 유지하고 내용만 교체한다. 카드는 모서리 0, {colors.canvas} + 1px {colors.hairline-soft}, 그림자 없음, 아이콘은 Route Blue(design.md "강조 아이콘" 허용). 반 나눔 화면에서 한쪽 패널이 서비스 가치를 말하는 구성은 L6·L7·L8 공통. 카드 컴포넌트 이름(feature-card 없음)은 S2에서 결정. [근거: L4, L6, L7, L8]
- P4: 소개 패널 문구 초안(교사 시점) — 제목 "우리 반 진학 상담, 한 화면에서 이어 봐요" / 리드 "학생이 보낸 상담카드·성적을 모아 수능 최저·수시 6장을 한눈에 봐요" / 카드 ① 학교별 분리 "우리 학교·우리 반 학생 기록만 보여요. 학생은 번호·별칭으로만 저장해요" ② NEIS 학교 선택 "시/도 → 지역 → 학교 순서로 우리 학교를 골라요" ③ 상담카드 수합 "학생이 보낸 QR·파일 카드를 한 표로 모아요" ④ 수능 최저 충족 현황 "반 학생의 최저 충족 현황을 규칙으로 정리해요. 예측이 아니에요". NEVER-2(rules forbidden_words) 표현 금지, "예상" 대신 "충족 현황". [근거: L4, L8]
- P5: 학생 안내 한 줄을 소개 패널 맨 아래에 caption으로 — "학생은 로그인 없이 써요. 카드는 QR·파일로 선생님께 보내요". 로그인 화면에서 회원/비회원 이용 경로를 따로 안내하는 사례(L12). 폼은 건드리지 않는다. [근거: L12, L1]
- P6: 관리자는 같은 로그인 화면 — 역할 탭·세그먼트를 두지 않고, 화면에 "관리자" 문구도 넣지 않는다. 역할은 서버에서만 지정(가입으로 얻을 수 없음), 로그인 뒤 역할에 따라 이동. lab-stock도 로그인 폼은 하나. [근거: L1, L3]
- P7: 오류·안내 문구는 lab-stock 소스 문구 그대로 — "이메일 또는 비밀번호가 올바르지 않아요." / "아직 이메일 확인이 끝나지 않았어요…"(메일 미확인) / 메일 링크 만료 안내 / 학교 정보 없는 계정 안내 / "서버에 연결하지 못했어요. 잠시 후 다시 시도하세요." / "비밀번호를 바꿨어요. 새 비밀번호로 로그인하세요."(변경 완료). 오류는 `text-input-error` + 위험 색 쌍 글자, 완료 안내는 안정 색 쌍(design.md). 새 문구를 지어내지 말고 login-form.tsx에서 원문을 옮긴다. [근거: L3, L1, L13]
- P8: 비밀번호 찾기·재설정은 상태 프레임 — 같은 반 나눔 셸·같은 소개 패널을 두고 왼쪽 폼만 바꾼다: ① 찾기(제목 + 한 줄 안내 + 개인 이메일 + 보내기 버튼, 입력 전 비활성) ② 메일 보냄 안내 ③ 새 비밀번호 + 확인 ④ 변경 완료 → 로그인(P7 완료 문구). 핵클·세이브티커도 제목 + 한 줄 안내 + 이메일 1칸 + 버튼의 단일 폼. G3는 `login/390`·`login/1440` 정확히 2개만 세므로 상태 프레임은 03-draft.json frames에 넣지 않는 이름으로(S2/S3 결정). [근거: L2, L9, L10]

## 열린 결정(사람)
- 상단 머리줄 컴포넌트가 design.md에 없음 → design.md 수정 제안 필요 여부.
- 소개 카드 컴포넌트 이름(현재 목록에 없음).
- 소개 패널 문구 최종안(P4·P5).
