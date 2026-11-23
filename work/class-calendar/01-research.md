# 01-research — 우리 반 입시 일정 (class-calendar, 교사용)

작성일 2026-11-23 · 담당 researcher (S1)
근거: 사용자 요청(채팅 원문) "담임 선생님입장에선는 어느날 누가 1차 발표, 최종 발표, 추가합격 기간, 면접/실기, 서류 제출 이런것들 캘린더에서 보고 완료 처리 하 ㄹ수 있는 혹은 합/불합 여부를 체크해서 연동할 수 ㅣㅇㅆ는 호면 하나 만들자"
PRD에 이 화면 절은 따로 없어요. 가장 가까운 근거는 3-4(교사: 카드 수합 → 발표 결과를 반·학년 단위로 집계), 6-10(상담카드 수합 보드 · 수시 결과 집계 1단계/최종/충원), 6-7(카드마다 고사 일정 · 면접·논술 겹침), 7-3(교사 로그인 · 학급 데이터 서버 RLS · 학생은 번호·별칭만), 8장 AdmissionOutcome(stage1_result · final_result)과 AdmissionProgram.schedule(interview_dates · essay_dates · result_date), 13장(합격 확률·보장으로 읽힐 표현 금지)이에요.
한 줄: 담임이 반 학생들의 수시 일정(서류 제출 · 면접/실기 · 1단계 발표 · 최종 발표 · 충원 합격 기간)을 날짜별로 모아 "이 날 누가 무엇"을 보고, 일정마다 완료 처리하고, 발표 일정에서 결과를 고르면 결과 집계(result-summary)에 그대로 들어가는 화면이에요.

## 0. 앱에서 확인한 것

### 0-1. 이 화면이 하는 일

| 블록 | 내용 | 데이터 조건 |
|---|---|---|
| 월간 달력 | 칸마다 그날 반 일정 "n건"(학생 수가 아니라 일정 수) | 0-3 일정 날짜 |
| 그날 목록 | 날짜를 누르면 그날 일정: 학생(번호 · 별칭) · 대학 · 전형 · 일정 종류 · 상태 | 0-3 + students |
| 완료 처리 | 서류 제출 · 면접/실기 행은 "완료" 체크만 | 새 저장 필요(0-4) |
| 결과 체크 | 1단계 발표 행 → 1단계 통과 / 1단계 불합격 / 미입력, 최종 발표 · 충원 합격 기간 행 → 합격 / 충원 합격 / 불합격 / 미등록 / 미입력 | outcomes 테이블 그대로(0-2) |
| 결과 집계 연동 | 고른 결과는 outcomes에 써서 result-summary 표 · 타일에 바로 반영 | 같은 키(번호+대학+전형) |

- 이 화면은 판정(안정 · 적정 · 소신 · 위험)을 하지 않아요. 결과 값은 이미 나온 기록일 뿐이라 판정 색 · 판정 아이콘 · ●를 쓰지 않아요.
- 앞으로의 결과를 점치는 말("붙을 듯" 류), 확률 · 가능성 · 보장 표현, 퍼센트 숫자를 쓰지 않아요(NEVER-2). "D-n"은 남은 날만 말해요.

### 0-2. 교사 쪽 데이터 (app/src/store/teacherDb.ts, Dexie v5, 교사 브라우저 IndexedDB)

| 테이블 | 키 | 이 화면에서 쓰는 것 |
|---|---|---|
| meta | 'class' | ClassInfo { name(예: 3학년 2반), code(학급 코드) } |
| students | number | Student { number, alias, locked? } — 번호 · 별칭만, 실명 없음(R-PRIV-003). 표기 함수 `studentLabel` = "07 · 바다" |
| cards | ++id, number | CardRecord { number, created_at, card: CounselPayload { scenario, slots[≤6], exempt[≤20], warnings } }. CardSlot = { university, program, department, **exam_kind**, **exam_date**(YYYY-MM-DD 또는 null), csat, memo, judgment } |
| outcomes | ++id, number | Outcome { number, university, program, type(교과·종합·논술·기타), **stage1: boolean \| null**, **result** } — result ∈ `RESULTS` = 합격 · 충원 합격 · 불합격 · 1단계 불합격 · 미등록 · 미입력 (app/src/domain/outcomes.ts) |
| targets | number | 수능 최저 목표(이 화면에는 안 씀) |
| memos | ++id, number | 상담 메모 + "다음 할 일" next/next_done(상태 대기 · 완료 · 기한 지남 — classroom.ts `nextState`). 완료 처리 표기의 선례 |

- `outcomesFromCards(cards)`: 학생별 최신 카드의 slots 6칸으로 outcomes 행을 만들어요(result = 미입력, stage1 = null). **exempt(6회 제한 제외 기관) 칸은 넣지 않아요** → 캘린더도 같은 범위로 할지 S2 결정.
- 학생별 지원 6장 ↔ 일정 연결 키 = (number, university, program). outcomes에는 department가 없고, 카드 slot에는 department가 따로 있어요. 같은 대학 · 같은 전형에 학과 둘(같은 대학 중복 지원)이면 키가 겹쳐요 → S2에서 department를 키에 넣을지 결정 필요.
- result-summary 앱(ResultsTab)은 학생별 보기에서 `<select>`로 `teacherDb.outcomes.update(id, { result })`를 바로 써요. 이 화면도 같은 테이블 같은 갱신이면 결과 집계 화면이 useLiveQuery로 곧바로 바뀌어요(별도 연동 코드 불필요).
- stage1은 앱에서 나이스 엑셀 불러오기로만 채워져요. 화면에서 1단계 통과를 고르는 UI는 앱에 아직 없어요(결과 집계 학생별 select는 result만 바꿈). 1단계 발표 결과 체크는 "1단계 통과 → stage1 = true, result 유지" / "1단계 불합격 → stage1 = false, result = 1단계 불합격"으로 매핑하는 안을 S2에 제안해요.
- 저장 위치: 코드 주석 "shortcut: 학급 데이터는 교사 브라우저 IndexedDB에 평문" — PRD 7-3(서버 RLS · 암호화)과 다름. 시안은 PRD 기준 문구(학생은 번호·별칭만)를 쓰고, 저장 위치를 단정하는 문구는 피해요.

### 0-3. 일정 날짜는 어디서 오나

| 일정 종류 | 지금 앱에 날짜가 있나 | 출처 |
|---|---|---|
| 면접 · 논술 · 실기(고사) | 있음(학생 입력) | 학생이 보낸 상담카드 slot.exam_kind + slot.exam_date. 날짜 없는 칸은 null → "날짜 미정" |
| 서류 제출 | **교사 쪽에 없음** | 학생 기기의 원서·서류 체크리스트(planning.applications[].steps[].due_at)에만 있고 상담카드 payload에 실리지 않아요(CardSlot에 steps 없음) |
| 1단계 발표 · 최종 발표 · 충원 합격 기간 | **어디에도 없음** | 학생 체크리스트에 학생이 "발표" 단계를 적었을 수는 있지만 교사에게 오지 않아요 |

- 전형계획 데이터: app/public/data/admission-plans.json은 파일이 너무 커서 직접 열지 못했고, 스키마(app/src/domain/admissionPlans.ts `parsePlanCatalog`)로 확인했어요. 루트 · 대학 모두 `review_status: 'draft'`이고 "Reference-only catalog" 주석이 붙어 있어요. PlanProgram 필드 = name · round · type · quota · method · minimum · eligibility · pages · document_id · interview?(글자) · scope? · field_pages? 뿐이라 **날짜 필드(발표일 · 고사일 · 서류 마감)가 없어요.** `interview`는 자유 글자라 날짜로 읽으면 안 돼요. PRD 8장 AdmissionProgram.schedule {interview_dates, essay_dates, result_date}는 아직 구현 전이에요.
- 그래서 이 화면의 1차 안: **교사가 "대학 · 전형 일정"을 한 번 입력하면 그 대학 · 전형에 지원한 반 학생 모두의 일정이 생겨요**(예: 강원대 지역인재 최종 발표 12-12 → 지원 24명 행). 고사 날짜는 학생 카드 값을 기본으로 쓰고, 교사가 고친 값은 "교사 입력" 표시. 날짜를 추정해 채우지 않아요. 관리자 검수 데이터가 생기면(PRD schedule) 그 값을 기본으로 바꾸는 것은 Phase 이후.
- 충원 합격 기간은 하루가 아니라 기간(시작~마감)이에요. design.md 달력 규칙(data-table 변형 month — 일정 이름 막대 · 색 점 쓰지 않음, calendar 02-spec 제안 2)에 맞추려면 기간 막대 대신 "충원 합격 기간 시작" · "충원 합격 기간 마감" 두 날의 행으로 보여 주는 안이 맞아요(S2 결정).
- 학생 캘린더(app/src/domain/calendar.ts `applicationEvents`)는 "A calendar is a projection of saved records, never a second copy of their dates" 원칙이에요. 교사 화면도 카드의 exam_date를 복사해 두지 말고 읽어서 보여 주고, 교사가 입력한 대학 · 전형 일정만 새로 저장하는 쪽이 같은 원칙이에요.

### 0-4. 새로 저장해야 하는 것(앱에 없음 — S2 · 구현 메모)

1. 대학 · 전형 일정: { university, program, kind(서류 제출 · 면접 · 논술 · 실기 · 1단계 발표 · 최종 발표 · 충원 기간 시작 · 충원 기간 마감), date, time?, source: 교사 입력 | 학생 카드 }
2. 학생별 완료 표시: { number, university, program, kind, done } — 서류 · 고사 행 완료 체크용. 발표 행은 결과 값(outcomes)이 곧 완료(미입력이 아니면 완료).
3. teacherDb 버전 6 테이블 추가. 학급 지우기(clearClass)와 백업 형식에 포함되는지 확인.

### 0-5. 기존 화면 · 상태 · 팝업 (재사용 후보)

학생 입시 일정(calendar, app/src/screens/ApplicationCalendar.tsx · work/calendar/02-spec.md)
- 앱 기능: 지원 전형 select · 일정 종류 select(전체 · 원서·서류 · 면접·논술·실기) · "완료 일정 포함" 체크박스, ‹ 2026년 11월 › · 오늘, 월간 · 목록 세그먼트, 칸 "n건"(오늘 aria-current, 선택 aria-pressed), 선택한 날 목록 + "이번 달 전체 보기", 다가오는 일정, 날짜 미정 접힘, .ics 내보내기, 상세 Modal(닫기 · 일정 수정하러 가기), 상태 글자 D-n · 오늘 · 기한 지남 · 완료 · 날짜 미정.
- 02-spec 결정 중 그대로 가져올 것: D5 월간 · 목록, D6 칸 "n건" · 오늘 = 잉크 채움 정사각 · 선택한 날 = accent-soft + 1px accent, 요일 색 없음, D8 "기한 지남"에도 위험 색 없음, D14 오류 줄 = 흑백 notice-row, D15 같은 날 고사 겹침 ▲ + warning-callout(소신 쌍), D16 월 제목 ▾ 달 고르기, D18 PC dropdown.
- 상태 프레임 27장 목록: 390-loading · error · no-plans · month-empty · day · day-empty · list · undated · completed · plan-filtered · plan-missing · export-error · detail · plan-sheet · overlap · month-sheet · export-sheet · export-done, 1440-day · list · detail · plan-dropdown · no-plans · overlap · month-picker · export-modal · export-done.

결과 집계(result-summary, app/src/screens/ResultSummary.tsx · work/result-summary/02-spec.md)
- 결과 값: 합격 · 충원 합격 · 불합격 · 1단계 불합격 · 미등록 · 미입력. **모두 {colors.ink} 흑백 글자, 판정 색 · 판정 아이콘 없음, 미입력만 {colors.text-muted}**(02-spec 0절 "결과 표기"). data-status-badge가 아니라 **글자**예요.
- 결과 입력: text-input 변형 select + 열린 목록 = 떠 있는 "dropdown"(옵션 합격 · 충원 합격 · 불합격 · 1단계 불합격 · 미등록 → 구분선 → "미입력으로 되돌리기"), 고르면 바로 저장 · 타일 · 표 갱신(S-3). 학생이 카드를 다시 보내도 직접 입력한 결과는 지우지 않음.
- 상태: S-1 결과 없음 · S-2 필터 0건 · S-3 결과 입력 드롭다운 · S-4 저장 목록 · S-5 저장 완료 toast · S-6 저장 시트 390 · S-7 가채점 수합. 모바일은 보기 전용(결과 입력은 PC만).
- 앱 ↔ 02-spec 차이: 02-spec(2026-11-23 개정)은 나이스 연동을 뺐지만 앱에는 아직 "나이스 엑셀 불러오기" 버튼과 문구가 있어요. 이 화면 문구는 02-spec을 따라 "학생이 보낸 카드 · 직접 입력한 결과"로만 써요.
- 위치: 교사 대분류 "수합·집계" › 카드 수합 · 결과 집계. 이 화면 자리(우리 반 / 수합·집계)는 S2 결정.

design.md 확인(앞부분 Colors 절까지 읽음)
- Route Blue = 선택됨 · 여기예요(선택 칸 · 칩 · 세그먼트 · 링크 · 핵심 숫자 1~2개). 판정 · 경고 안과 주요 버튼 채움에는 금지. 이 화면에서는 선택한 날 · 선택 칩 · 핵심 숫자 1개(예: 결과 미입력 n건)에만.
- "학생이 직접 적는 기록의 완료 · 확인 표시도 판정 색을 쓰지 않습니다"(Semantic 절) → 완료 체크는 흑백.
- data-status-badge 흑백 규칙은 "계산이 없는 관리자 데이터의 검수 상태"용으로 적혀 있어요. 결과 값에 data-status-badge를 쓰는 것은 결과 집계와 다른 원칙이에요 → **결과 집계와 같게 흑백 글자로** 쓰기를 권해요. 배지 모양이 꼭 필요하면 design.md 수정 제안 대상.

## 1. 레퍼런스 (uibowl)

검색 10회, 모두 1페이지(무료 3건): 패턴 `캘린더`(한국), 컴포넌트 `캘린더, 체크박스`(0건 — 컴포넌트 이름이 아님), OCR `공유 캘린더`, 컴포넌트 `날짜 피커, 리스트`(한국), OCR `주간 월간 일정`, OCR `합격 불합격`, 패턴 `일정 × 체크박스`(한국), 컴포넌트 `바텀시트, 라디오 버튼`(한국), OCR `오늘 할 일 완료`, 패턴 `캘린더 × 교육&도서`.
제외: OCR `공유 캘린더`의 달다방 이벤트 · 해피문데이 설정 · 열품타 권한 화면(글자만 우연 일치), OCR `합격 불합격`의 디맨드 · 히로인스 · 29cm(채용 · 안내 문구), OCR `오늘 할 일 완료`의 점신 · 토스 · 페이코(이벤트), 여다 장소 고르기, 스티키 문의 시트. 학급 · 교사용 입시 일정 캘린더, 일정 행에서 결과(합격/불합격)를 고르는 화면은 0건이었어요.

**월 달력 + 칸 표시 · 전환 컨트롤**
- [L1] 아이쿠카 — 학원비 플래너 일정 캘린더: 위 탭(일정 캘린더 · 학원비 관리 · 리포트) → "‹ 2026년 5월 ›" 알약 → 요약 숫자 + 오른쪽 "전체 ▾" → 왼쪽 종류 칩 2개(학원 수업 · 학원 결제일) · 오른쪽 "오늘" 칩 + "주간 · 월간" 토글 → 7열 달력, 칸 아래 일정 이름 막대(분홍)가 여러 줄, 선택한 날 칸만 회색 채움 — 종류 칩 + 주간/월간 전환 + 오늘 버튼이 한 줄에 있는 사례 — https://uibowl.io/name/%EC%95%84%EC%9D%B4%EC%BF%A0%EC%B9%B4?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&imgId=cmp0tghns00bmk4048j5h14v4
- [L2] 쑥쑥찰칵 — 메인 캘린더(가족 공유): 위 가족 초대 배너, "2026. 9. ▾" 월 제목(누르면 달 고르기) + 오른쪽 보조 아이콘 2개, "사진 · 일기" 알약 전환, 7열 달력에 기록 있는 날은 썸네일, 오늘은 노란 원, 다른 달은 흐린 숫자, 오른쪽 아래 + 버튼 — 여러 사람이 함께 쓰는 달력의 머리 구성 — https://uibowl.io/name/%EC%91%A5%EC%91%A5%EC%B0%B0%EC%B9%B5?patterns=%EC%84%A4%EC%A0%95&patternName=%EB%A9%94%EC%9D%B8%20%EC%BA%98%EB%A6%B0%EB%8D%94%20%EC%84%A4%EC%A0%95
- [L3] 캘링 — 일정(공유 캘린더): "2025년 12월 ▾" 월 제목, 7열 큰 칸 달력, 오늘 = 원 채움, 칸 안에 사람 이름 라벨("유아이볼님")로 누구 일정인지 표시, + 누르면 "약속 잡기 · 일정 등록" 두 갈래 — 한 달력에 여러 사람 일정을 이름으로 구분 — https://uibowl.io/name/%EC%BA%98%EB%A7%81?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&patternName=%EC%9D%BC%EC%A0%95
- [L9] 무디 Moodee — 활동 캘린더 모달: "‹ 2026년 8월 ›" 머리, 요일 줄, 7열 숫자 격자, 오늘 칸만 사각 표식, 아래 "이번 달 활동" 요약 + "월간 리포트 보기" — 달력 아래 이번 달 요약을 붙이는 구성 — https://uibowl.io/name/%EB%AC%B4%EB%94%94%20Moodee?patterns=%EB%82%B4%EC%97%AD&patternName=%ED%99%9C%EB%8F%99%20%EC%BA%98%EB%A6%B0%EB%8D%94
- [L10] 말해보카 — 학습 캘린더 시트: 위 연도 + 큰 월 숫자 ‹ ›, 요약 타일 2개(연속 학습일 1 · 복구펜 2), 지난 날짜는 흐리게 · 기록 있는 날은 아이콘 + 테두리, 아래 "이번 달 기록" 진행 막대 — 달력 위 숫자 타일 2개 — https://uibowl.io/name/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&patternName=%EC%BA%98%EB%A6%B0%EB%8D%94

**여러 사람 × 날짜 · 아젠다**
- [L4] 열품타 — 그룹 출석부: 위 "◂ 6.8 – 6.14 ▸" 주 이동 + 오른쪽 "주간 ▾", 요약 줄(총 출석 20 · 출석 평균 36% · 내 등수), 아래 멤버 한 줄씩(번호 · 이름 · 합계 시간) + 요일 7칸(기록 있는 칸만 채움) + 행 끝 체크 ✓ 4 — 사람 행 × 요일 열 주간 격자 — https://uibowl.io/name/%EC%97%B4%ED%92%88%ED%83%80?patterns=%EB%82%B4%EC%97%AD&imgId=cmq9605cy0008jm0413ajr8yk
- [L5] Bitget — 이벤트 캘린더: 위 가로 날짜 띠(19~23, 오늘 칸만 채움 "Today") + 종류 탭(All · Macro Data · Earnings · Token unlock …) + 필터 아이콘, 아래 날짜 머리 "2026-09-23 Wed (Today)"로 묶은 아젠다 목록(왼쪽 시각 · 오른쪽 일정 이름) — 날짜 머리로 묶은 목록 보기 + 종류 탭 — https://uibowl.io/name/Bitget?patterns=%EA%B8%B0%ED%9A%8D%EC%A0%84%C2%B7%EC%9D%B4%EB%B2%A4%ED%8A%B8&imgId=cmukqai8u000zl504wo4eypmz

**완료 체크 · 빈 날**
- [L6] 셀레트립 — 여행 일정 편집: 위 Day 칩(Day 1 · 2 · 3), 날짜 머리 "Day 1 (06.25)" 아래 행마다 왼쪽 네모 체크박스 + 카드(이름 · 지역 · 종류) + 오른쪽 끌기 손잡이, 하단 전폭 "수정 완료"(고르기 전 비활성) — 날짜 머리 아래 행 앞 체크 — https://uibowl.io/name/%EC%85%80%EB%A0%88%ED%8A%B8%EB%A6%BD?patterns=%ED%8E%B8%EC%A7%91%C2%B7%EC%88%98%EC%A0%95%ED%95%98%EA%B8%B0&patternName=%EC%97%AC%ED%96%89%20%EC%9D%BC%EC%A0%95%20%ED%8E%B8%EC%A7%91
- [L11] 스티키 — 캘린더(하루 보기): "‹ ›" 날 이동, 큰 날짜 카드 "10월 1", 아래 빈 날 안내 "사진을 찍거나 가져와 기록을 남겨보세요." 한 줄 — 빈 날은 버튼 없이 안내 한 줄 — https://uibowl.io/name/%EC%8A%A4%ED%8B%B0%ED%82%A4?patterns=%EA%B8%B0%ED%83%80&patternName=%EC%BA%98%EB%A6%B0%EB%8D%94

**상태(결과) 고르는 바텀시트**
- [L7] 영웅문 — 계좌개설 목적 선택 시트: 제목 "계좌개설 목적 선택" + 오른쪽 닫기 ✕, 단일 선택 행 5개(행마다 테두리 칸), 고른 행만 색 테두리 + 오른쪽 ✓, 확인 버튼 없이 고르면 반영 — 결과 값 단일 선택 목록 — https://uibowl.io/name/%EC%98%81%EC%9B%85%EB%AC%B8?patterns=%EA%B3%84%EC%A2%8C&imgId=cmw0170aa0005l4081hof79j6
- [L8] 쑥쑥찰칵 — 캘린더 시작일 시트: 제목 + 설명 한 줄, 선택지 카드 2개(이름 굵게 + 설명 한 줄), 고른 카드 = 테두리 + 오른쪽 ✓, 아래 전폭 "저장" — 선택지마다 설명이 붙고 저장으로 확정하는 시트 — https://uibowl.io/name/%EC%91%A5%EC%91%A5%EC%B0%B0%EC%B9%B5?patterns=%EC%84%A4%EC%A0%95&imgId=cmub7kwzz000xjs0411nad91a

## 2. 반영 포인트

- P1: 화면 주인공은 월간 달력 하나. 학생 입시 일정(calendar)과 같은 data-table 변형 month를 그대로 써요 — 칸 = 날짜 숫자 + 그날 반 일정 "n건"(L1 · L3처럼 이름 막대 · 학생 이름을 칸에 넣지 않음, 28명이 겹치면 칸이 넘쳐요), 오늘 = 잉크 채움 정사각, 선택한 날 = accent-soft + 1px accent, 요일 색 없음, 다른 달 칸 비움 [근거: L1, L2, L3, L9]
- P2: 달력 머리 한 줄에 "‹ 2026년 12월 ▾ ›" + "오늘" + 보기 전환 segmented-control "월간 · 주간 · 목록". 월 제목 ▾는 calendar D16 달 고르기(모바일 bottom-sheet / PC dropdown)를 재사용해요 [근거: L1, L2, L3, L9]
- P3: 날짜를 누르면 그날 목록 = "12월 12일(토) 일정 · 9건" 머리 아래 **일정 종류별로 묶어** 보여요(최종 발표 · 면접 · 서류 제출 …). 행 = 학생 "07 · 바다"(번호 · 별칭) / 대학 · 전형 / 오른쪽 상태 글자(D-n · 오늘 · 완료 · 결과 값). 목록 보기는 L5처럼 날짜 머리("12.12(토) · 오늘")로 묶은 아젠다 [근거: L5, L6, L3]
- P4: 일정 종류는 색 점 · 색 꼬리표 없이 글자로만 구분하고, 거르는 것은 filter-chip 한 줄: "학생: 전체 ▾" · 구분선 · "전체" · "서류 제출" · "면접·실기" · "1단계 발표" · "최종 발표" · "충원 기간" · 구분선 · "완료 포함". 학생 칩은 바텀시트(PC dropdown)로 번호 · 별칭 목록 [근거: L1, L5, L2]
- P5: 서류 제출 · 면접/실기 행은 완료 처리만: 행 왼쪽 흑백 체크(누르면 바로 저장), 완료된 행은 상태 "완료" {colors.text-muted}(줄긋기 · 초록 없음). 지난 날짜인데 완료 안 한 행은 "기한 지남" 흑백 글자 [근거: L6, L4]
- P6: 발표 행(1단계 발표 · 최종 발표 · 충원 기간)은 오른쪽 결과 칸을 누르면 모바일 bottom-sheet / PC dropdown 단일 선택 목록: 1단계 발표 = 1단계 통과 · 1단계 불합격, 최종 · 충원 = 합격 · 충원 합격 · 불합격 · 미등록, 맨 아래 구분선 + "미입력으로 되돌리기". 고른 행 = accent-soft 채움 + 왼쪽 3px accent 막대 + 오른쪽 ✓ accent, 확인 버튼 없이 고르면 바로 저장 → toast "결과 집계에 반영했어요". 옵션은 결과 집계(result-summary S-3)와 같은 값 · 같은 순서 [근거: L7, L8]
- P7: 결과 값은 결과 집계와 같은 원칙 = {colors.ink} 흑백 글자(미입력만 {colors.text-muted}), 판정 색 · ● · data-status-badge를 쓰지 않아요. 행에 "결과 집계에 반영돼요" 캡션 + 링크 "결과 집계에서 보기 ›"로 연동을 드러내요 [근거: L7, L4]
- P8: 여러 학생을 한 화면에: PC "주간" 보기 = 학생 행 × 요일 7열 data-table(L4 출석부처럼, 칸에는 그날 일정 종류 글자 "최종 발표" 등, 일정 없는 학생 행은 접기). 모바일은 주간 보기 대신 목록 보기만(칸이 좁아서) [근거: L4, L3, L1]
- P9: 달력 위 stat-tile 2개 = "오늘 반 일정 n건" · "결과 미입력 n건"(핵심 숫자 1개만 Route Blue). 다가오는 발표 하나를 tile 보조 줄에 "강원대 지역인재 최종 발표 · D-3 · 지원 7명" [근거: L10, L9, L1]
- P10: 빈 상태: 받은 카드 0장 = empty-state("아직 받은 상담카드가 없어요" + button-primary "카드 수합으로 가기"), 카드는 있는데 발표 · 서류 일정을 하나도 안 넣음 = 안내 한 줄 + button-outline "대학 일정 입력하기", 고른 날 0건 = 목록 카드 안 한 줄(버튼 없음) [근거: L11, L6]
- P11: 날짜 입력은 "대학 · 전형 일정" 한 번 = 지원 학생 전원 반영. 일정 입력 시트(모바일) / modal(PC): 대학 · 전형 고르기 → 종류 → 날짜(+시각) → "지원 학생 7명에게 넣어요" 요약 → 저장. 고사 날짜는 학생 카드 값을 기본으로 보여 주고 고치면 "교사 입력" 캡션 [근거: L8, L3]

## 3. 화면 위치 · 구성 순서 (제안)

PC 1440 (교사 주 무대)
1. sidebar(교사 대분류) · page-header "우리 반 입시 일정" + 오른쪽 button-outline "대학 일정 입력"
2. stat-tile 2개 (P9)
3. filter-chip 한 줄 + 오른쪽 segmented-control 월간 · 주간 · 목록 (P2, P4)
4. 왼쪽 달력 카드(data-table 변형 month) + 오른쪽 360 패널(고른 날 / 이번 달 일정 목록, 종류별 묶음, 완료 체크 · 결과 칸) (P1, P3, P5, P6)
5. disclaimer-note "학생이 보낸 카드와 직접 입력한 일정 · 결과예요 · 대학 공식 발표가 최종 기준이에요 · 학생은 번호·별칭으로만 보여요 · 시안의 대학·날짜는 예시예요"

모바일 390
- app-bar → sub-nav → stat-tile 2개 → filter-chip 줄 → 달력 → 고른 날 목록 → 고지 → tab-bar-pill. 결과 집계는 모바일이 보기 전용이에요. 이 화면 모바일에서 결과 체크까지 허용할지는 S2 결정(허용하면 P6 bottom-sheet).

## 4. S2 주의 · 미결

1. **날짜 출처가 없어요.** 발표(1단계 · 최종 · 충원)와 서류 제출 날짜는 교사에게 오는 데이터가 없어요. 1차 = 교사가 대학 · 전형 단위로 입력(0-3). 다른 안: 상담카드 payload에 체크리스트 마감일을 싣기(.jnavi 스키마 변경 — 학생 화면 · card-collect 영향), 관리자 검수 일정 데이터(PRD 8장 schedule, 지금 admission-plans.json에는 날짜 필드 없음 · draft). 정해 주세요.
2. **결과 표기 원칙:** 오케스트레이터 메모는 "data-status-badge 흑백"이지만 결과 집계 02-spec은 배지가 아닌 흑백 글자예요. 같은 원칙으로 글자를 권해요. 배지를 쓰려면 design.md 수정 제안(결과 집계 02-spec 7절 제안 3 "수시 결과 값은 흑백 글자" 문장이 design.md에 반영됐는지 이번에 확인하지 못했어요 — design.md 앞부분만 읽음).
3. **연동 키:** outcomes = (number, university, program). department가 없어 같은 대학 · 같은 전형 다른 학과면 겹쳐요. 1단계 통과 값(stage1 = true)을 화면에서 넣는 UI는 앱에 없어요(0-2 매핑 제안). exempt 칸(6회 제한 제외 기관)은 outcomesFromCards에 없어요 → 캘린더 범위 결정.
4. **충원 합격 기간:** 달력 막대 금지 규칙 때문에 시작 · 마감 두 날 행으로(0-3). 기간 중 매일 표시가 필요하면 design.md 수정 제안.
5. **주간 보기:** 학생 행 × 요일 표는 data-table로 되지만 design.md Responsive Strategy에 행이 없어요 → 수정 제안 대상. 1차에서 빼고 월간 · 목록만 해도 요청은 충족돼요.
6. **체크 부품:** design.md에 체크박스 컴포넌트가 없어요(calendar 02-spec도 filter-chip으로 대체). 행 완료 체크를 무엇으로 그릴지(예: button-outline 정사각 토글 + icon/check, 또는 text 버튼 "완료로 표시") S2에서 design.md 안에서 고르거나 수정 제안.
7. **위치 · 아이콘:** 교사 대분류 "우리 반" 또는 "수합·집계" 아래 소분류 — 사이드바 아이콘 겹침(icon/calendar는 학생 입시 일정이 씀, 교사 사이드바는 다른 그룹이라 겹침 규칙 적용 범위 확인) 결정 필요.
8. **같은 학생 같은 날 고사 둘 이상**이면 calendar D15처럼 ▲ + warning-callout(소신 쌍, R-CARD-002 문구)을 이 화면에도 둘지(학급 단위라 한 날 여러 학생 겹침이 쌓일 수 있음).
9. **문구:** 결과 행 · 토스트 · 타일에 확률 · 가능성 · 보장 · 예측 표현 금지. "합격 n명" 같은 숫자 타일은 결과 집계 몫이라 이 화면에는 두지 않기를 권해요(이 화면 핵심 숫자 = 결과 미입력 n건). rules forbidden_words 대조는 S2.
10. **개인정보:** 학생은 "07 · 바다"만. 대학 일정 입력 시 학생 이름 · 연락처 칸 없음. 저장 · 내보내기(.ics 등)를 넣으면 결과 집계 8-2 개인정보 주의 문구를 그대로.
11. uibowl 한계: 학급 · 교사용 입시 일정, 일정 행에서 합격/불합격을 고르는 화면은 0건이에요. P6 · P7은 일반 단일 선택 시트(L7 · L8)와 결과 집계 S-3 드롭다운을 조합한 추정이에요.
