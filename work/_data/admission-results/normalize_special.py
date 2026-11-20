"""Official special-school statistics. No synthetic grade cutoffs or private scores."""
from pathlib import Path
import csv,json,re,fitz,zipfile
from bs4 import BeautifulSoup
from normalize_daegu_adiga import htmlgrid,labels
from finalize_daegu_gyeongbuk import read,write,P,C,F
AUDIT=[]
def clean(x):return re.sub(r'\s+',' ',str(x or '')).strip()
def num(x):
 s=clean(x).replace(',','').replace(':1','').strip()
 return s if re.fullmatch(r'\d+(?:\.\d+)?',s) else ''
def row(key,u,y,rd,pg,unit,page,raw,**kw):
 r={k:'' for k in F};r.update(university=u,result_year=str(y),round=rd,admission_type='기타',program=pg,recruit_unit=unit,metric='기타',basis='공식 공개 집계',source_url=json.loads((C/(key+'.meta.json')).read_text(encoding='utf8'))['url'],source_page=key+' / '+page,cut_other=raw,note='draft; 공식 공개 자료; 비공개·미확보 값은 공란; 평균·합격인원은 50%·70%컷·충원인원으로 전용하지 않음');r.update(kw);return r
def save(sl,rs):
 rs=sorted(rs,key=lambda r:tuple(r[k] for k in ['result_year','round','program','recruit_unit','source_page']))
 write(P/(sl+'.csv'),rs);AUDIT.append(dict(slug=sl,rows=len(rs)));print(sl,len(rs))
def kentech():
 out=[]
 # Transcribed from the three official images, each visually inspected.
 data={2024:[('일반전형',90,1355,'15.1',88,'97.8'),('고른기회전형',10,183,'18.3',9,'90'),('수능우수자전형',10,401,'40.1',8,'80')],2025:[('일반전형',90,1762,'19.58',86,'95.6'),('고른기회전형',10,219,'21.9',10,'100.0'),('수능우수자전형',10,281,'28.1',11,'110.0')],2026:[('일반전형',90,2176,'24.18',85,'94.4'),('고른기회전형(농어촌)',7,159,'22.71',7,'100.0'),('고른기회전형(저소득)',3,98,'32.67',3,'100.0'),('수능우수자전형',10,468,'46.80',8,'80.0')]}
 for y,rs in data.items():
  for pg,q,ap,co,reg,rate in rs:
   rd='정시' if '수능' in pg else '수시';mean={2024:'396.4',2025:'391.73',2026:'393.13'}[y]
   raw=f'모집인원 {q}; 지원인원 {ap}; 경쟁률 {co}; 등록인원 {reg}; 등록률 {rate}%'+(f'; 정시 등록자 평균 {mean}; 표준점수 기반 본교 정시 산출점수' if rd=='정시' else '; 수시 정량적 내신 성적 안내하지 않음(원문)')
   out.append(row(f'special-kentech-{y}','한국에너지공과대학교',y,rd,pg,'전체 모집단위(원문 미분리)','공식 결과 이미지: 모집결과·등록인원·정시 성적',raw,quota=str(q),applicants=str(ap),competition_rate=co,metric='환산점수' if rd=='정시' else '기타',basis='지원현황 및 최종등록자; 평균만 공개; 등록률은 충원율과 달라 cut_other에만 보존',admission_type='수능' if rd=='정시' else '종합'))
 save('kentech',out)

def karts():
 out=[];sumcheck=[]
 keys=[(2026,'special-karts-board-post59-file59',False),(2026,'special-karts-board-post59-file61',True),(2025,'special-karts-board-post60-file59',False),(2025,'special-karts-board-post60-file61',True),(2024,'special-karts-board-post61-file60',False),(2024,'special-karts-2024-extra',True)]
 for y,key,extra in keys:
  d=fitz.open(C/(key+'.pdf'))
  for pi,p in enumerate(d):
   tx=p.get_text();title=tx[:600]
   if extra and pi>=2:continue # Sources label pages 1–2 예술사, page 3 예술전문사.
   tables=p.find_tables(strategy='lines_strict').tables
   if not tables:tables=p.find_tables().tables
   for ti,t in enumerate(tables):
    g=t.extract();labs=[clean(x) for x in g[0]]
    if labs[:4]!=['소속','학과','세부모집','전형구분']:continue
    prev=['']*len(labs);source_sum=0;out_sum=0
    for ri,rawv in enumerate(g[1:],1):
     v=[clean(x) if x is not None else prev[j] for j,x in enumerate(rawv)];prev=v
     if y==2024 and extra and (v[0]=='소속' or '총계' in v[0]):break # Graduate section follows undergraduate total.
     if any(z in ' '.join(v[:4]) for z in ['소계','총계','합계']):continue
     ac=4 if extra else 5
     if not num(v[ac]):continue
     assert all(v[:4]),(key,pi,ri,v)
     unit='/'.join(dict.fromkeys(v[:3]));pg=('정원외 ' if extra else '정원내 ')+v[3]
     raw='; '.join(f'{a} {b}' for a,b in zip(labs,v) if b)
     # Merged numerical cells are shared across distinct rows. Preserve their
     # values in raw text, but leave row-level quantities blank.
     shared=[]
     for j in range(4,len(v)):
      rect=t.rows[ri].cells[j]
      if rect is None or (ri+1<len(g) and rect[3]>t.rows[ri+1].bbox[1]+1):shared.append(j)
     r=row(key,'한국예술종합학교',y,'기타',pg,unit,f'PDF p.{pi+1} 표{ti+1} 행{ri+1}',raw,applicants='' if ac in shared else num(v[ac]),basis='예술사 신입학 지원·최종합격 현황; 등록자 성적 아님')
     if not extra:
      r['quota']='' if 4 in shared else num(v[4]);r['fill_count']='' if 8 in shared else num(v[8])
     if shared:r['note']+='; 공동 집계 열 '+','.join(labs[j] for j in shared)+'은 원문 공통값으로 보존하고 행별 수치 배분 안 함'
     r['note']+='; 학교 고유 모집시기이므로 수시·정시로 임의 변환 안 함; 예비합격 설정인원은 충원인원 아님'
     out.append(r);source_sum+=int(num(v[ac]) or 0);out_sum+=int(r['applicants'] or 0)
    sumcheck.append(dict(source=key,page=pi+1,source_applicants=source_sum,normalized_applicants=out_sum))
 save('karts',out);(C/'special-karts-row-audit.json').write_text(json.dumps(sumcheck,ensure_ascii=False,indent=2),encoding='utf8')

def unist():
 out=[]
 for y,key in [(2024,'special-unist-board-post117-file106'),(2025,'special-unist-board-post114-file106'),(2026,'special-unist-2026')]:
  d=fitz.open(C/(key+'.pdf'));g=d[0].find_tables(strategy='lines_strict').tables[0].extract();rd=''
  if y==2024:
   for i,v in enumerate(g[2:],3):
    if v[0]:rd=clean(v[0])
    if rd not in ['수시','정시'] or '계' in clean(v[1]):continue
    for label,j in [('이공',2),('경영',5)]:
     if not num(v[j]):continue
     pg=clean(v[1]);unit=label+('(반도체)' if '반도체' in pg else '(무학과)' if '무학과' in pg else '')
     out.append(row(key,'울산과학기술원(UNIST)',y,rd,pg,unit,f'PDF p.1 행{i}',f'모집 {v[j]}; 지원 {v[j+1]}; 경쟁률 {v[j+2]}',quota=num(v[j]),applicants=num(v[j+1]),competition_rate=num(v[j+2]),basis='원서접수 최종 경쟁률',admission_type='수능' if rd=='정시' else '기타'))
  else:
   prev=['']*6
   for i,vv in enumerate(g[1:],1):
    v=[clean(x) if x is not None else prev[j] for j,x in enumerate(vv)];prev=v
    if '계'==v[1] or v[0]=='총계':continue
    rd='정시' if '정시' in v[0] else '수시';raw='; '.join(f'{k} {z}' for k,z in zip(['모집시기','전형','계열','모집','지원','경쟁률'],v));shared=(v[1]=='일반' and '이공' in v[2])
    r=row(key,'울산과학기술원(UNIST)',y,rd,v[1],v[2],f'PDF p.1 행{i+1}',raw,quota=num(v[3]),applicants='' if shared else num(v[4]),competition_rate='' if shared else num(v[5]),basis='원서접수 최종 경쟁률',admission_type='수능' if rd=='정시' else '기타')
    if shared:r['note']+='; 일반전형 이공 무학과·반도체 지원 '+v[4]+'명 및 경쟁률 '+v[5]+'은 공동 집계: 개별 학과 열은 공란'
    out.append(r)
   v=g[1];out.append(row(key,'울산과학기술원(UNIST)',y,'수시','일반','이공(무학과·반도체 공동 집계)','PDF p.1 일반전형 공동 지원셀',f'무학과 모집 {g[1][3]}; 반도체 모집 {g[2][3]}; 공동 지원 {v[4]}; 공동 경쟁률 {v[5]}; '+clean(d[0].get_text().split('*')[-1]),applicants=num(v[4]),competition_rate=num(v[5]),basis='원서접수 최종 경쟁률; 두 모집단위 공동 집계'))
 save('unist',out)

def gist():
 key='special-gist-news2';d=fitz.open(C/(key+'.pdf'));out=[]
 for y,ap,co in [(2024,2583,'12.01'),(2025,2954,'13.74'),(2026,3331,'15.49')]:
  out.append(row(key,'광주과학기술원(GIST)',y,'수시','정원내 전체(전형 미분리)','전체 모집단위(원문 미분리)','PDF p.2 최근 5개년 표',f'모집인원(정원 내) 215; 지원자 {ap}; 경쟁률 {co}',quota='215',applicants=str(ap),competition_rate=co,basis='학교 공식 보도자료의 수시 정원내 전체 지원현황'))
 # The prose totals 2,992 applicants, inconsistent with the 3,331 total.
 # Do not assign these possibly mixed-year program figures to a result year.
 (C/'special-gist-prose-quarantine.json').write_text(json.dumps(dict(source_url=out[0]['source_url'],page=2,reason='2026 제목·표 합계3331과 본문 전형별 합2992 불일치. 전형별 수치 사용 보류',programs=[['고른기회',15,339,'22.6'],['특기자',10,175,'17.5'],['학교장추천',40,582,'14.55'],['일반',150,1896,'12.64']]),ensure_ascii=False,indent=2),encoding='utf8')
 save('gist',out)

def postech():
 out=[]
 for y in [2024,2025]:
  key=f'postech-adiga-{y}';s=BeautifulSoup((C/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  for ti,t in enumerate(s.find_all('table')):
   tx=t.get_text(' ',strip=True)
   if not all(z in tx for z in ['경쟁률','충원','모집단위']):continue
   g=htmlgrid(t);h=next((i for i,v in enumerate(g) if v[0]=='단일계열'),None)
   if h is None:continue
   labs=labels(g,h);v=g[h];pg=clean(g[0][1])
   r=row(key,'포항공과대학교',y,'수시',pg,v[0],f'HTML 표{ti+1} 행{h+1}','; '.join(f'{a} {b}' for a,b in zip(labs,v) if b),quota=num(v[1]),competition_rate=num(v[2]),admission_type='종합',basis='대학 제공 어디가 전형별 공개 결과')
   r['note']+='; 충원합격순위는 인원 아님; 지원자 분포도 빈칸을 등록자 등급으로 쓰지 않음';out.append(r)
 save('postech-adiga',out)

def police():
 out=[]
 data=[(2024,'special-police-page6-post3-fixed',['83.32','74.42','74.01','','78.92']),(2025,'special-police-page2-post18-fixed-file0',['87.84','90.15','78.81','256.8','85.60']),(2026,'special-police-2026-mean-file',['95.44','85.55','91.27','272.26','90.75'])]
 for y,key,v in data:
  raw='; '.join(f'{k} {x}' for k,x in zip(['국어100점 평균','영어100점 평균','수학100점 평균','총점300점 평균','과목평균100점'],v) if x)
  r=row(key,'경찰대학',y,'기타','1차시험(전형 통합)','전체 모집단위(원문 미분리)','공개 평균점수 표',raw,metric='환산점수',basis='1차시험 최초합격자 평균; 최종합격자 아님')
  r['note']+='; 추가합격자·전형별·성별 평균 및 커트라인 비공개(학교 명시)'
  if y==2024:
   r['basis']='1차시험 합격자 평균; 최종합격자 아님'
   r['note']+='; 원문 과목평균78.92는 세 과목 단순평균77.25와 불일치: 원문 유지, 재계산 대체 안 함'
  if y==2025:r['note']+='; 첨부 본문 2025학년도 기준; 동일 첨부를 2025 평균 공개 공지에서도 확인'
  if y==2026:r['note']+='; 게시물 제목·첨부 XML 본문·미리보기 텍스트의 2026학년도 일치 확인; 내장 미리보기 이미지 학년도 2025 오기, 수치는 본문과 일치'
  out.append(r)
 save('knpu',out)

if __name__=='__main__':
 for fn in [kentech,karts,unist,gist,postech,police]:fn()
 (C/'special-normalize-audit.json').write_text(json.dumps(AUDIT,ensure_ascii=False,indent=2),encoding='utf8')
