"""Validate the collected source rows and write a transparent coverage inventory."""
from pathlib import Path
import csv,collections,json,re,hashlib
P=Path(__file__).parent;C=P/'gyeonggi-expansion'
SLUGS='ajou gachon dankook hknu hs kau tukorea suwon anyang sungkyul kangnam hansei cha shinhan daejin ptu yongin eulji uhs hsmu ginue cuk kyungdong-yangju jbu dyu stu yewon sjs acts'.split()
LIMITS={
 'gachon':'인천 메디컬캠퍼스 8개 모집단위 제외. 해당 원문 행은 원본 폴더에 별도 보존.',
 'hknu':'학과가 구분되지 않는 일부 전형 전체 합계는 학과별로 배분하지 않음.',
 'uhs':'공식 상담서비스 2024~2026 수시 상세 조회. 현재 모집단위와 연결된 과거 자료이며 정시 조회는 준비중. 일부 신설 모집단위 상세 조회 오류는 원본 폴더 errors JSON에 기록.',
 'hsmu':'2024~2026 수시 원본 확보. 정시 원본 미확인.',
 'ginue':'경기·인천 공통으로 발표된 초등교육과 자료. 캠퍼스별 성적으로 분리 불가.',
 'cuk':'성심캠퍼스. 서울 의예·간호·신학 제외. 지원자/최초합격자/최종등록자, 이수과목 통계 별도. 그래프 이미지는 수치로 추정하지 않음. 2024·2025 정시 80%와 2026 정시 70% 구분.',
 'jbu':'2024~2026 수시 및 2026 정시 수록. 2024 수시는 2025 반영방법, 2026 정시는 2027 반영방법 재산출 자료임. 2024·2025 정시 대학 사이트 원본 미확인.',
 'dyu':'동두천만 수록. 2024~2026 수시, 2024~2025 정시. 정시 공식 메뉴가 2025 결과를 제공하여 2026 결과 미확인.',
 'yewon':'경기드림캠퍼스. 2025 수시 및 2026 수시·정시. 2025 정시 공개 이력은 검색되지만 공식 첨부 URL이 현재 404; 2024 원본 미확인. 캠퍼스 미분리 정원외 합계 제외.',
 'sjs':'공식 지원현황(경쟁률)만 수록. 합격성적 아님. 2024 정시 원본 미확인. 이미지 원본 직접 전사; 병합 모집인원 보존.',
 'acts':'2024~2026 수시, 2026 정시 경쟁률만 수록. 합격자 평균 메뉴의 조회 결과는 빈 표. 정시 과거 연도 조회가 같은 수치를 반환하여 공식 메뉴에 연결된 2026만 채택.',
 'suwon':'전형별 성적·지원현황 원본 수록. 별도 충원 발표 게시물의 모든 차수까지 전수 수록한 자료는 아님.',
}

def read(path):
 with path.open(encoding='utf-8-sig',newline='') as f:
  r=csv.DictReader(f);return r.fieldnames,list(r)

def main():
 allrows=[];coverage=[];exceptions=[];schoolrows=[]
 for slug in SLUGS:
  f=P/(slug+'.csv');fields,rows=read(f)
  assert len({tuple(r.values()) for r in rows})==len(rows),f'duplicate: {slug}'
  for r in rows:
   assert all(r[k] for k in ['university','result_year','round','program','recruit_unit','source_url','source_page']),(slug,r)
   assert r['result_year'] in ['2024','2025','2026']
   assert '.ac.kr/' in r['source_url'] and 'adiga.kr' not in r['source_url']
   for k in ['cut_50','cut_70']:
    if r['metric']=='교과등급' and re.fullmatch(r'\d+(?:\.\d+)?',r[k]):assert 1<=float(r[k])<=9,(slug,r)
   try:
    q,a,co=[float(r[k].replace(',','')) for k in ['quota','applicants','competition_rate']]
    if q>0 and abs(a/q-co)>.12:
     exceptions.append(dict(slug=slug,university=r['university'],source_page=r['source_page'],source_url=r['source_url'],recruit_unit=r['recruit_unit'],quota=q,applicants=a,competition_rate=co,calculated=round(a/q,4)))
     msg='원문 모집·지원인원과 경쟁률 산술 불일치: 원문 값 유지, 추정 정정하지 않음'
     if msg not in r['note']:r['note']+='; '+msg
   except ValueError:pass
  with f.open('w',encoding='utf-8-sig',newline='') as out:
   w=csv.DictWriter(out,fields);w.writeheader();w.writerows(rows)
  allrows.extend(rows);cov=collections.Counter((r['result_year'],r['round']) for r in rows)
  schoolrows.append((slug,' · '.join(sorted({r['university'] for r in rows})),len(rows),cov))
  for y in ['2024','2025','2026']:
   for rd in ['수시','정시']:
    subset=[r for r in rows if r['result_year']==y and r['round']==rd]
    scored=any(r['cut_50'] or r['cut_70'] or (r['metric'] and r['cut_other']) for r in subset)
    coverage.append(dict(slug=slug,university=schoolrows[-1][1],result_year=y,round=rd,rows=len(subset),status=('성적 등 공식 자료 수록' if scored else '지원현황만 수록') if subset else '원본/연도 확인 필요',note=LIMITS.get(slug,''),source_urls=' | '.join(sorted({r['source_url'] for r in subset}))))
 for slug,name,key,reason in [
  ('calvin','칼빈대학교','calvin-susi','경쟁률 게시물 목록 확인. 상세 페이지가 404로 반환되어 데이터 미추출.'),
  ('luther','루터대학교','ltu-inner','공식 입학 홈페이지·입시도우미 검색에서 2024~2026 성적 결과표 미확인.'),
  ('suwoncath','수원가톨릭대학교','suwoncath-list','공식 입학자료모음은 개편된 사이트의 모집요강·서식 중심. 2024~2026 성적표 미확인.'),
  ('sangha','중앙승가대학교','sangha-inner','공식 대학·입학 안내 확인. 학과·전형별 2024~2026 결과표 미확인.')]:
  meta=json.loads((C/(key+'.meta.json')).read_text(encoding='utf8'))
  for y in ['2024','2025','2026']:
   for rd in ['수시','정시']:coverage.append(dict(slug=slug,university=name,result_year=y,round=rd,rows=0,status='미확인/접근 오류',note=reason,source_urls=meta['url']))
 with (P/'_gyeonggi-coverage.csv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,coverage[0].keys());w.writeheader();w.writerows(coverage)
 manifests=[]
 for f in sorted(C.glob('*.meta.json')):
  d=json.loads(f.read_text(encoding='utf8'));manifests.append(dict(key=f.name.removesuffix('.meta.json'),url=d.get('url',''),path=d.get('path',''),sha256=d.get('sha256',''),bytes=d.get('bytes','')))
 with (C/'source-manifest.csv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,manifests[0].keys());w.writeheader();w.writerows(manifests)
 (C/'validation-ratio-exceptions.json').write_text(json.dumps(exceptions,ensure_ascii=False,indent=2),encoding='utf8')
 report=['# 경기권 4년제 대학 입결 조사','', '확인일: 2026-11-19. 대상: 2024·2025·2026학년도. 전문대·서울 대학 재수집 제외.','',f'이번 조사 CSV {len(SLUGS)}개 대학, {len(allrows):,}행. 행 수는 성적 지표·지원현황·충원·분포 등을 포함하므로 학과/전형 수 또는 학생 수가 아니다. 원본에서 공개하지 않은 성적은 공란으로 남겼다.','', '**경기권 전 대학의 3개년 수집이 모두 완료된 상태는 아니다.** 아래 표와 `_gyeonggi-coverage.csv`에서 연도·모집시기별 공백과 제한을 확인할 수 있다. `수록`은 해당 구분에 확인된 자료가 있다는 뜻이며 모든 특별전형·발표 차수를 전수 확인했다는 뜻은 아니다.','', '| 대학 | 2024 수시/정시 | 2025 수시/정시 | 2026 수시/정시 | 행 수 |','|---|---:|---:|---:|---:|']
 for slug,name,n,cov in schoolrows:report.append('| '+name+' | '+' | '.join(str(cov[(str(y),'수시')])+'/'+str(cov[(str(y),'정시')]) for y in [2024,2025,2026])+f' | {n} |')
 report+=['','## 자료 해석 및 공백','',*['- '+slug+': '+v for slug,v in LIMITS.items()],'','- 칼빈대·루터대·수원가톨릭대·중앙승가대는 정규화한 행이 없다. 상세 확인 경로와 이유는 현황 CSV에 기록했다.','- 기존 경기대, 경희대 국제, 한국외대 글로벌, 명지대 자연, 한양대 ERICA, 중앙대 안성, 성균관대 자료는 기존 통합 파일을 유지했다. 기존 자료의 완전성을 이번 조사 완료로 간주하지 않는다. 동국대 고양 바이오메디캠퍼스처럼 서울 입학전형과 합쳐 발표되는 자료도 별도 경기 결과로 재복제하지 않았다.','', '## 검증과 원본','',f'- 필수 열·출처·연도·완전 동일행 중복 검사 통과. 숫자로 공개된 교과 50/70% 컷은 1~9등급 범위 검사 통과. 모집/지원인원과 경쟁률 검산에서 원문 불일치 {len(exceptions)}행을 별도 JSON과 행별 note에 기록했다.','- PDF 대표 페이지와 이미지 전사 원본을 눈으로 대조했다. PDF 병합 셀은 공동 모집단위로 보존하며, 예비순위는 충원인원으로 바꾸지 않았다.','- 평균/최저/80%/90%/100%를 70%로 바꾸지 않았다. 같은 학교도 점수 종류와 기준이 다르므로 metric·basis·cut_other·note를 함께 읽어야 한다.','- 공식 입학처 PDF·XLS/XLSX·HWP·HTML 및 공개 상담서비스 응답을 `gyeonggi-expansion/`에 보존했다. 대학 직접 출처만 수록했으며 어디가 자료는 사용하지 않았다.','- 각 행의 source_url·source_page로 원본을 추적할 수 있다. `source-manifest.csv`에는 조사 자료 URL·다운로드 파일·해시를 기록했다.','- `merge_gyeonggi.py`는 현재 통합 파일을 읽고 이번 대상 대학만 교체하며 다른 대학 행을 보존한다. 통합 직전 백업과 동시 변경 검사도 수행한다.','']
 (P/'_gyeonggi-report.md').write_text('\n'.join(report),encoding='utf8')
 (C/'validation-summary.json').write_text(json.dumps(dict(school_files=len(SLUGS),task_rows=len(allrows),required_fields_missing=0,full_row_duplicates=0,numeric_grade_cut_out_of_range=0,original_ratio_inconsistencies=len(exceptions)),indent=2),encoding='utf8')
 print(len(SLUGS),len(allrows),'ratio exceptions',len(exceptions))

if __name__=='__main__':main()
