U:NAVI design.md

U:NAVI(구 진학 내비) PRD(2028_진학웹앱_PRD.md)의 시각 규칙 문서입니다. 토큰 이름은 영어로, 설명은 한국어로 씁니다. 화면을 만들 때 이 문서의 토큰과 Do's and Don'ts를 어기지 않았는지 함께 확인합니다.

Overview

U:NAVI는 학생과 교사가 성적·환산·지원 전략을 설계하는 도구입니다. 인터페이스는 판단을 방해하지 않도록 한 발 물러서 있습니다. 바탕은 철저히 흑백입니다. 거의 검은 잉크({colors.ink} — 
#141414)를 흰 캔버스({colors.canvas})에 올리고, 구조는 그림자나 색이 아니라 아주 옅은 회색 단계로 나눕니다.

색은 의미가 있을 때만 씁니다. 화면에 색이 나타나는 경우는 세 가지뿐입니다.

될각 판정(안정·적정·소신·위험)과 경고: 학생이 결정을 내려야 하는 신호
내 위치({colors.accent} — Route Blue 
#0066ff): 5 to 9 막대 위의 내 위치 표시, 입결 컷 대비 내 점수 표시처럼 "지금 나는 여기"를 가리키는 표시
선택·여기 표시(같은 Route Blue, 2026-11-18 — lab-stock-app 색 규칙 참고): 선택 상태(사이드바·탭·세그먼트·필터 칩·하단 탭바·선택 행), 링크, 진행 표시, 강조 아이콘, 화면의 핵심 숫자 1~2개. 판정·경고 신호 안과 주요 버튼 채움에는 쓰지 않습니다.
색 하나에 역할 하나: 판정색은 "결정이 필요해요", Route Blue는 "선택됨·여기예요"만 뜻합니다. 둘은 섞지 않습니다.

나머지 화면은 모두 흑백이라서, 색이 보이는 순간 "여기를 보세요"라는 뜻이 됩니다.

모서리는 모두 직각입니다(2026-11-18 결정). 버튼, 탭, 세그먼트, 배지, 카드, 입력칸, 하단 탭바 모두 모서리 0이고, 동그라미는 판정 아이콘 ●·내 위치 점·5단계 점처럼 원래 원형인 표식(Figma ELLIPSE)에만 씁니다. 글꼴은 Pretendard 하나만 쓰고(Figma에 Pretendard가 없으면 IBM Plex Sans KR — Typography 참조), 굵기 대비로 위계를 만듭니다. 제목은 Bold 700, 본문은 Regular 400, 리드 문장은 Light 300입니다. **숫자는 항상 고정폭 숫자(tabular)**로 써서 점수와 등급이 세로로 정렬되게 합니다.

두 개의 무대. 학생은 주로 모바일에서 혼자 확인하고, 교사는 PC에서 학급을 놓고 상담합니다. 같은 토큰을 쓰되 화면 구성은 기기에 맞게 따로 설계합니다(Responsive Strategy 참조).

핵심 특징:

흑백 캔버스 + 의미 색만 허용: 될각 판정 4색, Route Blue 1색(내 위치 + 선택 표시)
직각 모서리: 모든 요소 모서리 0 (원형 표식만 예외)
그림자 없는 깊이: 회색 화면 바탕(Page) 위에 테두리 없는 흰 카드를 올려 위계를 만들고(2026-11-22 v2), 그림자는 떠 있는 레이어(모달·바텀시트·토스트·드롭다운)에만 허용
Pretendard 굵기 대비 + 고정폭 숫자
모바일은 하단 탭바, PC는 왼쪽 사이드바 앱 셸
계산 결과에는 항상 "산출 근거" 펼치기가 따라붙는 구조
Colors
Brand & Accent
Ink Black ({colors.primary} — 
#141414): 브랜드 색입니다. 모든 주요 버튼 채움, 제목, 본문, 토스트에 씁니다.
Route Blue ({colors.accent} — 
#0066ff): 유일한 브랜드 액센트이고 "선택됨·여기예요"만 뜻합니다(2026-11-18, lab-stock-app 색 규칙 참고). ① 내 위치: 5 to 9 범위 막대의 내 위치 표시, 입결 비교 차트의 내 점수 선 ② 선택 상태의 표시 막대·테두리: 사이드바 선택 메뉴(왼쪽 3px 막대), 선택된 탭·세그먼트(아래 2px 막대), 선택된 필터 칩(1px 테두리), 하단 탭바 선택 탭 아이콘 ③ 링크, 진행 표시, 강조 아이콘 ④ 핵심 숫자: 홈 "내 요약", 환산 합계처럼 화면에서 가장 중요한 숫자 1~2개(흰 바탕 대비 약 4.8:1이라 글자로 써도 됩니다). 주요 버튼 채움, 판정 배지·경고 안, 장식에는 쓰지 않습니다.
Route Blue Soft ({colors.accent-soft} — 
#e6f0ff): 선택·여기의 옅은 배경입니다. 표에서 내 점수 행, 선택된 행·옵션, 선택된 메뉴·세그먼트·칩의 채움에 쓰고, 글자는 {colors.ink}입니다. Route Blue와 같은 제외 규칙을 따릅니다.
Surface
Canvas ({colors.canvas} — 
#ffffff): 기본 바탕과 카드 배경입니다.
Soft Canvas ({colors.canvas-soft} — 
#f3f3f3): 가장 많이 쓰는 옅은 회색입니다. 하단 탭바, 사이드바 배경, 세그먼트 트랙, 산출 근거 아코디언, 보조 알약 버튼에 씁니다.
Field ({colors.field} — 
#f0f0f0): 입력칸 배경입니다. 선 없이 회색 채움으로 입력칸을 드러냅니다.
Soft Hairline ({colors.hairline-soft} — 
#f0f0f0): 흰 카드 위의 1px 외곽선입니다.
Hairline ({colors.hairline} — 
#e0e0e0): 표의 행 구분선, 테두리 버튼, 입결 컷 기준선에 쓰는 진한 선입니다.
Scrim ({colors.scrim} — rgba(20, 20, 20, 0.4)): 모달과 바텀시트 뒤를 가리는 반투명 막입니다.
Text
Ink ({colors.ink} — 
#141414): 제목, 본문, 표 숫자
Soft Ink ({colors.ink-soft} — 
#262626): 보조 제목, 사이드바 그룹 이름
Muted ({colors.text-muted} — 
#707070): 보조 설명, 단위, 데이터 기준일, 고지 문구
Faint ({colors.text-faint} — 
#adadad): 입력칸 안내 문구, 비활성 상태에만 씁니다. 읽어야 하는 글자에는 쓰지 않습니다(대비 부족).
On Primary ({colors.on-primary} — 
#ffffff): 잉크 바탕 위 글자
Heart ({colors.heart} — 
#f0457a): interest-heart 담김 상태 채움에만 씁니다. 글자·배지·경고·버튼에는 쓰지 않습니다(위험 #b8232a와 구분되는 분홍빛 빨강, 흰 배경 대비 3.6:1).
Delta Up ({colors.delta-up} — 
#d0202b) / Delta Down ({colors.delta-down} — 
#1d4fb8): 전년 대비 숫자 증감에만 씁니다(2026-11-18 사용자 결정, 주식 표기처럼 오름 빨강 · 내림 파랑). 반드시 ▲/▼ 기호 + 차이값과 함께 쓰고(예: "98명 ▼22"), 판정·경고·선택 표시에는 쓰지 않습니다. 바뀐 2028 값은 Bold로 표시합니다. 등급처럼 숫자가 작을수록 상위인 값에 ▲▼를 쓰면 방향 캡션("등급은 숫자가 작을수록 상위예요")을 반드시 함께 둡니다.
Year Ramp — 입결 점 그래프의 연도 구분에만 씁니다(2026-11-20 사용자 결정). 최근 연도 {colors.ink} #141414 · 1년 전 {colors.year-prev} #5c5c5c(흰 바탕 6.7:1) · 2년 전 {colors.year-old} #8c8c8c(흰 바탕 3.4:1). 범례에 연도 이름을 반드시 함께 쓰고, 글자·판정·선택 표시에는 쓰지 않습니다.
Competency — 생기부 AI 3대 역량(2026-11-18 사용자 결정, schs_lms 역량 보기 이식): 학업역량 {colors.comp-academic} #5b5bd6 / 문장 칠 {colors.comp-academic-tint} #e6e6fa · 진로역량 {colors.comp-career} #0e9f6e / {colors.comp-career-tint} #d6f2e6 · 공동체역량 {colors.comp-community} #b58400 / {colors.comp-community-tint} #fbefc7. 생기부 AI 화면에서만 씁니다(문장 칠, 역량 점, 비율 막대). 반드시 역량 이름과 함께 쓰고, 판정·선택·경고에는 쓰지 않습니다.
Semantic — 될각 판정

판정 색은 글자색 + 옅은 배경색 한 쌍으로 쓰고, 반드시 판정 이름(텍스트)과 함께 씁니다. 색만으로 판정을 전달하지 않습니다.

판정	글자 (fg)	배경 (bg)	토큰
안정	
#137a3f	
#e7f5ec	{colors.judge-safe} / {colors.judge-safe-bg}
적정	
#0b6a73	
#e3f4f5	{colors.judge-fit} / {colors.judge-fit-bg}
소신	
#a64c06	
#fdf1e3	{colors.judge-reach} / {colors.judge-reach-bg}
위험	
#b8232a	
#fce9ea	{colors.judge-risk} / {colors.judge-risk-bg}
경계	{colors.ink}	{colors.canvas} + 1px 점선 {colors.ink}	{colors.judge-edge}
판정 없음	{colors.text-muted}	{colors.canvas-soft}	{colors.judge-none}
경고(수시로 조합 경고)는 소신 색 쌍을 씁니다. 수능 최저 미충족은 "수능 최저 판정 배지" 규칙(위험 쌍 ✕)을 따르고, "예상" 같은 예측 표현 대신 "충족 현황"이라고 씁니다.
입력 오류는 위험 색 쌍을 씁니다(글자색 + 입력칸 아래 안내 문구).
완료·검수 완료는 안정 색 쌍을 씁니다.
모든 글자/배경 조합은 명도 대비 4.5:1 이상이어야 합니다. 구현 후 대비 검사 도구로 확인합니다.
등급 표시

등급 색(2026-11-18 사용자 결정): 5 to 9 범위 막대의 1~9 구간 채움에만 등급마다 다른 색을 씁니다. {colors.grade-1} #1b2a6b · {colors.grade-2} #2e3fa3 · {colors.grade-3} #4b4fc8 · {colors.grade-4} #6c5fd6 · {colors.grade-5} #8e6ad8 · {colors.grade-6} #b06cc9 · {colors.grade-7} #cb78b4 · {colors.grade-8} #dc93a6 · {colors.grade-9} #e8b4b0 (남색 → 보라 → 연분홍, 판정색의 초록·청록·주황을 피함). 등급 색은 글자색·판정 배지·경고·grade-chip에는 쓰지 않습니다. grade-chip과 표의 등급 숫자는 지금처럼 숫자 + 굵기 + 칩 모양으로만 구분합니다.

Typography
Font Family

Pretendard만 씁니다. 웹에서는 Pretendard Variable, Figma에서는 고정 굵기(Light 300 · Regular 400 · SemiBold 600 · Bold 700)를 씁니다. Figma 환경에 Pretendard가 없으면 시안은 **IBM Plex Sans KR**을 같은 굵기(Light 300 · Regular 400 · SemiBold 600 · Bold 700)로 씁니다(lab-stock-app과 같은 규칙, 2026-11-18). 출시 제품은 항상 Pretendard입니다. 굵게는 제목과 핵심 숫자에만 — 버튼·탭·라벨은 SemiBold, 본문은 Regular. 대체 글꼴은 -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif입니다.

숫자 규칙: 점수, 등급, 백분율, 날짜가 들어가는 모든 곳에 font-variant-numeric: tabular-nums를 적용합니다. 표와 카드에서 숫자가 세로로 정렬됩니다.

Hierarchy

모바일(기준 390px)과 PC(기준 1440px)의 크기가 다릅니다. 태블릿(600~1023px)은 모바일 값을 씁니다.

Token	모바일	PC	Weight	Line Height	용도
{typography.display}	32px	44px	700	1.3	홈 핵심 숫자(내 환산 9등급 범위 등), 랜딩 헤드라인
{typography.heading-1}	26px	32px	700	1.3	화면 제목
{typography.heading-2}	22px	26px	700	1.35	섹션 제목
{typography.heading-3}	19px	21px	700	1.35	카드 제목, 대학명
{typography.heading-4}	17px	18px	700	1.35	소제목, 전형명
{typography.title}	16px	16px	600	1.4	강조 행, 목록 제목
{typography.body-lg}	17px	18px	300	1.5	리드 문장(굵은 제목 아래 가는 설명)
{typography.body}	15px	15px	400	1.5	기본 본문
{typography.body-sm}	13px	14px	400	1.5	보조 설명, 고지 문구
{typography.table}	14px	14px	400	1.4	표 본문(고정폭 숫자)
{typography.table-head}	12px	13px	600	1.4	표 머리글
{typography.numeric}	20px	24px	700	1.2	카드 속 핵심 점수·등급(고정폭 숫자)
{typography.link}	15px	15px	600	1.5	버튼 글자, 탭 이름, 사이드바 메뉴
{typography.label}	12px	12px	600	1.4	배지, 칩, 판정 이름
{typography.caption}	12px	12px	400	1.4	데이터 기준일, 출처, 메타 정보
Principles
굵기 대비가 위계입니다. 700 제목 아래 300 리드 문장을 두어 색 없이 위계를 만듭니다.
한글 행간을 지킵니다. 제목 1.3~1.35, 본문 1.5입니다.
자간은 0입니다. 어떤 크기에서도 자간을 조절하지 않습니다.
긴 문장은 줄바꿈합니다. 대학명·전형명이 길면 글자를 줄이거나 자간을 좁히지 말고 두 줄로 흘립니다. 표 셀도 같습니다(말줄임은 모바일 목록 한 줄 요약에만 허용하고, 전체 이름은 상세에서 보여줍니다).
Layout
Spacing System
기본 단위: 8px, 미세 조정은 4px
토큰: {spacing.xxs} 4px · {spacing.xs} 8px · {spacing.sm} 12px · {spacing.md} 16px · {spacing.card} 20px(카드 패딩·모바일 좌우 여백) · {spacing.lg} 24px · {spacing.xl} 32px · {spacing.section} 48px · {spacing.section-lg} 64px
버튼: 높이 고정 알약, 좌우 {spacing.md}
입력칸: {spacing.sm} {spacing.md}
표 셀: 모바일 {spacing.xs} {spacing.sm}, PC {spacing.sm} {spacing.md}
섹션 간격: 모바일 {spacing.xl}, PC {spacing.section}
Breakpoints
Token	범위	기준 프레임	주 사용자
{breakpoint.mobile}	360 ~ 599px	390 × 844	학생
{breakpoint.tablet}	600 ~ 1023px	768 × 1024	학생·교사(보조)
{breakpoint.desktop}	1024 ~ 1439px	1280 × 800	교사
{breakpoint.wide}	1440px 이상	1440 × 900	교사 상담·수합
최소 너비는 360px입니다. 이보다 좁아도 가로 스크롤이 생기면 안 됩니다(단, 넓은 데이터 표는 표 안에서만 가로 스크롤 허용).
Figma 핵심 화면은 모바일 390과 PC 1440 두 프레임을 모두 그립니다.
Grid & Container
구간	열	여백(gutter)	좌우 패딩	콘텐츠 최대 너비
mobile	4	16px	16px	100%
tablet	8	16px	24px	100%
desktop	12	24px	32px	1200px (사이드바 제외)
wide	12	24px	32px	1200px, 데이터 화면은 최대 폭 제한 없음
읽는 화면(전형 상세, AI 분석 결과)은 본문 폭을 최대 720px로 제한해 줄이 너무 길어지지 않게 합니다.
데이터 화면(성적 입력 표, 학급 대시보드, 카드 수합 보드, 결과 집계)은 화면 폭을 모두 씁니다.
App Shell

모바일 (mobile)

상단 앱바 56px: 화면 제목({typography.heading-4}), 왼쪽 뒤로가기, 오른쪽 보조 동작 1개
하단 탭바(tab-bar-pill): 화면 아래에 떠 있는 알약 막대입니다. 탭은 대분류 다섯 개입니다: 홈 · 성적 · 대학 찾기 · 수시 전략 · 더보기(교사 모드·설정·잠금). 교사 모드에서는 홈 대신 우리 반 · 성적 관리 · 수합·집계 · 더보기입니다. 소분류는 상단 앱바 바로 아래 `sub-nav`(가로 탭)로 고릅니다. 상세 화면(뒤로가기 있는 화면)에는 sub-nav를 두지 않습니다.
내비게이션은 대분류-소분류 2단계입니다(2026-11-18 사용자 결정).
학생 대분류: 홈 / 성적(성적 입력 · 성적 추이 · 5 to 9 · 대학별 환산 · 모의고사) / 대학 찾기(전형계획 · 수시 입결 · 학과별 구간 · 계열 모아보기 · 될각 · 최저로 찾기) / 수시 전략(수시로 · 생기부 AI). 학과별 구간 소분류 아이콘은 icon/layers(2026-11-23 사용자 결정, 수시 전략 icon/layout-grid와 겹치지 않게), 계열 모아보기 소분류 아이콘은 icon/folder(2026-11-23 사용자 결정, icon/layers · icon/layout-grid와 겹치지 않게).
교사 대분류(교사 모드에서만): 우리 반(우리 반 홈 · 학생 기록 · 학생 상담 · 누가기록) / 성적 관리(성적 불러오기 · 수능 최저 판정 · 모의고사 수합) / 수합·집계(카드 수합 · 결과 집계). 학생 기록 상세는 우리 반 아래의 상세 화면입니다.
관리자 대분류(관리자 계정에서만): 규칙 관리(규칙 편집기 · 검수).
하단 안전 영역(safe-area)을 지킵니다.

태블릿 (tablet)

왼쪽 아이콘 레일 72px(아이콘 + 짧은 이름)과 상단 앱바를 씁니다. 하단 탭바는 숨깁니다.

PC (desktop · wide)

왼쪽 사이드바 248px, {colors.canvas} 배경 + 오른쪽 1px {colors.hairline-soft}입니다(2026-11-22 v2). 접으면 72px 레일이 됩니다.
사이드바는 대분류 행(`sidebar-group`)과 그 아래 소분류 행(`sidebar-item`, 들여쓰기 16)으로 됩니다. 지금 화면이 속한 대분류만 펼치고 나머지는 접습니다(누르면 펼침). 학생: 홈 / 성적 / 대학 찾기 / 수시 전략
교사(교사 모드에서만): 우리 반 / 성적 관리 / 수합·집계 (소분류는 App Shell 모바일 절의 표 참조, PRD 6-12). 상단 바 제목 앞에 경로 "대분류 › 소분류"를 {typography.caption} {colors.text-muted}로 보여줍니다.
선택된 메뉴는 {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + {colors.ink} 글자
상단 바 대신 page-header를 씁니다(2026-11-22 v2): 페이지 제목, 데이터 기준일 배지, 모드 전환(학생 · 교사 세그먼트), 잠금 버튼
오른쪽 보조 패널(선택) 360px: 산출 근거, 수시로 경고, 학생 상담 메모처럼 본문과 나란히 봐야 하는 내용

로그인·회원가입(교사·관리자, 2026-11-18): lab-stock-app 화면을 그대로 따릅니다 — PC는 상단 web-header(워드마크 + 오른쪽 회원가입/로그인 버튼) + 왼쪽 반 폼(폭 440) / 오른쪽 반 {colors.canvas-soft} 서비스 소개 패널(제목 + 리드 + 소개 카드 4장, U:NAVI 내용), 모바일은 nav-pill + 폼만. 로그인 전 화면에는 탭바·사이드바·sub-nav가 없습니다. 모서리 0 등 이 문서의 규칙을 따릅니다.

공개 페이지(랜딩·전형계획 둘러보기, 로그인 없음)

PC에서는 위에 떠 있는 nav-pill을 쓰고, 모바일에서는 로고 + 메뉴만 남깁니다.
페이지 맨 아래는 잉크색 footer로 마무리합니다(앱 화면에는 푸터를 두지 않음).
Responsive Strategy — 화면별 구성
화면	모바일	PC
홈	내 요약 카드(환산 9등급 범위 display) → 5 to 9 미니 막대 → D-day → 바로가기 카드 세로 나열	2열: 왼쪽 내 요약 + 5 to 9 막대, 오른쪽 D-day + 관심 대학 될각 요약
성적 입력	학기 세그먼트 → 과목 카드 목록 → 카드를 누르면 바텀시트 편집기	스프레드시트형 표: 키보드 이동(Tab·Enter·방향키), 엑셀 붙여넣기, 열 고정
5 to 9	범위 막대 → 방법별 값 카드 세로 나열 → 근거 아코디언	범위 막대 크게 + 방법 비교 표 + 오른쪽 근거 패널
대학별 환산	대학 카드 목록(대학·전형·점수) → 누르면 전체 화면 상세 + 산출 근거 아코디언	표(대학·전형·교과·출결·합계·순위 차이) + 행 선택 시 오른쪽 산출 근거 패널
될각	교과 · 종합 세그먼트 → 판정별 그룹 목록(안정→위험) + 필터 바텀시트	왼쪽 필터 + 판정 4열 레인(judge-lane) 또는 표 보기 전환
학과별 구간표(2026-11-23 학과별 입결 구간표)	대계열(인문 · 자연) 세그먼트 → 학과 묶음 바텀시트 → 구간 폭 세그먼트(직접 → 아래 입력칸) → 층 카드(한 줄 3칸, 넘치면 줄바꿈) → 근거 아코디언	대계열 세그먼트 + 중계열 · 소계열 칩 + 구간 폭 세그먼트(직접 → 오른쪽 입력칸) → 왼쪽 축(구간) + 층(한 줄 최대 6칸) → 근거 아코디언
특수 계열 모아보기(2026-11-23)	묶음 filter-chip 가로 스크롤 한 줄(9개, 줄바꿈 없음) → 묶음 머리(설명 · 합계 · 기준일) → 교과 · 종합 세그먼트 + 세부 · 정렬 바텀시트 → univ-card 목록 변형 → 카드를 누르면 바텀시트(체육 · 예체능 실기는 실기 과목 · 채점 기준 섹션, 과목별 펼침) → 근거 아코디언	묶음 filter-chip 한 줄 + 세부 filter-chip 줄(오른쪽 끝 교과 · 종합 세그먼트) → 묶음 머리 → data-table(대학 · 모집단위 · 2028 전형 · 모집 · 70% 컷 · 경쟁률 · 충원율 · 기준) → 행을 누르면 모달(실기 섹션이 있으면 size=wide, 왼쪽 요약 · 오른쪽 실기 과목 · 채점 기준) → 근거 아코디언
수시로	6칸 세로 목록 + 상단 고정 경고 요약 바, 길게 눌러 순서 변경	3×2 카드 그리드 + 오른쪽 경고 패널, 끌어서 순서 변경, A·B·C안 탭
생기부 AI	붙여넣기 → 가림 확인 → 결과(역량 카드 → 근거 인용 → 면접 질문) 단계형	왼쪽 원문(가림 표시), 오른쪽 결과. 근거 인용을 누르면 원문 위치로 이동
교사 대시보드·카드 수합·결과 집계	보기 전용 요약 + "PC에서 열면 전체 기능을 쓸 수 있어요" 안내	전체 기능. 첫 열(학생) 고정 표, 위험 경고 학생 먼저 정렬
학생 상담	학생 요약 카드 + 상담 메모 입력만	3단: 학생 요약 / 될각·수시로 / 상담 메모 타임라인

공통 원칙

표는 모바일에서 카드 목록으로 바뀝니다. 같은 데이터를 행 대신 카드로 보여줍니다. 다만 교사용 넓은 표는 표 안 가로 스크롤 + 첫 열 고정으로 둡니다.
PC의 오른쪽 보조 패널은 모바일에서 아코디언 또는 전체 화면 상세가 됩니다.
PC의 모달은 모바일에서 바텀시트가 됩니다.
여러 열 그리드는 가로로 줄이지 않고 열 수를 줄입니다(3열 → 2열 → 1열).
Touch & Pointer Targets
모바일: 누를 수 있는 요소는 최소 44 × 44px
PC: 표 안 컨트롤은 최소 32px 높이, 그 밖의 버튼은 40px 이상
세그먼트 토글은 선택지 하나하나가 알약 전체 크기의 터치 영역입니다.
Whitespace Philosophy

여백이 가장 중요한 묶음 장치입니다. 섹션 사이에 구분선을 넣지 않고 빈 공간으로 나눕니다. 다만 데이터 화면은 촘촘해도 됩니다. 성적 표와 학급 대시보드는 행 간격을 좁게 두고, 대신 행 구분선({colors.hairline})과 고정 열로 읽기 쉽게 만듭니다. 설명 화면은 여유 있게, 데이터 화면은 촘촘하게 둡니다.

Elevation & Depth
Level	처리	용도
Page	{colors.canvas-soft} 화면 바탕	앱 셸 안 콘텐츠 영역 전체(2026-11-22 v2). 흰 카드·표·차트 묶음이 이 위에 놓입니다
0	{colors.canvas} 위 평면	카드 안쪽, 로그인 전 화면
1	{colors.canvas-soft} 채움, 선 없음	흰 카드 안의 보조 면: 세그먼트 트랙, 근거 아코디언, 보조 버튼, 표 머리글
2	흰 카드, 선 없음(Page 바탕 위). 흰 바탕 위에 놓일 때만 1px {colors.hairline-soft} 외곽선	대학 카드, 수시로 슬롯 카드, 통계 카드, 표·차트 묶음(2026-11-22 v2)
3	1px {colors.ink} 안쪽 테두리	선택된 카드, 표에서 선택된 행
Overlay	{colors.canvas} + {shadow.overlay}	모달, 바텀시트, 드롭다운, 토스트(그림자 허용 유일 단계)
Inverse	{colors.ink} 채움 + {colors.on-primary} 글자	주요 버튼, 공개 페이지 푸터, 토스트
Selected	{colors.accent-soft} 채움 + {colors.accent} 표시 막대·테두리	사이드바 선택 메뉴, 선택된 세그먼트·탭·필터 칩, 선택 행
{colors.canvas-soft} 채움 요소(data-status-badge, 5등급 grade-chip, segmented-control·mode-switch 트랙, button-pill-soft, text-input({colors.field}))가 Page 바탕 위에 직접 놓이면 채움을 {colors.canvas}로 바꿔 바탕과 구분합니다(2026-11-22 v2). 흰 카드 안에서는 그대로 {colors.canvas-soft}입니다.
{shadow.overlay}: 0 8px 24px rgba(20, 20, 20, 0.12). 화면 위에 떠서 다른 내용을 가리는 레이어에만 씁니다.
세그먼트 토글의 선택된 칸은 {colors.accent-soft} 채움 + 아래 2px {colors.accent} 막대 + {colors.ink} 글자이고 그림자는 없습니다.
그 밖의 카드, 버튼, 사이드바에는 그림자를 쓰지 않습니다.
Shapes
Border Radius Scale
Token	값	용도
2026-11-18부터 모든 모서리 토큰은 0입니다. 토큰 이름은 문서 호환을 위해 남기며, 이 문서에서 "알약"은 "직각 버튼/칩"으로 읽습니다.
{rounded.none}	0px	모든 요소
{rounded.xs}	0px	(=none)
{rounded.sm}	0px	(=none)
{rounded.md}	0px	(=none)
{rounded.full}	0px	(=none)
원형 표식(판정 아이콘 ●, 내 위치 점, 5단계 점, 범위 막대 위 방법별 점, counsel-timeline 마디 점, cut-dot-plot 원 점)만 Figma ELLIPSE로 그립니다.
대학 표시
대학은 실제 대학 로고(univ-logo, SVG)로 표시합니다(2026-11-18 사용자 결정 — 비상업 배포 전제. 상업 배포로 바뀌면 대학별 사용 허락이 필요합니다). 로고는 원본 색·비율 그대로 쓰고, 로고 색은 팔레트 예외입니다. 로고 파일이 없는 대학만 대학 이름 첫 글자를 넣은 모노그램 정사각형(univ-monogram, 모서리 0)을 씁니다. {colors.canvas-soft} 바탕 + {colors.ink} 글자입니다.
Components
Buttons

button-primary — "성적 입력하기", "수시로에 담기", "상담카드 보내기"

채움 {colors.primary}, 글자 {colors.on-primary} {typography.link}, 모서리 0, 높이 모바일 52px · PC 44px
한 화면에 주요 버튼은 하나만 둡니다.

button-outline — "엑셀 불러오기", "B안으로 복제"

채움 {colors.canvas}, 글자 {colors.ink}, 1px {colors.hairline}, {rounded.full}

button-pill-soft — "산출 근거 보기", "원문 보기 ↗", "필터"

채움 {colors.canvas-soft}, 글자 {colors.ink}, 선 없음, {rounded.full}

button-danger-text — "이 기기에서 학급 데이터 지우기"

배경 없음, 글자 {colors.judge-risk}. 누르면 반드시 확인 모달을 띄웁니다.
Inputs & Forms

text-input / text-input-focused

{colors.field} 채움, 선 없음, {rounded.sm}, {spacing.sm} {spacing.md}
변형(2026-11-23 학과별 입결 구간표): on=card(기본, {colors.field} 채움) | page(Page 바탕 위에 직접 놓일 때 {colors.canvas} 채움, Elevation 규칙). 높이 size=lg 48(기본) | md 44(모바일 한 줄 입력) | sm 40(PC 툴바 안 짧은 입력). text-input-error도 같은 변형을 따릅니다.
포커스 시 2px {colors.ink} 링

text-input-error

2px {colors.judge-risk} 링 + 아래에 {typography.caption} {colors.judge-risk} 안내 문구(예: "분포비율 합이 100%가 아니에요 (98.5%)")

grade-input-table — 성적 입력 표(PC)

컨테이너 {rounded.sm} + 1px {colors.hairline} 외곽선, 내부 셀은 각지게
머리글 {colors.canvas-soft} + {typography.table-head}, 첫 열(과목명) 고정
셀 편집 시 셀 전체에 2px 잉크 링, 오류 셀은 {colors.judge-risk-bg} 채움
석차등급 미산출 과목의 등급 칸은 {colors.canvas-soft} 빗금 + "미산출" 캡션(입력 불가)
과목 유형 열에 subject-type-chip(공통·일반·진로·융합·체육예술·과탐실험·교양)

subject-card — 성적 입력(모바일). 변형 density=compact(2026-11-22 v2): 패딩 12·16, 카드 사이 선 하나로 이어지는 목록(첫 화면에 5과목 이상)

흰 카드 + 1px {colors.hairline-soft}, {rounded.md}
과목명 {typography.title}, 아래 줄에 학점 · 성취도 · 등급 칩, 오른쪽에 원점수/평균
누르면 bottom-sheet로 편집

segmented-control + segmented-control-active — 교과 · 종합, 1학년 · 2학년 · 3학년, 학생 · 교사

{colors.canvas-soft} 알약 트랙 안에 선택지 알약들. 선택된 것은 {colors.accent-soft} 채움 + 아래 2px {colors.accent} 막대 + {colors.ink} 글자, 나머지는 {colors.text-muted}
Data Display

grade-chip — 등급 표시

알약, 높이 24px, {typography.label} 고정폭 숫자
5등급: {colors.canvas-soft} 채움 + "5등급제" 의미의 꼬리표 없음(기본)
9등급 환산값: 1px {colors.ink} 외곽선 + 흰 바탕 + 숫자 뒤 "9" 작은 첨자(예: 2.45₉)
등급 숫자에 색을 넣지 않습니다.

stat-tile — 홈 내 요약, 대시보드 숫자

라벨 {typography.caption} {colors.text-muted} → 값 {typography.numeric} → 보조 설명 {typography.body-sm}
내 위치 값과 화면의 핵심 숫자만 {colors.accent} 글자를 허용합니다.
변형 hero(2026-11-22 v2): 화면 맨 위 한 곳에만 둡니다. 카드 없이 Page 바탕 위에 라벨 → 값 {typography.display} → 해석 한 줄 {typography.body} {colors.ink}(예: "5등급 평균 2.1을 옮긴 범위예요"). 한 화면에 hero는 1개입니다.
변형 filter(2026-11-22 v2): 타일 줄이 아래 목록을 거를 때만 씁니다. 선택된 타일 1개 = Elevation Selected 처리, 나머지 = 흰 카드. 판정 개수 타일은 값 앞에 판정 아이콘과 판정 글자색을 씁니다(안정·충족 ● / 적정·근접 ◐ / 소신 ▲ / 위험·미충족 ■, 자료 부족은 아이콘 없음).
목록을 거르지 않는 같은 무게의 타일을 3개 이상 늘어놓지 않습니다. 그럴 땐 hero 1개 + 보조 숫자 한 줄(라벨 · 값)로 줄입니다.

range-bar-5to9 — 5 to 9 핵심 컴포넌트

1~9 구간을 {colors.grade-1}~{colors.grade-9}로 채운 트랙(높이 12, 모서리 0), 눈금 숫자는 트랙 아래 {typography.caption} {colors.ink}
방법별 추정값(A-1, A-2, A-3, B)은 트랙 위 작은 잉크 점(흰 1px 테두리), 그 사이 범위는 트랙 위쪽 2px {colors.ink} 괄호선
내 위치(대표값)는 {colors.accent} 원형(지름 20) + 흰 3px 테두리 + 바깥 1px {colors.ink} 선(색 트랙 위에서도 보이게) + 트랙을 위아래로 가로지르는 2px {colors.ink} 세로선 + 위쪽 말풍선 숫자(2026-11-22 v2)
아래에 신뢰도 배지(높음/보통/낮음, 흑백 알약)
모바일에서는 트랙이 화면 폭 전체, PC에서는 최대 720px

cut-compare-bar — 될각 상세의 입결 비교

가로 눈금 막대 위에 50% 컷·70% 컷을 {colors.hairline} 세로선 + 캡션으로, 내 환산값 범위를 {colors.accent} 구간으로 표시
판정 배지는 막대 오른쪽에 둡니다.

judge-badge — 될각 판정

알약, {typography.label}, 판정 색 쌍(fg 글자 + bg 채움), 왼쪽에 판정 아이콘
아이콘: 안정 ●, 적정 ◐, 소신 ▲, 위험 ■, 경계는 점선 외곽선 알약 + "경계"
크기(2026-11-22 v2): 기본 = {typography.label} 높이 24. size=lg = {typography.title} 높이 32, 카드 머리 줄(univ-card 첫 줄)에 씁니다. compact = 채움 없이 판정 글자색 아이콘 + 판정 이름 {typography.label}, 판정 칸이 많은 data-table에 씁니다(색 + 아이콘 + 이름은 그대로).
종합전형은 "적합도 높음/보통/낮음"으로 표시하고 색은 안정/적정/소신 쌍을 재사용

수능 최저 판정 배지(2026-11-18, 아이콘 2026-11-23 사용자 결정): judge-badge 색 쌍을 재사용 — 충족 = 안정 쌍 ● / 근접 = 적정 쌍 ▲(속이 찬 세모) / 미충족 = 위험 쌍 ✕ / 자료 부족·판정 불가 = 판정 없음 쌍(아이콘 없음, 이름만). 문구는 "충족 현황"(예측 표현 금지). 학생 화면(최저로 찾기·모의고사)은 검수 전 기준을 판정하지 않고 "검수 전이라 판정하지 않은 전형 n개"와 "준비 중" data-status-badge로 개수만 보여 줍니다. 교사 화면(수능 최저 판정)은 교사 입력 기준을 "미검수" 배지와 함께 판정합니다.

grade-trend-chart — 등급 추이 선 차트(2026-11-18): 세로축 등급(1이 위, 내신 1~5 / 모의고사 1~9 눈금. 기본 보기는 데이터 범위 ±0.5로 좁히고 전체 눈금은 토글(2026-11-22 v2)), 가로축 학기 또는 시험 회차. 선택한 계열 1개만 2px {colors.accent} 선 + 점, 나머지 계열은 1px {colors.text-faint} 선 + 선 끝 이름표(계열을 색으로 구분하지 않음). 가장 최근 점에 값 라벨. 기준선은 1px {colors.hairline} 점선 + 캡션 1개. 차트 아래 같은 값의 data-table(대체 텍스트 역할). 모서리 0, 그림자 없음.

cut-dot-plot — 입결 점 그래프(2026-11-18 사용자 요청 "점으로 다 찍혀서 학교별로 어느 과 몇 점대인지 한눈에"): 가로축 9등급(1이 왼쪽, 0.5 눈금 {typography.caption} {colors.ink}, 세로 1px {colors.hairline-soft} 격자), 세로축 행 = 대학(또는 대학·학과) 한 줄씩, 행 머리 = univ-logo 20 + 이름(한 줄). 점 = 학과·전형 하나의 입결 컷(기본 70% 컷), 지름 11(2026-11-22 v2), {colors.ink}. 전형 유형은 탭(교과 · 종합 · 논술 · 기타 · 전체)으로 거르고, 전체일 때만 점 모양으로 구분합니다: 교과 ● 채운 원, 종합 ○ 빈 원(1.5px), 논술 ◆ 채운 마름모, 기타 ◇ 빈 마름모 + 그래프 위 범례. 최근 3년을 같이 볼 때 자료가 있는 가장 최근 연도 = {colors.ink}, 1년 전 = {colors.year-prev}, 2년 전 = {colors.year-old} 같은 모양(흰 바탕 그래픽 대비 3:1 이상), 연도 점 사이 1px {colors.text-muted} 선. 내 위치 = 환산 범위 {colors.accent-soft} 세로 띠 + 대표값 2px {colors.accent} 세로선 + 위 말풍선. 점을 누르면 말풍선(대학 · 학과 · 전형 · 연도 · 컷 · 모집인원). 판정 이름·판정 색은 쓰지 않습니다(될각과 섞이지 않게). 검수 전 데이터는 점을 찍지 않고 행 끝에 "준비 중" data-status-badge. 표 보기(data-table)와 같은 데이터를 세그먼트로 전환합니다.

placement-board — 배치표(2026-11-18 사용자 요청 "모든 대학을 좌표로 찍어 예전 정시 배치표 같은 느낌"): 세로축 = 환산 9등급(1이 위, 0.1 눈금, 0.5마다 {colors.hairline-soft} 가로 격자, 왼쪽 축 라벨 {typography.caption} {colors.ink}), 가로 = 열(기본 계열: 인문 · 사회 · 자연 · 공학 · 의약 · 예체능), 열 머리 {typography.label}. 칸 = 대학·학과 이름표(univ-logo 16 + "대학 학과" {typography.caption}, 한 줄 말줄임, 모서리 0, 채움 없음)를 그 학과 입결 컷(기본 70% 컷) 높이에 놓습니다. 같은 높이에서 겹치면 아래로 한 줄씩 밀어 쌓고 순서는 컷 순서를 지킵니다. 내 위치 = 모든 열을 가로지르는 {colors.accent-soft} 띠(환산 범위) + 2px {colors.accent} 가로선(대표값) + 축 옆 말풍선. 전형 유형 탭(교과 · 종합 · 논술 · 기타 · 전체)으로 거르고, 전체일 때만 이름표 앞에 모양 표시(● 교과 ○ 종합 ◆ 논술 ◇ 기타) + 범례. 기본 보기는 내 위치 ±1.0등급, 세로 스크롤로 1~9 전체. 판정 이름·판정 색은 쓰지 않습니다(될각과 섞이지 않게). 검수 전 데이터는 이름표 없이 열 아래 "준비 중 n개" data-status-badge. 모바일은 열 하나를 segmented-control로 골라 봅니다. 표 보기(data-table)·대학별 점 보기(cut-dot-plot)와 같은 데이터이며 보기 전환 segmented-control(표 · 배치표 · 대학별 점)로 바꿉니다.
placement-board 변형 layer(2026-11-23 학과별 입결 구간표): 한 학과 묶음(대계열 › 중계열 › 소계열)의 공개 입결을 구간 층으로 쌓습니다. 새 토큰 없음. 배치표와 같은 점: 칸 = 로고 + 학과 이름 + 컷, 판정 이름 · 판정 색 금지, 검수 전은 "준비 중 n개" data-status-badge, 내 위치 = {colors.accent-soft} 띠 + 2px {colors.accent} 선 + 말풍선(검수된 환산이 없으면 "준비 중"). 다른 점: ① 세로축 대신 구간 층. 구간 폭은 학생이 segmented-control "구간 폭"으로 고릅니다(0.1 · 0.2 · 0.3 · 0.5 · 직접, 기본 0.5). "직접"을 고르면 모바일은 세그먼트 아래, PC는 오른쪽에 text-input이 열려 0.05~1.0 사이 값을 소수 둘째 자리까지 넣습니다. 범위 밖 · 형식 오류는 text-input-error(입력칸 아래 안내 문구)로 알리고 표는 직전 폭을 유지합니다. 고른 폭과 직접 넣은 값은 이 기기에만 기억합니다. 경계는 1.0부터 폭만큼, 아래 경계 포함 · 위 경계 미포함(9.0은 마지막 층), 표기 자릿수는 폭의 소수 자릿수에 맞춥니다(0.2 → 2.4~2.6, 0.25 → 2.50~2.75). 층이 많아도 접거나 줄이지 않고 위 층부터 세로 스크롤합니다. 층은 데이터의 가장 작은 컷~가장 큰 컷 범위 안에만 만들고, 그 안의 빈 층은 지우지 않고 "이 구간에는 공개된 입결이 없어요" 한 줄. 층 사이 1px {colors.hairline} ② 열 없이 한 학과 묶음만, 층 안 칸은 가운데 정렬 · 가나다순(칸 수에 따라 피라미드 모양이 생깁니다) ③ 칸 = 세로 스택(univ-logo 32 → 대학명 {typography.caption} → 그 대학이 실제로 쓰는 모집단위 이름 {typography.body-sm} 두 줄까지(단어 단위 줄바꿈, 넘치면 둘째 줄 말줄임) → 70% 컷 {typography.title}), 채움 없음, 1px {colors.hairline-soft} 테두리, 모서리 0, 모바일 한 줄 3칸 · PC 최대 6칸, 같은 대학 같은 소계열 모집단위가 여럿이면 각각 칸 ④ 층 머리 = "70% 컷 a~b" {typography.label} + "모집단위 n개" {typography.caption} {colors.text-muted}, PC는 왼쪽 축 칸 120 ⑤ 순번 · 트로피 · 층별 색 · S/A/B 같은 등급 이름 금지. 칸을 누르면 그 대학 상세로 갑니다.

judge-lane — 될각 PC 레인 보기

판정별 세로 열 4개, 열 머리에 judge-badge + 개수, 열 안에 univ-card

univ-card — 대학·전형 카드. 공개 변형(판정 없음)(2026-11-22 v2): 판정 머리 줄 없이 로고 + 대학명이 첫 줄, 판정·내 위치가 없는 전형계획 목록에 씁니다
univ-card 비교 변형(2026-11-23 대학 상세 위키): 공개 변형에서 interest-heart와 하단 버튼을 빼고, 둘째 줄 = 모집단위 · 전형 유형 · 계열 관계(같은 계열 / 관련 계열) {typography.body-sm} {colors.text-muted}, 셋째 줄 = 70% 컷 + 기준 대비 차이(부호 포함, 예: +0.1) {typography.title} {colors.ink}. 차이에는 판정 색·Route Blue·순위 번호를 쓰지 않습니다. 카드 전체가 그 대학 상세로 가는 링크(오른쪽 ›)입니다. "입결이 비슷한 대학" 목록에만 씁니다.
univ-card 목록 변형(2026-11-23 특수 계열 모아보기): 공개 변형에서 하단 "수시로에 담기" 버튼을 빼고 interest-heart는 둡니다. 카드 하나가 모집단위 하나입니다. 첫 줄 = 로고 + 대학명 {typography.heading-3}, 둘째 줄 = 모집단위 이름 {typography.title} {colors.ink}(사실 태그가 있으면 그 아래 data-status-badge 변형 fact 1개), 셋째 줄 = 2028 전형 유형별 모집인원 {typography.body-sm} {colors.text-muted}, 넷째 줄 = 위 1px {colors.hairline-soft} 아래 라벨/값 두 쌍(70% 컷 · 경쟁률, 라벨 {typography.caption} {colors.text-muted}, 값 {typography.numeric} {colors.ink} 고정폭, 값이 없으면 "미공개" 같은 글자 {typography.body-sm} {colors.text-muted}). 판정 · Route Blue · 순위 번호를 쓰지 않습니다. 카드 전체가 상세(모바일 bottom-sheet)로 가는 링크(오른쪽 ›)입니다. data-table을 모바일에서 카드 목록으로 바꿀 때, 판정이 없는 공개 목록에 씁니다.

흰 카드 + 1px {colors.hairline-soft}, {rounded.md}, 패딩 {spacing.md}(모바일) / {spacing.lg}(PC)
왼쪽 univ-logo(로고 파일이 없으면 univ-monogram), 대학명 {typography.heading-3}, 전형·모집단위 {typography.body-sm} {colors.text-muted}
첫 줄 = judge-badge size=lg(판정이 카드의 머리)(2026-11-22 v2), 둘째 줄 = 로고 + 대학명, 아래 줄에 핵심 숫자(내 환산 / 70% 컷) {typography.title} {colors.ink} + 수능최저 배지. 카드 안 숫자에는 Route Blue를 쓰지 않고, Route Blue는 cut-compare-bar의 내 위치 구간에만 씁니다.
관심 담기(2026-11-18): 카드 오른쪽 위 interest-heart(icon/heart, 터치 영역 44×44). 안 담김 = {colors.ink} 선 하트, 담김 = {colors.heart} 채운 하트(관심 표시 전용 색, 2026-11-18 사용자 결정). 전형계획·대학 상세·될각·대학별 환산의 "관심 담기"는 모두 이 하트로 합니다.
하단 button-pill-soft "수시로에 담기"

data-status-badge — 시행계획 기준 · 모집요강 반영 · 환산 규칙 준비 중

흑백 알약({colors.canvas-soft} + {colors.text-muted}). 데이터 상태는 판정 색을 쓰지 않습니다.
같은 상태가 한 표·목록에서 3칸 이상 반복되면 칸마다 붙이지 않고, 그 묶음 위에 한 줄("준비 중인 항목 12개 — 검수가 끝나면 채워져요")로 묶습니다(2026-11-22 v2).
변형 fact(2026-11-23 특수 계열 모아보기): 모집단위의 성격을 사실로만 적는 태그입니다(예: 채용 조건형 · 의무 복무 조건 · 특수법 설립 · 초등교원 양성). 채움 {colors.canvas} + 1px {colors.hairline} 외곽선 + {colors.ink-soft} 글자 {typography.label}, 높이 20, 좌우 패딩 {spacing.xs}, 모서리 0이고, Page 바탕 위에서도 같은 모양입니다. 판정 색 · Route Blue · 아이콘을 쓰지 않고, 근거(원문 쪽수 또는 법령)가 관리자 검수 자료에 있을 때만 붙입니다. 한 행 · 카드에 1개까지이고 모집단위 이름 바로 아래에 둡니다. 데이터 상태(준비 중 · 기준일)에는 쓰지 않습니다.

data-table — 대학별 환산, 학급 대시보드, 카드 수합, 결과 집계

흰 카드 안에 둡니다(2026-11-22 v2). 머리글 {colors.canvas-soft}, 행 구분 1px {colors.hairline}, 본문 {typography.table} 고정폭 숫자, 숫자 열 오른쪽 정렬
판정 칸이 한 화면에 10개를 넘으면 judge-badge compact를 씁니다. 주의가 필요한 행(위험·미충족·미제출)은 행 첫 칸 앞에 판정 아이콘을 둬서 먼저 읽히게 합니다.
기준 행(2026-11-23 대학 상세 위키): 채움 없이 Elevation 3(1px {colors.ink} 안쪽 테두리) + 첫 칸 위 "지금 보고 있는 학과" {typography.caption} {colors.text-muted}. 비교 목록의 기준 항목에만 쓰고 선택 행과 함께 쓰지 않습니다.
선택 행: {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + 아래 1px {colors.hairline}(Elevation Selected 규칙, 2026-11-18). 내 점수 행(학생 화면): {colors.accent-soft} 채움
변형 expand(2026-11-23 특수 계열 모아보기): 행마다 딸린 세부 표가 있을 때 씁니다(예: 실기 과목 행 → 그 과목의 채점 기준 표). 행 오른쪽 끝에 펼침 표시 ▾(접힘) / ▴(펼침) {colors.ink}, 행 전체가 누르는 영역(모바일 44 이상)입니다. 펼치면 그 행 바로 아래에 {colors.canvas-soft} 채움 영역(좌우 패딩 {spacing.sm}, 위아래 {spacing.xs})이 열리고, 안에 같은 규칙의 작은 data-table(행 높이 40, 머리글 {colors.canvas} + {typography.table-head})을 둡니다. 처음엔 모두 접혀 있고 여러 행을 동시에 펼칠 수 있습니다. 펼친 행은 선택 행이 아니라서 Route Blue · accent-soft를 쓰지 않습니다. 산출 근거 설명에는 이 변형 대신 trace-accordion을 씁니다.
첫 열 고정, 머리글 고정, 정렬 가능한 열에는 정렬 화살표
모바일에서는 univ-card 또는 student-row-card 목록으로 바뀝니다.
계산 근거

trace-accordion — 산출 근거 펼치기

{colors.canvas-soft} 막대, {rounded.sm}, 제목 "어떻게 계산했나요?" + 펼침 화살표. 고르는 기준을 설명할 때는 제목을 "어떻게 골랐나요?"로 바꿉니다(2026-11-23 대학 상세 위키). 숫자를 구간으로 나눈 기준을 설명할 때는 "어떻게 나눴나요?"(2026-11-23 학과별 입결 구간표), 모집단위를 묶음에 넣은 기준을 설명할 때는 "어떻게 묶었나요?"(2026-11-23 특수 계열 모아보기)
펼치면 단계별 줄: 단계 이름({typography.body-sm} {colors.text-muted}) → 수식/값({typography.table} 고정폭)
마지막 줄은 최종값 굵게 + 위에 1px {colors.hairline}
맨 아래 disclaimer-note

disclaimer-note — "대학 공식 자료가 최종 기준이에요 · 데이터 기준일 2026-11-18"

{typography.caption} {colors.text-muted}, 앞에 ⓘ 아이콘. 환산·판정이 나오는 모든 화면 하단에 둡니다.
수시로

susi-slot — 6칸 중 한 칸

채워진 칸: univ-card의 축약형 + 칸 번호(1~6), 우선순위, 고사일 칩
빈 칸: 1px 점선 {colors.hairline} + {rounded.md} + 가운데 "+ 대학 담기" {colors.text-muted}
6회 제한 제외 기관 칸은 보드 아래 별도 줄에 두고, 칸 머리에 "6회 제외" 흑백 칩

warning-callout — 조합 경고

{colors.judge-reach-bg} 채움, {rounded.sm}, 왼쪽 ▲ 아이콘 + {colors.judge-reach} 제목 + {colors.ink} 설명
경고를 누르면 관련 칸이 1px 잉크 테두리로 강조됩니다.
모바일: 보드 위 고정 요약 바("경고 2개") → 누르면 바텀시트로 목록
PC: 오른쪽 보조 패널에 목록

scenario-tabs — A안 · B안 · C안

segmented-control과 같은 모양, 오른쪽 끝에 "+ 새 안" button-pill-soft
생기부 AI

mask-preview — 개인정보 가림 확인

원문 위에 가려진 단어를 {colors.ink} 알약 블록(■■■)으로 표시, 누르면 가림 해제/추가 토글
하단 체크박스 "가린 내용을 확인했어요"를 체크해야 주요 버튼이 켜집니다.

competency-card — 역량 진단

역량 1개 묶음(2026-11-18 개편): 머리 행 = 역량 색 점(8px ELLIPSE) + 역량 이름 {typography.heading-4} + 오른쪽 "n문장" {typography.caption}, 아래 평가항목 행(대교협 공통 평가요소 — 학업: 학업성취도·학업태도·탐구력 / 진로: 교과 이수 노력·교과 성취도·진로 탐색 / 공동체: 협업과 소통·나눔과 배려·성실·규칙준수·리더십) = 항목 이름 {typography.body-sm} + 문장 수(고정폭 숫자). 문장 0개 항목은 {colors.text-muted}. 선택(초점) = {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대. 점수·5단계 점·등급은 쓰지 않고 문장 수만 보여줍니다(평가 결과로 읽히지 않게, NEVER-2).

competency-highlight — 원문 문장 역량 칠하기: 문장마다 해당 역량 옅은 색(…-tint) 배경, 모서리 0. 초점 역량이 있으면 그 문장만 칠하고 나머지 문장은 칠 없이 {colors.text-muted}. 문장을 누르면 작은 말풍선(평가항목 이름 + 역량 이름). 색만으로 구분하지 않도록 패널의 역량 이름·점과 짝을 이룹니다.

competency-bar — 3대 역량 비율 막대: 높이 6, 모서리 0, 구간 사이 2px, 문장 수 비례 폭, 구간 색 = 역량 진한 색. 아래에 "학업 n · 진로 n · 공동체 n" 캡션(대체 텍스트).
AI 결과 카드에는 판정 색을 쓰지 않습니다(합격 판정으로 오해되지 않도록).

evidence-quote — 근거 인용

왼쪽 2px {colors.ink} 세로선 + 인용문 {typography.body} + 출처 캡션(예: "2학년 화학Ⅰ 세특")
PC에서 누르면 왼쪽 원문 해당 위치로 스크롤하고 그 문장을 {colors.accent-soft}로 잠깐 칠합니다.

ai-label — "AI 분석 · 참고용"

흑백 알약 배지. AI가 만든 모든 블록 머리에 붙입니다. 예외(2026-11-23 대학 상세 위키): 관리자가 검수한 뒤 공개하는 공식 문서(시행계획·모집요강) 요약은 ai-label 대신 섹션 머리에 data-status-badge "공식 문서 요약 · 검수일 YYYY-MM-DD"를 한 번 붙이고, 사실 블록마다 출처 캡션 + "원문 보기 ↗"를 둡니다. 검수 전에는 본문 없이 섹션 제목과 "준비 중" data-status-badge만 보입니다.
교사 모드

mode-switch — 학생 · 교사 세그먼트(PC 상단 바, 모바일 메뉴)

교사로 바꾸면 lock-screen이 먼저 나옵니다.

lock-screen — 교사 모드 잠금

가운데 정렬 카드, 암호 입력칸, button-primary "잠금 풀기", 아래에 "학급 데이터는 이 기기에만 암호화해서 저장돼요" 캡션

student-row-card — 모바일 교사 화면의 학생 한 줄

번호·별칭, 환산 9등급 범위, 카드 제출 여부 칩, 경고 개수 배지

counsel-timeline — 상담 메모

세로 타임라인, 날짜 {typography.caption}, 메모 {typography.body}, 카드 변경 이력은 회색 시스템 줄로 구분
공유

share-sheet — 상담카드·모의고사 보내기

바텀시트(모바일) / 모달(PC)
선택지 두 개: "QR로 보여주기"(큰 QR + 남은 개수 표시, 데이터가 크면 여러 장으로 넘김), "파일로 저장"(.jnavi)
Overlays

bottom-sheet — 모바일 편집·필터·경고 목록

위쪽 {rounded.sm}, 손잡이 막대, {shadow.overlay}, 뒤 {colors.scrim}

modal — PC 확인·편집

{rounded.md}, 최대 폭 560px, {shadow.overlay}. 변형 size=wide(2026-11-18 사용자 결정): 표가 주인공인 모달(예: 5 to 9 배치표)은 최대 폭 960px, 높이는 화면의 최대 80%이고 머리(제목·닫기)와 아래 고정 줄은 두고 표 영역만 스크롤합니다.

toast — "저장했어요", "상담카드 3개를 불러왔어요"

{colors.ink} 알약 + {colors.on-primary} 글자, 모바일은 탭바 위, PC는 오른쪽 아래

empty-state — "아직 입력한 성적이 없어요"

가운데 정렬, 흑백 선 아이콘, {typography.heading-4} + {typography.body-sm} 설명 + button-primary 하나
Navigation

app-bar — 모바일 상단 앱바: 높이 56, 왼쪽 icon/chevron-left, 가운데 화면 제목 {typography.heading-4}, 오른쪽 보조 동작 1개

sidebar-group — PC 사이드바 대분류 행(2026-11-18): 아이콘 + {typography.link} SemiBold + 오른쪽 chevron(펼침 ▾ / 접힘 ›), 높이 44. 현재 대분류는 {colors.ink} 글자, 나머지는 {colors.ink-soft}. 대분류 행 자체에는 선택 채움을 쓰지 않고, 선택 표시는 소분류 행(sidebar-item)에만 둡니다.

sub-nav 변형 anchor(2026-11-23 대학 상세 위키): 긴 상세 화면의 섹션 이동 탭입니다. 모양은 sub-nav와 같고(높이 44, {colors.canvas} + 아래 1px {colors.hairline}, 선택 = {colors.ink} SemiBold + 아래 2px {colors.accent} 막대), 상세 화면에서도 씁니다. 모바일은 app-bar 바로 아래, PC는 page-header 아래에 붙어 고정됩니다. 탭 이름 = 섹션 제목. 누르면 그 섹션 제목이 탭 아래로 오게 스크롤하고, 스크롤하면 화면 위쪽에 걸린 섹션의 탭이 선택됩니다. 소분류 이동용 sub-nav와 한 화면에 함께 두지 않습니다.

sub-nav — 모바일 소분류 가로 탭(2026-11-18): 앱바 아래 높이 44, {colors.canvas} 바탕 + 아래 1px {colors.hairline}. 탭 = {typography.link}, 선택 = {colors.ink} SemiBold + 아래 2px {colors.accent} 막대, 나머지 {colors.text-muted}. 넘치면 가로 스크롤(잘린 탭이 보이게 오른쪽 여백 0). 모서리 0, 그림자 없음.

sidebar-item — PC 사이드바 메뉴 행: 아이콘 + {typography.link}(소분류 아이콘은 그 메뉴 뜻에 맞는 고유 아이콘이고, 자기 대분류 아이콘이나 같은 사이드바의 다른 메뉴 아이콘과 겹치지 않습니다 — 2026-11-22 사용자 피드백), 선택 = {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + {colors.ink} 글자

filter-chip — 필터 선택지(off/on): off = {colors.canvas-soft} 채움, on = {colors.accent-soft} 채움 + 1px {colors.accent} 테두리 + {colors.ink} 글자, 모서리 0
모바일 목록 위 컨트롤은 검색 1줄 + filter-chip 가로 스크롤 1줄까지입니다(2026-11-22 v2). 정렬·상세 조건은 칩을 누르면 bottom-sheet로 엽니다.

page-header — PC 화면 머리(2026-11-22 v2): 모든 PC 앱 셸 화면에 같은 규격으로 둡니다. 콘텐츠 영역 위 여백 32, 왼쪽에 상위 메뉴 이름 {typography.caption} {colors.text-muted}(선택) → 화면 제목 {typography.heading-1} → 리드 한 줄 {typography.body-lg}(선택). 오른쪽 끝 정렬로 데이터 기준일 data-status-badge + 화면 동작 버튼(주요 버튼은 최대 1개). 아래 여백 24 뒤에 첫 카드가 옵니다. 모바일은 app-bar(상세) 또는 화면 제목 {typography.heading-1}(대분류 첫 화면)을 씁니다.

brand-logo — 서비스 워드마크(U:NAVI 로고 unavi-logo-v1.svg, 원본 비율 그대로)(2026-11-22 v2, 로고 2026-11-23 사용자 결정: 파랑 그라데이션 글자 + 콜론 자리의 상승 경로): PC 사이드바 위, 모바일 대분류 첫 화면 머리, 로그인·회원가입 머리에 같은 컴포넌트로 씁니다. 글자 "U:NAVI" 워드마크를 따로 만들지 않습니다.

score-bar — 단일 가로 막대(2026-11-22 v2): 높이 6, 모서리 0, 트랙 {colors.canvas-soft}, 채움 {colors.ink}. 내 값 하나를 보여 줄 때만 채움을 {colors.accent}로 씁니다. 축 범위를 좁히면 막대 아래 캡션으로 범위를 밝힙니다(예: "만점 대비 95~100%"). 대학별 환산의 만점 대비 비율 등에 씁니다.

tab-bar-pill — 모바일 하단 탭바

화면 아래 {spacing.md} 띄워 떠 있는 알약 막대, {colors.canvas} + 1px {colors.hairline} 외곽선(Page 바탕과 구분)(2026-11-22 v2), 높이 64px
아이콘 + {typography.label} 이름. 선택된 탭은 {colors.accent} 아이콘 + {colors.ink} SemiBold 글자
스크롤을 내리면 숨지 않고 그대로 있습니다.

sidebar — PC 앱 셸

{colors.canvas} + 오른쪽 1px {colors.hairline-soft}(Page 바탕과 구분)(2026-11-22 v2), 위에 워드마크 "U:NAVI", 메뉴 행은 직각, 선택은 {colors.accent-soft} 채움 + 왼쪽 3px {colors.accent} 막대 + {colors.ink} 글자
그룹 이름 {typography.caption} {colors.text-muted}
맨 아래 데이터 기준일과 백업 버튼. 로그인한 교사·관리자는 맨 아래 "로그아웃"(icon/log-out)(2026-11-22 v2)

nav-pill — 공개 페이지 상단(PC)

가운데 떠 있는 알약 막대, {colors.canvas-soft}, 왼쪽 워드마크, 오른쪽 링크 + button-primary "시작하기"

footer — 공개 페이지 하단

{colors.ink} 전체 폭 띠, 위쪽 {rounded.md}, 흰 워드마크, {colors.text-faint} 링크, 운영 기관 표기(강원진학지원센터)
Print

print-summary — 학부모 공유용 PDF

A4 세로, 흑백 인쇄를 기준으로 합니다. 판정은 색 대신 아이콘(●◐▲■)과 이름으로 구분되므로 흑백에서도 읽힙니다.
머리에 학생 별칭·출력일·데이터 기준일, 본문은 수시로 6칸 표 + 경고 목록 + 상담 메모 요약, 맨 아래 disclaimer-note
Motion
기본 전환 150~200ms, ease-out. 바텀시트·모달은 240ms.
5 to 9 막대의 내 위치 표시는 처음 나타날 때 한 번만 왼쪽에서 미끄러져 들어옵니다(400ms).
수시로 칸 순서 변경은 칸이 자리를 바꾸는 애니메이션만 씁니다.
prefers-reduced-motion이면 모든 움직임을 없애고 바로 보여줍니다.
Voice (UX 문구)
해요체를 씁니다. "~합니다", "~하세요"보다 "~해요", "~할 수 있어요".
기능 이름은 정확히 씁니다: 5 to 9(띄어쓰기 포함), 수시로, 될각.
합격을 약속하는 말을 쓰지 않습니다. "합격 가능", "합격 확률"이 아니라 "될각 판정", "입결과 비교하면" 같은 표현을 씁니다.
추정값에는 "약", "범위", "추정"을 붙입니다. 예: "환산 9등급 약 2.2~2.8".
오류 문구는 무엇이 틀렸고 어떻게 고치는지 함께 씁니다. 예: "분포비율 합이 98.5%예요. 100%가 되도록 확인해 주세요."
Accessibility
글자/배경 대비 4.5:1 이상(큰 글자 3:1 이상).
판정·경고·오류는 색 + 아이콘 + 텍스트를 함께 씁니다.
키보드만으로 모든 기능을 쓸 수 있어야 합니다. 특히 성적 입력 표는 Tab·Enter·방향키로 이동합니다.
포커스는 항상 2px 잉크 링으로 보입니다.
차트(5 to 9 막대, 입결 비교 막대)에는 같은 내용을 문장으로 읽어주는 대체 텍스트를 둡니다. 예: "환산 9등급 약 2.2에서 2.8 사이, 대표값 2.5".
Do's and Don'ts
Do
앱 셸 안 화면 바탕은 {colors.canvas-soft}, 내용은 테두리 없는 흰 카드로 묶으세요(2026-11-22 v2).
화면마다 주인공 하나를 정하세요: hero 숫자 + 해석 한 줄, 또는 교사 화면은 "오늘 할 일" 한 묶음.
모든 모서리를 0으로 만드세요(원형 표식만 ELLIPSE로 예외).
색은 될각 판정·경고·오류(결정 신호)와 Route Blue(내 위치·선택 상태·링크·핵심 숫자)에만 쓰세요. 주요 버튼은 잉크입니다.
판정은 항상 색 + 아이콘 + 이름을 함께 쓰세요.
점수·등급·날짜에는 고정폭 숫자를 쓰세요.
환산·판정 결과에는 trace-accordion과 disclaimer-note를 붙이세요.
핵심 화면은 모바일 390과 PC 1440 두 프레임으로 그리세요.
모바일에서는 표를 카드 목록으로, 모달을 바텀시트로, 보조 패널을 아코디언으로 바꾸세요.
대학은 univ-logo(실제 로고 SVG)로, 로고 파일이 없으면 univ-monogram으로 표시하세요.
긴 대학명·전형명은 한 줄을 우선하고(폭을 다시 나눔), 그래도 넘치면 단어 사이에서만 두 줄로 흘리세요. 글자 중간에서 끊지 마세요(2026-11-18 사용자 피드백).
Don't
카드, 버튼, 사이드바에 그림자를 넣지 마세요. 그림자는 떠 있는 레이어(모달·바텀시트·드롭다운·토스트)에만 씁니다.
{colors.accent}를 주요 버튼 채움, 판정 배지·경고 안, 장식에 쓰지 마세요. 한 화면에 Route Blue 숫자는 1~2개까지만.
등급 숫자 글자·grade-chip에 색을 입히지 마세요. 등급 색은 5 to 9 범위 막대 구간 채움에만 씁니다.
판정 색을 장식이나 카테고리 구분에 쓰지 마세요.
AI 분석 결과에 판정 색을 쓰지 마세요.
입력칸에 평소 테두리를 넣지 마세요. 테두리는 포커스(잉크)와 오류(위험색) 때만 나타납니다.
자간을 조절하거나 영문을 대문자로만 쓰지 마세요.
대학 사진을 쓰지 마세요. 대학 로고의 색·비율을 바꾸지 마세요.
카드·버튼·배지·입력칸에 둥근 모서리를 넣지 마세요.
같은 무게의 stat-tile을 습관처럼 4개씩 늘어놓지 마세요(2026-11-22 v2).
시안마다 다른 예시 숫자를 만들지 마세요. 시안 예시 값은 work/_data/demo-dataset.md 하나만 씁니다.
교사용 넓은 표를 모바일에서 억지로 줄이지 마세요. 보기 전용 요약과 "PC에서 열기" 안내로 대신합니다.

