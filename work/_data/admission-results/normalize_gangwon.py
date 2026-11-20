"""Reproducible normalization; keeps source values and does not calculate cutoffs."""
from pathlib import Path
import csv,json,re,sys
import fitz,openpyxl
from bs4 import BeautifulSoup
ROOT=Path(__file__).parent; CACHE=ROOT/'gangwon-expansion'
FIELDS=next(csv.reader((ROOT/'kangwon.csv').open(encoding='utf-8-sig')))
def clean(v):return re.sub(r'\s+',' ',str('' if v is None else v)).strip()
def val(v):
 s=clean(v);return '' if s in ['-','–','—','\xad'] else s
def compact(v):return re.sub(r'\s+','',str(v or ''))
def url(key):return json.loads((CACHE/(key+'.meta.json')).read_text(encoding='utf-8'))['url']
def row(key,univ,year,round,program,unit,page,**kw):
 r=dict.fromkeys(FIELDS,'');r.update(university=univ,result_year=str(year),round=round,program=program,recruit_unit=unit,source_url=url(key),source_page=f'{key} / {page}',note='draft: 검수 전');r.update(kw);return r
def save(slug,rows):
 rows.sort(key=lambda r:(r['result_year'],r['round'],r['program'],r['recruit_unit'],r['source_page']))
 with (ROOT/(slug+'.csv')).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,FIELDS);w.writeheader();w.writerows(rows)
 print(slug,len(rows))
def tables(key):
 f=CACHE/(key+'.tables.json')
 if not f.exists():
  d=fitz.open(CACHE/(key+'.pdf'));out=[]
  for i,p in enumerate(d):out.append({'page':i+1,'text':p.get_text(sort=True),'tables':[{'bbox':list(t.bbox),'rows':t.extract()} for t in p.find_tables()]})
  f.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
 return json.loads(f.read_text(encoding='utf-8'))
def title_before(key,pageno,bbox,pattern):
 d=fitz.open(CACHE/(key+'.pdf'));p=d[pageno-1]
 s=p.get_text(clip=fitz.Rect(0,0,p.rect.width,bbox[1]),sort=True)
 matches=re.findall(pattern,s,re.M)
 return clean(matches[-1]) if matches else ''
def hallym():
 out=[]
 for y in [2024,2025,2026]:
  for rnd in ['susi','jeongsi']:
   key=f'hallym-{y}-{rnd}';program=''
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows']
     if len(rr[0]) not in [12,14] or compact(rr[0][0])!='모집단위' or compact(rr[0][1])!='모집인원':continue
     program=title_before(key,p['page'],t['bbox'],r'^\s*\d+\.\s*(.+)$') or program
     for ri,v in enumerate(rr[2:],3):
      if not v[0] or not any(val(x) for x in v[1:]):continue
      unit=clean(v[0]);typ='수능' if rnd=='jeongsi' else '교과'
      if rnd=='susi' and ('학교생활우수자' in program or ('지역인재' in program and unit in ['의예과','의학과','광고홍보학과']) or ('농어촌학생' in program and unit in ['의예과','의학과'])):typ='종합'
      labels=['최초합격자 학생부 평균','최초합격자 학생부 70%','최초합격자 학생부 최저','최종등록자 학생부 평균','최종등록자 학생부 70%','최종등록자 학생부 최저'] if rnd=='susi' else ['최초합격자 전형총점 평균','최초합격자 전형총점 최저','최종등록자 전형총점 평균','최종등록자 전형총점 최저','최초합격자 수능등급 평균','최초합격자 수능등급 최저','최종등록자 수능등급 평균','최종등록자 수능등급 최저']
      out.append(row(key,'한림대학교',y,'수시' if rnd=='susi' else '정시',program,unit,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[1]),applicants=val(v[2]),competition_rate=val(v[3]),cut_70=val(v[10]) if rnd=='susi' else '',cut_other='; '.join(f'{k} {val(x)}' for k,x in zip(labels,v[6:]) if val(x)),metric='교과등급' if rnd=='susi' else '환산점수',basis='최종등록자; 성적 산출기준은 원문 앞부분 참조',grade_system='9' if rnd=='susi' else '',note=f'draft; 예비순위 {clean(v[4])}; 회전율 {clean(v[5])} (충원인원·충원율로 변환하지 않음)'))
 save('hallym',out)
def kyungdong():
 out=[]
 for y in [2024,2025,2026]:
  for rnd in ['susi','jeongsi']:
   key=f'kd-{y}-{rnd}';p=tables(key)[0];t=p['tables'][0];rr=t['rows'];campus=''
   for ri,v in enumerate(rr[4:],5):
    if v[0]:campus=compact(v[0])
    if '원주' not in campus and '고성' not in campus:continue
    if not v[1] or '※' in v[1]:continue
    groups=[(2,7),(7,12),(12,17),(17,21),(21,25),(25,29)] if rnd=='susi' else [(3,10),(10,16),(16,22),(22,28)]
    for st,en in groups:
     vv=v[st:en]
     if not any(val(x) for x in vv):continue
     program=clean(rr[1][st]);labels=['모집인원','지원인원']+(['경쟁률'] if len(vv) in [5,7] else [])
     labels+=['교과성적 최종평균','교과성적 최종80%' if rnd=='susi' and st<17 else '교과성적 최종100%']
     if rnd=='jeongsi':labels+=['수능성적 최종평균','수능성적 최종100%']
     # Whole-school merged quotas are not assigned to individual departments.
     quota=val(vv[0]) if not (rnd=='susi' and st>=17) else ''
     out.append(row(key,'경동대학교('+('원주문막' if '원주' in campus else '고성')+')',y,'수시' if rnd=='susi' else '정시',program,clean(v[1]),f'p.1 표1 행{ri}',admission_type='교과' if rnd=='susi' else '수능',quota=quota,applicants=val(vv[1]),competition_rate=val(vv[2]) if len(vv) in [5,7] else '',cut_other='; '.join(k+' '+val(x) for k,x in zip(labels,vv) if val(x) and k not in ['모집인원','지원인원','경쟁률']),metric='교과등급' if rnd=='susi' else '기타',basis='최초+추가합격자' if rnd=='susi' else '추가합격자(원문 정의)',grade_system='9',note='draft; 원문 80%/100%를 70%로 바꾸지 않음; 정원외 공통 모집인원은 학과별 배분하지 않음'+('； 모집군 '+clean(v[2]) if rnd=='jeongsi' else '')))
 save('kyungdong',out)
def html_grid(t):
 grid=[];occupied={}
 for i,tr in enumerate(t.find_all('tr')):
  j=0
  for cell in tr.find_all(['td','th'],recursive=False):
   while (i,j) in occupied:j+=1
   text=clean(cell.get_text(' ',strip=True));rs=int(cell.get('rowspan',1));cs=int(cell.get('colspan',1))
   for a in range(rs):
    for b in range(cs):occupied[i+a,j+b]=text
   j+=cs
  if any(a==i for a,b in occupied):grid.append([occupied.get((i,b),'') for b in range(max(b for a,b in occupied if a==i)+1)])
 return grid
def yonsei():
 out=[];raw=[]
 for y in [2024,2025,2026]:
  key=f'yonsei-{y}-adiga';s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf-8'),'html.parser')
  for ti,t in enumerate(s.select('table'),1):
   rr=html_grid(t);tx=compact(t.get_text())
   if not ('모집인원' in tx and '경쟁률' in tx and '충원합격순위' in tx and ('50%cut' in tx or '70%cut' in tx)):continue
   raw.append({'year':y,'table':ti,'rows':rr})
   # Data rows start where a recruitment count and competition ratio occur.
   data=[]
   for ri,v in enumerate(rr):
    offset=2 if v and v[0] in ['가군','나군','다군'] else 1
    if len(v)>offset+3 and re.fullmatch(r'\d+',v[offset].replace(',','')) and (re.fullmatch(r'\d+(?:\.\d+)?',v[offset+1]) or not v[offset+1]):data.append((ri,v,offset))
   if not data:continue
   header=rr[:data[0][0]];regular=any(v[0] in ['가군','나군','다군'] for _,v,_ in data)
   program=header[0][1] if not regular else '일반전형'
   for ri,v,o in data:
    unit=v[o-1];pg=program
    if regular and '강원인재' in unit:pg='강원인재(의예과)'
    cut50=v[o+3] if len(v)>o+3 else '';cut70=v[o+4] if len(v)>o+4 else ''
    if regular and y<2026:cut50='';cut70=v[o+3]
    if not regular and '대학별환산' in tx:cut50=v[o+6];cut70=v[o+7]
    if regular:pg=v[0]+' '+pg
    if regular and '디자인예술' in unit:pg=v[0]+' 디자인예술학부실기전형'
    labels=[]
    for col in range(o+3,len(v)):
     labs=[]
     for h in header:
      if col<len(h) and h[col] and h[col] not in labs:labs.append(h[col])
     labels.append('/'.join(labs)+' '+v[col])
    out.append(row(key,'연세대학교(미래)',y,'정시' if regular else '수시',pg,unit,f'HTML 표{ti} 행{ri+1}',admission_type='수능' if regular else ('교과' if '교과' in program else '종합'),quota=v[o],competition_rate=v[o+1],cut_50=val(cut50),cut_70=val(cut70),cut_other='; '.join(labels),metric='환산점수' if regular else '교과등급',basis='최종등록자',grade_system='' if regular else '9',note='draft; 충원합격순위 '+v[o+2]+'; 어디가 화면 기준학년도는 결과학년도+1; 표의 전년도 결과 기준'))
 (CACHE/'yonsei-result-tables.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2),encoding='utf-8')
 save('yonsei-mirae',out)
def cellstr(c):
 if c.value is None:return ''
 v=c.value;fmt=c.number_format
 if isinstance(v,(int,float)):
  m=re.fullmatch(r'0\.(0+)',fmt)
  if m:return f'{v:.{len(m[1])}f}'
  if fmt=='0':return f'{v:.0f}'
 return str(v)
def songho():
 out=[]
 for y in [2024,2025]:
  key=f'songho-{y}';w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  for s in w:
   headers=[clean(c.value) for c in s[1]]
   for ri,cells in enumerate(list(s.rows)[1:],2):
    v={k:cellstr(c) for k,c in zip(headers,cells) if k}
    if not v.get('모집단위') or not v.get('전형구분'):continue
    out.append(row(key,'송호대학교',y,v['모집구분'],v['전형구분'],v['모집단위'],f'{s.title} 행{ri}',quota=v.get('모집인원',''),applicants=v.get('지원인원',''),competition_rate=v.get('경쟁률',''),cut_other='; '.join(k+' '+x for k,x in v.items() if k.startswith('최초') and x),metric='기타',basis='원문 최초합격자/최초충원합격자; 전형별 단위 확인 필요',note='draft; 숫자는 엑셀 표시 형식 유지; 0도 원문대로 보존; 2025 수시2차 모집인원은 J열 제공값'))
 save('songho',out)
def gyu():
 out=[]
 for y in [2024,2025,2026]:
  key=f'gyu-{y}';w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  for si,s in enumerate(w):
   vals=[[cellstr(c) for c in r] for r in s.rows];outside=si==2;current_round=''
   for ri,v in enumerate(vals):
    if outside and v[0] and ('수시' in v[0] or '정시' in v[0]):current_round=v[0]
    if not v[1] or v[1] in ['학 과','모집단위'] or not any(re.search(r'\d',x) for x in v[2:]):continue
    if not re.search('과|학부|계열|전공',v[1]):continue
    nextrow=vals[ri+1] if ri+1<len(vals) else ['']*len(v)
    for gi,st in enumerate([2,5,8,11] if outside else [3,6,9]):
     vv=v[st:st+3];stat=nextrow[st]
     if not any(val(x) for x in vv) and not stat:continue
     if outside:program=['전문대졸이상','농어촌','성인지원자','기초생활(차상위)'][gi];rnd=current_round
     elif si==0:program='일반전형';rnd=['수시1차','수시2차','정시'][gi]
     else:program='일반고교/특별전형' if gi<2 else ('지역인재/고른기회(원문 병기)' if y==2024 else '지역인재');rnd=['수시1차','수시2차','수시1차'][gi]
     quota=re.search(r'모집\s*([^/]+)',stat);apps=re.search(r'지원\s*([^/]+)',stat)
     metric='기타' if (outside and gi==0) or rnd=='정시' else '교과등급'
     out.append(row(key,'강릉영동대학교',y,rnd,program,clean(v[1]),f'{s.title} 행{ri+1}~{ri+2} 열{st+1}~{st+3}',admission_type='기타' if metric=='기타' else '교과',quota=quota[1] if quota else '',applicants=apps[1] if apps else '',cut_other='; '.join(label+' '+val(x) for label,x in zip(['최초합격자 최고','최초합격자 최저','충원합격자 최저'],vv) if val(x)),metric=metric,basis='최초합격자/충원합격자',grade_system='9' if metric=='교과등급' else '',note='draft; '+stat+'; '+(v[12] if len(v)>12 and not outside else '')+'; 충원순위는 충원인원으로 변환하지 않음'))
 save('gangneung-yeongdong',out)
def halla():
 out=[];programs=['교과중심','면접중심','지역인재','운곡인재']
 for y in [2024,2025,2026]:
  key=f'halla-{y}'
  if y==2026:rr=json.loads((CACHE/'halla-2026-transcription.json').read_text(encoding='utf-8'))['rows']
  else:
   rr=[]
   for t in tables(key)[0]['tables']:
    for v in t['rows']:
     if len(v)>=5 and v[0] and re.search('과|학부',v[0]) and re.fullmatch(r'\d\.\d+',clean(v[1])):rr.append(v[:5])
  for ri,v in enumerate(rr,1):
   for i,pg in enumerate(programs):
    out.append(row(key,'한라대학교',y,'수시',pg,clean(v[0]),f'p.1 모집단위행{ri}',admission_type='종합' if i==3 else '교과',cut_other='최종등록자 75%컷 '+val(v[i+1]) if val(v[i+1]) else '',metric='교과등급',basis='최종등록자 75%컷',grade_system='9',note='draft; '+('원문 - (수치 없음)' if not val(v[i+1]) else '')+('; 이미지 원본 육안 전사' if y==2026 else '')))
 save('halla',out)
def hsc():
 out=[]
 for y in [2024,2025,2026]:
  key=f'hsc-{y}'
  for p in tables(key):
   title=clean(p['text'].split('입시결과')[0]);m=re.search(r'학년도\s+(수시1차|수시2차|수시모집|정시모집)\s+(.+)',title)
   if not m:continue
   rnd=m[1].replace('모집','');pg=m[2];outside='정원 외' in pg
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];start=next(i for i,x in enumerate(rr[1]) if x and '모집' in compact(x)) if not outside else next(i for i,x in enumerate(rr[0]) if x and '전형' in x)
    heads=3 if outside else (4 if '정시' in rnd else 2)
    groups=[(start,len(rr[0]),pg)]
    if outside:
     gs=[i for i,x in enumerate(rr[0]) if i>=start and x]
     groups=[(st,gs[j+1] if j+1<len(gs) else len(rr[0]),clean(rr[0][st])) for j,st in enumerate(gs)]
    parent='';previous=[]
    for ri,v in enumerate(rr[heads:],heads+1):
     names=v[1:start]
     if any(x for x in names) and not any(val(x) for x in v[start:]) and previous:
      child=' '.join(compact(x) for x in names if x)
      for r in previous:r['recruit_unit']+=' / '+child;r['note']+='; 모집결과가 병합된 복수전공을 한 모집단위로 보존'
      continue
     if any(x for x in names):
      if names[0]:parent=compact(names[0])
      unit=parent+' '.join(compact(x) for x in names[1:] if x)
      previous=[]
     else:
      # A second row underneath a department holds CSAT grades below percentiles.
      for r in previous:
       r['cut_other']+='; 보조행(수능등급) '+ ' / '.join(f'열{i+1}={clean(x)}' for i,x in enumerate(v) if x)
      continue
     if not unit or unit in ['합계','계']:continue
     for st,en,program in groups:
      vv=v[st:en]
      if not any(val(x) for x in vv):continue
      labels=['모집인원','지원인원','경쟁률','후보합격자수 전년','후보합격자수 2년평균']
      degree='전문대' in program
      if outside:
       labels+=['최초합격점수' if degree else '최초합격등급','최종합격점수' if degree else '최종합격등급','등록자평균'] if len(vv)==8 else ['최종합격점수' if degree else '최종합격등급','등록자평균']
      elif '정시' in rnd:labels+=['최종합격자 수능백분위','최종합격자 학생부등급','등록자평균 수능백분위','등록자평균 학생부등급','2년평균 수능백분위','2년평균 학생부등급']
      else:labels+=['최종합격등급','등록자평균','등록자2년평균']
      assert len(labels)==len(vv),(key,p['page'],len(labels),len(vv))
      r=row(key,'한림성심대학교',y,rnd,program,unit,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type='수능' if '수능위주' in program else ('기타' if degree else '교과'),quota=val(vv[0]),applicants=val(vv[1]),competition_rate=val(vv[2]),cut_other='; '.join(l+' '+val(x) for l,x in zip(labels[3:],vv[3:]) if val(x)),metric='기타' if degree or '정시' in rnd else '교과등급',basis='원문 최종합격자 / 등록자; 2년평균은 단일연도 값으로 쓰지 않음',grade_system='9' if not degree and '정시' not in rnd else '',note='draft; 원문 0·- 구분; 후보합격자수 전년·2년평균을 그대로 보존')
      out.append(r);previous.append(r)
 save('hallym-sungsim',out)
def cnue():
 out=[]
 for y in [2024,2025,2026]:
  key=f'cnue-{y}';records={}
  for p in tables(key):
   for ti,t in enumerate(p['tables']):
    if y<2026 and (p['page']>3 or (p['page']==3 and (y==2024 or ti>0))):continue
    if y==2026 and (p['page']>3 or (p['page']==3 and ti>1)):continue
    rnd='수시' if p['page']==1 or (p['page']==2 and ti<2) else '정시'
    rr=t['rows'];kind='';heads=1
    if p['page']==1 and ti==0:kind='경쟁률';heads=1 if y==2026 else 2
    elif p['page']==1 and ti==1:kind='서류평가';heads=2
    elif p['page']==1 and ti==2:kind='학생부등급';heads=2
    elif p['page']==2 and ti==0:kind='최저학력기준' if y==2026 else '수능등급';heads=1 if y==2026 else 2
    elif p['page']==2 and ti==1:kind='등록통계'
    elif p['page']==2 and ti==2:kind='경쟁률';heads=1 if y==2026 else 2
    elif p['page']==2 and ti==3:kind='수능성적';heads=2
    elif p['page']==3 and ti==0:kind='수능등급' if y==2026 else '등록통계';heads=2 if y==2026 else 1
    elif p['page']==3 and ti==1:kind='등록통계'
    if not kind:continue
    prev=''
    for ri,v0 in enumerate(rr[heads:],heads+1):
     v=[clean(x) for x in v0]
     if not any(v):continue
     if v[0] in ['계','합계','구분']:continue
     if not v[0]:
      if not prev:continue
      pg=prev;v.pop(0)
     else:pg=v.pop(0);prev=pg
     rk=(rnd,pg)
     if rk not in records:records[rk]=row(key,'춘천교육대학교',y,rnd,pg,'초등교육학과',f'p.{p["page"]}',admission_type='종합' if rnd=='수시' else '수능',metric='교과등급' if rnd=='수시' else '기타',basis='최초합격/최종등록 등 원문 지표별 기준',grade_system='9' if rnd=='수시' else '')
     r=records[rk];r['source_page']+=f'; p.{p["page"]} 표{ti+1} 행{ri}'
     if kind=='경쟁률':
      if y==2026:r.update(quota=v[0],applicants=v[1],competition_rate=v[2])
      elif rnd=='수시':r.update(quota=v[0],applicants=v[3],competition_rate=v[4])
      else:r.update(quota=v[2],applicants=v[5],competition_rate=v[6])
     if kind in ['서류평가','학생부등급','수능등급','수능성적']:
      prefix=''
      if kind=='수능성적' and y<2026:prefix=('표준점수 ' if clean(v0[0]) else '등급 ');v.pop(0)
      elif v and ('표준' in v[0] or v[0]=='등급'):prefix=v.pop(0)+' '
      labels=(['원서접수 최고','원서접수 평균','원서접수 최저'] if len(v)==9 else [])+['최초합격 최고','최초합격 평균','최초합격 최저','최종등록 최고','최종등록 평균','최종등록 최저']
      r['cut_other']+='; '+kind+' '+prefix+' / '.join(l+' '+x for l,x in zip(labels,v))
     else:
      labels=[clean(x) for x in rr[0] if clean(x)][1:]
      if kind=='경쟁률' and y<2026:labels=(['모집인원','지원남','지원여','지원계','당해경쟁률','전년경쟁률'] if rnd=='수시' else ['당초모집','이월','최종모집','지원남','지원여','지원계','당해경쟁률','전년경쟁률'])
      if kind=='등록통계' and y<2026 and len(v)>=6:r['fill_count']=val(v[5])
      r['note']+='; '+kind+' '+ ' / '.join(f'{labels[i] if i<len(labels) else "항목"+str(i+1)}={x}' for i,x in enumerate(v))
  out+=list(records.values())
 save('chuncheon-education',out)
def sangji():
 out=[]
 keys=['sangji-2024-'+x for x in ['gyogwa','jonghap','silgi','jeongsi','jeongsi-silgi']]+['sangji-2025-susi-'+str(i) for i in range(3)]+['sangji-2025-jeongsi-'+str(i) for i in range(2)]+['sangji-2026-susi','sangji-2026-jeongsi']
 for key in keys:
  y=int(key.split('-')[1]);rnd='정시' if 'jeongsi' in key else '수시';records={};pg='';sub=''
  for p in tables(key):
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];cols=len(rr[0])
    if cols not in [10,16] or compact(rr[0][0])!='모집단위명':continue
    pg=title_before(key,p['page'],t['bbox'],r'^\s*\d+\.\s*(.+)$') or pg
    if y>=2025:sub=title_before(key,p['page'],t['bbox'],r'^\s*[가나다라마바사아자차카타파하]\.\s*(.+)$') or sub
    typ='종합' if '종합' in pg else ('실기' if '실기' in pg or '특기자' in pg else ('수능' if '수능' in pg else '교과'))
    iscounts=cols==10 and '모집인원' in clean(rr[1][1]);heads=2 if iscounts else 3
    prev=''
    for ri,v in enumerate(rr[heads:],heads+1):
     unit=clean(v[0])
     if not unit:continue
     if unit in ['합계','계'] or not any(val(x) for x in v[1:]):continue
     if re.search('해당사항 없음|전형 신설',clean(v[1])) and not any(re.search(r'\d',clean(x)) for x in v[1:5]):continue
     rk=(pg,unit)
     if rk not in records:records[rk]=row(key,'상지대학교',y,rnd,pg,unit,f'p.{p["page"]}',admission_type=typ,metric='기타',basis='원문 각 지표의 최초합격자/최종등록자 구분 참조',note='draft; 예비번호를 충원인원으로 변환하지 않음')
     r=records[rk];r['source_page']+=f'; p.{p["page"]} 표{ti+1} 행{ri}'
     if cols==16:
      r.update(quota=val(v[1]),applicants=val(v[2]),competition_rate=val(v[3]))
      r['note']+='; 충원합격 예비번호 '+clean(v[5])+'; '+clean(v[15])
      r['cut_other']+='; '+' / '.join(label+' '+val(v[idx]) for idx,label in [(7,'최초합격자 평균'),(8,'최초합격자 100%컷'),(11,'최종등록자 평균'),(12,'최종등록자 100%컷')] if val(v[idx]))
      if 'gyogwa' in key:r.update(metric='교과등급',grade_system='9')
     elif iscounts:
      r.update(quota=val(v[1]),applicants=val(v[2]),competition_rate=val(v[3]));r['note']+='; 충원합격 예비번호 '+clean(v[4])+'; '+clean(v[9])
     else:
      r['cut_other']+='; '+sub+': '+' / '.join(label+' '+val(x) for label,x in zip(['최초합격자 50%','최초합격자 70%','최종등록자 50%','최종등록자 70%'],v[1:5]) if val(x))
      r['note']+='; '+clean(v[9])
      if ('교과' in sub and '등급' in sub and (rnd=='수시' or typ=='교과')) or ('수능' in sub and typ=='수능'):
       r.update(cut_50=val(v[3]),cut_70=val(v[4]),metric='교과등급' if '교과' in sub else ('백분위' if '백분위' in sub else '기타'),grade_system='9' if '교과' in sub else '',basis='최종등록자(신입생) '+sub)
  out+=list(records.values())
 save('sangji',out)
if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf-8')
 for name in sys.argv[1:]:globals()[name]()
