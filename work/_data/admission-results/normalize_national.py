"""Official source normalization for the national expansion; no estimated values."""
from pathlib import Path
from collections import defaultdict,Counter
import csv,json,re,sys,openpyxl,fitz
import normalize_gyeonggi as base
ROOT=Path(__file__).parent; CACHE=ROOT/'national-expansion'
FIELDS=base.FIELDS
clean,compact,num,pairs=base.clean,base.compact,base.num,base.pairs
def val(v):return '' if clean(v) in ['', '-', '–','—','․','·'] else clean(v)
def row(key,u,y,rd,pg,unit,loc,**kw):
 r=dict.fromkeys(FIELDS,'');r.update(university=u,result_year=str(y),round=rd,program=pg,recruit_unit=unit,source_url=json.loads((CACHE/(key+'.meta.json')).read_text(encoding='utf8'))['url'],source_page=f'{key} / {loc}',note='draft; 공식 원문 추출');r.update(kw);return r
save=base.save
def tables(key):
 return json.loads((CACHE/(key+'.tables.json')).read_text(encoding='utf8'))

def jejunu():
 key='jejunu-2024-2026';w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True,read_only=True)
 groups=defaultdict(dict);detail=defaultdict(dict);duplicates=[]
 for sn,target in [('전체성적',groups),('세부과목성적',detail)]:
  for i,v in enumerate(w[sn].values,1):
   if v[5] not in [2024,2025,2026]:continue
   k=tuple(v[:6])
   if v[11] in target[k]:
    assert target[k][v[11]][1]==v,(k,v[11])
    duplicates.append({'sheet':sn,'row':i,'same_as':target[k][v[11]][0]});continue
   target[k][v[11]]=(i,v)
 assert set(detail)<=set(groups)
 out=[]
 labels=['교과 주요교과','교과 전체교과','수능 국수탐 백분위평균','수능 영어등급','전형총점','학생부 환산점수','서류점수','면접점수','실기점수','실적점수','수능 환산점수']
 dl=['교과 국어','교과 수학','교과 영어','교과 사회','교과 과학','교과 기타','수능 국어 백분위','수능 수학 백분위','수능 탐구평균 백분위']
 for k,g in groups.items():
  assert set(g)=={'평균','50컷','70컷'}
  i,v=g['평균'];stat=[];suppressed=[]
  for nm,(_,vv) in g.items():
   for label,x in zip(labels,vv[12:]):
    if not val(x):continue
    if not num(x):suppressed.append(clean(x));continue
    stat.append(label+' '+nm+' '+val(x))
  for nm,(_,vv) in detail.get(k,{}).items():
   for label,x in zip(dl,vv[12:]):
    if not val(x):continue
    if not num(x):suppressed.append(clean(x));continue
    stat.append(label+' '+nm+' '+val(x))
  typ={'학생부교과':'교과','학생부종합':'종합','실기실적':'실기','수능위주':'수능'}[v[3]]
  idx=14 if typ=='수능' else 12
  rd='추가' if str(v[2]).startswith('추가') else v[2]
  pg=v[3]+'('+v[4]+')'+(' / 추가2차' if v[2]=='추가2차' else '')
  loc='전체성적 행'+','.join(str(z[0]) for z in g.values())
  if k in detail:loc+='; 세부과목성적 행'+','.join(str(z[0]) for z in detail[k].values())
  out.append(row(key,'제주대학교',v[5],rd,pg,v[1],loc,admission_type=typ,quota=val(v[6]),applicants=val(v[7]),competition_rate=val(v[8]),cut_50=val(g['50컷'][1][idx]) if num(g['50컷'][1][idx]) else '',cut_70=val(g['70컷'][1][idx]) if num(g['70컷'][1][idx]) else '',cut_other='; '.join(stat),metric='백분위' if typ=='수능' else '교과등급',basis='당해 학년도 입학(등록)생; 교과 및 수능은 온라인 제공자',grade_system='' if typ=='수능' else '9',note='draft; 단과대학 '+v[0]+'; 등록인원 '+val(v[10])+'; 예비끝순위 '+val(v[9])+'; 주요교과=국영수사과 등급과목; 국수탐=국어·수학·탐구2개평균 백분위의 평균; '+'; '.join(dict.fromkeys(suppressed))))
 (CACHE/'jejunu-exact-source-duplicates.json').write_text(json.dumps(duplicates,ensure_ascii=False,indent=2),encoding='utf8')
 save('jejunu',out)

def campuses():
 # The earlier regional collection deliberately excluded these Incheon campuses.
 # Reuse the same verified table mappings, changing only the campus selector/output.
 import inspect,normalize_cc_more as cc,normalize_cc_final as cf
 for module,fn,old,new,slug in [(base,'anyang',"camp not in ['안양','안양캠퍼스']","camp not in ['강화','강화캠퍼스']",'anyang-ganghwa'),(cc,'chungwoon',"'홍성' not in camp","'인천' not in camp",'chungwoon-incheon'),(cf,'chungwoon_reg',"'홍성' not in camp","'인천' not in camp",'chungwoon-incheon')]:
  if fn=='anyang':new="'강화' not in camp"
  src=inspect.getsource(getattr(module,fn)).replace(old,new).replace('안양대학교(안양)','안양대학교(강화)').replace('청운대학교(홍성)','청운대학교(인천)').replace("save('anyang'","save('anyang-ganghwa'").replace("save('chungwoon'","save('chungwoon-incheon'").replace("ROOT/'chungwoon.csv'","ROOT/'chungwoon-incheon.csv'").replace('경기도 안양캠퍼스; 인천 강화캠퍼스 제외','인천 강화캠퍼스')
  ns=vars(module).copy();exec(compile(src,'<Incheon campus mapping>','exec'),ns);ns[fn]()
 rs=list(csv.DictReader((ROOT/'gyeonggi-expansion/gachon-medical-out-of-scope.csv').open(encoding='utf-8-sig')))
 for r in rs:r['university']='가천대학교(메디컬)';r['note']+='; 인천 메디컬캠퍼스 지역범위 확장 수록'
 save('gachon-medical',rs)

def jiu():
 key='jiu-2024-susi';source='https://apply.jeju.ac.kr/admission/rolling/result.htm?act=download&no=1&seq=28666'
 (CACHE/(key+'.meta.json')).write_text(json.dumps({'url':source,'method':'공식 PDF 웹 텍스트 추출 확인; 로컬 직접 다운로드 SSL 연결 오류','checked':'2026-11-19'},ensure_ascii=False),encoding='utf8')
 data=[('경찰학부','909.3','912.0','909.2','5.39','5.34','5.48'),('복지상담학부','901.7','896.0','875.6','5.49','5.66','6.36'),('융합경영학부','917.2','912.9','910.0','4.92','5.00','5.30'),('안전공학부','889.7','891.1','870.2','6.38','6.59','7.41'),('건설공학부','910.9','917.4','899.9','5.20','5.08','5.94'),('건설공학부(야)','930.5','960.9','930.3','4.18','2.60','4.44'),('에너지기계공학부','936.8','958.9','911.4','4.12','3.03','5.37'),('체육학부','894.9','888.1','876.5','6.10','6.37','7.00'),('체육학부(야)','','','','','','')]
 (CACHE/'jiu-2024-verified-transcription.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
 save('jiu',[row(key,'제주국제대학교',2024,'수시','일반학생',v[0],f'p.1 표 행{i}',admission_type='교과',cut_50=v[5],cut_70=v[6],cut_other=pairs(['학생부 환산 평균','학생부 환산50%','학생부 환산70%','교과 평균'],v[1:5]),metric='교과등급',grade_system='9',basis='원문 수시모집 전년도 신입생 성적 커트라인',note='draft; 학부 공동성적을 전공별로 복제하지 않음; 학생부 환산총점 1000; 평균·50%·70% 원문값') for i,v in enumerate(data,1)])

def inu():
 out=[]
 for y in [2024,2025,2026]:
  key=f'inu-{y}-susi';pg=''
  doc=fitz.open(CACHE/(key+'.pdf'))
  for p in tables(key):
   for ti,t in enumerate(p['tables'],1):
    before=doc[p['page']-1].get_text(clip=fitz.Rect(0,0,doc[0].rect.width,t['bbox'][1]),sort=True)
    titles=re.findall(r'학생부(?:교과|종합)\([^)]*\)|실기/실적\([^)]*\)',compact(before))
    if titles:pg=titles[-1]
    assert pg
    rr=t['rows'];hi=next(i for i,v in enumerate(rr[:4]) if any(compact(x)=='모집인원' for x in v));q=next(i for i,x in enumerate(rr[hi]) if compact(x)=='모집인원')
    unitparts=['']*(q-1)
    for ri,v in enumerate(rr[hi+1:],hi+2):
     if not num(v[q]):continue
     if any(x in compact(''.join(str(z or '') for z in v[:q])) for x in ['총합계','총계','합계']):continue
     for j,x in enumerate(v[1:q]):
      if x:
       unitparts[j]=compact(x);unitparts[j+1:]=['']*(len(unitparts)-j-1)
     unit=' '.join(x for x in unitparts if x)
     if not unit or any(x in unit for x in ['총합계','총계','합계']):continue
     vv=v[q+3:];has70=any('70%' in compact(x) for h in rr[:hi+1] for x in h)
     labels=['지원자 교과평균','최초합격자 교과평균','최종등록자 교과평균']
     if has70:labels+=['최종등록자 교과70%']
     rem=len(vv)-1-len(labels)
     if rem:labels+=['최종등록자 교과환산평균']
     if has70 and rem>=2:labels+=['최종등록자 교과환산70%']
     if rem>(2 if has70 else 1):labels+=['최종등록자 가산점평균']
     labels+=['충원합격 예비순위']
     assert len(labels)==len(vv),(key,p['page'],pg,labels,vv)
     out.append(row(key,'인천대학교',y,'수시',pg,unit,f'p.{p["page"]} 표{ti} 행{ri}',admission_type='종합' if '종합' in pg else '실기' if '실기' in pg else '교과',quota=val(v[q]),applicants=val(v[q+1]),competition_rate=val(v[q+2]),cut_70=val(vv[3]) if has70 else '',cut_other=pairs(labels,vv),metric='교과등급',basis='최종등록자; 종합전형 교과성적은 참고용',grade_system='9',note='draft; 대학 자체 교과산출기준; 예비순위를 충원인원으로 변환하지 않음'))
  key=f'inu-{y}-jeongsi'
  for p in tables(key):
   for ti,t in enumerate(p['tables'],1):
    for ri,v in enumerate(t['rows'][2:],3):
     if not num(v[3]) or not v[2]:continue
     off=1 if y==2024 else 0
     labels=['최종등록 국어백분위 평균','최종등록 수학백분위 평균','최종등록 탐구백분위 평균','최종등록 영어등급 평균','최종등록 백분위 평균','최종등록 환산총점 평균','최종등록 영어등급70%','최종등록 백분위70%','최종등록 환산총점70%','충원합격 예비번호']
     out.append(row(key,'인천대학교',y,'정시','일반학생',compact(v[2]),f'p.{p["page"]} 표{ti} 행{ri}',admission_type='수능',quota=val(v[3]),applicants=val(v[4]),competition_rate=val(v[5+off]),cut_70=val(v[13+off]),cut_other=pairs(labels,v[6+off:]),metric='백분위',basis='최종등록자 성적 상위 약70% 해당자',note='draft; 국어·수학·탐구2개평균의 백분위평균(예체능 일부 수학 제외); 모집단위별 환산총점 만점은 원문 각주; '+('수시미충원 이월 '+val(v[5])+'; 실질경쟁률' if y==2024 else '')))
 save('inu',out)

def iccu():
 out=[]
 for y in [2024,2025,2026]:
  key=f'iccu-{y}';ts=tables(key);stats={};unit=''
  for ri,v in enumerate(ts[0]['tables'][0]['rows'][4:],5):
   if v[0]:unit=compact(v[0])
   if v[1]=='수시':
    for j in range(10):
     pg=compact(ts[0]['tables'][0]['rows'][1][2+j]);pg=pg.replace('고교','고')
     stats[(unit,'수시',pg)]=(val(v[2+j]),val(v[12+j]),'',ri)
   else:stats[(unit,v[1],'일반학생')]=(val(v[2]),val(v[22]),val(v[23]),ri)
  for ti,t in enumerate(ts[1]['tables'],1):
   rd='수시' if ti==1 else '정시';rr=t['rows']
   for ri,v in enumerate(rr[3:],4):
    pg=compact(v[0]);spg=pg.replace('추천','').replace('고교','고')
    for j in range(1,len(v),3):
     if not num(v[j]):continue
     unit=compact(rr[1][j]);rds=rd
     if rd=='정시' and y==2025 and unit=='융합디자인학과':rds='정시(실기)' if '실기' in pg else '정시(수능)'
     sx=stats.get((unit,rds,'일반학생' if rd=='정시' else spg),('','','',0))
     labels=['충원합격 예비번호','학생부교과 평균등급' if rd=='수시' else '수능 평균등급','수능 백분위평균']
     out.append(row(key,'인천가톨릭대학교(송도)',y,rd,pg,unit,f'p.2 표{ti} 행{ri} 열{j+1}; p.1 행{sx[3]}',admission_type='실기' if '실기' in pg else ('수능' if rd=='정시' else '교과'),quota=val(v[j]),applicants=val(v[j+1]),competition_rate=val(v[j+2]),cut_other=pairs(labels,sx[:3]),metric='교과등급' if rd=='수시' else '백분위',basis='최종합격자 평균',grade_system='9' if rd=='수시' else '',note='draft; 평균만 공개; 예비번호 음수도 원문 그대로 보존; 정시 영어등급 포함 대학 반영기준; 성적 산출영역은 cut_other 및 원문 참조'))
 # The existing iccu.csv combines an additional score-only row and retains the
 # original PDF's disputed 2025 column position. Do not overwrite that source.
 save('iccu-national-review',out)

if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8')
 for arg in sys.argv[1:]:globals()[arg]()
