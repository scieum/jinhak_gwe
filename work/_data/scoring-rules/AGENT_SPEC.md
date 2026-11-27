# 환산 규칙 초안 작성 지침 (2028 수시 교과전형)

목표: 각 대학·캠퍼스 항목의 **수시 교과전형마다** 학생부 교과(+출결) 환산 규칙 초안 하나를 만든다.
초안은 사람이 규칙 관리 화면에서 원문과 대조해 검수한 뒤에만 계산에 쓰인다(NEVER-1). 그래서 **추측하지 말고, 원문에 있는 것만** 쓴다. 모르는 값은 빈 칸(missing)으로 둔다.

## 입력
- `work/_data/admission-plans/scoring-rules-work/inputs.json` 의 항목: `entry, university, campus, programs[{name, method, pages}], files[{path, document_id, source}], text`
- `text` 파일: 원문 추출 텍스트. 쪽마다 `=== <파일> p.N ===` 표시. 먼저 Grep으로 `학생부`, `반영 교과`, `반영교과`, `등급별`, `환산`, `석차등급`, `성취도`, `출결`, `학년별` 등을 찾아 해당 쪽만 읽는다.
- 표가 텍스트로 깨졌거나 텍스트가 비면 `files[].path` PDF를 Read 도구의 `pages`로 직접 본다(쪽 이미지).

## 출력 (항목마다 한 파일)
`work/_data/admission-plans/scoring-rules-work/drafts/<entry>.json`

```json
{
  "entry": "plan-0002748",
  "university": "inputs.json의 university 그대로",
  "programs": [
    {
      "program": "inputs.json programs[].name 그대로",
      "status": "complete | partial | not_found | not_applicable",
      "fits_engine": true,
      "rule": { ...아래 ScoringRule 필드 중 원문으로 확인한 것만... },
      "missing": ["원문에 없어 비운 필드와 이유"],
      "evidence": [{ "field": "rank_grade_points", "file": "files[].path", "page": 8, "quote": "원문 그대로 짧게(20~120자)" }],
      "note": "엔진과 다른 점, 전형 간 공통 적용 여부 등 검수자에게 알릴 것(한국어, 짧게)"
    }
  ]
}
```

- `status`
  - `complete`: 아래 필수 필드를 모두 원문으로 확인함
  - `partial`: 일부만 확인(예: 반영 교과는 있으나 등급별 점수 없음 — 2028 시행계획엔 흔함, 모집요강에서 나올 예정)
  - `not_found`: 학생부 반영 방법이 이 문서에 없음
  - `not_applicable`: 교과 성적을 점수로 환산하지 않음(예: 교과 정성평가, 면접 100%)
- `fits_engine: false`: 원문 방식이 아래 엔진 모델로 표현되지 않음(예: 평균등급을 먼저 낸 뒤 비선형 변환, 학년·교과별 다른 비율 혼합, 봉사·비교과 점수 포함). note에 이유.
- `evidence.quote` 는 text 파일에 **글자 그대로** 있는 문자열이어야 한다(공백 차이만 허용). 나중에 스크립트로 대조한다. 표 이미지에서 읽은 값이면 quote에 쪽 이미지에서 본 표 머리글을 쓰고 `"from_image": true` 를 붙인다.
- 같은 대학 여러 교과전형이 같은 반영 방법을 쓰면 같은 rule을 복사하되, 원문이 그렇게 말하는 근거를 evidence에 둔다.

## ScoringRule 필드 (엔진 모델)
엔진: 반영 학기·교과 과목마다 `등급점수/최고점수` 비율을 구해 (단위수 가중이면 단위수로) 평균 → `교과점수 = base_score + 비율 × (grade_max_score − base_score)` → 출결 점수를 더해 `max_score`.
즉 **과목별 등급점수의 (단위수) 가중 평균**을 선형으로 만점에 맞추는 방식만 표현된다.

| 필드 | 값 |
|---|---|
| admission_year | 2028 |
| university, program | 입력 그대로 |
| semesters | 반영 학기. `"1-1","1-2","2-1","2-2","3-1"`(수시는 보통 3-1까지) |
| year_weights | 학년별 반영비율이 있을 때만. 예 `{"1":0.2,"2":0.4,"3":0.4}` (합 1, 키는 반영 학년) |
| subject_groups | 반영 교과. 앱 교과명만: 국어, 수학, 영어, 사회, 과학, 한국사, 기술·가정, 제2외국어, 한문, 정보, 교양, 체육, 예술. "사회(역사/도덕 포함)"이면 사회+한국사 |
| selection | `{"mode":"all"}` / `{"mode":"top_n_per_group","n":N}`(교과별 상위 N과목) / `{"mode":"top_n_total","n":N}` |
| credit_weighted | 단위수(학점) 가중이면 true |
| rank_grade_points | **5등급제** 석차등급별 점수 `{"1":..,"2":..,"3":..,"4":..,"5":..}` (2028 입학생은 5등급). 9등급표만 있으면 쓰지 말고 missing |
| achievement_points | 성취도 A~E 점수(진로선택 등 반영 시) `{"A":..,"B":..,"C":..,"D":..,"E":..}` |
| achievement_blend | 석차등급 과목에 성취도를 섞을 때만 `weighted`(rank_ratio) / `max`. 아니면 `{"mode":"none"}` |
| no_rank_subject_policy | 석차등급 없는 과목(진로·융합선택): `exclude` / `achievement_convert`(성취도 점수로 반영) / `bonus`(가산점) |
| bonus | no_rank_subject_policy가 bonus일 때 `{"points":{"A":..},"max":..}` |
| joint_curriculum_policy | 공동교육과정 `include`/`exclude` (원문에 없으면 `include` 두고 missing에 적기) |
| grade_max_score | 교과 만점(전형 총점 중 교과 몫, 예 1000점 중 교과 90% → 900) |
| base_score | 교과 기본점수(없으면 0) |
| attendance_rule | 출결 반영 시 `{"years":[1,2,3],"tardy_to_absence":3,"max_score":..,"deduction_table":[{"absence_max":0,"points":0},...]}` — absence_max 오름차순, points는 감점(누적 아님, 그 구간 감점) |
| max_score | grade_max_score + 출결 만점 (면접 등 다른 요소는 넣지 않음. 학생부 반영 부분만) |
| rounding | `{"digits":2,"mode":"round"}` 원문에 소수점 처리 규정이 있으면 그대로 |

필수(complete 조건): semesters, subject_groups, selection, credit_weighted, rank_grade_points(1~5), grade_max_score, max_score, no_rank_subject_policy.
수치는 원문 단위 그대로(1000점 만점이면 1000). 비율만 있고 점수가 없으면 100점 만점 기준으로 환산하지 말고 missing.

## 하지 말 것
- 원문에 없는 값 채우기, 다른 학년도(2027 이전) 표 쓰기, 9등급표를 5등급으로 바꾸기
- 합격 가능성 표현
- inputs.json·text·원문 파일 수정
