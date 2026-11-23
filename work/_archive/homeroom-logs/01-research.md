# 01-research — 누가기록 (homeroom-logs, 교사용)

조사일 2026-11-18 · 담당 researcher · 출처 uibowl (무료 등급, 검색당 최대 3건)

## 화면 범위
- 영역(자율·자치 | 진로) + 날짜를 고르고, 학생 여러 명을 골라 같은 관찰 기록("조각")을 한 번에 남기는 보드
- 학생별 기록 수 (적은 순 / 번호 순 정렬), 최근 기록 타임라인 ("학생A 외 2명"으로 묶어서 표시)
- 원래 화면 참고: work/_ref/schs_lms-homeroom.md 2-4, 3(e) — 머리 "조각 모으기", 보드, 최근 조각 4줄, "오늘 n"
- 디자인 규칙(design.md 2026-11-18): 모든 모서리 0, 흑백 + Route Blue는 선택·여기 표시에만, 주요 버튼은 잉크 채움

## 검색 기록
| # | 도구 | 검색어 / 조건 | 플랫폼 | 결과 |
|---|---|---|---|---|
| 1 | search_ui_patterns | 다중 선택 | MOBILE | 0건 (지원하지 않는 표현) |
| 2 | search_ui_patterns | 일괄 선택 | PC | 0건 (지원하지 않는 표현) |
| 3 | search_ui_patterns | 메모 작성 | MOBILE | 1건 → L3 |
| 4 | search_ui_patterns | 타임라인 | PC | 3건 (주식 차트·히트맵 위주라 관련성이 낮아 채택하지 않음) |
| 5 | search_components | 체크박스, 리스트 | MOBILE | 3건 → L1, L2 |
| 6 | search_components | 타임라인 × 내역 | MOBILE | 3건 → L4, L5 |
| 7 | search_components | 체크박스, 테이블 | PC | 3건 → L8, L9 |
| 8 | search_ui_patterns | 대시보드 × 사이드 네비게이션 | PC | 3건 → L10, L11 |
| 9 | search_ui_patterns | 글쓰기 × 텍스트 필드 | PC | 3건 → L12, L13 |
| 10 | search_components | 날짜 피커, 칩 | MOBILE | 3건 → L6, L7 |

## 레퍼런스 목록
### 모바일 (7)
- [L1] iM뱅크 (MOBILE) — 계좌 연결 기관 고르기. 목록 오른쪽 위에 "전체선택"이 있고, 행마다 오른쪽에 체크 표시가 있어요. 화면 아래에 고정된 주요 버튼에 고른 개수가 들어가요("연결 기관 49개"). — https://uibowl.io/name/iM%EB%B1%85%ED%81%AC?patterns=%EA%B3%84%EC%A2%8C&imgId=cmp0ug99f00txjw04u3nz6cfd
- [L2] 빗썸 (MOBILE) — 관심 편집. 맨 위에 "전체" 체크 행이 있고, 각 행은 왼쪽 체크 + 이름 + 보조 정보 두 줄로 되어 있어요. 아무것도 고르지 않으면 하단 "저장" 버튼이 비활성(회색)이에요. — https://uibowl.io/name/%EB%B9%97%EC%8D%B8?patterns=%EB%B6%81%EB%A7%88%ED%81%AC%C2%B7%EC%9C%84%EC%8B%9C%EB%A6%AC%EC%8A%A4%ED%8A%B8&imgId=cmwirvrar003zlb08n9sim8i1
- [L3] 도미노 (MOBILE) — 종목 상세 안의 메모 작성. "내 자산 | 메모" 탭 아래에 선 없는 회색 채움 입력칸이 있고, 안내 문구는 "메모를 입력하세요"예요. — https://uibowl.io/name/%EB%8F%84%EB%AF%B8%EB%85%B8?patterns=%EA%B8%80%EC%93%B0%EA%B8%B0&patternName=%EB%A9%94%EB%AA%A8%20%EC%9E%91%EC%84%B1
- [L4] 센디 (MOBILE) — 운송 현황 상세. 출발지 → 경유지 → 도착지를 세로 선으로 잇고, 각 마디는 굵은 제목 + 주소 + 회색 메타 한 줄이에요. 아이콘 칸과 글자가 왼쪽 정렬로 맞춰져 있어요. — https://uibowl.io/name/%EC%84%BC%EB%94%94?patterns=%EB%82%B4%EC%97%AD&imgId=cmp6az7rg00lmjo04sn7eug0z
- [L5] 퍼그샵 (MOBILE) — 미션 진행 현황. 세로 타임라인의 원형 마디 옆에 단계 이름이 있고, 오른쪽 끝에 흑백 상태 칩("대기")과 › 이동 표시가 붙어요. — https://uibowl.io/name/%ED%8D%BC%EA%B7%B8%EC%83%B5?patterns=%EB%82%B4%EC%97%AD&imgId=cmq7ew6fi000ll70455895ojl
- [L6] 투두메이트 (MOBILE) — 할 일 홈. "2026년 5월 4주차" 아래에 월~일 7칸 날짜 줄이 있고, 오늘 날짜만 채운 원으로 표시해요. 오른쪽 위에는 "오늘" 버튼과 ‹ › 주 이동 버튼이 있고, 아래에 카테고리별 할 일 목록이 이어져요. — https://uibowl.io/name/%ED%88%AC%EB%91%90%EB%A9%94%EC%9D%B4%ED%8A%B8?patterns=AI&imgId=cmpjgh3br000cl404k0eenzo8
- [L7] 집지켜 (MOBILE) — 날짜 + 계약기간 입력. 월 달력에서 고른 날 하나만 진한 원으로 표시하고, 아래 "12개월 | 24개월 | 기타" 3칸 칩 가운데 고른 칸은 옅은 파랑으로 채워요. 맨 아래에 진한 "다음" 버튼이 있어요. — https://uibowl.io/name/%EC%A7%91%EC%A7%80%EC%BC%9C?patterns=%EC%A1%B0%ED%9A%8C%ED%95%98%EA%B8%B0&imgId=cmubaupg3001ll2043b1s8awm

### PC (6)
- [L8] 채널톡 (PC) — 고객 목록. 왼쪽 사이드바(그룹 이름 + 메뉴)가 있고, 본문은 첫 열 체크박스 + 아바타·이름 + 속성 열로 된 표예요. 표 위에는 검색, 개수 "N명", 필터·내보내기 아이콘 줄이 있어요. — https://uibowl.io/website/%EC%B1%84%EB%84%90%ED%86%A1?patterns=%EB%AA%A9%EB%A1%9D%20%28PLP%29&imgId=cmudq4ko40041jx04pjl68ftt
- [L9] 피처링 (PC) — 인플루언서 목록. 행마다 체크박스 + 아바타·이름 + 태그 칩 + 오른쪽 정렬 숫자 열이 있어요. 표 위의 작업 줄(채운 주요 버튼 + 보조 버튼들)로 고른 행 전체에 한 번에 작업해요. — https://uibowl.io/website/%ED%94%BC%EC%B2%98%EB%A7%81?patterns=%EA%B2%80%EC%83%89&imgId=cmuz1du1q0003jw04saqauwj8
- [L10] 사방넷 (PC) — 메인 대시보드. 맨 위 띠에 "N 건" 숫자 타일이 가로로 놓이고, 그 아래에 현황 카드 여러 개와 주간 막대 그래프가 있어요. — https://uibowl.io/website/%EC%82%AC%EB%B0%A9%EB%84%B7?patterns=%EB%A9%94%EC%9D%B8&patternName=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
- [L11] 잔디 (PC) — 대시보드. 옅은 회색 왼쪽 사이드바(선택 메뉴는 채움으로 표시), 본문 제목 아래 탭 2개, 기간별 활동 그래프로 되어 있어요. — https://uibowl.io/website/%EC%9E%94%EB%94%94?patterns=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
- [L12] 겟차 (PC) — 글쓰기 / 고민 게시. 왼쪽 넓은 열 맨 위에 한 줄 입력 + 진한 등록 버튼이 있고, 그 아래에 날짜·작성자 메타가 붙은 글 피드가 이어져요. 오른쪽 좁은 열에는 최근 글 목록이 있어요. — https://uibowl.io/website/%EA%B2%9F%EC%B0%A8?patterns=%EA%B8%80%EC%93%B0%EA%B8%B0&patternName=%EA%B5%AC%EB%A7%A4%EA%B3%A0%EB%AF%BC
- [L13] 왓챠피디아 (PC) — 컬렉션 댓글 쓰기. 내용 카드 바로 아래에 회색 한 줄 입력칸 + 오른쪽 등록 버튼이 있고, 개수 라벨("댓글 N")은 위에 있어요. — https://uibowl.io/website/%EC%99%93%EC%B1%A0%ED%94%BC%EB%94%94%EC%95%84?patterns=%EC%BB%A4%EB%AE%A4%EB%8B%88%ED%8B%B0&patternName=%EC%BB%AC%EB%A0%89%EC%85%98%20%EB%8C%93%EA%B8%80%EC%93%B0%EA%B8%B0

## 반영 포인트
- P1: 일괄 기록 흐름 = "학생 고르기 → 같은 글 한 번 쓰기 → 고른 수가 들어간 버튼 하나". 목록 머리에 "전체 선택"을 두고, 모바일은 화면 아래 고정 button-primary("3명에게 남기기"처럼 고른 수 포함, 잉크 채움), PC는 표 위 작업 줄에 같은 버튼을 둬요. 아무도 고르지 않았거나 글이 비어 있으면 비활성으로 둬요. [근거: L1, L2, L9]
- P2: 학생 선택 표시는 Selected 단계로 통일해요. 고른 행은 accent-soft 채움 + accent 표시, 고르지 않은 행은 흰 바탕이에요. 체크 모양은 직각이에요. Route Blue는 선택 표시와 "오늘" 날짜에만 쓰고, 기록 수 같은 숫자는 잉크 tabular로 써요. 레퍼런스의 브랜드 색 채움 버튼(L1 초록, L9 파랑)은 가져오지 않아요. [근거: L1, L2, L8, L9]
- P3: PC 보드는 data-table로 만들어요. 첫 열(선택 + 번호·이름)과 머리글은 고정하고, "기록 수" 숫자 열은 오른쪽 정렬해요. 머리글에서 "적은 순 / 번호 순"으로 정렬해요. 모바일은 같은 데이터를 student-row-card 목록(번호·이름 + 오른쪽 기록 수)으로 보여 줘요. [근거: L8, L9, L2]
- P4: 영역과 날짜는 보드 위 한 줄에 둬요. 영역은 segmented-control 2칸(자율·자치 | 진로)으로, 날짜는 이번 주 7칸 날짜 줄 + "오늘" + ‹ › 이동으로 골라요. 고른 날짜는 Route Blue, 다른 날짜는 흑백이에요. 달력 전체는 날짜 칸을 누를 때만 bottom-sheet(모바일)/modal(PC)로 열어요. [근거: L6, L7]
- P5: 관찰 기록 입력은 text-input(field 회색 채움, 평소 테두리 없음, 포커스 때만 2px 잉크 링)이에요. 안내 문구는 text-faint로 써요. PC는 보드 위 넓은 입력칸 + 오른쪽 주요 버튼, 모바일은 선택 목록 아래 입력칸 + 하단 고정 버튼으로 둬요. [근거: L3, L12, L13]
- P6: 최근 기록 타임라인은 counsel-timeline을 재사용해요. 세로 1px 선 + 마디 점(원형 표식이라 ELLIPSE 허용)을 두고, 마디마다 날짜(caption tabular) → 학생 묶음("학생A 외 2명", title) → 내용(body 2줄) → 영역 흑백 칩 순서예요. 같은 날 같은 글은 마디 하나로 묶어요. PC는 오른쪽 360px 보조 패널, 모바일은 보드 아래 섹션에 둬요. [근거: L4, L5, L12]
- P7: PC 셸은 sidebar + 상단 stat-tile 3~4개(오늘 남긴 기록 n / 이번 주 n / 기록 0건 학생 n / 우리 반 n명)로 시작하고, 본문은 왼쪽 넓게 보드, 오른쪽 타임라인 2단이에요. 타일 숫자는 잉크로 쓰고, 화면 핵심 숫자 1개만 Route Blue를 허용해요. [근거: L10, L11, L8]

## design.md 확인 필요 (S2 전달)
- design.md Components에 독립된 "체크박스"와 "일괄 작업 바" 컴포넌트가 없어요(체크박스는 mask-preview 안에만 나와요). P1·P2는 data-table 선택 행 + Selected 단계 + button-primary 조합으로 표현하는 것을 기본안으로 해요. 별도 컴포넌트가 꼭 필요하면 S2에서 멈추고 "design.md 수정 제안"으로 올려 주세요.
- 영역 칩(자율·자치/진로)은 판정 색을 쓰지 않는 흑백 칩이에요(data-status-badge와 같은 흑백 처리). 판정 색을 카테고리 구분에 쓰는 것은 금지예요.
