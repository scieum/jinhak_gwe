# 데이터 조합·배치 작업

기준일: 2026-11-24 (Asia/Seoul). 사용자 요청에 따라 이 세션은 데이터 조합·정리·입력 자료 준비를 담당한다. 화면·도메인 구현은 별도 세션이 진행한다.

**현재 상태(3차 반영 후):** 한림대 수시 미분류 250개 조합을 원문 근거로 보완했다. 전체 규칙은 4,801건, 연결된 전형·모집단위 조합은 16,585개, 명시적 보류는 23,512개, 미분류는 정시 722개·재외국민 4개다. 아래 1·2차 수치는 작업 당시 기록이며 현재 숫자는 `summary.json`, `normalization-summary.json`을 기준으로 한다.

## 4차: 앱의 원문 참고자료 연결

2026-11-24 사용자 요청으로 개발과 데이터 연결을 함께 진행했다. 아래 초기 기록의 “앱이 직접 불러오는 형식은 아니다”는 검수 JSON 자체에 대한 설명이다. 이제 별도 생성기를 통해 **계산 규칙이 없는 참고자료 패키지**를 만든다.

- 생성: `python app/tools/build_minimum_references.py` → `app/public/data/minimum-references/index.json` 및 대학·캠퍼스별 SHA-256 파일.
- 규모: 218개 패키지, 원본 규칙 참조 4,801개, 전형·모집단위 조합 40,823개. 연결 16,585 / 보류 23,512 / 미분류 726을 그대로 보존한다.
- 원본 패키지와 정규화 입력 해시를 확인하고, 출처 문서 해시·원문 URL·PDF 쪽수·수집일·원본 JSON 포인터를 유지한다. 모든 파일은 `draft`, `executable: false`다. Criterion 후보를 계산용 자료로 내보내지 않는다.
- 성적 추이의 실제 목표 대학 행에서 “수능 최저 원문·근거”를 펼치면 목록과 선택한 패키지만 읽는다. 학년도·캠퍼스·전형·모집단위를 대조하며, 모호하거나 없는 연결을 미적용으로 바꾸지 않는다.
- 성적이 아직 없어도 원문은 볼 수 있다. 미적용 명시·적용 범위 보류·연결 없음이 구분되고, 원문 쪽수 링크가 제공된다. 샘플 판정 경로와 분리되며 검수 전 자료로 등급·충족 여부를 계산하지 않는다.
- 생성물 검증과 로더 테스트: `app/tests/minimum-references.test.tsx`, `app/tests/minimum-reference-loader.test.ts`. 실제 브라우저 검증: `work/_pending/minimum_reference_smoke.py`.
- 공개 디렉터리에 파일을 준비한 작업이며 외부 사이트 배포나 공식 최신 공지 재검증은 수행하지 않았다.

## 이번에 준비한 자료

후속 우선 대학 검수 자료: `priority-review/README.md`. 강원대·한림대·가톨릭관동대·한국교원대 7개 패키지의 원문·계산 조건·보류 이유를 함께 묶었다(규칙 942건, 조합 2,400개). `python app/tools/build_priority_review.py`로 재생성한다. 원문 파일 7개 재다운로드 해시는 보관본과 같았으며, `source-rechecks-2026-11-24.json`에 기록했다. 이 자료도 draft/executable=false이며 계산 승인이나 최신 모집요강 확정을 뜻하지 않는다.

후속 개발: 지원 전형 편집창의 “전형 자료에서 찾아 입력”에서 이 패키지를 직접 선택할 수 있다. 대학·캠퍼스 → 전형·모집시기 → 모집단위를 선택하면 정확한 표시명과 `source_selection`(패키지·전형·모집단위 ID, 모집시기, 원본 해시)이 준비 기록과 백업에 보존된다. 참고자료 연결은 이 식별자로 동명 전형을 구분하고, 원본 해시가 달라지면 재선택을 요구한다. 이름·학년도 수동 수정 시 이전 연결과 자동 입력 원문 링크를 해제하며, 자료 선택만으로 지원 자격·일정·충족 여부를 확인 처리하지 않는다.

- `package-inventory.json`: 2028 전형계획 218개 대학·캠퍼스 패키지의 경로, SHA-256, 건수. 대학 수가 아니라 패키지 수다. 전형 3,949개, 모집단위 6,801개, 모집인원 배정 31,165건.
- `minimum-source-review.json`: 수능 최저 원본 규칙 4,783건을 한곳에 모은 검수용 자료. 문장 필드가 있는 323건과 문장 없이 구조화된 4,460건을 모두 포함한다. 원본 조건, 전형명, 모집단위명, 근거 문서, 원본 파일 해시와 JSON 포인터를 보존했다.
- `summary.json`: 필드별·상태별 건수, 전형·모집단위·문서 참조 검사 결과. 참조 오류 0건. 원본과 저장 후 재독한 규칙 4,783건의 객체 일치 확인.
- `build.py`: 위 세 파일 재생성. 실행: `python work/_data/data-integration/build.py`.

기존 `review-queue/minimum-draft.json`의 345개 문장과 새 규칙 4,783건은 단위가 다르다. 345개는 구조화 패키지의 문장과 공개 전형 요약 문장을 모은 결과다. 두 파일을 단순 합산하거나 문장 일치로 중복 제거하지 않는다.

## 자료별 입력 위치

아래 경로는 저장소 루트 기준이다. 공개 파일은 실제 검수 기록을 반영하는 기존 내보내기 절차로 만든다. 새 파일은 검수 입력용이며 현재 앱이 직접 불러오는 형식은 아니다.

| 데이터 | 조합할 원본·준비 파일 | 앱에서 사용할 위치 / 연결 지점 | 현재 해야 할 일 |
|---|---|---|---|
| 수집 입결 조회 | `work/_data/admission-results/_all.csv.gz` → `app/public/data/collected-results/` | 수집 입결, 대학 입결, 전국 배치 조회 | 현재 132,605행·229개 수집 대학 표기·1,400개 출처 단위. 수집 표기와 대학 ID 관계를 보존 |
| 검수 입결 | `work/_data/review-queue/results/` | AdminReview → `app/public/data/released-results.json` | 원문 단위 검수와 실제 승인 기록 반영. 현재 공개 units는 빈 배열 |
| 전형계획 | `work/_data/admission-plans/structured/universities/` + `app/public/data/admission-plans.json` | 전형계획 목록·전형 상세 | 목록 218항목과 패키지 ID를 연결. 패키지의 programs, recruit_units, allocations, pooled_quotas를 구분 |
| 과거 입결 연결 | `work/_data/admission-plans/structured/result-links/` | 전형 상세의 과거 자료 연결 후보 | 기존 same_label_candidate는 이름 일치 후보. 학년도 간 전형·학과 연속성 확인 후 확정 |
| 학과 계열 | `work/_data/review-queue/fields-draft.csv` | AdminFields → `app/public/data/univ-wiki.json`의 fields | 8,833행 중 추천 6,264행, 빈칸 2,569행. 추천 근거 대조 |
| 대학 위치 | `work/_data/review-queue/univ-map-draft.json` | AdminMap → `app/public/data/univ-map.json` | 224개 캠퍼스 초안. 주소·좌표 0건이므로 출처 자료 보강 필요 |
| 특수 계열 | `work/_data/review-queue/special-tracks-draft.json` | `app/public/data/special-tracks.json`, `app/src/data/specialTracks.ts` | 2,499개 매핑 후보. 검수 입력·내보내기 도구 연결 필요 |
| 수능 최저 | `work/_data/data-integration/minimum-source-review.json` + 기존 문장 초안 | `app/src/screens/MinimumSearch.tsx`의 `loadMinimumSource`, `app/src/domain/minimum.ts`의 MinimumRule | 새 자료를 검수 도구 입력에 연결하고 조건을 표준화. 현재 로더는 rules: [] 반환 |
| 지원 자격 | 구조화 패키지의 `programs[].eligibility` | 지원자격 확인·전형 상세의 데이터 입력 계약 | 원문과 조건 객체를 함께 전달. 판정 형식 변환 시 미확인·원문 미기재를 보존 |
| 환산 규칙 | 구조화 패키지의 `scoring_rules_draft`, `csat_scoring` | 관리자 규칙 편집기 → `app/public/data/scoring-rules.json` | 현재 공개 rules는 빈 배열. 원문 대조 후 검수된 규칙만 계산에 연결 |
| 일정·준비 정보 | 구조화 패키지의 `programs[].schedule`, `preparation` | 입시 일정·전형 준비·체크리스트 데이터 입력 계약 | 미공개 일정과 빈 events를 날짜로 추정하지 않고 상태 보존 |
| 모의고사 등급컷 | 확보된 원본 없음 | `app/src/data/mock-exams.ts`의 cutTables | 출처 자료 확보부터 필요. 현재 빈 배열 |

## 새 수능 최저 자료의 입력 계약

`records[]`의 `package_id`는 원본 패키지 식별자이며 전국 대학 통합 ID라고 가정하지 않는다. 전형·모집단위 ID는 패키지 안에서만 해석한다. `admission_year`와 캠퍼스를 유지한다.

`original_rule`은 원본 규칙 객체 전체다. `source_file` + `source_pointer` + `source_sha256`으로 원본을 다시 확인한다. 레코드 `id`에는 원본 배열 위치가 들어가므로 배열 재정렬 시 달라질 수 있다. 영구 검수 ID로 쓰려면 구현 세션에서 원본 규칙 ID/key 및 버전 정책을 정해야 한다.

`programs`와 `recruit_units`는 표시용 이름을 보강한 목록이다. 같은 패키지의 ID로만 조합했고 학과명 유사도에 의한 결합은 하지 않았다. `evidence_documents`는 규칙 안에 명시된 document_id에 해당하는 원본 메타데이터다.

원본의 status 값은 통일되지 않았다. 1,905건은 status 필드 자체가 없고 classification, required, expression 등 다른 필드를 사용한다. status 부재를 최저 미적용으로 해석하지 않는다. `none`, `none_explicit`, `not_applied`, `not_applicable` 등도 아직 하나의 값으로 변환하지 않았다.

모든 레코드의 `review_status`는 draft, `executable`은 false다. 원문 수치 정확성·공식 최신 여부·실행 가능한 계산 규칙을 검증한 결과가 아니다. 기계 검사 범위는 패키지 안의 전형·모집단위·근거 문서 참조와 PDF 페이지 범위, 원본 보존 여부다.

## 다음 처리 순서

1. 최저 규칙의 다양한 필드를 근거와 함께 정규화하되, 현재 Criterion이 표현할 수 없는 영역별 상한·평균·선택 대안·사회/과학 개별 반영은 별도 유형으로 남긴다.
2. 패키지에 남은 `minimum_scope_pending` 23,512개 범위 항목을 원문과 대조한다. 이 수치는 규칙 건수와 별도이며 4,783건으로 전체 모집범위가 완성된 것은 아니다.
3. 대학·캠퍼스와 과거 입결 연결 후보의 범위를 대조하고, 기존 계열·특수계열 초안에서 충돌·미확인 항목을 보강한다.
4. 검수 도구가 준비된 항목부터 실제 검수·내보내기 결과를 해당 공개 파일에 반영한다.

이번 작업에서 기존 원본, review-queue, app/src, app/public/data 파일은 수정하지 않았다. 구현 세션은 이 문서와 새 검수 자료를 기준으로 입력 연결을 진행할 수 있다.

## 2차 작업: 최저 조건 정규화와 전형·모집단위 연결

2026-11-24 추가 작업. `python work/_data/data-integration/normalize_minimum.py`로 재생성한다. 입력 패키지 해시가 달라지면 중단하므로 먼저 `build.py`로 원본 모음을 갱신해야 한다.

| 파일 | 내용 |
|---|---|
| `minimum-normalized-review.json` | 규칙 4,783건의 적용 여부, 조건 블록, 표준 항목명, 원래 필드 경로, 판정 형식 후보, 미변환 이유 |
| `minimum-scope-review.json` | 대학·캠퍼스·학년도·전형·모집단위별 40,823개 조합과 규칙 연결 상태 |
| `minimum-criterion-candidates.json` | 현재 Criterion 형식의 후보 15개 규칙을 실제 전형·모집단위에 연결한 153행. 모두 미검수·실행 불가 |
| `minimum-unclassified-review.json` | 기존 규칙과 명시적 보류 목록 양쪽에 없는 976개 조합. 수시를 먼저 배치 |
| `normalization-summary.json` | 분류 수, 변환하지 않은 이유, 미분류 대학·캠퍼스, 무결성 검사 결과 |

규칙 분류 결과는 최저 미적용 명시 3,572건, Criterion 형식 후보 15건, 조건 추가 검토 1,196건이다. '미적용'은 원본의 명시적 불리언·상태·none 조건에서만 읽었다. 필드가 없는 경우 미적용으로 간주하지 않는다. 미적용은 수능 응시 의무가 없다는 뜻도 아니다.

조건 블록은 count/choose/area_count, max_sum/sum_limit 등의 이름을 공통 항목으로 모으되, 원본 필드 경로와 값을 모두 남긴다. 대안·논리 조건은 블록 경로로 구별하며 합치지 않는다. 별칭끼리 값이 충돌하면 판정 형식 후보를 만들지 않는다.

Criterion 후보는 조건을 전부 표현할 수 있는 허용 목록에 한정했다. 사회·과학 별도 영역, 한국사를 합산 영역으로 선택, 과학만 허용, 영역별 상한, 영어 등급 보정, 반올림, 추가 응시 의무, 대체 과목, 해석하지 않은 주석 등은 별도 검토 이유로 남긴다. 탐구 1과목이라는 개수만으로 상위 과목 선택을 추정하지 않는다. 따라서 1,196건 모두가 앱 기능 부족이라는 뜻은 아니며, 보수적인 변환기가 아직 처리하지 않는 형식도 포함한다.

범위 검사 결과는 규칙 연결 16,335개 조합, 명시적 보류 23,512개, 미분류 976개다. 중복 연결·규칙과 보류 동시 지정·존재하지 않는 전형/모집단위 참조는 0건이다. 미분류는 원본 자료의 부재를 의미하지 않으며 현재 구조화 패키지의 분류 범위 밖일 수 있다.

미분류 976개는 수시 250개, 정시 722개, 재외국민 4개다. 7개 패키지에 모여 있다.

| 패키지 | 미분류 조합 |
|---|---:|
| 한림대학교 본교 | 326 |
| 강원대학교 춘천 | 194 |
| 가톨릭관동대학교 본교 | 153 |
| 가천대학교 본교 | 139 |
| 강원대학교 삼척·도계 | 82 |
| 한국교원대학교 본교 | 46 |
| 강원대학교 제4캠퍼스(원본 표기) | 36 |

9개 회귀 검사를 통과했다: 합 조건+한국사 상한, 사회·과학 구분, 추가 조건 보존, 탐구 방식 미확인, 별칭 충돌, 적용 여부 충돌, 논리 대안 경로, 잘못된 수치·다중 필수영역 등을 확인했다. 실행: `python -m unittest discover -s work/_data/data-integration -p test_normalize_minimum.py`.

다음 우선 작업은 미분류 수시 250개 조합의 원문 대조다. 공개 입력은 실제 검수 이후에 진행하며, 현재 새 JSON 파일들은 별도 검수 입력 계약이다. 기존 앱 공개 로더가 자동으로 읽는 파일로 보고 복사하지 않는다.

## 3차 작업: 한림대 수시 250개 조합 보완

로컬 보관 원문 `work/_data/admission-plans/sources/hallym-plan-20260602.pdf`의 PDF 12~15쪽(인쇄 10~13쪽)을 텍스트 추출과 렌더 이미지로 대조했다. 원문 SHA-256은 `7977689503c78912b041041d1fc6053f457aeee4f843f47acd498922bd34fba0`이다. 최신 공지를 다시 확인한 작업은 아니다.

| 근거 | 보완한 전형·모집단위 조합 | 건수 |
|---|---|---:|
| PDF 12쪽, 종합 최저 표 | 의학과 이외 종합 모집단위, 의학과 농어촌학생·지역인재_기초 | 58 |
| PDF 13쪽, 교과 최저 표 | 간호학과 이외 교과 모집단위, 간호학과 지역인재_기초·한림케어1·농어촌학생 중 실제 모집 조합 | 132 |
| PDF 14쪽, 실기·특기자 최저 항목 | 실기 일반·지역인재, 체육특기자 | 3 |
| PDF 15쪽, 재외국민및외국인 최저 항목 | 재외국민및외국인·북한이탈주민 | 57 |
| 합계 | 원문에 최저 없음이 명시된 조합 | 250 |

18개 미적용 규칙을 대학별 원본 패키지 `work/_data/admission-plans/structured/universities/plan-0000198.json`의 minimum_rules에 추가했다. 3개 기존 규칙(최저 적용 5개 조합)은 그대로다. 한림대 수시 전체 255개 조합이 정확히 한 규칙씩 연결된다. 재외국민및외국인·북한이탈주민은 이 패키지와 원문에서 수시 항목으로 관리하는 범위를 따랐다.

재현 로직은 `work/_data/admission-plans/structured/hallym_minimum.py`에 있고 기존 `build_hallym.py`도 이 함수를 호출하도록 연결했다. 부분 반영은 `python work/_data/data-integration/supplement_hallym.py`로 실행한다. 근거 PDF의 해시와 표 문구를 확인하고, 최소 범위 필드 외의 기존 값 보존·중복 실행 동일성·의학과/간호학과 적용 예외·패키지 구조 검사를 통과한 뒤 저장한다.

`hallym-supplement-report.json`에 반영 전후 해시와 검사 결과를 남겼다. 근거 렌더는 `evidence/hallym/page-12.png`부터 `page-15.png`까지다. 이어 `build.py`, `normalize_minimum.py`를 실행하여 통합 원본·정규화·범위·미분류 목록을 모두 갱신했고 회귀 검사 9개를 통과했다. 기존 review-queue 문장 파일은 별도 산출물이므로 이번 18개 추가 규칙은 새 통합 검수 자료에서 확인한다.

현재 미분류 수시는 0개이나 기존 명시적 보류 23,512개가 해소되었다는 뜻은 아니다. 다음은 미분류 정시 722개·재외국민 4개의 원문 대조이며, 수능 점수 반영과 별도의 수능 최저 조건을 구분해 처리한다. 모든 보완 규칙은 draft, executable=false 상태다.
