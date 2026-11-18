# S3 공통 지침 (2026-11-18, 여러 에이전트 동시 작업용)

Figma 파일 AqkVdYZ4hvPYuAlewoBs4W, 페이지 `전체 시안`(98:1904). design-system 페이지는 읽기만.
먼저 읽기: .claude/agents/designer.md, work/design-system.json(component_properties·덮어쓰는 식·navigation 키), 해당 work/<slug>/02-spec.md(최신 v 절).
`figma.skipInvisibleInstanceChildren = false`. 변형 clone 금지. 인스턴스 안 resize/x는 무시 → padding 방식(json 식). padding은 오른쪽 0 → 왼쪽 → 오른쪽 순서.

## 자리 (겹치지 않게 — 자기 Section 안에서만 작업)
- 기존 Section: 학생 줄 y=100, 교사 줄 y=1560(98:1906~98:1915, 98:14092~98:14096). Section 안에서 본 프레임(390·1440)은 첫 줄 그대로, **상태 프레임은 Section 안 아래 줄들**(y +1000씩, 한 줄에 최대 4개, 간격 80)에 놓고 Section 높이만 늘린다. Section 폭을 늘려 이웃을 밀지 말 것. 줄을 늘리면 그 아래 줄(교사 줄)과 겹칠 수 있으니 — 학생 Section이 y=1460을 넘으면 교사 줄 Section들을 모두 같은 양만큼 아래로 옮기는 건 **오케스트레이터가 나중에** 한다. 넘쳐도 그대로 두고 보고만.
- 새 Section 자리(왼쪽 위 좌표): 학생 줄 — admissions-list x=26000, admission-results x=34000, mock-score x=42000 (y=100). 교사 줄 — counsel x=13000, card-collect x=22000, result-summary x=31000 (y=1560). 관리자 줄 y=3020 — admin-rules x=1000, login x=20000, signup x=30000. 줄 제목 텍스트 "관리자"가 없으면 admin-rules 에이전트가 x=100, y=3020에 만든다(학생·교사 줄 제목과 같은 스타일).

## 새 내비(design.md App Shell, 패치 4)
- PC: `sidebar` 세트 101:2747의 mode(학생/교사/관리자). 지금 화면의 대분류만 펼침: 해당 `sidebar-group/<대분류>` → setProperties({state:'current', expanded:'true'}), 나머지 group은 state default·expanded false + `show group N items=false`. 소분류 `sidebar-item/<메뉴>` state=selected, 기본 선택(홈/우리 반 홈/규칙 편집기)은 default로 되돌림.
- PC 상단 바: 제목 앞에 `breadcrumb` 텍스트 "대분류 › 소분류"(caption, text-muted). 홈처럼 소분류 없는 화면은 생략.
- 모바일: `tab-bar-pill` mode(학생/교사) + 선택 = 대분류, 프레임 바닥에 붙임. 소분류가 있는 화면은 `app-bar` 바로 아래 `sub-nav`(tab N = 그 대분류의 소분류들, selected = 지금 화면). 상세 화면(뒤로가기 있는 화면: 대학 상세·전형 상세·학생 기록 상세)에는 sub-nav 없음.
- 대분류·소분류 표: 학생 홈 / 성적(성적 입력·성적 추이·5 to 9·대학별 환산·가채점) / 대학 찾기(전형계획·수시 입결·될각) / 수시 전략(수시로·생기부 AI). 교사 우리 반(우리 반 홈·학생 기록·학생 상담·누가기록) / 성적 관리(성적 불러오기·수능 최저 판정·가채점 수합) / 수합·집계(카드 수합·결과 집계). 관리자 규칙 관리(규칙 편집기·검수).

## 상태 프레임
- 02-spec에 적힌 팝업·바텀시트·모달·토스트·빈 상태·오류 등 주요 상태를 프레임으로 그린다: 이름 `<slug>/390-<상태>` / `<slug>/1440-<상태>`, 크기 390×844 / 1440×900. 뒤 화면 위에 scrim(ink 40%) + 시트/모달(bottom-sheet·modal은 detach 허용, 이름·그림자 유지).
- 03-draft.json: `frames`에는 390·1440 두 개만, 상태는 `states` 키에 `{"390-<상태>": "<id>", ...}`.

## 공통 규칙
- 인스턴스와 변수만, 상태는 속성으로(인스턴스 안 색 직접 수정 금지). 모서리 0, 그림자는 modal/bottom-sheet/toast/dropdown만.
- 대학명·셀·문장 한 줄 우선, 글자 중간 끊김 금지(필요하면 단어 사이 줄바꿈). 모바일 밀도: 좌우 20, 섹션 32. PC는 pc/ 텍스트 스타일.
- 실제 대학명 + 숫자가 나오면 disclaimer-note에 "시안의 대학·숫자는 예시예요". NEVER-2 금지어, NEVER-1(검수 전 = "준비 중").
- 프레임마다 screenshot 1회(상태 프레임은 묶어서 확인 가능). 보고: 프레임·상태 id, 스펙과 다르게 한 점, 남은 임시 부품.
