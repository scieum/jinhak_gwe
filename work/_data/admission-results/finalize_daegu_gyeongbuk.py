"""Validate and merge only this region, preserving concurrently edited other regions."""
from pathlib import Path
from collections import Counter,defaultdict
import csv,json,hashlib,io,re,os
import merge
P=Path(__file__).parent;C=P/'national-expansion';F=merge.COLS
ROSTER=json.loads((C/'daegu-roster.json').read_text(encoding='utf8'))
def read(p):
 with p.open(encoding='utf-8-sig',newline='') as f:
  r=csv.DictReader(f);assert r.fieldnames==F,(p,r.fieldnames);return list(r)
def write(p,rows,fields=F):
 with p.open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
def digest(b):return hashlib.sha256(b).hexdigest()
def main():
 regional=[];by_slug={};files=[];review=[]
 for d in ROSTER:
  sl=d['slug'];part=[]
  for suffix in ['', '-adiga']:
   p=P/(sl+suffix+'.csv')
   if not p.exists():continue
   rows=read(p);files.append({'file':p.name,'rows':len(rows),'sha256':digest(p.read_bytes())})
   for r in rows:
    assert set(r)==set(F) and all(v is not None for v in r.values()),p
    assert r['result_year'] in ['2024','2025','2026'],r
    assert all(r[k] for k in ['university','round','program','recruit_unit','source_url','source_page']),r
    assert bool(merge.ADIGA_SOURCE.search(r['source_url']))==bool(suffix),p
    for col in ['cut_50','cut_70']:
     if not r[col]:continue
     n=float(r[col]);assert n>0,(p,col,r)
     if r['metric']=='교과등급':assert 1<=n<=9,(p,col,r)
     if r['metric']=='백분위':assert n<=100,(p,col,r)
    if '범위 밖' in r['note'] or '사용 보류' in r['note'] or '모집인원 0과' in r['note'] or '확정 불가' in r['note'] or '확정 보류' in r['note'] or '불일치 확인 필요' in r['note']:
     review.append({'university':r['university'],'result_year':r['result_year'],'program':r['program'],'recruit_unit':r['recruit_unit'],'issue':r['note'],'source_url':r['source_url'],'source_page':r['source_page']})
   part+=rows
  by_slug[sl]=part;regional+=part
 assert len(regional)==len({tuple(r[k] for k in F) for r in regional}),'exact duplicate rows'
 # Source-specific repeated keys are auditable, not silently collapsed.
 groups=defaultdict(list)
 for r in regional:groups[tuple(r[k] for k in ['university','result_year','round','admission_type','program','recruit_unit','source_url'])].append(r)
 for k,rs in groups.items():
  if len(rs)>1:
   for r in rs:review.append({'university':r['university'],'result_year':r['result_year'],'program':r['program'],'recruit_unit':r['recruit_unit'],'issue':'동일 출처에서 같은 전형·모집단위 반복; 원문 표/집단 구분 확인','source_url':r['source_url'],'source_page':r['source_page']})
 for r in json.loads((C/'daegu-adiga-excluded-source-duplicates.json').read_text(encoding='utf8')):
  review.append({k:r[k] for k in ['university','result_year','program','recruit_unit','issue','source_url','source_page']})
 master=P/'_all.csv';before=master.read_bytes();old=list(csv.DictReader(io.StringIO(before.decode('utf-8-sig'))))
 owned={(r['university'],r['source_url']) for r in regional}
 retained=[r for r in old if (r['university'],r['source_url']) not in owned]
 combined=retained+regional
 backup=C/f'_all-before-daegu-{digest(before)[:12]}.csv'
 if not backup.exists():backup.write_bytes(before)
 tmp=P/'_all.daegu-pending.csv';write(tmp,combined)
 assert master.read_bytes()==before,'Master changed concurrently; rerun against newest snapshot'
 assert read(tmp)[:len(retained)]==retained
 os.replace(tmp,master)
 assert read(master)==combined
 write(P/'_daegu-gyeongbuk.csv',regional);write(P/'_all-대구경북.csv',regional)
 coverage=[];gaps=[];schooltable=[]
 for d in ROSTER:
  sl=d['slug'];rows=by_slug[sl];name=re.sub(r'\[.*?\]','',d['unvNm']);summary=[]
  for y in ['2024','2025','2026']:
   yr=[r for r in rows if r['result_year']==y];cnt=Counter(r['round'] for r in yr)
   coverage.append({'slug':sl,'university':name,'result_year':y,'susi_rows':cnt['수시'],'jeongsi_rows':cnt['정시'],'other_rows':sum(v for k,v in cnt.items() if k not in ['수시','정시']),'rows':len(yr),'rows_with_50_or_70_cut':sum(bool(r['cut_50'] or r['cut_70']) for r in yr),'admission_office_rows':sum('adiga.kr' not in r['source_url'] for r in yr),'adiga_rows':sum('adiga.kr' in r['source_url'] for r in yr)})
   summary.append(str(len(yr)))
   for rd in ['수시','정시']:
    if not cnt[rd]:
     reason='해당 모집시기 수치 원문 미확보; 모집 미실시를 뜻하지 않음'
     if sl=='ytus':reason='2024 공개 결과 본문 공란; 2025 비공개; 2026 공개 결과 표 유효수치 없음; 입학처 접근 403'
     if sl=='dgau':reason='입학처 결과 게시판은 2022 이전 게시물; 어디가 2024·2025 결과표 미수록, 2026 성적 비공개'
     gaps.append({'university':name,'result_year':y,'round':rd,'status':'미확보/미공개','reason':reason,'source_url':f'https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&searchSyr={int(y)+1}&unvCd={d["unvCd"]}'})
  schooltable.append(f'| {name} | '+ ' | '.join(summary)+f' | {len(rows)} |')
 gaps.extend([
 {'university':'대구예술대학교','result_year':'2026','round':'수시','status':'성적 비공개','reason':'4행은 모집인원 공개 행. 성적은 소수 모집단위 공개 시 혼란 우려로 미제출 사유만 공개; 성적 확보로 집계하지 않음','source_url':'https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&searchSyr=2027&unvCd=0000087'},
 {'university':'전체','result_year':'2024~2026','round':'전체','status':'부분 수집','reason':'어디가 표는 모든 실기·재외국민·추가모집을 포함하지 않음. 입학처 미확보 학교의 해당 전형은 후속 조사 필요. 3개년 행 존재가 전체 전형 완결을 뜻하지 않음','source_url':'https://www.adiga.kr/uct/acd/ade/criteriaAndResultView.do?menuId=PCUCTACD2000'},
 {'university':'경북대학교','result_year':'2023~2026','round':'특별전형','status':'연도별 통합 제외','reason':'4개년 합산 자료는 연도별로 분배하지 않고 national-expansion/knu-pooled-special-results.json에 원문 보관','source_url':'https://ipsi1.knu.ac.kr/_common/new_download_file.php?menu=boardfile&file_no=5096'},
 {'university':'포항공과대학교·DGIST','result_year':'2024~2026','round':'전체','status':'5번 특수학교 단계 예정','reason':'사용자 지정 조사 순서에 따라 이번 지역 통합 범위에서 제외','source_url':''}])
 write(P/'_daegu-gyeongbuk-coverage.csv',coverage,list(coverage[0]))
 write(P/'_daegu-gyeongbuk-gaps.csv',gaps,list(gaps[0]))
 if review:write(P/'_daegu-gyeongbuk-review.csv',review,list(review[0]))
 src=Counter((r['university'],r['result_year'],r['source_url']) for r in regional)
 write(P/'_daegu-gyeongbuk-sources.csv',[dict(university=u,result_year=y,source_url=url,rows=n) for (u,y,url),n in sorted(src.items())],['university','result_year','source_url','rows'])
 cov=Counter((r['university'],r['result_year'],r['round']) for r in combined)
 lines=['| 대학 | 학년도 | 수시 | 정시 | 기타 |','|---|---|---:|---:|---:|']
 for u,y in sorted({(u,y) for u,y,_ in cov}):lines.append(f'| {u} | {y} | {cov[u,y,"수시"]} | {cov[u,y,"정시"]} | {sum(n for (a,b,c),n in cov.items() if a==u and b==y and c not in ["수시","정시"])} |')
 (P/'_coverage.md').write_text(f'총 {len(combined):,}행 (출처별 통계행; 전형 수·인원 합계가 아님)\n\n'+'\n'.join(lines)+'\n',encoding='utf8')
 official=sum('adiga.kr' not in r['source_url'] for r in regional);adiga=len(regional)-official
 validation={'before_rows':len(old),'after_rows':len(combined),'retained_other_rows':len(retained),'replaced_owned_rows':len(old)-len(retained),'regional_rows':len(regional),'official_rows':official,'adiga_rows':adiga,'exact_duplicate_rows':0,'invalid_grades':0,'other_rows_preserved':True,'backup':str(backup),'before_sha256':digest(before),'after_sha256':digest(master.read_bytes()),'source_files':files,'review_rows':len(review),'gap_items':len(gaps)}
 (C/'stage2-validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf8')
 report=f'''# 대구·경북 2024~2026학년도 입결 조사

2026-11-19, **부분 수집 · draft 검수 대기**. 4년제 학부 20개 대학을 조사했다. 전문대·폴리텍 제외, 포항공대·DGIST는 사용자 지정 5번 단계로 남겼다.

지역 통계 **{len(regional):,}행**(입학처 {official:,}, 대학 제공 어디가 {adiga:,})을 `_all.csv`에 반영했다. 통합본은 **{len(combined):,}행**이다. 기존 다른 자료 {len(retained):,}행은 내용과 순서를 보존했다. 19개 대학에 행이 있으나 대구예술대는 2026 모집인원 4행만 있고 성적은 비공개다. 영남신학대는 유효 수치가 없어 0행이다. **18개 대학에 3개년 수치가 있다는 뜻이며, 모든 학과·전형 수집 완료는 아니다.**

| 대학 | 2024 | 2025 | 2026 | 합계 |
|---|---:|---:|---:|---:|
'''+ '\n'.join(schooltable)+f'''

## 자료와 지표

- [지역 CSV](_daegu-gyeongbuk.csv), [학년도·모집시기별 현황](_daegu-gyeongbuk-coverage.csv), [공식 출처](_daegu-gyeongbuk-sources.csv), [공백 목록](_daegu-gyeongbuk-gaps.csv), [검토 {len(review)}행](_daegu-gyeongbuk-review.csv).
- 대학별 입학처 CSV와 `-adiga.csv`를 구분했다. 입학처에 없는 컷·전형을 보완하므로 출처가 다른 같은 모집단위가 반복될 수 있다. 모집인원·지원인원을 행 수대로 합산하지 않는다. 평균·50%·70%·85%·90%·최저를 혼용하지 않는다.
- 대구한의대 2024·2025: 입학처 평균·90%로 발표된 값이 어디가 50%·70%에 반복된다. 해당 어디가 수시 표준 컷은 비우고 원문 열과 사유를 보존했다. 김천대 입학처는 검정고시를 포함하므로 어디가와 다른 대상이다.
- 영남대 2024 정시: 일반학생 표에 반복된 지역인재 의예과·약학부 2행은 제외하고 별도 지역인재 표를 수록했다. 해당 표의 총점 800은 입학처 810과 달라 확인 대상으로 남겼다. [제외한 원문 행](national-expansion/daegu-adiga-excluded-source-duplicates.json).
- 경북대 특별전형 4개년 합산은 연도별로 쪼개지 않았다. 경국대 2024·2025 당시 교명은 국립안동대다. 동양대는 입학처 캠퍼스 구분표와 대조해 영주만 수록했다. 과거와 현재 학과명을 임의 통합하지 않았다.
- 다음 학년도 계획 모집인원을 과거 입결 모집인원에 넣지 않았다. 후보번호·충원순위는 충원인원과 구분했다. 소수인원 비공개, 등록자 없음, 결과 미존재는 0등급으로 바꾸지 않았다.
- 2026 표의 모든 값이 0이고 성적 미제출인 행은 입결 행으로 늘리지 않고 [공개불가 원문 목록](national-expansion/daegu-adiga-unavailable.json)에 남겼다. 2026 결과는 어디가의 **2027 안내**에 포함되며 자료게시연도와 입학학년도를 구분했다.

## 확인 범위와 재현

20열 스키마·필수 출처·3개 학년도·등급 범위·정확히 같은 행 중복을 검사했다. PDF 표 머리말·대표 행은 화면으로 대조했으며 2025 대구교대 이미지 표는 직접 전사했다. 전체 행에 대한 독립 2인 검수는 아직 아니다. 기존 앱 데이터는 변경하지 않았다.

입학처 원문: `normalize_daegu.py`, `normalize_dnue.py`, `normalize_daegu_extra.py`. 어디가: `normalize_daegu_adiga.py`. 통합: `finalize_daegu_gyeongbuk.py`. [검증·해시·백업 기록](national-expansion/stage2-validation.json). `merge.py`에도 지역과 허용 대학을 등록했다. 원문과 요청 메타데이터·표별 추출 개수는 `national-expansion/`에 보관했다.

계명대 입학처는 TLS 연결 오류, 영남신학대 입학처는 403으로 해당 원문을 확보하지 못했다. 대구예술대 2024·2025, 영남신학대 3개년, 대신대 일부 정시 및 입학처 미확보 학교의 실기·특별전형은 공백 목록과 함께 후속 확인이 필요하다. 다음 사용자 지정 지역은 **울산·부산·경남**이다.
'''
 (P/'_daegu-gyeongbuk-report.md').write_text(report,encoding='utf8')
 print(json.dumps({k:v for k,v in validation.items() if k not in ['source_files','backup']},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
