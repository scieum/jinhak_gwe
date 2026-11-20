"""Validate Honam source rows, then replace only owned sources in the latest master."""
from finalize_daegu_gyeongbuk import read,write,digest,P,C,F
from collections import Counter,defaultdict
import csv,json,io,re,os
import merge
ROSTER=json.loads((C/'honam-roster.json').read_text(encoding='utf8'))
PREFIX='_gwangju-jeonbuk-jeonnam'
REVIEW_FIELDS=['university','result_year','program','recruit_unit','source_url','source_page','issue']

def main():
 regional=[];files=[];by_school=defaultdict(list);review=[];gaps=[]
 def add_review(r,issue):review.append({k:r[k] for k in REVIEW_FIELDS[:-1]}|{'issue':issue})
 for d in ROSTER:
  sl=d['slug'];name='전남대학교' if sl.startswith('jnu') and sl!='jnue' else re.sub(r'\[.*?\]','',d['unvNm'])
  for suffix in ['', '-adiga']:
   f=P/(sl+suffix+'.csv')
   if not f.exists():continue
   rs=read(f);files.append(dict(file=f.name,rows=len(rs),sha256=digest(f.read_bytes())))
   assert all(bool(merge.ADIGA_SOURCE.search(r['source_url']))==bool(suffix) for r in rs),f
   assert all(merge.region(sl,r['university'])=='호남' for r in rs),sl
   by_school[name]+=rs;regional+=rs
 extra=read(P/'honam-extra-round.csv')
 files.append(dict(file='honam-extra-round.csv',rows=len(extra),sha256=digest((P/'honam-extra-round.csv').read_bytes())))
 for r in extra:
  name='전남대학교' if r['university'].startswith('전남대학교') else r['university']
  assert name in by_school,name
  by_school[name].append(r)
 regional+=extra
 assert len(by_school)==29,len(by_school)
 for r in regional:
  assert all(v is not None for v in r.values()),r
  assert r['result_year'] in ['2024','2025','2026'],r
  assert r['round'] in ['수시','정시','추가'],r
  assert r['admission_type'] in ['교과','종합','논술','실기','수능','기타'],r
  assert all(r[k] for k in ['university','program','recruit_unit','source_url','source_page']),r
  assert re.match(r'https?://',r['source_url']),r
  assert not re.fullmatch(r'[\d., -]+',r['recruit_unit']),r
  for col in ['cut_50','cut_70']:
   if not r[col]:continue
   n=float(r[col]);assert n>0,(col,r)
   if r['metric'] in ['교과등급','수능등급']:assert 1<=n<=9,(col,r)
   if r['metric']=='백분위':assert n<=100,(col,r)
  assert not merge.exclusion_reason(r),r
  if any(z in r['note']+r['program'] for z in ['확정 불가','미확정','확인 필요','미표기','미기재','미구분','미분리','공동 모집']):add_review(r,r['note'])
 assert len(regional)==len({tuple(r[k] for k in F) for r in regional}),'exact duplicate'
 groups=defaultdict(list)
 for r in regional:groups[tuple(r[k] for k in ['university','result_year','round','admission_type','program','recruit_unit','source_url'])].append(r)
 repeated={k:rs for k,rs in groups.items() if len(rs)>1}
 for rs in repeated.values():
  for r in rs:add_review(r,'동일 출처·전형·학과 반복: 원문 표/성별/캠퍼스 구분 확인, 임의 합산 금지')
 quarantine=json.loads((C/'honam-adiga-quarantine.json').read_text(encoding='utf8'))+read(P/'honam-mokpo-year-quarantine.csv')
 for r in quarantine:add_review(r,r['note'])
 coverage=[];table=[];three_years=0
 for name,rs in by_school.items():
  cells=[];years={r['result_year'] for r in rs};three_years+=len(years)==3
  for y in ['2024','2025','2026']:
   yr=[r for r in rs if r['result_year']==y];cnt=Counter(r['round'] for r in yr)
   coverage.append(dict(university=name,result_year=y,susi_rows=cnt['수시'],jeongsi_rows=cnt['정시'],additional_rows=cnt['추가'],rows=len(yr),rows_with_50_or_70_cut=sum(bool(r['cut_50'] or r['cut_70']) for r in yr),admission_office_rows=sum('adiga.kr' not in r['source_url'] for r in yr),adiga_rows=sum('adiga.kr' in r['source_url'] for r in yr)))
   cells.append(str(len(yr)))
   for rd in ['수시','정시']:
    if not cnt[rd]:gaps.append(dict(university=name,result_year=y,round=rd,status='수치 미확보',reason='해당 모집시기 수치 미확보. 미공개 또는 모집 미실시로 단정하지 않음.'))
  table.append('| '+name+' | '+' | '.join(cells)+f' | {len(rs)} |')
 notes=[
 ('전체','2024~2026','전체','부분 수집','29개교 조사 중 23개교 3개년 수치 확보. 학과·전형 전체 완결 아님. 실기·정원외·재외국민·추가모집 등 원문 추가 대조 필요.'),
 ('전주교육대학교','2025','전체','원문 미확보','2024 어디가, 2026 수시 공식 HWP 확보. 2025 결과 및 2026 정시는 추가 조사 필요.'),
 ('광주가톨릭대학교','2024~2025','전체','결과 수치 미확보','어디가 구년도 페이지는 결과 수치 미확보. 입학처의 편입학 결과 링크는 신입학 결과로 사용하지 않음.'),
 ('세한대학교(영암)','2026','전체','수치 미확보','어디가 2026 수치 없음. 공식 2026 모집요강으로 영암 7개 학과 범위를 확인. 과거 캠퍼스 귀속 미확정·당진 학과는 보류/제외.'),
 ('영산선학대학교','2025','전체','수치 미확보','어디가 2025 결과 표 및 공식 입시자료 게시판에서 해당 결과 수치 미확보.'),
 ('초당대학교','2026','전체','이미지 판독 대기','공식 결과 페이지 이미지 추가 판독 필요. 어디가 2026 결과 수치 미확보.'),
 ('예원예술대학교(전북희망)','2024','전체','캠퍼스 수치 미확보','어디가 공통 정원외 표는 캠퍼스 귀속 불명확하여 제외. 2025 정시 공식 링크 404, 2025 수시·2026 수시정시 PDF 확보.'),
 ('동신대학교','2024~2026','전체','원문 추가 추출','공식 PDF 확보분 중 이미지 페이지 추가 판독 필요. 대학 제공 어디가 3개년 수치 우선 수록.'),
 ('광주교육대학교','2024~2026','전체','입학처 추가 대조','어디가 3개년 수록. 입학처 2024·2025 PDF 원본 확보, 추가 통계 정규화 남음.'),
 ('광주대학교','2024~2026','전체','다운로드 오류','공식 첨부 다운로드가 파일 없음 응답. 어디가 3개년 결과 수록, 원본 재확보 필요.'),
 ('원광대학교·광주여자대학교','2024~2026','전체','입학처 추가 조사','어디가 3개년 수록. 입학처 JS 이동·SSO 등으로 원문 전체 전형 수집 미완료.'),
 ('전북대학교','2026','전체','입학처 추가 조사','2024·2025 공식 학과 게시판의 입학처 원본 정규화. 2026은 어디가 수치로 보완.'),
 ('목포가톨릭대학교·송원대학교·호남신학대학교·광신대학교·한일장신대학교','2024~2026','전체','어디가 우선 확보','대학 제공 어디가 결과 수록. 입학처 원문 전체 전형 추가 조사 필요.'),
 ('국립목포대학교','2024','정시','13행 사용 보류','2024 게시물의 성인 등 일부 표 제목이 2023학년도여서 13행을 통합에서 제외. 2026 전문학사 시트도 제외.'),
 ('우석대학교(전주)·세한대학교(영암)','2024~2026','전체','캠퍼스 분리','우석 진천 원문 37행은 별도 참고 CSV. 당진·진천 또는 캠퍼스 근거 미확정 어디가 행은 통합 제외/보류.'),
 ('전남대학교','2024~2026','전체','공통 표 중복 제거','광주·여수 구년도 어디가 공통 표 한 번 수록. 공식 원본으로 단일 캠퍼스를 확정할 수 없는 행은 캠퍼스 미분리로 명시.'),
 ('GIST·한국에너지공과대학교','2024~2026','전체','5번 단계 예정','사용자 지정 특수학교 조사 단계에서 별도 수집.')]
 gaps += [dict(university=u,result_year=y,round=rd,status=st,reason=reason) for u,y,rd,st,reason in notes]
 # Prepare review artifacts before modifying the master.
 write(P/(PREFIX+'.csv'),regional);write(P/'_all-호남.csv',regional)
 for suffix,rs,fields in [('coverage',coverage,list(coverage[0])),('gaps',gaps,list(gaps[0])),('review',review,REVIEW_FIELDS),('quarantine',quarantine,F)]:write(P/(PREFIX+'-'+suffix+'.csv'),rs,fields)
 sources=Counter((r['university'],r['result_year'],r['source_url']) for r in regional)
 write(P/(PREFIX+'-sources.csv'),[dict(university=u,result_year=y,source_url=url,rows=n) for (u,y,url),n in sorted(sources.items())],['university','result_year','source_url','rows'])
 master=P/'_all.csv';before=master.read_bytes();old=list(csv.DictReader(io.StringIO(before.decode('utf-8-sig'))))
 assert list(old[0])==F
 owned={(r['university'],r['source_url']) for r in regional}
 retained=[r for r in old if (r['university'],r['source_url']) not in owned];combined=retained+regional
 backup=C/f'_all-before-honam-{digest(before)[:12]}.csv'
 if not backup.exists():backup.write_bytes(before)
 tmp=P/'_all.honam-pending.csv';write(tmp,combined)
 assert read(tmp)[:len(retained)]==retained
 assert master.read_bytes()==before,'Concurrent master update; rerun against latest snapshot'
 os.replace(tmp,master);assert read(master)==combined
 official=sum('adiga.kr' not in r['source_url'] for r in regional);adiga=len(regional)-official
 validation=dict(before_rows=len(old),after_rows=len(combined),retained_other_rows=len(retained),replaced_owned_rows=len(old)-len(retained),regional_rows=len(regional),additional_round_rows=len(extra),official_rows=official,adiga_rows=adiga,schools=29,campus_roster_records=30,schools_with_three_years=three_years,exact_duplicate_rows=0,invalid_grades=0,source_repeated_keys=len(repeated),review_rows=len(review),quarantined_rows=len(quarantine),other_rows_preserved=True,before_sha256=digest(before),after_sha256=digest(master.read_bytes()),backup=str(backup),source_files=files)
 (C/'stage4-validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf8')
 cov=Counter((r['university'],r['result_year'],r['round']) for r in combined)
 lines=['| 대학 | 학년도 | 수시 | 정시 | 기타 |','|---|---|---:|---:|---:|']
 for u,y in sorted({(u,y) for u,y,_ in cov}):lines.append(f'| {u} | {y} | {cov[u,y,"수시"]} | {cov[u,y,"정시"]} | {sum(n for (a,b,c),n in cov.items() if a==u and b==y and c not in ["수시","정시"])} |')
 (P/'_coverage.md').write_text(f'총 {len(combined):,}행 (출처별 통계행; 전형 수·인원 합계가 아님)\n\n'+'\n'.join(lines)+'\n',encoding='utf8')
 report=f'''# 광주·전북·전남 2024~2026학년도 입결 조사

2026-11-19, **1차 수집·통합 / 부분 수집 / draft 검수 대기**.

4년제·교육대 29개교(전남대 여수 포함 30개 캠퍼스 기록)를 조사했다. **{three_years}개교에 3개년 수치가 있고 6개교는 일부 학년도가 미확보**다. 전문대·전문학사·폴리텍 제외. GIST·한국에너지공과대는 5번 특수학교 단계로 남겼다. 모든 학과·전형 수집 완료가 아니다.

지역 **{len(regional):,}행**(입학처 {official:,}, 대학 제공 어디가 {adiga:,}; 추가모집 {len(extra):,}행 포함)을 `_all.csv`에 반영했다. 통합본 **{len(combined):,}행**, 다른 기존 자료 **{len(retained):,}행**의 값과 순서를 보존했다. 같은 전형·학과도 출처·통계가 다르면 여러 행이므로 모집인원·지원인원을 행별 합산하지 않는다. 3개년 확보도 모든 세부 전형 확보를 뜻하지 않는다.

| 대학 | 2024 | 2025 | 2026 | 합계 |
|---|---:|---:|---:|---:|
'''+ '\n'.join(table)+f'''

## 파일과 검증

- [지역 CSV]({PREFIX}.csv), [학년도·모집시기 현황]({PREFIX}-coverage.csv), [공식 출처]({PREFIX}-sources.csv)
- [미확보·추가 조사 목록]({PREFIX}-gaps.csv), [검토 {len(review)}행]({PREFIX}-review.csv), [지역 외·사용 보류 {len(quarantine)}행]({PREFIX}-quarantine.csv)
- [통합 검증 기록](national-expansion/stage4-validation.json): 20열, 학년도·출처·필수값, 등급 1~9, 백분위 0초과~100, 완전 중복 0, 다른 자료 보존 검사. 동일 출처·전형·학과 반복 {len(repeated)}개 키는 검토 목록에 남겼다.
- [원문 표본 대조 기록](national-expansion/honam-manual-verification.json). 검토 목록은 비공개·전형 미구분·공동 모집도 포함하므로 전부 오류 판정은 아니다.

## 지표와 캠퍼스

50%·70%·80%·평균·최저를 구분했다. 전주교대 80% 및 목포해양대 **최종합격자 하위 30% 평균**은 `cut_other`에 보존하고 70%컷으로 변환하지 않았다. 호남대 소수 등록자 평균 공개값도 표준 컷은 비웠다. 후보번호·충원순위는 충원 인원으로 쓰지 않았다. 공동 모집인원은 학과별로 중복 배분하지 않았다. 점수가 비공개인 행은 등급 0으로 채우지 않았다.

우석대 전주·세한대 영암·예원예술대 전북을 구분했다. 우석 진천 원문 37행은 `honam-woosuk-jincheon-reference.csv`에만 보관했다. 전남대 구년도 어디가 공통 표는 복제하지 않았으며 캠퍼스 확정이 어려운 행은 미분리로 표시했다. 목포대 2024 게시물 중 본문 제목이 2023인 13행은 보류했고 전문학사 시트는 제외했다.

## 남은 범위

전주교대 2025, 광주가톨릭대 2024·2025, 세한대 영암 2026, 영산선학대 2025, 초당대 2026, 예원예술대 전북 2024 수치가 미확보다. 정시 등 모집시기별 공백은 별도 목록에 기록했다. 동신대 이미지 PDF·초당대 이미지, 광주교대 확보 PDF의 추가 통계 추출과 어디가만 수록한 학교의 입학처 전체 전형 대조가 남아 있다. 광주대 첨부 파일 없음 응답과 전주교대 공식 사이트 이동 문제도 재확인 대상이다.

## 재현

원본과 다운로드 URL·해시·표 JSON은 `national-expansion/`에 보존했다. 원본 다운로드 파일은 관련 자료도 포함하므로 보관 파일 전부를 정규화 완료로 보지 않는다. 통합에 사용한 URL만 출처 CSV에 기록했다. 조선대 2024 XLS의 변환 격자는 `chosun-2024-grids.json`, 전주교대 2026 HWP 추출은 `jnue-2026-hwp-paragraphs.json`에 있다.

정규화 순서: `normalize_honam_office.py` → `normalize_honam_pdf.py` → `normalize_honam_adiga.py` → `normalize_honam_small.py` → `finalize_honam.py`. 마지막 스크립트는 최신 통합본을 백업하고 다른 자료를 보존한다. `merge.py`에 대상 학교와 추가모집 파일을 등록했다. 앱 공개 데이터는 수정하지 않았다.
'''
 (P/(PREFIX+'-report.md')).write_text(report,encoding='utf8')
 readme=P/'README.md';txt=readme.read_text(encoding='utf8');marker='광주·전북·전남 추가 반영(2026-11-19):'
 text=f'{marker} 29개교 조사분 **{len(regional):,}행**(입학처 {official:,}, 대학 제공 어디가 {adiga:,})을 통합했습니다. 반영 시점 `_all.csv` **{len(combined):,}행**. 23개교 3개년 수치 확보, 6개교 일부 학년도 미확보이며 모든 전형 수집 완료는 아닙니다. [지역 보고서]({PREFIX}-report.md), [학교·학년도 현황]({PREFIX}-coverage.csv), [공백 목록]({PREFIX}-gaps.csv)을 확인하세요.'
 if marker in txt:txt=re.sub(re.escape(marker)+r'[^\n]*',text,txt)
 else:txt=txt.replace('\n\n부산·울산·경남 추가 반영','\n\n'+text+'\n\n부산·울산·경남 추가 반영',1)
 readme.write_text(txt,encoding='utf8')
 plan=P/'_national-expansion-plan.md';txt=plan.read_text(encoding='utf8');start=txt.index('현재 진행:')
 txt=txt[:start]+f'현재 진행: **4번 광주·전북·전남까지 1차 수집·통합**. [호남 보고서]({PREFIX}-report.md) 기준 29개교 조사분 {len(regional):,}행 반영, 23개교 3개년 수치 확보·6개교 일부 학년도 미확보. 통합 시점 `_all.csv` {len(combined):,}행. 전체 학과·전형 수집 완료가 아니다.\n\n다음 순서는 **5번 과기원·사관학교 등 특수학교**다. 지역별 잔여 범위는 각 공백 목록에서 계속 추적한다. 이 문서는 전국 완료 보고서가 아니다.\n'
 plan.write_text(txt,encoding='utf8')
 print(json.dumps({k:v for k,v in validation.items() if k!='source_files'},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
