# 이어서 할 일 (Figma MCP 호출 한도 도달 — 2026-11-18)

> **2026-11-19 갱신:** 아래 Figma 미반영 화면을 옮겼다. 최신 상태·노드 ID는 [시안 이전 기록](figma-transfer-2026-11-19.md)과 [JSON 인덱스](figma-transfer-2026-11-19.json)를 먼저 확인한다. 아래 본문은 과거 작업 메모로 보존한다. G3는 FIGMA_TOKEN 부재로 미실행이다.

Figma: "You've reached the Figma MCP tool call limit on the Education plan". 한도가 풀리면 아래부터 재개.

## admission-results (중단)
- Section 103:129734 (x=34000, y=100, 3010×3060). 390 프레임 103:247898 일부 완성(앱바·sub-nav·세그먼트·범례·출처·disclaimer·탭바). 미완: cut-dot-plot 103:247998 값 넣기, disclaimer-note 103:248629 안 글자 FILL+HEIGHT, 1440 프레임, 상태 5개, 03-draft.json.
- cut-dot-plot 행 머리 넓히기(검증됨): head.layoutSizingHorizontal='HUG', name textAutoResize='WIDTH_AND_HEIGHT', head.paddingRight = H − nameW(로고 있으면 −28 더). 이후 식에서 120 대신 H: P = W − H − 12, axis.paddingLeft = H, band-row(오른쪽 0 → 왼쪽 H+px(a) → 오른쪽 12+P−px(b)), my-line-row H+px−1, bubble-row max(0,H+px−60), dot-j-row px−4, link-1-row(오른쪽 0 → 왼쪽 px(min) → 오른쪽 P−px(max)), 겹치는 점은 dot-row paddingTop/Bottom 6.
- 축 1.0~3.0: tick 2~4 켬, 5~16 끔, axis-min "1.0", axis-max "3.0", half labels 켬, tick 3 글자 "2.0".
- 데이터: 02-spec 2025/2026/2027 열 → 2024/2025/2026. 전년 대비 = 2026 − 2025.
- 계획: 390은 의예과~사학과 10행, 1440 H=200(대학별)/H=240(내 비교), 내 비교·전체는 2026만(연도 칩 "2026학년도 ▾"), PC 표 13행은 data-table 두 개(둘째 show head 끔), 표 "담기" 열 빼고 하트는 오른쪽 패널, 390-dot-tooltip 문구 "공식 발표 입결만 모았어요".
- DS 보강 후보: cut-dot-plot 행 12개·행당 점 9개, dot selected 변형 + 안내선, 말풍선 꼬리, data-table 13행 이상, interest-heart 셀.

## grade-input v2 (일부)
- 사용자 문구 수정: PDF 파일 고르기·읽는 중·확인 화면의 처리 방식 설명 배지를 통째로 제거하고 단계 caption을 왼쪽으로 당긴다. 확인 부제는 "다른 칸은 눌러서 고쳐 주세요."만 사용한다. 01-research P9·02-spec 수정 완료. Figma 적용은 연결 도구의 `Unknown tool` 오류로 미완료이므로 재연결 후 기존 PC·모바일 상태 프레임 모두 반영할 것.
- 끝: 본 프레임 72:7965/72:2276에 새 내비·보기 세그먼트·PDF 진입 버튼, 상태 3개(1440-pdf-drop 103:238399, 1440-pdf-reading 103:238509, 1440-pdf-fail 103:238613), 03-draft.json states 3개.
- **결함**: 상태 3개 scrim이 불투명(ink + opacity 0.4로 다시) / 390 본 프레임 edit-sheet 72:2469가 visible=false로 남음(다시 켬).
- 남은 상태 7개(Section 98:1907, 높이 7060): 390-pdf-drop(x80,y1080), 1440-pdf-review(x550,y3080), 390-pdf-review(x80,y3080), 1440-pdf-overwrite(x550,y4080), 390-pdf-done(x80,y5080), 1440-view-year(x550,y6080), 390-view-year(x80,y6080).
- 평균 등급 숫자 → "평균 계산식 준비 중" 배지로 바꿈. icon/loader 없음(제안).

## login 끝 / signup 시작 못 함
- login: Section 103:190762, 390 103:190916, 1440 103:190813, 상태 6개(03-draft.json 작성됨). 1440-forgot-sent 안내 띠 줄바꿈 확대 확인 필요.
- signup: 빈 Section 103:190763(x=30000,y=3020). 첫 줄 signup/390(80,80), signup/1440(550,80), 둘째 줄 y1080: 1440-sent, 390-terms, 1440-error. 체크박스 20×20 canvas+hairline, 진행 막대 4칸(첫 칸 accent), segmented selected=3(고등학교), 드롭다운 = text-input show right icon, 약관 시트 bottom-sheet 66:510 detach. 끝나면 03-draft.json.
- 문구 미확인: lab-stock 원문(login-form.tsx, /forgot-password) 대조 필요. icon/eye 없음(제안).

## result-summary (일부)
- Section 103:140083(31000,1560). 끝: 1440 103:140084, 1440-empty 103:163212, 1440-no-results 103:167369, 1440-toast 103:171509, 1440-dropdown 103:242451(dropdown 103:247884).
- 결함(1440-dropdown): 학생 열 84로 좁아 "07 바다"·"강원대학 / 교" 글자 끊김 → 학생 열 ~144, 지원 칸 150, 셀 로고 끄기 검토 / text-input 32로 resize해 field 48이 잘림 → 기본 48로.
- 남은: result-summary/390 전체, 1440-mock-score(80,2080), 그 뒤 03-draft.json(아직 안 씀).

## home·score-trend·univ-score·program-detail (내비·상태 완료)
- 확인 필요 1순위: scrim 3개(103:183655, 103:183750, 103:237656) 레이어 opacity 0.4로 바꾼 결과 스크린샷 미확인. score-trend 1440-데이터 부족 줄바꿈, univ-score 상태 3개 재확인.
- 참고: ink 변수 연결 칠의 paint opacity가 안 먹음 → scrim은 칠 100% + 레이어 opacity 0.4(모든 화면 공통 방법으로).

## univ-detail·doelgak·susiro·saenggibu-ai (내비·상태 완료)
- 상태 12개 완료, scrim 40% 확인됨. DS 후보: susi-slot row `program` 글자 FIXED 152 → FILL(지금 화면 인스턴스에서 덮어씀), QR 표시 컴포넌트, ai-label "자동" 변형.

## card-collect (완료)
- Section 103:175744(22000,1560, 6160×3060), 390 103:248666, 1440 103:175745, 상태 7개. Section 바닥 y=4620 → 관리자 줄(y=3020, login x=20000~)과 겹칠 수 있음.

## mock-score (완료)
- Section 103:163000(42000,100, 높이 5004 → y 5104까지), 390 103:163001, 1440 103:249436, 상태 8개.

## counsel (완료)
- Section 103:156761(13000,1560, 높이 6004 → y 7564), 390 103:156762, 1440 103:251509, 상태 9개. S6·S7 미작성. DS 후보: counsel-timeline/item 영역 라벨·다음에 볼 것·수정 버튼, text-button.

## 교사 5개·admin-rules (완료)
- 교사 5개 새 내비 + 상태 14개, admin-rules 본 2 + 상태 12. DS 후보: app-bar 뒤로가기 끄기 속성(소분류 화면에도 화살표가 보임), tab-bar-pill mode=관리자(규칙 관리 · 더보기), univ-card 관리자 변형, counsel-timeline/item 배지·selected, data-table 14행, 표 안 편집 셀 32, sidebar 로그인 사용자 칸, step-indicator.

## five-to-nine v3.2 설계 완료 (G2 통과) — 시안 다시 그리기 필요
- 새 숫자(전 교과 1.31 → 약 2.0~2.3, 대표 2.13 등 4조합), A-3 준비 중, B = 교육청 실측표. 대표값이 바뀌어 배치표 팝업 4개(표·좌표 × 390·1440)의 내 위치 줄도 다시 그려야 함. 본 화면 + 팝업 표·좌표 + 국수영사 4칸 + chart-column 아이콘.

## 이름 변경 "가채점" → "모의고사" (Figma 반영 필요)
- design-system: sidebar-item/가채점 → 모의고사, 교사 가채점 수합 → 모의고사 수합. 화면: mock-score 제목·breadcrumb "성적 › 모의고사", 모든 화면 sub-nav 성적 탭의 "가채점", result-summary 탭 "가채점 수합" → "모의고사 수합", share-sheet 문구.

## 페이지 배치 정리 (모든 S3 끝난 뒤)
- 상태 프레임이 Section 아래로 늘어나 학생 줄이 y=1460을 넘음 → 교사 줄(y=1560)·관리자 줄(y=3020) Section들을 겹치지 않게 아래로 이동. admissions-list Section 아래 끝 y=2104, admission-results y=3160.

## 2026-11-20 grade-input v3 (화면 정리)
- S2 v3 절 추가, G2 통과. S3 시안: 기본 2개 다시 그림 + 상태 프레임 6개(03-draft.json states). 다른 Section(y ≥ 8704) 16개를 아래로 3076 이동.
- G3: 처음엔 토큰이 없어 MCP 값(--fixture)으로 통과, 같은 날 사용자가 토큰(사용자 환경변수)을 넣은 뒤 Figma REST로 다시 실행해 통과. judge도 이제 실행 가능(새 세션 전에는 사용자 환경변수에서 불러와 실행).
- 다음: 사람이 04-approval.md 작성 → `gate.py grade-input approval`.
