# 01-research — 학생 상담 (counsel, 교사)

> 대상: PRD 6-10 "학생 상담 화면: 한 화면에 성적 요약 + 대학별 환산 + 지원 가능 대학 + 수시 6장 보드 + 상담 메모(시간순 기록)", 3-4 "변경 이력과 상담 메모를 남기고", 6-12(담임 기록, 실행 중 AI 없음).
> design.md: Responsive Strategy "학생 상담 — 모바일: 학생 요약 카드 + 상담 메모 입력만 / PC: 3단(학생 요약 / 될각·수시로 / 상담 메모 타임라인)", App Shell "오른쪽 보조 패널 360px … 학생 상담 메모", `counsel-timeline`(세로 타임라인, 날짜 caption, 메모 body, 카드 변경 이력은 회색 시스템 줄, 마디 점 = ELLIPSE), `student-row-card`, `text-input`.
> 참고: work/_ref/schs_lms-homeroom.md 3(a) 상담 탭 = "상담 기록 목록(날짜·영역·내용·작성자·수정됨 표시) + 기록 쓰기". 같은 문서의 AI 카드 "기록 흐름 요약 → 상담 메모에 붙이기"는 가져오지 않는다(이 화면은 실행 중 AI 없음).
> 겹침 정리: student-record의 "상담" 탭은 탭 머리만 있고 내용이 없다(02-spec). counsel은 상담하는 동안 쓰는 작업 화면이고, 성적 추이 차트·표는 student-record에 두고 여기서는 숫자 요약만 쓴다.
> 검색: uibowl 무료 등급, 검색 11회(0건 3회는 DB 어휘로 바꿔 다시 검색). 학생은 번호·별칭만 쓴다(예: "7번 하늘").

## 레퍼런스

- [L1] 채널톡 (PC) — 고객 상세: 왼쪽 고객 프로필·속성 목록(키-값 줄), 가운데 메모 카드 목록(작성자·시각 + 본문), 오른쪽 이벤트 열(빈 상태). "요약 옆에 기록" 3열 구성 — https://uibowl.io/website/%EC%B1%84%EB%84%90%ED%86%A1?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%EA%B3%A0%EA%B0%9D
- [L2] 채널톡 (PC) — 채팅 / 사이드바: 가운데 대화 흐름 + 오른쪽 고정 보조 패널(고객 정보·탭·목록). 본문을 보면서 옆 패널을 같이 보는 구조 — https://uibowl.io/website/%EC%B1%84%EB%84%90%ED%86%A1?patterns=%EC%B1%84%ED%8C%85&patternName=%EC%82%AC%EC%9D%B4%EB%93%9C%EB%B0%94
- [L3] 채널톡 (PC) — 채팅 / 메시지 서식: 기록 흐름 아래에 붙은 여러 줄 입력칸 + 서식 도구줄 + 보내기, 오른쪽 패널은 그대로 유지 — https://uibowl.io/website/%EC%B1%84%EB%84%90%ED%86%A1?patterns=%EC%B1%84%ED%8C%85&patternName=%EB%A9%94%EC%8B%9C%EC%A7%80%20%EC%84%9C%EC%8B%9D
- [L4] 위시켓 (PC) — 포트폴리오 상세: 왼쪽 세로 타임라인(마디 점 + 제목 + 날짜·기간 메타 + 설명), 오른쪽 요약 패널(기본 정보 키-값 + 태그 칩 묶음) — https://uibowl.io/website/%EC%9C%84%EC%8B%9C%EC%BC%93?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&imgId=cmunb671j001gl3040x1zft64
- [L5] 센디 (모바일) — 운송현황 상세: 아이콘 마디 + 세로선 타임라인, 각 마디 = 굵은 라벨 + 본문 + 회색 메타 한 줄 — https://uibowl.io/name/%EC%84%BC%EB%94%94?patterns=%EB%82%B4%EC%97%AD&imgId=cmp6az7rg00lmjo04sn7eug0z
- [L6] 퍼그샵 (모바일) — 미션 진행 현황: 회색 세로선 + 점 마디, 항목마다 오른쪽 상태 칩("대기"), 현재 항목만 굵게 — https://uibowl.io/name/%ED%8D%BC%EA%B7%B8%EC%83%B5?patterns=%EB%82%B4%EC%97%AD&imgId=cmq7ew6fi000ll70455895ojl
- [L7] 도미노 (모바일) — 메모 작성: 상세 화면 안 탭("내 자산 · 메모")에 회색 채움 메모 칸("메모를 입력하세요")을 바로 둠. 별도 화면으로 넘기지 않는 인라인 메모 — https://uibowl.io/name/%EB%8F%84%EB%AF%B8%EB%85%B8?patterns=%EA%B8%80%EC%93%B0%EA%B8%B0&patternName=%EB%A9%94%EB%AA%A8%20%EC%9E%91%EC%84%B1
- [L8] 오일나우 (모바일) — 글쓰기 / 커뮤니티: 여러 줄 본문 아래 "# 태그 없음 · 태그추가" 한 줄, 위치 줄 "× 변경". 본문과 분류를 분리 — https://uibowl.io/name/%EC%98%A4%EC%9D%BC%EB%82%98%EC%9A%B0?patterns=%EA%B8%80%EC%93%B0%EA%B8%B0&imgId=cmtpnvqe1001vlh04bvkk3co9
- [L9] 럽맘 (모바일) — 할 일 관리하기: 세그먼트(오늘 · 이번주 · 전체) + 할 일 행(체크 + 제목 + 분류 칩 + 날짜·시각), 완료 행은 취소선 — https://uibowl.io/name/%EB%9F%BD%EB%A7%98?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&patternName=%ED%95%A0%20%EC%9D%BC%20%EA%B4%80%EB%A6%AC%ED%95%98%EA%B8%B0
- [L10] 워크온 (모바일) — 활동기록: 점 마디 세로 목록, 항목 = 한 줄 문장 + 수치 칩 줄, 사이에 회색 시각 줄 — https://uibowl.io/name/%EC%9B%8C%ED%81%AC%EC%98%A8?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&patternName=%ED%99%9C%EB%8F%99%EA%B8%B0%EB%A1%9D
- [L11] 아치캘린더 (PC) — 메모 생성: 탭 + 검색 바 아래 메모 목록, 메모가 없으면 가운데 회색 두 줄 빈 상태 — https://uibowl.io/website/%EC%95%84%EC%B9%98%EC%BA%98%EB%A6%B0%EB%8D%94?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&patternName=%EB%A9%94%EB%AA%A8
- [L12] 럽맘 (모바일) — 컨디션 기록: 오늘 기록 카드 안 "한 줄 메모를 남겨보세요" 입력칸 + 오른쪽 "작성" 버튼. 입력과 저장이 한 줄 — https://uibowl.io/name/%EB%9F%BD%EB%A7%98?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&imgId=cmpz1ay7r00o9jr04d66p98u0

## 반영 포인트

- P1: PC는 design.md 3단 그대로 — 왼쪽 학생 요약(번호·별칭, 메타 한 줄, 키-값 줄로 성적 범위·수시로 6장 요약·최저 충족 현황), 가운데 될각·수시로, 오른쪽 360px 보조 패널에 상담 메모 타임라인. 요약은 읽기 전용 키-값 목록으로 두고 차트는 넣지 않는다(성적 추이는 student-record 몫) [근거: L1, L2, L4]
- P2: 메모 입력칸은 타임라인 패널 위에 붙여 고정하고(여러 줄 `text-input` + 영역 선택 + 저장 한 줄), 저장하면 바로 아래 타임라인 맨 위에 새 마디로 들어간다. 다른 화면·모달로 넘기지 않는다 [근거: L3, L7, L12]
- P3: `counsel-timeline` 마디 = ELLIPSE 점 + 1px 세로선, 머리 줄 날짜 {typography.caption} 고정폭 + 영역 라벨, 본문 메모 {typography.body}, 끝에 회색 메타(작성자 · 수정됨). 수시로 카드 변경 이력("카드 v3 · 2번 칸 교체")은 점 없이 text-muted 시스템 줄로 섞어 시간순 하나로 본다 [근거: L4, L5, L10]
- P4: 상담 영역(진로 · 성적 · 수시로 · 생활)은 메모마다 흑백 라벨 1개로 붙이고, 타임라인 위 `filter-chip` 줄로 영역별 거르기. 판정색·Route Blue는 라벨에 쓰지 않는다(선택된 칩 테두리만 Route Blue) [근거: L4, L8]
- P5: 후속 할 일은 메모 안 "다음에 볼 것" 한 줄(기한 날짜 + 내용)로 두고 상태는 글자 라벨("대기" / "완료")로 표시. 체크박스·할 일 목록 컴포넌트는 design.md에 없으므로 새로 만들지 않는다(필요하면 S2에서 "design.md 수정 제안") [근거: L6, L9]
- P6: 첫 상담(기록 0건)은 타임라인 자리에 `empty-state` — "아직 남긴 상담 메모가 없어요" + 설명 한 줄. 주요 버튼은 메모 저장 하나뿐이라 empty-state 안 `button-primary`는 입력칸 포커스 이동 용도로만 쓰거나 생략 [근거: L1, L11]
- P7: 모바일은 design.md대로 "학생 요약 카드 + 상담 메모 입력"만 — 위에 접힌 요약 카드(번호·별칭 + 핵심 숫자 2칸), 그 아래 인라인 메모 칸, 지난 메모는 최근 3건 + "전체 보기". 될각·수시로 열은 모바일에서 빼거나 아코디언으로 둔다 [근거: L7, L12, L5]
- P8: 요약 숫자 문구는 NEVER-2를 지킨다 — 성적은 "환산 9등급 약 2.2~2.8"처럼 범위 + "추정", 최저는 "충족 현황 2/3"(예측 표현 금지), 판정이 나오면 `judge-badge`(색 + 아이콘 + 이름). 화면 하단 `disclaimer-note` 필수(counsel은 requires_disclaimer_note 대상) [근거: L1, L4]

## S2에 넘길 메모

- design.md에 여러 줄 입력 변형(text-input multiline)이 따로 없다. `text-input`을 높이만 늘려 쓰는지, design.md에 변형을 추가할지 S2에서 정해야 한다. 체크박스도 일반 컴포넌트로는 없다(mask-preview 안에만 있음).
- schs_lms 상담 탭 필드(날짜·영역·내용·작성자·수정됨)를 그대로 메모 데이터로 쓰면 된다. AI 요약·"상담 메모에 붙이기"는 제외.
- 학생 실명·사진 없이 번호·별칭만. 가상값은 student-record와 같은 학생("3학년 2반 7번 하늘")을 쓰면 화면 간 일관성이 생긴다.
