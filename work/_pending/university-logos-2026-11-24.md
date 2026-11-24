# 대학 로고 누락 보완 — 2026-11-24

현재 확보 자료의 대학 기준 목록 **196개 대학 전체**에 로고를 연결했다. 입결 표시명 **229개**, 전형계획 항목 **218개**의 로고 연결도 모두 확인했다. 캠퍼스 공통 로고와 캠퍼스별 기존 로고를 유지하며, 총 **203개 이미지 파일**을 사용한다. 국내 모든 대학의 로고를 수집했다는 뜻은 아니다.

## 추가한 7개교

| 대학 | 공식 출처 | 선택한 원본 |
|---|---|---|
| 경찰대학 | [CI 안내](https://www.police.ac.kr/police/police/html/intro/sym/ci.do?mdex=police29) · [페이지 스타일시트](https://www.police.ac.kr/css/police/common.css) | 홈페이지의 단일 기관 로고 PNG |
| 광주과학기술원(GIST) | [UI 안내](https://ewww.gist.ac.kr/kr/html/sub01/01030301.html) | 심볼마크 PNG |
| 울산과학기술원(UNIST) | [UI 다운로드](https://www.unist.ac.kr/unist/introduction/download.do) | 홈페이지의 진한 색 워드마크 PNG |
| 한국과학기술원(KAIST) | [UI 안내](https://kaist.ac.kr/kr/html/kaist/010401.html) | 로고타입과 그래픽 모티프가 결합된 GIF |
| 한국에너지공과대학교 | [공식 대학 소개](https://admission.kentech.ac.kr/submenu.do?menuurl=LxZUaTFmmSi27DgQxWKW1A%3D%3D) | 홈페이지 워드마크 PNG |
| 한국예술종합학교 | [상징 안내](https://karts.ac.kr/main/index.do?menuId=010401000000) | 기념연도 표시 없는 학교 엠블럼 PNG |
| 한국전통문화대학교 | [공식 Logo/UI 안내](https://www.knuh.ac.kr/english/content.do?mnuBaseId=MNU0000561&topBaseId=MNU0000557&tplBaseId=TPL0000219) | 세로형 학교 로고 JPG |

원본 바이트·색상·비율을 보존했다. 경찰대학 다운로드 ZIP에는 복수 예시가 함께 있어 앱 이미지로 사용하지 않고 공식 페이지가 직접 사용하는 단일 로고를 선택했다. 최종 7개 이미지를 직접 열어 확인했다.

## 표시 오류 수정

`UniversityLogo`가 공통 대학명 변환을 거쳐 로고를 조회하도록 수정했다. 다음 10개 자료명은 기존 로고를 재사용한다.

- 덕성여대·동덕여대·서울여대·성신여대·숙명여대·이화여대
- 추계예대, 한국체대
- 한국외대(서울), 한국외대(글로벌)

통합 전 강릉원주대의 캠퍼스 표기도 강원대 로고로 연결한다. 전형계획 ID로 지정한 캠퍼스 로고가 있으면 우선 사용한다. 이미지 오류 시 대체 아이콘을 표시하는 동작은 유지했다.

## 저장·재현·검증

- 이미지 및 원문 주소·해시·크기: `app/public/assets/universities/`, `sources.json`.
- UI 대학명 대응: `app/src/data/universityLogoNames.json`. 전형계획 ID 대응은 기존 218개를 유지한다.
- 추가 수집: `python app/tools/collect_supplemental_university_logos.py`. 캐시가 있으면 재사용한다.
- 기존 포털 수집기를 다시 실행해도 추가 수집 7개교가 대응표에서 없어지지 않도록 보완했다.
- 전수 점검: `python app/tools/audit_university_logos.py`. [감사 JSON](../_data/university-logos/audit-2026-11-24.json): 대학·자료명·계획 ID 누락 0, 파일·해시·이미지 디코딩·출처 기록 오류 0.
- 로고·대학명·대학별 그래프 관련 테스트 11개 통과. 프로덕션 빌드 및 배포 데이터 무결성 검사 통과. 로컬 앱에 반영했으며 외부 배포는 하지 않았다.

공식 로고를 수집했다는 사실이 상업 이용 허가를 받은 뜻은 아니다. 각 대학의 UI 사용 안내를 출처에 남겼으며 허가 상태를 승인으로 변경하지 않았다.
