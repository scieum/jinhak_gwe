# 02-spec — 전형 성향 탐색 (admission-style, 학생)

작성일 2026-11-23 · 개정 2026-11-24(배너 진입 · 캐릭터 길콩) · 담당 planner (S2)
근거: 01-research.md(G1 통과 — 0장 앱 기능 · 상태 · 팝업 목록, P1~P9, 4장 미결 1~8, **5절 2026-11-24 보강 L12~L22 · P10~P19 · 미결 9~13**), docs/design.md(App Shell, Responsive Strategy, Elevation, Shapes › 대학 표시, Components — filter-chip 변형 option · score-bar 변형 progress · button-primary 비활성 · 확인 창 · evidence-quote · data-status-badge · trace-accordion · disclaimer-note · bottom-sheet · modal · toast · share-sheet 변형 result · app-bar · brand-logo, Voice), docs/prd.md(6-1 탐색은 누구나, 13장), docs/story-service.md NEVER-1/2, 앱 구현(app/src/screens/AdmissionStyle.tsx, app/src/domain/admissionStyle.ts, app/src/components/StyleMascot.tsx, app/src/shell/nav.ts).
사용자 요청(채팅 원문): "그리고 시안에서 추가적으로 지금 안그린 기능들이나 추가적으로 그 안에서 팝업창 같은 것들도 더 그려봐"(2026-11-23) · "전형 성향 탐색에 캐릭터 넣어줘. 그리고 이건 따로 카테고리에 넣지 말고 그 배너처럼 있는게 좋을듯?"(2026-11-24)
2026-11-24 사용자 결정(채팅): 배너 = 홈 두 번째 블록(닫기 가능, X = 이번만 숨김 + toast로 다시 볼 곳 안내, "다시 보지 않기" 텍스트 버튼) + 전형계획 목록 위(닫기 없음, 상시 진입점). 길콩 = 원본 색 그대로(로고처럼 팔레트 예외), 캐릭터 그림에만. 배너 · 화면 바탕은 흑백. PNG 이미지 노드(guide + 결과 8포즈).
이 화면이 하는 일: 15문항 자기탐색 질문에 답하면 "준비 방식" 유형과 함께 살펴볼 전형 이름을 보여 주는 **체험판**이에요. 성적 · 입결 · 환산 숫자가 하나도 없고, 결과는 판정이 아니에요. 판정 색 · 판정 아이콘 · 점수 · 평균 · 백분위 · 순위를 쓰지 않아요.
프레임: admission-style/390 (390×844), admission-style/1440 (1440×900) = 소개 첫 화면. 상태 프레임 30장(5장).
필수 포함: rules requires_trace_accordion · requires_disclaimer_note **둘 다 이 slug가 있어요** → `trace-accordion`(결과 규칙 설명, D11) · `disclaimer-note`(소개 · 결과, D12)를 넣어요.

표기: **확정** = 앱 기능을 design.md 규칙으로 옮긴 것(planner 기본안) 또는 채팅에서 사용자가 정한 것. 이 설계서에 남은 [확인] 항목은 없어요. 단, 새 컴포넌트 2개(promo-banner · mascot-illustration)는 design.md에 없어서 **9장 제안이 design.md · rules에 반영되기 전에는 S3를 시작하지 않아요**(CLAUDE.md 금지 — 새 컴포넌트를 만들지 않고 제안으로 멈춤).

## 0. 결정

| # | 항목 | 결정 | 이유 |
|---|---|---|---|
| D1 | 이름 · 진입 · 셸 — 확정(2026-11-24 사용자 결정, 2026-11-23 메뉴 결정을 바꿈) | 화면 제목 = **"전형 성향 탐색"**. **메뉴 없음, 배너 진입**: 학생 대분류 "대학 찾기" 소분류에서 빼고, 홈 · 전형계획 목록의 띠 배너(promo-banner, D23)로만 들어가요. 화면은 배너 → 소개 → 15문항 → 결과로 이어지는 **독립 상세 화면**이에요. 모바일 = `app-bar`(왼쪽 ‹ 뒤로 = 들어온 화면으로, 가운데 제목, 오른쪽 `data-status-badge` "체험판 v0.1") + 본문 + `tab-bar-pill`(대학 찾기 선택), `sub-nav` 없음(design.md "상세 화면에는 sub-nav를 두지 않습니다"). PC = `sidebar`에서 대학 찾기 `sidebar-group`만 펼치고 `sidebar-item`은 **아무것도 선택하지 않아요**(대학 찾기 대분류 아래 상세 화면처럼), `page-header` 위 경로 caption "대학 찾기 › 전형 성향 탐색". 소분류 아이콘 icon/compass는 더 쓰지 않아요(9장 제안 1) | 사용자 지시. 메뉴에서 빠지므로 닫기 없는 진입점이 최소 1곳(전형계획 목록) 남아요(01-research 5-4, L12 · L13) |
| D2 | 색 — 확정 | 앱의 파스텔 장식색(연보라 · 민트 · 살구 · 크림 · 연한 하늘, admission-style.css)은 **모두 빼요.** 바탕 = Page {colors.canvas-soft}, 내용 = 테두리 없는 흰 카드, 글자 = 잉크 단계. 색은 Route Blue 하나만, **선택 · 진행 · 링크 표시에만**: 고른 선택지(accent-soft 채움 + 1px accent 테두리), 진행 막대 채움, `tab-bar-pill` 선택 표시, 링크. 준비 방식 5개 · 결과 카드는 색으로 구분하지 않고 번호 01~05 + 이름 + 포즈로 구분해요. **예외는 길콩 그림 안의 원본 색뿐**(D5) — 그림 밖 배경 · 테두리 · 글자에 길콩 색을 옮기지 않아요 | design.md Overview "색은 의미가 있을 때만", 사용자 지시 "배너 · 화면 바탕은 흑백 유지" |
| D3 | 판정 색 금지 — 확정 | 결과 화면 전체에 판정 색 4쌍(안정 · 적정 · 소신 · 위험) · 판정 아이콘(● ◐ ▲ ■ ✕) · 증감 색 · 등급 색 · 역량 색 · {colors.heart}를 쓰지 않아요. 경고 · 오류 색도 없어요. "처음부터 다시" · "그만두기"도 빨간 글자 버튼이 아니라 `button-outline`이에요. 배너에도 판정 색 옅은 짝(#e7f5ec · #e3f4f5 · #fdf1e3 · #fce9ea)을 쓰지 않아요 | 결과가 판정으로 읽히지 않게(NEVER-2), 01-research 5-3 |
| D4 | 숫자 금지 — 확정 | 앱 규칙이 안에서 쓰는 응답값 0~3 · 영역 평균 · 차이 0.5를 화면에 보여 주지 않아요. 결과에 하위 점수 · 막대 · 백분위 · 큰 숫자 · "○○ 높음" 문구 없음. 숫자는 문항 번호(01~15, n / 15)와 "15문항 · 약 3분"뿐이에요. 배너에도 숫자 배지 · % 없음 | NEVER-1 취지 · NEVER-2, 01-research L8 · L14 피할 사례 |
| D5 | 캐릭터 길콩 — 확정(2026-11-24 사용자 결정, 2026-11-23 "넣지 않음"을 바꿈) | **넣어요.** 길콩 PNG(투명 배경, 원본 색 · 비율 그대로)를 이미지 채움 노드 하나로 두고 레이어 이름은 mascot-illustration(9장 제안 3). 로고처럼 팔레트 예외라 색을 고치거나 변수에 연결하지 않아요. 그림자 · 둥근 배경 원 · 배경 도형 없음, 노드 모서리 0. 자리와 크기: 배너 guide 약 60 · 소개 guide 약 160 + 준비 방식 카드 포즈 48 · 문항 guide 40 + 말풍선 한 줄 · 결과 유형 포즈 390 약 180 / 1440 약 240 · 확인 창 위 guide 64. 포즈가 달라도 우열을 뜻하지 않게 같은 자리 같은 크기 | 사용자 지시, 01-research P15~P19 |
| D6 | 단계 · 화면 흐름 — 확정(앱) | 배너 → 소개 → 문항 15개(한 화면 한 문항) → 결과. 화면 이동 없이 같은 경로 안에서 단계만 바뀌어요. 답변은 메모리에만 있고 새로고침 · 뒤로 · 다른 메뉴로 가면 사라져요(앱 그대로) | 앱 0-1 |
| D7 | 선택지 모양 — 확정 | 선택지 5개 = 세로로 쌓은 `filter-chip` 변형 option(design.md 반영됨). off = {colors.canvas-soft} 채움, on = accent-soft 채움 + 1px accent 테두리 + 잉크 글자. 왼쪽 글자, 오른쪽 표시 "01"~"05"(고르면 "✓"). 다섯째 "아직 경험이 없거나 잘 모르겠어요" 위에 1px {colors.hairline-soft} 구분선 + 위아래 {spacing.xs}. 단일 선택(라디오) | 01-research P2 · P3 |
| D8 | 진행 표시 — 확정 | 문항 카드 위 "나를 알아가는 중" caption + 오른쪽 "7 / 15"(고정폭) → 아래 `score-bar` 변형 progress ① 단계 진행(높이 6, 트랙 {colors.canvas-soft}, 채움 {colors.accent}) | design.md score-bar 변형 progress |
| D9 | 다음 버튼 비활성 — 확정(앱) | 답이 없으면 `button-primary` "다음 문항"이 비활성: {colors.canvas-soft} 채움 + {colors.text-faint} 글자(design.md button-primary 비활성) | 앱 S-2 |
| D10 | 결과 4종 — 확정(앱) | focused(후보 1개 → 그 유형 이름) · mixed(후보 2개 이상 → "여러 길을 살피는 탐색가") · open(모든 평균 2 미만 → **"길을 열어 둔 탐색가"**) · insufficient(한 영역이라도 알려진 응답 2개 미만 → "경험을 더 알아가는 탐색가"). 결과 카드 = focused · mixed는 후보 전형만, open · insufficient는 5개 준비 방식 전부. 카드 눈썹 = 후보 **"탐색해 볼 전형"** / 그 밖 **"아직 열려 있는 길"**. 카드 순서 = 01~05 번호 순서(점수 순 아님). 결과 히어로 포즈 = focused는 그 유형 포즈, mixed · open · insufficient는 각자 포즈(1-1) | 앱 open 이름의 '가능성'을 '길'로, 눈썹 "탐색 추천"의 '추천'을 빼요. 순서가 서열로 읽히지 않게 |
| D11 | 규칙 설명 — 확정 | `trace-accordion` 제목 **"결과는 어떻게 정했나요?"**(design.md 반영됨). 펼친 내용 = 4장 T1. 규칙 문장만, 학생의 평균 · 합계 값 없음(D4). 마지막 굵은 줄 = 결과 유형 이름. 처음엔 접힘 | rules requires_trace_accordion 대상 |
| D12 | 고지 — 확정 | `disclaimer-note` 2곳: 소개 아래 · 결과 맨 아래(6장 문구). 앱 고지 마지막 문장 중 rules forbidden_words와 같은 뜻의 붙여 쓴 단어가 든 문장은 **"결과를 성적이나 입학 결과 예측으로 바꾸지 않아요"**로 바꿔요 | rules requires_disclaimer_note 대상, NEVER-2 |
| D13 | 영문 · 눈썹 — 확정 | 앱의 "NEXT STEP" 영문 대문자 눈썹을 빼고 섹션 제목 "함께 살펴볼 전형"(후보 없음: "경험해 볼 준비 방식")만 둬요. 눈썹 글자는 한국어 {typography.label} | design.md Don't |
| D14 | 근거 문장 — 확정(앱) | 결과 카드 "이 답변을 참고했어요" = 그 영역에서 "자주 그래요" · "매우 그래요"를 고른 문항 문장을 `evidence-quote`로(출처 caption "7번 문항 · 자주 그래요"). 0개면 블록 없음(앱 S-10). 응답값 숫자 없음 | design.md evidence-quote 반영됨 |
| D15 | 결과 행동 — 확정(앱) | 4개: `button-primary` "실제 성적 확인하기 ↗"(→ 성적 입력) · `button-outline` "대학별 환산 살펴보기"(→ 대학별 환산) · `button-outline` "답변 돌아보기" · `button-outline` "처음부터 다시". 주요 버튼은 1개 | design.md "한 화면에 주요 버튼은 하나" |
| D16 | "처음부터 다시" 확인 창 + toast — 확정(새 기능) | 누르면 모바일 `bottom-sheet` / PC `modal` → 위 길콩 guide 64(D5) → "답변을 모두 지울까요?" → `button-outline` "취소" + `button-primary` "지우고 다시 하기" → 소개로 가며 `toast` "답변을 지웠어요" | 01-research P6 · P18, design.md 확인 창 |
| D17 | 나가기 확인 창 — 확정(새 기능, 2026-11-24 진입점 바꿈) | 답을 1개 이상 한 뒤(문항 · 결과 단계) `app-bar` ‹ 뒤로 · `tab-bar-pill` · `sidebar-group` · `sidebar-item`을 누르면 모바일 `bottom-sheet` / PC `modal`: 위 길콩 guide 64 → "탐색을 그만둘까요?" → `button-primary` "계속 답하기" + `button-outline` "그만두기". 결과 단계 제목 "결과 화면을 나갈까요?". 소개 단계의 뒤로는 확인 없이 바로 나가요. "이어서 하기" 창은 그리지 않아요(저장 안 함) | 01-research P7 · P18 |
| D18 | 준비 방식 설명 시트 — 확정(새 기능) | 소개의 준비 방식 카드 5개를 누르면 모바일 `bottom-sheet` / PC `modal`: "01 매일의 힘" → 유형 이름 → 설명 → "이런 문항으로 살펴봐요" 3문항 → "함께 살펴볼 전형 · 학생부교과" → "다음 확인" → `button-outline` "닫기". 시트 안에는 길콩을 두지 않아요(카드 썸네일로 충분) | 01-research P1 |
| D19 | 답변 한눈에 보기 시트 — 확정(새 기능) | "답변 돌아보기"는 시트로: 모바일 `bottom-sheet` / PC `modal`(560) "내 답변 15개" → 행 15개(번호 고정폭 · 문항 2줄까지 · 내 답 caption · ›, 행 높이 64 이상) → 누르면 그 문항으로(답 유지). 맨 아래 `button-outline` "1번부터 다시 보기" | 01-research P9 |
| D20 | 결과 공유 — 확정(새 기능) | 결과 히어로 오른쪽 위 `button-pill-soft` "결과 공유" → `share-sheet` 변형 result(design.md 반영됨): 미리보기(유형 이름 · 함께 살펴볼 전형 이름 · "자기탐색 체험판 결과예요 · 입학 결과와 관계없어요") → "이미지로 저장" · "QR로 보여주기". 근거 문장 · 15개 답 · 길콩 그림은 미리보기에 넣지 않아요 | 01-research P8. 공유 이미지에 캐릭터를 넣을지는 요청 밖이라 빼요 |
| D21 | 그리지 않는 것 | 실제 성적과 결합한 전형 검색(성향과 검수된 조건을 섞지 않음) · 이어서 하기 창(D17) · 링크 복사 공유(서버 없음) · 배너의 "내 결과 다시 보기" 문구 · 참여 현황 블록(답을 저장하지 않으니 배너는 늘 같은 시작 문구, 01-research P14) · **home · admissions-list 화면 전체 다시 그리기**(이 slug 범위 밖, 8장 메모) | 범위 밖 · 원칙 충돌 |
| D22 | 체험판 표시 — 확정(앱) | `data-status-badge` "체험판 v0.1"(흑백) — 모바일은 `app-bar` 오른쪽 자리(누를 수 없음), PC는 `page-header` 오른쪽 | 데이터 상태처럼 흑백, 판정 색 아님 |
| D23 | 진입 배너 — 확정(2026-11-24 사용자 결정) | 띠 배너 카드 promo-banner(9장 제안 3): 채움 {colors.canvas-soft}(#f3f3f3) + Page 바탕 위라 1px {colors.hairline} 테두리(바탕과 같은 회색이라 테두리로 구분), 모서리 0, 그림자 없음, 높이 약 72, 좌우 패딩 16. 왼쪽 굵은 줄 **"나의 준비 방식 찾기"** {typography.title} {colors.ink} + 보조 줄 **"길콩과 15문항 · 약 3분 · 가입 없이"** {typography.body-sm} {colors.ink-soft} → 오른쪽 길콩 guide 약 60 → › {colors.ink}. 카드 전체가 눌려 소개로 가요. 자리 2곳: ① **홈 두 번째 블록**(내 요약 카드 바로 아래, 닫기 가능 D24) ② **전형계획 목록 위**(모바일 화면 제목 · `sub-nav` 아래 · 검색 줄 위, PC `page-header` 아래 · 조건 줄 위, 닫기 없음 = 상시 진입점). 목록 필터처럼 읽히지 않게 목록과 떨어진 블록으로 둬요 | 01-research P10~P12, L12 · L13. 사용자가 말한 canvas-soft 채움은 그대로 두고, Page 바탕과 같은 색이라 1px 테두리만 더했어요. 보조 줄은 {colors.text-muted}면 #f3f3f3 위 대비가 약 4.46:1로 4.5:1에 못 미쳐서 {colors.ink-soft}로 둬요 |
| D24 | 홈 배너 닫기 — 확정(2026-11-24 사용자 결정) | 홈 배너만 닫을 수 있어요. ① › 오른쪽 닫기 ✕(icon/x 16 {colors.ink}, 누르는 영역 44×44) = **이번만 숨김**(앱을 다시 열면 다시 보여요) → 배너 자리가 닫히고 아래 블록이 올라옴 → `toast` "전형계획 목록에서 다시 볼 수 있어요" ② 배너 바로 아래 오른쪽 정렬 텍스트 버튼 **"다시 보지 않기"**({typography.caption} {colors.ink-soft} 밑줄, 누르는 영역 높이 44) = 이 기기에서 홈 배너를 계속 숨김 → 같은 toast. X와 "다시 보지 않기"는 자리 · 무게를 나눠요. 전형계획 목록 배너는 ✕ · "다시 보지 않기" 없음 | 01-research P13, L18 |

## 1. 시안 데이터

이 화면은 성적 · 입결 숫자가 없어서 work/_data/demo-dataset.md 값을 쓰지 않아요. 문항 · 선택지 · 유형 문장은 앱 app/src/domain/admissionStyle.ts 원문을 **그대로** 써요(바꾸는 건 D10 · D12 · D13의 3곳뿐).

### 1-1. 준비 방식 5개 · 길콩 포즈 (카드 번호 순서 = 앱 순서)

길콩 파일은 app/public/assets/admission-style/ 안의 PNG예요(1254×1254 투명 배경). guide = gilkong.png, 결과 포즈 = gilkong-(kind)-v1.png.

| 번호 | 짧은 이름 | 유형 이름 | 함께 살펴볼 전형 | 포즈(kind) |
|---|---|---|---|---|
| 01 | 매일의 힘 | 꾸준히 쌓는 기록가 | 학생부교과 | record(체크 수첩) |
| 02 | 질문의 힘 | 깊이 파는 탐구가 | 학생부종합 | explore(돋보기) |
| 03 | 논리의 힘 | 근거를 잇는 논증가 | 논술 | reason(근거 보드) |
| 04 | 표현의 힘 | 반복하며 만드는 실천가 | 실기·실적 | practice(앞치마 · 블록) |
| 05 | 집중의 힘 | 전략을 세우는 도전가 | 수능 중심 전형 | exam(전략판) |
| — | (결과) | 여러 길을 살피는 탐색가 | — | mixed(갈림길 지도) |
| — | (결과) | 길을 열어 둔 탐색가 | — | open(별 · 두 팔) |
| — | (결과) | 경험을 더 알아가는 탐색가 | — | insufficient(새싹 화분) |
| — | 배너 · 소개 · 문항 · 확인 창 | — | — | guide(손 흔들기, gilkong.png) |

### 1-2. 시안 답변 묶음 (가상 응답 · 결과 프레임마다 하나)

| 결과 프레임 | 답변 묶음(앱 규칙을 돌린 결과와 맞게 골랐어요) | 결과 | 히어로 포즈 | 카드 |
|---|---|---|---|---|
| 390-result-focused | 02 질문의 힘 3문항 = 매우 · 자주 · 매우, 나머지 영역 = 가끔 · 거의 · 가끔 | 깊이 파는 탐구가 | explore | 학생부종합 1장, 근거 3줄(2번 · 7번 · 12번 문항) |
| 390-result-mixed · 1440-result-mixed | 01 = 자주 · 매우 · 자주, 02 = 자주 · 자주 · 매우, 나머지 = 가끔 | 여러 길을 살피는 탐색가 | mixed | 학생부교과 · 학생부종합 2장, 근거 각 3줄 |
| 390-result-open | 01~04 영역 = 가끔 · 거의 · 자주, 05 영역 = 가끔 · 거의 · 가끔 | 길을 열어 둔 탐색가 | open | 5장, 근거 각 1줄 · 05 집중의 힘만 근거 0줄(블록 없음, S-10) |
| 390-result-insufficient | 04 표현의 힘 = 잘 모르겠어요 · 잘 모르겠어요 · 가끔, 나머지 영역 = 자주 · 자주 · 가끔 | 경험을 더 알아가는 탐색가 | insufficient | 5장, 04 카드는 근거 0줄 |

### 1-3. 문항 프레임 예시

- 1번: "큰 시험 하나보다 수업과 과제를 꾸준히 챙기는 준비 방식이 편해요." (390-q1, 답 없음)
- 7번: "활동이 끝나면 무엇을 배웠고 다음에는 무엇을 바꿀지 돌아보는 편이에요." (390-q-selected · 1440-quiz, "자주 그래요" 고름)
- 15번: "시험 결과를 보고 영역별 공부 비중을 조절하는 준비 방식이 잘 맞아요." (390-q15, "아직 경험이 없거나 잘 모르겠어요" 고름)

## 2. 모바일 390×844 (frame admission-style/390 = 소개 첫 화면)

앱 셸(상세 화면): 바탕 Page {colors.canvas-soft}. 위 `app-bar`(높이 56: 왼쪽 ‹ 뒤로 · 가운데 "전형 성향 탐색" {typography.heading-4} · 오른쪽 `data-status-badge` on=page "체험판 v0.1") → 본문 → 하단 `tab-bar-pill`(대학 찾기 선택). `sub-nav` · `brand-logo` 없음(D1). 좌우 여백 20({spacing.card}, 콘텐츠 350), 카드 패딩 20, 카드 사이 12, 섹션 간격 {spacing.xl}. 마지막 요소 아래 여백은 탭바 높이만큼.
첫 화면에는 M1~M3이 보이고, M4 · M5는 스크롤(390-intro-scroll)이에요.

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| M1 | 앱바 | `app-bar`, `data-status-badge` | ‹ 뒤로(→ 들어온 홈 또는 전형계획 목록) · "전형 성향 탐색" · 오른쪽 "체험판 v0.1" [D1, D22] |
| M2 | 소개 카드 | 텍스트, mascot-illustration, `button-primary` | 흰 카드 하나: 맨 위 가운데 길콩 guide 160×160(투명 배경 그대로, 배경 원 없음) → 간격 16 → 눈썹 "성적표 밖의 나도 만나볼까요?" {typography.label} {colors.text-muted} → 제목 "나에게 맞는 입시의 시작점." {typography.heading-2} → 리드 {typography.body-lg} "꾸준히 쌓는 편인가요, 깊이 파고드는 편인가요? 나의 준비 방식을 발견해 보세요." → 사실 줄 {typography.title} "15문항 · 약 3분 · 가입 없이"(고정폭 숫자) → `button-primary` 꽉 찬 폭 "나의 전형 성향 알아보기 ↗"(높이 52) → caption muted "답변은 서버에 보내거나 저장하지 않아요. 화면을 떠나면 초기화돼요." [P1, P15, L1, L19] |
| M3 | 준비 방식 머리 | 텍스트 | Page 위: "나는 어떤 방식으로 준비할까요?" {typography.heading-3} → {typography.body-sm} {colors.ink-soft} "한 가지 유형에 나를 가두지 않아요. 여러 준비 방식이 함께 나타날 수도 있어요." |
| M4 | 준비 방식 카드 5개 | 텍스트, mascot-illustration | 흰 카드 5장 세로(카드 사이 8, 패딩 16, 높이 80 안팎): 왼쪽 그 준비 방식 포즈 48×48(1-1, 배경 없음) → 간격 12 → 번호 "01" {typography.label} 고정폭 {colors.text-muted} · 짧은 이름 "매일의 힘" {typography.heading-4} → 유형 이름 {typography.body-sm} {colors.text-muted}. 오른쪽 › + 누르면 설명 시트(D18). 5장 모두 같은 크기 · 같은 배치 [D2, P15] |
| M5 | 고지 | `disclaimer-note` | 6장 소개 고지 |

모바일 Route Blue: `tab-bar-pill` 선택 아이콘, (문항) 고른 선택지 테두리 · 채움, 진행 막대 채움. 배너 · 결과 카드 · 유형 이름 · 근거 · 버튼에는 쓰지 않아요.
주요 버튼: 소개 = "나의 전형 성향 알아보기", 문항 = "다음 문항" / "내 성향 보기", 결과 = "실제 성적 확인하기". 단계마다 1개.

### 2-0. 진입 배너 (홈 · 전형계획 목록 안, 상태 프레임 *-banner-*)

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| B1 | 띠 배너 | promo-banner, mascot-illustration | 폭 350 × 높이 72, {colors.canvas-soft} 채움 + 1px {colors.hairline}, 모서리 0. 왼쪽(패딩 16) 굵은 줄 "나의 준비 방식 찾기" {typography.title} {colors.ink} → 간격 2 → 보조 줄 "길콩과 15문항 · 약 3분 · 가입 없이" {typography.body-sm} {colors.ink-soft}(한 줄, 안 들어가면 두 줄로 흘리고 높이가 늘어요) → 오른쪽 길콩 guide 60×60(배너 높이의 약 85%) → 간격 8 → › 16 {colors.ink} → (홈만) ✕ 칸 44×44 [D23] |
| B2 | 다시 보지 않기 (홈만) | 텍스트 | 배너 바로 아래 오른쪽 정렬 "다시 보지 않기" {typography.caption} {colors.ink-soft} 밑줄, 누르는 영역 높이 44(글자 주변). 다음 블록과 간격 {spacing.sm} [D24] |
| B3 | 닫은 뒤 (홈만) | `toast` | 배너 · B2 자리가 닫히고 다음 블록이 올라옴 → 탭바 위 `toast` "전형계획 목록에서 다시 볼 수 있어요" [D24] |

홈 배너 자리 = 내 요약 카드 바로 아래(두 번째 블록), 그 아래 5 to 9 미니 막대 블록. 전형계획 목록 배너 자리 = 화면 제목 · `sub-nav`(전형계획 선택) 바로 아래, 검색 줄 위(✕ · B2 없음).

### 2-1. 문항 단계 (모바일, 상태 프레임 390-q*)

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| Q1 | 셸 | `app-bar`, `tab-bar-pill` | M1 그대로(‹ 뒤로 · 탭바를 누르면 D17 나가기 확인) |
| Q2 | 길콩 안내 | mascot-illustration, 텍스트 | Page 위 한 줄: 왼쪽 길콩 guide 40×40 → 간격 8 → 말풍선 = 흰 칸(모서리 0, 꼬리 없음, 테두리 없음, 패딩 8 · 12) 안 {typography.body-sm} {colors.ink} 한 줄 "멋진 답보다 지금의 나와 가까운 답이 좋아요". 문항 카드보다 작게(높이 40) [P16, L4] |
| Q3 | 문항 카드 | 흰 카드 | 패딩 20. 위: 왼쪽 "나를 알아가는 중" {typography.caption} {colors.text-muted} · 오른쪽 "7 / 15" {typography.label} 고정폭 → `score-bar`(폭 310, 채움 7/15, D8) → 간격 24 → 문항 {typography.heading-3}(두세 줄 흘림) |
| Q4 | 선택지 5개 | `filter-chip`(변형 option) | 카드 안 세로, 각 높이 56 이상, 사이 8. 글자 {typography.body} 왼쪽 · 표시 {typography.label} 고정폭 오른쪽("01"~"05", 고르면 "✓"). 넷째와 다섯째 사이 1px {colors.hairline-soft} + 위아래 8 [D7] |
| Q5 | 이전 · 다음 | `button-outline`, `button-primary` | 카드 아래 한 줄, 같은 폭(171 · 171, 사이 8, 높이 52): `button-outline` "이전 문항"(1번은 "소개로") · `button-primary` "다음 문항 →"(15번은 "내 성향 보기 →", 답 없으면 비활성 D9) |
| Q6 | 안내 | 텍스트 | Page 위 {typography.caption} {colors.ink-soft} "경험이 없다면 마지막 선택지를 골라도 괜찮아요. 이전으로 돌아가 답변을 바꿀 수 있어요." |

### 2-2. 결과 단계 (모바일, 상태 프레임 390-result-*)

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| R1 | 결과 히어로 | 흰 카드, mascot-illustration, `button-pill-soft` | 가운데 정렬: 눈썹 "지금 답변에서 발견한 나" {typography.label} {colors.text-muted} → 간격 12 → 결과 포즈 180×180(1-2, 배경 원 없음) → 간격 16 → 유형 이름 {typography.heading-1} → 설명 {typography.body-lg}(4종 문장, 6장). 카드 오른쪽 위 `button-pill-soft` "결과 공유"(D20, 높이 44). 점수 · 큰 숫자 · 판정 색 없음 [P4, P17, L20, L21] |
| R2 | 섹션 머리 | 텍스트 | "함께 살펴볼 전형" {typography.heading-2}(후보 없음: "경험해 볼 준비 방식") → {typography.body-sm} {colors.ink-soft} "성향은 탐색의 출발점이에요. 실제 성적 · 지원 자격 · 전형요소 확인은 따로 필요해요." [D13] |
| R3 | 결과 카드 | 흰 카드, `evidence-quote` | 1열, 카드 사이 12, 패딩 20. 눈썹 {typography.label} {colors.text-muted} "탐색해 볼 전형"(open · insufficient: "아직 열려 있는 길") + 번호 "02 질문의 힘" → 전형 이름 {typography.heading-3} "학생부종합" → 설명 {typography.body} → (근거 있으면) "이 답변을 참고했어요" {typography.label} → `evidence-quote` 줄(출처 caption "2번 문항 · 매우 그래요") → 위 1px {colors.hairline-soft} 아래 "다음 확인" {typography.label} + 앱 check 문장 {typography.body-sm}. 카드에는 길콩을 두지 않아요(히어로 1개만) [D10, D14, P5] |
| R4 | 규칙 설명 | `trace-accordion` | 접힘 "결과는 어떻게 정했나요?"(T1) [D11] |
| R5 | 행동 | `button-primary`, `button-outline` | 세로 4개 꽉 찬 폭(높이 52, 사이 8): "실제 성적 확인하기 ↗" · "대학별 환산 살펴보기" · "답변 돌아보기" · "처음부터 다시" [D15] |
| R6 | 고지 | `disclaimer-note` | 6장 결과 고지 |

결과 화면 금지(사용자 지시): 판정 색 · 판정 아이콘 · 숫자 점수 · 막대 · 백분위 · "나에게 맞는 전형" 같은 추천 단정 문구 · rules forbidden_words(띄어 쓴 형태 · 붙여 쓴 형태 모두). 결과는 "함께 살펴볼" 전형이에요.

## 3. PC 1440×900 (frame admission-style/1440 = 소개 첫 화면)

앱 셸: 왼쪽 `sidebar`(흰 바탕) 248, 위 `brand-logo`, `sidebar-group` 홈(접힘) · 성적(접힘) · **대학 찾기(펼침)** · 수시 전략(접힘). 대학 찾기 아래 `sidebar-item`은 design.md App Shell 목록(9장 제안 1 반영 뒤: 전형계획 · 대학 지도 · 수시 입결 · 전국 배치표 · 학과별 구간 · 계열 모아보기 · 될각 · 최저로 찾기 · 지원 자격 확인표 · 전형 비교) 그대로이고 **선택된 칸이 없어요**(D1).
콘텐츠: 1440 − 248 = 1192, 좌우 패딩 32 → 폭 1128, 바탕 Page. 읽는 화면이라 문항 · 결과 본문은 최대 720(가운데 정렬), 소개의 준비 방식 줄만 전체 폭이에요.

| # | 구성 요소 | 컴포넌트 | 내용·문구 |
|---|---|---|---|
| P1 | 화면 머리 | `page-header`, `data-status-badge` | 위 caption "대학 찾기 › 전형 성향 탐색" → 제목 "전형 성향 탐색" {typography.heading-1} → 리드 {typography.body-lg} "15개 질문으로 나의 준비 방식을 살펴보고, 함께 알아볼 전형을 찾아요". 오른쪽 `data-status-badge` on=page "체험판 v0.1". 동작 버튼 없음 |
| P2 | 소개 카드 | 텍스트, mascot-illustration, `button-primary` | 흰 카드(폭 720, 패딩 32): 왼쪽 글자 칸(M2와 같은 순서 · 문구, 버튼은 글자에 맞춘 폭 높이 44) · 오른쪽 길콩 guide 160×160(카드 세로 가운데) |
| P3 | 준비 방식 머리 + 카드 5개 | 텍스트, mascot-illustration | M3 문구 → 흰 카드 5장 한 줄(각 폭 (1128 − 4×12)/5 = 216, 패딩 20): 위 포즈 48 → 번호 · 짧은 이름 · 유형 이름(M4와 같은 내용). 누르면 D18 `modal` |
| P4 | 고지 | `disclaimer-note` | 6장 소개 고지 |

PC 문항(1440-quiz): `page-header` 그대로 → 본문 폭 720 가운데: Q2 길콩 안내 줄(길콩 40 + 말풍선) → 흰 카드(패딩 32) Q3 · Q4(선택지 높이 52) → Q5 버튼 한 줄(오른쪽 정렬, 높이 44) → Q6. 앱의 왼쪽 240 안내 칸은 없애고 Q2 줄로 옮겨요(01-research P16 "PC는 왼쪽 안내 칸 유지"를 본문 720 안 한 줄로 바꿔요 — 문항보다 크게 두지 않으려고).
PC 결과(1440-result-*): 본문 폭 720 가운데. R1 히어로(결과 포즈 **240×240**) → R2 → 결과 카드 **2열**(각 354, 사이 12, 1장뿐이면 전체 폭) → R4 → R5 한 줄(`button-primary` + `button-outline` 3개, 넘치면 두 줄, 높이 44) → R6.

PC 진입 배너(상태 프레임 1440-banner-*): 홈 = 왼쪽 열(내 요약 카드 폭)에서 내 요약 바로 아래, 그 아래 5 to 9 막대. B1과 같은 구성(높이 72, 길콩 60, › · ✕ 44), "다시 보지 않기"는 배너 아래 오른쪽. 닫으면 오른쪽 아래 `toast`. 전형계획 목록 = `page-header` 아래 · 조건 줄 위, 콘텐츠 폭 전체(1128), ✕ 없음.

PC Route Blue: 고른 선택지, 진행 막대, 링크. `sidebar-item` 선택 표시는 이 화면에 없어요(선택 칸 없음). 결과 · 배너에는 없어요.

## 4. 규칙 · 데이터

- 데이터: 앱 상수(STYLE_PROFILES 5개 · STYLE_QUESTIONS 15개 · STYLE_OPTIONS 5개)만. 서버 · 성적 DB · 입결 · 환산 규칙과 연결하지 않아요. 답변은 메모리에만(새로고침 · 뒤로 · 메뉴 이동 시 초기화).
- 배너 숨김: 홈 ✕ = 이번 실행 동안만, "다시 보지 않기" = 이 기기에 표시 하나만 기억(답변과 무관, 서버 전송 없음). 전형계획 목록 배너는 늘 보여요.
- 결과 분류(앱 summarizeStyle 그대로 — 화면에 값은 안 보임): 영역별 3문항, "잘 모르겠어요"는 빼고 셈, 영역마다 알려진 응답 2개 이상이어야 비교, 평균 2 이상이면서 최고 평균과 0.5 이내인 영역이 후보. 한 영역이라도 비교 못 하면 insufficient, 후보 0개면 open, 2개 이상이면 mixed, 1개면 focused.
- 근거 문장: 그 영역에서 "자주 그래요" 또는 "매우 그래요"를 고른 문항 문장(앱 evidence).
- NEVER-1 경계: 성적 환산 규칙을 쓰지 않아요. 결과 규칙은 체험판 임시 규칙이라는 걸 T1과 고지에 밝혀요. 결과를 성적 · 입결과 섞어 계산하지 않아요(D21).
- NEVER-2 경계: 결과는 "살펴볼 전형"이지 지원 결과에 대한 말이 아니에요. 유형 이름 · 눈썹 · 배너에 '추천' · '가능' · '적합' · '확률' · '보장' · "나에게 맞는 전형"을 쓰지 않아요(고지의 부정 문장만 예외).

T1 — `trace-accordion` "결과는 어떻게 정했나요?" 펼친 내용(R4, 1440 공통). 단계 이름 {typography.body-sm} {colors.text-muted} → 값 {typography.table}. 학생 값 없이 규칙만:
① 문항 묶기 → 5가지 준비 방식마다 3문항씩, 15문항
② 답 세기 → 네 단계 답만 세고, "아직 경험이 없거나 잘 모르겠어요"는 빼요(낮은 점수로 보지 않아요)
③ 비교 조건 → 준비 방식마다 센 답이 2개 이상일 때만 서로 비교해요
④ 함께 살펴볼 전형 → "자주 그래요" 쪽으로 기운 준비 방식 중 가장 기운 것과 거의 같은 것을 모두 보여요(하나로 줄이지 않아요)
⑤ 순서 → 카드 순서는 01~05 번호 순서예요(서열이 아니에요)
⑥ 이 규칙은 → 체험판의 임시 규칙이에요 · 심리측정 검증을 거치지 않았어요
마지막 줄(위 1px {colors.hairline}, 굵게) = 결과 유형 이름(예: "깊이 파는 탐구가"). 맨 아래 `disclaimer-note` "내향 · 외향으로 면접 적합성을 정하지 않아요 · 결과를 성적이나 입학 결과 예측으로 바꾸지 않아요".
(앱 원문의 "0~3으로 더하고 · 평균 2 이상 · 0.5 이내" 숫자 표현은 ②④처럼 말로 바꿔요 — D4.)

## 5. 상태 프레임 (03-draft.json states에만 적고 frames에는 넣지 않아요)

이름 규칙: admission-style/<상태>. 구현됨 13장 + 새 기능 12장 + 배너 5장(2026-11-24) = **30장**. 모두 03-draft.json states에 넣어요. 2026-11-24 개정으로 기존 25장도 셸(`app-bar` · `sub-nav` 없음 · PC 사이드바 선택 없음)과 길콩 자리가 바뀌어요 — 이미 그린 프레임이 있으면 고쳐 그려요.

### 5-0. 진입 배너 (2026-11-24 사용자 결정 — 홈 · 전형계획 목록 안의 배너 영역)

배경 화면(홈 · 전형계획 목록)은 work/home · work/admissions-list 시안의 해당 부분을 **복사해 맥락으로만** 두고 고치지 않아요(D21). 배너 · 다시 보지 않기 · toast만 이 slug의 그림이에요.

| 프레임 | 크기 | 결정 | 무엇을 그리나 |
|---|---|---|---|
| admission-style/390-banner-home | 390×844 | D23 · D24 | **홈 안 배너.** 홈 머리 → 내 요약 카드 → **B1 배너(✕ 있음) → B2 "다시 보지 않기"** → 5 to 9 미니 막대 블록 일부 → 탭바(홈 선택). 배너 높이 72, 길콩 guide 60 |
| admission-style/1440-banner-home | 1440×900 | D23 · D24 | **PC 홈 안 배너.** 사이드바(홈 선택) → `page-header` → 왼쪽 열 내 요약 → **배너(✕ 있음) + "다시 보지 않기"** → 5 to 9 막대 · 오른쪽 열 D-day는 맥락으로 |
| admission-style/390-banner-dismissed | 390×844 | D24 | **✕를 누른 뒤.** 배너 자리가 닫혀 5 to 9 블록이 내 요약 바로 아래로 올라옴 → 탭바 위 `toast` "전형계획 목록에서 다시 볼 수 있어요" |
| admission-style/390-banner-list | 390×844 | D23 | **전형계획 목록 위 배너.** 화면 제목 · `sub-nav`(전형계획 선택) → **B1 배너(✕ 없음, ›만)** → 검색 줄 · `filter-chip` 줄 → 목록 첫 카드 일부 → 탭바(대학 찾기 선택) |
| admission-style/1440-banner-list | 1440×900 | D23 | **PC 전형계획 목록 위 배너.** 사이드바(전형계획 선택) → `page-header` → **배너 콘텐츠 폭 1128(✕ 없음)** → 조건 줄 → 목록 일부 |

### 5-1. 앱에 있는 상태 (확정)

| 프레임 | 크기 | 앱 상태 | 무엇을 그리나 |
|---|---|---|---|
| admission-style/390-intro-scroll | 390×844 | S-1 | **소개 아래쪽.** M3 → M4 카드 5장(포즈 48 record · explore · reason · practice · exam) → M5 `disclaimer-note` → 탭바 |
| admission-style/390-q1 | 390×844 | S-2 · S-4 | **1번 문항 · 답 없음.** Q2 길콩 40 + 말풍선, "1 / 15", score-bar 1/15, 선택지 5개 모두 off, `button-outline` "소개로", `button-primary` "다음 문항 →" 비활성(D9) |
| admission-style/390-q-selected | 390×844 | S-3 | **7번 문항 · 고름.** "7 / 15", score-bar 7/15, "자주 그래요" on(accent-soft 채움 + 1px accent 테두리 + "✓"), "이전 문항" · "다음 문항 →" 켜짐 |
| admission-style/390-q15 | 390×844 | S-5 | **15번 문항 · 마지막.** "15 / 15", score-bar 꽉 참, 다섯째 "아직 경험이 없거나 잘 모르겠어요" on, 주 버튼 "내 성향 보기 →" |
| admission-style/390-review-q1 | 390×844 | "답변 돌아보기"(앱 지금 동작) | **결과에서 돌아와 1번 문항.** 390-q1과 같지만 이전 답 "자주 그래요"가 on, 다음 버튼 켜짐. 말풍선 문장 대신 "답을 바꾸면 결과가 다시 정해져요"(6장) |
| admission-style/390-result-focused | 390×844 | S-6 | **결과 · 하나.** R1 눈썹 → 포즈 explore 180 → "깊이 파는 탐구가" + 앱 description, R2, R3 카드 1장(02 질문의 힘 · 학생부종합 · 근거 3줄). 첫 화면에 R1 · R2 · R3 머리 |
| admission-style/390-result-mixed | 390×844 | S-7 | **결과 · 여러 개.** R1 포즈 mixed 180 → "여러 길을 살피는 탐색가" + mixed 설명, R3 카드 2장(01 학생부교과 · 02 학생부종합, 번호 순) |
| admission-style/390-result-open | 390×844 | S-8 · S-10 | **결과 · 뚜렷한 선호 없음.** R1 포즈 open 180 → "길을 열어 둔 탐색가" + open 설명, R2 "경험해 볼 준비 방식", R3 5장 눈썹 "아직 열려 있는 길"(05 카드는 근거 블록 없음) |
| admission-style/390-result-insufficient | 390×844 | S-9 | **결과 · 응답 부족.** R1 포즈 insufficient 180 → "경험을 더 알아가는 탐색가" + insufficient 설명, R3 5장, 04 표현의 힘 카드 근거 블록 없음 |
| admission-style/390-result-trace | 390×844 | S-11 | **결과 아래쪽 · 규칙 펼침.** 마지막 카드 → `trace-accordion` 펼침(T1) → R5 버튼 4개 → R6 `disclaimer-note` |
| admission-style/1440-quiz | 1440×900 | S-3 | **PC 문항.** 3장 PC 문항 구성(길콩 40 + 말풍선 줄), 7번 문항 "자주 그래요" on |
| admission-style/1440-result-mixed | 1440×900 | S-7 | **PC 결과.** R1(포즈 mixed 240) → R2 → 카드 2열(학생부교과 · 학생부종합) |
| admission-style/1440-result-trace | 1440×900 | S-11 | **PC 결과 아래쪽.** `trace-accordion` 펼침(T1) → R5 한 줄 → R6 |

focused · open · insufficient의 PC 모습은 1440-result-mixed와 같은 틀이라 따로 그리지 않아요(포즈 · 카드 수만 달라요).

### 5-2. 팝업 · 새 기능 (확정 — 앱에 없음)

모든 팝업: 모바일 `bottom-sheet`(위 손잡이, 그림자, 뒤 scrim {colors.scrim}, 안쪽 폭 350) / PC `modal`(최대 폭 560, 닫기 ✕, 뒤 scrim). 열면 제목으로 포커스, 닫으면 누른 자리로. 확인 창 2종(restart · leave)만 제목 위에 길콩 guide 64(왼쪽 정렬, 한 개)를 둬요 — 버튼 · 문구가 먼저 읽히게 더 크게 두지 않아요(P18, L22).

| 프레임 | 크기 | 결정 | 무엇을 그리나 |
|---|---|---|---|
| admission-style/390-restart-confirm | 390×844 | D16 | 뒤 = 390-result-trace + scrim. `bottom-sheet`: 길콩 guide 64 → 제목 "답변을 모두 지울까요?" {typography.heading-4} → {typography.body} "15개 답변이 지워지고 소개 화면으로 돌아가요" → 가로 버튼 2개(같은 폭, 높이 52): `button-outline` "취소" · `button-primary` "지우고 다시 하기" |
| admission-style/390-restart-toast | 390×844 | D16 | 뒤 = 소개(390) 첫 화면. 탭바 위 `toast` "답변을 지웠어요" |
| admission-style/390-leave-confirm | 390×844 | D17 | 뒤 = 390-q-selected + scrim(`app-bar` ‹ 뒤로를 누른 순간). `bottom-sheet`: 길콩 guide 64 → 제목 "탐색을 그만둘까요?" → "답변은 저장하지 않아서 나가면 지금까지 고른 7개 답변이 사라져요" → 세로 버튼 2개: `button-primary` "계속 답하기" · `button-outline` "그만두기" |
| admission-style/390-style-sheet | 390×844 | D18 | 뒤 = 390-intro-scroll + scrim. `bottom-sheet`(높이 약 80%, 안쪽 스크롤): "01 매일의 힘" {typography.label} → "꾸준히 쌓는 기록가" {typography.heading-3} → 설명 {typography.body} → "이런 문항으로 살펴봐요" {typography.label} {colors.text-muted} 아래 1번 · 6번 · 11번 문항 문장 → "함께 살펴볼 전형 · 학생부교과" → "다음 확인" + 앱 check 문장 → `button-outline` 꽉 찬 폭 "닫기" |
| admission-style/390-answers-sheet | 390×844 | D19 | 뒤 = 390-result-trace + scrim. `bottom-sheet`(높이 약 90%): 제목 "내 답변 15개" + caption "행을 누르면 그 문항으로 가요" → 행 15개 중 앞 6개(번호 "01" 고정폭 · 문항 {typography.body-sm} 2줄까지 · 내 답 {typography.caption} {colors.text-muted} · ›) → 맨 아래 `button-outline` "1번부터 다시 보기" |
| admission-style/390-share | 390×844 | D20 | 뒤 = 390-result-focused + scrim. `share-sheet`(바텀시트): 제목 "결과 공유" → 미리보기 흰 카드(1px {colors.hairline-soft}, 폭 310): `brand-logo` 작게 → "지금 답변에서 발견한 나" caption → "깊이 파는 탐구가" {typography.heading-3} → "함께 살펴볼 전형 · 학생부종합" {typography.body-sm} → caption muted "자기탐색 체험판 결과예요 · 입학 결과와 관계없어요" → 선택지 2행: icon/download "이미지로 저장" · icon/qr-code "QR로 보여주기" → caption muted "근거 문장과 15개 답변은 담지 않아요" |
| admission-style/1440-restart-confirm | 1440×900 | D16 | 뒤 = 1440-result-trace + scrim. `modal` 560: 길콩 64 + 390-restart-confirm과 같은 문구, 버튼 오른쪽 정렬(높이 44) |
| admission-style/1440-restart-toast | 1440×900 | D16 | 뒤 = 소개(1440). 오른쪽 아래 `toast` "답변을 지웠어요" |
| admission-style/1440-leave-confirm | 1440×900 | D17 | 뒤 = 1440-quiz + scrim(사이드바 "전형계획"을 누른 순간). `modal` 560: 길콩 64 + 390-leave-confirm과 같은 문구, 버튼 오른쪽 정렬 "그만두기"(outline) · "계속 답하기"(primary) |
| admission-style/1440-style-modal | 1440×900 | D18 | 뒤 = 소개(1440) + scrim. `modal` 560: 390-style-sheet와 같은 내용, 아래 고정 줄에 "닫기" |
| admission-style/1440-answers-modal | 1440×900 | D19 | 뒤 = 1440-result-trace + scrim. `modal` 560(머리 고정, 행 목록만 스크롤): 행 높이 56, 호버 시 {colors.canvas-soft} 채움(Route Blue 없음) |
| admission-style/1440-share | 1440×900 | D20 | 뒤 = 1440-result-mixed + scrim. `share-sheet`(모달): 왼쪽 미리보기 카드("여러 길을 살피는 탐색가" · "함께 살펴볼 전형 · 학생부교과 · 학생부종합") · 오른쪽 선택지 2행 |

## 6. 문구

| 자리 | 문구 |
|---|---|
| 화면 제목 | 전형 성향 탐색 |
| 체험판 배지 | 체험판 v0.1 |
| 배너 굵은 줄 · 보조 줄 | 나의 준비 방식 찾기 / 길콩과 15문항 · 약 3분 · 가입 없이 |
| 배너 닫기(보조 기술 이름) | 배너 이번만 숨기기 |
| 배너 영구 숨김 | 다시 보지 않기 |
| 배너 닫은 뒤 toast | 전형계획 목록에서 다시 볼 수 있어요 |
| PC 리드 | 15개 질문으로 나의 준비 방식을 살펴보고, 함께 알아볼 전형을 찾아요 |
| 소개 눈썹 · 제목 | 성적표 밖의 나도 만나볼까요? / 나에게 맞는 입시의 시작점. |
| 소개 리드 | 꾸준히 쌓는 편인가요, 깊이 파고드는 편인가요? 나의 준비 방식을 발견해 보세요. |
| 사실 줄 | 15문항 · 약 3분 · 가입 없이 |
| 시작 버튼 | 나의 전형 성향 알아보기 ↗ |
| 저장 안내 | 답변은 서버에 보내거나 저장하지 않아요. 화면을 떠나면 초기화돼요. |
| 준비 방식 머리 | 나는 어떤 방식으로 준비할까요? / 한 가지 유형에 나를 가두지 않아요. 여러 준비 방식이 함께 나타날 수도 있어요. |
| 소개 고지 (`disclaimer-note`) | ⓘ 직접 만든 자기탐색 질문이에요 · MBTI나 표준화된 심리검사가 아니에요 · 답변만으로 지원 자격이나 입학 결과를 판단하지 않아요 |
| 길콩 말풍선 (문항) | 멋진 답보다 지금의 나와 가까운 답이 좋아요 |
| 진행 | 나를 알아가는 중 · n / 15 |
| 선택지 | 거의 그렇지 않아요 / 가끔 그래요 / 자주 그래요 / 매우 그래요 / 아직 경험이 없거나 잘 모르겠어요 |
| 문항 버튼 | 소개로 · 이전 문항 · 다음 문항 → · 내 성향 보기 → |
| 문항 아래 안내 | 경험이 없다면 마지막 선택지를 골라도 괜찮아요. 이전으로 돌아가 답변을 바꿀 수 있어요. |
| 돌아보기 말풍선 (390-review-q1) | 답을 바꾸면 결과가 다시 정해져요 |
| 결과 눈썹 | 지금 답변에서 발견한 나 |
| 결과 이름 | 꾸준히 쌓는 기록가 · 깊이 파는 탐구가 · 근거를 잇는 논증가 · 반복하며 만드는 실천가 · 전략을 세우는 도전가 · 여러 길을 살피는 탐색가 · 길을 열어 둔 탐색가 · 경험을 더 알아가는 탐색가 |
| 결과 설명 — focused | (그 유형의 앱 description 그대로, 예: 궁금한 주제를 탐구하고 배운 과정을 설명하는 방식을 선호해요.) |
| 결과 설명 — mixed | 비슷하게 관심을 보인 준비 방식이 여러 개예요. 하나로 고르지 말고 함께 살펴보세요. |
| 결과 설명 — open | 이번 답변에서 뚜렷하게 선호하는 방식은 나타나지 않았어요. 짧은 활동부터 경험해 보고 다시 탐색해도 좋아요. |
| 결과 설명 — insufficient | 아직 경험이 적거나 판단하기 어려운 영역이 있어요. 전형의 순서를 정하지 않고, 활동을 먼저 살펴볼게요. |
| 섹션 머리 | 함께 살펴볼 전형 (후보 없음: 경험해 볼 준비 방식) / 성향은 탐색의 출발점이에요. 실제 성적 · 지원 자격 · 전형요소 확인은 따로 필요해요. |
| 카드 눈썹 | 탐색해 볼 전형 / 아직 열려 있는 길 |
| 근거 소제목 · 출처 | 이 답변을 참고했어요 / n번 문항 · 자주 그래요 |
| 다음 확인 | 다음 확인 + 앱 check 문장 그대로 |
| 규칙 제목 | 결과는 어떻게 정했나요? |
| 결과 버튼 | 실제 성적 확인하기 ↗ · 대학별 환산 살펴보기 · 답변 돌아보기 · 처음부터 다시 |
| 결과 고지 (`disclaimer-note`) | ⓘ 준비 방식에 대한 탐색 안내예요 · 검증된 심리검사 · 능력 평가 · 입학 상담을 대신하지 않아요 · 결과는 지원 결과와 관계없어요 · 응답과 결과는 서버로 보내지 않아요 · 대학 공식 모집요강이 최종 기준이에요 |
| 다시 확인 창 | 답변을 모두 지울까요? / 15개 답변이 지워지고 소개 화면으로 돌아가요 / 취소 · 지우고 다시 하기 |
| 지운 뒤 toast | 답변을 지웠어요 |
| 나가기 확인 창 | 탐색을 그만둘까요? (결과 단계: 결과 화면을 나갈까요?) / 답변은 저장하지 않아서 나가면 지금까지 고른 n개 답변이 사라져요 (결과 단계: 나가면 결과와 15개 답변이 사라져요) / 계속 답하기 · 그만두기 |
| 준비 방식 시트 | n번 짧은 이름 / 유형 이름 / 설명 / 이런 문항으로 살펴봐요 / 함께 살펴볼 전형 · ○○ / 다음 확인 / 닫기 |
| 답변 시트 | 내 답변 15개 / 행을 누르면 그 문항으로 가요 / 1번부터 다시 보기 |
| 공유 | 결과 공유 / 자기탐색 체험판 결과예요 · 입학 결과와 관계없어요 / 이미지로 저장 · QR로 보여주기 / 근거 문장과 15개 답변은 담지 않아요 / (저장 뒤 toast) 결과 이미지를 저장했어요 |

문구 점검: 모두 해요체. rules forbidden_words 3개는 띄어 쓴 형태 · 붙여 쓴 형태 모두 이 문서와 시안 어디에도 나오지 않아요. '추천' · '가능' · '적합도' · '확률' · '점수' · '순위' · '높음/낮음' · "나에게 맞는 전형"을 배너 · 결과 이름 · 눈썹 · 설명에 쓰지 않아요("적합성을 정하지 않아요" · "순서를 정하지 않고" 같은 부정 문장만 예외). 배너 굵은 줄 9자 · 보조 줄 20자 안쪽(P12). 영문 대문자 눈썹 없음. "MBTI"는 고유 이름이라 그대로.

## 7. 접근성

- 배너 = 링크 하나(이름 "나의 준비 방식 찾기, 길콩과 15문항 · 약 3분 · 가입 없이"). 홈 배너의 ✕는 링크 밖의 별도 버튼(이름 "배너 이번만 숨기기", 44×44), "다시 보지 않기"도 별도 버튼. 배너를 닫으면 포커스는 다음 블록 첫 요소로.
- 길콩 이미지는 장식이라 대체 텍스트를 비워요(alt=""). 말풍선 문장은 글자로 읽혀요. 결과 유형은 유형 이름 글자가 전해요(그림에 기대지 않음).
- 선택지 = 라디오 묶음(legend "나와 가까운 정도", 문항 문장이 묶음 이름). 방향키 이동 · Space 고름. 고른 상태는 테두리 · 채움 + "✓" + 스크린리더 "선택됨"(색에만 기대지 않음). 다섯째 앞 구분선은 장식.
- 진행 막대 = progressbar, 값 "15문항 중 7번째". 문항이 바뀌면 문항 제목으로 포커스.
- 비활성 다음 버튼은 aria-disabled + 숨은 글 "답을 고르면 다음으로 넘어가요".
- 결과 유형 이름 = 단계 바뀐 뒤 첫 포커스. `evidence-quote`는 인용으로 읽히고 출처 caption이 이어져요.
- `trace-accordion` Enter/Space. 시트 · 모달은 열면 제목으로 포커스, Esc · ✕ · scrim으로 닫고 누른 자리로. 확인 창 기본 포커스는 안전한 쪽("취소" · "계속 답하기").
- `toast`는 role=status, 4초 뒤 사라지고 포커스를 옮기지 않아요.
- 터치 영역: 모바일 선택지 56 · 버튼 52 · 카드 · 시트 행 · 배너 ✕ 44 이상, PC 버튼 44. 포커스 2px 잉크 링.
- 대비: {colors.text-muted}(#707070)는 흰 바탕 위 약 4.95:1이라 흰 카드 · 시트 안에서만 써요. {colors.canvas-soft}(#f3f3f3) 위에서는 약 4.46:1로 4.5:1에 못 미쳐서, Page 바탕 · 배너 위 보조 글자(M3 · Q6 · R2 설명, 배너 보조 줄, "다시 보지 않기")는 {colors.ink-soft}로 써요. {colors.text-faint}는 비활성 버튼 글자에만.
- 움직임: 문항 바뀜 150ms 페이드, 시트 · 모달 240ms, 배너 닫힘 200ms 접힘, prefers-reduced-motion이면 바로.

## 8. 디자이너 메모

- **S3 시작 조건**: 9장 제안 3 · 4(promo-banner · mascot-illustration 정의 + rules components · palette_exempt 추가)가 design.md · rules에 반영되고 source.sha256이 갱신된 뒤에 그려요. 반영 전에는 그리지 않아요(오케스트레이터 몫).
- 03-draft.json frames = 정확히 2개: admission-style/390, admission-style/1440(둘 다 소개 첫 화면). 5장 상태 프레임 30개는 같은 페이지에 그리고 states에만 적어요. 5-2 새 기능과 5-0 배너는 레이어 설명에 "앱 미구현 · 사용자 확정(날짜)"이라고 적어요.
- **범위 밖(다음 작업)**: home · admissions-list 화면 자체(그 slug의 390 · 1440 프레임)를 배너가 들어간 모습으로 다시 그리는 건 이 slug가 하지 않아요. 5-0 프레임의 배경은 그 시안을 복사한 맥락일 뿐이고, 두 slug의 02-spec 개정 · 다시 그리기는 오케스트레이터가 다음 작업으로 잡아요. 앱(nav.ts에서 admission-style 소분류 빼기, 홈 · 전형계획 목록에 배너 넣기)도 앱 작업 몫이에요.
- Figma MCP 호출 한도(Education 플랜)가 있어서 30장을 한 번에 그리다 끊길 수 있어요. 기본 2장 → 5-1 → 5-2 → 5-0 순서로 그리고, 끊기면 다음 실행에서 이어 그려요.
- 길콩: PNG 이미지 채움 사각 노드 하나, 레이어 이름 **mascot-illustration**(포즈는 레이어 설명에 "pose=explore" 식으로). 색 보정 · 필터 · DROP_SHADOW · 배경 원 · 둥근 모서리 없음(모서리 0, 투명 배경 그대로). 파일 8포즈 중 record · insufficient만 직접 확인됐어요(01-research 미결 13) — 올리기 전에 나머지 6장(explore · reason · practice · exam · mixed · open)이 있는지 확인하고, 없으면 그 자리는 멈추고 알려요(다른 포즈로 대신하지 않음). 1254px 원본을 그대로 올려 크기만 줄여요.
- 배너: 레이어 이름 **promo-banner**, 안에 mascot-illustration. 채움 {colors.canvas-soft} + 1px {colors.hairline} 둘 다 변수 바인딩. 그림자 없음.
- 레이어 이름 = 컴포넌트 이름: `app-bar`, `tab-bar-pill`, `sub-nav`(5-0 전형계획 목록 맥락에만), `filter-chip`, `sidebar`, `sidebar-group`, `sidebar-item`, `brand-logo`, `page-header`, `data-status-badge`, `button-primary`, `button-outline`, `button-pill-soft`, `score-bar`, `evidence-quote`, `trace-accordion`, `disclaimer-note`, `bottom-sheet`, `modal`, `toast`, `share-sheet` + promo-banner · mascot-illustration. 선택지는 `filter-chip` + 설명 "variant=option", 진행 막대는 `score-bar` + 설명 "variant=progress", 비활성 버튼은 `button-primary` + 설명 "state=disabled", 공유는 `share-sheet` + 설명 "variant=result".
- 모서리 전부 0. 원형 표식 없음. 그림자는 `bottom-sheet` · `modal` · `toast` 레이어에만(share-sheet는 bottom-sheet · modal 레이어 안에 두어 J6을 피해요).
- 색: 팔레트 안 토큰만, 모든 fill · stroke 변수 바인딩. 쓰는 색 = ink · ink-soft · text-muted · text-faint(비활성만) · canvas · canvas-soft · hairline · hairline-soft · accent · accent-soft · scrim · on-primary. 판정 색 · 등급 색 · 증감 색 · 연도 색 · 역량 색 · heart 없음. 앱 파스텔 hex는 하나도 옮기지 않아요. 길콩 색은 이미지 안에만.
- 글꼴 Pretendard(없으면 IBM Plex Sans KR), 자간 0, 굵기 300 · 400 · 600 · 700만. 소개 제목 {typography.heading-2} — 앱의 60px 큰 제목은 쓰지 않아요.
- 문항 · 유형 문장은 1장 원문 그대로. 긴 문항은 단어 사이에서만 줄바꿈.

## 9. design.md 수정 제안 (2026-11-24 개정분 · 오케스트레이터 · 사람 몫)

2026-11-23 제안 1~6 · 8 · 9는 design.md에 이미 반영됐어요(확인: App Shell 학생 대분류 · Responsive Strategy 전형 성향 탐색 행 · filter-chip 변형 option · score-bar 변형 progress · button-primary 비활성 · trace-accordion 제목 · share-sheet 변형 result · evidence-quote 쓰임). 2026-11-23 제안 7(길콩)은 이번 결정으로 **아래 제안 3 ①로 바뀌어요**. design.md를 고치면 rules/design-rules.json source.sha256도 새 해시로 바꿔야 해요(안 바꾸면 J9 실패).

1. **App Shell 학생 대분류에서 전형 성향 탐색 빼기.** 위치: App Shell › 모바일 › "학생 대분류:"로 시작하는 문단. 세 곳을 **바꿀 문장**으로 고치고 한 문장을 **추가**해요.
   - ① 지금: "대학 찾기(전형 성향 탐색 · 전형계획 · 대학 지도 · " → 바꾼 뒤: "대학 찾기(전형계획 · 대학 지도 · "
   - ② 지금: "2026-11-23 사용자 결정으로 소분류 아이콘을 더 정합니다: 전형 성향 탐색 icon/compass(생기부 AI icon/sparkles와 겹치지 않게) · 전국 배치표 icon/chart-scatter" → 바꾼 뒤: "2026-11-23 사용자 결정으로 소분류 아이콘을 더 정합니다: 전국 배치표 icon/chart-scatter"
   - ③ 지금: "대학 지도 icon/map(2026-11-23 대학 지도, 대학 찾기 대분류 icon/search · 전형 성향 탐색 icon/compass · 전국 배치표 icon/chart-scatter와 겹치지 않게)." → 바꾼 뒤: "대학 지도 icon/map(2026-11-23 대학 지도, 대학 찾기 대분류 icon/search · 전국 배치표 icon/chart-scatter와 겹치지 않게)."
   - ④ 같은 문단 끝에 **추가**: "전형 성향 탐색(2026-11-24 사용자 결정)은 메뉴에 두지 않고 홈 · 전형계획 목록의 promo-banner로만 들어가는 상세 화면입니다. 모바일은 app-bar 뒤로가기 + 하단 탭바(대학 찾기 선택)이고 sub-nav가 없으며, PC는 사이드바에서 대학 찾기만 펼치고 소분류는 선택하지 않습니다(page-header 위 경로 "대학 찾기 › 전형 성향 탐색")."
   - 함께: 아이콘 세트의 icon/compass는 더 쓰는 곳이 없어요(지워도 되고 남겨도 돼요 — 오케스트레이터 판단). 앱 nav.ts에서 admission-style 소분류를 빼는 건 앱 작업 몫.
2. **Responsive Strategy 행 고치기 · 추가.** 위치: Responsive Strategy 표(탭으로 칸 구분).
   - ① "홈" 행 **바꿀 문장**:
     - 지금: "홈	내 요약 카드(환산 9등급 범위 display) → 5 to 9 미니 막대 → D-day → 바로가기 카드 세로 나열	2열: 왼쪽 내 요약 + 5 to 9 막대, 오른쪽 D-day + 관심 대학 될각 요약"
     - 바꾼 뒤: "홈	내 요약 카드(환산 9등급 범위 display) → 전형 성향 탐색 promo-banner(닫기 가능, 아래 "다시 보지 않기", 2026-11-24) → 5 to 9 미니 막대 → D-day → 바로가기 카드 세로 나열	2열: 왼쪽 내 요약 + 전형 성향 탐색 promo-banner(닫기 가능) + 5 to 9 막대, 오른쪽 D-day + 관심 대학 될각 요약"
   - ② "홈" 행 바로 다음에 **추가**:
     > 전형계획 목록(2026-11-24 배너 자리)	화면 제목 · sub-nav 바로 아래, 검색 줄 위에 전형 성향 탐색 promo-banner(닫기 없음, 상시 진입점) → 검색 · filter-chip 줄 → 목록	page-header 아래, 조건 줄 위에 promo-banner 콘텐츠 폭 전체(닫기 없음) → 조건 줄 → 목록
   - ③ "전형 성향 탐색(2026-11-23, 체험판)" 행 **바꿀 문장**(행 전체):
     - 지금: "전형 성향 탐색(2026-11-23, 체험판)	소개 카드 → 준비 방식 카드 5장 세로(누르면 설명 바텀시트) → 문항 단계(진행 막대 + 문항 카드 + 세로 선택지 5개 + 이전 · 다음 한 줄) → 결과(히어로 + 결과 공유 → 전형 카드 1열 → 근거 아코디언 → 버튼 세로 4개 → 고지). 답변 한눈에 보기 · 확인 창 · 공유는 바텀시트, 지운 뒤 toast	page-header → 본문 최대 720 가운데(문항 · 결과), 준비 방식 카드 5장 한 줄 → 결과 전형 카드 2열. 설명 · 답변 보기 · 확인 창 · 공유는 모달. 판정 색 · 점수 · 캐릭터 없음"
     - 바꾼 뒤: "전형 성향 탐색(2026-11-23 체험판, 2026-11-24 배너 진입 · 길콩)	홈 · 전형계획 목록의 promo-banner로 들어가는 상세 화면(app-bar 뒤로가기, sub-nav 없음) → 소개 카드(길콩 약 160) → 준비 방식 카드 5장 세로(카드마다 포즈 48, 누르면 설명 바텀시트) → 문항 단계(길콩 40 + 말풍선 한 줄 → 진행 막대 + 문항 카드 + 세로 선택지 5개 + 이전 · 다음 한 줄) → 결과(히어로: 결과 포즈 약 180 + 유형 이름 + 결과 공유 → 전형 카드 1열 → 근거 아코디언 → 버튼 세로 4개 → 고지). 답변 한눈에 보기 · 확인 창(위 길콩 64) · 공유는 바텀시트, 지운 뒤 toast	page-header(사이드바는 대학 찾기만 펼치고 소분류 선택 없음) → 본문 최대 720 가운데(문항 · 결과), 소개 카드 오른쪽 길콩 160, 준비 방식 카드 5장 한 줄 → 결과 히어로 포즈 약 240 → 결과 전형 카드 2열. 설명 · 답변 보기 · 확인 창 · 공유는 모달. 판정 색 · 점수 없음, 캐릭터 색은 mascot-illustration 안에만"
3. **새 컴포넌트 2개.**
   - ① **mascot-illustration** — 위치: Shapes › "대학 표시" 문단 바로 다음 줄에 **추가**(2026-11-23 제안 7 문장을 대신함):
     > 캐릭터(2026-11-24 전형 성향 탐색): 길콩 일러스트(mascot-illustration)는 app/public/assets/admission-style의 PNG(guide gilkong.png + 결과 포즈 gilkong-<kind>-v1.png 8장)를 원본 색 · 비율 그대로 이미지 채움으로 둡니다. 로고처럼 팔레트 예외이고 고치거나 변수에 연결하지 않습니다. 예외는 그림 안에만이고, 그림 밖(배경 · 테두리 · 글자)은 흑백 팔레트를 씁니다. 그림자 · 둥근 배경 원 · 배경 도형 · 장식 색을 두지 않고 모서리 0 사각 영역에 투명 배경 그대로 둡니다. 쓰는 곳은 전형 성향 탐색 화면(소개 약 160 · 준비 방식 카드 48 · 문항 안내 40 + 말풍선 한 줄 · 결과 히어로 모바일 약 180 / PC 약 240 · 확인 창 제목 위 64)과 그 화면으로 들어가는 promo-banner(약 60)뿐입니다. 결과 유형마다 포즈가 달라도 우열을 뜻하지 않게 같은 크기로 두고, 판정 · 점수 · 성적이 나오는 화면에는 쓰지 않습니다. 장식이라 대체 텍스트는 비웁니다.
   - ② **promo-banner** — 위치: Components › Navigation › brand-logo 문단 바로 다음 줄에 **추가**:
     > promo-banner — 다른 화면 안에서 독립 화면으로 들어가는 띠 배너(2026-11-24 전형 성향 탐색): 카드 전체가 링크 하나입니다. 채움 {colors.canvas-soft}, Page 바탕 위에 놓이면 1px {colors.hairline} 테두리를 더해 바탕과 구분합니다. 모서리 0, 그림자 없음, 높이 72(글자가 두 줄로 흐르면 늘어남), 좌우 패딩 {spacing.md}. 왼쪽 굵은 줄 {typography.title} {colors.ink}(12자 안쪽) + 보조 줄 {typography.body-sm} {colors.ink-soft}(20자 안쪽, {colors.text-muted}는 {colors.canvas-soft} 위 대비가 4.5:1에 못 미쳐 쓰지 않음), 오른쪽 mascot-illustration 약 60 → › {colors.ink}. 닫을 수 있는 자리는 › 오른쪽에 닫기 ✕(누르는 영역 44×44, 이번만 숨김)를 두고, 배너 아래 오른쪽 정렬 텍스트 버튼 "다시 보지 않기"({typography.caption} {colors.ink-soft} 밑줄, 이 기기에서 계속 숨김)로 무게를 나눕니다. 닫으면 toast로 다시 볼 곳을 알리고, 닫기 없는 상시 진입점을 최소 1곳 둡니다. 판정 색 · Route Blue · 숫자 배지 · 퍼센트를 쓰지 않고, 화면 맨 위 캐러셀이나 화면 절반 크기로 쓰지 않습니다. 한 화면에 1개, 첫 블록 바로 아래(두 번째 블록) 또는 화면 머리 바로 아래에 둡니다. 쓰는 곳: 홈(닫기 가능) · 전형계획 목록(닫기 없음).
4. **rules/design-rules.json** (design.md 반영과 함께):
   - components에 추가: "promo-banner", "mascot-illustration"
   - palette_exempt에 추가: "mascot-illustration" → ["univ-logo", "brand-logo", "mascot-illustration"]
   - source.sha256: 위 1~3 반영 뒤 design.md 새 해시
   - (확인 필요) J1 · J7이 IMAGE fill 노드를 어떻게 세는지(01-research 미결 12). palette_exempt 이름으로 빠지면 추가 조치 없음.
5. **데이터 · PRD · 다른 slug(디자인 규칙 아님).** prd 6-1 근처에 "전형 성향 탐색(체험판): 메뉴 없이 홈 · 전형계획 목록 배너로 진입 · 15문항 자기탐색 · 서버 저장 없음 · 성적 · 입결과 결합하지 않음 · 결과는 판정이 아님"을 한 절로 기록하는 게 필요해요. home · admissions-list 02-spec 개정과 시안 다시 그리기, 앱 nav.ts · 배너 구현, 앱 문구 맞추기(D10 open 유형 이름 · 눈썹 · D12 규칙 문장 · D13 NEXT STEP · T1 숫자 표현 · 고지 해요체)는 각 작업 몫이에요. 참고: design.md 전반에서 Page 바탕 위 {colors.text-muted} 글자(page-header 경로 caption 등)도 같은 대비 문제(약 4.46:1)가 있어요 — 이 slug 밖이라 따로 검토가 필요해요.
