from pathlib import Path
from collections import Counter
import csv, hashlib, json, sys
P=Path(__file__).resolve().parent.parent;Q=P/'quality-review'
def read(p):
 with p.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 before=read(Q/'_all.before-quality.csv');after=read(P/'_all.csv')
 changes=json.loads((Q/'verified-changes.json').read_text(encoding='utf8'))
 summary=json.loads((Q/'summary.json').read_text(encoding='utf8'))
 assert len(before)==len(after)==58545
 diff=[i+2 for i,(a,b) in enumerate(zip(before,after)) if a!=b]
 assert diff==[r['record'] for r in changes['file_changes'] if r['file']=='_all.csv']
 assert len(diff)==11
 assert sha(P/'_all.csv')==summary['sha256']==changes['after_hashes']['_all.csv']
 assert summary['missing_from_master']==summary['master_not_in_source_files']==summary['exact_duplicate_excess']==0
 assert not summary['severities'].get('error',0)
 index=read(Q/'row-index.csv');assert len(index)==len(after)
 assert all(int(r['record'])==i+2 and r['row_sha256']==hashlib.sha256(json.dumps(after[i],ensure_ascii=False,sort_keys=True).encode()).hexdigest() for i,r in enumerate(index))
 findings=read(Q/'findings.csv');gaps=read(Q/'gaps.csv');coverage=read(Q/'coverage.csv')
 assert len(coverage)==len({(r['slug'],r['result_year'],r['round']) for r in coverage})
 assert all(r['rows']=='0' for r in gaps)
 stats=dict(total_rows=len(after),unchanged_rows=len(after)-len(diff),corrected_rows=len(diff),added_rows=0,removed_rows=0,remaining_review_records=len({r['record'] for r in findings}),review_findings=len(findings),coverage_units=len(coverage)//6,empty_coverage_cells=len(gaps),units_with_gaps=len({r['slug'] for r in gaps}),programs=len(read(Q/'program-coverage.csv')),name_variants=len(read(Q/'unit-name-candidates.csv')),sha256=summary['sha256'],checks='passed')
 (Q/'validation.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf8')
 lines=['# 통합 입결 데이터 점검 결과','', '확인일: 2026-11-19. 대상 학년도: 2024·2025·2026. 전문대 제외, 대학 입학처 공식 자료 기준 유지.','',
 f'통합본 **58,545행 중 11행을 정정**했습니다. 나머지 **58,534행의 순서·내용은 동일**하며 추가·삭제한 행은 없습니다. 전체 대학·전형의 수집 완료 또는 독립 검수 완료를 뜻하지 않습니다.','',
 '## 확인된 오류 수정','',
 '| 대상 | 행 | 조치 |','|---|---:|---|',
 '| 광운대 2025·2026 정시 재직자 전형 | 7 | cut_70의 원문 환산점수를 교과등급으로 분류했던 오류 수정. metric=환산점수, grade_system 공란. 기존 숫자와 별도 학생부등급은 보존 |',
 '| 가톨릭관동대 2026 수시 기초생활·차상위 치위생·작업치료 | 2 | 원문 등록 0명, 70% 표기 0.00. 유효 등급이 아니므로 컷 공란, 원문 숫자는 cut_other에 보존 |',
 '| 상지대 2026 농어촌 수시 건설환경·정시 경영 | 2 | 원문 50%·70% 표기 0.0을 유효 컷에서 제외하고 원문값 별도 보존. 미산출 사유는 추정하지 않음 |','',
 '검출 당시 등급 범위 오류 13건은 11행에 해당합니다(상지 2행은 각각 두 칸). 학교별 CSV와 `_all.csv`를 함께 수정했습니다. 광운대는 서울 신규 수집이 아니라 통합본에서 발견한 지표 오류 정정입니다.','',
 '## 전체 구조·중복 검증','',
 '- 학교별 허용 CSV 106개와 통합본을 비교: 누락 0, 통합본에만 있는 행 0.',
 '- 필수 식별 열·출처·학년도·디코딩 검사 및 수정 후 등급 1~9 범위 검사 오류 0.',
 '- 20열 스키마와 UTF-8 BOM 유지. 금지 출처 및 전문대의 통합본 재유입 없음.',
 '- 완전 동일행 중복 0. 대학·연도·모집시기·전형·모집단위·지표·기준이 같은 후보는 348묶음, 995행. 이 수치는 삭제할 중복 개수가 아님.',
 '- 강원대는 모집단위 변환 표에서 같은 수치가 다른 원문 행에 반복됨. 경인교대는 등급 구간별 분포 행, 한경국립대는 전체 성적과 교과별 통계, 서울신학대는 충원과 성적이 별도 행임. 원문 위치·세부 통계를 포함해 구분하고 유지함.',
 f'- 모집/지원/경쟁률 관계 152건, 50%·70% 순서 검토 126건이 남음. 총 {stats["remaining_review_records"]}행의 검토 항목이며 원문 오류 확정 건수가 아님. 반올림, 점수 기준 정렬, 별도 분모 등을 원문별로 대조해야 함. 임의 산술 보정하지 않음.','',
 '## 수집 공백','',
 f'기존 지역 조사목록과 경기 소재 기존 캠퍼스, 경동대 고성을 합친 **{stats["coverage_units"]}개 수집단위 × 3개 학년도 × 수시·정시 = {len(coverage)}칸**을 점검했습니다. 이 가운데 **{len(gaps)}칸({stats["units_with_gaps"]}개 수집단위)**은 통합 행이 없습니다. 수집단위는 대학 수와 같지 않으며 캠퍼스·통합 발표 자료를 포함합니다. 행이 있는 칸도 모든 학과·전형·지표 수집 완료를 뜻하지 않습니다.','',
 '| 수집단위 | 빈 연도·모집시기 | 상태·근거 |','|---|---|---|']
 for slug in sorted({r['slug'] for r in gaps}):
  rr=[r for r in gaps if r['slug']==slug]
  label=rr[0]['university'];desc=rr[0]['limitations'] or '기존 수집본에 해당 연도·모집시기 행 없음. 공식 원문 추가 확인 필요.'
  if slug=='cau':desc='안성캠퍼스만 점검. 서울 자료를 안성으로 복제하지 않음.'
  if slug=='skku':desc='기존 파일에는 2025년 자료만 수록. 서울·수원 공통 발표 범위와 2024·2026 원문 확인 필요.'
  lines.append(f'| {label} | '+', '.join(r['result_year']+' '+r['round'] for r in rr)+' | '+desc.replace('|','/')+' |')
 lines+=['',
 '이번 웹 재확인: 연세대 미래 공식 Q&A는 어디가 조회를 안내, 우석대 공식 목록은 방화벽 차단, 칼빈대 공식 상세는 404, 금강대 목록은 2025까지, 중원대 대상 연도 목록은 수시 자료만 확인했습니다. 한라대의 파일명 2024 정시 PDF는 실제 제목이 2025 예상치여서 2024 입결에 넣지 않았습니다. 다른 공백은 기존 조사기록과 현재 통합본의 대조 결과이며 이번에 전부 다시 웹 열람한 것은 아닙니다.','',
 '공군사관학교·경찰대학·국군간호사관학교·글로벌사이버대·건양사이버대 등 기존 보고서의 특수·원격대학 추가 확인 과제는 이 91개 수집단위 밖에 남아 있습니다.','',
 '## 지표·캠퍼스·학과명 정리','',
 '- `row-index.csv`: 원본 레코드 번호와 행 해시로 연결하는 58,545행 색인. 지표 종류, 원문에 등장하는 통계명·대상, 재산출 표시, 중복 후보, 검토 사유를 구분. 모든 행은 draft 유지.',
 '- 평균·최저·75/80/90/100%를 70% 컷으로 바꾸지 않음. `cut_other`의 문구 분류는 숫자 추출/공식 의미 확정이 아님. 빈 metric 5,320행도 경쟁률·충원만 있는 경우가 있으므로 일괄 채우지 않음.',
 '- `university-aliases.csv`: 원문 대학명 121개와 파일명을 연결. 캠퍼스 미표기는 미표기로 유지. 한국교통대 의왕·충주/증평·통합, 건양대 논산·대전, 유원대 영동·아산 등을 구분.',
 f'- `program-coverage.csv`: {stats["programs"]:,}개 전형 식별 조합의 연도별 행 수. 공백은 신설·폐지·개명일 수 있어 수집 누락으로 자동 단정하지 않음.',
 f'- `unit-name-candidates.csv`: 띄어쓰기·구두점 차이 {stats["name_variants"]}묶음. 공식 개편 이력이 없는 상태에서 학과를 합치거나 과거 이름을 덮어쓰지 않음.','',
 '## 파일과 재현','',
 '- 현재 통합 데이터: [_all.csv](_all.csv)',
 '- 수집 공백: [gaps.csv](quality-review/gaps.csv)',
 '- 전체 수집 범위: [coverage.csv](quality-review/coverage.csv)',
 '- 수치 검토: [findings.csv](quality-review/findings.csv)',
 '- 중복 후보: [duplicate-candidates.csv](quality-review/duplicate-candidates.csv)',
 '- 행별 지표 색인: [row-index.csv](quality-review/row-index.csv)',
 '- 검증 결과: [validation.json](quality-review/validation.json)',
 '- 정정 이력·이전/이후 값: [verified-changes.json](quality-review/verified-changes.json)',
 '', '원본 백업은 `quality-review/*.before-quality.csv`, 공식 PDF와 검토 페이지도 같은 폴더에 보존했습니다. `audit_master.py`는 읽기 전용 검증 및 색인 생성, `quality-review/finalize_audit.py`는 변경·보존 검증입니다. 이전 파서 전체 재실행 시 이번 정정을 덮어쓸 수 있으므로 정정 스크립트 `apply_verified_fixes.py`도 다시 적용해야 합니다.',
 '', '레코드 번호는 CSV의 논리적 데이터 순서(헤더=1)이며 줄바꿈을 포함한 물리적 텍스트 줄 번호가 아닙니다. 색인은 이 통합본 해시와 함께 사용해야 합니다.',f'`{summary["sha256"]}`','']
 (P/'_quality-report.md').write_text('\n'.join(lines),encoding='utf8')
 print(json.dumps(stats,ensure_ascii=False,indent=2))
if __name__=='__main__':sys.stdout.reconfigure(encoding='utf8');main()
