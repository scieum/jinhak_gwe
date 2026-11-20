from normalize_national import *

def display(c):
 v=c.value
 if isinstance(v,(int,float)):
  fmt=c.number_format.split(';')[0]
  if '%' in fmt:
   m=re.search(r'0\.([0#]+)',fmt);return f'{v*100:.{len(m[1]) if m else 0}f}%'
  m=re.search(r'0\.([0]+)',fmt)
  if m:return f'{v:.{len(m[1])}f}'
 return val(v)
def grid(s):
 out=[[display(c) for c in r] for r in s]
 for m in s.merged_cells.ranges:
  for i in range(m.min_row-1,m.max_row):
   for j in range(m.min_col-1,m.max_col):out[i][j]=out[m.min_row-1][m.min_col-1]
 return out
def heads(g,indices):
 return [' / '.join(dict.fromkeys(g[i][j] for i in indices if g[i][j])) for j in range(len(g[0]))]

def knu():
 out=[]
 for y in [2025,2026]:
  key=f'knu-{y}';w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  for s in w:
   if not re.match(r'\d+\.',s.title):continue
   g=grid(s);labs=heads(g,[3,4]);q=next(j for j,x in enumerate(g[4]) if compact(x)=='모집인원');rd='정시' if '정시' in s.title else '수시';uc=2 if rd=='정시' else 1
   pg=re.sub(r'^\d+\.','',s.title);college=''
   typ='수능' if rd=='정시' else ('논술' if '논술' in pg else '실기' if '실기' in pg else '종합' if '종합' in pg else '교과')
   target='입학자반영점수' if rd=='정시' else '입학자학생부등급'
   cuts={}
   for j,l in enumerate(labs):
    if compact(l).startswith(target):
     for n in [50,70]:
      if g[4][j] in [str(n)+'%',str(n/100)]:cuts[n]=j
   for i in range(5,s.max_row):
    raw=[display(c) for c in s[i+1]]
    if raw[0]:college=compact(raw[0])
    if not num(raw[q]) or not g[i][uc] or '합계' in compact(g[i][uc]):continue
    unit=compact(g[i][uc]);program=pg
    if rd=='정시':program=compact(g[i][1])+' '+pg
    if rd=='수시' and unit=='모바일공학과' and '일반학생' in pg:program='학생부종합(모바일과학인재)'
    c50=raw[cuts[50]] if 50 in cuts else '';c70=raw[cuts[70]] if 70 in cuts else ''
    # Some registration groups have 1~2 entrants and no public score.
    c50=c50 if num(c50) else '';c70=c70 if num(c70) else ''
    fillcol=next((j for j,x in enumerate(g[4]) if compact(x)=='추합인원'),None)
    univ='경북대학교(상주)' if college in ['생태환경대학','과학기술대학'] else '경북대학교(대구)'
    out.append(row(key,univ,y,rd,program,unit,f'{s.title} 행{i+1}',admission_type=typ,quota=raw[q],applicants=raw[q+1],competition_rate=raw[q+2],fill_count=raw[fillcol] if fillcol is not None else '',cut_50=c50,cut_70=c70,cut_other=pairs(labs[q+3:],raw[q+3:]),metric='환산점수' if rd=='정시' else '교과등급',basis='입학자; 표별 산출기준',grade_system='' if rd=='정시' else '9',note='draft; 단과대학 '+college+'; '+clean(' '.join(str(c.value or '') for c in s[3]))+'; 평균·백분위합·백분위평균·환산점수 별도 보존'))
 save('knu',out)
 # The four-year special-admission workbook is a pooled statistic, not annual data.
 pooled=[];w=openpyxl.load_workbook(CACHE/'knu-4years.xlsx',data_only=True)
 for s in w:
  for i,v in enumerate(s.values,1):
   if i>=5 and len(v)>7 and num(v[3]):pooled.append({'period':'2023~2026 합산','sheet':s.title,'row':i,'program':v[0],'college':v[1],'unit':v[2],'quota':v[3],'applicants':v[4],'registered':v[5],'grade_mean':v[6],'grade_85':v[7]})
 (CACHE/'knu-pooled-special-results.json').write_text(json.dumps(pooled,ensure_ascii=False,indent=2),encoding='utf8')

def kumoh():
 merged={}
 for pub,key in [(2026,'kumoh-2024-2026'),(2025,'kumoh-2025'),(2024,'kumoh-2024')]:
  w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  for s in w:
   g=grid(s);hy=next(i for i,v in enumerate(g) if v[0]=='전형명');h=hy+2;rd='정시' if '정시' in s.title else '수시';labs=heads(g,[h-1,h]);pg=''
   starts=[j for j,c in enumerate(s[hy+1]) if re.fullmatch('202[456]학년도',clean(c.value))]
   for i in range(h+1,s.max_row):
    raw=[display(c) for c in s[i+1]]
    if raw[0]:pg=raw[0]
    if not raw[1] or '합계' in raw[1]:continue
    for st in starts:
     y=int(g[hy][st][:4]);en=next((j for j in range(st+1,len(raw)) if clean(s.cell(hy+1,j+1).value).endswith('학년도')),len(raw))
     if not num(raw[st]):continue
     k=(y,rd,pg,raw[1]);stats=pairs(labs[st+3:en],raw[st+3:en])
     note='draft; 85%컷을 70%컷으로 변경하지 않음; 원문 출간연도별 반영기준이 다른 통계는 구분하여 보존'
     if k not in merged:
      merged[k]=row(key,'국립금오공과대학교',y,rd,pg,raw[1],f'{s.title} 행{i+1}',admission_type='수능' if rd=='정시' else '종합' if '종합' in s.title else '교과',quota=raw[st],applicants=raw[st+1],competition_rate=raw[st+2],metric='백분위' if rd=='정시' else '교과등급',basis='입학자; 출간연도별 반영기준',grade_system='' if rd=='정시' else '9',note=note,cut_other='')
     r=merged[k]
     # Every published variant remains explicitly dated instead of overwriting a score.
     r['cut_other']+=(' | ' if r['cut_other'] else '')+f'[{pub}년 공개자료] '+stats
     r['note']+=f'; {pub}년 원문 {key}/{s.title} 행{i+1}'
     if pub==y and rd=='정시':r['note']+='; 해당학년도 모집군 '+raw[3]+'; 수능반영유형 '+raw[2]
 save('kumoh',list(merged.values()))

def yu():
 out=[]
 for y in [2024,2025,2026]:
  for rd,round_ in [('susi','수시'),('jeongsi','정시')]:
   key=f'yu-{y}-{rd}';w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
   for s in w:
    g=grid(s);labs=heads(g,[3,4]);distribution='분포' in g[3][8]
    for i in range(5,s.max_row):
     v=[display(c) for c in s[i+1]]
     if not v[1] or not num(v[3]) or '합계' in v[1]:continue
     out.append(row(key,'영남대학교',y,round_,v[2],compact(v[1]),f'{s.title} 행{i+1}',admission_type='수능' if rd=='jeongsi' else '종합' if distribution else '교과',quota=v[3],applicants=v[4],competition_rate=v[5],fill_count=v[7],cut_other=pairs(labs[6:7]+labs[8:],v[6:7]+v[8:]),metric='환산점수' if rd=='jeongsi' else '교과등급',basis='입학자; 원문 학년도별 반영방법',grade_system='' if rd=='jeongsi' else '9',note='draft; 85%컷 원문 보존; '+('교과성적은 그림으로 공개된 분포만 존재하므로 숫자 컷 추정 안 함; 원문 그림 별도 보존' if distribution else clean(s.cell(2,1).value))))
 save('yu',out)

def dcu():
 out=[]
 def add(key,y,rd,pg,unit,loc,q,app,co,stats,note=''):
  typ='수능' if rd=='정시' else '실기' if '실기' in pg else '종합' if ('종합' in pg or 'SW' in pg or (y==2024 and '가톨릭지도자' in pg)) else '교과'
  out.append(row(key,'대구가톨릭대학교',y,rd,pg,compact(unit),loc,admission_type=typ,quota=q if num(q) else '',applicants=app if num(app) else '',competition_rate=co if num(co) else '',cut_other=stats,metric='백분위합' if rd=='정시' else '교과등급',basis=f'{y} 최종등록자; {y+1}학년도 반영방법 재산출',grade_system='' if rd=='정시' else '9',note=f'draft; {y+1}학년도 모집단위 기준; 85%컷 원문 보존; 최종합격후보는 순위; '+note))
 for y in [2024,2025]:
  key=f'dcu-{y}-susi'
  for page in json.loads((CACHE/(key+'.tables.json')).read_text(encoding='utf8')):
   for tn,t in enumerate(page['tables'],1):
    rs=t['rows']
    if len(rs[0])!=14 or '(수시)' not in str(rs[0][0]):continue
    pg=clean(rs[0][0]).replace('(수시)','전형')
    for i,raw in enumerate(rs[2:],3):
     for st in [0,7]:
      v=[clean(x) for x in raw[st:st+7]]
      if not v[0] or not any(num(x) for x in v[1:6]):continue
      add(key,y,'수시',pg,v[0],f"p{page['page']} 표{tn} 행{i}",*v[1:4],pairs(['평균등급','85%컷','최종합격후보'],v[4:7]))
 key='dcu-2026-susi-xlsx';s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).active
 common={};groups={19:'글로벌비즈니스대학',34:'바이오헬스융합대학',25:'공과대학',45:'사회과학대학'}
 for hp,lo,hi,starts in [(10,12,70,[1,8,15,22]),(75,77,98,[1,8,15])]:
  for i in range(lo,hi+1):
   raw=[display(c) for c in s[i]]
   for st in starts:
    if not num(raw[st+1]):continue
    pg=clean(s.cell(hp,st+1).value);unit=raw[0];note=''
    if hp==10 and st==8 and int(float(raw[st+1])) in groups:
     unit=groups[int(float(raw[st+1]))];k=unit
     if k in common:
      assert common[k]['values']==raw[st+1:st+7]
      common[k]['record']['note']+='; 참고 소속학과 '+raw[0];continue
     note='2026 단과대학 통합모집; 반복 게재된 학과별 통계는 1회만 수록; 참고 소속학과 '+raw[0]
    add(key,2026,'수시',pg,unit,f'{s.title} 행{i}',*raw[st+1:st+4],pairs(['평균등급','85%컷','최종합격후보'],raw[st+4:st+7]),note)
    if note:common[k]={'values':raw[st+1:st+7],'record':out[-1]}
 for y in [2024,2025,2026]:
  key=f'dcu-{y}-jeongsi';q=4 if y==2026 else 3
  for page in json.loads((CACHE/(key+'.tables.json')).read_text(encoding='utf8')):
   for tn,t in enumerate(page['tables'],1):
    rs=t['rows']
    if len(rs[0])!=(12 if y==2026 else 10):continue
    blocks=[]
    for i,raw in enumerate(rs[3:],4):
     if raw[0]:blocks.append([])
     if blocks:blocks[-1].append((i,[clean(x) for x in raw]))
    for block in blocks:
     unit=block[0][1][0].split('단과대학')[0].strip();countrows=[(i,v) for i,v in block if num(v[q])]
     if not countrows:continue
     stats=[]
     for j,label in enumerate(['백분위합 평균','백분위합 85%컷']+(['환산점수 평균(400점 기준; 의약계열 원문 별도 산식)'] if y==2026 else [])+['영어 평균등급'],q+4):
      values=list(dict.fromkeys(v[j] for i,v in block if v[j] and v[j]!='-'))
      if values:stats.append(label+'='+','.join(values))
     members=', '.join(v[1] for i,v in block if v[1] and v[1]!='-');loc=f"p{page['page']} 표{tn} 행{block[0][0]}"
     if len(countrows)==1:
      i,v=countrows[0];add(key,y,'정시','정시 일반',unit,loc,*v[q:q+3],' | '.join(stats+[f'최종합격후보={v[q+3]}']),f'소속학과 {members}; 표기 모집군은 차년도 기준')
     else:
      for i,v in countrows:
       add(key,y,'정시','정시 일반',v[1] or unit,f"p{page['page']} 표{tn} 행{i}",*v[q:q+3],f'최종합격후보={v[q+3]}',f'{unit} 통합 성적은 별도 행; 소속학과별 모집·지원만 개별 기록')
      if stats:add(key,y,'정시','정시 일반(통합성적)',unit,loc,'','','',' | '.join(stats),f'소속학과 {members}; 원문에서 여러 학과에 걸쳐 병합된 성적; 모집인원 합산 안 함')
 save('dcu',out)

def daegu():
 out=[]
 for y in [2024,2025,2026]:
  key=f'daegu-{y}-susi';s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).active;g=grid(s)
  hp=12 if y==2026 else 14;hh=hp+4;labs=heads(g,[hp+2,hp+3,hh]);starts=[j for j,c in enumerate(s[hp+1]) if j>=3 and c.value]
  for i in range(hh+1,s.max_row):
   raw=[display(c) for c in s[i+1]]
   if not raw[1] or '합계' in raw[1]:continue
   for k,st in enumerate(starts):
    en=starts[k+1] if k+1<len(starts) else len(raw)
    if g[hp+1][st+1]!=str(y) or not num(raw[st+1]):continue
    pg=g[hp][st]
    out.append(row(key,'대구대학교',y,'수시',pg,compact(raw[1]),f'{s.title} 행{i+1}',admission_type='종합' if '종합' in pg else '교과',quota=raw[st+1],competition_rate=raw[st+2],cut_other=pairs(labs[st+3:en],raw[st+3:en]),metric='교과등급',basis=f'{y} 최종등록자; {y+1}학년도 반영방법 재산출',grade_system='9',note=f'draft; {y+1}학년도 모집단위 기준; 85%컷 원문 보존; 추가합격순위는 충원인원이 아님'))
  key=f'daegu-{y}-jeongsi';s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).active;g=grid(s)
  hh=17 if y==2026 else 5;labs=heads(g,[hh-2,hh-1,hh]);q=7 if y==2026 else 14
  for i in range(hh+1,s.max_row):
   raw=[display(c) for c in s[i+1]]
   if not num(raw[q]) or not g[i][1] or '합계' in g[i][1]:continue
   unit=compact(g[i][1]);member=compact(raw[2])
   # A merged next-year unit can contain distinct prior-year major results.
   same=[k for k in range(hh+1,s.max_row) if g[k][1]==g[i][1] and num(display(s.cell(k+1,q+1)))]
   if len(same)>1 and member and member!='-':unit=member
   stats=pairs(labs[9:14],raw[9:14]) if y==2026 else pairs(labs[7:14]+labs[16:17],raw[7:14]+raw[16:17])
   out.append(row(key,'대구대학교',y,'정시','수능(일반전형)',unit,f'{s.title} 행{i+1}',admission_type='수능',quota=raw[q],competition_rate=raw[q+1],cut_other=stats,metric='환산점수',basis=f'{y} 최종등록자; {y+1}학년도 반영방법 재산출',note=f'draft; {y+1}학년도 모집단위 기준; 소속학과 {member}; 차년도 모집군을 해당연도 군으로 사용하지 않음; 85%컷 원문 보존'))
 save('daegu',out)

if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8')
 for arg in sys.argv[1:]:globals()[arg]()
