from normalize_gyeonggi import *

def cha():
 out=[]
 for y in [2024,2025,2026]:
  key=f'cha-{y}'
  for p in tables(key):
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];title=t['before']
    if '정시 수능' in title:
     pg='일반전형';rnd='정시';typ='수능'
     if len(rr)==1:rr=list(map(list,zip(*(x.splitlines() for x in rr[0]))))
    elif '지역균형선발전형' in title:pg='지역균형선발전형';rnd='수시';typ='교과'
    elif 'CHA학생부교과전형' in title:pg='CHA학생부교과전형';rnd='수시';typ='교과'
    elif 'CHA학생부종합전형' in title:pg='CHA학생부종합전형';rnd='수시';typ='종합'
    else:continue
    for ri,v in enumerate(rr):
     if len(v) not in [4,10] or not num(v[1]):continue
     r=row(key,'차의과학대학교',y,rnd,pg,v[0],f'p.1 표{ti+1} 행{ri+1}',admission_type=typ,quota=v[1],competition_rate=v[2],fill_count=val(v[3]),basis='최종등록자',metric='환산점수' if rnd=='정시' else '교과등급',grade_system='9' if rnd=='수시' else '')
     if len(v)==10:r.update(cut_50=val(v[8]),cut_70=val(v[9]),cut_other=pairs(['최초합격자 평균','최종등록자 최고','최종등록자 평균','최종등록자 편차'],v[4:8]))
     else:r['note']+='; 교과성적은 분포 그림만 공개되어 수치 추정 제외'
     r['source_url']=json.loads((CACHE/(key+'-post.meta.json')).read_text(encoding='utf8'))['url']
     out.append(r)
 save('cha',out)

def shinhan():
 out=[]
 for y in [2024,2025,2026]:
  for rd in ['susi','jeongsi']:
   key=f'shinhan-{y}-{rd}'
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows'];h=[compact(x) for x in rr[0]]
     if '모집단위명' not in h:continue
     u=h.index('모집단위명');q=u+1;n=next(i for i,v in enumerate(rr) if num(v[q]));labs=header_labels(rr,n)
     titles=re.findall(r'([^\s◆▣]+(?:전형|우수자))\s*$',t['before'])
     pg=titles[-1] if titles else ''
     for ri,v in enumerate(rr[n:],n+1):
      if u==1 and v[0]:pg=compact(v[0])
      if not num(v[q]) or not v[u] or re.search('합계|총계',compact(v[u])):continue
      assert pg,(key,p['page'],t['before'])
      typ='실기' if '실기' in pg or '실적' in pg else ('수능' if rd=='jeongsi' else ('논술' if '논술' in pg else ('종합' if any(x in pg for x in ['사회기여','기회균형전형','신한국인']) and '교육' not in pg else '교과')))
      out.append(row(key,'신한대학교',y,'수시' if rd=='susi' else '정시',pg,compact(v[u]),f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[q]),competition_rate=val(v[q+1]),cut_other=pairs(labs[q+2:],v[q+2:]),metric='교과등급' if rd=='susi' else '환산점수',basis='최종등록자',grade_system='9' if rd=='susi' else '',note='draft; 커트라인은 원문 명칭으로 보존(70%컷 아님); 예비는 인원으로 변환하지 않음'))
 save('shinhan',out)

def daejin():
 out=[]
 for y in [2024,2025,2026]:
  for rd in ['susi','jeongsi']:
   key=f'daejin-{y}-{rd}'
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows'];title=t['before'];pgs=re.findall(r'(?:수시모집|정시모집)\s*(.*?)\s*전형\s*결과',title)
     pg=clean(pgs[-1]) if pgs else '일반전형'
     n=next((i for i,v in enumerate(rr) if len(v)>5 and (num(v[3]) or num(v[8] if len(v)>8 else ''))),None)
     if n is None:continue
     labs=header_labels(rr,n);unit=''
     for ri,v in enumerate(rr[n:],n+1):
      if any(compact(x) in ['대학계','전체계','합계','소계','총계'] for x in v[:3]):continue
      if v[1]:unit=compact(v[1])
      if re.search('합계|소계|총계',unit) or unit in ['계','']:continue
      name=unit+('('+compact(v[2])+')' if v[2] else '')
      if '정원외' in title:
       for q,track in [(3,'농어촌학생'),(8,'특성화고교졸업자'),(13,'기초생활/차상위')]:
        if not num(v[q]):continue
        out.append(row(key,'대진대학교',y,'수시',track,name,f'p.{p["page"]} 표{ti+1} 행{ri} 열{q+1}',admission_type='교과',quota=v[q],applicants=val(v[q+1]),competition_rate=val(v[q+2]),fill_count=val(v[q+3]),cut_other=pairs(['학생부 평균'],v[q+4:q+5]),metric='교과등급',basis='최종등록자',grade_system='9'))
      else:
       if not num(v[3]):continue
       labels=labs[6:]
       if y==2026 and rd=='susi':labels=['면접/실기 응시','면접/실기 응시율','학생부 평균','학생부 90%컷']
       f=next((i for i,s in enumerate(labs) if '추합' in compact(s) and '합계' in compact(s)),None)
       typ='수능' if rd=='jeongsi' else ('종합' if '윈윈' in pg else '교과')
       # The source combines academic and practical tracks; retain this distinction explicitly.
       if '실기우수자' in pg:typ='교과/실기'
       out.append(row(key,'대진대학교',y,'수시' if rd=='susi' else '정시',pg,name,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[3]),applicants=val(v[4]),competition_rate=val(v[5]),fill_count=val(v[f]) if f is not None else '',cut_other=pairs(labels,v[6:]),metric='환산점수' if rd=='jeongsi' else '교과등급',basis='최종등록자',grade_system='' if rd=='jeongsi' else '9'))
 save('daejin',out)

def merged_values(rr,n,start,end):
 # A cell spanning multiple department rows belongs to their joint group.
 groups={}
 for j in range(start,end):
  for i in range(n,len(rr)):
   if not val(rr[i][j]):continue
   e=i+1
   while e<len(rr) and rr[e][j] is None:e+=1
   groups.setdefault((i,e),{})[j]=clean(rr[i][j]).replace('\x01','')
 return groups

def ptu():
 out=[]
 for y in [2024,2025,2026]:
  for suffix in ['susi-in','susi-out','jeongsi']:
   key=f'ptu-{y}-{suffix}';regular=suffix=='jeongsi'
   for p in tables(key):
    for ti,t in enumerate(p['tables']):
     rr=t['rows']
     if len(rr[0])<20:continue
     n=next(i for i,v in enumerate(rr[1:],1) if any(num(x) for x in v[3:]));labs=header_labels(rr,n)
     # Track names occupy their own header row in every original.
     ph=next(h for h in rr[:n] if any(re.search('PTU|농어촌|특성화|기초생활|장애인',clean(x)) for x in h))
     unitwidth=next(i for i,x in enumerate(rr[0]) if '정원' in clean(x))
     if y==2024 and regular:ph=rr[1]
     starts=[i for i,x in enumerate(ph) if i>=unitwidth and x]
     units=[]
     for v in rr:
      units.append(next((compact(x) for x in reversed(v[:unitwidth]) if x),''))
     for st,en in zip(starts,starts[1:]+[len(rr[0])]):
      pg=clean(ph[st]);typ='실기' if '실기' in pg else ('수능' if regular else ('종합' if '종합' in pg else '교과'))
      for (a,b),vals in merged_values(rr,n,st,en).items():
       names=list(dict.fromkeys(units[a:b]));names=[x for x in names if x and not re.search('합계|소계|총계',x)]
       if not names:continue
       unit=' / '.join(names);extras=[];kw={}
       for j,v in vals.items():
        label=labs[j]
        if '모집' in compact(label) and '인원' in compact(label):kw['quota']=v
        elif '지원' in compact(label) and '인원' in compact(label):kw['applicants']=v
        elif '경쟁률' in label:kw['competition_rate']=v.split(':')[0].strip()
        elif '충원' in label and '인원' in label:kw['fill_count']=v
        else:extras.append(label+' '+v)
       if not kw and not extras:continue
       out.append(row(key,'평택대학교',y,'정시' if regular else '수시',pg,unit,f'p.{p["page"]} 표{ti+1} 행{a+1}-{b}',admission_type=typ,cut_other='; '.join(extras),metric='환산점수' if regular else '교과등급',basis='최종등록자',grade_system='' if regular else '9',note='draft; '+('공동 셀을 해당 모집단위 묶음으로 보존; ' if b>a+1 else '')+'충원합격 순위는 인원으로 환산하지 않음',**kw))
 save('ptu',out)

def yongin():
 out=[]
 for y in [2024,2025,2026]:
  key=f'yongin-{y}-susi';pg='';rnd='수시'
  for p in tables(key):
   if p['page']<4:continue
   if re.search(r'02\s*정시',p['text']):rnd='정시'
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];title=t['before'].replace('\x01','')
    titles=re.findall(r'[가-하]\.\s*([^\n]*?전형[^\n]*)',title)
    if titles:pg=clean(titles[-1])
    h=[compact(x) for x in rr[0]]
    if '모집단위' not in h:continue
    loc=f'p.{p["page"]} 표{ti+1}'
    if any('충원합격예비순위' in x for x in h):
     st=next(i for i,s in enumerate(h) if '충원합격예비순위' in s);n=4 if '정시' in h[st] else 3;rnd2='정시' if n==4 else '수시';labs=header_labels(rr,n);unit=''
     for ri,v in enumerate(rr[n:],n+1):
      if v[2]:unit=compact(v[2]).replace('\x01','')
      name=unit+('('+compact(v[3])+')' if v[3] else '')
      if re.search('소계|합계|총계',name):continue
      for j in range(st,len(v)):
       if not val(v[j]):continue
       track=compact(rr[n-1][j])
       if not track:continue
       out.append(row(key,'용인대학교',y,rnd2,track,name,loc+f' 행{ri} 열{j+1}',cut_other='충원합격 예비순위 '+clean(v[j]),basis='별도 충원현황표',note='draft; 예비순위는 인원으로 환산하지 않음'))
     continue
    assert pg,(key,p['page'],title)
    typ='실기' if any(x in pg for x in ['체육우수','경기실적']) else ('수능' if rnd=='정시' else ('교과' if '교과성적' in pg else '교과/실기'))
    if '모집인원' in h:
     unitcol=h.index('모집단위');st=h.index('모집인원');units=[compact(v[unitcol]).replace('\x01','') for v in rr]
     for (a,b),vals in merged_values(rr,1,st,len(h)).items():
      names=[s for s in dict.fromkeys(units[a:b]) if s and not re.search('소계|합계|총계',s)]
      if not names:continue
      kw={['quota','applicants','competition_rate'][j-st]:v.split(':')[0].strip() for j,v in vals.items()}
      out.append(row(key,'용인대학교',y,rnd,pg,' / '.join(names),loc+f' 행{a+1}-{b}',admission_type=typ,basis='지원자 현황',note='draft; 공동 모집인원/경쟁률은 공동 모집단위로 보존',**kw))
    else:
     n=2;labs=header_labels(rr,n);st=next((i for i,x in enumerate(rr[1]) if compact(x)=='최고'),None)
     if st is None:continue
     unit=''
     for ri,v in enumerate(rr[n:],n+1):
      if v[0]:unit=compact(v[0]).replace('\x01','')
      name=unit+('('+', '.join(compact(x).replace('\x01','') for x in v[1:st] if x)+')' if any(v[1:st]) else '')
      if re.search('소계|합계|총계',name) or not any(val(x) for x in v[st:]):continue
      # Separate component rows retain the metric to which each 50/70 cut applies.
      for j in range(st,len(v),3):
       if not any(val(x) for x in v[j:j+3]):continue
       metriclabel=labs[j].replace(' / 최고','');metric='백분위' if '백분위' in metriclabel else '환산점수'
       out.append(row(key,'용인대학교',y,rnd,pg,name,loc+f' 행{ri} 열{j+1}',admission_type=typ,cut_50=val(v[j+1]),cut_70=val(v[j+2]),cut_other=metriclabel+' 최고 '+clean(v[j]),metric=metric,basis='최종등록자 / '+metriclabel))
 save('yongin',out)

def eulji():
 out=[]
 for y in [2024,2025,2026]:
  for rd in ['susi','jeongsi']:
   key=f'eulji-{y}-{rd}'
   for p in tables(key):
    if y==2026 and rd=='susi' and p['page']>=12:continue
    for ti,t in enumerate(p['tables']):
     rr=t['rows'];h=[compact(x) for x in rr[0]]
     if '경쟁률' not in h or '모집인원' not in h:continue
     q=h.index('모집인원');c=h.index('경쟁률');f=h.index('충원합격');u=2 if y==2024 else 1
     n=next(i for i,v in enumerate(rr) if num(v[q]));labs=header_labels(rr,n)
     ts=re.findall(r'^\s*\d+\s+([^\n]+)',t['before'],re.M);assert ts,(key,p['page'])
     pg=clean(ts[-1]);pg=re.split(r'\s*\*|\s*\(202[567]학년도',pg)[0]
     typ='수능' if rd=='jeongsi' else ('종합' if '종합' in pg or pg.startswith('EU') or ('사회기여' in pg and y<2026) or (y==2026 and ('기회균형(정원내)' in pg or '특별형' in pg)) else ('논술' if '논술' in pg or (y==2026 and '사회기여' in pg) else '교과'))
     campus=''
     for ri,v in enumerate(rr[n:],n+1):
      if y==2024 and v[0]:campus=compact(v[0])
      if not num(v[q]) or not v[u] or re.search('합계|평균',compact(v[u])):continue
      name=compact(v[u]);camp=campus if y==2024 else ('대전' if any('대전' in clean(x) for x in v[:q]) else ('의정부' if any('의정부' in clean(x) for x in v[:q]) else '성남'))
      if camp not in ['성남','의정부']:continue
      if y==2024:name+='('+camp+')'
      if y>2024 and q>2 and not re.search('의정부|성남',name):name+='('+camp+')'
      cut={}
      for pct in [50,70]:
       indexes=[j for j,s in enumerate(labs) if str(pct)+'%' in s]
       if indexes:
        j=indexes[-1] if rd=='jeongsi' and any('총점' in labs[z] for z in indexes) else indexes[0]
        value=val(v[j]);mt=re.match(r'^\d+(?:\.\d+)?',value)
        cut['cut_'+str(pct)]=mt[0] if mt else ''
      extras=[(lab,v[j]) for j,lab in enumerate(labs) if j>=q and j not in [q,c,f]]
      out.append(row(key,'을지대학교('+camp+')',y,'수시' if rd=='susi' else '정시',pg,name,f'p.{p["page"]} 표{ti+1} 행{ri}',admission_type=typ,quota=val(v[q]),competition_rate=val(v[c]),fill_count=val(v[f]),cut_other=pairs([x[0] for x in extras],[x[1] for x in extras]),metric='교과등급' if rd=='susi' else '환산점수',basis='최종등록자; 지원자·1단계 통계 별도 명시',grade_system='9' if rd=='susi' else '',note='draft; 소수 등록자의 비공개 성적은 보간하지 않음; 정시 괄호 안 백분위는 원문 지표와 함께 cut_other에 보존',**cut))
 save('eulji',out)

def uhs():
 out=[];seen=set()
 lists={y:{a['_id']:a for a in json.loads((CACHE/f'uhs-{y}-list.json').read_text(encoding='utf8'))['aa']} for y in [2024,2025,2026]}
 for f in sorted(CACHE.glob('uhs-detail-[0-9]*.json')):
  d=json.loads(f.read_text(encoding='utf8'))
  for a in d.get('score',{}).get('aa',[]):
   y=a.get('year');id=a['_id'];q=a.get('espcpa_inwon')
   if y not in lists or not num(q) or (id,y) in seen:continue
   seen.add((id,y));l=lists[y].get(id,{});pg=a['ipsiTypeNM'];kw={}
   if l.get('groupInwonRowChk'):continue
   extras=pairs(['등급 최고','등급 평균','등급 최저','환산점수 최고','환산점수 평균','환산점수 최저','추가합격'],[a.get(x) for x in ['leftGrade','avgGrade','rightGrade','leftScore','avgScore','rightScore','addedPass']])
   r=dict.fromkeys(FIELDS,'');r.update(university='협성대학교',result_year=str(y),round='수시',admission_type='실기' if '실기' in pg or '에이블' in pg else '',program=pg,recruit_unit=a['ipsiUnitNM'],quota=clean(q),applicants=clean(l.get('applicant')),competition_rate=val(a.get('basisRatio')),cut_other=extras,metric='교과등급',basis='공식 상담시스템 합격자 성적',grade_system='9',source_url='https://iphak.uhs.ac.kr/ipsi/board/notice/detail.do?bbsNo=33413&ci=4&pageNo=1&title=',source_page=f'{f.name} / score.aa / year={y} / {id}',note='draft; 입학처 공지에서 연결한 https://cs.u-is.co.kr/uhs/ 공개 성적없는 상담; 현행 모집단위 연결 기준의 과거 결과; 현재연도 모집인원(currentIpsiInwon)은 사용하지 않음; 정시는 화면 준비중')
   out.append(r)
 save('uhs',out)

def hsmu():
 out=[];key='hsmu-2025';w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True);s=w.active;y=None;unit='';headers=[]
 for ri,cs in enumerate(s.rows,1):
  v=[c.value for c in cs];txt=clean(v[0]);m=re.match(r'(202[345])학년도 수시',txt)
  if m:y=int(m[1]);headers=[]
  if y not in [2024,2025]:continue
  if not num(v[2]):
   if txt=='학과' or headers:headers.append(v)
   continue
  if v[0]:unit=clean(v[0])
  if re.search('합계|총계',unit):continue
  pg=clean(v[1]);labels=header_labels(headers[:3],3)
  # Workbook uses actual numeric fractions for two cut headers and rates.
  for j in [15,18]:labels[j]=labels[j].replace('0.5','50% cut')
  for j in [16,19]:labels[j]=labels[j].replace('0.7','70% cut')
  extras=pairs(labels[5:],v[5:])
  out.append(row(key,'화성의과학대학교',y,'수시',pg,unit,f'수시 시트 행{ri}',admission_type='실기' if '전공관련' in pg else '교과',quota=clean(v[2]),applicants=clean(v[3]),competition_rate=clean(round(v[4],4)) if isinstance(v[4],(int,float)) else val(v[4]),cut_50=val(v[12]),cut_70=val(v[13]),cut_other=extras,metric='교과등급',basis='등록자; 지원자 평균 별도 명시',grade_system='9',note='draft; 등록률은 원본 소수비율; 50/70%는 학생부 환산등급 기준'))
 key='hsmu-2026';doc=fitz.open(CACHE/(key+'.pdf'));p=doc[0];t=p.find_tables().tables[0];rr=t.extract();units=[w[4] for w in sorted(p.get_text('words'),key=lambda w:w[0]) if w[4].endswith('학과')];starts=[i for i,v in enumerate(rr) if len(v)>3 and compact(v[2])=='(정원내)일반'];assert len(units)==len(starts),(units,starts)
 namebyrow={}
 for i,(a,b) in enumerate(zip(starts,starts[1:]+[len(rr)])):
  for z in range(a,b):namebyrow[z]=units[i]
 labs=header_labels(rr,2)
 for ri,v in enumerate(rr):
  if ri not in namebyrow or not num(v[3]) or not v[2] or '합계' in clean(v[0])+clean(v[1]):continue
  out.append(row(key,'화성의과학대학교',2026,'수시',v[2],namebyrow[ri],f'p.1 표1 행{ri+1}',admission_type='실기' if '전공관련' in v[2] else '교과',quota=v[3],applicants=v[4],competition_rate=v[6],cut_50=val(v[11]),cut_70=val(v[12]),cut_other=pairs(labs[5:],v[5:]),metric='교과등급',basis='등록자',grade_system='9'))
 save('hsmu',out)

def ginue():
 from bs4 import BeautifulSoup
 from normalize_gangwon import html_grid
 out=[]
 def emit(key,y,rnd,pg,loc,**kw):
  out.append(row(key,'경인교육대학교(경기·인천 공통)',y,rnd,compact(pg),'초등교육과',loc,admission_type='교과' if '교과' in pg else ('수능' if rnd=='정시' else '종합'),note='draft; 경기·인천 캠퍼스 공통 선발 자료로 캠퍼스별 배분 불가',**kw))
 for y,key in [(2024,'ginue-susi-post119-file117'),(2025,'ginue-susi-post118-file117'),(2026,'ginue-susi-post117-file117')]:
  if y==2024:ts=[t['rows'] for p in tables(key) for t in p['tables']]
  else:
   sp=BeautifulSoup((CACHE/(key+'-converted.html')).read_text(encoding='utf8'),'html.parser');ts=[html_grid(t) for t in sp.select('table')]
  rnd='';pg=''
  for ri,v in enumerate(ts[0][1:],2):
   if v[0]:rnd='정시' if '정시' in v[0] else ('수시' if '수시' in v[0] else rnd)
   pi=3 if y==2026 else 2
   if not num(v[4]) or not v[pi] or not re.search('전형',v[pi]):continue
   emit(key,y,rnd,v[pi],f'선발인원 표 행{ri}',quota=v[4],applicants=v[5],fill_count=v[7],cut_other='등록인원 '+v[6],basis='선발인원 현황')
  if y==2026:
   pglist=[v[3] for v in ts[0][1:8]]
   for ix,pg in enumerate(pglist):
    score=ts[6+ix*3];dist=ts[7+ix*3]
    for ri,v in enumerate(score[1:],2):
     lab='교과등급' if len(v)==3 else ('교과등급' if v[0]=='등급' else '환산점수')
     emit(key,y,'수시',pg,f'표{7+ix*3} 행{ri}',cut_other=pairs(['최고','평균','최저'],v[-3:]),metric=lab,basis='최종등록자',grade_system='9' if lab=='교과등급' else '')
    for ri,v in enumerate(dist[2:],3):
     if '계' in v[0]:continue
     emit(key,y,'수시',pg,f'표{8+ix*3} 행{ri}',cut_other=pairs(['교과등급 구간','지원자 인원','지원자 비율(%)','최종등록자 인원','최종등록자 비율(%)'],v),metric='교과등급',basis='교과등급 분포',grade_system='9')
   for v in ts[27][2:]:emit(key,y,'정시',v[0],'표28',cut_70=v[3],cut_other=pairs(['최고','평균'],v[1:3]),metric='환산점수',basis='최종등록자')
  else:
   pg='';labs=header_labels(ts[1],2)
   for ri,v in enumerate(ts[1][2:],3):
    if v[0]:pg=clean(v[0])
    if not any(num(x) for x in v[2:]):continue
    emit(key,y,'정시',pg,f'정시성적표 행{ri}',cut_other=pairs(labs[2:],v[2:]),metric='환산점수',basis=clean(v[1]))
 for y,key in [(2024,'ginue-susi-post119-file119'),(2025,'ginue-susi-post118-file119')]:
  if y==2024:
   ts=[]
   for p in tables(key):
    for t in p['tables']:ts.append((t['rows'],t['before']))
  else:
   sp=BeautifulSoup((CACHE/(key+'-converted.html')).read_text(encoding='utf8'),'html.parser');ts=[]
   for t in sp.select('table'):
    before=' '.join(reversed([x.get_text(' ',strip=True) for x in list(t.find_all_previous('p'))[:8]]));ts.append((html_grid(t),before))
  pg=''
  for ti,(rr,before) in enumerate(ts):
   found=re.findall(r'학생부(?:교과|종합)\([^)]*전형\)',before)
   if found:pg=found[-1]
   if not pg:continue
   if compact(rr[0][0])=='교과등급':
    for ri,v in enumerate(rr[2:],3):
     if '계' in clean(v[0]):continue
     emit(key,y,'수시',pg,f'표{ti+1} 행{ri}',cut_other=pairs(['교과등급 구간','지원자 인원','지원자 비율(%)','최종등록자 인원','최종등록자 비율(%)'],v),metric='교과등급',basis='교과등급 분포',grade_system='9')
   elif len(rr[0])==3 and compact(rr[0][0])=='최고':
    emit(key,y,'수시',pg,f'표{ti+1}',cut_other=pairs(['최고','평균','최저'],rr[1]),metric='교과등급',basis='최종등록자',grade_system='9')
 save('ginue',out)

if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8')
 for name in sys.argv[1:]:globals()[name]()
