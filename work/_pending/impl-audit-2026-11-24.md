# G5 시안↔앱 구현 일치 전수조사 (2026-11-24)

## 재검사(샘플 모드 시드) — 2026-11-24

게이트: `python app/tools/impl_gate.py --all --refresh` (Figma 캐시를 지금 시안으로 다시 받음).
시드: `seed_app()`을 앱 **샘플 데이터 모드**로 바꿨다. 새 브라우저 저장소를 비운 뒤(localStorage·sessionStorage·IndexedDB) `jinhak-navi-seen-about`='1'만 두고 앱을 열면, 앱의 `initSample()`이 빈 저장소에 학생·교사·관리자 샘플(app/src/data/sample/*)을 넣고 `jinhak-navi-sample`='on'으로 바꾼다. 게이트는 그 'on'을 기다린 뒤 잰다. 확인한 적재량: 학생 전형 6·성적 24·출결 2·관심 6·할 일 8·수시로 보드 1, 교사 학급 1·학생 28·카드 21·모의 4·일정 4, 관리자 위키 6·계열 1. 샘플 띠(`.sample-band`)는 측정 전에 지우는 것 그대로.
(주의: 플래그를 미리 'on'으로 두면 `initSample()`이 적재를 건너뛰므로 비워 두고 앱이 켜게 했다.)

결과: **통과 6 / 실패 31 / 건너뜀 1** (38화면). 위반 합계 T 346 · S 138 · P 125. 앱 코드는 고치지 않았다.

| 화면 | 결과 | T | S | P | 이전(결과 T/S/P) | 대표 위반(앞 3개) |
|---|---|---|---|---|---|---|
| home | 통과 | 0 | 0 | 0 | 실패 0/4/2 | — |
| admissions-list | 실패 | 30 | 7 | 7 | 실패 30/7/7 | T 390: 문구 없음 '대학 이름으로 찾기' · T 390: 문구 없음 '필터' · S 390: 블록 없음 filter-chip |
| univ-detail | 실패 | 9 | 5 | 2 | 실패 9/5/3 | S 390: 블록 없음 stat-tile · S 390: 블록 없음 data-table · S 390: 블록 없음 filter-chip |
| program-detail | 실패 | 44 | 6 | 1 | 실패 44/6/2 | T 390: 문구 없음 '학생부교과(학교장추천)' · T 390: 문구 없음 '전형요소와 비율' · T 390: 문구 없음 '단계' |
| grade-input | 실패 | 1 | 0 | 7 | 건너뜀 –/–/– | P 390: 본문 왼쪽 여백(시안) 20 (기준 16±2) · P 390: segmented-control x 37 (시안 16±4) · P 390: segmented-control 폭 316 (시안 358±4) |
| five-to-nine | 실패 | 20 | 10 | 1 | 실패 20/10/2 | T 390: 문구 없음 '전 교과' · T 390: 문구 없음 '국수영사과' · T 390: 문구 없음 '국수영사' |
| univ-score | 통과 | 0 | 0 | 0 | 실패 5/0/6 | — |
| doelgak | 통과 | 0 | 0 | 0 | 실패 2/3/1 | — |
| susiro | 통과 | 0 | 0 | 0 | 건너뜀 –/–/– | — |
| saenggibu-ai | 실패 | 15 | 5 | 1 | 실패 15/5/1 | T 390: 문구 없음 '새로 분석' · T 390: 문구 없음 '내 기록을 역량별로 나눴어요' · T 390: 문구 없음 '보낸 원문' |
| mock-score | 실패 | 4 | 3 | 9 | 실패 4/3/9 | T 390: 문구 없음 '시험 바꾸기' · S 390: 블록 없음 trace-accordion · S 390: 블록 순서 다름 시안 [sub-nav > stat-tile > text-input > disclaimer-note] / 앱 [sub-nav > text-input > stat-tile > disclaimer-note] |
| teacher-dashboard | 실패 | 8 | 3 | 0 | 실패 8/3/1 | T 390: 문구 없음 '오늘 할 일' · S 390: 블록 없음 page-header · S 390: 블록 없음 filter-chip |
| counsel | 실패 | 7 | 7 | 15 | 실패 7/7/16 | T 390: 문구 없음 '학생 바꾸기' · T 390: 문구 없음 '지난 메모' · S 390: 블록 없음 page-header |
| card-collect | 실패 | 5 | 3 | 0 | 실패 5/3/1 | T 390: 문구 없음 '오늘 할 일' · S 390: 블록 없음 page-header · S 390: 블록 없음 filter-chip |
| result-summary | 실패 | 22 | 9 | 3 | 실패 22/9/4 | T 390: 문구 없음 '가채점 수합' · T 390: 문구 없음 '저장' · T 390: 문구 없음 '학생별 결과' |
| admin-rules | 실패 | 36 | 5 | 3 | 실패 36/5/3 | T 390: 문구 없음 '최근 처리' · T 390: 문구 없음 '검수 완료 규칙만 배포 버전에 들어가요 검수 전 규칙은 학생 화면에서 계산하지 않아요' · S 390: 블록 없음 stat-tile |
| student-record | 실패 | 25 | 6 | 2 | 실패 25/6/3 | T 390: 문구 없음 '내신 학기별 평균 등급' · T 390: 문구 없음 '전 교과' · T 390: 문구 없음 '국어' |
| score-import | 실패 | 10 | 7 | 6 | 실패 10/7/7 | S 390: 블록 없음 page-header · S 390: 블록 없음 stat-tile · S 390: 블록 없음 warning-callout |
| minimum-board | 실패 | 6 | 0 | 4 | 실패 6/1/5 | T 390: 문구 없음 '먼저 볼 학생' · T 390: 문구 없음 '대학 공식 모집요강이 최종 기준이에요 · '미검수'는 교사 입력 기준이라 참고로만 봐 주세요 · 시안의 대학·숫자는 예시예요' · P 390: filter-chip x 297 (시안 20±4) |
| score-trend | 건너뜀 | 0 | 0 | 0 | 실패 15/4/7 | 05-build.json 없음(최종 시안 없음) |
| admission-results | 실패 | 5 | 7 | 3 | 실패 5/7/4 | T 390: 문구 없음 '좌표' · T 390: 문구 없음 '계열 전체' · S 390: 블록 없음 filter-chip |
| login | 통과 | 0 | 0 | 0 | 통과 0/0/0 | — |
| signup | 통과 | 0 | 0 | 0 | 통과 0/0/0 | — |
| minimum-search | 실패 | 8 | 6 | 0 | 실패 8/6/1 | S 390: 블록 없음 stat-tile · S 390: 블록 없음 trace-accordion · T 1440: 문구 없음 '잠금' |
| univ-detail-wiki | 실패 | 14 | 7 | 6 | 실패 14/7/7 | S 390: 블록 없음 stat-tile · S 390: 블록 없음 data-table · S 390: 블록 없음 univ-card |
| dept-tier | 실패 | 14 | 5 | 2 | 실패 14/5/3 | T 390: 문구 없음 '사회과학 › 행정·정책 ▾' · S 390: 블록 없음 placement-board · S 390: 블록 없음 trace-accordion |
| special-tracks | 실패 | 13 | 6 | 1 | 실패 13/6/2 | T 390: 문구 없음 '교과' · T 390: 문구 없음 '종합' · T 390: 문구 없음 '세부 전체 · 가나다순 ▾' |
| admission-style | 실패 | 4 | 0 | 0 | 실패 4/0/1 | T 390: 문구 없음 '나의 준비 방식을 살펴봐요' · T 390: 문구 없음 '직접 만든 자기탐색 질문이에요 · MBTI나 표준화된 심리검사가 아니에요 · 답변만으로 지원 자격이나 입학 결과를 판단하지 않아요' · T 1440: 문구 없음 '나의 준비 방식을 살펴봐요' |
| national-placement | 실패 | 11 | 8 | 8 | 실패 11/8/9 | T 390: 문구 없음 '대학 검색 (예: 강원, 경북)' · T 390: 문구 없음 '전체 조건' · T 390: 문구 없음 '종합' |
| eligibility-check | 실패 | 0 | 2 | 7 | 실패 2/2/7 | S 390: 블록 없음 disclaimer-note · P 390: stat-tile x 41 (시안 20±4) · P 390: stat-tile 폭 130 (시안 214±4) |
| compare | 실패 | 2 | 3 | 7 | 실패 2/3/7 | T 390: 문구 없음 '지원 준비에 추가' · S 390: 블록 없음 filter-chip · S 390: 블록 없음 data-table |
| application-checklist | 실패 | 2 | 3 | 1 | 실패 2/3/1 | S 390: 블록 없음 disclaimer-note · T 1440: 문구 없음 '진행 상태' · T 1440: 문구 없음 '동작' |
| calendar | 실패 | 6 | 6 | 5 | 실패 6/6/7 | T 390: 문구 없음 '전형: 전체' · T 390: 문구 없음 '완료 포함' · T 390: 문구 없음 '날짜는 내가 저장한 기록이에요. 대학 공식 모집요강에서 최종 확인해 주세요. 날짜 미정 항목은 내보내지 않으며 자동 알림은 전송하지 않아요. 수정한 일정은 다시 내보내 주세요. · 시안의 날짜는 시험용 예시예요' |
| counsel-tasks | 실패 | 4 | 2 | 1 | 실패 4/2/1 | T 390: 문구 없음 '상담카드에 담기' · T 390: 문구 없음 '물어봤어요' · S 390: 블록 없음 filter-chip |
| admin-fields | 실패 | 11 | 0 | 6 | 실패 11/0/6 | T 390: 문구 없음 '모집단위마다 소계열·중계열을 정해요. ‘입결이 비슷한 대학’이 이 표로 같은 계열·관련 계열을 골라요.' · T 390: 문구 없음 'CSV 파일 고르기' · T 390: 문구 없음 '기록 파일 고르기' |
| admin-wiki | 실패 | 5 | 2 | 7 | 실패 5/2/7 | T 390: 문구 없음 '검수 목록' · T 390: 문구 없음 '대학 공식 발표 자료만 요약해요 · 사설 사이트 내용은 받지 않아요 · 시안의 내용은 시험용 예시예요' · S 390: 블록 없음 filter-chip |
| univ-map | 실패 | 0 | 1 | 2 | 실패 0/1/3 | P 390: region-map x 36 (시안 20±4) · P 390: region-map 폭 318 (시안 350±4) · S 1440: 블록 없음 univ-card |
| class-calendar | 실패 | 5 | 4 | 8 | 실패 5/5/9 | T 390: 문구 없음 '학생이 보낸 카드와 직접 입력한 일정 · 결과예요 · 대학 공식 발표가 최종 기준이에요 · 학생은 번호·별칭으로만 보여요 · 시안의 대학·날짜는 예시예요' · S 390: 블록 없음 text-input · S 390: 블록 순서 다름 시안 [sub-nav > segmented-control > stat-tile > filter-chip > data-table > disclaimer-note] / 앱 [sub-nav > stat-tile > filter-chip > segmented-control > data-table > disclaimer-note] |

### 재검사 읽을 때 주의
- **Figma 시안이 고치는 중**: 다른 designer 에이전트가 시안(PC 머리 간격 48, 모바일 머리 A)을 고치는 중에 `--refresh`로 받았다. 그래서 일부 화면은 중간 상태가 섞였다 — 예) `P 1440: page-header 글자→첫 블록 간격(시안) 48 (기준 24±2)`가 10화면(admissions-list·saenggibu-ai·mock-score·admin-rules·eligibility-check·compare·application-checklist·counsel-tasks·admin-fields·admin-wiki)에 새로 생겼다. 앱은 48인데 해당 시안 프레임이 아직 24인 상태로 보인다. 시안 작업이 끝나면 다시 돌려야 한다.
- 전보다 줄어든 위반 68건·새로 생긴 위반 12건(이전 전수조사 대비). 줄어든 것 대부분은 이 시드 변경만의 효과가 아니다: 샘플 띠 제외로 `page-header 글자→첫 블록 간격(시안) 109~110` 32건이 사라졌고, home·univ-score·doelgak·susiro는 그 사이 v2 재구현으로 통과.
- 시드 변경으로 사라진 오탐: eligibility-check `T 문구 없음 '사회 진로선택 이수 과목 수'`(390·1440) — 샘플 성적이 들어와 문구가 나온다. susiro는 이제 샘플 전형 6개로 판정·조합 점검이 채워진 상태로 검사된다(예전 시드는 샘플 전형을 지우고 학생부종합 3개만 넣어 판정이 없었다).
- **susiro allow**: `'소신·위험 쪽으로 쏠렸어요'` 항목은 남겼다. 샘플 A안 판정이 안정 2·적정 2·소신 1·경계 1이라 쏠림 경고(R-CARD-003) 조건이 아니고, 앱은 면접 일정 겹침 경고만 낸다. 사유를 이 내용으로 고쳐 적었다.
- grade-input은 05-build.json이 생겨 처음 검사됐고(실패 8), score-trend는 지금 05-build.json이 없어 건너뜀.

## 이전 결과 (데모 데이터 직접 시드, 보존)

게이트: `python app/tools/impl_gate.py --all` (Figma 05-build 기본 프레임 390·1440 ↔ 앱 빌드 스냅샷 렌더, 데모 데이터 시드).
결과: **통과 2 / 실패 34 / 건너뜀 2** (38화면). 이번 단계에서는 앱 코드를 고치지 않았다(보고만).
화면별 원본: `work/<slug>/07-impl.json`. `impl-allow.json` 예외는 하나도 만들지 않았다.

열: T = 문구 없음, S = 블록 없음/순서 다름, P = 간격(셸 ±2 · 블록 x/폭 ±4).

| 화면 | 결과 | T | S | P | 주요 위반(앞부분) |
|---|---|---|---|---|---|
| home | 실패 | 0 | 4 | 2 | S 390: 블록 없음 page-header · S 390: 블록 없음 stat-tile · P 1440: page-header 위 여백 37 (기준 32±2) |
| admissions-list | 실패 | 30 | 7 | 7 | S 390: 블록 없음 filter-chip · S 390: 블록 없음 disclaimer-note · P 390: text-input x 37 (시안 20±4) · T 390: 문구 없음 '대학 이름으로 찾기' · T 390: 문구 없음 '필터' |
| univ-detail | 실패 | 9 | 5 | 3 | S 390: 블록 없음 stat-tile · S 390: 블록 없음 data-table · P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2) · T 1440: 문구 없음 '대학 찾기 › 전형계획' · T 1440: 문구 없음 '홈페이지 ↗' |
| program-detail | 실패 | 44 | 6 | 2 | S 390: 블록 없음 stat-tile · S 390: 블록 없음 data-table · P 390: 본문 왼쪽 여백(시안) 45 (기준 20±2) · T 390: 문구 없음 '학생부교과(학교장추천)' · T 390: 문구 없음 '전형요소와 비율' |
| grade-input | 건너뜀 | – | – | – | 05-build.json 없음(최종 시안 없음) |
| five-to-nine | 실패 | 20 | 10 | 2 | S 390: 블록 없음 stat-tile · S 390: 블록 없음 range-bar-5to9 · P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2) · T 390: 문구 없음 '전 교과' · T 390: 문구 없음 '국수영사과' |
| univ-score | 실패 | 5 | 0 | 6 | P 390: 본문 왼쪽 여백(시안) 20 (기준 16±2) · T 390: 문구 없음 '환산 기준 순위 ▾' · T 1440: 문구 없음 '같은 성적도 대학마다 반영 방식이 달라서 점수가 달라져요' |
| susiro | 건너뜀 | – | – | – | 05-build.json 없음(최종 시안 없음) |
| saenggibu-ai | 실패 | 15 | 5 | 1 | S 390: 블록 없음 competency-card · S 390: 블록 없음 disclaimer-note · P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2) · T 390: 문구 없음 '새로 분석' · T 390: 문구 없음 '내 기록을 역량별로 나눴어요' |
| mock-score | 실패 | 4 | 3 | 9 | S 390: 블록 없음 trace-accordion · S 390: 블록 순서 다름 시안 [sub-nav > stat-tile > text-input > disclaimer-note] / 앱 [sub-nav > text-input > stat-tile > disclaimer-note] · P 390: stat-tile 폭 169 (시안 350±4) · T 390: 문구 없음 '시험 바꾸기' · T 1440: 문구 없음 '원점수를 넣으면 등급컷으로 등급을 추정하고, 수능 최저 충족 현황을 보여 줘요.' |
| teacher-dashboard | 실패 | 8 | 3 | 1 | S 390: 블록 없음 page-header · S 390: 블록 없음 filter-chip · P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2) · T 390: 문구 없음 '오늘 할 일' · T 1440: 문구 없음 '백업' |
| counsel | 실패 | 7 | 7 | 16 | S 390: 블록 없음 page-header · S 390: 블록 없음 stat-tile · P 390: segmented-control x 20 (시안 40±4) · T 390: 문구 없음 '학생 바꾸기' · T 390: 문구 없음 '지난 메모' |
| card-collect | 실패 | 5 | 3 | 1 | S 390: 블록 없음 page-header · S 390: 블록 없음 filter-chip · P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2) · T 390: 문구 없음 '오늘 할 일' · T 1440: 문구 없음 '백업' |
| result-summary | 실패 | 22 | 9 | 4 | S 390: 블록 없음 page-header · S 390: 블록 없음 stat-tile · P 390: 본문 왼쪽 여백(시안) 36 (기준 20±2) · T 390: 문구 없음 '가채점 수합' · T 390: 문구 없음 '저장' |
| admin-rules | 실패 | 36 | 5 | 3 | S 390: 블록 없음 stat-tile · S 1440: 블록 없음 filter-chip · P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2) · T 390: 문구 없음 '최근 처리' · T 390: 문구 없음 '검수 완료 규칙만 배포 버전에 들어가요 검수 전 규칙은 학생 화면에서 계산하지 않아요' |
| student-record | 실패 | 25 | 6 | 3 | S 390: 블록 없음 filter-chip · S 390: 블록 없음 grade-trend-chart · P 390: stat-tile 폭 169 (시안 350±4) · T 390: 문구 없음 '내신 학기별 평균 등급' · T 390: 문구 없음 '전 교과' |
| score-import | 실패 | 10 | 7 | 7 | S 390: 블록 없음 page-header · S 390: 블록 없음 stat-tile · P 390: segmented-control x 37 (시안 20±4) · T 1440: 문구 없음 '백업' · T 1440: 문구 없음 '로그아웃' |
| minimum-board | 실패 | 6 | 1 | 5 | S 390: 블록 없음 page-header · P 390: filter-chip x 297 (시안 20±4) · T 390: 문구 없음 '먼저 볼 학생' · T 390: 문구 없음 '대학 공식 모집요강이 최종 기준이에요 · '미검수'는 교사 입력 기준이라 참고로만 봐 주세요 · 시안의 대학·숫자는 예시예요' |
| score-trend | 실패 | 15 | 4 | 7 | S 390: 블록 없음 stat-tile · S 390: 블록 없음 segmented-control · P 390: grade-trend-chart 폭 316 (시안 310±4) · T 390: 문구 없음 '전 교과' · T 390: 문구 없음 '국어' |
| admission-results | 실패 | 5 | 7 | 4 | S 390: 블록 없음 filter-chip · S 390: 블록 없음 cut-dot-plot · P 390: 본문 왼쪽 여백(시안) 20 (기준 16±2) · T 390: 문구 없음 '좌표' · T 390: 문구 없음 '계열 전체' |
| login | 통과 | 0 | 0 | 0 | — |
| signup | 통과 | 0 | 0 | 0 | — |
| minimum-search | 실패 | 8 | 6 | 1 | S 390: 블록 없음 stat-tile · S 390: 블록 없음 trace-accordion · P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2) · T 1440: 문구 없음 '잠금' · T 1440: 문구 없음 '대학·학과 검색' |
| univ-detail-wiki | 실패 | 14 | 7 | 7 | S 390: 블록 없음 stat-tile · S 390: 블록 없음 data-table · P 390: segmented-control x 20 (시안 40±4) · T 1440: 문구 없음 '대학 찾기 › 전형계획' · T 1440: 문구 없음 '홈페이지 ↗' |
| dept-tier | 실패 | 14 | 5 | 3 | S 390: 블록 없음 placement-board · S 390: 블록 없음 trace-accordion · P 390: segmented-control 폭 171 (시안 350±4) · T 390: 문구 없음 '사회과학 › 행정·정책 ▾' · T 1440: 문구 없음 '어문' |
| special-tracks | 실패 | 13 | 6 | 2 | S 390: 블록 없음 segmented-control · S 390: 블록 없음 univ-card · P 1440: page-header 글자→첫 블록 간격(시안) 109 (기준 48±2) · T 390: 문구 없음 '교과' · T 390: 문구 없음 '종합' |
| admission-style | 실패 | 4 | 0 | 1 | P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2) · T 390: 문구 없음 '나의 준비 방식을 살펴봐요' · T 390: 문구 없음 '직접 만든 자기탐색 질문이에요 · MBTI나 표준화된 심리검사가 아니에요 · 답변만으로 지원 자격이나 입학 결과를 판단하지 않아요' |
| national-placement | 실패 | 11 | 8 | 9 | S 390: 블록 없음 filter-chip · S 390: 블록 없음 cut-dot-plot · P 390: text-input x 37 (시안 20±4) · T 390: 문구 없음 '대학 검색 (예: 강원, 경북)' · T 390: 문구 없음 '전체 조건' |
| eligibility-check | 실패 | 2 | 2 | 7 | S 390: 블록 없음 disclaimer-note · S 1440: 블록 없음 disclaimer-note · P 390: stat-tile x 41 (시안 20±4) · T 390: 문구 없음 '사회 진로선택 이수 과목 수' · T 1440: 문구 없음 '사회 진로선택 이수 과목 수' |
| compare | 실패 | 2 | 3 | 7 | S 390: 블록 없음 filter-chip · S 390: 블록 없음 data-table · P 390: segmented-control 폭 242 (시안 222±4) · T 390: 문구 없음 '지원 준비에 추가' · T 1440: 문구 없음 '지원 준비에 추가' |
| application-checklist | 실패 | 2 | 3 | 1 | S 390: 블록 없음 disclaimer-note · S 1440: 블록 없음 data-table · P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2) · T 1440: 문구 없음 '진행 상태' · T 1440: 문구 없음 '동작' |
| calendar | 실패 | 6 | 6 | 7 | S 390: 블록 없음 stat-tile · S 390: 블록 없음 filter-chip · P 390: segmented-control x 20 (시안 230±4) · T 390: 문구 없음 '전형: 전체' · T 390: 문구 없음 '완료 포함' |
| counsel-tasks | 실패 | 4 | 2 | 1 | S 390: 블록 없음 filter-chip · S 1440: 블록 없음 filter-chip · P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2) · T 390: 문구 없음 '상담카드에 담기' · T 390: 문구 없음 '물어봤어요' |
| admin-fields | 실패 | 11 | 0 | 6 | P 390: text-input 폭 316 (시안 310±4) · T 390: 문구 없음 '모집단위마다 소계열·중계열을 정해요. ‘입결이 비슷한 대학’이 이 표로 같은 계열·관련 계열을 골라요.' · T 390: 문구 없음 'CSV 파일 고르기' |
| admin-wiki | 실패 | 5 | 2 | 7 | S 390: 블록 없음 filter-chip · S 390: 블록 없음 univ-card · P 390: text-input 폭 316 (시안 310±4) · T 390: 문구 없음 '검수 목록' · T 390: 문구 없음 '대학 공식 발표 자료만 요약해요 · 사설 사이트 내용은 받지 않아요 · 시안의 내용은 시험용 예시예요' |
| univ-map | 실패 | 0 | 1 | 3 | S 1440: 블록 없음 univ-card · P 390: region-map x 36 (시안 20±4) |
| class-calendar | 실패 | 5 | 5 | 9 | S 390: 블록 없음 page-header · S 390: 블록 없음 text-input · P 390: segmented-control 폭 350 (시안 140±4) · T 390: 문구 없음 '학생이 보낸 카드와 직접 입력한 일정 · 결과예요 · 대학 공식 발표가 최종 기준이에요 · 학생은 번호·별칭으로만 보여요 · 시안의 대학·날짜는 예시예요' · T 1440: 문구 없음 '백업' |
| doelgak | 실패 (재구현 중) | 2 | 3 | 1 | S 390: 블록 없음 filter-chip · S 390: 블록 없음 univ-card · P 1440: page-header 글자→첫 블록 간격(시안) 109 (기준 48±2) · T 390: 문구 없음 '강원' · T 390: 문구 없음 '서울' |

## 읽을 때 주의

- **doelgak**: 다른 에이전트가 시안대로 재구현 중. 전수조사 맨 끝에 돌렸고, 재구현 전후 코드가 섞인 빌드일 수 있다.
- **susiro · grade-input**: 지금 05-build.json이 없어(시안 재작업 중) 검사하지 않았다.
- **univ-detail · program-detail · univ-detail-wiki**: 공개 입결(`app/public/data/released-results.json`)이 0건이라 앱이 "찾지 못했어요" 빈 상태를 그린다. 공개 데이터는 바꾸지 않았다(NEVER-1). 위반은 그대로 남겼다 — 실제 사용자도 이 화면을 본다.
- 동시에 다른 세션이 app/src를 고치는 중이라, 같은 화면도 실행 시점마다 개수가 달라질 수 있다(빌드 스냅샷 기준 한 번의 결과).
- 시안 쪽 불일치도 섞여 있다: 예) PC page-header 글자→첫 블록 거리가 시안마다 24 또는 48로 다르다(design.md는 "아래 24"만 정함). 게이트는 셸 아래 여백 24는 design.md로, 첫 블록까지 거리는 그 화면 시안 실측으로 본다.
- **샘플 데이터 모드 배너**: 이번 실행 빌드에 다른 세션이 만든 "샘플 데이터로 보는 중이에요 · 샘플 데이터 지우기" 띠가 page-header와 본문 사이(PC)에 들어왔다. 시안에 없는 띠라서 PC "page-header 글자→첫 블록 간격"이 약 110(시안 24/48)으로 33건 잡혔다. 배너 자리가 design.md에 정해지면 게이트 기준을 맞춰야 한다. 게이트 시드는 `seed_app()` 한 함수에 모아 두었고, 샘플 모드가 안정되면 그 몸통만 샘플 모드를 켜는 코드로 바꾸면 된다(지금은 앱 저장소에 demo-dataset 값을 직접 넣음).
- 모바일 본문 왼쪽 여백: design.md 토큰(card 20 = 모바일 좌우 여백)과 Grid 표(16)가 서로 달라서 시안 실측값을 기준으로 본다.

## 오탐으로 판단해 게이트 규칙을 고친 것 (allow 아님)

| 증상 | 원인 | 고친 규칙 |
|---|---|---|
| 학생 화면에 '백업'·'수시 전략'·'대학 찾기' 없음 대량 | 교사 화면을 한 번 열면 sessionStorage 때문에 학생 화면도 교사 셸로 남음(workspace.ts) | 화면마다 측정 전에 sessionStorage 비움 |
| 긴 실행 뒤 화면 대부분 문구 없음 | 측정 중 다른 세션의 src 수정으로 dev 서버가 다시 읽힘 | dev 서버 대신 빌드 스냅샷(work/_cache/impl-dist) + vite preview |
| 문구가 우연히 맞음(사이드바 '대학 찾기'+'전형계획' → '대학 찾기 › 전형계획') | 앱 글자를 한 줄로 이어 붙여 비교 | 앱 글자 한 줄 안에 시안 문구가 들어 있어야 통과 |
| 모바일 page-header 없음 | 앱 모바일 제목 줄은 `.screen-heading` | page-header 표식에 `.screen-heading` 추가 |
| 로그인·회원가입 사이드바 폭 없음 | 셸 밖 화면 | 시안에 사이드바가 있을 때만 검사 |
| PC 본문 왼쪽 여백 16 | 일부 시안 사이드바가 인스턴스가 아닌 프레임 | 사이드바 있는 PC 프레임은 x<248 글자 제외 |
| 체크리스트 항목·상담 질문 제목 없음 | 시드가 데모와 달랐음 | demo-dataset 전형 A 체크 항목 8개 · 상담 항목 T1~T8로 시드 |
| '관리자 B' 등 | 데모 계정 이름 = 데이터 | 데이터 글자 규칙에 `관리자 [A-Z]` 추가 |
| 전형 성향 탐색 고지 블록 없음 | 앱 클래스 `.style-disclaimer` | disclaimer-note 표식에 추가 |

## 화면별 전체 위반

### home — `/home` — 실패

- S 390: 블록 없음 page-header
- S 390: 블록 없음 stat-tile
- S 1440: 블록 없음 stat-tile
- S 1440: 블록 없음 univ-card
- P 1440: page-header 위 여백 37 (기준 32±2)
- P 1440: page-header 글자→첫 블록 간격(시안) 109 (기준 48±2)

### admissions-list — `/admissions-list` — 실패

- T 390: 문구 없음 '대학 이름으로 찾기'
- T 390: 문구 없음 '필터'
- S 390: 블록 없음 filter-chip
- S 390: 블록 없음 disclaimer-note
- S 390: 블록 없음 data-table
- P 390: text-input x 37 (시안 20±4)
- P 390: text-input 폭 316 (시안 350±4)
- P 390: univ-card x 37 (시안 20±4)
- P 390: univ-card 폭 316 (시안 350±4)
- T 1440: 문구 없음 '대학 이름으로 찾기'
- T 1440: 문구 없음 '수도권'
- T 1440: 문구 없음 '충청권'
- T 1440: 문구 없음 '영남권'
- T 1440: 문구 없음 '호남권'
- T 1440: 문구 없음 '국립'
- T 1440: 문구 없음 '공립'
- T 1440: 문구 없음 '사립'
- T 1440: 문구 없음 '그 밖'
- T 1440: 문구 없음 '본캠퍼스'
- T 1440: 문구 없음 '분캠퍼스'
- T 1440: 문구 없음 '인문'
- T 1440: 문구 없음 '사회'
- T 1440: 문구 없음 '자연'
- T 1440: 문구 없음 '공학'
- T 1440: 문구 없음 '의약'
- T 1440: 문구 없음 '예체능'
- T 1440: 문구 없음 '수능최저 있음'
- T 1440: 문구 없음 '수능최저 없음'
- T 1440: 문구 없음 '면접 있음'
- T 1440: 문구 없음 '재학생만'
- T 1440: 문구 없음 '가나다순'
- T 1440: 문구 없음 '전형명'
- T 1440: 문구 없음 '유형'
- T 1440: 문구 없음 '모집단위'
- T 1440: 문구 없음 '수능최저'
- T 1440: 문구 없음 '면접'
- T 1440: 문구 없음 '관심'
- S 1440: 블록 없음 filter-chip
- S 1440: 블록 없음 segmented-control
- S 1440: 블록 없음 disclaimer-note
- S 1440: 블록 없음 data-table
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2)
- P 1440: text-input x 297 (시안 280±4)
- P 1440: text-input 폭 539 (시안 400±4)

### univ-detail — `/univ-detail?u=경희대학교` — 실패

- S 390: 블록 없음 stat-tile
- S 390: 블록 없음 data-table
- S 390: 블록 없음 filter-chip
- T 1440: 문구 없음 '대학 찾기 › 전형계획'
- T 1440: 문구 없음 '홈페이지 ↗'
- T 1440: 문구 없음 '항목'
- T 1440: 문구 없음 '전형명'
- T 1440: 문구 없음 '세부 유형'
- T 1440: 문구 없음 '모집인원'
- T 1440: 문구 없음 '학교장 추천'
- T 1440: 문구 없음 '이 전형에서 바뀐 점'
- T 1440: 문구 없음 '전형 상세 보기'
- S 1440: 블록 없음 stat-tile
- S 1440: 블록 없음 data-table
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: segmented-control x 280 (시안 304±4)
- P 1440: segmented-control 폭 1128 (시안 480±4)

### program-detail — `/program-detail?u=경희대학교&p=학생부종합` — 실패

- T 390: 문구 없음 '학생부교과(학교장추천)'
- T 390: 문구 없음 '전형요소와 비율'
- T 390: 문구 없음 '단계'
- T 390: 문구 없음 '선발'
- T 390: 문구 없음 '교과'
- T 390: 문구 없음 '면접'
- T 390: 문구 없음 '지원자격'
- T 390: 문구 없음 '대상'
- T 390: 문구 없음 '학교장 추천'
- T 390: 문구 없음 '수능최저학력기준'
- T 390: 문구 없음 '반영 영역'
- T 390: 문구 없음 '조건'
- T 390: 문구 없음 '한국사'
- T 390: 문구 없음 '일정'
- T 390: 문구 없음 '원서 접수'
- T 390: 문구 없음 '최종 발표'
- T 390: 문구 없음 '교과 반영 방법'
- T 390: 문구 없음 '반영 교과'
- T 390: 문구 없음 '등급·성취도'
- T 390: 문구 없음 '출결'
- T 390: 문구 없음 '반영 학기'
- T 390: 문구 없음 '원문 보기 ↗'
- S 390: 블록 없음 stat-tile
- S 390: 블록 없음 data-table
- S 390: 블록 없음 disclaimer-note
- P 390: 본문 왼쪽 여백(시안) 45 (기준 20±2)
- T 1440: 문구 없음 '대학 찾기 › 전형계획'
- T 1440: 문구 없음 '학생부교과(학교장추천)'
- T 1440: 문구 없음 '원문 보기 ↗'
- T 1440: 문구 없음 '전형요소와 비율'
- T 1440: 문구 없음 '단계'
- T 1440: 문구 없음 '선발'
- T 1440: 문구 없음 '교과'
- T 1440: 문구 없음 '면접'
- T 1440: 문구 없음 '대상'
- T 1440: 문구 없음 '학교장 추천'
- T 1440: 문구 없음 '교과 반영 방법'
- T 1440: 문구 없음 '반영 교과'
- T 1440: 문구 없음 '등급·성취도'
- T 1440: 문구 없음 '출결'
- T 1440: 문구 없음 '반영 학기'
- T 1440: 문구 없음 '일정'
- T 1440: 문구 없음 '원서 접수'
- T 1440: 문구 없음 '최종 발표'
- T 1440: 문구 없음 '수능최저학력기준'
- T 1440: 문구 없음 '반영 영역'
- T 1440: 문구 없음 '조건'
- T 1440: 문구 없음 '한국사'
- S 1440: 블록 없음 stat-tile
- S 1440: 블록 없음 data-table
- S 1440: 블록 없음 disclaimer-note
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)

### five-to-nine — `/five-to-nine` — 실패

- T 390: 문구 없음 '전 교과'
- T 390: 문구 없음 '국수영사과'
- T 390: 문구 없음 '국수영사'
- T 390: 문구 없음 '국수영과'
- T 390: 문구 없음 '방법별 환산값'
- T 390: 문구 없음 '신뢰도 보통인 이유'
- T 390: 문구 없음 '석차등급 산출 과목'
- T 390: 문구 없음 '소수 수강 과목'
- T 390: 문구 없음 '방법 간 차이'
- S 390: 블록 없음 stat-tile
- S 390: 블록 없음 range-bar-5to9
- S 390: 블록 없음 data-table
- S 390: 블록 없음 trace-accordion
- S 390: 블록 없음 disclaimer-note
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '전 교과'
- T 1440: 문구 없음 '국수영사과'
- T 1440: 문구 없음 '국수영사'
- T 1440: 문구 없음 '국수영과'
- T 1440: 문구 없음 '방법 비교'
- T 1440: 문구 없음 'B 교육청 실측표'
- T 1440: 문구 없음 '신뢰도 보통인 이유'
- T 1440: 문구 없음 '석차등급 산출 과목'
- T 1440: 문구 없음 '소수 수강 과목'
- T 1440: 문구 없음 '방법 간 차이'
- S 1440: 블록 없음 stat-tile
- S 1440: 블록 없음 range-bar-5to9
- S 1440: 블록 없음 data-table
- S 1440: 블록 없음 trace-accordion
- S 1440: 블록 없음 disclaimer-note
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: segmented-control 폭 1128 (시안 280±4)

### univ-score — `/univ-score` — 실패

- T 390: 문구 없음 '환산 기준 순위 ▾'
- P 390: 본문 왼쪽 여백(시안) 20 (기준 16±2)
- P 390: disclaimer-note 폭 350 (시안 358±4)
- T 1440: 문구 없음 '같은 성적도 대학마다 반영 방식이 달라서 점수가 달라져요'
- T 1440: 문구 없음 '합계 ▼'
- T 1440: 문구 없음 '순위 차이'
- T 1440: 문구 없음 '원문 보기'
- P 1440: data-table 폭 736 (시안 768±4)
- P 1440: disclaimer-note 폭 736 (시안 768±4)
- P 1440: trace-accordion x 1073 (시안 1104±4)
- P 1440: trace-accordion 폭 335 (시안 312±4)

### saenggibu-ai — `/saenggibu-ai` — 실패

- T 390: 문구 없음 '새로 분석'
- T 390: 문구 없음 '내 기록을 역량별로 나눴어요'
- T 390: 문구 없음 '보낸 원문'
- T 390: 문구 없음 '원문에서 보기'
- T 390: 문구 없음 '남은 학기에 해볼 수 있는 것'
- T 390: 문구 없음 'AI 진단은 참고용이며 실제 평가와 다를 수 있어요 · 문장 수는 평가 점수가 아니에요 · 생기부 내용을 바꾸라는 지시가 아니에요 · 결과는 이 기기에만 저장돼요'
- T 390: 문구 없음 '다른 학과로 다시 분석하기'
- S 390: 블록 없음 competency-card
- S 390: 블록 없음 disclaimer-note
- T 1440: 문구 없음 '내 기록을 역량별로 나눴어요'
- T 1440: 문구 없음 '희망 전공 정책·행정 기준으로 나눴어요.'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '원문 색칠'
- T 1440: 문구 없음 '보완점'
- T 1440: 문구 없음 '보낸 원문'
- T 1440: 문구 없음 '평가 항목'
- T 1440: 문구 없음 'AI 진단은 참고용이며 실제 평가와 다를 수 있어요 · 문장 수는 평가 점수가 아니에요 · 생기부 내용을 바꾸라는 지시가 아니에요 · 결과는 이 기기에만 저장돼요'
- S 1440: 블록 없음 segmented-control
- S 1440: 블록 없음 competency-card
- S 1440: 블록 없음 disclaimer-note
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2)

### mock-score — `/mock-score` — 실패

- T 390: 문구 없음 '시험 바꾸기'
- S 390: 블록 없음 trace-accordion
- S 390: 블록 순서 다름 시안 [sub-nav > stat-tile > text-input > disclaimer-note] / 앱 [sub-nav > text-input > stat-tile > disclaimer-note]
- P 390: stat-tile 폭 169 (시안 350±4)
- P 390: text-input x 50 (시안 140±4)
- P 390: text-input 폭 191 (시안 104±4)
- P 390: disclaimer-note x 20 (시안 40±4)
- P 390: disclaimer-note 폭 350 (시안 310±4)
- T 1440: 문구 없음 '원점수를 넣으면 등급컷으로 등급을 추정하고, 수능 최저 충족 현황을 보여 줘요.'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '시험 바꾸기'
- S 1440: 블록 없음 trace-accordion
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2)
- P 1440: stat-tile 폭 229 (시안 744±4)
- P 1440: disclaimer-note x 280 (시안 304±4)
- P 1440: disclaimer-note 폭 736 (시안 696±4)

### teacher-dashboard — `/teacher/teacher-dashboard` — 실패

- T 390: 문구 없음 '오늘 할 일'
- S 390: 블록 없음 page-header
- S 390: 블록 없음 filter-chip
- T 1440: 문구 없음 '백업'
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '오늘 할 일'
- T 1440: 문구 없음 '성적 불러오기'
- T 1440: 문구 없음 '엑셀 내보내기'
- T 1440: 문구 없음 '관심 대학'
- S 1440: 블록 없음 filter-chip
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- (참고) 390: 앱 표식 없는 블록(구조 미검사) student-row-card

### counsel — `/teacher/counsel` — 실패

- T 390: 문구 없음 '학생 바꾸기'
- T 390: 문구 없음 '지난 메모'
- S 390: 블록 없음 page-header
- S 390: 블록 없음 stat-tile
- S 390: 블록 없음 trace-accordion
- S 390: 블록 순서 다름 시안 [sub-nav > segmented-control > text-input > counsel-timeline > disclaimer-note] / 앱 [sub-nav > text-input > segmented-control > counsel-timeline > disclaimer-note]
- P 390: segmented-control x 20 (시안 40±4)
- P 390: segmented-control 폭 350 (시안 310±4)
- P 390: text-input x 20 (시안 40±4)
- P 390: text-input 폭 350 (시안 310±4)
- P 390: counsel-timeline x 20 (시안 40±4)
- P 390: counsel-timeline 폭 350 (시안 310±4)
- T 1440: 문구 없음 '백업'
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '지난 메모'
- T 1440: 문구 없음 '대학 · 학과'
- S 1440: 블록 없음 filter-chip
- S 1440: 블록 없음 stat-tile
- S 1440: 블록 없음 trace-accordion
- P 1440: page-header 글자→첫 블록 간격(시안) 109 (기준 48±2)
- P 1440: text-input x 280 (시안 300±4)
- P 1440: text-input 폭 224 (시안 232±4)
- P 1440: segmented-control x 280 (시안 588±4)
- P 1440: segmented-control 폭 224 (시안 448±4)
- P 1440: counsel-timeline x 528 (시안 588±4)
- P 1440: counsel-timeline 폭 568 (시안 448±4)
- P 1440: data-table x 1145 (시안 1092±4)
- P 1440: data-table 폭 263 (시안 296±4)
- P 1440: disclaimer-note x 1145 (시안 280±4)
- (참고) 1440: 앱 표식 없는 블록(구조 미검사) student-row-card

### card-collect — `/teacher/card-collect` — 실패

- T 390: 문구 없음 '오늘 할 일'
- S 390: 블록 없음 page-header
- S 390: 블록 없음 filter-chip
- T 1440: 문구 없음 '백업'
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '오늘 할 일'
- S 1440: 블록 없음 filter-chip
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- (참고) 390: 앱 표식 없는 블록(구조 미검사) student-row-card

### result-summary — `/teacher/result-summary` — 실패

- T 390: 문구 없음 '가채점 수합'
- T 390: 문구 없음 '저장'
- T 390: 문구 없음 '학생별 결과'
- T 390: 문구 없음 '학생이 보낸 카드와 직접 입력한 결과를 모았어요 · 대학 공식 발표가 최종 기준이에요 · 시안의 대학·숫자는 예시예요'
- S 390: 블록 없음 page-header
- S 390: 블록 없음 stat-tile
- S 390: 블록 없음 filter-chip
- S 390: 블록 없음 disclaimer-note
- P 390: 본문 왼쪽 여백(시안) 36 (기준 20±2)
- P 390: segmented-control 폭 201 (시안 350±4)
- T 1440: 문구 없음 '백업'
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '가채점 수합'
- T 1440: 문구 없음 '대학별'
- T 1440: 문구 없음 '저장'
- T 1440: 문구 없음 '학생·대학 검색'
- T 1440: 문구 없음 '교과'
- T 1440: 문구 없음 '종합'
- T 1440: 문구 없음 '논술·기타'
- T 1440: 문구 없음 '전형 유형'
- T 1440: 문구 없음 '대학 · 전형'
- T 1440: 문구 없음 '합격'
- T 1440: 문구 없음 '충원 합격'
- T 1440: 문구 없음 '불합격'
- T 1440: 문구 없음 '미등록'
- T 1440: 문구 없음 '미입력'
- T 1440: 문구 없음 '학생이 보낸 카드와 직접 입력한 결과를 모았어요 · 대학 공식 발표가 최종 기준이에요 · 시안의 대학·숫자는 예시예요'
- S 1440: 블록 없음 stat-tile
- S 1440: 블록 없음 text-input
- S 1440: 블록 없음 filter-chip
- S 1440: 블록 없음 data-table
- S 1440: 블록 없음 disclaimer-note
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: segmented-control 폭 201 (시안 280±4)
- (참고) 390: 앱 표식 없는 블록(구조 미검사) student-row-card

### admin-rules — `/admin/admin-rules` — 실패

- T 390: 문구 없음 '최근 처리'
- T 390: 문구 없음 '검수 완료 규칙만 배포 버전에 들어가요 검수 전 규칙은 학생 화면에서 계산하지 않아요'
- S 390: 블록 없음 stat-tile
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '환산 규칙 편집'
- T 1440: 문구 없음 '규칙 요소'
- T 1440: 문구 없음 '반영 학년·학기'
- T 1440: 문구 없음 '반영 교과·과목 선택'
- T 1440: 문구 없음 '국어'
- T 1440: 문구 없음 '수학'
- T 1440: 문구 없음 '영어'
- T 1440: 문구 없음 '사회'
- T 1440: 문구 없음 '과학'
- T 1440: 문구 없음 '한국사'
- T 1440: 문구 없음 '전 과목'
- T 1440: 문구 없음 '교과군별 상위 N'
- T 1440: 문구 없음 '전체 상위 N'
- T 1440: 문구 없음 '아니오'
- T 1440: 문구 없음 '일반 과목과 같이'
- T 1440: 문구 없음 '제외'
- T 1440: 문구 없음 '등급·성취도 점수표'
- T 1440: 문구 없음 '안 함'
- T 1440: 문구 없음 '비율 반영'
- T 1440: 문구 없음 '높은 쪽'
- T 1440: 문구 없음 '성취도 환산'
- T 1440: 문구 없음 '가산'
- T 1440: 문구 없음 '출결 감점표'
- T 1440: 문구 없음 '만점·반올림'
- T 1440: 문구 없음 '반올림'
- T 1440: 문구 없음 '버림'
- T 1440: 문구 없음 '올림'
- T 1440: 문구 없음 '임시 저장'
- T 1440: 문구 없음 '검수 요청'
- T 1440: 문구 없음 '버전 기록'
- T 1440: 문구 없음 '테스트 실행'
- T 1440: 문구 없음 '테스트 케이스 추가'
- T 1440: 문구 없음 '기대값은 대학 공식 계산기·모집요강 예시로 확인한 값이에요 · 대학 공식 자료가 최종 기준이에요'
- S 1440: 블록 없음 filter-chip
- S 1440: 블록 없음 text-input
- S 1440: 블록 없음 segmented-control
- S 1440: 블록 없음 trace-accordion
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2)
- P 1440: disclaimer-note x 280 (시안 1088±4)
- P 1440: disclaimer-note 폭 1128 (시안 296±4)

### student-record — `/teacher/student-record` — 실패

- T 390: 문구 없음 '내신 학기별 평균 등급'
- T 390: 문구 없음 '전 교과'
- T 390: 문구 없음 '국어'
- T 390: 문구 없음 '수학'
- T 390: 문구 없음 '영어'
- T 390: 문구 없음 '사회'
- T 390: 문구 없음 '과학'
- T 390: 문구 없음 '과목'
- T 390: 문구 없음 '모의고사 회차별 영역 등급'
- T 390: 문구 없음 '전체'
- T 390: 문구 없음 '영역'
- S 390: 블록 없음 filter-chip
- S 390: 블록 없음 grade-trend-chart
- S 390: 블록 없음 data-table
- P 390: stat-tile 폭 169 (시안 350±4)
- T 1440: 문구 없음 '백업'
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '내신 학기별 평균 등급'
- T 1440: 문구 없음 '전 교과'
- T 1440: 문구 없음 '국어'
- T 1440: 문구 없음 '수학'
- T 1440: 문구 없음 '영어'
- T 1440: 문구 없음 '사회'
- T 1440: 문구 없음 '과학'
- T 1440: 문구 없음 '과목'
- T 1440: 문구 없음 '모의고사 회차별 영역 등급'
- T 1440: 문구 없음 '전체'
- T 1440: 문구 없음 '영역'
- S 1440: 블록 없음 filter-chip
- S 1440: 블록 없음 grade-trend-chart
- S 1440: 블록 없음 data-table
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: stat-tile 폭 264 (시안 320±4)

### score-import — `/teacher/score-import` — 실패

- S 390: 블록 없음 page-header
- S 390: 블록 없음 stat-tile
- S 390: 블록 없음 warning-callout
- P 390: segmented-control x 37 (시안 20±4)
- P 390: segmented-control 폭 316 (시안 354±4)
- T 1440: 문구 없음 '백업'
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '등급만'
- T 1440: 문구 없음 '원점수·백분위 함께'
- T 1440: 문구 없음 '다른 파일 올리기'
- T 1440: 문구 없음 '상태'
- T 1440: 문구 없음 '사유'
- T 1440: 문구 없음 '열 맞추기로 돌아가기'
- T 1440: 문구 없음 '오류 행만 내려받기'
- S 1440: 블록 없음 stat-tile
- S 1440: 블록 없음 warning-callout
- S 1440: 블록 없음 data-table
- S 1440: 블록 순서 다름 시안 [page-header > text-input > segmented-control] / 앱 [page-header > segmented-control > text-input]
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: text-input x 297 (시안 334±4)
- P 1440: text-input 폭 539 (시안 88±4)
- P 1440: segmented-control x 297 (시안 554±4)
- P 1440: segmented-control 폭 1094 (시안 232±4)
- (참고) 390: 앱 표식 없는 블록(구조 미검사) student-row-card

### minimum-board — `/teacher/minimum-board` — 실패

- T 390: 문구 없음 '먼저 볼 학생'
- T 390: 문구 없음 '대학 공식 모집요강이 최종 기준이에요 · '미검수'는 교사 입력 기준이라 참고로만 봐 주세요 · 시안의 대학·숫자는 예시예요'
- S 390: 블록 없음 page-header
- P 390: filter-chip x 297 (시안 20±4)
- P 390: disclaimer-note 폭 558 (시안 350±4)
- T 1440: 문구 없음 '백업'
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '먼저 볼 학생'
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: filter-chip x 670 (시안 454±4)
- P 1440: data-table 폭 784 (시안 772±4)
- (참고) 390: 앱 표식 없는 블록(구조 미검사) student-row-card
- (참고) 1440: 앱 표식 없는 블록(구조 미검사) student-row-card

### score-trend — `/score-trend` — 실패

- T 390: 문구 없음 '전 교과'
- T 390: 문구 없음 '국어'
- T 390: 문구 없음 '수학'
- T 390: 문구 없음 '영어'
- T 390: 문구 없음 '사회'
- T 390: 문구 없음 '모의고사 추이 보기'
- S 390: 블록 없음 stat-tile
- S 390: 블록 없음 segmented-control
- P 390: grade-trend-chart 폭 316 (시안 310±4)
- P 390: data-table 폭 316 (시안 310±4)
- T 1440: 문구 없음 '내 성적 추이'
- T 1440: 문구 없음 '학기와 회차마다 등급이 어떻게 바뀌었는지 보여 줘요.'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '전 교과'
- T 1440: 문구 없음 '국어'
- T 1440: 문구 없음 '수학'
- T 1440: 문구 없음 '영어'
- T 1440: 문구 없음 '사회'
- T 1440: 문구 없음 '탐구'
- S 1440: 블록 없음 stat-tile
- S 1440: 블록 없음 segmented-control
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: grade-trend-chart x 305 (시안 300±4)
- P 1440: grade-trend-chart 폭 502 (시안 512±4)
- P 1440: data-table x 305 (시안 300±4)
- P 1440: data-table 폭 502 (시안 512±4)

### admission-results — `/admission-results` — 실패

- T 390: 문구 없음 '좌표'
- T 390: 문구 없음 '계열 전체'
- S 390: 블록 없음 filter-chip
- S 390: 블록 없음 cut-dot-plot
- S 390: 블록 없음 disclaimer-note
- P 390: 본문 왼쪽 여백(시안) 20 (기준 16±2)
- P 390: segmented-control 폭 158 (시안 358±4)
- T 1440: 문구 없음 '좌표'
- T 1440: 문구 없음 '계열 전체'
- T 1440: 문구 없음 '지원 준비에 추가'
- S 1440: 블록 없음 filter-chip
- S 1440: 블록 없음 cut-dot-plot
- S 1440: 블록 없음 data-table
- S 1440: 블록 없음 disclaimer-note
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: segmented-control 폭 158 (시안 240±4)

### login — `/login` — 통과


### signup — `/signup` — 통과


### minimum-search — `/minimum-search` — 실패

- S 390: 블록 없음 stat-tile
- S 390: 블록 없음 trace-accordion
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '대학·학과 검색'
- T 1440: 문구 없음 '필터'
- T 1440: 문구 없음 '대학 · 모집단위'
- T 1440: 문구 없음 '기준 합'
- T 1440: 문구 없음 '내 합'
- T 1440: 문구 없음 '관심'
- T 1440: 문구 없음 '수시로에 담기'
- S 1440: 블록 없음 stat-tile
- S 1440: 블록 없음 text-input
- S 1440: 블록 없음 data-table
- S 1440: 블록 없음 trace-accordion
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)

### univ-detail-wiki — `/univ-detail?u=경희대학교` — 실패

- S 390: 블록 없음 stat-tile
- S 390: 블록 없음 data-table
- S 390: 블록 없음 univ-card
- S 390: 블록 없음 trace-accordion
- P 390: segmented-control x 20 (시안 40±4)
- P 390: segmented-control 폭 350 (시안 310±4)
- T 1440: 문구 없음 '대학 찾기 › 전형계획'
- T 1440: 문구 없음 '홈페이지 ↗'
- T 1440: 문구 없음 '항목'
- T 1440: 문구 없음 '전형명'
- T 1440: 문구 없음 '모집인원'
- T 1440: 문구 없음 '데이터 상태'
- T 1440: 문구 없음 '반영 교과'
- T 1440: 문구 없음 '학년별 비율'
- T 1440: 문구 없음 '출결'
- T 1440: 문구 없음 '선발 단계'
- T 1440: 문구 없음 '요소와 비율'
- T 1440: 문구 없음 '대학 · 학과'
- T 1440: 문구 없음 '계열 관계'
- T 1440: 문구 없음 '차이'
- S 1440: 블록 없음 stat-tile
- S 1440: 블록 없음 data-table
- S 1440: 블록 없음 trace-accordion
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: segmented-control x 280 (시안 304±4)
- P 1440: segmented-control 폭 1128 (시안 350±4)
- P 1440: disclaimer-note x 280 (시안 304±4)
- P 1440: disclaimer-note 폭 1128 (시안 1080±4)

### dept-tier — `/dept-tier` — 실패

- T 390: 문구 없음 '사회과학 › 행정·정책 ▾'
- S 390: 블록 없음 placement-board
- S 390: 블록 없음 trace-accordion
- P 390: segmented-control 폭 171 (시안 350±4)
- T 1440: 문구 없음 '어문'
- T 1440: 문구 없음 '사회과학'
- T 1440: 문구 없음 '경상'
- T 1440: 문구 없음 '교육'
- T 1440: 문구 없음 '인문학'
- T 1440: 문구 없음 '행정·정책'
- T 1440: 문구 없음 '정치외교'
- T 1440: 문구 없음 '사회학'
- T 1440: 문구 없음 '미디어'
- T 1440: 문구 없음 '심리'
- T 1440: 문구 없음 '지리'
- T 1440: 문구 없음 '복지'
- T 1440: 문구 없음 '학과 이름으로 찾기'
- S 1440: 블록 없음 filter-chip
- S 1440: 블록 없음 placement-board
- S 1440: 블록 없음 trace-accordion
- P 1440: page-header 글자→첫 블록 간격(시안) 109 (기준 48±2)
- P 1440: segmented-control 폭 116 (시안 240±4)

### special-tracks — `/special-tracks` — 실패

- T 390: 문구 없음 '교과'
- T 390: 문구 없음 '종합'
- T 390: 문구 없음 '세부 전체 · 가나다순 ▾'
- S 390: 블록 없음 segmented-control
- S 390: 블록 없음 univ-card
- S 390: 블록 없음 trace-accordion
- T 1440: 문구 없음 '전체'
- T 1440: 문구 없음 '의예'
- T 1440: 문구 없음 '치의예'
- T 1440: 문구 없음 '한의예'
- T 1440: 문구 없음 '수의예'
- T 1440: 문구 없음 '교과'
- T 1440: 문구 없음 '종합'
- T 1440: 문구 없음 '모집단위'
- T 1440: 문구 없음 '경쟁률'
- T 1440: 문구 없음 '충원율'
- S 1440: 블록 없음 segmented-control
- S 1440: 블록 없음 data-table
- S 1440: 블록 없음 trace-accordion
- P 1440: page-header 글자→첫 블록 간격(시안) 109 (기준 48±2)
- P 1440: filter-chip x 304 (시안 352±4)

### admission-style — `/admission-style` — 실패

- T 390: 문구 없음 '나의 준비 방식을 살펴봐요'
- T 390: 문구 없음 '직접 만든 자기탐색 질문이에요 · MBTI나 표준화된 심리검사가 아니에요 · 답변만으로 지원 자격이나 입학 결과를 판단하지 않아요'
- T 1440: 문구 없음 '나의 준비 방식을 살펴봐요'
- T 1440: 문구 없음 '직접 만든 자기탐색 질문이에요 · MBTI나 표준화된 심리검사가 아니에요 · 답변만으로 지원 자격이나 입학 결과를 판단하지 않아요'
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)

### national-placement — `/national-placement` — 실패

- T 390: 문구 없음 '대학 검색 (예: 강원, 경북)'
- T 390: 문구 없음 '전체 조건'
- T 390: 문구 없음 '종합'
- T 390: 문구 없음 '논술'
- T 390: 문구 없음 '기타'
- S 390: 블록 없음 filter-chip
- S 390: 블록 없음 cut-dot-plot
- S 390: 블록 없음 trace-accordion
- S 390: 블록 없음 disclaimer-note
- P 390: text-input x 37 (시안 20±4)
- P 390: text-input 폭 150 (시안 350±4)
- P 390: segmented-control x 37 (시안 20±4)
- P 390: segmented-control 폭 306 (시안 350±4)
- T 1440: 문구 없음 '대학이 발표한 지난 입결의 위치를 살펴봐요'
- T 1440: 문구 없음 '대학 검색 (예: 강원, 경북)'
- T 1440: 문구 없음 '학과·전형 검색 (예: 간호, 교과)'
- T 1440: 문구 없음 '대학 반영·환산 평균'
- T 1440: 문구 없음 '전과목 평균'
- T 1440: 문구 없음 '국영수사과 평균'
- S 1440: 블록 없음 filter-chip
- S 1440: 블록 없음 cut-dot-plot
- S 1440: 블록 없음 trace-accordion
- S 1440: 블록 없음 disclaimer-note
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: text-input x 297 (시안 304±4)
- P 1440: text-input 폭 480 (시안 476±4)
- P 1440: segmented-control x 1081 (시안 424±4)
- P 1440: segmented-control 폭 306 (시안 300±4)

### eligibility-check — `/eligibility-check` — 실패

- T 390: 문구 없음 '사회 진로선택 이수 과목 수'
- S 390: 블록 없음 disclaimer-note
- P 390: stat-tile x 41 (시안 20±4)
- P 390: stat-tile 폭 100 (시안 214±4)
- T 1440: 문구 없음 '사회 진로선택 이수 과목 수'
- S 1440: 블록 없음 disclaimer-note
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2)
- P 1440: text-input x 297 (시안 377±4)
- P 1440: text-input 폭 1094 (시안 440±4)
- P 1440: stat-tile x 301 (시안 280±4)
- P 1440: stat-tile 폭 120 (시안 240±4)

### compare — `/compare` — 실패

- T 390: 문구 없음 '지원 준비에 추가'
- S 390: 블록 없음 filter-chip
- S 390: 블록 없음 data-table
- P 390: segmented-control 폭 242 (시안 222±4)
- P 390: text-input x 20 (시안 336±4)
- P 390: text-input 폭 167 (시안 117±4)
- T 1440: 문구 없음 '지원 준비에 추가'
- S 1440: 블록 없음 data-table
- P 1440: page-header 글자→첫 블록 간격(시안) 109 (기준 24±2)
- P 1440: segmented-control 폭 300 (시안 220±4)
- P 1440: text-input x 280 (시안 524±4)
- P 1440: text-input 폭 270 (시안 140±4)

### application-checklist — `/application-checklist` — 실패

- S 390: 블록 없음 disclaimer-note
- T 1440: 문구 없음 '진행 상태'
- T 1440: 문구 없음 '동작'
- S 1440: 블록 없음 data-table
- S 1440: 블록 없음 disclaimer-note
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2)

### calendar — `/calendar` — 실패

- T 390: 문구 없음 '전형: 전체'
- T 390: 문구 없음 '완료 포함'
- T 390: 문구 없음 '날짜는 내가 저장한 기록이에요. 대학 공식 모집요강에서 최종 확인해 주세요. 날짜 미정 항목은 내보내지 않으며 자동 알림은 전송하지 않아요. 수정한 일정은 다시 내보내 주세요. · 시안의 날짜는 시험용 예시예요'
- S 390: 블록 없음 stat-tile
- S 390: 블록 없음 filter-chip
- S 390: 블록 없음 disclaimer-note
- P 390: segmented-control x 20 (시안 230±4)
- P 390: segmented-control 폭 231 (시안 140±4)
- T 1440: 문구 없음 '전형: 전체'
- T 1440: 문구 없음 '완료 포함'
- T 1440: 문구 없음 '날짜는 내가 저장한 기록이에요. 대학 공식 모집요강에서 최종 확인해 주세요. 날짜 미정 항목은 내보내지 않으며 자동 알림은 전송하지 않아요. 수정한 일정은 다시 내보내 주세요. · 시안의 날짜는 시험용 예시예요'
- S 1440: 블록 없음 filter-chip
- S 1440: 블록 없음 disclaimer-note
- S 1440: 블록 없음 stat-tile
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 48±2)
- P 1440: segmented-control x 1292 (시안 1248±4)
- P 1440: segmented-control 폭 116 (시안 160±4)
- P 1440: data-table x 280 (시안 300±4)
- P 1440: data-table 폭 1128 (시안 704±4)

### counsel-tasks — `/counsel-tasks` — 실패

- T 390: 문구 없음 '상담카드에 담기'
- T 390: 문구 없음 '물어봤어요'
- S 390: 블록 없음 filter-chip
- T 1440: 문구 없음 '상담카드에 담기'
- T 1440: 문구 없음 '물어봤어요'
- S 1440: 블록 없음 filter-chip
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2)

### admin-fields — `/admin/admin-rules/fields` — 실패

- T 390: 문구 없음 '모집단위마다 소계열·중계열을 정해요. ‘입결이 비슷한 대학’이 이 표로 같은 계열·관련 계열을 골라요.'
- T 390: 문구 없음 'CSV 파일 고르기'
- T 390: 문구 없음 '기록 파일 고르기'
- T 390: 문구 없음 '이전'
- T 390: 문구 없음 '다음'
- P 390: text-input 폭 316 (시안 310±4)
- P 390: data-table 폭 727 (시안 120±4)
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '모집단위마다 소계열·중계열을 정해요. ‘입결이 비슷한 대학’이 이 표로 같은 계열·관련 계열을 골라요.'
- T 1440: 문구 없음 'CSV 파일 고르기'
- T 1440: 문구 없음 '검수 기록 파일 고르기'
- T 1440: 문구 없음 '이전'
- T 1440: 문구 없음 '다음'
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2)
- P 1440: text-input x 297 (시안 304±4)
- P 1440: text-input 폭 539 (시안 240±4)
- P 1440: data-table x 281 (시안 304±4)

### admin-wiki — `/admin/admin-rules/wiki` — 실패

- T 390: 문구 없음 '검수 목록'
- T 390: 문구 없음 '대학 공식 발표 자료만 요약해요 · 사설 사이트 내용은 받지 않아요 · 시안의 내용은 시험용 예시예요'
- S 390: 블록 없음 filter-chip
- S 390: 블록 없음 univ-card
- P 390: text-input 폭 316 (시안 310±4)
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '검수 목록'
- T 1440: 문구 없음 '대학 공식 발표 자료만 요약해요 · 사설 사이트 내용은 받지 않아요 · 시안의 내용은 시험용 예시예요'
- P 1440: page-header 글자→첫 블록 간격(시안) 110 (기준 24±2)
- P 1440: text-input x 297 (시안 304±4)
- P 1440: text-input 폭 539 (시안 200±4)
- P 1440: segmented-control x 517 (시안 556±4)
- P 1440: segmented-control 폭 365 (시안 400±4)
- P 1440: data-table x 281 (시안 304±4)

### univ-map — `/univ-map` — 실패

- P 390: region-map x 36 (시안 20±4)
- P 390: region-map 폭 318 (시안 350±4)
- S 1440: 블록 없음 univ-card
- P 1440: page-header 글자→첫 블록 간격(시안) 109 (기준 48±2)

### class-calendar — `/teacher/class-calendar` — 실패

- T 390: 문구 없음 '학생이 보낸 카드와 직접 입력한 일정 · 결과예요 · 대학 공식 발표가 최종 기준이에요 · 학생은 번호·별칭으로만 보여요 · 시안의 대학·날짜는 예시예요'
- S 390: 블록 없음 page-header
- S 390: 블록 없음 text-input
- S 390: 블록 순서 다름 시안 [sub-nav > segmented-control > stat-tile > filter-chip > data-table > disclaimer-note] / 앱 [sub-nav > stat-tile > filter-chip > segmented-control > data-table > disclaimer-note]
- P 390: segmented-control 폭 350 (시안 140±4)
- P 390: stat-tile 폭 100 (시안 174±4)
- P 390: data-table x 36 (시안 20±4)
- P 390: data-table 폭 318 (시안 350±4)
- T 1440: 문구 없음 '백업'
- T 1440: 문구 없음 '로그아웃'
- T 1440: 문구 없음 '잠금'
- T 1440: 문구 없음 '학생이 보낸 카드와 직접 입력한 일정 · 결과예요 · 대학 공식 발표가 최종 기준이에요 · 학생은 번호·별칭으로만 보여요 · 시안의 대학·날짜는 예시예요'
- S 1440: 블록 없음 text-input
- S 1440: 블록 순서 다름 시안 [page-header > filter-chip > segmented-control > stat-tile > data-table > disclaimer-note] / 앱 [page-header > stat-tile > filter-chip > segmented-control > data-table > disclaimer-note]
- P 1440: page-header 글자→첫 블록 간격(시안) 109 (기준 48±2)
- P 1440: segmented-control x 280 (시안 1071±4)
- P 1440: segmented-control 폭 1128 (시안 240±4)
- P 1440: stat-tile 폭 120 (시안 370±4)
- P 1440: data-table 폭 712 (시안 704±4)

### doelgak — `/doelgak` — 실패 (재구현 중)

> 재구현 중(2026-11-24 다른 에이전트가 시안대로 다시 구현하는 중)

- T 390: 문구 없음 '강원'
- T 390: 문구 없음 '서울'
- S 390: 블록 없음 filter-chip
- S 390: 블록 없음 univ-card
- S 1440: 블록 없음 univ-card
- P 1440: page-header 글자→첫 블록 간격(시안) 109 (기준 48±2)
- (참고) 1440: 앱 표식 없는 블록(구조 미검사) judge-lane
