from normalize_chungcheong import *

def cnu():
 out=[]
 for key,rd in [('cnu-scan06-15','수시'),('cnu-scan06-18','정시')]:
  pgsub=''
  for p in tables(key):
   m=re.search(r'(학생부(?:교과|종합)전형\[[^\]]+\]|수능위주전형\[[^\]]+\]|실기/실적전형)',compact(p['text']))
   pg=m.group(0) if m else '수능위주전형[기타]'
   typ='실기' if '실기/실적' in pg else ('종합' if '종합' in pg else ('수능' if rd=='정시' else '교과'))
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];n=len(rr[0]);off=1 if n in [32,29,27,16] else 0
    if key=='cnu-scan06-15' and p['page'] in [5,8,23]:
     # The publisher overpainted an older table. Extract only text drawn after the final opaque white panel.
     doc=fitz.open(CACHE/(key+'.pdf'));page=doc[p['page']-1];pt=list(page.find_tables())[0]
     cover=max(z['seqno'] for z in page.get_drawings() if z.get('fill')==(1.0,1.0,1.0) and z['rect'].width>page.rect.width*.8 and z['rect'].height>page.rect.height*.5)
     spans=[z for z in page.get_texttrace() if z['seqno']>cover];bounds=pt.rows[2].cells;uc=18 if off else 17;ub=bounds[uc];fixed=[]
     anchors=[z for z in spans if z['bbox'][1]>194 and ub[0]<=(z['bbox'][0]+z['bbox'][2])/2<ub[2]]
     for anchor in sorted(anchors,key=lambda z:z['bbox'][1]):
      yy=(anchor['bbox'][1]+anchor['bbox'][3])/2;line=[]
      for b in bounds:
       line.append(''.join(chr(ch[0]) for z in sorted(spans,key=lambda z:z['bbox'][0]) if b and b[0]<=(z['bbox'][0]+z['bbox'][2])/2<b[2] and abs((z['bbox'][1]+z['bbox'][3])/2-yy)<3 for ch in z['chars']).strip())
      fixed.append(line)
     rr=fixed
    if key=='cnu-scan06-15' and p['page']==25:
     doc=fitz.open(CACHE/(key+'.pdf'));page=doc[24];pt=list(page.find_tables())[0];words=page.get_text('words');bounds=list(pt.rows[9].cells[:19]);sx=bounds[-1][2];ex=pt.bbox[2]
     bounds += [(sx+(ex-sx)*j/10,0,sx+(ex-sx)*(j+1)/10,0) for j in range(10)]
     fixed=[]
     for ix,vv in enumerate(rr):
      ub=pt.rows[ix].cells[18]
      if ix<2 or not ub or not vv[18]:continue
      line=[]
      for b in bounds:line.append(' '.join(w[4] for w in words if b[0]<=(w[0]+w[2])/2<b[2] and ub[1]<=(w[1]+w[3])/2<ub[3]))
      fixed.append(line)
     rr=fixed
    if n not in [31,32,28,29,26,27,16]:continue
    uc=2+off;qc=3+off
    for ri,v in enumerate(rr,1):
     if not num(v[qc]) or not v[uc] or compact(v[uc]) in ['합계','소계','총계']:continue
     if off and v[0]:pgsub=clean(v[0])
     program=pg+(' / '+pgsub if off else '')
     if rd=='정시':
      labels=['반영총점','최초수능 평균','최종수능 평균','최종수능 70%','최종수능 최저','최종수능 표준편차','국어 백분위 평균','수학 백분위 평균','영어 등급 평균','탐구2개 백분위 평균'];vals=v[16+off:];cut=val(v[19+off]);fr=13+off;reg=7+off;rank=12+off;metric='환산점수'
     elif n==16:labels=[];vals=[];cut='';fr=15;reg=8;rank=14;metric='기타'
     else:
      labels=['1단계 등급 최고','1단계 등급 평균','1단계 등급 최저','최초등급 최고','최초등급 평균','최초등급 최저']
      if n in [31,32]:labels+=['최종교과 환산평균','최종교과 환산70%','최종교과 환산표준편차']
      labels+=['최종등급 평균','최종등급 70%','최종등급 최저','최종등급 표준편차'];vals=v[18+off:];cut=val(v[-3]);fr=15+off;reg=8+off;rank=14+off;metric='교과등급'
     extras=pairs(labels,vals)+f'; 최종등록인원 {v[reg]}; 충원최종순위 {v[rank]}'
     out.append(row(key,'충남대학교',2026,rd,program,v[uc],f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[qc]),applicants=val(v[qc+1]),competition_rate=val(v[qc+2]),fill_rate=val(v[fr]),cut_70=cut,cut_other=extras,metric=metric,basis='최종등록자',grade_system='9' if metric=='교과등급' else '',note='draft; 소수 인원 성적 비공개는 빈칸 유지; 교과 진로선택 포함·종합 제외; 충원순위와 인원 구분'))
 save('cnu',out)


def nuch():
 out=[]
 for y in [2024,2025,2026]:
  key=f'nuch-{y}-pdf0';ts=tables(key)[0]['tables']
  for ti,t in enumerate(ts):
   for ri,v in enumerate(t['rows'][2 if ti==1 else 1:],3 if ti==1 else 2):
    if ti==1:
     for j,pg in [(1,'전통문화인재(학생부종합)'),(2,'교과우수자(학생부교과)')]:
      avg=val(v[3]) if y==2026 and j==2 else (v[3].split('(')[-1].rstrip(')') if y<2026 and j==2 and '(' in v[3] else '')
      extra='교과우수자 최초합격 내신평균 '+avg if avg else ''
      if y<2026:extra+='; 학생부위주 통합 최초합격 내신평균 '+v[3].split('(')[0]
      out.append(row(key,'한국전통문화대학교',y,'수시',pg,v[0],f'p.1 표{ti+1} 행{ri}',admission_type='종합' if j==1 else '교과',competition_rate=val(v[j]),cut_other=extra,metric='교과등급',basis='최초합격자; 학생부위주 통합평균과 교과우수자 평균을 구분',grade_system='9',note='draft; 검정고시 제외; 종합 전형 단독 평균은 공개되지 않아 대입하지 않음'))
    else:
     out.append(row(key,'한국전통문화대학교',y,'정시' if ti==2 else '우선선발','정시 일반전형' if ti==2 else '우선선발(입학고사)',v[0],f'p.1 표{ti+1} 행{ri}',admission_type='수능' if ti==2 else '기타',competition_rate=val(v[1]),cut_other=clean(t['rows'][0][2])+' '+clean(v[2]),metric='수능등급' if ti==2 else '입학고사점수',basis='최초합격자',grade_system='9' if ti==2 else '',note='draft; 평균을 컷으로 변환하지 않음; 입학고사 2024·2025 400점/2026 300점; 미술공예는 수학을 실기로 대체'))
 save('nuch',out)

def kornu():
 out=[]
 sources=[(2024,'수시','kornu-3125-pdf'),(2025,'수시','kornu-4347-pdf'),(2026,'수시','kornu-scan08-6-pdf'),(2025,'정시','kornu-4348-pdf'),(2026,'정시','kornu-scan08-7-pdf')]
 for y,rd,key in sources:
  for p in tables(key):
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];n=len(rr[0]);start=n-25
    if n not in [26,27]:continue
    h=5 if rd=='수시' else 4;unitbase='';prevunit=''
    for ri,v in enumerate(rr[h:],h+1):
     if v[0]:unitbase=clean(v[0])
     unit=unitbase+(' '+clean(v[1]) if start==2 and v[1] else '')
     if not unit or unit in ['계','합계','총계']:continue
     for o in range(start,n,5):
      if not re.search(r'\d',clean(v[o])):continue
      pg=clean(rr[2 if rd=='수시' else 1][o]);metric='백분위' if rd=='정시' and o==start else '교과등급'
      typ='수능' if metric=='백분위' else ('종합' if any(x in pg for x in ['창의융합','지역인재Ⅱ','장애']) else '교과')
      if '특기자' in pg:typ='실기'
      out.append(row(key,'나사렛대학교',y,rd,pg,unit,f'p.{p["page"]} 표{ti+1} 행{ri} 열{o+1}',admission_type=typ,quota=val(v[o]),competition_rate=val(v[o+1]),cut_other=pairs(['충원번호','평균','컷(비율 미명시)'],v[o+2:o+5]),metric=metric,basis='최종등록자',grade_system='9' if metric=='교과등급' else '',note='draft; 원문 컷의 백분위 비율 미명시로 cut_70에 입력하지 않음; 모집인원 이내 표기 보존; 실기·체육 세부 전형은 원문 참조'))
 save('kornu',out)

def sch():
 out=[]
 for y in [2024,2025,2026]:
  for rd in ['수시','정시']:
   key=('sch-scan05-92-pdf' if rd=='수시' else 'sch-scan05-93-pdf') if y==2026 else f'sch-{y}-'+('susi' if rd=='수시' else 'jeongsi')+'-pdf0'
   pg=''
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows'];n=len(rr[0]);m=re.findall(r'▣\s*\d+\s*([^\n]+)',t['before'])
     if m:pg=clean(m[-1])
     if n<10:continue
     header=3 if rd=='정시' and y==2026 else 2
     from normalize_gyeonggi import header_labels
     labels=header_labels(rr[:header],n)
     uc=0 if rd=='정시' and y==2026 else 1;qc=3 if (rd=='정시' and y==2026) or n==15 else 2
     unitbase=''
     for ri,v in enumerate(rr[header:],header+1):
      heading=re.findall(r'▣\s*\d+\s*([^\n]+)','\n'.join(x or '' for x in v))
      if heading:pg=clean(heading[-1]);continue
      if not re.fullmatch(r'\d+(?:\s*이내)?',clean(v[qc])):continue
      if v[uc]:unitbase=clean(v[uc])
      unit=unitbase
      if (n==15 or (rd=='정시' and y==2026)) and v[uc+1]:unit+=' '+clean(v[uc+1])
      if rd=='정시' and y==2026 and val(v[-1]):unit+=' (2026 모집단위: '+clean(v[-1])+')'
      if rd=='정시' and y<2026 and v[0]:pg=clean(v[0])
      if not unit or compact(unit) in ['계','합계','총계']:continue
      typ='실기' if '실기' in pg else ('종합' if '종합' in pg else ('수능' if rd=='정시' else '교과'))
      out.append(row(key,'순천향대학교',y,rd,pg,unit,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[qc]),applicants=val(v[qc+1]),competition_rate=val(v[qc+2]),cut_other=pairs(labels[qc+3:],v[qc+3:]),metric='백분위' if rd=='정시' else '교과등급',basis='최종등록자; 학생부/수능 성적 산출기준 원문 주석 참조',grade_system='9' if rd=='수시' else '',note='draft; 평균·최저 공개, 70% 컷 아님; 최종 추가합격 순위는 인원이 아님; 2026 정시는 2027 모집단위명 기준, 이전 명칭은 비고 보존'))
 for r in out:r['note']+='; 성적 재산출 연도는 원문 주석 기준(2024·2025 수시에도 2027학년도 반영방식 적용 표기)'
 save('sch',out)

def nsu():
 out=[];by={}
 key='nsu-susi-pdf0';pg=''
 for p in tables(key):
  for ti,t in enumerate(p['tables']):
   rr=t['rows']
   if len(rr[0])!=10:continue
   for ri,v in enumerate(rr[1:],2):
    if not num(v[2]):continue
    if v[0]:pg=clean(v[0])
    unit=clean(v[1]);k=(pg,unit);extra=pairs(rr[0][4:],v[4:])
    if k in by:by[k]['cut_other']+='; '+extra;by[k]['source_page']+=f'; p.{p["page"]} 표{ti+1} 행{ri}';continue
    r=row(key,'남서울대학교',2026,'수시',pg,unit,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type='종합' if '종합' in pg else ('실기' if '실기' in pg else '교과'),quota=val(v[2]),applicants=val(v[3]),competition_rate=val(v[5]),cut_other=extra,metric='교과등급',basis='최종등록자; 2027학년도 변경 산식으로 2026 결과 재산출',grade_system='9',note='draft; 2027학년도 산출기준 재계산 자료; 학생부종합 성적 비공개; 예비번호는 인원과 구분')
    by[k]=r;out.append(r)
 for y,key in [(2026,'nsu-jeongsi-pdf0'),(2025,'nsu-jeongsi-pdf1'),(2024,'nsu-jeongsi-pdf2')]:
  by={};pg=''
  for p in tables(key):
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];n=len(rr[0])
    if p['page']==1 or (y>2024 and p['page']>2) or p['page']>4:continue
    h=2 if n==5 else 1
    for ri,v in enumerate(rr[h:],h+1):
     if not num(v[2]):continue
     if v[0]:pg=clean(v[0])
     unit=clean(v[1]);k=(pg,unit)
     if not unit or pg in ['계','합계','총계'] or unit in ['계','합계','총계']:continue
     if y==2024:
      extra=pairs(rr[-len(rr)][2:] if n!=5 else ['모집인원','지원인원','경쟁률'],v[2:])
      if k not in by:
       r=row(key,'남서울대학교',y,'정시',pg,unit,'',admission_type='수능',metric='환산점수',basis='최종등록자',note='draft; 평균·표준편차와 예비순위 원문 보존');by[k]=r;out.append(r)
      r=by[k];r['cut_other']+='; '+extra;r['source_page']+=f'; {key} / p.{p["page"]} 표{ti+1} 행{ri}'
      if n in [4,5]:r['quota']=val(v[2])
      if n==5:r['applicants']=val(v[3]);r['competition_rate']=val(v[4])
     else:
      out.append(row(key,'남서울대학교',y,'정시',pg,unit,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type='수능',quota=val(v[2]),applicants=val(v[3]) if y==2026 else '',competition_rate=val(v[5 if y==2026 else 3]),cut_70=val(v[8]),cut_other=pairs(rr[0][3:],v[3:]),metric='환산점수',basis='최종등록자',note='draft; 실기100% 모집단위는 성적 미공개; 소수 인원 70% 컷 비공개'))
 save('nsu',out)


def mokwon():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 from normalize_gyeonggi import header_labels
 out=[];seen=set()
 for f in sorted(CACHE.glob('mokwon-*.html')):
  key=f.stem;m=json.loads((CACHE/(key+'.meta.json')).read_text());u=m['url'].split('#')[0];match=re.search(r'/0([13])04(11|10|09)\d\d.html$',u)
  if not match or u in seen:continue
  seen.add(u);y={'11':2026,'10':2025,'09':2024}[match[2]];rd='수시' if match[1]=='1' else '정시'
  soup=BeautifulSoup(f.read_text(),'html.parser')
  for ti,t in enumerate(soup.select('table')):
   rr=html_grid(t)
   if len(rr)<4:continue
   n=len(rr[0]);labels=header_labels(rr[:3],n);q=next((i for i,a in enumerate(labels) if '모집인원' in compact(a)),None)
   if q is None:continue
   pg=rr[0][q];typ='종합' if '종합' in pg else ('실기' if '실기' in pg or '특기' in pg else ('수능' if rd=='정시' else '교과'))
   # Preserve shared recruitment cells as a single aggregate, with all constituent majors.
   cells={}
   for i,tr in enumerate(t.select('tr')):
    j=0
    for cell in tr.find_all(['td','th'],recursive=False):
     while (i,j) in cells:j+=1
     rs=int(cell.get('rowspan',1));cs=int(cell.get('colspan',1))
     for a in range(rs):
      for b in range(cs):cells[i+a,j+b]=cell
     j+=cs
   groups={}
   for ri,v in enumerate(rr[3:],3):
    if q>=len(v) or not re.search(r'\d',v[q]):continue
    unit=' / '.join(dict.fromkeys(clean(x) for x in v[1:q] if clean(x)))
    if unit in ['합계','계','총계'] or not unit:continue
    ident=id(cells.get((ri,q)))
    if ident in groups:
     r=groups[ident]
     if unit not in r['recruit_unit'].split(' | '):r['recruit_unit']+=' | '+unit
     continue
    r=row(key,'목원대학교',y,rd,pg,unit,f'표{ti+1} 행{ri+1}',admission_type=typ,quota=val(v[q]),applicants=val(v[q+1]),competition_rate=val(v[q+2]),cut_other=pairs(labels[q+3:],v[q+3:]),metric='교과등급' if rd=='수시' else '환산점수',basis='합격자; 최초평균·최종평균·최저 구분',grade_system='9' if rd=='수시' else '',note='draft; 충원합격 최종순위는 인원과 구분; 공동 모집인원은 세부전공을 묶어 한 행으로 보존; 학과 주석 기호 보존')
    groups[ident]=r;out.append(r)
 save('mokwon',out)

def ggu():
 out=[]
 for y,key in [(2025,'ggu-scan05-32'),(2024,'ggu-scan05-33')]:
  for p in tables(key):
   for ti,t in enumerate(p['tables']):
    v=t['rows'][-1];rd=['수시','정시','추가'][ti]
    out.append(row(key,'금강대학교',y,rd,'일반전형',v[0],f'p.{p["page"]} 표{ti+1}',admission_type='수능' if rd=='정시' else '교과',quota=val(v[1]),competition_rate=val(v[2]),cut_50=val(v[7]),cut_70=val(v[8]),cut_other=pairs(['등록인원','지원자50%','지원자70%','최고점'],v[3:7]),metric='수능등급' if rd=='정시' else '교과등급',basis='최종등록자',grade_system='9'))
 save('ggu',out)

def wsu():
 from normalize_gyeonggi import header_labels
 out=[]
 for y,key in [(2026,'wsu-scan08-11'),(2025,'wsu-scan08-15'),(2024,'wsu-page2-follow130-file127')]:
  wb=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  for sh in wb:
   if '기존' in sh.title:continue
   if '전체' not in sh.title and not sh.title.startswith('정시'):continue
   rr=excel_grid(sh);raw=list(sh.values);rd='정시' if sh.title.startswith('정시') else '수시'
   hi=next(i for i,v in enumerate(raw) if any(compact(x)=='모집인원' for x in v));starts=[i for i,v in enumerate(raw[hi]) if compact(v)=='모집인원'];labels=header_labels(rr[hi:hi+2],len(rr[0]));end=sh.max_column
   def unit_at(i):
    if rd=='정시' and y==2025 and clean(rr[i][3]):return clean(rr[i][3])
    vv=[clean(x) for x in rr[i][1:3] if clean(x)]
    return ' / '.join(dict.fromkeys(vv)) if vv else clean(rr[i][0])
   for i in range(hi+2,len(rr)):
    for z,o in enumerate(starts):
     if not num(raw[i][o]):continue
     stop=starts[z+1] if z+1<len(starts) else end
     v=rr[i];merge=next((r for r in sh.merged_cells.ranges if r.min_row==i+1 and r.min_col<=o+1<=r.max_col),None)
     units=[unit_at(j) for j in range(i,merge.max_row if merge else i+1)];unit=' | '.join(dict.fromkeys(u for u in units if u))
     if not unit or any(x in unit for x in ['총계','합계','※']):continue
     if rd=='정시':
      gun=''.join(clean(raw[hi+1][j]) for j in range(3,o) if clean(v[j]).upper() in ['●','O','○']);pg=gun+'군 일반전형';extra=pairs(labels[o+2:],v[o+2:]);cut='';metric='백분위'
     else:
      pg=clean(rr[hi-1][o]).split(']')[0]+']';extra=pairs(labels[o+2:stop],v[o+2:stop]);ci=next((j for j in range(o+2,stop) if '70%' in labels[j]),None);cut=val(v[ci]) if ci is not None else '';metric='교과등급'
     hasapp='지원' in labels[o+1]
     out.append(row(key,'우송대학교',y,rd,pg,unit,f'{sh.title} 행{i+1} 열{o+1}',admission_type='종합' if '종합' in pg else ('실기' if '실기' in pg else ('수능' if rd=='정시' else '교과')),quota=val(v[o]),applicants=val(v[o+1]) if hasapp else '',competition_rate='' if hasapp else val(v[o+1]),cut_70=cut,cut_other=extra,metric=metric,basis='최종등록자; 정시 수능백분위 2과목 200점',grade_system='9' if rd=='수시' else '',note='draft; 엑셀 원값 보존; 후보순위와 인원 구분; 공유 모집인원은 묶음; 수시는 차년도 모집단위 기준, 정시 2025는 당시 모집단위명'))
   if y==2024 and sh.title=='수시 정원내 전체':
    for i in range(hi+2,len(rr)):
     for o in [40,43,46]:
      if not num(raw[i][o]):continue
      unit=unit_at(i)
      if not unit or any(z in unit for z in ['계','※']):continue
      pg=clean(rr[hi-1][o]).split(']')[0]+']'
      out.append(row(key,'우송대학교',y,'수시',pg,unit,f'{sh.title} 행{i+1} 열{o+1}',admission_type='교과',applicants=val(raw[i][o]),cut_other=pairs(labels[o+1:o+3],rr[i][o+1:o+3]),metric='교과등급',basis='최종등록자',grade_system='9',note='draft; 정원외 표는 모집인원 없이 지원인원 공개; 평균과100%컷 구분; 과거 초안 시트는 미사용'))
 save('wsu',out)


def cju():
 out=[]
 for y,rd,key in [(2026,'수시','cju-scan05-15'),(2024,'수시','cju-scan05-17'),(2026,'정시','cju-scan06-11'),(2024,'정시','cju-scan06-10')]:
  for p in tables(key):
   for t in p['tables']:
    rr=t['rows'];n=len(rr[0])
    if n not in [52,18]:continue
    for ri,v in enumerate(rr[3:],4):
     unit=clean(v[1])
     if not unit or '계'==unit or '합계' in unit:continue
     for o in range(2,52,10) if rd=='수시' else [2]:
      if not num(v[o]):continue
      if rd=='수시':pg=rr[0][o];cut=v[o+9];labs=['표준점수 최고','표준점수 평균','표준점수70%','내신등급 최고','내신등급 평균','내신등급70%'];vv=v[o+4:o+10]
      else:
       pg='정시 일반전형';cut=v[8] if y==2026 else v[17];labs=([a+' '+b+' '+c for a in ['최종합격자','최초합격자'] for b in ['수능원백분위','수능등급'] for c in ['최고','평균','70%']] if y==2026 else [a+' '+b+' '+c for a in ['최초합격자','최종합격자'] for b in ['수능등급','수능원백분위'] for c in ['최고','평균','70%']]);vv=v[6:]
      out.append(row(key,'청주대학교',y,rd,pg,unit,f'p.{p["page"]} 행{ri} 열{o+1}',admission_type='교과' if rd=='수시' else '수능',quota=val(v[o]),applicants=val(v[o+1]),competition_rate=val(v[o+2]),fill_count=val(v[o+3]),cut_70=val(cut),cut_other=pairs(labs,vv),metric='교과등급' if rd=='수시' else '백분위',basis='최종합격자',grade_system='9' if rd=='수시' else '',note='draft; 예체능·군사학과 포함 전형은 모집단위별 실기·면접 반영 기준 원문 참조'))
 save('cju',out)

def hanseo():
 from normalize_gyeonggi import header_labels
 out=[]
 for y,rd,key in [(2024,'수시','hanseo-scan05-43'),(2024,'정시','hanseo-scan05-46'),(2025,'정시','hanseo-scan05-45'),(2026,'정시','hanseo-scan05-44')]:
  for p in tables(key):
   for t in p['tables']:
    rr=t['rows'];h=3 if rd=='수시' else 4;n=len(rr[0]);labels=header_labels(rr[:h],n)
    for ri,v in enumerate(rr[h:],h+1):
     uc=1 if rd=='수시' else (2 if y==2024 else 0);unit=clean(v[uc])
     if not unit or '계'==unit or '합계' in unit:continue
     if rd=='수시':
      for st,en in [(2,5),(5,8),(8,10),(10,12),(12,15),(15,17),(17,19)]:
       if not any(num(x) for x in v[st:en]):continue
       pg=clean(rr[1][st]);out.append(row(key,'한서대학교',y,rd,pg,unit,f'p.{p["page"]} 행{ri} 열{st+1}',admission_type='종합' if st==15 else ('실기' if st==17 else '교과'),cut_other=pairs(labels[st:en],v[st:en]),metric='교과등급',basis='최종등록자; 원문 성적산출기준',grade_system='9',note='draft; 80%컷을 70%컷으로 변환하지 않음; 추가합격 표기 원문 보존'))
     elif any(num(x) for x in v[uc+1:]):
      out.append(row(key,'한서대학교',y,rd,'일반전형',unit,f'p.{p["page"]} 행{ri}',admission_type='수능',competition_rate=val(v[2]) if y>2024 else '',cut_other=pairs(labels[uc+1:],v[uc+1:]),metric='백분위',basis='최종등록자',note='draft; 등록인원을 모집인원으로 대입하지 않음; 80%컷 보존'))
 save('hanseo',out)

def chungwoon():
 out=[]
 for y,key in [(2026,'chungwoon-scan06-1'),(2025,'chungwoon-scan06-2'),(2024,'chungwoon-2024-susi-pdf')]:
  for p in tables(key):
   for t in p['tables']:
    rr=t['rows'];n=len(rr[0]);st=n-14;camp='';unit='';pgs=['일반전형','청운인재전형']
    for ri,v in enumerate(rr[4:],5):
     if v[0]:camp=compact(v[0])
     if v[2]:unit=clean(v[2])
     if '홍성' not in camp:continue
     un=unit
     for o,pg in zip([st,st+7],pgs):
      if not num(v[o]):continue
      out.append(row(key,'청운대학교(홍성)',y,'수시',pg,un,f'p.{p["page"]} 행{ri} 열{o+1}',admission_type='교과',quota=val(v[o]),applicants=val(v[o+1]),competition_rate=val(v[o+2]),cut_70=val(v[o+6]),cut_other=pairs(['최초합격 평균','최초합격70%','최종합격 평균','최종합격70%'],v[o+3:o+7]),metric='교과등급',basis='최종합격자',grade_system='9'))
 save('chungwoon',out)


def dankook_cheonan():
 out=[]
 for y in [2024,2025,2026]:
  for rd in ['수시','정시']:
   key=f'dankook-cheonan-{y}-'+('susi' if rd=='수시' else 'jeongsi')
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows'];n=len(rr[0]);uc=3 if y>2024 else (4 if rd=='수시' else 5);q=uc+(1 if y>2024 else 2);pc=1 if y>2024 else (2 if rd=='수시' else 3)
     for ri,v in enumerate(rr,1):
      if not num(v[q]) or not v[uc]:continue
      pg=clean(v[pc]);typ='실기' if '실기' in pg or '체육' in pg else ('수능' if rd=='정시' else ('교과' if any(x in pg for x in ['교과','지역균형']) else '종합'))
      labels=['등록인원','등록률']+['최종등록자 '+x for x in (['최저','평균','최고'] if y>2024 else ['최고','평균','최저'])]+['예비후보순위']
      out.append(row(key,'단국대학교(천안)',y,rd,pg,v[uc],f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[q]),applicants=val(v[q+1]),competition_rate=val(v[q+2]),cut_other=pairs(labels,v[q+3:]),metric='교과등급' if rd=='수시' else '백분위',basis='최종등록자',grade_system='9' if rd=='수시' else '',note='draft; 다음 연도 계획인원 제외; 당시 모집단위 개편표 기준 명칭; 평균·최고·최저 보존'))
 save('dankook-cheonan',out)

def smu():
 out=[]
 pgs={1:'학생부교과(학생부교과전형)',2:'학생부종합(상명인재전형)',3:'학생부종합(기회균형전형)',4:'실기/실적(실기전형)',5:'학생부교과(농·어촌학생전형)',6:'학생부교과(특성화고교졸업자전형)',7:'학생부종합(조기취업형계약학과전형)'}
 for y in [2024,2025,2026]:
  for rd in ['수시','정시']:
   key=f'smu-{y}-'+('susi' if rd=='수시' else 'jeongsi');gun='';pg=''
   for p in tables(key):
    for t in p['tables']:
     rr=t['rows'];n=len(rr[0]);h=2 if rd=='수시' else 3
     if n==3:h=2
     for ri,v in enumerate(rr[h:],h+1):
      if rd=='수시':
       unit=clean(v[0]);pg=pgs[p['page']];labels=['최초합격 평균','최종등록 평균'] if n==3 else [a+' '+b for a in ['최초합격','최종등록'] for b in ['최고','평균','최저']];vv=v[1:]
      else:
       if v[0]:gun=clean(v[0])
       if v[1]:pg=clean(v[1])
       unit=clean(v[2]);labels=[a+' '+b for a in ['최초합격','최종등록'] for b in ['백분위 최고','백분위 평균','등급 평균','백분위 최저']];vv=v[3:]
      if not unit or not any(val(x) for x in vv):continue
      out.append(row(key,'상명대학교(천안)',y,rd,(gun+' ' if rd=='정시' else '')+pg,unit,f'p.{p["page"]} 행{ri}',admission_type='실기' if '실기' in pg else ('종합' if '종합' in pg else ('수능' if rd=='정시' else '교과')),cut_other=pairs(labels,vv),metric='교과등급' if rd=='수시' else '백분위',basis='최초합격자·최종등록자 구분',grade_system='9' if rd=='수시' else '',note='draft; 평균·최고·최저 공개, 컷으로 대입하지 않음; 수시 석차등급 있는 전과목 이수단위 적용; 종합은 교과성적 정량반영 아님'))
 save('smu-cheonan',out)

def dju():
 out=[]
 for rd,key in [('수시','dju-susi-results'),('정시','dju-scan05-31')]:
  unit='';pg=''
  for p in tables(key):
   for t in p['tables']:
    rr=t['rows'];n=len(rr[0])
    for ri,v in enumerate(rr,1):
     if clean(v[2]) not in ['2024','2025','2026']:continue
     if v[0]:unit=clean(v[0])
     if v[1]:pg=clean(v[1])
     if rd=='수시':extras=pairs(['등록인원','지원인원','경쟁률','충원순위'],v[5:9])+'; '+pairs(['최고','평균','80%컷'],[v[9],v[-2],v[-1]])
     else:extras=pairs(['등록인원','지원인원','최종후보순위']+[a+' '+b for a in ['80%컷','평균','최고'] for b in ['백분위','등급','총점']],v[5:])
     out.append(row(key,'대전대학교',v[2],rd,pg if rd=='수시' else pg+' 일반전형',unit,f'p.{p["page"]} 행{ri}',admission_type='수능' if rd=='정시' else ('종합' if '혜화' in pg or '종합' in pg else ('실기' if '실기' in pg else '교과')),quota=val(v[3]),applicants=val(v[6]),competition_rate=val(v[7]) if rd=='수시' else '',cut_other=extras,metric='교과등급' if rd=='수시' else '백분위',basis='등록자; 정시 백분위 합산과 등급·총점 별도 보존',grade_system='9' if rd=='수시' else '',note='draft; 2027 계획인원 제외; 80% 컷은 cut_other 보존; 충원순위와 인원 구분'))
 save('dju',out)


def sunmoon():
 out=[]
 for y in [2024,2025,2026]:
  key=f'sunmoon-{y}-susi-pdf';doc=fitz.open(CACHE/(key+'.pdf'));pg='';typ=''
  if y==2024:
   blocks=[[(12,'교과','일반학생전형'),(7,'실기','일반학생전형'),(10,'교과','지역학생전형'),(6,'교과','사회통합전형'),(1,'교과','기회균형전형')],[(8,'교과','기회균형전형'),(2,'실기','기회균형전형'),(12,'종합','서류전형'),(4,'종합','면접전형'),(5,'실기','체육특기자전형'),(5,'교과','농어촌학생전형'),(5,'교과','특성화고교졸업자전형'),(1,'종합','장애인등대상자전형')]]
   for pi,page in enumerate(doc):
    ww=page.get_text('words');anchors=sorted([w for w in ww if w[0]>500 and num(w[4])],key=lambda w:w[1]);tags=[(typ,pg) for count,typ,pg in blocks[pi] for _ in range(count)]
    assert len(anchors)==len(tags),(pi,len(anchors),len(tags))
    for ai,(w,(typ,pg)) in enumerate(zip(anchors,tags)):
     line=sorted([a for a in ww if abs(a[1]-w[1])<2],key=lambda a:a[0]);unit=''.join(a[4] for a in line if 180<a[0]<343);vals=[a[4] for a in line if a[0]>343]
     assert len(vals)==5,(pi,ai,unit,vals)
     out.append(row(key,'선문대학교',y,'수시',typ+' '+pg,unit,f'p.{pi+1} 데이터행{ai+1}',admission_type=typ,quota=vals[0],competition_rate=vals[1],cut_50=vals[3],cut_70=vals[4],cut_other='컷 순위 '+vals[2],metric='교과등급',basis='최종등록자; 2024 산식; 2025 모집단위 기준',grade_system='9',note='draft; PDF 좌표로 행 복원 및 두 페이지 렌더링 전형 경계 대조'))
   continue
  for p in tables(key):
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];n=len(rr[0]);h=next((i for i,v in enumerate(rr) if '전형' in clean(v[1]) and '모집단위' in clean(v[3 if y==2025 else 4])),None)
    if h is None:continue
    for ri,v in enumerate(rr[h+2 if y==2025 else h+1:],h+3 if y==2025 else h+2):
     uc=3 if y==2025 else 4
     if v[0]:typ=clean(v[0])
     if v[1]:pg=clean(v[1])
     unit=clean(v[uc])
     if not unit or unit in ['계','합계']:continue
     if y==2026:
      if not num(v[5]):continue
      kw=dict(quota=val(v[5]),competition_rate=val(v[6]),cut_50=val(v[8]),cut_70=val(v[9]),cut_other='추가합격 최종순위 '+clean(v[7]))
     else:
      if not any(num(x) for x in v[4:]):continue
      kw=dict(cut_50=val(v[14]),cut_70=val(v[15]),cut_other=pairs([a+' '+b+' '+c for a in ['2026산식 재산출','2025산식'] for b in ['최초합격','최종등록'] for c in ['최고','50%','70%']],v[4:]))
     out.append(row(key,'선문대학교',y,'수시',typ+' '+pg,unit,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type='종합' if '종합' in typ else ('실기' if '실기' in typ else '교과'),metric='교과등급',basis=f'최종등록자; {y}학년도 산식; {y+1} 모집단위 기준',grade_system='9',note='draft; 2025 결과의 2026 산식 재산출 값은 cut_other에 구분 저장',**kw))
 for y in [2024,2025,2026]:
  key=f'sunmoon-{y}-jeongsi-pdf';group='';reflection=''
  for p in tables(key):
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];n=len(rr[0]);h={2024:3,2025:5,2026:4}[y]
    if n not in ([21] if y==2024 else ([18,19] if y==2025 else [14])):continue
    for ri,v in enumerate(rr[h:],h+1):
     uc=2 if y==2024 else 1
     if v[uc] is None or not clean(v[uc]):continue
     unit=clean(v[uc]);cut='';extras='';metric='환산점수'
     if y==2024:
      if not any(val(x) for x in v[6:13]):continue
      vv=v[11].split() if v[11] and len(v[11].split())==2 else [v[11],v[12]];cut=val(vv[1]);extras=pairs(['공동모집인원(단위별 배분 금지)','경쟁률','충원순위','최초최고 및70%','최초70%','최종최고 및70%','최종70%'],v[6:13])
     elif y==2025:
      o=n-6
      if not any(val(x) for x in v[o:]):continue
      cut=val(v[o+2]);extras=pairs(['경쟁률','등급환산 평균','등급환산70%','백분위 평균','백분위70%','충원순위'],v[o:])
     else:
      if not any(val(x) for x in v[5:]):continue
      cut=val(v[12]);metric='수능등급';extras=pairs(['공동최초인원','이월인원','공동최종인원','공동경쟁률','최초최대','최초70%','최종최대','최종70%','공동충원순위'],v[5:])
     out.append(row(key,'선문대학교',y,'정시','일반전형',unit,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type='수능',cut_70=cut,cut_other=extras,metric=metric,basis='최종등록자; 공동 선발 통계와 세부전공별 성적 구분',note='draft; 차년도 모집계획 제외; 공동모집인원은 세부전공에 배분하지 않음; 성적 반영과목·산식은 원문 참조'))
 save('sunmoon',out)


def hannam():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 from normalize_gyeonggi import header_labels
 out=[]
 for y in [2024,2025,2026]:
  key=f'hannam-{y}-jeongsi'+('-post' if y>2024 else '')
  if y>2024:
   ts=[html_grid(t) for t in BeautifulSoup((CACHE/(key+'.html')).read_text(),'html.parser').select('table') if len(t.select('tr'))>20]
  else:ts=[t['rows'] for p in tables(key) for t in p['tables']]
  for ti,rr in enumerate(ts):
   h=next(i for i,v in enumerate(rr) if len(v)>6 and num(v[4]));labs=header_labels(rr[:h],len(rr[h]));gun=''
   for ri,v in enumerate(rr[h:],h+1):
    if v[0]:gun=clean(v[0])
    if not num(v[4]) or not v[3]:continue
    out.append(row(key,'한남대학교',y,'정시',gun+' 일반전형',v[3],f'표{ti+1} 행{ri}',admission_type='수능',quota=val(v[4]),competition_rate=val(v[5]),cut_70=val(v[11]) if y>2024 else '',cut_other=pairs(labs[6:],v[6:]),metric='환산점수',basis='최종합격자; 수능성적 합산점수와 수능등급 구분',note='draft; 2024 80%컷, 2025·2026 70%컷; 최종충원예비순위는 인원과 구분'))
 key='hannam-2024-susi'
 for p in tables(key):
  for t in p['tables']:
   rr=t['rows'];n=len(rr[0])
   if n not in [28,18]:continue
   labs=header_labels(rr[:4],n);step=13 if n==28 else 8
   for ri,v in enumerate(rr[4:],5):
    if not v[1]:continue
    for o in [2,2+step]:
     if not num(v[o]):continue
     pg=rr[0][o];out.append(row(key,'한남대학교',2024,'수시',pg,v[1],f'p.{p["page"]} 행{ri} 열{o+1}',admission_type='종합' if n==18 else '교과',quota=val(v[o]),competition_rate=val(v[o+1]),cut_other=pairs(labs[o+2:o+step],v[o+2:o+step]),metric='교과등급',basis='최종합격자',grade_system='9',note='draft; 80%컷을 cut_70에 대입하지 않음; 충원예비순위 구분'))
 key='hannam-2026-susi';doc=fitz.open(CACHE/(key+'.pdf'))
 for pi,page in enumerate(doc):
  pg={0:'학생부교과 일반전형',1:'학생부교과 일반전형',2:'학생부교과 지역인재교과우수자전형',3:'학생부교과 지역인재교과우수자전형',4:'학생부종합 한남인재Ⅰ(서류)전형',5:'학생부종합 한남인재Ⅰ(서류)전형',6:'학생부종합 한남인재Ⅱ(서류+면접)전형'}[pi]
  for t in page.find_tables():
   rr=t.extract();ww=page.get_text('words')
   for ri,v in enumerate(rr):
    if not num(v[3]) or not v[2]:continue
    box=t.rows[ri].cells[3];nums=sorted([w for w in ww if box[1]<=((w[1]+w[3])/2)<box[3] and w[0]>=box[0] and num(w[4])],key=lambda w:w[0]);vals=[w[4] for w in nums]
    expect=11 if pi<4 else 7
    assert len(vals)==expect,(pi,ri,v[2],vals)
    labs=['최초교과 환산평균','최초교과 등급평균','최종교과 환산최고','최종교과 환산평균','최종교과 환산70%','최종교과 등급최고','최종교과 등급평균','최종교과 등급70%'] if pi<4 else ['최초등급 평균','최종등급 최고','최종등급 평균','최종등급70%']
    out.append(row(key,'한남대학교',2026,'수시',pg,v[2],f'p.{pi+1} 행{ri+1}',admission_type='교과' if pi<4 else '종합',quota=vals[0],competition_rate=vals[1],cut_70=vals[-1],cut_other='충원예비순위 '+vals[2]+'; '+pairs(labs,vals[3:]),metric='교과등급',basis='최종합격자',grade_system='9',note='draft; PDF 단어 좌표로 병합된 마지막 등급 열 복원; 예비순위와 인원 구분'))
 save('hannam',out)


def koreatech():
 out=[]
 def canon(unit):
  unit=compact(unit).replace('‧','·')
  for old,new in [('디자인','디자인전공'),('건축','건축전공'),('에너지신소재','에너지신소재전공'),('화학생명','화학생명전공')]:
   if unit==old:unit=new
  return unit
 for y,key in [(2026,'koreatech-auto7'),(2025,'koreatech-scan06-28'),(2024,'koreatech-scan06-30')]:
  doc=fitz.open(CACHE/(key+'.pdf'));by={}
  for pi,page in enumerate(doc):
   ps=tables(key)[pi];ts=list(page.find_tables())
   for ti,t in enumerate(ts):
    rr=t.extract();n=len(rr[0]);before=ps['tables'][ti]['before'];mm=re.findall(r'◦\s*([^\n]+)',before)
    if not mm:continue
    pg=re.split(r'\s*\(단위',mm[-1])[0].strip();typ='교과' if '교과' in pg or '일반전형'==pg else ('논술' if '논술' in pg else '종합')
    if '논술' in page.get_text() and '일반전형'==pg:typ='논술'
    words=page.get_text('words')
    def value(box,yy):
     if box is None:return ''
     return ' '.join(w[4] for w in sorted(words,key=lambda w:w[0]) if box[0]<=((w[0]+w[2])/2)<box[2] and abs((w[1]+w[3])/2-yy)<5)
    def add(unit,kw,loc,extra):
     unit=canon(unit)
     if not unit or unit in ['계','합계','평균']:return
     k=(pg,unit)
     if k not in by:
      r=row(key,'한국기술교육대학교',y,'수시',pg,unit,loc,admission_type=typ,metric='교과등급',basis='최종등록생; 지원자·최초합격생 별도 표기',grade_system='9',note='draft; PDF 좌표로 열·행 복원; 후보순위는 인원이 아님; 원문 충원율 산식 재계산하지 않음');out.append(r);by[k]=r
     r=by[k];r.update(kw);r['cut_other']+='; '+extra;r['source_page']+='; '+loc
    if '모집인원' in [compact(v) for v in rr[0]] and n in [7,8,9]:
     if y==2026:
      for ri,v in enumerate(rr[1:],2):
       if not num(v[3]):continue
       unit=' '.join(dict.fromkeys(clean(x) for x in v[1:3] if x));extra=pairs(['등록인원','후보합격순위(충원율)','면접전도율'],v[6:]);add(unit,dict(quota=val(v[3]),applicants=val(v[4]),competition_rate=val(v[5])),f'p.{pi+1} 표{ti+1} 행{ri}',extra)
     else:
      box=t.rows[0].cells[1];bounds=t.rows[1].bbox
      anchors=sorted([w for w in words if box[0]<w[0]<box[2] and bounds[1]<w[1]<bounds[3] and num(w[4])],key=lambda w:w[1])
      for ai,w in enumerate(anchors):
       yy=(w[1]+w[3])/2;unit=value((t.bbox[0],0,box[0],0),yy);vv=[value(b,yy) for b in t.rows[0].cells]
       add(unit,dict(quota=w[4],applicants=val(vv[2]),competition_rate=val(vv[3])),f'p.{pi+1} 표{ti+1} 데이터행{ai+1}',pairs([clean(x) for x in rr[0][4:]],vv[4:]))
    elif n in [9,10] and any('지원자' in clean(x) for x in rr[0]) and len(rr)>2:
     start=2 if y==2026 else 1;xb=t.rows[1].cells[start][0];bounds=t.rows[2].bbox
     anchors=[w for w in words if t.bbox[0]<=w[0]<xb and bounds[1]<w[1]<bounds[3] and re.search(r'(?:학부|학과|전공)$',w[4]) and w[4] not in ['건축공학부','화학공학부']]
     anchors.sort(key=lambda w:w[1])
     for ai,w in enumerate(anchors):
      yy=(w[1]+w[3])/2;vv=[value(t.rows[1].cells[j],yy) for j in range(start,n,2)];add(w[4],{},f'p.{pi+1} 표{ti+1} 성적행{ai+1}',pairs(['지원자 평균등급','최초합격생 평균등급','최종등록생 평균등급','최종등록생 최저등급'],vv))
 save('koreatech',out)


def gnue():
 from normalize_gyeonggi import header_labels
 out=[]
 for y in [2024,2025,2026]:
  key=f'gnue-{y}-post-pdf';ps=tables(key);by={}
  for ti,t in enumerate(ps[0]['tables']):
   rd='수시' if ti==0 else '정시';rr=t['rows'];labs=header_labels(rr[:2],len(rr[0]))
   for ri,v in enumerate(rr[2:],3):
    pg=compact(v[1]);q=2 if rd=='수시' else 4
    if not pg or not num(v[q]) or pg=='계':continue
    r=row(key,'공주교육대학교',y,rd,pg,'초등교육과',f'p.1 표{ti+1} 행{ri}',admission_type='종합' if rd=='수시' else '수능',quota=val(v[q]),applicants=val(v[5 if rd=='수시' else 7]),competition_rate=val(v[6 if rd=='수시' else 8]),cut_other=pairs(labs[2:],v[2:]),metric='기타',basis='지원·합격·등록 통계와 평가점수·등급을 항목별 구분',note='draft; 최고·평균·최저 공개; 70% 컷으로 대입하지 않음; 최초·최종 및 예비석차 원문 보존');by[rd,pg]=r;out.append(r)
  for p in ps[1:]:
   if p['page']>=6:continue
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];n=len(rr[0]);h=1 if p['page']==2 else 2;labs=header_labels(rr[:h],n)
    rd=('수시' if ti==0 else '정시') if p['page']==2 or (y>2024 and p['page']==3) else ('수시' if p['page']==3 else '정시');pg='';queues={}
    for ri,v in enumerate(rr[h:],h+1):
     if v[0]:pg=compact(v[0])
     if (rd,pg) not in by:continue
     vv=list(v)
     # Subject tables print four numerical rows in one merged cell.
     for j,x in enumerate(vv):
      if j>=2 and x and '\n' in x:queues[j]=x.splitlines()
      if j in queues and queues[j]:vv[j]=queues[j].pop(0)
     r=by[rd,pg];label=('내신등급' if y==2024 and p['page']==3 and ti==1 else '수능영역등급' if p['page']==5 else '평가/충원');stage=clean(v[1]) if n in [11,5] or p['page']==5 else ''
     r['cut_other']+='; '+label+' '+stage+' ['+pairs(labs[1:],vv[1:])+']';r['source_page']+=f'; p.{p["page"]} 표{ti+1} 행{ri}'
 save('gnue',out)


def cje():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 from normalize_gyeonggi import header_labels
 out=[]
 for y in [2024,2025,2026]:
  for rd in ['수시','정시']:
   key=f'cje-{y}-'+('susi' if rd=='수시' else 'jeongsi');sp=BeautifulSoup((CACHE/(key+'-converted.html')).read_text(),'html.parser');ts=sp.select('table');by={}
   for ti,t in enumerate(ts):
    rr=html_grid(t);h=2 if ti<2 else 1;labs=header_labels(rr[:h],len(rr[0]))
    for ri,v in enumerate(rr[h:],h+1):
     pg=compact(v[1]);unit='초등교육과'
     if not re.search(r'(전형|학생부|수능)',pg):continue
     if ti==0:
      r=row(key,'청주교육대학교',y,rd,pg,unit,f'한글 표1 행{ri}',admission_type='종합' if rd=='수시' else '수능',quota=val(v[2]),applicants=val(v[5]),competition_rate=val(v[6]),cut_other=pairs(labs[3:],v[3:]),metric='교과등급' if rd=='수시' else '수능등급',basis='최종등록자; 지원자·최초합격 통계 별도 보존',grade_system='9',note='draft; 80%컷을 70%컷으로 변환하지 않음; 원문 빈 총계·예비번호는 합산하여 채우지 않음; 원문 성별 수치는 보존');out.append(r);by[pg]=r
     elif pg in by:
      r=by[pg];label=['지원/등록','성적등급','충원합격','이전연도 예비번호','서류/수능점수 분포','면접점수 분포','총점 분포'][ti];r['cut_other']+='; '+label+' ['+pairs(labs[2:],v[2:])+']';r['source_page']+=f'; 표{ti+1} 행{ri}'
 save('cje',out)

def kdu():
 out=[]
 for i,x in enumerate(json.loads((CACHE/'kdu-2026-verified-transcription.json').read_text()),1):
  v=x['values'];rd=x['round'];labels=['환산 최저','환산80%','환산70%','환산50%','환산최고','환산만점']+(['등급최저','등급80%','등급70%','등급50%','등급최고'] if rd=='수시' else [a+' '+b for a in ['영역별50%','영역별70%'] for b in ['국어백분위','수학백분위','탐구백분위','평균백분위','영어등급']]);cut50=v[16] if rd=='수시' else v[10];cut70=v[15] if rd=='수시' else v[9]
  out.append(row(x['key'],'극동대학교',2026,rd,x['program'],x['unit'],f'공식 이미지 대조전사 행{i}',admission_type='수능' if rd=='정시' else '교과',quota=v[0],applicants=v[1],competition_rate=v[2],fill_count=v[5],cut_50=val(cut50),cut_70=val(cut70),cut_other=pairs(['등록인원','등록률','충원인원','잔여인원'],v[3:7])+'; '+pairs(labels,v[7:]),metric='교과등급' if rd=='수시' else '환산점수',basis='최종등록자',grade_system='9' if rd=='수시' else '',note='draft; 공식 PNG를 시각 대조하여 직접 전사; 정원외는 전형 합계로 학과별 분해하지 않음; 원문의 소제목 오기보다 최상단 전형명을 적용'))
 save('kdu',out)

if __name__=='__main__':
 for name in sys.argv[1:]:globals()[name]()
