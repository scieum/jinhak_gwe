# 02-spec — 수시로 (수시 6장 보드) · 상태 프레임 상세화

> 단계: S2 (상세화 개정) · 작성일: 2026-11-18 · 개정: 2026-11-24
> 근거: work/susiro/01-research.md 반영 포인트 P1~P8 / docs/prd.md 6-7, 9장 R-CARD-001~005, 7-2, 8장 ApplicationBoard / docs/design.md(최신 — 서비스 이름 U:NAVI · `brand-logo` 124/92 · App Shell 대분류-소분류 · `page-header` · 확인 창 규칙과 내 기기 파일 저장 예외 · `text-input` 변형 select · multiline · date · `text-input-error` 아이콘 · `toast` · `empty-state` · 화면 오류 줄 · 불러오는 중 · 모서리 0) / rules/design-rules.json / 앱 구현 app/src/screens/Susiro.tsx · components/SendToTeacher.tsx · SenderFields.tsx · Modal.tsx · domain/board.ts · store/studentDb.ts
> 기본 프레임: susiro/390 (390×844), susiro/1440 (1440×900). 05-build.json의 승인 노드(346:131302 · 346:131328)를 고쳐 그려요.
> 상태 프레임: 5장의 35장(모바일 21 · PC 14). 이름 susiro/<폭>-<상태>. 03-draft.json `states`에만 적고 `frames`에는 넣지 않아요(G3은 기본 2장만 세요).
> 필수 컴포넌트: `disclaimer-note` (requires_disclaimer_note 대상, requires_trace_accordion 대상 아님)

## 0. 이번 개정에서 바로잡은 점 (승인 레이아웃은 그대로)

| # | 어긋난 점 | 바로잡기 | 근거 |
|---|---|---|---|
| C1 | 서비스 이름 · 워드마크 "진학 내비" | 글자 워드마크를 없애고 `brand-logo`(U:NAVI 로고 원본 색, 팔레트 예외). 폭 모바일 머리 92 · PC 사이드바 124 | design.md brand-logo(2026-11-24) |
| C2 | 모바일 머리 = 앱바 "수시로" + 아래 줄 개수 + 오른쪽 "순서 변경" | 수시로는 수시 전략의 소분류라 머리 = `brand-logo` 92 → 화면 제목 "수시 전략" heading-1 → `sub-nav`(수시로 선택). 뒤로가기 없음. 개수 "6회 제한 5/6장"과 `button-pill-soft` "순서 변경"은 시나리오 탭 아래 개수 줄로 내려요 | App Shell 모바일 · page-header 모바일 규칙 |
| C3 | 탭바 "수시로 탭 선택" | `tab-bar-pill` 대분류 5개: 홈 · 성적 · 대학 찾기 · 수시 전략(선택) · 더보기 | App Shell 모바일 |
| C4 | PC 사이드바 "학생 그룹 메뉴 중 수시로 잉크 알약 선택" | `sidebar`: `brand-logo` 124 → `sidebar-group` 홈 › · 성적 › · 대학 찾기 › · 수시 전략 ▾(펼침) → `sidebar-item` 수시로(선택 = accent-soft 채움 + 왼쪽 3px Route Blue 막대 + ink 글자) · 원서·서류 체크리스트(icon/list-checks) · 입시 일정(icon/calendar) · 상담 질문·할 일(icon/message-square) · 생기부 AI(icon/sparkles). 맨 아래 데이터 기준일 + `button-pill-soft` "백업" | App Shell PC · 메뉴 목록 |
| C5 | PC 상단 바 64 | `page-header`: 경로 "수시 전략 ›" caption text-muted → 제목 "수시로" heading-1 / 오른쪽 `data-status-badge` "시행계획 기준 · 2026-11-18" + `mode-switch`(학생) + `button-pill-soft` "잠금" | design.md page-header |
| C6 | 모서리: 누르는 요소 알약 9999, 카드 · 빈 칸 24, 경고 · 시트 16, 툴팁 8 | 모두 0. 원형은 판정 아이콘 ●처럼 원래 원형인 표식만 | design.md Overview "모서리는 모두 직각" |
| C7 | 수능최저 "2개 합 5" · "3개 합 7"처럼 조건 숫자를 칩에 씀 | 앱 값 세 가지만 흑백 `data-status-badge`: "최저 없음" · "최저 있음" · "최저 확인 필요". 충족 ● · 근접 ▲ · 미충족 ✕ 배지는 학생 화면에서 검수 전 판정하지 않아 쓰지 않아요 | design.md 수능 최저 판정 배지 · 앱 csatStates |
| C8 | "+ 대학 담기" · 빈 보드 버튼이 될각으로 이동 | 앱처럼 원서·서류 체크리스트에 등록한 전형에서 고르는 "담을 전형 고르기" 시트(모바일 `bottom-sheet` · PC `modal`)를 열어요. 빈 보드 `button-primary` 문구 "전형 담기" | 앱 Susiro picking |
| C9 | 시나리오 관리가 "+ 새 안" 하나 | 앱에 새 안 · 현재 안 복사 · 현재 안 삭제가 있어요. 모바일은 `button-pill-soft` "안 관리"(누르면 동작 시트), PC는 "+ 새 안" 옆에 `button-pill-soft` "안 관리 ▾"(떠 있는 목록: 현재 안 복사 · 현재 안 삭제). 안은 최대 5개(A~E안) | 앱 SCENARIO_NAMES · addScenario · deleteBoard |
| C10 | 고지 "데이터 기준일 2026-11-18" | `disclaimer-note` "ⓘ 대학 공식 자료가 최종 기준이에요 · 6회 제외 기관은 과학기술원·사관학교·경찰대 목록으로 나눠요" | 앱 고지 문장 |
| C11 | 4장 상태를 "프레임에 그리지 않음" | 5장 상태 프레임 35장으로 그려요. 4장은 동작 규칙만 남겨요 | 이번 상세화 원칙 |
| C12 | 툴팁 · 모바일 앱바를 컴포넌트 없음으로 적음 | 앱바는 rules에 `app-bar`가 생겼지만 이 화면은 대분류 첫 화면 머리라 쓰지 않아요. 툴팁은 여전히 없어 9장 제안 1 유지 | rules components |

판정 표시는 승인 시안 그대로 둬요(● 안정 · ◐ 적정 · ▲ 소신 · ■ 위험, 색 + 아이콘 + 이름). 지금 앱은 검수된 판정 기준이 없어 모든 칸이 "판정 준비 중"이에요. 이 모습은 상태 프레임 390-judge-pending · 1440-judge-pending으로 따로 그려요(NEVER-1).

## 1. 예시 데이터 (두 프레임 공통, 가상 대학명)

현재 시나리오: A안. 6회 제한 칸 5장 채움 + 빈 칸 1, 6회 제외 1장.

| 순위 | 대학 | 전형 · 모집단위 | 판정 | 수능최저 | 고사 일정 | 메모 |
|---|---|---|---|---|---|---|
| 1 | 가온대 | 학생부종합 일반 · 컴퓨터공학과 | ▲ 소신 | 최저 없음 | 면접 11.21(토) | 동아리 탐구 활동을 강조할래요 |
| 2 | 누리대 | 학생부교과 지역균형 · 소프트웨어학부 | ◐ 적정 | 최저 확인 필요 | 고사 없음 | 학교장 추천 받아야 해요 |
| 3 | 다솜대 | 학생부종합 일반 · 정보보호학과 | ■ 위험 | 최저 없음 | 면접 11.21(토) | 면접 준비 자료 모으기 |
| 4 | 라온대 | 논술 · 산업공학과 | ▲ 소신 | 최저 있음 | 논술 11.28(토) | 기출 3년치 풀기 |
| 5 | 마루대 | 학생부교과 · 전자공학과 | ■ 위험 | 최저 있음 | 고사 없음 | 모의고사 결과 보고 다시 정하기 |
| 6 | (빈 칸) | — | — | — | — | — |
| 제외 | 바름과학기술원 | 일반전형 · 기초과학부 | ◐ 적정 | 최저 없음 | 면접 11.14(토) | 6회 제한에 들어가지 않아요 |

- 개수: 6회 제한 5/6장, 6회 제외 1장
- 전형 유형 분포: 교과 2 · 종합 2 · 논술 1 · 6회 제외 1
- 판정 분포(6회 제한 칸): 안정 0 · 적정 1 · 소신 2 · 위험 2
- 경고 2개 (R-CARD-002, R-CARD-003)
  - 경고 1 "면접 일정이 겹쳐요": 11월 21일(토)에 가온대·다솜대 고사가 함께 있어요. 한 곳은 다른 카드로 바꿔 보세요. 관련 칸 1, 3
  - 경고 2 "소신·위험 쪽으로 쏠렸어요": 5장 중 4장이 소신·위험이고 안정은 0장이에요. 입결과 비교하면 안정에 드는 카드를 1장 이상 넣어 보세요. 관련 칸 1, 3, 4, 5
- 담을 전형 목록(원서·서류 체크리스트에 등록, 상태 프레임용): 위 6개 + 사랑대 학생부종합 · 데이터과학과, 아름대 학생부교과 · 통계학과, 하늘사관학교 일반 · 인문(6회 제외)

## 2. 모바일 390×844 구성 (위에서 아래로)

고정 영역: 경고 요약 바(스크롤하면 `sub-nav` 아래에 붙음), 하단 주요 버튼, 하단 탭바. 좌우 패딩 16, 콘텐츠 폭 358. 아래 y 값은 배치 기준이에요.

1. 화면 머리 (y 0~140) [C2]
   - `brand-logo` 92 (y 12~34)
   - 화면 제목 "수시 전략" heading-1 (y 44~84)
   - `sub-nav` (y 96~140): 수시로(선택, ink SemiBold + 아래 2px Route Blue 막대) · 원서·서류 체크리스트 · 입시 일정 · 상담 질문·할 일 · 생기부 AI, 넘치면 가로 스크롤
2. 경고 요약 바 (y 148~204) — `warning-callout` 요약형 [P7]
   - 1줄: ▲ "경고 2개 · 면접 일정 겹침 외 1개" + 오른쪽 펼침 화살표
   - 2줄: "교과 2 · 종합 2 · 논술 1 · 6회 제외 1" (body-sm, ink)
   - 누르면 390-warnings-sheet
3. 시나리오 탭 (y 212~256) — `scenario-tabs` [P6]
   - A안(선택, `segmented-control-active`) · B안 · C안, 오른쪽 끝 `button-pill-soft` "안 관리" [C9]
4. 개수 줄 (y 264~296) [C2, P2]
   - 왼쪽 "6회 제한 5/6장 · 6회 제외 1장"(caption, 고정폭 숫자), 오른쪽 `button-pill-soft` "순서 변경"(높이 32, 터치 44) → 390-reorder-sheet [P3]
5. 6칸 세로 목록 (y 304~694) — `susi-slot` ×6, 칸 높이 60, 간격 6 [P1]
   - 채운 칸 1~5: 순위 숫자(고정폭) → `univ-monogram` 32 → 텍스트 2줄(대학명 title / "종합 · 컴퓨터공학과 · 최저 없음" caption muted, 넘치면 한 줄 말줄임) → 오른쪽 위 `judge-badge`, 아래 고사일 칩("면접 11.21") → 맨 오른쪽 정렬 핸들 ≡
   - 칸을 누르면 칸 상세(390-slot-detail). 메모는 상세에서 보여줘요.
   - 빈 칸 6: 1px 점선 hairline + 모서리 0 + 가운데 "+ 대학 담기"(text-muted). 누르면 390-pick [C8]
6. 6회 제외 줄 · 고지 — 하단 버튼 아래로 스크롤해야 보여요(390-bottom)
   - 라벨 "6회 제외 1장"(caption muted) → `susi-slot` 1칸(바름과학기술원, 칸 머리 "6회 제외" 흑백 칩, 순서 핸들 없음) → `disclaimer-note` [C10]
7. 하단 주요 버튼 (y 700~752, 고정) — `button-primary` "상담카드 보내기" 전체 폭, 높이 52 [P2]
8. 하단 탭바 (y 764~828, 고정) — `tab-bar-pill`, 수시 전략 선택 [C3]

## 3. PC 1440×900 구성

앱 셸: 왼쪽 `sidebar` 248 + `page-header` + 본문(x 248~1080) + 오른쪽 경고 패널 360(x 1080~1440, 고정). 본문 좌우 패딩 32, 콘텐츠 폭 768.

1. 왼쪽 `sidebar` (x 0~248) — 0장 C4
2. `page-header` (x 248~1440) — 0장 C5
3. 본문 위 줄 (y 96~136)
   - 왼쪽: `scenario-tabs` A안(선택) · B안 · C안 + `button-pill-soft` "+ 새 안" + `button-pill-soft` "안 관리 ▾" [P6, C9]
   - 오른쪽: "6회 제한 5/6장"(title, 고정폭 숫자) + `button-outline` "PDF로 내보내기"(학부모 공유용 요약)
4. 전형 유형 요약 줄 (y 160~248) — `stat-tile` ×4, 각 174×88, 흑백 [P7]
   - 교과 2 · 종합 2 · 논술 1 · 6회 제외 1 (라벨 caption → 값 numeric)
5. 3×2 카드 그리드 (y 272~696) — `susi-slot` ×6, 카드 240×200, 간격 24 [P1]
   - 채운 칸(패딩 16): 1줄 순위 숫자 + 끌기 핸들 ⠿ + `univ-monogram` 40, 오른쪽 위 `judge-badge` → 대학명 heading-3 → 전형·모집단위 body-sm muted(두 줄까지) → 칩 줄(고사일 "면접 11.21(토)", 수능최저 "최저 없음") → 메모 1줄 caption muted
   - 빈 칸 6: 점선 hairline + 모서리 0 + 가운데 "+ 대학 담기" text-muted → 1440-pick
   - 경고 1 선택 상태: 칸 1, 3에 1px 잉크 안쪽 테두리
6. 6회 제외 줄 (y 720~820)
   - 라벨 "6회 제외 1장"(caption muted) → `susi-slot` 가로형 1칸(768×72): "6회 제외" 흑백 칩 + `univ-monogram` + 대학명·전형 + `judge-badge` + 고사일 칩
7. 오른쪽 경고 패널 (x 1080~1440, y 0~900, 고정, 패딩 24, 내부 폭 312) [P5]
   - 제목 "조합 점검"(heading-4) + "경고 2개"(caption)
   - `warning-callout` 경고 1 (선택, 1px 잉크 테두리) → `warning-callout` 경고 2
   - 소제목 "판정 분포" + `judge-badge` 4개 세로, 각 오른쪽 개수(안정 0 · 적정 1 · 소신 2 · 위험 2, 고정폭)
   - 패널 아래쪽: `disclaimer-note` → `button-primary` "상담카드 보내기" 312×44

## 4. 동작 규칙 (상태 프레임이 따르는 규칙)

- 경고를 누르면(모바일은 시트 안, PC는 패널) 관련 칸에 1px 잉크 테두리. 모바일은 시트가 닫혀요.
- 순서 변경: 모바일은 칸 길게 누르기 또는 "순서 변경" 시트(행마다 핸들 + 위·아래 버튼 + `button-primary` "적용하기"). PC는 카드를 끌어요. 키보드는 카드 포커스 → Space로 집기 → 방향키 → Space로 놓기. 칸이 자리를 바꾸는 애니메이션만 쓰고, 움직임 줄이기 설정이면 바로 바꿔요. 6회 제외 칸은 순위를 바꾸지 않아요. [P3]
- 담기: 빈 칸 "+ 대학 담기" → 담을 전형 고르기(모바일 `bottom-sheet` 단일 선택 목록, PC `modal`). 고르면 바로 담기고 닫히며 `toast`. 6장을 채우면 6회 제한 전형 행은 고를 수 없고 6회 제외 전형만 담겨요. [R-CARD-001]
- 칸 상세: 모바일 `bottom-sheet`, PC `modal`. 고사 `text-input` 변형 select(고사 없음 · 면접 · 논술 · 실기) → 고사일 `text-input` 변형 type=date(고사 없음이면 숨김) → 수능최저 select(최저 없음 · 최저 있음 · 최저 확인 필요) → 메모 `text-input` 변형 multiline(최대 200자, 오른쪽 아래 "n/200" caption). 버튼 `button-outline` "이 칸 비우기" · `button-outline` "취소" · `button-primary` "저장".
- 확인 창(design.md 규칙): 안 삭제 · 칸 비우기 · 고친 칸을 저장하지 않고 닫기 앞에 PC `modal`(최대 폭 560, 버튼 오른쪽 정렬) / 모바일 `bottom-sheet`(버튼 세로, primary 위)로 물어요. 실행 버튼은 `button-primary` 잉크 채움, 위험 색 채움 없음. 끝나면 `toast` 한 줄.
- 확인 없이 바로 하는 일: 담기 · 새 안 · 안 복사 · 순서 바꾸기(되돌리기 쉬움) → `toast`만. 상담카드 파일 저장은 `share-sheet`의 "파일로 저장" 버튼이 확인을 겸해요(내 기기 파일 저장 예외). PDF로 내보내기도 내 기기 저장이라 바로 저장 + `toast`.
- 빈 보드: 6칸 빈 `susi-slot`은 그대로 두고 위에 `empty-state`. 상담카드 보내기는 비활성 + "1장 이상 담아야 보낼 수 있어요". [P8]
- 상담카드 보내기: `share-sheet`(모바일 `bottom-sheet`, PC `modal`). 위 `segmented-control` "QR로 보여주기 · 파일로 저장"(기본 파일로 저장) → 안내 문장 → 이름표(학급 코드 · 번호 · 별칭, 실명 넣지 않음) → 버튼. QR 모드는 큰 QR 한 장 + "1/3" + 이전 장 · 다음 장. 흑백만. [P4]
- 불러오는 중은 "기기에 저장된 기록을 읽고 있어요." 한 줄만(스켈레톤 없음). 오류는 화면 오류 줄(triangle-alert ink, 판정 색 없음), 입력칸 하나의 형식 오류만 `text-input-error`.
- 주요 버튼은 한 화면에 하나. 시트 · 모달이 떠 있으면 그 안의 버튼이 주요 버튼이고 뒤 화면은 scrim에 가려요.

## 5. 상태 프레임 (35장 — 모바일 21 · PC 14)

- 기본 프레임을 복제해 바뀌는 곳만 고쳐요. 규칙(팔레트 · 모서리 0 · 글꼴 · 그림자 · 변수 연결)은 기본 프레임과 같아요.
- 출처: 앱 = 앱에 있는 상태 / 안전장치 = 앱에 없지만 이번에 더하는 확인 창 · 완료 toast / 설계 = 기존 설계서에 적었지만 그리지 않았던 것.
- 시트 · 모달 상태는 뒤에 기본 화면 + {colors.scrim} 전체. 그림자는 `bottom-sheet` · `modal` · `toast` · select 떠 있는 목록에만.
- 모바일 `toast`는 탭바 위 12, PC는 오른쪽 아래 가장자리 32.

### 5-1. 모바일 (390×844)

| 프레임 | 출처 | 보여 주는 것 |
|---|---|---|
| susiro/390-loading | 앱 | 머리 · `sub-nav`까지 두고 그 아래 자리에 "기기에 저장된 기록을 읽고 있어요." body-sm text-muted 한 줄만. 경고 바 · 탭 · 칸 · 하단 버튼 없음, 탭바는 둬요 |
| susiro/390-error | 앱 | `sub-nav` 아래 화면 오류 줄(흰 바탕, triangle-alert 20 ink + body ink) "기기에 저장된 기록을 읽지 못했어요. 브라우저 저장 권한을 확인해 주세요." + `button-outline` "다시 읽기". 칸 없음, `disclaimer-note`는 둬요 |
| susiro/390-empty | 앱 · 설계 | 0장: 경고 바 자리에 `warning-callout` 변형 tone=neutral "ⓘ 조합 점검 0건 · 카드를 담으면 점검해요", 개수 "6회 제한 0/6장", "순서 변경" 꺼짐(text-faint). 칸 위 `empty-state`(선 아이콘 layout-grid) "아직 담은 대학이 없어요" + "원서·서류 체크리스트에 등록한 전형을 빈 칸에 담으면 여기에 6칸으로 모여요." + `button-primary` "전형 담기". 아래 빈 `susi-slot` 6칸 그대로. 하단 "상담카드 보내기"는 비활성(canvas-soft + text-faint) + 위에 caption "1장 이상 담아야 보낼 수 있어요" |
| susiro/390-bottom | 설계 | 끝까지 스크롤: 칸 5 · 6(빈 칸) → "6회 제외 1장" → 바름과학기술원 `susi-slot`(칸 머리 "6회 제외" 칩, 핸들 없음) → `disclaimer-note` → 하단 버튼 · 탭바. 경고 바는 `sub-nav` 아래 붙어 있어요 |
| susiro/390-judge-pending | 앱 | 판정 기준 검수 전(지금 앱): 모든 칸 `judge-badge` 자리에 흑백 `data-status-badge` "판정 준비 중". 경고 바 "경고 1개 · 면접 일정 겹침"(쏠림 경고 없음), 2줄 아래 caption "판정 기준이 검수되면 소신·위험 쏠림도 함께 점검해요." |
| susiro/390-warnings-sheet | 설계 | 경고 바를 누른 뒤 `bottom-sheet`(손잡이, 제목 "조합 점검" heading-4 + "경고 2개" caption, 닫기 x 44×44): `warning-callout` 경고 1 · 경고 2(제목 + 설명 전문) → 소제목 "판정 분포" + `judge-badge` 4개 가로 줄 + 개수 → caption "경고를 누르면 관련 칸을 표시해요." |
| susiro/390-pick | 앱 | 빈 칸 6을 누른 뒤 `bottom-sheet` "담을 전형 고르기": 단일 선택 목록 행 48(대학명 title + "2028학년도 · 학생부종합 · 데이터과학과" body-sm text-muted, check 없음) 사랑대 · 아름대 · 하늘사관학교(행 끝 "6회 제외" 흑백 칩). 아래 줄 `button-outline` "전형 등록하러 가기" · `button-outline` "닫기" |
| susiro/390-pick-full | 앱 | 6장 가득(뒤 보드 6/6, 칸 아래 `button-outline` "6회 제외 전형 담기"): 같은 시트에서 사랑대 · 아름대 행은 text-faint + 누를 수 없음, 하늘사관학교 행만 ink. 목록 위 `warning-callout` 변형 tone=neutral "6장을 모두 채웠어요. 6회 제외 전형만 추가할 수 있어요." |
| susiro/390-pick-none | 앱 | 등록한 전형 0개: 시트 본문 body "먼저 원서·서류 체크리스트에서 지원할 전형을 등록해 주세요." + `button-primary` "전형 등록하러 가기" + `button-outline` "닫기". 모두 담았을 때 문구 "등록한 전형을 모두 이 안에 담았어요."는 같은 자리(그리지 않음) |
| susiro/390-add-toast | 앱 | 사랑대를 고른 뒤: 칸 6이 사랑대로 채워짐(`judge-badge` 자리 "판정 준비 중" 배지), 개수 "6회 제한 6/6장", `toast` "A안에 카드를 담았어요." |
| susiro/390-from-plan | 앱 | 원서·서류 체크리스트에서 "수시로에 담기"로 들어온 직후: 시나리오 탭 아래 흰 카드 "지원 준비에서 가져온 전형" — 아름대 · 통계학과 heading-3 → "2028학년도 · 학생부교과" body → caption "아래에서 담을 안을 선택한 뒤 추가해 주세요. 학년도·전형·학과를 그대로 연결해요." → `button-primary` "이 전형을 A안에 담기" + `button-outline` "나중에 담기". 이 카드가 있는 동안 하단 "상담카드 보내기"는 `button-outline`으로 내려요(주요 버튼 1개) |
| susiro/390-slot-detail | 앱 · 설계 | 칸 1 가온대를 누른 뒤 `bottom-sheet`(높이 약 680, 손잡이, 제목 "가온대" heading-4 + "학생부종합 일반 · 컴퓨터공학과" caption, 닫기 x): 고사 select "면접" → 고사일 date "2026-11-21" → 수능최저 select "최저 없음" → 메모 multiline "동아리 탐구 활동을 강조할래요" + "14/200" → 아래 고정 줄 `button-outline` "이 칸 비우기" · `button-outline` "취소" · `button-primary` "저장" |
| susiro/390-slot-select | 앱 | 390-slot-detail에서 고사 칸을 누른 뒤 두 번째 `bottom-sheet` 단일 선택 목록 "고사": 고사 없음 · 면접(고른 행 = accent-soft + 왼쪽 3px Route Blue 막대 + 오른쪽 check Route Blue) · 논술 · 실기, 행 48, 버튼 없음(고르면 닫힘) |
| susiro/390-slot-clear-confirm | 안전장치 | "이 칸 비우기"를 누른 뒤 `bottom-sheet` 확인 창: "가온대 칸을 비울까요?" heading-4 + body "순위·고사 일정·메모가 함께 지워져요. 원서·서류 체크리스트의 전형은 그대로예요." + `button-primary` "칸 비우기" + `button-outline` "취소"(세로, primary 위) |
| susiro/390-slot-clear-toast | 앱 | 비운 뒤: 아래 칸이 한 순위씩 올라가 1 누리대 · 2 다솜대 · 3 라온대 · 4 마루대, 칸 5 · 6 빈 칸, 개수 "6회 제한 4/6장", 경고 바 "경고 1개 · 소신·위험 쏠림"(일정 겹침 사라짐), `toast` "칸을 비웠어요." |
| susiro/390-leave-confirm | 안전장치 | 메모를 고친 채 닫기 x를 누른 뒤 `bottom-sheet` 확인 창: "고친 내용을 저장하지 않고 닫을까요?" + body "메모와 고사 일정이 고치기 전으로 돌아가요." + `button-primary` "저장하지 않고 닫기" + `button-outline` "계속 고치기" |
| susiro/390-reorder-sheet | 설계 · 앱 | "순서 변경"을 누른 뒤 `bottom-sheet` "순서 변경": 행 56 × 5(순위 숫자 + 대학명 + 오른쪽 위 ↑ · 아래 ↓ 버튼 44×44 + 핸들 ≡), 3번 다솜대 행을 집은 상태(1px ink 테두리, 그림자 없음), 첫 행 ↑ · 마지막 행 ↓은 text-faint. 위 caption "길게 눌러 끌거나 화살표로 옮겨요." 아래 `button-outline` "취소" + `button-primary` "적용하기" |
| susiro/390-scenario-sheet | 앱 | "안 관리"를 누른 뒤 `bottom-sheet` "안 관리" 동작 목록 행 48: "빈 새 안 만들기" · "A안 복사해서 새 안 만들기" · "A안 삭제"(ink 글자, 위험 색 없음). 아래 caption "최대 5개 안을 만들 수 있어요. 복사한 안의 카드·메모·일정은 원래 안과 따로 수정돼요." |
| susiro/390-scenario-delete-confirm | 앱 | "A안 삭제"를 누른 뒤 `bottom-sheet` 확인 창: "A안을 삭제할까요?" + body "이 안의 카드 배치·메모·일정을 지워요. 지원 준비 체크리스트, 관심 전형과 다른 안은 유지돼요." + `button-primary` "안 삭제" + `button-outline` "취소" |
| susiro/390-share-file | 앱 | "상담카드 보내기" 뒤 `share-sheet`(`bottom-sheet`): 제목 "상담카드 보내기" → `segmented-control` QR로 보여주기 · 파일로 저장(선택) → body "A안의 6장과 순위·메모를 상담카드 파일(.jnavi)로 저장해요. 파일을 담임 선생님께 전달해 주세요. 파일에는 내 성적이 들어가지 않아요." → caption "선생님이 알아볼 이름표 · 실명은 넣지 않아요" → `text-input` 학급 코드 "7Q4K" · 번호 "12" · 별칭 "하늘" → `button-outline` "닫기" + `button-primary` "파일로 저장" |
| susiro/390-share-qr | 앱 | QR 모드 · QR 보여주기 뒤: 같은 시트에 큰 QR(흑백, 약 280×280) → "1/3" heading-4 고정폭 → caption "선생님 PC 카메라에 맞춰 주세요. 다 읽히면 다음 장으로 넘겨요." → `button-outline` "이전 장"(꺼짐) · "다음 장" → `button-outline` "이름표 고치기" |

모바일 그리지 않는 변형(문구만, 같은 자리 같은 모양):
- 이름표 오류: 학급 코드 칸 `text-input-error` + triangle-alert 14 + "학급 코드는 선생님이 알려 준 4자예요." / 번호 "번호는 1~99 사이 숫자로 적어 주세요." / 별칭 "별칭은 1~10자로 적어 주세요. 실명 대신 별칭을 써요." (1440-share-error에서 그려요)
- 저장 완료 `toast`: "상담카드 파일을 저장했어요. 담임 선생님께 전달해 주세요." · "칸을 저장했어요." · "B안을 만들었어요." · "A안을 B안으로 복사했어요." · "A안을 삭제했어요." (390-add-toast와 같은 모양)
- 지원 준비 기록을 못 찾음: 390-from-plan 카드 자리에 화면 오류 줄 "연결된 지원 준비 기록을 찾지 못했어요. 체크리스트에서 다시 선택해 주세요." + 링크 "지원 준비 확인" + `button-pill-soft` "안내 닫기"
- 이미 담은 전형: 390-from-plan 주요 버튼이 비활성 "A안에 이미 담았어요"
- 지운 전형 칸: 대학명 "지운 전형" + caption "목록에서 지운 전형이에요. 이 칸을 비워 주세요."
- 학년도가 다른 전형: 390-pick 시트 목록 위 화면 오류 줄 "같은 지원 학년도의 전형만 한 안에 담을 수 있어요. 다른 안을 선택하거나 새 안을 만들어 주세요."
- 저장 실패: 시트 · 모달 안 화면 오류 줄 "저장하지 못했어요. 다시 시도해 주세요."
- 처음 한 번 툴팁: 칸 1 핸들 위 "길게 눌러 순서를 바꿀 수 있어요"(이름 없는 레이어, 모서리 0)
- 5개 안 가득: 390-scenario-sheet의 앞 두 행 text-faint + 누를 수 없음, caption 그대로
- 경고 0건: 390-empty의 tone=neutral 바에 "ⓘ 조합 점검 0건 · 확인할 항목이 없어요"

### 5-2. PC (1440×900)

| 프레임 | 출처 | 보여 주는 것 |
|---|---|---|
| susiro/1440-loading | 앱 | 셸 · `page-header`만 두고 본문 자리에 "기기에 저장된 기록을 읽고 있어요." body-sm text-muted 한 줄. 경고 패널 없음 |
| susiro/1440-error | 앱 | `page-header` 아래 화면 오류 줄(흰 카드) "기기에 저장된 기록을 읽지 못했어요. 브라우저 저장 권한을 확인해 주세요." + `button-outline` "다시 읽기". 그리드 · 패널 없음 |
| susiro/1440-empty | 앱 · 설계 | 0장: `stat-tile` 값 모두 0, 그리드 위 `empty-state` "아직 담은 대학이 없어요" + 설명 + `button-primary` "전형 담기", 아래 빈 `susi-slot` 6칸. 경고 패널: "경고 0개" + body-sm text-muted "등록한 일정과 카드에서 확인할 항목이 없어요. 미정인 일정은 대학 발표 후 입력해 주세요." + 하단 "상담카드 보내기" 비활성 + caption "1장 이상 담아야 보낼 수 있어요" |
| susiro/1440-judge-pending | 앱 | 판정 기준 검수 전(지금 앱): 카드 `judge-badge` 자리 흑백 `data-status-badge` "판정 준비 중", 패널 경고 1개(면접 일정 겹침)만, "판정 분포" 묶음 대신 caption "판정 기준이 검수되면 소신·위험 쏠림도 함께 점검해요. 지금은 고사 일정 겹침과 6장 제한만 점검해요." |
| susiro/1440-from-plan | 앱 | 본문 위 줄 아래 흰 카드 "지원 준비에서 가져온 전형"(390-from-plan과 같은 문구, 버튼 가로) — `button-primary` "이 전형을 A안에 담기" + `button-outline` "나중에 담기". 패널 하단 "상담카드 보내기"는 `button-outline`으로 내려요 |
| susiro/1440-pick | 앱 | 빈 칸 6을 누른 뒤 `modal`(폭 560) "담을 전형 고르기": 행 56(대학명 title + 학년도 · 전형 · 학과 body-sm text-muted, 6회 제외 칩), 마우스를 올린 행 canvas-soft. 아래 오른쪽 정렬 `button-outline` "전형 등록하러 가기" · "닫기" |
| susiro/1440-pick-full | 앱 | 6장 가득: 그리드 6칸 채움 + 그리드 아래 `button-outline` "6회 제외 전형 담기"를 누른 뒤 같은 `modal`, 6회 제한 행 text-faint · 누를 수 없음, 위 `warning-callout` 변형 tone=neutral "6장을 모두 채웠어요. 6회 제외 전형만 추가할 수 있어요." |
| susiro/1440-slot-detail | 앱 · 설계 | 칸 1 카드를 누른 뒤 `modal`(폭 560): 390-slot-detail과 같은 칸 · 순서, 고사 select를 연 모습(`text-input-focused` + 바로 아래 떠 있는 목록 canvas + 1px hairline + 그림자 overlay, 행 40, "면접" 고른 행 Elevation Selected + check Route Blue, "논술" 행 마우스 올림 canvas-soft). 버튼 오른쪽 정렬 "이 칸 비우기" · "취소" · `button-primary` "저장" |
| susiro/1440-slot-clear-confirm | 안전장치 | `modal` 확인 창 "가온대 칸을 비울까요?" + 390과 같은 body, 오른쪽 정렬 `button-outline` "취소" · `button-primary` "칸 비우기" |
| susiro/1440-drag | 설계 | 3번 다솜대 카드를 끄는 중: 원래 자리에 점선 hairline 빈 틀, 끄는 카드는 1px ink 테두리(그림자 없음)로 2번 자리 위, 키보드 안내 caption "Space로 놓고 방향키로 옮겨요." 그리드 위에. 판정 · 경고 색 변화 없음 |
| susiro/1440-scenario-menu | 앱 | "안 관리 ▾"를 누른 뒤 아래 4px 떠 있는 목록(폭 200, 행 40): "현재 안 복사" · "현재 안 삭제", 옆 caption "최대 5개 안을 만들 수 있어요. 복사한 안의 카드·메모·일정은 원래 안과 따로 수정돼요." |
| susiro/1440-scenario-delete-confirm | 앱 | `modal` 확인 창 "B안을 삭제할까요?" + "이 안의 카드 배치·메모·일정을 지워요. 지원 준비 체크리스트, 관심 전형과 다른 안은 유지돼요." + 오른쪽 정렬 "취소" · `button-primary` "안 삭제". 뒤 탭은 B안 선택 |
| susiro/1440-scenario-limit | 앱 | 안 5개: `scenario-tabs` A안 · B안 · C안 · D안 · E안, "+ 새 안" 꺼짐(text-faint), 목록의 "현재 안 복사"도 꺼짐, 탭 아래 caption "최대 5개 안을 만들 수 있어요. 사용하지 않는 안을 삭제한 뒤 다시 시도해 주세요." toast 없이 꺼진 모습만 |
| susiro/1440-share-error | 앱 | `share-sheet`(`modal`) 파일로 저장 모드: 390-share-file과 같은 내용, 학급 코드 "7Q4" `text-input-error`(2px 위험 링 + triangle-alert 14 + "학급 코드는 선생님이 알려 준 4자예요."), 버튼 오른쪽 정렬 "닫기" · `button-primary` "파일로 저장" |

PC 그리지 않는 변형(문구만): QR 모드는 390-share-qr와 같은 내용을 `modal` 안에(QR 약 320) / 저장 완료 `toast`는 오른쪽 아래(문구는 5-1과 같음) / PDF로 내보내기는 확인 없이 저장 뒤 `toast` "A안 요약을 PDF로 저장했어요." / 고친 칸을 닫을 때 확인 창은 1440-slot-clear-confirm 모양에 390-leave-confirm 문구.

합계: 모바일 21 + PC 14 = 35장. 03-draft.json `states` 예정 순서는 8장 그리는 순서와 같아요.

## 6. 문구 모음

| 위치 | 문구 |
|---|---|
| 개수 | 6회 제한 5/6장 · 6회 제외 1장 |
| 경고 요약 바 | 경고 2개 · 면접 일정 겹침 외 1개 |
| 경고 1 제목/설명 | 면접 일정이 겹쳐요 / 11월 21일(토)에 가온대·다솜대 고사가 함께 있어요. 한 곳은 다른 카드로 바꿔 보세요. |
| 경고 2 제목/설명 | 소신·위험 쪽으로 쏠렸어요 / 5장 중 4장이 소신·위험이고 안정은 0장이에요. 입결과 비교하면 안정에 드는 카드를 1장 이상 넣어 보세요. |
| 판정 검수 전 | 판정 준비 중 / 판정 기준이 검수되면 소신·위험 쏠림도 함께 점검해요. 지금은 고사 일정 겹침과 6장 제한만 점검해요. |
| 경고 0건 | 등록한 일정과 카드에서 확인할 항목이 없어요. 미정인 일정은 대학 발표 후 입력해 주세요. |
| 빈 칸 | + 대학 담기 |
| 빈 보드 | 아직 담은 대학이 없어요 / 원서·서류 체크리스트에 등록한 전형을 빈 칸에 담으면 여기에 6칸으로 모여요. / 전형 담기 |
| 담기 시트 | 담을 전형 고르기 / 6장을 모두 채웠어요. 6회 제외 전형만 추가할 수 있어요. / 먼저 원서·서류 체크리스트에서 지원할 전형을 등록해 주세요. / 등록한 전형을 모두 이 안에 담았어요. |
| 주요 버튼 | 상담카드 보내기 |
| 버튼 비활성 이유 | 1장 이상 담아야 보낼 수 있어요 |
| 툴팁 | 길게 눌러 순서를 바꿀 수 있어요 |
| 확인 창 | 가온대 칸을 비울까요? / A안을 삭제할까요? / 고친 내용을 저장하지 않고 닫을까요? |
| toast | A안에 카드를 담았어요. · 칸을 저장했어요. · 칸을 비웠어요. · B안을 만들었어요. · A안을 B안으로 복사했어요. · A안을 삭제했어요. · 상담카드 파일을 저장했어요. 담임 선생님께 전달해 주세요. |
| 고지 | 대학 공식 자료가 최종 기준이에요 · 6회 제외 기관은 과학기술원·사관학교·경찰대 목록으로 나눠요 |

- 모든 문구는 해요체예요. 판정은 "판정", "입결과 비교하면", "쏠림"으로만 말하고, 결과를 약속하는 표현은 쓰지 않아요(NEVER-2, rules forbidden_words).

## 7. 사용 컴포넌트

`susi-slot`, `warning-callout`, `scenario-tabs`, `segmented-control`, `segmented-control-active`, `judge-badge`, `data-status-badge`, `univ-monogram`, `stat-tile`, `button-primary`, `button-outline`, `button-pill-soft`, `disclaimer-note`, `mode-switch`, `brand-logo`, `sidebar`, `sidebar-group`, `sidebar-item`, `page-header`, `sub-nav`, `tab-bar-pill`, `bottom-sheet`, `modal`, `share-sheet`, `toast`, `empty-state`, `text-input`, `text-input-focused`, `text-input-error`

## 8. 디자이너 메모 (이번 상세화 그리는 순서 포함)

그리는 순서(Figma 호출 한도가 있어 한 번에 몰아 그리지 않아요. 상태 프레임은 기본 프레임을 복제해 바뀌는 곳만 고쳐요):
1. 기본 2장 고치기 — susiro/390 · susiro/1440에 0장 C1~C10 반영(로고 · 모바일 머리 + `sub-nav` + 개수 줄 · 탭바 · 사이드바 · `page-header` · 모서리 0 · 수능최저 칩 · "안 관리" 버튼 · 고지 문장). 승인 레이아웃(6칸 목록 · 3×2 그리드 · 경고 패널)은 건드리지 않아요.
2. 빈 · 로딩 · 오류 · 검수 전 — 390-loading → 390-error → 390-empty → 390-judge-pending → 1440-loading → 1440-error → 1440-empty → 1440-judge-pending
3. 스크롤 · 경고 — 390-bottom → 390-warnings-sheet
4. 담기 — 390-pick → 390-pick-full → 390-pick-none → 390-add-toast → 390-from-plan → 1440-pick → 1440-pick-full → 1440-from-plan
5. 칸 상세 · 확인 창 — 390-slot-detail → 390-slot-select → 390-slot-clear-confirm → 390-slot-clear-toast → 390-leave-confirm → 1440-slot-detail → 1440-slot-clear-confirm
6. 순서 · 시나리오 — 390-reorder-sheet → 1440-drag → 390-scenario-sheet → 390-scenario-delete-confirm → 1440-scenario-menu → 1440-scenario-delete-confirm → 1440-scenario-limit
7. 보내기 — 390-share-file → 390-share-qr → 1440-share-error

규칙:
- 디자인 시스템 페이지(work/design-system.json, 파일 AqkVdYZ4hvPYuAlewoBs4W)의 컴포넌트 인스턴스만 써요. 서비스 로고는 brand-logo 인스턴스(모바일 92 · PC 124), 가상 대학은 univ-monogram.
- 레이어 이름 = 컴포넌트 이름. 같은 컴포넌트가 여러 개면 뒤에 번호(예: susi-slot 1). 컴포넌트가 아닌 묶음(개수 줄, 경고 패널, 지원 준비 카드, 동작 목록 행, 툴팁)은 한글 이름 일반 레이어로 둬요.
- 모서리는 모두 0. 원형은 판정 아이콘 ●처럼 원래 원형인 표식만.
- 판정은 색 + 아이콘 + 이름(● 안정, ◐ 적정, ▲ 소신, ■ 위험)이고 `judge-badge`와 경고 패널 판정 분포에만. 경고는 ▲ + 소신 색 쌍 + 제목(`warning-callout`). 확인 창 · toast · 오류 줄 · 빈 상태 · tone=neutral 안내 · "판정 준비 중" 배지에는 판정 색을 쓰지 않아요(오류 줄 아이콘도 ink, `text-input-error`만 위험 링).
- Route Blue는 선택 표시에만: `sub-nav` 막대, `segmented-control-active`, `sidebar-item` 선택, 탭바 선택 아이콘, select 고른 행 막대 · check. 이 화면에는 내 위치 표시가 없어요. 주요 버튼은 ink 채움.
- 그림자는 `bottom-sheet` · `modal` · `toast` · `segmented-control-active` · 떠 있는 목록에만. 끄는 카드(1440-drag)에도 그림자 없이 1px ink 테두리.
- 숫자(순위, 5/6장, 개수, 날짜, n/200, 1/3)는 고정폭 숫자, 자간 0, Pretendard 300/400/600/700만.
- 모든 색은 Figma 변수에 연결해요(scrim 포함). 로고 색만 팔레트 예외.
- 빈 · 오류 상태에서도 `disclaimer-note`는 남겨요(로딩만 예외).
- 03-draft.json `frames`에는 기본 2장만, `states`에 5장의 35장.

## 9. design.md 수정 제안 (사용자 확인 후 반영 — planner는 design.md · rules를 고치지 않아요)

1. 툴팁 컴포넌트가 없어요. 지금은 이름 없는 레이어(모서리 0, ink 채움 + on-primary 글자)로 그려요. 컴포넌트로 올릴지 정해 주세요.
2. "6회 제한 n/6장" 개수 표시의 위치 · 글꼴 규칙이 없어요. 이 설계서는 모바일 개수 줄(caption), PC 본문 위 줄(title)로 정했어요.
3. 수시로 소분류 아이콘이 정해져 있지 않아요. 앱은 icon/layout-grid인데 이는 수시 전략 대분류 아이콘과 겹쳐요(sidebar-item 겹침 금지). icon/list-ordered(순위 목록 뜻)를 제안해요. 정해질 때까지 시안은 icon/list-ordered로 그려요.
4. 바텀시트 · 떠 있는 목록 안 "동작 목록"(새 안 · 복사 · 삭제처럼 고르면 바로 실행되는 행) 모양이 없어요. 대체안으로 단일 선택 목록 모양(행 48 · 40, 구분선)에 check · 선택 채움을 빼고 그려요. 변형으로 적어 주시면 좋겠어요.
5. 판정 기준 검수 전 `judge-badge` 자리 표시가 정의돼 있지 않아요. 대체안으로 흑백 `data-status-badge` "판정 준비 중"을 썼어요(최저로 찾기의 "준비 중"과 같은 방식). judge-badge 변형으로 둘지 정해 주세요.
6. PC "PDF로 내보내기"(학부모 공유용 요약, `print-summary`)는 승인 시안에 있지만 앱에는 아직 없어요. 버튼을 둘지, 둔다면 내 기기 저장 예외(확인 없이 toast)로 볼지 확인해 주세요.

## 10. G2 자가 점검

- 백틱 안 이름은 모두 rules `components` 목록에 있어요(7장 목록 + `print-summary`).
- 필수: `disclaimer-note` (2-6, 3-7, 상태 프레임) 포함.
- 금지어 0. 숫자는 순위 · 개수 · 날짜뿐이고 환산 숫자는 없어요.
