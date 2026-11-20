"""Official university source normalization. No inferred cutoff values."""
from pathlib import Path
import csv,json,re,sys
import fitz,openpyxl
ROOT=Path(__file__).parent; CACHE=ROOT/'gyeonggi-expansion'
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
def dankook():
 out=[]
 for y in [2024,2025,2026]:
  for rnd in ['susi','jeongsi']:
   key=f'dankook-{y}-{rnd}'
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     for ri,v in enumerate(t['rows']):
      o=5 if y==2024 else 4
      if len(v)<13 or not num(v[o]) or not v[3]:continue
      pg=clean(v[1]);typ=('실기' if '실기' in pg else '수능') if rnd=='jeongsi' else ('논술' if '논술' in pg else ('실기' if '실기' in pg or '체육' in pg else ('교과' if '지역균형' in pg else '종합')))
      labels=['등록인원','등록률','최종등록자 '+('학생부등급' if rnd=='susi' else '수능백분위')+' 최저','최종등록자 평균','최종등록자 최고']+(['논술고사 평균점수'] if rnd=='susi' else [])+['예비후보순위']
      out.append(row(key,'단국대학교(죽전)',y,'수시' if rnd=='susi' else '정시',pg,v[3],f'p.{p["page"]} 표{ti+1} 행{ri+1}',admission_type=typ,quota=val(v[o]),applicants=val(v[o+1]),competition_rate=val(v[o+2]),cut_other=pairs(labels,v[o+3:]),metric='교과등급' if rnd=='susi' else '백분위',basis='최종등록자',grade_system='9' if rnd=='susi' else '',note='draft; '+pairs(['정원구분','계열'],[v[0],v[2]])+('; 2025학년도 모집계획 열은 결과에서 제외; 원문의 개편 모집단위명 유지' if y==2024 else '')))
 save('dankook',out)
def gachon():
 out=[]
 for y in [2024,2025,2026]:
  key=f'gachon-{y}-susi';w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  for s in w:
   for ri,cs in enumerate(s.rows,1):
    v=[clean(c.value) for c in cs]
    if v[0]!='수시' or not num(v[3]):continue
    pg=v[1];typ='실기' if '실기' in pg or '특기' in pg else ('논술' if '논술' in pg else ('교과' if pg in ['학생부우수자','지역균형','농어촌(교과)','학생부교과'] or '교과' in pg else '종합'))
    special=y==2026 and ri>300
    labels=(['통합산출 학생부50%','통합산출 학생부70%','통합산출 학생부90%','일반선택과목 학생부50%','일반선택과목 학생부70%','일반선택과목 학생부90%','최종등록자 예비순위'] if special else (['학생부등급50%'] if y==2026 else [])+['학생부등급70%','학생부등급90%','논술'+('정답수(15문항)' if y==2024 else '점수(150점만점)')+'70%','논술90%','최종등록자 예비순위'])
    out.append(row(key,'가천대학교',y,'수시',pg,v[2],f'{s.title} 행{ri}',admission_type=typ,quota=v[3],competition_rate=v[4],cut_50=val(v[5]) if y==2026 else '',cut_70=val(v[6] if y==2026 else v[5]),cut_other=pairs(labels,v[5:]),metric='교과등급',basis='최종등록자'+('; 일반선택+진로선택 통합산출' if special else ''),grade_system='9',note='draft; 학생부 등급은 원본의 학년도별 산출방법 적용; 캠퍼스는 모집단위별 원본에 별도 명시되지 않음'))
  key=f'gachon-{y}-jeongsi';f=CACHE/(key+'.sheets.json')
  if not f.exists():continue
  for s in json.loads(f.read_text(encoding='utf8')):
   for ri,v in enumerate(s['rows'],1):
    if len(v)<7 or not num(v[3]) or not v[1]:continue
    if y==2026:
     metric='표준점수' if v[1]=='일반2' else '백분위'
     out.append(row(key,'가천대학교',y,'정시',clean(v[0])+' '+clean(v[1]),v[2],f'{s["name"]} 행{ri}',admission_type='수능',quota=clean(v[3]),competition_rate=clean(v[4]),cut_50=val(v[5]),cut_70=val(v[6]),cut_other=pairs([metric+'90%','최종 예비번호'],v[7:]),metric=metric,basis='최종등록자',note='draft; 일반2는 원본 안내에 따라 표준점수(영어 변환표준점수); 수시 이월 선발모집단위 원본에서 제외'))
    else:
     out.append(row(key,'가천대학교',y,'정시',clean(v[2])+' '+clean(v[0]),v[1],f'{s["name"]} 행{ri}',admission_type='수능',quota=clean(v[3]),competition_rate=clean(v[4]),cut_70=val(v[5]),cut_other=pairs(['최종 예비번호'],v[6:]),metric='백분위',basis='최종등록자',note='draft; 원본 수능성적 70% 컷; 해당 학년도 가산점 및 반영방법은 원본 참고'))
 medical={'의예과','약학과','간호학과','치위생학과','응급구조학과','물리치료학과','방사선학과','바이오로직스학과'}
 excluded=[r for r in out if r['recruit_unit'] in medical]
 with (CACHE/'gachon-medical-out-of-scope.csv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,FIELDS);w.writeheader();w.writerows(excluded)
 out=[r for r in out if r['recruit_unit'] not in medical]
 for r in out:r['note']+='; 경기 글로벌캠퍼스 모집단위, 인천 메디컬캠퍼스 8개 모집단위 제외(공식 모집요강 캠퍼스표)'
 save('gachon',out)
def kangnam():
 from bs4 import BeautifulSoup
 out=[]
 for f in sorted(CACHE.glob('kangnam-20*.html')):
  key=f.stem;parts=key.split('-');y=int(parts[1]);rnd=parts[2]
  if len(parts)!=4:continue
  soup=BeautifulSoup(f.read_text(encoding='utf8'),'html.parser')
  for ti,t in enumerate(soup.select('table'),1):
   rr=[[clean(c.get_text(' ',strip=True)) for c in tr.find_all(['th','td'])] for tr in t.select('tr')]
   if not rr or '모집단위' not in rr[0]:continue
   for ri,v in enumerate(rr[1:],2):
    if len(v)<8 or not num(v[3]):continue
    out.append(row(key,'강남대학교',y,'수시' if rnd=='susi' else '정시',v[0],v[2],f'HTML 표{ti} 행{ri}',admission_type='논술' if '논술' in v[1] else ('종합' if '종합' in v[1] else ('실기' if '실기' in v[1] else ('수능' if rnd=='jungsi' else '교과'))),quota=v[3],competition_rate=v[4],cut_other=pairs(rr[0][5:],v[5:]),metric='교과등급' if rnd=='susi' else '환산점수',basis='최초평균·최종등록컷(80%) 원문 구분',grade_system='9' if rnd=='susi' else ''))
 save('kangnam',out)
def hansei():
 out=[]
 for y in [2024,2025,2026]:
  for rnd in ['susi','jeongsi']:
   key=f'hansei-{y}-{rnd}';pg='';gun=''
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows']
     if len(rr[0]) not in [11,12]:continue
     o=1 if len(rr[0])==12 else 0
     for ri,v in enumerate(rr):
      if not num(v[o+3]):continue
      if o and v[0]:gun=clean(v[0])
      if v[o]:pg=clean(v[o])
      if not v[o+1] or compact(v[o+1]) in ['계','합계']:continue
      shared=(v[o+2] is None) or (ri+1<len(rr) and rr[ri+1][o+2] is None and num(rr[ri+1][o+3]))
      note='draft; 모집인원·경쟁률이 여러 모집단위에 걸친 공통 셀인 경우 학과별 값은 공란'
      if shared and v[o+2] is not None:note+='; 공통모집인원 '+clean(v[o+2])+'; 공통경쟁률 '+clean(v[o+4])
      out.append(row(key,'한세대학교',y,'수시' if rnd=='susi' else '정시',(gun+' ' if gun else '')+pg,v[o+1],f'p.{p["page"]} 표{ti+1} 행{ri+1}',admission_type='수능' if rnd=='jeongsi' else ('실기' if '실기' in pg else '교과'),quota='' if shared else val(v[o+2]),applicants=val(v[o+3]),competition_rate='' if shared else val(v[o+4]),cut_other=pairs(['최초합격자 최고','최초합격자 평균','최초합격자 최저','최종등록자 최고','최종등록자 평균','최종등록자 최저'],v[o+5:]),metric='백분위' if rnd=='jeongsi' else '교과등급',basis='최초합격자·최종등록자',grade_system='' if rnd=='jeongsi' else '9',note=note))
   key+='-2'
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows']
     if len(rr)<3:continue
     for j in range(1,len(rr[0]),3):
      pg=clean(rr[0][j])
      if not pg:continue
      for ri,v in enumerate(rr[2:],3):
       if j+2>=len(v) or not v[0] or not any(val(x) for x in v[j:j+3]):continue
       if compact(v[0]) in ['계','합계','총계']:continue
       out.append(row(key,'한세대학교',y,'수시' if rnd=='susi' else '정시',pg,v[0],f'p.{p["page"]} 표{ti+1} 행{ri}',quota=val(v[j]),cut_other=pairs(['예비순위','충원합격율(원문)'],v[j+1:j+3]),metric='기타',basis='별도 충원현황표',note='draft; 예비순위 기반 원문 충원합격율; 인원으로 환산하지 않음; 성적표와 모집단위가 다른 별도 공시표'))
 save('hansei',out)
def anyang():
 out=[]
 for y in [2024,2025,2026]:
  for rnd in ['susi','jeongsi']:
   key=f'anyang-{y}-{rnd}-original'
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows'];camp=''
     if '추합인원' not in ''.join(clean(x) for x in rr[0]) or len(rr[0]) not in [8,10]:continue
     pg=clean(t['before'].split('◉')[-1]);pg=pg.replace('학생부종합Ⅰ','학생부종합1').replace('학생부종합Ⅱ','학생부종합2')
     for ri,v in enumerate(rr[1:],2):
      if v[0]:camp=compact(v[0])
      if camp not in ['안양','안양캠퍼스'] or not num(v[2]):continue
      out.append(row(key,'안양대학교(안양)',y,'수시' if rnd=='susi' else '정시',pg,v[1],f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type='실기' if '실기' in pg else ('수능' if rnd=='jeongsi' else ('종합' if '종합' in pg else '교과')),quota=val(v[2]),competition_rate=val(v[3]),fill_count=val(v[-2]),fill_rate=val(v[-1]),cut_other=pairs(['대학반영 평균','대학반영 최저']+(['국영수사과 평균','국영수사과 최저'] if len(v)==10 else []),v[4:-2]),metric='백분위' if rnd=='jeongsi' else '교과등급',basis='최종등록자',grade_system='' if rnd=='jeongsi' else '9',note='draft; 경기도 안양캠퍼스; 인천 강화캠퍼스 제외'))
 save('anyang',out)
def sungkyul():
 out=[]
 for y in [2024,2025,2026]:
  for rnd in ['susi','jeongsi']:
   key=f'sungkyul-{y}-{rnd}-original'
   if y==2024 and rnd=='jeongsi':key='sungkyul-2024-jeongsi'
   if not (CACHE/(key+'.pdf')).exists():continue
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows']
     if key=='sungkyul-2025-jeongsi-original':rr=[[ ''.join(chr(ord(c)+0x912a) if 0xac00-0x912a<=ord(c)<=0xd7a3-0x912a else c for c in x) if isinstance(x,str) else x for x in v] for v in rr]
     h=[compact(x) for x in rr[0]]
     if '모집단위명' not in h or '전형명' not in h:continue
     q=next((i for i,x in enumerate(h) if x.startswith('모집인원')),None)
     if q is None:continue
     u=h.index('모집단위명');pgcol=h.index('전형명');n=1 if rnd=='susi' else 2;prev={}
     for ri,v in enumerate(rr[n:],n+1):
      for j in range(pgcol+1):
       if v[j] is not None:prev[j]=v[j]
      if not num(v[q]) or not v[u]:continue
      pg=clean(prev.get(pgcol,''));pg=(clean(prev.get(0,''))+' ' if rnd=='jeongsi' else '')+pg
      cutidx=q+3;scoreidx=q+4
      out.append(row(key,'성결대학교',y,'수시' if rnd=='susi' else '정시',pg,v[u],f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type='실기' if '실기' in pg or '특기' in pg else ('수능' if rnd=='jeongsi' else ('종합' if '종합' in pg else '교과')),quota=val(v[q]),applicants=val(v[q+1]),competition_rate=val(v[q+2]),cut_70=val(v[scoreidx]) if '70%' in clean(v[cutidx]) else '',cut_other=pairs(['기준Cut','성적','예비순위'],v[cutidx:])+('; '+pairs(['정시최초모집인원','수시이월인원'],v[3:5]) if rnd=='jeongsi' else ''),metric='백분위' if rnd=='jeongsi' else '교과등급',basis='최종합격자',grade_system='' if rnd=='jeongsi' else '9'))
 save('sungkyul',out)
def suwon():
 out=[]
 for y in [2024,2025,2026]:
  for rnd in ['susi','jeongsi']:
   key=f'suwon-{y}-{rnd}'
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows'];h=[compact(x) for x in rr[0]]
     if len(h) not in [6,7] or not any(x in ['모집단위','학부/학과'] for x in h):continue
     pg=clean(t['before'].split('■')[-1]);scores=['','']
     for ri,v in enumerate(rr[2:],3):
      if not num(v[2]) or not v[1]:continue
      for j in range(len(v)-5):
       if v[j+5] is not None:scores[j]=v[j+5]
      out.append(row(key,'수원대학교',y,'수시' if rnd=='susi' else '정시',pg,v[1],f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type='논술' if '논술' in pg else ('실기' if '실기' in pg else ('수능' if rnd=='jeongsi' else '교과')),quota=val(v[2]),applicants=val(v[3]),competition_rate=val(v[4]),cut_other=pairs(['학생부등급 평균'] if rnd=='susi' else ['환산점수 평균','수능등급 평균'],scores),metric='교과등급' if rnd=='susi' else '환산점수',basis='최종합격자',grade_system='9' if rnd=='susi' else '',note='draft; 원본 병합 성적 셀은 해당 모집단위에 공통 적용; 전형별 환산점수 만점 상이'))
 save('suwon',out)
def ajou():
 key='ajou-2026-susi';d=fitz.open(CACHE/(key+'.pdf'));out=[];audit=[]
 for pi in range(13,52):
  p=d[pi];lines=[]
  for b in p.get_text('dict')['blocks']:
   for l in b.get('lines',[]):
    if abs(l['dir'][0]-1)>0.01 or abs(l['dir'][1])>0.01:continue
    tx=clean(''.join(s['text'] for s in l['spans']));lines.append((l['bbox'],tx))
  unit=next((tx for bb,tx in lines if 65<bb[1]<85 and bb[0]<100),'')
  if not unit:continue
  for bb,rd in lines:
   if rd not in ['수시','정시'] or bb[0]>75:continue
   ymid=(bb[1]+bb[3])/2
   rline=sorted([(b,t) for b,t in lines if abs((b[1]+b[3])/2-ymid)<2 and b[0]>=68],key=lambda a:a[0][0])
   pg=' '.join(t for b,t in rline if b[0]<146 and t not in ['수시','정시'])
   vals=[z for b,t in rline if b[0]>=146 for z in t.split()]
   if not vals or any('%' in x for x in vals[:3]):continue # separate high-school-type distribution
   joined=' '.join(vals)
   joined=re.sub(r'지원자\s*내신\(([^)]+)\)',r'지원자내신(\1) - -',joined)
   vals=joined.split()
   if len(vals)!=18:
    audit.append([pi+1,unit,pg,len(vals),vals]);continue
   for idx,y in enumerate([2026,2025,2024]):
    v=vals[idx*6:idx*6+6]
    if not num(v[0]):continue
    typ='종합' if '종합' in pg else ('교과' if '교과' in pg else ('논술' if '논술' in pg else '수능'))
    labels=['최종등록자 학생부등급 최고','최종등록자 학생부등급 평균','최종등록자 학생부등급 최저'] if typ=='종합' else [('논술점수' if typ=='논술' else '환산점수')+'70%','백분위70%' if rd=='정시' else '학생부등급70%','수능최저충족률']
    if '지원자내신' in v[3]:labels[0]='성적 비공개 소수모집단위'
    out.append(row(key,'아주대학교',y,rd,pg,unit,f'p.{pi+1} y={ymid:.1f}',admission_type=typ,quota=v[0],competition_rate=v[1],fill_count=val(v[2]),cut_70=val(v[4]) if typ!='종합' else '',cut_other=pairs(labels,v[3:]),metric='백분위' if rd=='정시' else '교과등급',basis='최종등록자; 원문 소수 모집단위 공개기준 참조',grade_system='' if rd=='정시' else '9',note='draft; 2024~2026 공식 통합자료 학과별 표; 모집단위·전형 명칭은 원문 개편 비교표 기준; 원문 수시 종합 2명 이하 모집 시 지원자 최고·최저 표기'))
 (CACHE/'ajou-parse-review.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8')
 print('ajou review',len(audit));save('ajou',out)
def hknu():
 out=[]
 for f in sorted(CACHE.glob('hknu-20*.pdf')):
  key=f.stem;y=int(key.split('-')[1]);rnd=key.split('-')[2]
  for p in tables(key):
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];camp='';unitcol=1 if compact(rr[0][0])=='캠퍼스' else 0
    if len(rr)<3:continue
    # Three original summary-only reports have no department quota columns.
    if compact(rr[0][unitcol]) not in ['모집단위','모집단위명']:continue
    q=next((i for i,x in enumerate(rr[0]) if compact(x)=='모집인원'),None)
    if q is None and (y==2024 and key=='hknu-2024-susi' or y==2026 and key=='hknu-2026-susi-2'):
     n=3 if y==2024 else 2
     for ri,v in enumerate(rr[n:],n+1):
      if v[0]:camp=compact(v[0])
      if not v[1] or '계'==compact(v[1]):continue
      for j in (range(2,12,2) if y==2024 else range(2,5)):
       if not num(v[j]):continue
       pg=compact(rr[1 if y==2024 else 0][j])
       out.append(row(key,'한경국립대학교'+('('+camp+')' if camp in ['안성','평택'] else ''),y,'수시',pg,v[1],f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type='교과',cut_other=pairs(['학생부등급 평균','표준편차'],v[j:j+(2 if y==2024 else 1)]),metric='교과등급',basis='원문 기준',grade_system='9'))
     continue
    if q is None and key=='hknu-2025-susi':continue # whole-track totals only; not department results
    title=p['text'][:230]
    if '특수교육' in title:pg='특수교육대상자(학생부교과)'
    elif '잠재력' in title or '학생부 종합' in title:pg='잠재력우수자(학생부종합)'
    elif rnd=='jeongsi':pg='일반전형(수능)'
    elif key=='hknu-2026-susi':pg='지역균형' if ti==0 else '사회통합'
    else:pg='일반전형(학생부교과)'
    n=3 if rnd=='jeongsi' else 2;labs=header_labels(rr,n)
    for ri,v in enumerate(rr[n:],n+1):
     if unitcol and v[0]:camp=compact(v[0])
     unit=compact(v[unitcol])
     if not unit or unit in ['소계','계','합계','총계']:continue
     if q is not None and not num(v[q]):continue
     if q is None and not any(num(x) for x in v[unitcol+1:]):continue
     opts=dict(admission_type='수능' if rnd=='jeongsi' else ('종합' if '종합' in pg else '교과'),metric='환산점수' if rnd=='jeongsi' else '교과등급',basis='최초합격자·최종등록자 원문 구분',grade_system='' if rnd=='jeongsi' else '9',cut_other=pairs(labs[q+3 if q is not None else unitcol+1:],v[q+3 if q is not None else unitcol+1:]))
     if q is not None:opts.update(quota=val(v[q]),applicants=val(v[q+1]),competition_rate=val(v[q+2]))
     out.append(row(key,'한경국립대학교'+('('+camp+')' if camp in ['안성','평택'] else ''),y,'수시' if rnd=='susi' else '정시',pg,unit,f'p.{p["page"]} 표{ti+1} 행{ri}',**opts))
 save('hknu',out)
 # The 2025 regular report uses raster table rules and selectable text.
 key='hknu-2025-jeongsi';doc=fitz.open(CACHE/(key+'.pdf'))
 for t in doc[0].find_tables(strategy='text',min_words_vertical=2,min_words_horizontal=1):
  for ri,v in enumerate(t.extract(),1):
   if len(v)!=20 or not num(v[2]) or not v[1] or compact(v[1]) in ['계','소계']:continue
   pg='일반전형(수능위주 실기)' if compact(v[1])=='스포츠과학전공' else '일반전형(수능위주)'
   labs=['등록인원','등록률','최초합격자 수능등급 평균 / 표준편차','최초합격자 백분위 평균','최초합격자 백분위 표준편차','최초합격자 총점 평균','최초합격자 총점 표준편차','최종등록자 수능등급 평균 / 표준편차','최종등록자 백분위 평균','최종등록자 백분위 표준편차','최종등록자 총점 평균','최종등록자 총점 표준편차','예비진행순위','모집배수']
   out.append(row(key,'한경국립대학교',2025,'정시',pg,v[1],f'p.1 text표 행{ri}',admission_type='수능',quota=v[2],applicants=v[3],competition_rate=v[4],cut_other=pairs(labs,v[5:19]),metric='환산점수',basis='최초합격자·최종등록자 원문 구분'))
 save('hknu',out)
def kau():
 out=[]
 for y in [2024,2025,2026]:
  for rnd in ['susi','jeongsi']:
   key=f'kau-{y}-{rnd}'
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows'];h=[compact(x) for x in rr[0]]
     if '지원인원' not in h or not any(x in ['학부(과)','모집단위'] for x in h):continue
     q=h.index('모집인원');u=h.index('학부(과)') if '학부(과)' in h else h.index('모집단위');n=3 if y==2025 and rnd=='jeongsi' else 2;labs=header_labels(rr,n)
     title=t['before'];pg='';gun=''
     typ='수능' if rnd=='jeongsi' else ('논술' if '논술' in title else ('교과' if '학생부교과' in title else '종합'))
     titlepg=re.findall(r'\(([^\n]+전형[^\n]*)\)',title)
     if titlepg:pg=clean(titlepg[-1])
     for ri,v in enumerate(rr[n:],n+1):
      if h[0]=='전형구분' and v[0]:pg=re.sub(r'\(\d+명\)','',compact(v[0]))
      if rnd=='jeongsi' and v[1]:gun=compact(v[1])+'군'
      if not num(v[q]) or not v[u] or '합계' in clean(v[u]):continue
      if not pg:raise ValueError((key,p['page'],ti,'missing program'))
      fill=next((i for i,s in enumerate(h) if s=='추가합격인원'),None)
      cut=next((i for i,s in enumerate(labs) if '70%' in s and ('내신등급' in s if rnd=='susi' else '환산점수' in s)),None)
      out.append(row(key,'한국항공대학교',y,'수시' if rnd=='susi' else '정시',(gun+' ' if gun else '')+pg,v[u],f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[q]),applicants=val(v[q+1]),competition_rate=val(v[q+2]),fill_count=val(v[fill]) if fill is not None else '',cut_70=val(v[cut]) if cut is not None else '',cut_other=pairs(labs[q+3:],v[q+3:]),metric='환산점수' if rnd=='jeongsi' or typ=='논술' else '교과등급',basis='최종등록자; 1단계 합격자 지표는 별도 표기',grade_system='9' if rnd=='susi' and typ!='논술' else ''))
 save('kau',out)
def header_labels(rr,n):
 # PDF extraction represents horizontally merged header cells with None.
 levels=[]
 for level,h in enumerate(rr[:n]):
  prev='';hh=[]
  for j,x in enumerate(h):
   # A new upper-level header starts a different column group. A None
   # beneath it is a vertical merge, not a repeat of the preceding subheader.
   if x is None and level and any(rr[k][j] is not None for k in range(level)):prev=''
   if x is not None:prev=clean(x)
   hh.append(prev)
  levels.append(hh)
 return [' / '.join(dict.fromkeys(h[j] for h in levels if j<len(h) and h[j])) for j in range(len(rr[0]))]
def tukorea():
 out=[]
 for y in [2024,2025,2026]:
  for rnd in ['susi','jeongsi']:
   key=f'tukorea-{y}-{rnd}'
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows']
     if len(rr)<3 or not any('지원현황' in clean(x) for x in rr[0]):continue
     q=next((i for i,x in enumerate(rr[1]) if compact(x)=='모집인원'),None)
     if q is None or q==0:continue
     starts=[i for i,v in enumerate(rr) if len(v)>q and num(v[q])]
     if not starts:continue
     n=starts[0];labs=header_labels(rr,n)
     titles=re.findall(r'20\d\d학년도\s*(?:수시|정시)모집\s*([^\n]+)',t['before'])
     if not titles:raise ValueError((key,p['page'],ti,'missing title'))
     pg=clean(titles[-1]);typ='논술' if '논술' in pg else ('종합' if '종합' in pg else ('교과' if '교과' in pg else '수능'))
     group='';pending_units=[]
     for ri,v in enumerate(rr[n:],n+1):
      if q>=2 and v[0]:group=compact(v[0])
      if not num(v[q]):continue
      unit=next((compact(x) for x in reversed(v[:q]) if x),'') or group
      names=str(v[q-1] or '').splitlines()
      if len(names)>1 and all(x.endswith('전공') for x in names):pending_units=names
      if pending_units and (len(names)>1 or v[q-1] is None):unit=pending_units.pop(0)
      if re.search('합계|소계|총계',unit):continue
      out.append(row(key,'한국공학대학교',y,'수시' if rnd=='susi' else '정시',pg,unit,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[q]),applicants=val(v[q+1]),competition_rate=val(v[q+2]),cut_other=pairs(labs[q+3:],v[q+3:]),metric='환산점수' if typ=='수능' else '교과등급',basis='최종등록자',grade_system='' if typ=='수능' else '9',note='draft; '+('학부 '+group+'; ' if q==2 else '')+'예비번호는 충원인원으로 변환하지 않음; 미공개 성적은 원문 상태 유지'))
 save('tukorea',out)
def hs():
 out=[]
 for y in [2024,2025,2026]:
  for rnd in ['susi','jeongsi']:
   key=f'hs-{y}-{rnd}'
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows'];q=next((i for i,x in enumerate(rr[0]) if compact(x)=='모집인원'),None)
     if q is None:continue
     title=re.findall(r'^\s*([^\n]*전형[^\n]*)$',t['before'],re.M)
     pg=clean(title[-1]) if title else ('수능(일반학생) 전형' if rnd=='jeongsi' else '')
     if not pg:raise ValueError((key,p['page'],ti,'missing title'))
     group='';labs=[clean(x) for x in rr[0]]
     for ri,v in enumerate(rr[1:],1):
      if q==2 and v[0]:group=compact(v[0])
      if not num(v[q]):continue
      unit=compact(v[q-1]) or group
      if compact(unit) in ['계','합계','소계','총계']:continue
      children=[]
      for nv in rr[ri+1:]:
       if nv[q] is not None or (nv[0] is not None and compact(nv[0])!=group):break
       if q==2 and nv[1]:children.append(compact(nv[1]))
      if children:unit=group+'('+', '.join([unit]+children)+')'
      essay='논술고사' in pg
      labels=['국어 정답수','수학 정답수','전체 정답수','구분'] if essay else ['최종예비순위','최고','평균','최저']
      out.append(row(key,'한신대학교',y,'수시' if rnd=='susi' else '정시',pg,unit,f'p.{p["page"]} 표{ti+1} 행{ri+1}',admission_type='수능' if rnd=='jeongsi' else ('논술' if '논술' in pg else ('종합' if '참인재' in pg else ('실기' if '실기' in pg else '교과'))),quota=val(v[q]),applicants=val(v[q+1]),competition_rate=val(v[q+2]),cut_other=pairs(labels,v[q+3:]),metric='기타' if essay else ('백분위' if rnd=='jeongsi' else '교과등급'),basis='최종합격자' if '최종합격자' in p['text'] else '원문 기준',grade_system='' if rnd=='jeongsi' or essay else '9',note='draft; 원문 학제개편 반영 명칭 유지; 공동 모집단위는 성적·인원을 학과별 분배하지 않음'))
 save('hs',out)
if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8')
 for name in sys.argv[1:]:globals()[name]()
