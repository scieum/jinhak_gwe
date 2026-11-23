# design.md 수정 제안 합본 (2026-11-23)

출처: work/{admission-style,national-placement,eligibility-check,compare,application-checklist,calendar,counsel-tasks,admin-fields,admin-wiki}/02-spec.md 9장 + 2026-11-23 사용자 결정(채팅) 1~5.
기준 본문: docs/design.md(커밋 9eee67e 이후). 아래 anchor는 모두 지금 본문에 정확히 한 번 나와요(대조 확인함).

적용 규칙
- replace: 그 줄 안에서 anchor 문자열만 text로 바꿔요(줄의 나머지는 그대로).
- insert_after: anchor가 든 줄 바로 다음에 text 한 줄을 새 줄로 넣어요. 같은 anchor를 쓰는 insert_after가 여러 개면 적힌 순서대로 이어 붙여요(뒤 편집은 앞 편집이 넣은 줄 다음).
- Responsive 표 행의 칸 구분은 실제 탭 문자예요.
- design.md를 고친 뒤 rules/design-rules.json source.sha256을 새 해시로 바꿔야 해요(안 바꾸면 J9 실패).

### E1 App Shell 학생 대분류 + 소분류 아이콘 (admission-style, national-placement, eligibility-check, compare, application-checklist, calendar, counsel-tasks)
- kind: replace
- anchor: 학생 대분류: 홈 / 성적(성적 입력 · 성적 추이 · 5 to 9 · 대학별 환산 · 모의고사) / 대학 찾기(전형계획 · 수시 입결 · 학과별 구간 · 계열 모아보기 · 될각 · 최저로 찾기) / 수시 전략(수시로 · 생기부 AI). 학과별 구간 소분류 아이콘은 icon/layers(2026-11-23 사용자 결정, 수시 전략 icon/layout-grid와 겹치지 않게), 계열 모아보기 소분류 아이콘은 icon/folder(2026-11-23 사용자 결정, icon/layers · icon/layout-grid와 겹치지 않게).
- text: 학생 대분류: 홈 / 성적(성적 입력 · 성적 추이 · 5 to 9 · 대학별 환산 · 모의고사) / 대학 찾기(전형 성향 탐색 · 전형계획 · 수시 입결 · 전국 배치표 · 학과별 구간 · 계열 모아보기 · 될각 · 최저로 찾기 · 지원 자격 확인표 · 전형 비교) / 수시 전략(수시로 · 원서·서류 체크리스트 · 입시 일정 · 상담 질문·할 일 · 생기부 AI). 학과별 구간 소분류 아이콘은 icon/layers(2026-11-23 사용자 결정, 수시 전략 icon/layout-grid와 겹치지 않게), 계열 모아보기 소분류 아이콘은 icon/folder(2026-11-23 사용자 결정, icon/layers · icon/layout-grid와 겹치지 않게). 2026-11-23 사용자 결정으로 소분류 아이콘을 더 정합니다: 전형 성향 탐색 icon/compass(생기부 AI icon/sparkles와 겹치지 않게) · 전국 배치표 icon/chart-scatter(icon/layout-grid · icon/layers · icon/folder와 겹치지 않게) · 지원 자격 확인표 icon/clipboard-check · 전형 비교 icon/columns-2(대학별 환산 icon/arrow-up-down과 겹치지 않게) · 원서·서류 체크리스트 icon/list-checks(모의고사 icon/check와 겹치지 않게) · 입시 일정 icon/calendar(성적 추이는 icon/trending-up으로 바꿔 겹치지 않게) · 상담 질문·할 일 icon/message-square(교사 모드 학생 상담과 같은 아이콘이지만 학생 · 교사 사이드바가 따로라 한 사이드바 안에서는 겹치지 않음).

### E2 App Shell 관리자 대분류 + 소분류 아이콘 (admin-fields, admin-wiki)
- kind: replace
- anchor: 관리자 대분류(관리자 계정에서만): 규칙 관리(규칙 편집기 · 검수).
- text: 관리자 대분류(관리자 계정에서만): 규칙 관리(규칙 편집기 · 검수 · 계열표 · 위키 요약). 관리자 모바일 하단 탭바는 규칙 관리 · 더보기 두 칸이고, 관리자 상단에는 mode-switch · 잠금 버튼을 두지 않습니다. 소분류 아이콘은 규칙 편집기 icon/file-text · 검수 icon/check · 계열표 icon/layout-grid · 위키 요약 icon/book-open(2026-11-23 사용자 결정, 서로 겹치지 않게).

### E3 Semantic 완료 색 범위 (admin-fields, admin-wiki, application-checklist, eligibility-check, counsel-tasks)
- kind: replace
- anchor: 완료·검수 완료는 안정 색 쌍을 씁니다.
- text: 완료·검수 완료는 안정 색 쌍을 씁니다. 이 규칙은 환산 규칙 검수(규칙 편집기 · 검수)에만 적용하고, 계산이 없는 관리자 데이터(계열표 · 위키 요약)의 검수 대기 · 1인 승인 · 검수 완료는 흑백 data-status-badge로 씁니다(2026-11-23 사용자 결정, 판정 색 · ● 없음). 학생이 직접 적는 기록(지원 자격 확인표 · 원서·서류 체크리스트 · 상담 질문·할 일)의 완료 · 확인 표시도 판정 색을 쓰지 않습니다.

### E4 Responsive 행: 전형 성향 탐색 (admission-style)
- kind: insert_after
- anchor: 묶음 filter-chip 가로 스크롤 한 줄(9개, 줄바꿈 없음)
- text: 전형 성향 탐색(2026-11-23, 체험판)	소개 카드 → 준비 방식 카드 5장 세로(누르면 설명 바텀시트) → 문항 단계(진행 막대 + 문항 카드 + 세로 선택지 5개 + 이전 · 다음 한 줄) → 결과(히어로 + 결과 공유 → 전형 카드 1열 → 근거 아코디언 → 버튼 세로 4개 → 고지). 답변 한눈에 보기 · 확인 창 · 공유는 바텀시트, 지운 뒤 toast	page-header → 본문 최대 720 가운데(문항 · 결과), 준비 방식 카드 5장 한 줄 → 결과 전형 카드 2열. 설명 · 답변 보기 · 확인 창 · 공유는 모달. 판정 색 · 점수 · 캐릭터 없음

### E5 Responsive 행: 전국 배치표 (national-placement)
- kind: insert_after
- anchor: 묶음 filter-chip 가로 스크롤 한 줄(9개, 줄바꿈 없음)
- text: 전국 배치표(2026-11-23)	검색 1줄 + 조건 filter-chip 1줄(칩마다 바텀시트) → 보기 전환 세그먼트(좌표 · 목록 · 수집 대학) → 전형 유형 세그먼트 + 범례 → 내 위치 줄(검수 전 "준비 중") · 준비 중 묶음 줄 → cut-dot-plot(대학 행, 10곳씩) → 점을 누르면 말풍선 → 원문 바텀시트 → 근거 아코디언	page-header → 조건 카드(검색 2칸 + 상세 조건 세그먼트 · 칩 · 등급 범위 입력, 펼침 기본) → 결과 카드(보기 전환 세그먼트 · 전형 유형 세그먼트 · cut-dot-plot 10곳씩 / data-table 50행 / 수집 대학 data-table 20곳) → 점을 누르면 말풍선 → 원문 모달(size=wide) → 근거 아코디언. 계열 배치표(placement-board)는 넷째 보기 제안 참고 프레임에만

### E6 Responsive 행: 지원 자격 확인표 (eligibility-check)
- kind: insert_after
- anchor: 묶음 filter-chip 가로 스크롤 한 줄(9개, 줄바꿈 없음)
- text: 지원 자격 확인표(2026-11-23)	화면 제목 → 준비할 전형 선택 칸(누르면 바텀시트) → 전형 카드(이어서 갈 곳 버튼 가로 스크롤 한 줄) → 요약 stat-tile 2개 → 안내 → 항목 카드 세로 목록(상태 배지 · 메모 · 자료 링크 · 확인 기록) → 항목을 고치면 바텀시트 → 저장 뒤 toast	page-header(주요 버튼 "+ 지원 전형 추가") → 전형 카드(선택 칸 + 이어서 갈 곳 버튼 한 줄) → 요약 stat-tile 2개 + 안내 한 줄 → 항목 카드 2열 그리드 → 항목을 고치면 모달 → 저장 뒤 toast

### E7 Responsive 행: 전형 비교 (compare)
- kind: insert_after
- anchor: 묶음 filter-chip 가로 스크롤 한 줄(9개, 줄바꿈 없음)
- text: 전형 비교(2026-11-23)	화면 제목 → 모든 항목 · 다른 점만 세그먼트 + 전형 추가 → 조건 filter-chip 한 줄(학년도 · 모집시기 · 지표 · 컷·통계, 누르면 비교 조건 바텀시트) → data-table 변형 compare(열 머리 고정 + 항목 이름 띠, 2열 보이고 3·4열은 가로로 밀기) → 고지. 전형 선택 · 원문 상세 · 지원 준비는 바텀시트, 빼면 toast	page-header(전형 추가) → 세그먼트 + 선택 입력칸 4개 한 줄 → data-table(첫 열 항목 고정 + 전형 2~4열, 가로 스크롤 없음) → 고지. 전형 선택 · 지원 준비는 모달, 원문 상세는 모달 size=wide, 빼면 toast

### E8 Responsive 행: 원서·서류 체크리스트 (application-checklist)
- kind: insert_after
- anchor: 6칸 세로 목록 + 상단 고정 경고 요약 바
- text: 원서·서류 체크리스트(2026-11-23)	화면 제목 → 준비할 전형 고르기(누르면 바텀시트 목록) → 전형 카드(전형 정보 · 수정 · 삭제 · 자료 링크 · 진행 막대 "완료 n / m" + 개수 한 줄 · 바로가기 2열) → 걸러 보기 filter-chip 한 줄(전체 · 남은 항목 · 기한 지남 · 완료) → 체크 항목 카드 목록(왼쪽 checkbox 한 번 눌러 완료 · 이름 · 진행 상태 아이콘+글자 · 마감 라벨 · 메모 · 자료 · 확인 기록 · 수정/삭제) → + 체크 항목 추가 → 고지. 편집 · 추가 · 삭제 확인 · 날짜 고르기는 모두 바텀시트	page-header(+ 지원 전형 추가) → 전형 카드 한 장(준비할 전형 고르기 + 전형 정보 + 진행 막대 + 개수 + 바로가기 한 줄) → 걸러 보기 filter-chip 한 줄 → data-table(완료 checkbox · 항목 · 진행 상태 · 마감 · 확인 기록 · 자료 · 동작) → 고지. 편집 · 추가 · 삭제 확인은 모달(최대 폭 560), 날짜 고르기는 모달 안 마감 칸 아래 펼침. 마감 라벨 · 진행 상태는 판정 색 없이 아이콘 + 글자 + 굵기로만 구분

### E9 Responsive 행: 입시 일정 (calendar)
- kind: insert_after
- anchor: 6칸 세로 목록 + 상단 고정 경고 요약 바
- text: 입시 일정(2026-11-23)	제목 + 월간 · 목록 세그먼트 → 다가오는 일정 stat-tile → filter-chip 한 줄(전형 ▾ · 일정 종류 · 완료 포함, 전형은 바텀시트) → 달 이동(월 제목 ▾를 누르면 달 고르기 바텀시트) + data-table 변형 month(고사 겹침 날은 ▲) → 이번 달(또는 고른 날) 일정 목록(겹침이 있으면 맨 위 warning-callout) → 날짜 미정 접힘 → .ics 내보내기(확인 바텀시트 → toast) → 고지. 일정 상세는 바텀시트	왼쪽 달력(data-table 변형 month) + 오른쪽 360 패널(다가오는 일정 stat-tile → 일정 목록 → 날짜 미정 · 내보내기), 위에 filter-chip 한 줄 + 오른쪽 월간 · 목록 세그먼트. 목록 보기는 왼쪽이 data-table로 바뀝니다. 전형 · 달 고르기는 누른 자리 아래 떠 있는 목록, 일정 상세 · 내보내기 확인은 모달

### E10 Responsive 행: 상담 질문·할 일 (counsel-tasks)
- kind: insert_after
- anchor: 6칸 세로 목록 + 상단 고정 경고 요약 바
- text: 상담 질문·할 일(2026-11-23)	화면 제목 줄(오른쪽 + 추가 · 상담카드에 담기) → 숫자 한 줄(진행할 항목 · 오늘까지 · 기한 지남) → filter-chip 가로 스크롤 한 줄(상태 3개 · 오늘까지 · 기한 지남 + 구분 · 전형은 바텀시트) → 상담 항목 카드 세로 목록(흰 카드: 구분 · 전형 · 상담일 캡션 → 제목 → 기한 줄 → 메모 칸 → 완료로 표시(질문은 "물어봤어요") · 수정 버튼) → 추가 · 수정은 bottom-sheet(삭제는 그 안 button-danger-text → 확인 바텀시트), 상담카드에 담기는 share-sheet	page-header(+ 질문·할 일 추가 · 상담카드에 담기) → 숫자 한 줄 → filter-chip 2줄(상태 · 기한 · 구분 / 전형) → 상담 항목 카드 2열 그리드 → 추가 · 수정은 modal(전형 고르기는 filter-chip 묶음), 상담카드에 담기는 share-sheet 모달. 기한 지남 · 오늘까지는 잉크 SemiBold 글자로만 구분하고 판정 색 · 판정 아이콘을 쓰지 않습니다. stat-tile을 쓰지 않습니다

### E11 Responsive 행: 대학 위키 요약 검수 (admin-wiki)
- kind: insert_after
- anchor: 3단: 학생 요약 / 될각·수시로 / 상담 메모 타임라인
- text: 대학 위키 요약 검수(2026-11-23, 관리자)	제목 + 공개 파일 내보내기 → 안내 띠 → 요약 쓰기 카드(입력 세로) → 검색 + 검수 상태 filter-chip 한 줄 → 카드 목록 → 카드를 누르면 bottom-sheet 편집기. 삭제 · 닫기 · 다시 저장 · 내보내기 확인은 바텀시트, 완료는 toast	page-header → 안내 띠 → 요약 쓰기 카드(입력 한 줄) → 검색 + 검수 상태 segmented-control + 기록 가져오기 · 내보내기 → data-table → 대학을 누르면 modal size=wide 편집기. 삭제 · 닫기 · 다시 저장 · 내보내기 확인은 modal 560, 완료는 toast. 검수 상태는 모두 흑백 data-status-badge

### E12 button-primary 비활성 (admission-style, compare)
- kind: insert_after
- anchor: 한 화면에 주요 버튼은 하나만 둡니다.
- text: 비활성(2026-11-23): 필요한 입력이 없을 때 {colors.canvas-soft} 채움 + {colors.text-faint} 글자, 누를 수 없고 포인터 변화 없음. 왜 꺼졌는지는 버튼 근처 문장이나 보조 기술용 설명으로 알립니다.

### E13 확인 창 (eligibility-check, admission-style, calendar, admin-fields, admin-wiki)
- kind: insert_after
- anchor: 누르면 반드시 확인 모달을 띄웁니다.
- text: 확인 창(2026-11-23): 지우기 · 되돌리기 어려운 저장 · 저장하지 않고 나가기 · 내보내기 전에 PC modal(최대 폭 560) / 모바일 bottom-sheet로 묻습니다. 제목 질문 {typography.heading-4} + 함께 지워지거나 바뀌는 것 한 줄 {typography.body} + button-primary 실행(잉크, 예: "삭제") + button-outline "취소"이고, PC는 버튼을 오른쪽 정렬합니다. 확인 창 안 실행 버튼에는 위험 색 채움을 쓰지 않습니다. 끝난 결과는 toast 한 줄로 알립니다.

### E14 text-input 변형 select · multiline · type=date (eligibility-check, compare, application-checklist, calendar, counsel-tasks, admin-wiki)
- kind: insert_after
- anchor: 변형(2026-11-23 학과별 입결 구간표): on=card
- text: 변형 select · multiline · type=date(2026-11-23 지원 자격 확인표 · 전형 비교 · 원서·서류 체크리스트 · 입시 일정 · 상담 질문·할 일 · 대학 위키 요약 검수): 세 변형 모두 채움 · 모서리 0 · on · size · 포커스 · 오류 규칙은 text-input · text-input-error와 같습니다. ① select = 정해진 값 중 하나를 고르는 칸입니다. 직접 타이핑하지 않고 오른쪽 끝에 icon/chevron-down 20 {colors.ink}를 두며, 값이 넘치면 한 줄 말줄임입니다. 누르면 모바일은 bottom-sheet 단일 선택 목록, PC는 칸 바로 아래 같은 폭 이상의 떠 있는 목록(Overlay: {colors.canvas} + 1px {colors.hairline} + {shadow.overlay}, 모서리 0, 행 높이 40 {typography.body}, 마우스를 올린 행 {colors.canvas-soft}, 고른 행 = Elevation Selected + 오른쪽 icon/check {colors.accent})이 열리고, 바깥을 누르거나 Esc로 닫으며 행을 고르면 바로 닫힙니다. PC에서 폼 밖(filter-chip · 달력 월 제목 등)에서 고르기를 열 때도 같은 떠 있는 목록을 누른 자리 아래 4px에 엽니다(폭 = 누른 요소 이상 최대 360, 2026-11-23 입시 일정). 버튼이 있는 확인 · 편집 내용은 modal을 씁니다. 선택지가 5개 이하이고 한 줄에 들어가면 select 대신 segmented-control을, 모바일 목록 위 조건은 filter-chip 줄 + bottom-sheet를, 폼 밖 화면 위 고르기 버튼은 button-pill-soft + ▾를 먼저 씁니다. ② multiline = 메모처럼 여러 줄을 넣는 칸입니다. 글자 {typography.body-sm}, 높이 = 보이는 줄 수 × 24 + 위아래 패딩(기본 4줄 112, 짧은 입력은 3줄 96)에서 시작해 내용만큼 최대 8줄 208까지 늘고, 그 뒤는 칸 안 세로 스크롤입니다. 글자 수 제한이 있으면 칸 오른쪽 아래 바깥에 "n/최대" {typography.caption} {colors.text-muted} 고정폭을 둡니다. ③ type=date(시각까지 넣으면 type=datetime) = 날짜 한 개를 넣는 칸입니다. 값은 "2026-11-24"(datetime은 "2026-11-24 18:00") 고정폭 숫자, 빈 값 안내는 "YYYY-MM-DD" {colors.text-faint}, 오른쪽 끝에 icon/calendar 16 {colors.ink-soft}. 누르면 날짜 고르기(bottom-sheet 변형 date, PC는 칸 아래 펼침)를 엽니다. 선택 입력이면 라벨 뒤에 "(선택)"을 붙입니다.

### E15 checkbox — 새 컴포넌트 (application-checklist, compare)
- kind: insert_after
- anchor: 분포비율 합이 100%가 아니에요 (98.5%)")
- text: checkbox(2026-11-23 원서·서류 체크리스트 · 전형 비교) — 켜고 끄는 네모 칸입니다. 20×20, 모서리 0, 꺼짐 = {colors.canvas} 채움 + 1.5px {colors.ink-soft} 테두리, 켜짐 = {colors.ink} 채움 + {colors.on-primary} 체크 표시, 누르는 영역 44×44. 판정 색 · Route Blue를 쓰지 않고, 켜져도 옆 글자에 취소선 · 회색 처리를 하지 않습니다(대비 유지). 옆에 상태 글자(예: "완료")를 함께 둡니다. 쓰는 곳: 원서·서류 체크리스트 항목을 한 번 눌러 완료로 표시, bottom-sheet 여러 개 고르는 목록, mask-preview의 "가린 내용을 확인했어요". 하나만 고르는 목록에는 쓰지 않습니다.

### E16 파일 불러오기 버튼 (admin-fields)
- kind: insert_after
- anchor: 분포비율 합이 100%가 아니에요 (98.5%)")
- text: 파일 불러오기(2026-11-23 학과 계열표 검수): 브라우저 기본 파일 입력 모양을 그대로 쓰지 않고 button-outline "○○ 파일 고르기" + 아래 {typography.caption} {colors.text-muted} 형식 안내(고른 뒤에는 파일 이름)로 씁니다. 파일 창과 내려받기는 OS 기본 창이라 시안에 그리지 않습니다.

### E17 cut-dot-plot 묶음 점 · 겹침 · 페이지 (national-placement)
- kind: insert_after
- anchor: 표 보기(data-table)와 같은 데이터를 세그먼트로 전환합니다.
- text: 전국 배치표 규칙(2026-11-23): 같은 대학 · 같은 값(소수 첫째 자리) 행은 점 하나로 묶고 점 오른쪽 위에 원문 행 수를 {typography.caption} {colors.text-muted}로 적습니다. 한 행 안에서 점끼리 0.15등급 안으로 붙으면 그 행을 위아래 두 줄로 나눕니다(줄 간격 14). 대학이 많으면 10곳씩 페이지로 나누고(data-table 페이지 이동 줄) 축 머리는 위에 붙입니다. 같은 위치에 원문이 여러 행이면 말풍선에 "같은 위치 n행"만 적고 원문 상세에서 고르게 합니다.

### E18 placement-board 쓰임 — 전국 배치표 (national-placement)
- kind: insert_after
- anchor: 보기 전환 segmented-control(표 · 배치표 · 대학별 점)로 바꿉니다.
- text: 전국 배치표 화면(2026-11-23 사용자 결정)은 앱 모양 그대로 cut-dot-plot(가로축 9등급 · 대학 행)을 기본 보기로 쓰고, 보기 전환은 "좌표 배치표 · 전체 목록 · 수집 대학"입니다. 이 컴포넌트(계열 배치표)는 넷째 보기 제안으로 참고 프레임에만 그리고, 학과 계열표 검수가 끝난 뒤 보기 전환에 넣을지 다시 정합니다.

### E19 data-status-badge 관리자 검수 상태 (admin-fields, admin-wiki)
- kind: insert_after
- anchor: 흑백 알약({colors.canvas-soft} + {colors.text-muted}). 데이터 상태는 판정 색을 쓰지 않습니다.
- text: 관리자 검수 상태(2026-11-23 사용자 결정): 계열표 · 위키 요약처럼 계산이 없는 관리자 데이터의 작성 중 · 검수 대기 · 1인 승인 · 검수 완료 · 반려는 모두 이 흑백 알약으로 씁니다(판정 색 · ● 없음). 안정 색 쌍은 환산 규칙 검수(규칙 편집기 · 검수)에만 씁니다.

### E20 data-status-badge 변형 self (eligibility-check)
- kind: insert_after
- anchor: 데이터 상태(준비 중 · 기준일)에는 쓰지 않습니다.
- text: 변형 self(2026-11-23 지원 자격 확인표): 학생이 모집요강을 보고 직접 적은 확인 기록의 상태입니다(확인 필요 · 충족으로 확인 · 미충족으로 확인 · 해당 없음). 채움 {colors.canvas} + 1px {colors.hairline} 외곽선 + {colors.ink-soft} 글자 {typography.label}, 높이 24, 좌우 패딩 {spacing.xs}, 모서리 0이고 Page 바탕 위에서도 같은 모양입니다. 이름 앞에 아이콘 12({colors.ink-soft})를 둡니다: 확인 필요 icon/circle-help · 충족으로 확인 icon/check · 미충족으로 확인 icon/x · 해당 없음 icon/minus. 서비스 판정이 아니라 내 기록이라서 판정 색 · Route Blue를 쓰지 않고, 이름은 "…으로 확인"처럼 기록임을 드러내는 문구를 그대로 씁니다. 수능 최저 판정 배지 · judge-badge와 한 화면에 섞어 쓰지 않습니다.

### E21 data-table 변형 compare (compare)
- kind: insert_after
- anchor: 산출 근거 설명에는 이 변형 대신 trace-accordion을 씁니다.
- text: 변형 compare(2026-11-23 전형 비교): 항목(행) × 비교 대상(열) 표를 모바일에서 카드 목록으로 바꾸지 않고 표로 둘 때 씁니다. 열 머리 줄은 위에 붙어 고정되고, 행마다 표 폭 전체에 걸친 항목 이름 띠(높이 32, {colors.canvas-soft} 채움, {typography.label} {colors.ink-soft}, 가로로 밀어도 글자는 제자리)를 두고 그 아래에 열 값을 놓습니다. 열 폭 150, 열 사이 1px {colors.hairline-soft} 세로선, 화면 폭에 다 안 들어가는 열은 오른쪽 끝이 잘려 보이게 해서 가로로 밀 수 있음을 알리고 표 아래 caption으로 한 번 더 안내합니다. 열 순서는 사용자가 고른 순서이고 최고/최저 강조 · 순위 · 판정 색 · Route Blue를 쓰지 않습니다. PC에서는 기본 data-table(첫 열 항목 고정)로 돌아갑니다.

### E22 data-table 변형 month (calendar)
- kind: insert_after
- anchor: 산출 근거 설명에는 이 변형 대신 trace-accordion을 씁니다.
- text: 변형 month(2026-11-23 입시 일정): 한 달을 7열(일~토) 표로 보여 주는 달력입니다. 머리글 {colors.canvas-soft} + {typography.table-head}, 칸 구분 1px {colors.hairline-soft}, 요일 글자에 색을 쓰지 않습니다. 칸 = 날짜 숫자 {typography.table} 고정폭 + 일정이 있으면 아래 "n건" {typography.caption} {colors.ink}(일정 이름 막대 · 색 점은 쓰지 않음). 칸 전체가 버튼이고 모바일 칸은 50×48(44 이상), PC 칸은 높이 88입니다. 오늘 = 날짜 숫자를 24×24 {colors.primary} 채움 정사각 + {colors.on-primary} 글자로, 선택한 날 = 칸 전체 {colors.accent-soft} + 1px {colors.accent} 안쪽 테두리(Elevation Selected의 칸 버전), 다른 달 칸은 비웁니다. PC 호버 = Elevation 3. 고사 일정이 겹쳐 경고가 있는 날은 "n건" 옆 ▲ {colors.judge-reach}를 두고 내용은 그날 목록의 warning-callout과 칸 대체 텍스트로 읽히게 합니다. 모바일에서도 카드 목록으로 바꾸지 않고 표로 둡니다.

### E23 data-table 페이지 이동 줄 (national-placement, admin-fields)
- kind: insert_after
- anchor: 첫 열 고정, 머리글 고정, 정렬 가능한 열에는 정렬 화살표
- text: 페이지 이동 줄(2026-11-23 전국 배치표 · 학과 계열표 검수): 한 번에 다 보여 주지 않는 표 · 그래프(cut-dot-plot 10곳씩, 50행이 넘는 관리자 표) 아래에 button-outline "이전" · 고정폭 "n / m" {typography.caption} · button-outline "다음"을 둡니다. 학생 화면은 가운데, 관리자 표 카드는 오른쪽 정렬이고 버튼 높이는 PC 32 · 모바일 44입니다. 첫 쪽의 "이전", 마지막 쪽의 "다음"은 비활성({colors.text-faint} 글자 · {colors.hairline-soft} 테두리)입니다. 번호 버튼 줄 · 무한 스크롤은 쓰지 않습니다.

### E24 trace-accordion 제목 추가 (admission-style, national-placement)
- kind: replace
- anchor: 모집단위를 묶음에 넣은 기준을 설명할 때는 "어떻게 묶었나요?"(2026-11-23 특수 계열 모아보기)
- text: 모집단위를 묶음에 넣은 기준을 설명할 때는 "어떻게 묶었나요?"(2026-11-23 특수 계열 모아보기), 발표값을 좌표에 찍은 기준을 설명할 때는 "어떻게 찍었나요?"(2026-11-23 전국 배치표), 자기탐색 결과를 나눈 규칙을 설명할 때는 "결과는 어떻게 정했나요?"(2026-11-23 전형 성향 탐색 — 규칙 문장만 쓰고 학생의 계산값은 넣지 않습니다)

### E25 warning-callout 변형 tone=neutral (application-checklist)
- kind: insert_after
- anchor: PC: 오른쪽 보조 패널에 목록
- text: 변형 tone=neutral(2026-11-23 원서·서류 체크리스트): 수시로 조합 경고가 아닌 화면에서, 저장하면 기록이 바뀌거나 이미 같은 기록이 있다는 걸 알리는 안내 블록입니다. {colors.canvas-soft} 채움(흰 카드 · 모달 안) 또는 {colors.canvas} 채움(Page 위), 모서리 0, 패딩 {spacing.sm} {spacing.md}, 왼쪽 ⓘ 아이콘 {colors.ink} + 글자 {typography.body-sm} {colors.ink}(제목 줄이 있으면 {typography.label} SemiBold). 판정 색 · ▲ 아이콘 · Route Blue를 쓰지 않습니다. 관련 입력칸 바로 아래에 두고, 블록 안에 버튼을 두지 않습니다(바뀐 주요 버튼 글자로 다음 동작을 알립니다).

### E26 evidence-quote 쓰임 (admission-style)
- kind: insert_after
- anchor: PC에서 누르면 왼쪽 원문 해당 위치로 스크롤하고
- text: 전형 성향 탐색 결과 카드의 "이 답변을 참고했어요"에도 같은 모양을 씁니다(2026-11-23). 출처 캡션 = "n번 문항 · 고른 답", 누름 동작 없음, 응답값 숫자 없음.

### E27 share-sheet 변형 result (admission-style)
- kind: insert_after
- anchor: 선택지 두 개: "QR로 보여주기"
- text: 변형 result(2026-11-23 전형 성향 탐색): 위에 공유될 결과 카드 미리보기(유형 이름 · 함께 살펴볼 전형 이름 · "자기탐색 체험판 결과예요" 고지)를 두고, 선택지는 "이미지로 저장" · "QR로 보여주기" 두 개입니다. 근거 문장과 개별 답은 담지 않고, 링크 공유는 두지 않습니다(서버 저장 없음).

### E28 bottom-sheet 단일 선택 목록 (eligibility-check, compare, application-checklist, admin-wiki)
- kind: insert_after
- anchor: 위쪽 {rounded.sm}, 손잡이 막대, {shadow.overlay}, 뒤 {colors.scrim}
- text: 단일 선택 목록(2026-11-23 지원 자격 확인표): 바텀시트 · 모달 안에서 선택지 하나를 고를 때 씁니다(text-input 변형 select의 모바일 목록도 이것입니다. 라디오 · checkbox 모양은 쓰지 않습니다). 행 높이 모바일 48 · PC 40, 행 = (아이콘 16) + 이름 {typography.title} + (설명 한 줄 {typography.body-sm} {colors.text-muted}), 행 사이 1px {colors.hairline-soft}. 고른 행 = Elevation Selected({colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대) + 오른쪽 icon/check {colors.accent}. 라디오 묶음으로 읽히고 방향키로 이동합니다. 고르면 바로 닫히는 목록(정렬 · 전형 고르기)과 저장 버튼으로 확정하는 목록(편집기 안 상태)을 모두 이 모양으로 그립니다.

### E29 bottom-sheet 여러 개 고르는 목록 (compare)
- kind: insert_after
- anchor: 위쪽 {rounded.sm}, 손잡이 막대, {shadow.overlay}, 뒤 {colors.scrim}
- text: 여러 개 고르는 목록(2026-11-23 전형 비교, modal에서도 같음): 행 높이 64(모바일) · 56(PC), 행 오른쪽 끝에 checkbox를 둡니다. 고른 행 = Elevation Selected({colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대) + checkbox 켜짐, 안 고른 행 = 흰 바탕 + checkbox 꺼짐, 고를 수 없는 행 = 글자 {colors.text-faint} + checkbox 없음 + 이유 링크. 위에 "n / 최대개수 선택" 상태 줄, 아래 고정 줄에 button-outline "취소" + button-primary "선택한 n개 …"(최소 개수 미만이면 비활성).

### E30 bottom-sheet 변형 date — 날짜 고르기 (application-checklist, counsel-tasks)
- kind: insert_after
- anchor: 위쪽 {rounded.sm}, 손잡이 막대, {shadow.overlay}, 뒤 {colors.scrim}
- text: 변형 date(2026-11-23 원서·서류 체크리스트 · 상담 질문·할 일): 날짜(· 시각)를 고르는 시트입니다. 머리 = 제목 {typography.heading-4} + (비워 둘 수 있으면) 오른쪽 button-pill-soft "마감 없음". 본문 = 월 이동(‹ 2026년 11월 ›) + 7열 달력 격자(칸 44×44, 모서리 0, 날짜 {typography.numeric} 고정폭): 고른 날 = {colors.accent-soft} 채움 + {colors.ink} 글자, 오늘 = 1px {colors.ink} 테두리, 다른 달 날짜 = {colors.text-faint}. 시각을 넣는 칸이면 아래 시각 text-input(HH:MM) + 캡션 "한국 시간 기준이에요". 아래 고정 줄 button-outline "취소" + button-primary "적용". PC는 같은 내용을 모달 안 날짜 칸 아래 펼침 영역으로 둡니다. 판정 색 · 주말 빨강을 쓰지 않습니다.

### E31 modal size=wide 쓰임 (admin-wiki)
- kind: replace
- anchor: 표가 주인공인 모달(예: 5 to 9 배치표)은 최대 폭 960px
- text: 표가 주인공인 모달(예: 5 to 9 배치표)과 같은 항목이 반복되는 긴 편집 폼(예: 위키 요약 편집기, 2026-11-23)은 최대 폭 960px

### E32 empty-state 화면 오류 줄 (compare)
- kind: insert_after
- anchor: 가운데 정렬, 흑백 선 아이콘
- text: 화면 오류 줄(2026-11-23 전형 비교): 자료를 읽거나 저장하지 못했을 때 목록 · 표 위에 둡니다. 흰 카드(Page 위) 또는 흰 바탕 안에 icon/triangle-alert 20 {colors.ink} + {typography.body} {colors.ink} 문장 + (다시 할 수 있으면) button-outline 하나. 판정 색(위험 · 소신 쌍)을 쓰지 않습니다 — 입력칸 하나의 형식 오류만 text-input-error를 씁니다.

### E33 empty-state 불러오는 중 (national-placement)
- kind: insert_after
- anchor: 가운데 정렬, 흑백 선 아이콘
- text: 불러오는 중(2026-11-23 전국 배치표): 진행 막대 · 스켈레톤 없이 자리에 "○○을 읽고 있어요." {typography.body-sm} {colors.text-muted} 한 줄만 둡니다. 아이콘 · 버튼은 없습니다.

### E34 filter-chip 변형 option — 세로 선택지 (admission-style)
- kind: insert_after
- anchor: 모바일 목록 위 컨트롤은 검색 1줄
- text: 변형 option(2026-11-23 전형 성향 탐색): 질문 하나에 답 하나를 고르는 세로 선택지입니다. 카드 폭 전체, 높이 모바일 56 · PC 52 이상, 사이 {spacing.xs}, 왼쪽 글자 {typography.body} · 오른쪽 표시 {typography.label} 고정폭(번호 01~, 고르면 ✓). off · on 모양은 filter-chip과 같고(off {colors.canvas-soft}, on {colors.accent-soft} 채움 + 1px {colors.accent} 테두리 + {colors.ink} 글자), 단일 선택(라디오)입니다. "잘 모르겠어요"처럼 척도 밖 선택지는 위에 1px {colors.hairline-soft} 구분선을 둡니다. 점수 숫자를 선택지에 쓰지 않습니다.

### E35 score-bar 변형 progress — 진행 막대 (admission-style, application-checklist)
- kind: insert_after
- anchor: 대학별 환산의 만점 대비 비율 등에 씁니다.
- text: 변형 progress(2026-11-23 전형 성향 탐색 · 원서·서류 체크리스트): 진행을 보여 줄 때 씁니다. 높이 6, 트랙 {colors.canvas-soft}. ① 단계 진행(여러 단계 중 지금 몇 번째인지) = 채움 {colors.accent}(Route Blue "진행 표시"), 막대 위 오른쪽에 "n / 전체" {typography.label} 고정폭. ② 내가 등록한 항목의 완료 비율 = 채움 {colors.ink}(Route Blue 없음), 막대 위 "완료 n / m" {typography.title} 고정폭, 분모에서 뺀 항목이 있으면 막대 아래 캡션으로 밝힙니다(예: "해당 없음 2개는 빼고 셌어요"). 점수 · 결과 크기 · 목표 대비 성취 · 서열을 보여 주는 데는 쓰지 않습니다.

## 합치면서 뺀 제안 · 정리

- admission-style 9장 7(캐릭터 길콩): D5 기본안(시안에 넣지 않음, 사용자 결정 5)이라 넣지 않았어요. 앱에 이미 있는 이미지라 결정 1(새 기능)에 해당하지 않아요.
- admin-wiki 9장 5(검수 완료 = judge-badge 안정 쌍 ●): 사용자 결정 3(관리자 검수 배지 모두 흑백)과 충돌해서 뺐어요. E3 · E19로 대체해요.
- calendar 9장 4(dropdown): 새 이름을 만들지 않고 E14 text-input 변형 select의 PC 떠 있는 목록에 합쳤어요(Elevation Overlay 표에 이미 "드롭다운"이 있어요).
- compare 9장 5의 "빈 네모(1px hairline)"는 E15 checkbox 꺼짐 모양으로 통일했어요(E29).
- application-checklist bottom-sheet 변형 date의 {colors.text-disabled}는 design.md에 없는 토큰이라 {colors.text-faint}로 바꿨어요(E30).
- 겹친 수치 정리: select chevron 20(16 · 20 중 다수), segmented-control로 바꾸는 기준 5개 이하, 고른 행 check {colors.accent}, multiline 기본 4줄 112 · 짧은 입력 3줄 96 · 최대 8줄 208 · 글자 수 칸 바깥, 페이지 이동 "n / m" {typography.caption}.
- admin-fields는 Responsive 행 제안이 없어서 행을 넣지 않았어요. 9장 5(입력 오류 요약 줄)는 설명만이라 편집 없음.
- 데이터 · PRD 메모(admission-style 10 · national-placement 9 · application-checklist 8 · counsel-tasks 5)는 design.md 대상이 아니라 넣지 않았어요.

## design.md 밖 함께 할 일 (하네스 밖 · 사람/앱 작업)

- 아이콘 세트(work/design-system.json Icons · work/icons)에 추가: icon/compass · icon/chart-scatter · icon/clipboard-check · icon/columns-2 · icon/list-checks · icon/trending-up · icon/minus · icon/circle-help(없으면) · icon/book-open(없으면).
- app/src/shell/nav.ts 아이콘: admission-style sparkles→compass, national-placement layout-grid→chart-scatter, eligibility-check check→clipboard-check, compare arrow-up-down→columns-2, application-checklist check→list-checks, score-trend calendar→trending-up, 위키 요약 file-text→book-open(slug admin-rules→admin-wiki 권장). 대학 찾기에 학과별 구간 · 계열 모아보기 · 최저로 찾기가 nav.ts에 없으면 E1 순서대로 넣기.
- rules/design-rules.json source.sha256 갱신(J9).

## rules components 추가: checkbox

## rules 목록 추가 권장

- requires_disclaimer_note 추가: compare · application-checklist · calendar · national-placement · admission-style (모두 spec에 disclaimer-note가 있어 G2는 그대로 통과).
- requires_trace_accordion 추가: national-placement("어떻게 찍었나요?") · admission-style("결과는 어떻게 정했나요?").
- 추가하지 않음: eligibility-check · counsel-tasks(학생 기록, 계산 · 판정 없음), admin-fields · admin-wiki(관리자 도구, 계산 · 판정 없음).
