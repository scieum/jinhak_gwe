"""Validate this region and append to the latest master without rebuilding other regions."""
from finalize_daegu_gyeongbuk import read,write,digest,P,C,F
from collections import Counter,defaultdict
import csv,json,io,re,os
import merge
ROSTER=json.loads((C/'buk-roster.json').read_text(encoding='utf8'))
PREFIX='_busan-ulsan-gyeongnam'

def main():
 regional=[];files=[];by_school=defaultdict(list);review=[];gaps=[]
 for d in ROSTER:
  sl=d['slug'];name='영산대학교' if sl.startswith('ysu-') else re.sub(r'\[.*?\]','',d['unvNm'])
  for suffix in ['', '-adiga']:
   f=P/(sl+suffix+'.csv')
   if not f.exists():continue
   rs=read(f);files.append(dict(file=f.name,rows=len(rs),sha256=digest(f.read_bytes())))
   for r in rs:
    assert all(v is not None for v in r.values()),f
    assert r['result_year'] in ['2024','2025','2026'],r
    assert r['round'] in ['수시','정시'],r
    assert r['admission_type'] in ['교과','종합','논술','실기','수능','기타'],r
    assert all(r[k] for k in ['university','program','recruit_unit','source_url','source_page']),r
    assert not re.fullmatch(r'[\d., -]+',r['recruit_unit']),r
    assert bool(merge.ADIGA_SOURCE.search(r['source_url']))==bool(suffix),(f,r)
    assert merge.region(sl,r['university'])=='부울경'
    for col in ['cut_50','cut_70']:
     if not r[col]:continue
     n=float(r[col]);assert n>0,(f,col,r)
     if r['metric'] in ['교과등급','수능등급']:assert 1<=n<=9,(f,col,r)
     if r['metric']=='백분위':assert n<=100,(f,col,r)
    if any(z in r['note']+r['program']+r['recruit_unit'] for z in ['범위 밖','확정 불가','확정 보류','확인 필요','미표기','미기재','복수 성적 열']):
     review.append({k:r[k] for k in ['university','result_year','program','recruit_unit','source_url','source_page']}|{'issue':r['note']})
   by_school[name]+=rs;regional+=rs
 assert len(by_school)==23,len(by_school)
 assert len(regional)==len({tuple(r[k] for k in F) for r in regional}),'exact duplicate'
 groups=defaultdict(list)
 for r in regional:groups[tuple(r[k] for k in ['university','result_year','round','admission_type','program','recruit_unit','source_url'])].append(r)
 repeated={k:rs for k,rs in groups.items() if len(rs)>1}
 for rs in repeated.values():
  for r in rs:review.append({k:r[k] for k in ['university','result_year','program','recruit_unit','source_url','source_page']}|{'issue':'같은 출처의 동일 전형·학과 반복. 원문 충원순위 차이 또는 구분 누락 여부 확인; 임의 합산 금지'})
 quarantine=json.loads((C/'buk-adiga-quarantine.json').read_text(encoding='utf8'))
 write(P/(PREFIX+'-quarantine.csv'),quarantine)
 for r in quarantine:review.append({k:r[k] for k in ['university','result_year','program','recruit_unit','source_url','source_page']}|{'issue':r['note']})
 # Reviewable per-year coverage; Youngsan's shared historical tables count once.
 coverage=[];table=[]
 for name,rs in by_school.items():
  cells=[]
  for y in ['2024','2025','2026']:
   yr=[r for r in rs if r['result_year']==y];assert yr,(name,y);cnt=Counter(r['round'] for r in yr)
   coverage.append(dict(university=name,result_year=y,susi_rows=cnt['수시'],jeongsi_rows=cnt['정시'],rows=len(yr),rows_with_50_or_70_cut=sum(bool(r['cut_50'] or r['cut_70']) for r in yr),admission_office_rows=sum('adiga.kr' not in r['source_url'] for r in yr),adiga_rows=sum('adiga.kr' in r['source_url'] for r in yr)))
   cells.append(str(len(yr)))
   for rd in ['수시','정시']:
    if not cnt[rd]:gaps.append(dict(university=name,result_year=y,round=rd,status='수치 미확보',reason='해당 모집시기 공개 수치 미확보. 모집을 실시하지 않았다는 뜻은 아님.'))
  table.append('| '+name+' | '+' | '.join(cells)+f' | {len(rs)} |')
 notes=[
 ('전체','2024~2026','전체','부분 수집','23개교 3개년 수치 확보는 모든 학과·전형 완결을 뜻하지 않음. 실기·정원외·재외국민·추가모집 등 입학처 추가 대조 필요.'),
 ('국립한국해양대·동서대·부산외국어대·가야대·부산장신대·창신대·진주교대','2024~2026','전체','어디가 우선 확보','대학 제공 어디가 결과를 수록했으며 입학처 원문 전체 전형 추가 조사·추출이 남음.'),
 ('울산대학교','2024','전체','이미지 PDF 판독 대기','입학처 PDF 원본은 확보했으나 이미지 형식으로 표 자동 추출 불가. 어디가 결과로 보완.'),
 ('울산대학교','2026','수시','원문 비수치','미래모빌리티공학부 입학처 70% 셀의 비수치 s는 원문 보존하고 표준 컷 공란. 원문 정정 확인 필요.'),
 ('신라대학교','2024~2025','수시','이미지 PDF 판독 대기','공식 PDF 원본 확보, 이미지 판독 미완료. 어디가 결과 수록.'),
 ('부산교육대학교','2026','전체','HWP 추가 추출','공식 한글 첨부 원본 확보(bnue-2026.xls: 다운로드 감지 확장자이며 실제 HWP). 어디가 결과 수록.'),
 ('부산대학교','2024','전체','입학처 원문 미확보','어디가 공개 결과 수록. 입학처 PDF는 2025·2026만 정규화.'),
 ('경성대학교·고신대학교·신라대학교','2024~2026','정시','입학처 추가 조사','정시 수치는 어디가 제공 범위로 보완. 입학처 원문 대조 필요.'),
 ('부산가톨릭대학교','2024','수시','5행 사용 보류','어디가 표24가 앞의 농어촌 전형명을 반복. 입학처 사회배려대상자 모집인원과 일치하나 임의 수정하지 않고 5행을 quarantine으로 분리.'),
 ('동명대학교','2024~2026','수시','원문 묶음 전형','면접/군사/특기자 등 복수 전형을 묶어 공개한 표는 개별 전형으로 임의 분리하지 않음.'),
 ('영산대학교','2024~2026','전체','공통 표·재산출 기준','두 캠퍼스 공통 표는 한 번 수록. 수시 최종합격자 성적의 다음 학년도 반영방법 재산출 및 2026 정시의 2027 모집단위 명칭을 명시.'),
 ('신라대학교','2026','수시','재산출 기준','2027 진로선택과목 반영방법으로 재산출한 2026 결과. 실제 당시 산출등급과 혼용하지 않음.'),
 ('국립창원대학교·동서대학교','2024~2025','전체','원문 반복행 검토','같은 전형·모집단위 원문 반복 행을 검토 목록으로 분리 표시. 충원순위·전형 구분 차이를 임의 확정하지 않음.'),
 ('UNIST·해군사관학교','2024~2026','전체','5번 단계 예정','사용자 지정 순서에 따라 특수학교 조사 단계로 남김.')]
 gaps += [dict(university=u,result_year=y,round=rd,status=st,reason=reason) for u,y,rd,st,reason in notes]
 # Merge with a fresh snapshot, preserving all non-owned rows and their order.
 master=P/'_all.csv';before=master.read_bytes();old=list(csv.DictReader(io.StringIO(before.decode('utf-8-sig'))))
 owned={(r['university'],r['source_url']) for r in regional}
 retained=[r for r in old if (r['university'],r['source_url']) not in owned];combined=retained+regional
 backup=C/f'_all-before-buk-{digest(before)[:12]}.csv'
 if not backup.exists():backup.write_bytes(before)
 tmp=P/'_all.buk-pending.csv';write(tmp,combined)
 assert master.read_bytes()==before,'Concurrent master update: rerun against latest snapshot'
 assert read(tmp)[:len(retained)]==retained
 os.replace(tmp,master);assert read(master)==combined
 write(P/(PREFIX+'.csv'),regional);write(P/'_all-부울경.csv',regional)
 write(P/(PREFIX+'-coverage.csv'),coverage,list(coverage[0]));write(P/(PREFIX+'-gaps.csv'),gaps,list(gaps[0]))
 write(P/(PREFIX+'-review.csv'),review,list(review[0]))
 sources=Counter((r['university'],r['result_year'],r['source_url']) for r in regional)
 write(P/(PREFIX+'-sources.csv'),[dict(university=u,result_year=y,source_url=url,rows=n) for (u,y,url),n in sorted(sources.items())],['university','result_year','source_url','rows'])
 official=sum('adiga.kr' not in r['source_url'] for r in regional);adiga=len(regional)-official
 validation=dict(before_rows=len(old),after_rows=len(combined),retained_other_rows=len(retained),replaced_owned_rows=len(old)-len(retained),regional_rows=len(regional),official_rows=official,adiga_rows=adiga,schools_with_three_years=23,exact_duplicate_rows=0,invalid_grades=0,source_repeated_keys=len(repeated),review_rows=len(review),quarantined_rows=len(quarantine),other_rows_preserved=True,before_sha256=digest(before),after_sha256=digest(master.read_bytes()),backup=str(backup),source_files=files)
 (C/'stage3-validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf8')
 cov=Counter((r['university'],r['result_year'],r['round']) for r in combined)
 lines=['| 대학 | 학년도 | 수시 | 정시 | 기타 |','|---|---|---:|---:|---:|']
 for u,y in sorted({(u,y) for u,y,_ in cov}):lines.append(f'| {u} | {y} | {cov[u,y,"수시"]} | {cov[u,y,"정시"]} | {sum(n for (a,b,c),n in cov.items() if a==u and b==y and c not in ["수시","정시"])} |')
 (P/'_coverage.md').write_text(f'총 {len(combined):,}행 (출처별 통계행; 전형 수·인원 합계가 아님)\n\n'+'\n'.join(lines)+'\n',encoding='utf8')
 report=f'''# 부산·울산·경남 2024~2026학년도 입결 조사

2026-11-19, **1차 수집·통합 / 부분 수집 / draft 검수 대기**.

4년제·교육대 **23개교 모두 3개년 수치**를 확보했다. 영산대는 두 캠퍼스를 조사하되 공통 표를 복제하지 않았다. 전문대·폴리텍은 제외했고 UNIST·해군사관학교는 사용자 지정 5번 단계로 남겼다. 모든 학과·전형 수집 완료는 아니다.

지역 **{len(regional):,}행**(입학처 {official:,}, 대학 제공 어디가 {adiga:,})을 `_all.csv`에 반영했다. 통합본 **{len(combined):,}행**, 기존 다른 자료 **{len(retained):,}행**의 값과 순서 보존. 출처가 다른 같은 전형·학과 또는 서로 다른 통계가 반복되므로 모집인원·지원인원을 행별 합산하지 않는다.

| 대학 | 2024 | 2025 | 2026 | 합계 |
|---|---:|---:|---:|---:|
'''+ '\n'.join(table)+f'''

## 파일과 검토

- [지역 통합 CSV]({PREFIX}.csv), [학년도·모집시기 현황]({PREFIX}-coverage.csv), [공식 출처]({PREFIX}-sources.csv)
- [미확보·미공개·추가 조사 목록]({PREFIX}-gaps.csv), [검토 {len(review)}행]({PREFIX}-review.csv), [사용 보류 {len(quarantine)}행]({PREFIX}-quarantine.csv)
- [실행 검증 기록](national-expansion/stage3-validation.json): 20열 스키마, 필수 출처, 3개 학년도, 교과·수능 등급 1~9, 백분위 0초과~100, 완전 중복 0, 다른 지역 보존을 검증했다. 동일 출처·전형·학과 반복 {len(repeated)}개 키는 임의 삭제하지 않고 원문과 검토 목록을 보존했다.
- 검토 목록은 비공개·비수치·전형 미표기까지 포함한 확인 대상이며, 전부 오류로 판정한 목록이 아니다. [PDF 표본 원문 대조 및 반복 실행 확인](national-expansion/buk-manual-verification.json)도 기록했다.

## 지표 해석

50%·70%·80%·평균·최저를 혼용하지 않았다. 부경대·부산가톨릭대·창원대의 80%는 `cut_other`에 보존했다. 경남대는 **최종합격자 상위 90%** 집단 기준이므로 최종등록자 70%로 쓰지 않는다. 부산교대는 2024년 80%, 2025년 70%이며 ‘중간’을 50%로 단정하지 않았다.

영산대·신라대의 다음 학년도 방식 재산출은 `basis`·`note`에 표시했다. 울산대 정시처럼 국수영탐 단순 수능평균등급은 **수능등급** 지표로 교과등급·환산점수와 구분했다. 후보번호·충원순위를 `fill_count`로 바꾸지 않았고 등록자 없음·소수 비공개·비수치는 0등급으로 채우지 않았다.

부산가톨릭대 어디가 2024 표24는 앞 표의 농어촌 전형명을 반복하고 입학처 사회배려대상자 모집인원과 일치한다. 임의로 전형명을 고치지 않고 {len(quarantine)}행을 통합에서 제외했다. 해당 수치는 원문 및 보류 CSV에 남아 있다. 울산대 입학처 2026 미래모빌리티의 비수치 70% 셀도 그대로 보존하고 표준 컷을 비웠다.

## 남은 범위

울산대 2024와 신라대 2024·2025 이미지 PDF, 부산교대 2026 HWP는 원본을 확보했으나 추가 판독이 필요하다. 부산대 2024 입학처 원문, 입학처 CSV가 없는 7개교, 일부 학교의 정시·실기·정원외 전형은 어디가 수록 범위를 넘어 추가 조사해야 한다. 정시 행이 없는 학교는 모집 미실시로 단정하지 않았다. 상세 학교별 상태는 공백 목록에 기록했다.

## 재현

원문·요청 메타데이터·표 JSON은 `national-expansion/`의 대학 slug 파일과 `buk-*` 조사 기록에 있다. 정규화 순서: `normalize_buk_office.py` → `normalize_buk_pdf.py` → `normalize_buk_more.py` → `normalize_buk_donga.py` → `normalize_buk_small.py` → `normalize_buk_adiga.py` → `finalize_busan_ulsan_gyeongnam.py`. 마지막 스크립트는 최신 통합본을 백업하고 다른 지역을 보존한다. `merge.py`에도 부울경 대상·지역 구분을 등록했다. 앱 공개 데이터는 수정하지 않았다.
'''
 (P/(PREFIX+'-report.md')).write_text(report,encoding='utf8')
 readme=P/'README.md';txt=readme.read_text(encoding='utf8');marker='부산·울산·경남 추가 반영(2026-11-19):'
 text=f'{marker} 23개교의 2024~2026학년도 **{len(regional):,}행**(입학처 {official:,}, 대학 제공 어디가 {adiga:,})을 통합했습니다. 반영 시점 `_all.csv` **{len(combined):,}행**이며 기존 다른 자료 {len(retained):,}행은 보존했습니다. 모든 학교에 3개년 수치가 있지만 모든 전형 수집 완료는 아닙니다. [지역 보고서]({PREFIX}-report.md), [학교·학년도별 현황]({PREFIX}-coverage.csv), [공백 목록]({PREFIX}-gaps.csv), [검토 목록]({PREFIX}-review.csv)을 확인하세요.'
 if marker in txt:txt=re.sub(r'부산·울산·경남 추가 반영\(2026-11-19\):[^\n]*',text,txt)
 else:txt=txt.replace('\n\n대구·경북 추가 반영','\n\n'+text+'\n\n대구·경북 추가 반영',1)
 readme.write_text(txt,encoding='utf8')
 plan=P/'_national-expansion-plan.md';txt=plan.read_text(encoding='utf8');start=txt.index('현재 진행:')
 txt=txt[:start]+f'현재 진행: **3번 부산·울산·경남까지 1차 수집·통합**. [부울경 보고서]({PREFIX}-report.md) 기준 23개교 3개년 {len(regional):,}행을 반영했다. 통합 시점 `_all.csv`는 {len(combined):,}행이다. 미공개·미확보·판독 대기는 지역별 목록에 남겼으며 전체 전형 수집 완료를 뜻하지 않는다.\n\n다음 지역 순서는 **4번 광주·전북·전남**이다. 부울경 잔여 범위는 [공백 목록]({PREFIX}-gaps.csv)에서 별도로 추적한다. 이 문서는 전국 완료 보고서가 아니다.\n'
 plan.write_text(txt,encoding='utf8')
 print(json.dumps({k:v for k,v in validation.items() if k!='source_files'},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
