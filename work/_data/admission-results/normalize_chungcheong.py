"""Official university source normalization. No inferred cutoff values."""
from pathlib import Path
import csv,json,re,sys
import fitz,openpyxl
ROOT=Path(__file__).parent; CACHE=ROOT/'chungcheong-expansion'
FIELDS=next(csv.reader((ROOT/'_all.csv').open(encoding='utf-8-sig')))
def clean(x):
 if isinstance(x,float) and x.is_integer():x=int(x)
 return re.sub(r'\s+',' ',str('' if x is None else x)).strip()
def compact(x):return re.sub(r'\s+','',clean(x))
def val(x):return '' if clean(x) in ['','-','–','—'] else clean(x)
def num(x):return bool(re.fullmatch(r'\d[\d,]*(?:\.\d+)?',clean(x)))
def row(key,u,y,rd,pg,unit,loc,**kw):
 r=dict.fromkeys(FIELDS,'');r.update(university=u,result_year=str(y),round=rd,program=clean(pg),recruit_unit=clean(unit),source_url=json.loads((CACHE/(key+'.meta.json')).read_text(encoding='utf8'))['url'],source_page=f'{key} / {loc}',note='draft; 대학 입학처 원본');r.update(kw);return r
def save(slug,rs):
 rs.sort(key=lambda r:(r['result_year'],r['round'],r['program'],r['recruit_unit'],r['source_page']))
 with (ROOT/(slug+'.csv')).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,FIELDS);w.writeheader();w.writerows(rs)
 print(slug,len(rs))
def tables(key):
 f=CACHE/(key+'.tables.json')
 if not f.exists():
  d=fitz.open(CACHE/(key+'.pdf'));out=[]
  for i,p in enumerate(d):
   ts=[]
   for t in p.find_tables():
    ts.append({'bbox':list(t.bbox),'before':p.get_text(clip=fitz.Rect(t.bbox[0],max(0,t.bbox[1]-100),t.bbox[2],t.bbox[1]),sort=True),'rows':t.extract()})
   out.append({'page':i+1,'text':p.get_text(sort=True),'tables':ts})
  f.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
 return json.loads(f.read_text(encoding='utf8'))
def pairs(labels,values):return '; '.join(clean(k)+' '+clean(v) for k,v in zip(labels,values) if val(v))

def kku():
 out=[]
 for key,rd in [('kku-susi','수시'),('kku-jeongsi','정시')]:
  for p in tables(key):
   pg={1:'학생부종합전형(Cogito자기추천전형)',2:'학생부종합전형(지역인재전형)',3:'학생부교과전형(교과우수전형)',4:'학생부교과전형(지역인재전형)',5:'실기우수자전형'}[p['page']] if rd=='수시' else '정시 일반전형'
   for t in p['tables']:
    names=[]
    for ri,v in enumerate(t['rows'][3:],4):
     if v[1]:names=v[1].splitlines()
     assert names,(key,p['page'],ri)
     unit=names.pop(0).rstrip('*');typ='종합' if '종합' in pg else ('실기' if '실기' in pg else ('수능' if rd=='정시' else '교과'))
     if rd=='정시' and '(' in unit:program='정시 '+unit.split('(')[1].rstrip(')')+'전형';unit=unit.split('(')[0]
     else:program=pg
     for o,y in zip([2,8,14] if rd=='수시' else [4,10,16],[2026,2025,2024]):
      if not num(v[o]):continue
      extreme=rd=='수시' and p['page']==4
      out.append(row(key,'건국대학교(글로컬)',y,rd,program,unit,f'p.{p["page"]} 행{ri}',admission_type=typ,quota=val(v[o]),applicants=val(v[o+1]),competition_rate=val(v[o+2]),cut_50='' if extreme else val(v[o+3]),cut_70=val(v[o+4]) if rd=='수시' and not extreme else '',cut_other=pairs(['최고' if extreme else '50%컷','최저' if extreme or rd=='정시' else '70%컷','최종추가합격번호'],v[o+3:o+6]),metric='교과등급' if rd=='수시' else ('표준점수' if unit=='의예과' else '백분위'),basis='최종등록자',grade_system='9' if rd=='수시' else '',note='draft; 공식 2024~2026 비교표의 모집단위명. 종합은 영재학교·검정고시·외국고 제외. 예비번호는 인원과 구분. 모집단위 주석은 원문 참조'))
 save('konkuk-glocal',out)

def kongju():
 out=[];key='kongju-results'
 for p in tables(key):
  if p['page']<59:continue
  for t in p['tables']:
   rr=t['rows'];rd='정시' if '정시' in clean(rr[0][0]) else '수시'
   for ri,v in enumerate(rr[4:],5):
    if clean(v[3]) not in ['2024','2025','2026']:continue
    pg=compact(v[0]);pg=pg[:-1].replace('_','') if pg.endswith('_') else pg
    typ='실기' if '실기' in pg else ('수능' if rd=='정시' else '교과')
    q=re.fullmatch(r'(\d+)\((\d+)\)',compact(v[4]));assert q,(p['page'],v)
    off=10 if rd=='수시' else 8
    labels=['최초합격자 50%컷','최초합격자 최저','최종등록자 50%컷','최종등록자 70%컷','최초합격자 환산점수 50%컷','최초합격자 환산점수 최저','최종등록자 환산점수 50%컷','최종등록자 환산점수 70%컷','실기응시자 평균','실기응시자 표준편차']
    out.append(row(key,'국립공주대학교',v[3],rd,pg,compact(v[2]),f'p.{p["page"]} 행{ri}',admission_type=typ,quota=q[1],competition_rate=val(v[5]),fill_count=val(v[9 if rd=='수시' else 7]),cut_50=val(v[off+2]),cut_70=val(v[off+3]),cut_other=pairs(labels,v[off:])+f'; 이월인원 {q[2]}; 최종등록인원 '+clean(v[8 if rd=='수시' else 6])+(('; 수능최저등급 '+clean(v[6])+'; 교과실질경쟁률 '+clean(v[7])) if rd=='수시' else ''),metric='교과등급' if rd=='수시' else '백분위',basis='최종등록자; 수시 이수단위 포함 학생부등급; 정시 상위 3과목',grade_system='9' if rd=='수시' else '',note='draft; 공개 수치 표 전사. 그래프 좌표를 성적으로 추정하지 않음; 학년도별 반영비율 상이'))
 save('kongju',out)

def excel_grid(s):
 rr=[[clean(v) for v in row] for row in s.values]
 for m in s.merged_cells.ranges:
  value=rr[m.min_row-1][m.min_col-1]
  for i in range(m.min_row-1,m.max_row):
   for j in range(m.min_col-1,m.max_col):rr[i][j]=value
 return rr

def hanbat():
 out=[]
 for key,y in [('hanbat-auto1',2026),('hanbat-auto2',2025),('hanbat-auto3',2024)]:
  w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  for s in list(w)[1:]:
   rr=excel_grid(s);orig=list(s.values);rd='정시' if s.title=='정시' else '수시';pg=s.title.replace('수시_','')
   header=next(i for i,r in enumerate(rr[:10]) if any(compact(x)=='모집단위명' for x in r))
   unitcol=next(i for i,x in enumerate(rr[header]) if compact(x)=='모집단위명')
   labs=[' '.join(dict.fromkeys(x for x in col if x)) for col in zip(*rr[4:8])]
   def col(needle):return next((i for i,x in enumerate(rr[header]) if compact(x)==needle),None)
   qc=col('모집인원');qc=col('최종모집인원') if qc is None else qc
   ac=col('지원인원');cc=col('경쟁률')
   assert qc is not None and ac is not None,(key,s.title)
   for ri,v in enumerate(rr[header+2:],header+3):
    unit=v[unitcol]
    if not unit or '계'==unit or '※' in unit or not num(v[qc]):continue
    # A vertically merged quota is a shared unit, never duplicate its headcount.
    shared=orig[ri-1][qc] is None
    opts={}
    for cut in ['50','70']:
     ix=next((i for i,l in enumerate(labs) if '최종' in l and cut+'%' in l and ('내신등급' in l if rd=='수시' else '수능' in l and ('점수' in l or '총점' in l))),None)
     if ix is not None:opts['cut_'+cut]=val(v[ix])
    typ='실기' if '실기' in pg else ('수능' if rd=='정시' else ('종합' if any(x in pg for x in ['종합','소프트웨어','특수교육']) else '교과'))
    out.append(row(key,'국립한밭대학교',y,rd,(v[1]+' ' if rd=='정시' else '')+pg,unit,f'{s.title} 행{ri}',admission_type=typ,quota='' if shared else val(v[qc]),applicants=val(v[ac]),competition_rate=val(v[cc]) if not shared else '',cut_other=pairs(labs[cc+1:],v[cc+1:]),metric='교과등급' if rd=='수시' else '환산점수',basis='최초합격자·최종등록자 구분; 전형총점 순위의 해당 성적',grade_system='9' if rd=='수시' else '',note='draft; 예비순위는 충원인원과 구분'+('; 공동 모집인원은 상위 병합 모집단위 참조' if shared else ''),**opts))
 save('hanbat',out)

def hoseo():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 out=[]
 for key,rd in [('hoseo-scan05-47','수시'),('hoseo-scan05-48','정시')]:
  sp=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  for ti,t in enumerate(sp.select('table')):
   ym=re.search(r'202[456]',t.parent.get('id','') if rd=='수시' else t.find_previous(['h2','h3','h4','h5']).get_text())
   if not ym:continue
   y=int(ym[0]);rr=html_grid(t);h=3 if rd=='정시' and y==2026 else 2
   labs=[' '.join(dict.fromkeys(x for x in col if x)) for col in zip(*rr[:h])]
   previous=[]
   for ri,v in enumerate(rr[h:],h+1):
    if rd=='수시' and len(v)==len(rr[0])-2 and previous:v=previous[:2]+v
    previous=v
    uc=2 if rd=='수시' else 3;qc=uc+1
    if not num(v[qc]) or v[uc] in ['계','합계','총계']:continue
    pg=v[0] if rd=='수시' else v[0]+' '+v[1];typ='실기' if any(z in pg for z in ['실기','특기']) else ('수능' if rd=='정시' else ('종합' if any(z in pg for z in ['종합','호서인재','AI·SW']) else '교과'))
    out.append(row(key,'호서대학교',y,rd,pg,v[uc],f'HTML 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[qc]),applicants=val(v[qc+1]),competition_rate=val(v[qc+2]),cut_other=pairs(labs[qc+3:],v[qc+3:]),metric='교과등급' if rd=='수시' else '백분위',basis='최종등록자; 평균·최저·80% 원문 구분',grade_system='9' if rd=='수시' else '',note='draft; 평균·최저·80%컷을 70%컷으로 대체하지 않음; 최종순위는 인원과 구분'))
 save('hoseo',out)

def pcu():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 out=[]
 for key,y,regularstart in [('pcu-link2',2026,13),('pcu-link3',2025,14),('pcu-link4',2024,15)]:
  sp=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
  for ti,t in enumerate(sp.select('table')):
   rr=html_grid(t);pg=t.find_previous(['h2','h3','h4','h5']).get_text(' ',strip=True);rd='정시' if ti>=regularstart else '수시'
   h=3
   labs=[' '.join(dict.fromkeys(x for x in col if x)) for col in zip(*rr[:h])]
   def col(needle):return next((i for i,x in enumerate(rr[0]) if compact(x)==needle),None)
   uc=col('모집단위');uc=col('학과') if uc is None else uc;qc=col('모집인원');ac=col('지원인원');cc=col('경쟁률');assert None not in [uc,qc,ac,cc],(key,ti)
   for ri,v in enumerate(rr[h:],h+1):
    if not num(v[qc]) or v[uc] in ['계','합계','총계','소계']:continue
    typ='실기' if any(z in pg for z in ['실기','특기','예술인재']) else ('종합' if any(z in pg for z in ['종합','서류100','배양영재']) else ('수능' if rd=='정시' and '일반' in pg else '교과'))
    program=pg
    if rd=='정시':program=' '.join(v[j] for j in range(uc) if compact(rr[0][j]) not in ['연번','번호'])+(' '+pg if uc<2 or compact(rr[0][0])=='연번' else '')
    opts={}
    for cut in ['50','70']:
     ix=next((i for i,l in enumerate(labs) if '최종' in l and cut+'%' in l),None)
     if ix is not None:opts['cut_'+cut]=val(v[ix])
    out.append(row(key,'배재대학교',y,rd,program,v[uc],f'HTML 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[qc]),applicants=val(v[ac]),competition_rate=val(v[cc]),cut_other=pairs(labs[cc+1:],v[cc+1:]),metric='환산점수' if rd=='정시' and '1,000' in ' '.join(labs) else '교과등급',basis='최초합격자·최종등록자 구분',grade_system='' if rd=='정시' and '1,000' in ' '.join(labs) else '9',note='draft; 충원순위(후보순위)는 충원인원으로 변환하지 않음',**opts))
 save('pcu',out)

def knue():
 from normalize_gyeonggi import header_labels
 out=[]
 for y,sk,jk in [(2026,'knue-auto2','knue-auto3'),(2025,'knue-scan05-70','knue-scan05-71'),(2024,'knue-scan06-24','knue-scan06-25')]:
  for key,rd in [(sk,'수시'),(jk,'정시')]:
   for p in tables(key):
    for t in p['tables']:
     rr=t['rows'];special=rd=='수시' and p['page']==2
     if special:
      for ri,v in enumerate(rr[4:],5):
       if not v[0] or compact(v[0]) in ['계','합계']:continue
       for start,end in [(1,6),(6,10),(10,14),(14,18),(18,22)]:
        if not num(v[start]):continue
        pg=clean(rr[1][start]);basis=clean(rr[2][start+3])
        out.append(row(key,'한국교원대학교',y,rd,pg,v[0],f'p.{p["page"]} 행{ri}',admission_type='교과' if start==1 else '종합',quota=val(v[start]),applicants=val(v[start+1]),competition_rate=val(v[start+2]),cut_other=basis+' '+clean(v[start+3])+(('; 수능최저충족인원 '+clean(v[start+4])) if end-start==5 else ''),metric='교과등급',basis=basis,grade_system='9',note='draft; 특별전형의 지원자 또는 1단계 합격자 평균이며 최종등록자 성적 아님'))
     else:
      h=4 if rd=='수시' else 3;labs=header_labels(rr[1:h] if rd=='수시' else rr[:h],h)
      for ri,v in enumerate(rr[h:],h+1):
       if not v[0] or not num(v[1]) or compact(v[0]) in ['계','합계']:continue
       out.append(row(key,'한국교원대학교',y,rd,'학생부종합우수자 일반전형' if rd=='수시' else '일반전형(가군)',v[0],f'p.{p["page"]} 행{ri}',admission_type='종합' if rd=='수시' else '수능',quota=val(v[1]),applicants=val(v[2]),competition_rate=val(v[3]),cut_other=pairs(labs[4:],v[4:]),metric='교과등급' if rd=='수시' else '환산점수',basis='제1단계·최초합격자·최종등록자 원문 구분',grade_system='9' if rd=='수시' else '',note='draft; 원문 학과 약칭 유지. 평균·최고·최저를 백분위 컷으로 변환하지 않음'))
 save('knue',out)

def seowon():
 out=[]
 for key,y,rd in [('seowon-auto7',2024,'수시'),('seowon-auto16',2025,'수시'),('seowon-auto13',2026,'수시'),('seowon-auto17',2024,'정시'),('seowon-auto15',2025,'정시'),('seowon-auto14',2026,'정시')]:
  for p in tables(key):
   for t in p['tables']:
    rr=t['rows']
    if y==2024 and rd=='정시':
     gun=''
     for ri,v in enumerate(rr[3:],4):
      if v[0]:gun=clean(v[0])
      if not num(v[2]) or not v[1]:continue
      out.append(row(key,'서원대학교',y,rd,gun+' 일반전형',v[1],f'p.{p["page"]} 행{ri}',admission_type='수능',quota=val(v[2]),applicants=val(v[3]),competition_rate=val(v[4]),cut_other=pairs(['예비번호','백분위 최고','백분위 평균','백분위 최저','영어등급 최고','영어등급 평균','영어등급 최저'],v[5:12]),metric='백분위',basis='합격경험 전체; 국수탐 중 2개 백분위 평균',note='draft; 2025 모집계획 열은 제외'))
     continue
    pg=''
    for ri,v in enumerate(rr,1):
     if len(v)<14 or not num(v[0]) or not v[3] or '신설학과' in clean(v[4]):continue
     if v[2]:pg=clean(v[2])
     unit=clean(v[3]).replace('[교직]','');noadmit=clean(v[10])=='0' or clean(v[5])=='0';cut=val(v[13])
     if '★' in cut:continue
     out.append(row(key,'서원대학교',y,rd,pg,unit,f'p.{p["page"]} 행{ri}',admission_type='실기' if any(z in pg for z in ['실기','특기','예체능']) else ('수능' if rd=='정시' else '교과'),quota=val(v[4]),applicants=val(v[5]),competition_rate=val(v[6]),cut_70='' if noadmit else cut,cut_other=pairs(['최종순위','예비번호','불합인원','합격인원','최고','평균','공개표 70%CUT'],v[7:14]),metric='백분위' if rd=='정시' else '교과등급',basis='원문 교과성적/수능성적',grade_system='9' if rd=='수시' else '',note='draft; 다음 학년도 모집계획·신설학과 예상등급 제외'+('; 지원 또는 합격인원 0인데 성적 기재: 원문 그대로 cut_other에 보존, 실제 합격컷으로 사용하지 않음' if noadmit and cut else '')))
 save('seowon',out)

def kkot():
 from normalize_gyeonggi import header_labels
 out=[]
 for key,y in [('kkot-scan05-62',2026),('kkot-scan05-63',2025),('kkot-scan05-64',2024)]:
  for p in tables(key):
   for t in p['tables']:
    rr=t['rows'];h=2 if y==2026 else 3;labs=header_labels(rr,h);rd='';unit=''
    for ri,v in enumerate(rr[h:],h+1):
     if v[0]:rd='정시' if '정시' in v[0] else '수시'
     if v[1]:unit=clean(v[1])
     if not num(v[3]) or not v[2]:continue
     out.append(row(key,'가톨릭꽃동네대학교',y,rd,v[2],unit,f'p.{p["page"]} 행{ri}',admission_type='종합' if '종합' in v[2] else ('수능' if '수능' in v[2] else '교과'),quota=val(v[3]),applicants=val(v[4]),competition_rate=val(v[5]),cut_70=val(v[9 if y==2026 else 7]),cut_other=pairs(labs[6:],v[6:]),metric='교과등급' if rd=='수시' else '기타',basis='2026 최종 평균/70%; 2024·2025 최초 평균/최종 70%',grade_system='9' if rd=='수시' else '',note='draft; 정시 환산등급은 수능등급 기준. 후보순위는 충원인원과 구분'))
 save('kkot',out)

def semyung():
 out=[]
 def emit(key,y,rd,pg,unit,loc,q='',a='',comp='',scores='',cut=''):
  out.append(row(key,'세명대학교',y,rd,pg,unit,loc,admission_type='실기' if '실기' in pg else ('종합' if 'SMU' in pg else ('수능' if rd=='정시' else '교과')),quota=val(q),applicants=val(a),competition_rate=val(comp),cut_70=val(cut),cut_other=scores,metric='교과등급' if rd=='수시' else '환산점수',basis='합격자 전체(최초~충원); 최종등록자만의 컷 아님',grade_system='9' if rd=='수시' else '',note='draft; 2026은 70%, 2024·2025는 80% 기준. 예비최저는 후보번호'))
 for key,y in [('semyung-2026',2026),('semyung-auto3',2025),('semyung-auto5',2024)]:
  w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  names=['정원내(수시)','정원내(정시)'] if y==2026 else (['정원내'] if y==2025 else ['2024학년도 입시결과'])
  for name in names:
   s=w[name];rr=excel_grid(s);uc=0 if y==2024 else 1;h=6 if y==2024 else 7
   starts=list(range(2,45,7)) if y==2026 and '수시' in name else ([2] if y==2026 else (list(range(2,45,6)) if y==2025 else list(range(1,27,5))))
   for ri,v in enumerate(rr[h:],h+1):
    unit=v[uc]
    if y==2025 and ri>=46:continue
    if not unit or any(z in unit for z in ['합계','총계','※','정원외','농어촌','특성화고','기초생활']) or unit in ['계','모집단위']:continue
    for st in starts:
     if not num(v[st]):continue
     rd='정시' if ('정시' in name or y==2025 and st==44) else '수시';pg=rr[3 if y==2026 else 4][st]
     if y==2026:sc=pairs(['최초합격 최저','합격자 전체 평균','합격자 전체 70%','예비최저'],v[st+3:st+7]);cut=v[st+5]
     elif y==2025:sc=pairs(['합격자 평균','합격자 80%','예비최저'] if rd=='수시' else ['합격자 80%','예비최저'],v[st+3:st+(6 if rd=='수시' else 5)]);cut=''
     else:sc=pairs(['합격자 80%','충원합격 최종순위'],v[st+3:st+5]);cut=''
     emit(key,y,rd,pg,unit,f'{name} 행{ri}',v[st],v[st+1],v[st+2],sc,cut)
    if y==2024 and val(v[31]):emit(key,y,'정시','일반전형',unit,f'{name} 행{ri}',scores='합격자 80% '+v[31])
  if y==2025:
   for i,v in enumerate(list(w['정원내'].values)[47:52],48):
    emit(key,y,'수시',clean(v[1]),'한의예과',f'정원내 하단 수능최저통과 별표 행{i}',q=v[2],a=v[3],scores=pairs(['수능최저통과인원','통과율(%)'],v[4:6]))
  if y in [2025,2026]:
   rr=excel_grid(w['정원외'])
   for unit,st,indices in [('간호학과',8 if y==2026 else 9,[5,6] if y==2026 else [4,5]),('한의예과',13 if y==2026 else 15,[5,6] if y==2026 else [4,5])]:
    for i in indices:
     v=rr[i];emit(key,y,'수시',v[st],unit,f'정원외 행{i+1}',q=v[st+1],a=v[st+2],scores=('합격자 70% ' if y==2026 else '합격자 80% ')+v[st+3],cut=v[st+3] if y==2026 else '')
   for i in ([4,5,6]):
    v=rr[i];emit(key,y,'수시',v[1],'정원외 통합선발(전체)',f'정원외 행{i+1}',v[2],v[3],v[4],pairs(['합격자 70%' if y==2026 else '합격자 80%','예비최저'],v[5:7]),v[5] if y==2026 else '')
  if y==2026:
   s=w['(수시) 한의예과-수능최저 통과']
   for i,v in enumerate(list(s.values)[3:],4):emit(key,y,'수시',clean(v[1]),'한의예과',f'{s.title} 행{i}',q=v[2],a=v[3],scores=pairs(['수능최저통과인원','통과율(%)'],v[4:6]))
 save('semyung',out)

def ut():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 out=[]
 for y,sk,jk in [(2026,'ut-link3','ut-auto1'),(2025,'ut-link4','ut-auto2'),(2024,'ut-link5','ut-auto3')]:
  for key,rd in [(sk,'수시'),(jk,'정시')]:
   sp=BeautifulSoup((CACHE/(key+'-converted.html')).read_text(encoding='utf8'),'html.parser');pg=''
   for ti,t in enumerate(sp.select('table')):
    rr=html_grid(t)
    if len(rr)==1:
     candidate=' '.join(rr[0])
     if '수시-' in candidate or '정시-' in candidate:pg=clean(candidate).replace('수시-','').replace('정시-','')
     continue
    if len(rr)<4 or rr[0][0]!='모집단위' or '모집' not in rr[1]:continue
    qc=rr[1].index('모집');labs=[' '.join(dict.fromkeys(x for x in col if x)) for col in zip(*rr[:3])];cells={};seen=set()
    for i,tr in enumerate(t.find_all('tr')):
     j=0
     for cell in tr.find_all(['td','th'],recursive=False):
      while (i,j) in cells:j+=1
      rs=int(cell.get('rowspan',1));cs=int(cell.get('colspan',1))
      for a in range(rs):
       for b in range(cs):cells[i+a,j+b]=cell
      j+=cs
    for ri,v in enumerate(rr[3:],4):
     if v[0] in ['합계','계','소계'] or not v[0] or not (num(v[qc]) or num(v[qc+1])):continue
     v=list(v);cell=cells.get((ri-1,qc));shared=cell and int(cell.get('rowspan',1))>1
     if shared:
      if id(cell) not in seen:
       seen.add(id(cell));out.append(row(key,'국립한국교통대학교(통합)',y,rd,pg,'전체 모집단위(공동 선발)',f'HWP 표{ti+1} 행{ri} 공유셀',admission_type='기타',quota=val(v[qc]),competition_rate=val(v[qc+2]) if int(cells[ri-1,qc+2].get('rowspan',1))>1 else '',metric='기타',basis='공동 모집인원',note='draft; 대학 통합 모집표의 병합 인원; 학과별 성적 행에 중복 배정하지 않음'))
      v[qc]=''
      if int(cells[ri-1,qc+2].get('rowspan',1))>1:v[qc+2]=''
     out.append(row(key,'국립한국교통대학교',y,rd,pg,v[0],f'HWP 표{ti+1} 행{ri}',admission_type='종합' if '종합' in pg or '나비인재' in pg else ('수능' if rd=='정시' else '교과'),quota=val(v[qc]),applicants=val(v[qc+1]),competition_rate=val(v[qc+2]),cut_other=pairs(labs[1:qc],v[1:qc])+'; '+pairs(labs[qc+3:],v[qc+3:]),metric='백분위' if rd=='정시' else '교과등급',basis='최초합격자·최종등록자 원문 구분',grade_system='' if rd=='정시' else '9',note='draft; 공식 대학 전체 통합표(충주·증평·의왕). 예비순위는 인원과 구분; 50/70% 컷은 공개하지 않음'))
 for r in out:
  if r['university'].endswith('(통합)'):continue
  unit=compact(r['recruit_unit'])
  r['university']='국립한국교통대학교(의왕)' if any(z in unit for z in ['철도','AI.데이터']) else '국립한국교통대학교(충주·증평)'
 save('ut',out)

def bu():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 out=[]
 for y in [2024,2025,2026]:
  for rnd,rd in [('susi','수시'),('jeongsi','정시')]:
   key=f'bu-{y}-{rnd}';sp=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser');rr=html_grid(sp.select('table')[0]);labs=[' '.join(dict.fromkeys(col)) for col in zip(*rr[:2])];q=2 if rd=='수시' else 3
   for ri,v in enumerate(rr[2:],3):
    if not num(v[q]):continue
    pg=v[0] if rd=='수시' else v[0]+' '+v[1]
    out.append(row(key,'백석대학교',y,rd,pg,v[q-1],f'HTML 결과표 행{ri}',admission_type='종합' if pg=='창의인재' else ('실기' if '실기' in pg or '특기' in pg else ('수능' if rd=='정시' else '교과')),quota=val(v[q]),applicants=val(v[q+1]),competition_rate=val(v[q+2]),cut_other=pairs(labs[q+3:],v[q+3:]),metric='교과등급' if rd=='수시' else '백분위',basis='공식 경쟁률 및 등급현황; 등록 80%컷',grade_system='9' if rd=='수시' else '',note='draft; 2026 학생부 보통교과/진로포함 지표 별도; 예비자 진행번호는 인원과 구분; 2024 80% 항목의 공란·0은 원문 유지'))
 save('bu',out)

def konyang():
 out=[];campmap={}
 for key,pi in [('konyang-2026',2),('konyang-scan06-26',3)]:
  for t in tables(key)[pi]['tables']:
   rr=t['rows']
   if len(rr[0])==2 and any(z in clean(rr[0][0]) for z in ['대전','논산']):
    camp='대전' if '대전' in rr[0][0] else '논산'
    for v in rr[2:]:
     if v[1]:
      for unit in v[1].splitlines():campmap[compact(unit)]=camp
 for key,y in [('konyang-2026',2026),('konyang-scan06-26',2025),('konyang-scan06-27',2024)]:
  for p in tables(key):
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];n=len(rr[0])
    if n not in [11,13] or len(rr)<3 or '모집' not in compact(rr[0][0]):continue
    rd='정시' if n==13 else '수시';uc=1 if rd=='정시' else 0;qc=uc+1;score=7 if rd=='정시' else 5
    before=clean(t['before']);matches=re.findall(r'[가-하]\.\s*([^:]+)',before);pg=matches[-1].strip() if matches else ('군사학전형' if '군사학' in before else '일반학생전형[수능]')
    if ' / ' in pg:pg=pg.split(' / ')[0]
    if '입시' in pg:pg=pg.split('입시')[0].strip()
    queues={uc:[],qc:[],n-1:[]};gun=''
    for ri,v in enumerate(rr[2:],3):
     if rd=='정시' and v[0]:gun=compact(v[0])
     for col in queues:
      if v[col]:queues[col]=v[col].splitlines()
     if not queues[uc]:continue
     unit=queues[uc].pop(0);counts=queues[qc].pop(0).split() if queues[qc] else [];rank=queues[n-1].pop(0) if queues[n-1] else ''
     assert len(counts)==(5 if rd=='정시' else 4),(key,p['page'],unit,counts)
     program=pg
     if '전형' in unit:program=unit;unit='의학과'
     elif '[' in unit:
      unit,tag=unit.split('[',1);tag=tag.rstrip(']')
      if rd=='정시':program='지역인재전형[수능]' if '지역' in tag else '일반학생전형[수능]'
      elif '기초' in tag:program='지역인재전형[기초]'
      elif '교과' in tag:program='지역인재전형[교과]'
     typ='실기' if '실기' in program or '특기' in program else ('종합' if '종합' in program else ('수능' if rd=='정시' else '교과'))
     camp=campmap.get(compact(unit),campmap.get(compact(unit).split('(')[0],''))
     extras=pairs(['최고','평균','50%컷','70%컷','최저'],v[score:score+5])+f'; 등록인원 {counts[-1]}; 최종등록자 후보순위 {rank}'
     if rd=='정시':extras+='; 기존모집인원 '+counts[0]
     out.append(row(key,'건양대학교'+('('+camp+')' if camp else ''),y,rd,(gun+'군 ' if gun else '')+program,unit,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type=typ,quota=val(counts[1 if rd=='정시' else 0]),applicants=val(counts[2 if rd=='정시' else 1]),competition_rate=val(counts[3 if rd=='정시' else 2]),cut_50=val(v[score+2]),cut_70=val(v[score+3]),cut_other=extras,metric='교과등급' if rd=='수시' else '백분위',basis='최종등록자; 정시 백분위 합산 200/300/400점 원문 구분',grade_system='9' if rd=='수시' else '',note='draft; 그래프 지원자분포 제외; 표의 수치 전사; 정시 모집단위별 반영총점은 원문 표 머리글 참조'))
 save('konyang',out)

if __name__=='__main__':
 for name in sys.argv[1:]:globals()[name]()
