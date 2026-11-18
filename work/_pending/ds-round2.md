# design.md 패치 5 후보 (사용자 "기본값으로" 승인, 2026-11-18 — 다음 패치에 묶어서)
- 검수 완료 배지 = judge-badge 안정 쌍 ● + 이름(data-status-badge 흑백 규칙의 예외로 한 줄), 테스트 불통과 = 위험 쌍 ■
- 관리자 모바일 탭바 = 규칙 관리 · 더보기(2칸), 관리자 상단 바에 mode-switch 없음
- 가채점 수합 = 결과 집계 화면의 탭(내비 "성적 관리 › 가채점 수합"은 그 탭으로 연결)
- 수시 결과 값(합격·불합격 등 실제 기록)은 흑백 글자, 판정 색 금지
- cut-dot-plot: 이전 연도 tone text-faint → text-muted(대비 2.3:1 → 3:1 이상), 축 자동 범위 0.5 단위, 말풍선 줄(50% 컷·경쟁률·충원율·기준), 전체 탭 행 안 유형별 줄(−8/0/+8)
- Delta: 등급처럼 숫자가 작을수록 상위인 값은 ▲▼ 방향 캡션 필수
- 수시 입결 "최근 3년" = 2024~2026학년도(기준일 2026-11-18 시점 발표된 것) — S3 시안에서 연도 표기 맞추기, 말풍선 문구 "공식 발표 입결만 모았어요"
- univ-logo 크기 단계(20/32/40)
- button-primary disabled, toast 두 줄, text-input multiline·filled, 선택형 입력/드롭다운 목록 정의

# 4차 후보 (3차 이후 보고)
- **susi-slot row 버그: show chip이면 program 글자가 세로 FILL로 부풀고 폭 44~75로 잘림("학생…")** → 칩을 오른쪽 배지 열(판정 아래)로. program도 name 2처럼 단어 단위 속성(PC 칸 2 "소프트웨어학 / 과")
- judge-lane: 카드 높이 속성(지금 top.paddingBottom 17 덮어쓰기)
- data-table/cell: 줄 안 증감 표기 변형(높이 20, 패딩 0) 또는 "이전 → 이후" 비교 셀 — univ-detail 보조 패널·모바일 행이 44로 커짐
- **stat-tile label=risk/reach에 판정 아이콘(■/▲) 없음 → 승인 체크리스트 "판정 = 색 + 아이콘 + 이름" 위반 위험** (teacher-dashboard 타일 3, score-import 라벨)
- Figma 변수 이름 통일: color/heart, color/comp-* 6개만 "color/" 접두사 — 나머지(ink, grade-1 등)와 맞추기
- mask-preview: 역량 색칠 문장을 담을 상태/슬롯(지금 saenggibu-ai는 옆에 따로 둠) — design.md 제안
- competency-card/item, competency-highlight/tooltip·legend 하위 부품 design.md에 한 줄씩
- segmented-control option 6 / grade-trend-chart 최신 값 라벨 accent 속성
- grade-trend-chart: 계열 6(내신 과학 빠짐), 이름표 겹침 처리 / 함정: 점·구간 visible이 show 속성에 묶여 있어 개별 숨김은 opacity 0으로(json 메모 필요)
- data-table/cell minHeight 44 덮어쓰기 불가 → 촘촘한 표(32) 변형
- segmented-control 5칸 HUG가 350 폭을 넘음(student-record/390 탭 잘림) — 가로 스크롤 탭 규칙 또는 FILL
- 넓은 modal(size=wide) 변형 — five-to-nine은 detach로 그림
- data-table/cell 로고 2개(배치표 한 칸에 대학 둘)
- data-table/cell 배지 위치 속성(right|below) — minimum-board 19 별 "교사 입력 · 미검수" 배지가 좁은 칸에 못 들어감(지금 캡션)
- text-input: show error message 속성 / grade-input-table: 묶음·과목 이름 TEXT 속성, 학기 요약 행 슬롯
- student-row-card: show range 속성, 판정 배지 오른쪽 끝 정렬
- TEXT 속성 없음: stat-tile, text-input 값, warning-callout, disclaimer-note, button-primary/outline(지금 안쪽 글자 직접 수정), trace-accordion step 1·2·합계 고정 프레임
- data-table/cell error 배경 상태(지금 grade-input-table/cell 끼워 씀)
- 남은 할 일: 실제 대학 + 숫자 화면 disclaimer-note에 "시안의 대학·숫자는 예시예요" 일괄(univ-score, doelgak, home, susiro, univ-detail 등) — 3차 반영 끝난 뒤
- data-table/cell 가운데 정렬
- 아이콘 disabled: color 컬렉션 disabled 모드(design.md 제안)
- icon/trending-up(성적 추이 메뉴) — design.md 제안
- PC 제목 스타일 화면마다 다름(teacher-dashboard pc/heading-1 vs minimum-board pc/heading-4) — 교사 화면 상단 바 규칙 통일

# 3차 후보 (2차 교체 패스 보고, 2026-11-18)
- **univ-card box(PC 204폭): 대학명이 글자 단위로 꺾임("강원대학 / 교")** — 이름 줄 폭·말줄임 처리 필요
- univ-card box: 높이 맞춤(지금 paddingBottom 직접 덮어씀), plain note를 범위 아래로 내리는 배치
- susi-slot row: 고사일 칩 자리(show chip + chip 텍스트), selected(1px ink), 6회 제외 가로형 768×72 — susiro 모바일 칸 1~5·제외 칸 아직 손조립
- data-table/cell: 증감 표시(show delta / delta / direction) — 진행 중
- saenggibu-ai/390: 섹션 간격을 16으로 줄여 놓음 → 밀도 규칙(32)으로 되돌린다(면접 행은 첫 화면 아래로 가도 됨, 사용자가 "빽빽함" 지적)
- data-status-badge·trace-accordion/step 더보기 버튼: TEXT 속성 없음(안쪽 글자 직접 수정 중)
- stat-tile: PC 크기 변형(pc/display 44) / data-table/cell: SemiBold 600 타입
- mask-preview highlight: 줄 범위 지정 속성
- data-table/cell: 체크 칸(지금 logo 슬롯 빌려 씀), 배경 상태(빈칸 등) / grade-input-table/cell: width 프레임, 빈칸 "–"
- 검증 상태 배지(정상/확인 필요/오류) 전용 — 지금 judge-badge 글자 직접 수정
- text-input: filled 상태, 오른쪽 아이콘(드롭다운), 여러 줄 변형
- stat-tile: 라벨 판정색 속성, PC 숫자 스타일 / segmented-control: show option 3 / student-row-card: 배지 show 속성 / 아이콘 disabled
- homeroom-logs/1440 "전체 기록 보기" 버튼이 프레임에 잘림
- grade-input-table: show group N(묶음 머리 따로), 과목 행 12, 행 아래 오류 안내 슬롯, show head — 지금 4개 쌓기
- segmented-control: selected 변형(1~5칸, 지금 첫 칸 고정), 4·5칸 폭 FILL
- judge-badge: TEXT 속성(수능 최저 판정 이름 근접/미충족/충족 등)
- data-table/cell: 글자 + 배지 함께, muted·body-sm 글자 / student-row-card line 2 색(ink 선택)
- cut-compare-bar 50% 컷 기본값 "2.5"가 숨김 상태로 남음(켤 때 값 필요)

# 디자인 시스템 2차 보강 목록 (화면 에이전트 보고에서 모음, 2026-11-18)

## apply.py 실행 후에만 가능
- sidebar 교사 그룹 8개 메뉴(우리 반 홈 · 학생 기록 · 성적 불러오기 · 수능 최저 판정 · 누가기록 · 카드 수합 · 가채점 수합 · 결과 집계) — 지금 컴포넌트는 옛 5칸(일부 빈 칸 결함)
- range-bar-5to9, grade-trend-chart, grade-1~9 변수

## design.md 정의 필요 (제안 후 사람 결정)
- step-indicator(4단계) — score-import
- week-strip(7칸 날짜 줄) — homeroom-logs
- top-bar(PC 64px), icon-button(44×44)
- 체크박스(행 선택)
- text-input filled 상태 · 오른쪽 아이콘(드롭다운) 슬롯
- cut-compare-bar 축소형(컷 눈금 ink)

## 기존 컴포넌트 속성 추가 (design.md 범위 안)
- **[1순위 · 데이터 오표시] cut-compare-bar: 범위·컷 위치를 인스턴스마다 바꿀 수 없음(relative-transform 덮어쓰기 불가) → 될각 카드 8개 중 7개가 기본 위치(2.4~2.8, 컷 2.8)로 잘못 표시됨.** auto-layout 여백 프레임 폭 등 인스턴스에서 덮어쓸 수 있는 구조로
- susi-slot: 모바일 row 변형(layout=row), 6회 제외 가로형 — susiro/390 칸이 아직 손조립
- univ-card: selected 변형, note 스타일(경계 점선 / 일반 muted 문구) 구분, 로고 40 규격
- warning-callout: selected 변형
- data-table/row: 열 수 가변(6열 고정 → 최대 10), 셀 폭 조절, 행 수 가변(4행 고정)
- grade-input-table/cell: 빈칸(소신 배경) 상태
- student-row-card: 둘째 줄, 선택 상태, 체크 칸
- counsel-timeline: 마디 수 가변, 마디 점, 학생 묶음 칸
- 선택 행: accent 왼쪽 막대 + 아래 hairline 유지
- segmented-control: 옵션 수 4~5개 (지금 3 고정 → grade-input은 filter-chip으로 대체)
- bottom-sheet · modal: content 슬롯(지금은 인스턴스 위에 형제 프레임을 겹침)
- button-primary: disabled 변형 / text-input: disabled(미산출) 변형, 단위 접미사
- grade-input-table: 행 수 가변(3쌍 고정), cell 상태 "해당 없음", 셀 아이콘 자리, 미산출 빗금 폭 대응
- subject-card: error 상태
- sidebar: 데이터 기준일 끄기 속성(상단 바와 중복)
- 아이콘: icon/more(더보기) 추가
- data-table/cell: 로고 슬롯, 둘째 줄 캡션("/ 1,000", "3위 → 1위"), 상태 배지 병합 셀 — univ-score PC에서 빠짐
- mask-preview: 문장 하이라이트(accent-soft) 상태, 보낸 뒤 읽기 전용 상태
- app-bar: 동작 슬롯에 텍스트 버튼(button-pill-soft) 허용
- trace-accordion: 단계별 "더 보기" 버튼 슬롯
- 환산 목록 행(univ-score 모바일 "univ-row") — univ-card 환산 변형 제안(02-spec 제안 1)
- data-table: 라벨-값 2열 형태(머리 행 없음), 셀 굵기 강조 — program-detail 정보 행, univ-detail 2028 열
- stat-tile: 핵심 숫자 accent·display 크기 속성 (home에서 직접 덮어씀)
- univ-card: logo 속성이 안쪽 인스턴스에 연결 안 됨(home에서 직접 교체함) — 버그
- text-input: 왼쪽 아이콘(검색) 슬롯 / filter-chip 높이 36 → 터치 44 검토
- student-row-card 아이콘 슬롯 61×24 고정 → 체크 아이콘 찌그러짐
- competency-card 고정 높이 80 → 모바일 첫 화면에서 면접 행이 밀림

## 화면에서 인스턴스 안 직접 덮어쓴 곳 (2차 후 속성으로 교체)
- score-import: 빈칸 셀 fill, 상태 배지 글자(judge-badge 재사용), sidebar 학생 칸을 교사 메뉴로 개조
- grade-input: 표 인스턴스 4개 쌓기, 저장 버튼 비활성 색 덮어씀, 값 글자 ink 덮어씀, 해당 없음 칸 색 덮어씀, 시트 내용은 형제 프레임
- homeroom-logs: 체크 아이콘 절대 위치, student-row-card 2줄 텍스트 범위 스타일, sidebar 교사 칸 글자 변경(결과 집계 빠짐)
