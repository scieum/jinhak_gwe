# 시안 완성 전 보완·검수 결과

2026-11-24 · 기준 Figma 파일: [U:NAVI 전체 시안](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W)

## 완료한 작업

- 전체 38개 화면의 모바일·PC 기본 프레임 76개를 실제 Figma와 대조하고 하나의 인덱스로 연결했다.
- 누락·구버전이던 7개 화면에 기본 14개와 상태 206개, 합계 220개 프레임을 보완했다. 비교, 일정, 체크리스트, 지원 자격, 상담 과제, 계열표 검수, 위키 요약 검수다.
- 작업 중 별도로 갱신된 전형 성향 탐색·전국 배치표 승인본을 보존했다. 이번 작업에서 겹쳐 만든 성향 초안 26개는 제거하고 승인된 32개 프레임으로 연결했다.
- 공통 학생을 07 하늘·15 바다·22 은하로 맞췄다. 지원 2028학년도와 입결 2024~2026학년도를 분리하고, 지도 예시가 실제 좌표 검수 완료처럼 보이던 문구를 수정했다.
- 앱에서 기한 경과·관리자 검수 상태를 중립적인 표시로 바꾸고, 계열표 검수 단계별 주요 버튼을 하나로 정리했다. 성향 탐색 화면의 경로 식별자도 보완했다.
- 대학 기준 목록 196곳, 입결 표기 229개, 시행계획 목록 218개를 서로 다른 집계 단위로 유지했다. 이전에 수집한 로고 203개 파일은 배포용 데이터 검사에 포함됐다.

## 검증 결과

| 검사 | 결과 |
|---|---|
| Figma 화면 연결 | 38개 화면·76개 기본 프레임, 누락·깨진 참조 0 |
| 보완 시안 구조 | 220개 프레임의 크기·폰트·팝업 높이 검사 통과 |
| 작은 글씨 대비 | 활성·표시 텍스트 9,879개 검사, 남은 기준 미달 0 |
| 자동 테스트 | 전체 430개 통과, 마지막 문구·표시 변경 후 관련 4개 추가 통과 |
| 브라우저 화면 검사 | 22개 경로 × 모바일·PC = 44개, 페이지 가로 넘침·실행 오류 0 |
| 학생 실제 흐름 | 전형 등록 → 단계 완료 → 재조회 → 자격 근거 저장 → 상담 완료 필터, 양쪽 크기 통과 |
| 교사 실제 흐름 | 학급 생성 → 카드 파일 수합 → 학생 상세 이동 → 상담 메모 저장·재조회, 양쪽 크기 통과 |
| 빌드·배포용 데이터 | 빌드 성공, 파일 440개·입결 132,605행·3개년·로고 203개 검사 통과 |

위 구조·대비·앱 검사는 보완 작업 당시 수행한 결과다. 이후 별도 후속 수정본의 제작·판정 기록은 보존했으며, 이번 승인 처리에서 자동 검사를 새로 실행한 것으로 표시하지 않는다. 2026-11-24 사용자의 직접 채팅 “승인”을 7개 화면의 최종 승인으로 기록했다.

## 검토·개발 상태

- 보완한 7개 화면은 2026-11-24 사용자가 직접 승인했다. 각 `04-approval.md`에 승인 근거를 기록했다. 최신 `03-draft.json`과 `05-build.json`의 기본·상태 참조 일치를 확인했으며, 기존 `06-judge.json` 통과 기록은 보존했다.
- Figma에서 최신 목록을 다시 읽어 38개 화면·76개 기본 프레임의 연결 검사를 통과했다. 이름이 같은 옛 프레임 대신 각 화면의 기록된 최종 ID를 사용한다.
- 최저로 찾기, 학과별 입결 구간표, 특수 계열 모아보기, 대학 지도, 우리 반 입시 일정의 5개는 시안만 있고 앱 구현 경로는 아직 없다. `screen-delivery.json`에 명시해 구현 완료로 집계하지 않는다.
- 지도 위치·지역별 수는 시안 예시다. 실제 서비스 지도에는 공식 캠퍼스 주소·좌표 대조가 추가로 필요하며, 확인되지 않은 위치를 검수 완료로 표시하지 않는다.
- 입결 수집본은 검수 전 참고자료다. 기존 규칙 승인·공개 조건을 변경하거나 수집 값을 성적 판정에 자동 사용하지 않았다.

## 전체 화면 검토 링크

| 화면 | 모바일 | PC | 기록된 상태 수 | 승인 기록 | 앱 범위 |
|---|---|---|---:|---|---|
| 홈 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=320-4) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=320-49) | 20 | 기존 승인 | 앱 경로 있음 |
| 전형계획 목록 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-123524) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-125015) | 32 | 기존 승인 | 앱 경로 있음 |
| 대학 상세 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-143371) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-144159) | 28 | 기존 승인 | 앱 경로 있음 |
| 전형 상세 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-217877) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-235058) | 0 | 기존 승인 | 앱 경로 있음 |
| 성적 입력 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-114211) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-114289) | 0 | 기존 승인 | 앱 경로 있음 |
| 5 to 9 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-131226) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-131252) | 0 | 기존 승인 | 앱 경로 있음 |
| 대학별 환산 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-131150) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-131176) | 0 | 기존 승인 | 앱 경로 있음 |
| 될각 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=327-490) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=327-549) | 33 | 기존 승인 | 앱 경로 있음 |
| 수시로 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-131302) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-131328) | 0 | 기존 승인 | 앱 경로 있음 |
| 생기부 AI | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=347-310924) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=347-311136) | 0 | 기존 승인 | 앱 경로 있음 |
| 모의고사 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-140445) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-140564) | 0 | 기존 승인 | 앱 경로 있음 |
| 교사 학급 대시보드 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=330-16438) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=330-1766) | 0 | 기존 승인 | 앱 경로 있음 |
| 학생 상담 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-85508) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-85559) | 0 | 기존 승인 | 앱 경로 있음 |
| 카드 수합 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-78011) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-78062) | 0 | 기존 승인 | 앱 경로 있음 |
| 결과 집계 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=460-65555) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=459-61275) | 10 | 기존 승인 | 앱 경로 있음 |
| 관리자 규칙 편집기·검수 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-253552) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-252770) | 0 | 기존 승인 | 앱 경로 있음 |
| 학생 기록 상세 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-64549) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-57235) | 0 | 기존 승인 | 앱 경로 있음 |
| 성적 불러오기 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-155908) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-152228) | 0 | 기존 승인 | 앱 경로 있음 |
| 수능 최저 판정 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-100406) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-100457) | 0 | 기존 승인 | 앱 경로 있음 |
| 내 성적 추이 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-277668) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-277682) | 0 | 기존 승인 | 앱 경로 있음 |
| 수시 입결 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-266645) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-267881) | 37 | 기존 승인 | 앱 경로 있음 |
| 로그인 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-262094) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-261947) | 1 | 기존 승인 | 앱 경로 있음 |
| 회원가입 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=455-61169) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=455-60949) | 4 | 기존 승인 | 앱 경로 있음 |
| 최저로 찾기 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-131097) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=346-131123) | 0 | 기존 승인 | 시안만 |
| 대학 상세 위키 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=365-38085) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=365-38171) | 6 | 기존 승인 | 앱 경로 있음 |
| 학과별 입결 구간표 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=391-42474) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=395-44331) | 14 | 기존 승인 | 시안만 |
| 특수 계열 모아보기 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=429-50971) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=430-51283) | 15 | 기존 승인 | 시안만 |
| 전형 성향 탐색 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=594-163652) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=597-163686) | 30 | 기존 승인 | 앱 경로 있음 |
| 전국 배치표 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=530-85565) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=532-86654) | 41 | 기존 승인 | 앱 경로 있음 |
| 지원 자격 확인표 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=682-218325) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=683-218459) | 30 | 이번 보완 · 직접 승인 | 앱 경로 있음 |
| 전형 비교 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=657-186568) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=658-187197) | 37 | 이번 보완 · 직접 승인 | 앱 경로 있음 |
| 원서·서류 체크리스트 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=668-210274) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=670-210435) | 32 | 이번 보완 · 직접 승인 | 앱 경로 있음 |
| 입시 일정 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=627-168318) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=627-168449) | 27 | 이번 보완 · 직접 승인 | 앱 경로 있음 |
| 상담 질문·할 일 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=691-223585) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=692-223716) | 28 | 이번 보완 · 직접 승인 | 앱 경로 있음 |
| 학과 계열표 검수 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=703-229112) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=702-228572) | 27 | 이번 보완 · 직접 승인 | 앱 경로 있음 |
| 대학 위키 요약 검수 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=714-243965) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=713-242969) | 25 | 이번 보완 · 직접 승인 | 앱 경로 있음 |
| 대학 지도 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=504-81770) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=506-82015) | 17 | 기존 승인 | 시안만 |
| 우리 반 입시 일정 | [390](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=489-68749) | [1440](https://www.figma.com/design/AqkVdYZ4hvPYuAlewoBs4W?node-id=487-68233) | 36 | 기존 승인 | 시안만 |

## 재검증 자료

- `work/_data/design-handoff-2026-11-24.json`: 전체 화면 연결 인덱스
- `work/_data/design-inventory-2026-11-24.json`: Figma 관측 목록
- `work/_data/design-supplemented-2026-11-24.json`: 보완 화면·상태 참조
- `work/_pending/design-completion-2026-11-24-evidence.json`: 테스트·브라우저·Figma 검사 원자료
- `outputs/design-completion-20261124/`: 브라우저 이미지·실행 스크립트·원본 결과

로컬 참조 재검사: `python app/tools/audit_design_handoff.py`. 이후 Figma를 수정했다면 먼저 관측 목록을 다시 받아 갱신해야 한다.
