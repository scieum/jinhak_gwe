# 01-research — 성적 불러오기 (score-import, 교사용)

조사일 2026-11-18 · 담당 researcher · 출처 uibowl (무료 등급, 검색당 3건)

## 대상 화면 요약
- 근거: docs/prd.md 6-2(불러오기: CSV/엑셀 템플릿 업로드), 6-10(학급 불러오기: 템플릿 또는 나이스 내려받기 양식 매핑 → 학생별 성적 생성), 7-3(학급 데이터는 교사 기기에만 암호화 저장), work/_ref/schs_lms-homeroom.md 3(b).
- 흐름: 파일 → 열 맞추기 → 검증 → 반영, 4단계. 그 밖에 양식 내려받기, 시험별 업로드 현황.
- 대상 성적: 모의고사 등급(국·수·영·한국사·탐구1·탐구2), 내신 성적표(학년·학기별, PRD 6-2 열 순서).
- 디자인 제약(design.md 2026-11-18): 모서리 0, 흑백 바탕, 색은 판정색 쌍(오류 = 위험, 경고 = 소신, 완료 = 안정)과 Route Blue(선택·진행 표시·링크)만 쓴다. 주요 버튼은 잉크 채움.

## 검색 기록
| # | 도구 | 조건 | 결과 |
|---|---|---|---|
| 1 | search_ui_patterns | "파일 업로드", PC | 3건 (L1~L3) |
| 2 | search_ui_patterns | "엑셀 가져오기", PC | 0건 (DB에 해당 패턴명이 없음) |
| 3 | search_ui_patterns | "파일 업로드", MOBILE | 2건 (L7, L8) |
| 4 | search_components | "스테퍼", MOBILE | 0건 |
| 5 | search_components | "프로그레스 인디케이터" × 신청하기, MOBILE | 3건 (L9, L10, L11) |
| 6 | search_components | "테이블, 에러&실패", PC | 1건 (L4) |
| 7 | search_components | "완료&성공" × 생성하기, MOBILE | 3건 (L12 채택) |
| 8 | search_ui_patterns | "대시보드" + 테이블, PC | 3건 (L5, L6 채택) |

열 매핑 화면을 직접 보여 주는 레퍼런스는 찾지 못했다. 엑셀/CSV 가져오기 패턴명이 uibowl에 없다. 열 맞추기는 PRD 6-10과 schs_lms 3(b)를 따르고, 레이아웃만 L3을 참고한다.
설명은 검색 결과마다 첨부된 대표 화면 1장을 직접 보고 적었다.

## 레퍼런스

### PC
- [L1] 오프린트미 (PC) — 파일 업로드: "어떻게 디자인 하고 싶으신가요?" 모달 안에 시작 방법 카드 3장(템플릿 / 직접 / 내 디자인 업로드, 업로드 화살표 아이콘)을 가로로 놓음 — https://uibowl.io/website/%EC%98%A4%ED%94%84%EB%A6%B0%ED%8A%B8%EB%AF%B8?patterns=%ED%8E%B8%EC%A7%91%C2%B7%EC%88%98%EC%A0%95%ED%95%98%EA%B8%B0&patternName=%ED%8C%8C%EC%9D%BC%20%EC%97%85%EB%A1%9C%EB%93%9C
- [L2] Whimsical (PC) — 설정 > File uploads: 왼쪽 설정 사이드바, 본문에 한 줄 카드(허용 토글 + "0 B of 1 GB used" 사용량 + 관리 링크)와 업로드된 파일 목록 — https://uibowl.io/website/Whimsical%20(%EC%9C%94%EC%A7%80%EC%BB%AC)?patterns=%EB%82%B4%EC%97%AD&patternName=%EC%97%85%EB%A1%9C%EB%93%9C%EB%90%9C%20%ED%8C%8C%EC%9D%BC
- [L3] Perplexity (PC) — 건강 파일 업로드: 가운데 본문에 업로드 안내 카드(설명 + 업로드 버튼 + 미리보기), 오른쪽 좁은 보조 패널에 단계별 안내. 로딩·진행 표시가 이어짐 — https://uibowl.io/website/Perplexity%20(%ED%8D%BC%ED%94%8C%EB%A0%89%EC%8B%9C%ED%8B%B0)?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&patternName=%EA%B1%B4%EA%B0%95%20%ED%8C%8C%EC%9D%BC%20%EC%97%85%EB%A1%9C%EB%93%9C
- [L4] Semrush (PC) — 업체 리포트: 항목별 행 표, 행마다 상태 열에 "Not Found"(빨강)·정상(초록) 글자 상태와 오른쪽에 고치기 버튼. 상단에 문제 요약, 아래 "Show all" 펼치기 — https://uibowl.io/website/Semrush?patterns=%EC%83%81%EC%84%B8%EC%A0%95%EB%B3%B4%20%28PDP%29&imgId=cmvq27wr4000hjs08mm2sohcp
- [L5] 마이크로소프트 클래리티 (PC) — 대시보드: 맨 위 숫자 타일 4개 한 줄(라벨 + 큰 숫자), 아래 카드 그리드에 항목별 수치 목록 — https://uibowl.io/website/%EB%A7%88%EC%9D%B4%ED%81%AC%EB%A1%9C%EC%86%8C%ED%94%84%ED%8A%B8%20%ED%81%B4%EB%9E%98%EB%A6%AC%ED%8B%B0%20(Microsoft%20Clarity)?patterns=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C&patternName=%EC%82%AC%EC%9A%A9%EC%9E%90%20%EB%B6%88%ED%8E%B8%20%EC%8B%A0%ED%98%B8
- [L6] 레뷰 (REVU) (PC) — 애드센터 대시보드: 왼쪽 사이드바, 상단 진행 현황 숫자(진행 중 / 대기) + 상태별 숫자 타일 4개, 아래 탭과 기간별 표·차트 — https://uibowl.io/website/%EB%A0%88%EB%B7%B0%20(REVU)?patterns=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C&patternName=%EC%95%A0%EB%93%9C%EC%84%BC%ED%84%B0

### MOBILE
- [L7] 틈틈잇 (MOBILE) — 문제 파일 업로드: 홈의 업로드 플로팅 버튼으로 들어가 파일 선택 → 로딩·진행 표시 → 결과까지 8화면 흐름 — https://uibowl.io/name/%ED%8B%88%ED%8B%88%EC%9E%87?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&patternName=%EB%AC%B8%EC%A0%9C%20%ED%8C%8C%EC%9D%BC%20%EC%97%85%EB%A1%9C%EB%93%9C
- [L8] 다글로 (MOBILE) — 파일 업로드: 입력 방식 아이콘 행(녹음 / 파일 / YouTube / PDF) 다음, "파일 위치 안내" 모달로 올릴 수 있는 파일 위치를 먼저 알려 줌 — https://uibowl.io/name/%EB%8B%A4%EA%B8%80%EB%A1%9C?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&patternName=%ED%8C%8C%EC%9D%BC%20%EC%97%85%EB%A1%9C%EB%93%9C
- [L9] 셀레트립 (MOBILE) — 아티스트 요청: 앱바 아래 번호 단계 표시(1 — 2, 현재 단계만 채움 + 연결선), 그 아래 단계 제목과 입력 — https://uibowl.io/name/%EC%85%80%EB%A0%88%ED%8A%B8%EB%A6%BD?patterns=%EC%8B%A0%EC%B2%AD%ED%95%98%EA%B8%B0&imgId=cmqp09g3t0012l204dusjxxe5
- [L10] 빼기 (MOBILE) — 배출 신청: 앱바 바로 아래 얇은 가로 진행 막대, 굵은 단계 제목 2줄, 항목 카드 목록, 하단 고정 "다음" 버튼 — https://uibowl.io/name/%EB%B9%BC%EA%B8%B0?patterns=%EC%8B%A0%EC%B2%AD%ED%95%98%EA%B8%B0&imgId=cmsu3e1d5000ll904lwfg72dq
- [L11] 미소 (MOBILE) — 견적 요청 완료: 위쪽 체크 아이콘 + "견적 요청 완료" 제목 + 한 줄 설명 + 회색 안내 박스, 아래 "진행 과정" 세로 타임라인(완료 단계 채움, 다음 단계 회색), 하단 고정 "견적 현황 보기" 버튼 — https://uibowl.io/name/%EB%AF%B8%EC%86%8C?patterns=%EC%8B%A0%EC%B2%AD%ED%95%98%EA%B8%B0&imgId=cmqt6igjt000slb04sgvu1irw
- [L12] 펫프렌즈 (MOBILE) — 배송지 등록완료: 가운데 모달에 체크 아이콘 + "등록완료" 제목 + 결과 한 줄 + 회색 요약 박스 + "확인" — https://uibowl.io/name/%ED%8E%AB%ED%94%84%EB%A0%8C%EC%A6%88?patterns=%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0&imgId=cmvswaz10000vlb08ga6yhc6l

## 반영 포인트
- P1: 4단계 단계 표시. 번호 칸 + 연결선 구조는 L9에서, 앱바 아래 얇은 진행 막대는 L10에서 가져온다. 번호 칸은 원이 아니라 직각 사각형으로 그린다(원형은 판정 아이콘·내 위치 점에만 허용). 현재 단계는 Route Blue(진행 표시), 끝난 단계는 잉크, 남은 단계는 text-muted. PC는 본문 위 가로 4칸 "파일 → 열 맞추기 → 검증 → 반영". 모바일은 "2/4 열 맞추기" 라벨과 진행 막대를 쓰고, 각 단계 하단에 고정 button-primary 하나만 둔다. [근거: L9, L10]
- P2: 파일 단계의 첫 화면은 "무엇을 올릴지" 고르는 카드다. L1의 시작 방법 카드처럼 모의고사 등급 / 내신 성적표 카드 2장을 나란히 두고, 고르면 시험(모의고사) 또는 학년·학기(내신) segmented-control이 나온다. 카드마다 button-outline "양식 내려받기"를 붙인다. L8처럼 올리기 전에 받는 형식(xlsx·csv, 템플릿 또는 나이스 내려받기 양식)과 한도를 caption으로 먼저 안내한다. 사진·PDF를 AI로 읽는 기능은 가져오지 않는다(PRD 13장: 실행 중 AI는 생기부 분석 하나뿐). [근거: L1, L8, L7]
- P3: 열 맞추기는 PC에서 L3처럼 본문과 오른쪽 보조 패널(360px)로 나눈다. 왼쪽에는 "원본 열 제목 → 필드 드롭다운" 행 목록, 오른쪽에는 매칭 규칙 안내와 원본 미리보기 3행을 둔다. 자동으로 맞춘 열은 "'성명' → 이름"처럼 한 줄로 알리고, 못 맞춘 필드만 text-input-error(위험색 2px 링 + 안내 문구)로 표시한다. 모바일은 매칭 결과 목록만 보여 주고 행을 누르면 바텀시트로 고친다. [근거: L3]
- P4: 검증 표는 L4처럼 행마다 맨 오른쪽에 상태 열을 둔다. 상태는 정상 / 빈 칸 / 범위 오류 / 이름 불일치 / 명단에 없음 / 번호 중복이다. 오류 행은 위험 색 쌍 + ■ 아이콘 + 상태 이름, 반영은 되지만 확인이 필요한 행(빈 칸 = 결시)은 소신 색 쌍 + ▲ + 이름으로 쓰고, 색만으로 구분하지 않는다. 오류 셀은 judge-risk-bg로 채우고 등급 숫자 자체에는 색을 넣지 않는다. 표 위에 L4의 문제 요약처럼 한 줄 요약("확인 필요 3행 · 범위 오류 1행은 빼고 반영해요")과 필터 세그먼트 "전체 N / 확인 필요 N"을 둔다. 표 아래에는 button-outline "오류 행만 내려받기"를 둔다. 모바일은 확인 필요 행만 student-row-card 목록으로 보여 준다. [근거: L4]
- P5: 반영 완료는 L11 구조를 따른다. 체크 아이콘(안정 색 쌍 = 완료) + "30명의 10월 모의고사 성적을 반영했어요" + 회색 안내 박스("학급 데이터는 이 기기에만 암호화해서 저장돼요", PRD 7-3) + 다음 할 일 세로 목록(학급 대시보드 확인 → 학생 상담), 하단 button-primary "학급 대시보드 보기" 하나. L12 같은 가운데 모달은 쓰지 않는다. 모바일은 전체 화면, PC는 본문 카드로 둔다. [근거: L11, L12]
- P6: 시험별 업로드 현황은 L5·L6처럼 맨 위에 stat-tile 한 줄(우리 반 N명 / 올린 시험 N개 / 이번 시험 반영 N명 / 확인 필요 N행)을 두고, 아래 data-table로 시험(학기)별 행을 보여 준다. 열은 시험·구분 / 반영 인원 "28/30명" / 마지막 반영일 / 상태다. "28/30명" 표기는 L2의 사용량 표기("0 B of 1 GB used")를 참고한다. 상태는 data-status-badge 같은 흑백 알약으로 쓰고 판정색은 쓰지 않는다(판정이 아니라 데이터 상태라서). 핵심 숫자 하나만 Route Blue를 허용한다. [근거: L5, L6, L2]

## 가져오지 않는 것
- 레퍼런스의 둥근 모서리, 보라·파랑 채움 주요 버튼(L9·L10·L11), 캐릭터·일러스트(L7), 그림자 카드. design.md에 따라 모서리 0, 잉크 버튼, 1px 선으로 바꾼다.
- 단계 번호 원형(L9)은 직각 사각형으로 바꾼다.
- 완료를 모달로 띄우는 방식(L12)은 쓰지 않는다. 반영 결과는 화면에 남아 있어야 한다.
