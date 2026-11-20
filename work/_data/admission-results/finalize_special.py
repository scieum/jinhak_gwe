"""Validate special-school sources and merge only new owned sources into the latest master."""
from finalize_daegu_gyeongbuk import read,write,digest,P,C,F
from collections import Counter,defaultdict
from bs4 import BeautifulSoup
import csv,io,json,os,re
import merge

PREFIX='_special-schools'
NEW=['gist','unist','kentech','postech-adiga','knpu','karts']
REUSED=['kaist','nuch']
ROSTER=[
 ('kaist','한국과학기술원(KAIST)','전형별 경쟁률','공개 경쟁률 수록. 합격자 성적·충원은 확보한 표에 없음.','https://admission.kaist.ac.kr/undergraduate/admission/rsub/2026'),
 ('gist','광주과학기술원(GIST)','수시 정원내 전체 집계','전형별·학과별·정시 미확보. 보도자료 본문과 연도별 표 합계가 달라 전형별 4개 수치를 보류.','https://ewww.gist.ac.kr/kr/html/sub07/070103.html?file_id=78609&mode=D&no=219328'),
 ('dgist','대구경북과학기술원(DGIST)','수치 미확보','입학처·보도자료·자료실 조사. 공식 첨부 및 여러 게시판 접속이 연결 초기화 오류. 언론 보도 수치는 공식 원문을 확보하지 못해 통합하지 않음.','https://www.dgist.ac.kr/bbs/BBSMSTR_000000000061/list.do'),
 ('unist','울산과학기술원(UNIST)','전형·계열별 경쟁률','공개 경쟁률 수록. 2025·2026 일반전형 이공 무학과/반도체 지원자는 공동 집계이며 개별 배분 안 함. 합격자 성적 미확보.','https://adm-u.unist.ac.kr/'),
 ('kentech','한국에너지공과대학교','전형별 경쟁률·등록현황·정시 평균','수시 내신 정량 성적은 학교가 안내하지 않음을 명시. 정시 평균은 학교 산출점수이며 내신등급·50/70%컷으로 변환 안 함.','https://admission.kentech.ac.kr/'),
 ('postech','포항공과대학교','2025 어디가 전형별 결과','2024 어디가 표 및 2026 결과 요청에서 해당 수치 미확보. 2025도 경쟁률·충원순위이며 등록자 성적 컷은 미확보. 입학처 원문 추가 확인 필요.','https://adm-u.postech.ac.kr/'),
 ('kma','육군사관학교','수치 미확보','공식 홈페이지 HTTPS/HTTP 접근 시간초과. 학교 신문 자료에서 대상 학년도 입결 통계 미확보. 비공개로 단정하지 않음.','https://www.kma.ac.kr/'),
 ('kna','해군사관학교','수치 미확보','공식 홈페이지 HTTPS/HTTP 접근 시간초과. 대상 학년도 공식 결과 수치 미확보. 비공개로 단정하지 않음.','https://www.navy.ac.kr/'),
 ('afa','공군사관학교','수치 미확보','공식 신입학 게시판 및 2025·2026·2027 입학설명 자료 확인. 모집요강과 전형 안내는 결과로 수록하지 않음. 성적·경쟁률 공개 집계 미확보.','https://rokaf.airforce.mil.kr/sites/afaadmission/index.do'),
 ('kafna','국군간호사관학교','경쟁률 비공개 확인·성적 집계 미확보','공식 FAQ에서 2024학년도부터 경쟁률 미공개 명시. 공지의 1차 성적 개별조회는 공개 집계가 아니므로 수집 안 함.','https://tapply.tonc.net/kafna/?doc=bbs/faqlist.php'),
 ('knpu','경찰대학','1차시험 합격자 과목 평균','전형별·성별 평균 및 커트라인은 학교 명시 비공개. 2025·2026 최초합격자, 2024 합격자 평균. 최종합격 내신등급 아님.','https://www.police.ac.kr/police/police/master/55/167578/boardView.do?mdex=police57'),
 ('karts','한국예술종합학교','예술사 학과·세부전공·전형별 지원/합격','정원내·정원외 3개년 통계 수록. 예술전문사(대학원) 제외. 성적·컷은 이 통계에 없음. 공동 정원/합격 인원은 학과별 중복 배분하지 않음.','https://www.karts.ac.kr/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_000000000008'),
 ('nuch','한국전통문화대학교','학과·전형별 경쟁률·최초합격 평균','기존 84행 재사용. 최초합격자 평균과 50/70%컷 구분. 모든 전형 수집 완료를 뜻하지 않음.','https://www.knuh.ac.kr/cmm/FileDownload.do?atchFileId=0000034101&atchSer=1'),
]
REVIEW_FIELDS=['university','result_year','program','recruit_unit','source_url','source_page','issue']

def main():
 regional=[];new=[];reused=[];files=[];by_school=defaultdict(list);review=[]
 def issue(r,msg):review.append({k:r[k] for k in REVIEW_FIELDS[:-1]}|{'issue':msg})
 for sl in REUSED+NEW:
  path=P/(sl+'.csv');rs=read(path)
  regional+=rs
  (reused if sl in REUSED else new).extend(rs)
  files.append(dict(file=path.name,rows=len(rs),sha256=digest(path.read_bytes())))
  for r in rs:by_school[r['university']].append(r)
  assert all(bool(merge.ADIGA_SOURCE.search(r['source_url']))==sl.endswith('-adiga') for r in rs)
  assert sl.removesuffix('-adiga') in merge.allowed()
 for r in regional:
  assert all(v is not None for v in r.values())
  assert r['result_year'] in ['2024','2025','2026']
  assert r['round'] in ['수시','정시','기타','우선선발']
  assert r['admission_type'] in ['교과','종합','논술','실기','수능','기타']
  assert all(r[k] for k in ['university','program','recruit_unit','source_url','source_page'])
  assert re.match(r'https?://',r['source_url'])
  assert not merge.exclusion_reason(r)
  for k in ['quota','applicants','fill_count','fill_rate','cut_50','cut_70']:
   if r[k]:assert re.fullmatch(r'\d+(?:\.\d+)?',r[k]),(k,r)
  if any(x in r['note'] for x in ['공동','불일치','오기']):issue(r,r['note'])
 assert len(regional)==len({tuple(r[k] for k in F) for r in regional})
 assert all(not r['cut_50'] and not r['cut_70'] and not r['grade_system'] for r in new)
 assert all(not r['fill_rate'] for r in new),'Registration rate must not become fill rate'
 # Source-based total checks, not implementation-mirroring tests.
 checks=[]
 for y,expected in [('2024',13107),('2025',13820)]:
  found=sum(int(r['applicants'] or 0) for r in by_school['한국예술종합학교'] if r['result_year']==y and r['program'].startswith('정원내'))
  assert found==expected,(y,found,expected)
  checks.append(dict(school='한국예술종합학교',year=y,check='정원내 지원자 합계 = 공식 총계',expected=expected,actual=found))
 extra24=sum(int(r['applicants'] or 0) for r in by_school['한국예술종합학교'] if r['result_year']=='2024' and r['program'].startswith('정원외'))
 assert extra24==196
 checks.append(dict(school='한국예술종합학교',year='2024',check='예술사 정원외 총계; 예술전문사 제외',expected=196,actual=extra24))
 for y in ['2024','2025','2026']:
  soup=BeautifulSoup((C/f'special-kaist-{y}.html').read_text(encoding='utf8'),'html.parser');source={}
  for tr in soup.find_all('tr'):
   v=[td.get_text(' ',strip=True) for td in tr.find_all('td')]
   if len(v)==4:source[v[0]]=v[1:]
  rs=[r for r in by_school['한국과학기술원(KAIST)'] if r['result_year']==y]
  for r in rs:
   v=source[r['program']];values=[re.sub(r'[^0-9.]','',v[0]),re.sub(r'[^0-9.]','',v[1]),v[2].split(':')[0]]
   assert all(float(r[k])==float(z) for k,z in zip(['quota','applicants','competition_rate'],values))
  checks.append(dict(school='한국과학기술원(KAIST)',year=y,check='재확보한 공식 HTML과 기존 모집·지원·경쟁률 일치',rows=len(rs)))
 quarantine=json.loads((C/'special-gist-prose-quarantine.json').read_text(encoding='utf8'))
 quarantine_rows=[]
 for pg,q,ap,co in quarantine['programs']:
  quarantine_rows.append(dict(university='광주과학기술원(GIST)',result_year='미확정',program=pg,quota=q,applicants=ap,competition_rate=co,source_url=quarantine['source_url'],source_page='PDF p.2 본문',reason=quarantine['reason']))
 issue(by_school['광주과학기술원(GIST)'][-1],quarantine['reason'])
 coverage=[];gaps=[];table=[]
 for sl,name,kind,reason,url in ROSTER:
  rs=by_school[name];cells=[]
  # For schools with collected data, give the actual used source as evidence.
  evidence=rs[-1]['source_url'] if rs else url
  for y in ['2024','2025','2026']:
   yr=[r for r in rs if r['result_year']==y];cnt=Counter(r['round'] for r in yr);cells.append(str(len(yr)))
   coverage.append(dict(university=name,result_year=y,rows=len(yr),susi_rows=cnt['수시'],jeongsi_rows=cnt['정시'],other_rows=cnt['기타']+cnt['우선선발'],data_kind=kind,status='부분 확보' if yr else '수치 미확보',detail=reason,source_url=evidence))
   gaps.append(dict(university=name,result_year=y,status='부분 확보·남은 범위' if yr else ('경쟁률 비공개·성적 집계 미확보' if sl=='kafna' else '공식 수치 미확보'),reason=reason,source_url=evidence))
  table.append('| '+name+' | '+' | '.join(cells)+' | '+kind+' |')
 gaps.append(dict(university='육군3사관학교',result_year='2024~2026',status='이번 신입학 범위 제외',reason='편입학 과정은 이번 고교 졸업 신입학 데이터와 구분. 전문대 및 대학원 과정도 제외.',source_url='https://www.kaay.mil.kr/'))
 write(P/(PREFIX+'.csv'),regional);write(P/'_all-특수.csv',regional)
 for suffix,rs,fields in [('coverage',coverage,list(coverage[0])),('gaps',gaps,list(gaps[0])),('review',review,REVIEW_FIELDS),('quarantine',quarantine_rows,list(quarantine_rows[0]))]:write(P/(PREFIX+'-'+suffix+'.csv'),rs,fields)
 sources=Counter((r['university'],r['result_year'],r['source_url']) for r in regional)
 write(P/(PREFIX+'-sources.csv'),[dict(university=u,result_year=y,source_url=url,rows=n) for (u,y,url),n in sorted(sources.items())],['university','result_year','source_url','rows'])
 (C/'special-roster.json').write_text(json.dumps([dict(slug=s,university=u,data_kind=k,remaining=r,discovery_url=url) for s,u,k,r,url in ROSTER],ensure_ascii=False,indent=2),encoding='utf8')
 # Reread the live master; preserve every non-owned row and its order.
 master=P/'_all.csv';before=master.read_bytes();old=list(csv.DictReader(io.StringIO(before.decode('utf-8-sig'))));assert list(old[0])==F
 oldset=Counter(tuple(r[k] for k in F) for r in old)
 assert all(oldset[key]>=n for key,n in Counter(tuple(r[k] for k in F) for r in reused).items()),'Existing reused rows changed: review before merging'
 owned={(r['university'],r['source_url']) for r in new}
 retained=[r for r in old if (r['university'],r['source_url']) not in owned];combined=retained+new
 backup=C/f'_all-before-special-{digest(before)[:12]}.csv'
 if not backup.exists():backup.write_bytes(before)
 tmp=P/'_all.special-pending.csv';write(tmp,combined)
 assert read(tmp)[:len(retained)]==retained
 assert master.read_bytes()==before,'Concurrent master update; rerun against fresh snapshot'
 os.replace(tmp,master);assert read(master)==combined
 validation=dict(before_rows=len(old),after_rows=len(combined),retained_rows=len(retained),replaced_owned_rows=len(old)-len(retained),new_source_rows=len(new),reused_existing_rows=len(reused),special_category_rows=len(regional),schools_surveyed=13,schools_with_data=sum(bool(by_school[n]) for _,n,_,_,_ in ROSTER),schools_with_three_years=sum(len({r['result_year'] for r in by_school[n]})==3 for _,n,_,_,_ in ROSTER),quarantined_programs=len(quarantine_rows),review_rows=len(review),exact_duplicate_category_rows=0,other_rows_preserved=True,reused_rows_not_appended=True,before_sha256=digest(before),after_sha256=digest(master.read_bytes()),backup=str(backup),source_files=files,source_checks=checks)
 (C/'stage5-validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf8')
 cov=Counter((r['university'],r['result_year'],r['round']) for r in combined)
 lines=['| 대학 | 학년도 | 수시 | 정시 | 기타 |','|---|---|---:|---:|---:|']
 for u,y in sorted({(u,y) for u,y,_ in cov}):lines.append(f'| {u} | {y} | {cov[u,y,"수시"]} | {cov[u,y,"정시"]} | {sum(n for (a,b,c),n in cov.items() if a==u and b==y and c not in ["수시","정시"])} |')
 (P/'_coverage.md').write_text(f'총 {len(combined):,}행 (출처별 통계행; 전형 수·인원 합계가 아님)\n\n'+'\n'.join(lines)+'\n',encoding='utf8')
 report=f'''# 과기원·사관학교 등 특수학교 2024~2026학년도 조사

2026-11-19, **1차 조사·부분 수집 / draft 검수 대기**. 대상 13개교 중 8개교 수치를 확보했고, 그중 7개교에 3개년 수치가 있다. 학교 전체 경쟁률이나 1차시험 평균만 있는 학교도 있으므로 **학과·전형별 모든 입결 수집 완료가 아니다**. 전문대·대학원·편입학은 제외했다. 과기원 외 POSTECH·한국에너지공과대도 이 조사 묶음에 포함했다.

신규 **{len(new):,}행**(학교 공식 자료 488행, 대학 제공 어디가 7행)을 반영했다. KAIST 23행·한국전통문화대 84행은 기존 통합본의 값·순서를 유지하고 추가하지 않았다. 특수학교 묶음은 **{len(regional):,}행**, 통합본은 반영 시점 **{len(combined):,}행**이다. 함께 수정 중인 최신 통합본을 다시 읽어 다른 기존 자료 {len(retained):,}행을 보존했다.

| 학교 | 2024 | 2025 | 2026 | 확보 지표 |
|---|---:|---:|---:|---|
'''+ '\n'.join(table)+f'''

## 파일

- [특수학교 CSV]({PREFIX}.csv), [학교·학년도 현황]({PREFIX}-coverage.csv), [사용 출처]({PREFIX}-sources.csv)
- [남은 범위·미확보 사유]({PREFIX}-gaps.csv), [검토 {len(review)}건]({PREFIX}-review.csv), [GIST 전형별 수치 보류]({PREFIX}-quarantine.csv)
- [통합 및 원문 대조 검증](national-expansion/stage5-validation.json), [학교별 조사 범위](national-expansion/special-roster.json)

## 원문 해석과 검증

한예종은 예술사 정원내·정원외를 학과·세부전공·전형별 444행으로 정리했다. 2024·2025 정원내 지원자 합계 13,107·13,820명, 2024 예술사 정원외 196명이 공식 총계와 일치한다. 공동 정원과 추가합격 인원은 공통값을 `cut_other`에 보존하고 각 세부 전공에 중복 배분하지 않았다. 학교 고유 모집시기는 `기타`, 예술전문사 자료는 제외했다. 예비합격 설정인원은 충원인원이 아니다.

UNIST 2025·2026 일반전형 이공 무학과와 반도체는 모집인원을 구분하지만 지원자 수·경쟁률은 공동 셀이다. 개별 행의 지원자·경쟁률을 비우고 공동 집계 행을 별도로 두었다. KAIST 기존 23행은 새로 확보한 공식 HTML의 모집·지원·경쟁률과 모두 대조했다. 한국전통문화대는 공식 PDF를 재확보하고 기존 84행을 그대로 재사용했다.

한국에너지공과대 수시 정량 내신은 원문이 안내하지 않음을 명시한다. 정시 평균은 표준점수에 기초한 학교 산출점수이며 `cut_other`에 보존했다. 등록인원·등록률도 원문 그대로 보존하되 충원인원·충원율 열로 옮기지 않았다. 2025 정시 등록률 110%도 원문값이다.

경찰대는 1차시험 합격자 평균이며 최종합격자 등급이 아니다. 2024 과목 평균 78.92와 국어·영어·수학의 단순평균이 다르지만 원문을 임의 수정하지 않았다. 2026 첨부의 내장 미리보기 그림에는 2025라고 잘못 남아 있지만, 공식 게시물 제목·첨부 XML 본문·미리보기 텍스트는 2026으로 일치하고 수치도 일치한다. 이 두 사항을 검토 목록에 기록했다. [2026 공식 평균 공개](https://www.police.ac.kr/police/police/master/55/167578/boardView.do?mdex=police57)에서 전형별·성별 평균 및 커트라인 비공개를 명시한다.

GIST는 [학교 공식 보도자료](https://ewww.gist.ac.kr/kr/html/sub07/070103.html?file_id=78609&mode=D&no=219328) p.2 연도별 수시 정원내 전체 표만 사용했다. 2026 표의 지원자 3,331명과 본문 4개 전형 합계 2,992명이 달라 전형별 수치는 학년도를 확정하지 않고 통합에서 보류했다.

## 미확보 범위

DGIST·육사·해사·공사·국군간호사관은 결과 수치를 통합하지 못했다. DGIST 공식 첨부와 게시판에는 연결 초기화 오류, 육사·해사는 시간초과가 반복됐다. 공사는 공식 설명 자료와 게시판에서 공개 결과 집계를 확보하지 못했다. 이 학교들의 자료를 모두 비공개라고 단정하지 않는다. 국군간호사관은 [공식 FAQ](https://tapply.tonc.net/kafna/?doc=bbs/faqlist.php)에서 2024학년도부터 경쟁률을 공개하지 않는다고 명시한다. 개인별 성적 조회는 공개 집계로 수집하지 않았다.

POSTECH은 2025 대학 제공 어디가 7개 전형만 수록했다. 2024·2026 결과 수치와 입학처 원문 추가 조사가 남는다. GIST 전형·학과별 및 정시, 다른 학교의 성적·미공개 세부 전형 등 잔여 범위를 공백 CSV에 기록했다. 50/70%컷 미확보는 0점·0등급으로 채우지 않았다.

## 재현

`normalize_special.py` → `finalize_special.py`. 원본·URL·해시는 `national-expansion/special-*`에 보존했다. 경찰대 `.xlsx`로 저장된 2개 ZIP은 원 서버의 HWPX이며 XML과 내장 미리보기를 확인했다. 다운로드한 파일 모두를 정규화 완료로 간주하지 않는다. 사용 출처 CSV는 실제 수록행의 URL만 담는다. `merge.py`에 학교 파일을 등록했고 전체 재병합은 실행하지 않았다. `_all-특수.csv`는 KAIST·한국전통문화대가 충청 파일에도 존재하는 분류용 보기이며 지역 파일들을 단순 합산하면 안 된다.
'''
 (P/(PREFIX+'-report.md')).write_text(report,encoding='utf8')
 readme=P/'README.md';txt=readme.read_text(encoding='utf8');marker='특수학교 추가 반영(2026-11-19):'
 line=f'{marker} 13개교 조사, 신규 **{len(new):,}행** 추가·기존 107행 재사용. 특수학교 묶음 **{len(regional):,}행**, 통합 시점 `_all.csv` **{len(combined):,}행**. 8개교 수치 확보(7개교 3개년), 5개교 수치 미확보. 모든 학과·전형 완료가 아닙니다. [보고서]({PREFIX}-report.md), [현황]({PREFIX}-coverage.csv), [남은 공백]({PREFIX}-gaps.csv).'
 if marker in txt:txt=re.sub(re.escape(marker)+r'[^\n]*',line,txt)
 else:txt=txt.replace('\n\n광주·전북·전남 추가 반영','\n\n'+line+'\n\n광주·전북·전남 추가 반영',1)
 readme.write_text(txt,encoding='utf8')
 plan=P/'_national-expansion-plan.md';txt=plan.read_text(encoding='utf8');start=txt.index('현재 진행:')
 txt=txt[:start]+f'현재 진행: **5번 특수학교까지 1차 조사·부분 통합**. [특수학교 보고서]({PREFIX}-report.md) 기준 13개교 조사, 8개교 수치 확보(7개교 3개년), 신규 {len(new):,}행·기존 107행 재사용. 반영 시점 `_all.csv` {len(combined):,}행. 학교·학과·전형 전체 수집 완료가 아니다.\n\n남은 작업은 각 지역 공백 목록과 [특수학교 미확보 목록]({PREFIX}-gaps.csv)의 공식 원문 재확보·표 추출·수치 검수다. 이 문서는 전국 완료 보고서가 아니다.\n'
 plan.write_text(txt,encoding='utf8')
 print(json.dumps({k:v for k,v in validation.items() if k not in ['source_files','source_checks']},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
