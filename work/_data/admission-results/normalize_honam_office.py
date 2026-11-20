"""Official Honam workbook results. Keep original fields and publication notes."""
from normalize_buk_office import make,put,hdr,grid,number,positive,grade,score
from normalize_national import *
AUDIT=[];EXTRA=[]

def typ(pg,default='교과'):
 return '종합' if '종합' in pg else '논술' if '논술' in pg else '실기' if any(z in pg for z in ['실기','특기','실적']) else '수능' if '수능' in pg else default

def finish(sl,out):
 save(sl,out);AUDIT.append({'slug':sl,'rows':len(out)});print(sl,len(out))

def kunsan():
 out=[]
 for key,rd in [('kunsan-file4','수시'),('kunsan-file2','정시')]:
  w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  for s in w:
   g=grid(s);h=7;labs=hdr(g,4 if rd=='정시' else 5,h)
   for i,v in enumerate(g[h:],h+1):
    if v[0] not in ['2024','2025','2026']:continue
    ui,q,pg,c70=(3,4,v[1],v[10]) if rd=='수시' else (4,5,v[1]+' '+v[2],v[12])
    if not number(v[q]) or not v[ui] or '합계' in v[ui]:continue
    r=make(key,'국립군산대학교',v[0],rd,pg,v[ui],f'{s.title} 행{i}',labs,v,typ=typ(pg,'종합' if '종합' in s.title else '수능' if rd=='정시' else '교과'),q=v[q],ap=v[q+1],co=v[q+2],c70=c70,metric='교과등급' if rd=='수시' else '환산점수',note='2026 공지의 2024~2026 원문 연도 행만 수록; 소수 등록자 성적 비공개; 충원합격은 인원/순위 구분 미표기이므로 원문에만 보존; 정시 수능등급과 환산점수 별도 보존')
    put(out,r)
 finish('kunsan',out)

def jj():
 out=[]
 for y,key in [(2024,'jj-file4'),(2025,'jj-file3'),(2026,'jj-file2')]:
  w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  for s in w:
   g=grid(s);rd='정시' if '정시' in s.title else '수시';h=next(i for i,v in enumerate(g) if v[0]=='모집전형');labs=hdr(g,h,h+2)
   for i,v in enumerate(g[h+2:],h+3):
    if not number(v[3]) or not v[2] or any(z in v[2] for z in ['합계','소계']):continue
    r=make(key,'전주대학교',y,rd,v[0],v[2],f'{s.title} 행{i}',labs,v,typ=typ(v[0],'수능' if rd=='정시' else '교과'),q=v[3],ap=v[4],co=v[5],c70=v[9],metric='백분위' if rd=='정시' else '교과등급',note='종합 등록생 등급은 본교 교과 산출식 참고값; 2025·2026 등록자 2명 이하 성적 비공개; '+g[1][0][:400])
    r['fill_count']=number(v[6]);put(out,r)
 finish('jj',out)

def scnu():
 out=[]
 for y,key in [(2024,'scnu-file3'),(2025,'scnu-file2'),(2026,'scnu-file1')]:
  s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).worksheets[0];g=grid(s)
  h=next(i for i,v in enumerate(g) if '모집시기' in v);labs=hdr(g,h,h+2)
  rc,uc,pc,q,ap=(0,2,3,4,5) if y==2024 else (1,3,4,5,6)
  fc=17 if y==2024 else 16;c50,c70=(20,21) if y==2024 else (18,19)
  for i,v in enumerate(g[h+2:],h+3):
   if not number(v[q]) or not v[uc] or any(z in v[uc] for z in ['합계','소계']):continue
   rd='수시' if '수시' in v[rc] else '정시' if '정시' in v[rc] else '추가' if '추가' in v[rc] else ''
   if not rd:continue
   pg=v[pc];t=typ(pg,'종합' if any(z in pg for z in ['일반학생','사회다양성','사회배려']) and rd=='수시' else '수능' if rd!='수시' else '교과')
   r=make(key,'국립순천대학교',y,rd,pg,v[uc],f'{s.title} 행{i}',labs,v,typ=t,q=v[q],ap=v[ap],co=v[6] if y==2024 else '',c50=v[c50],c70=v[c70],note='정시도 교과등급 열은 교과등급으로 표시; 수능 백분위 300점 환산 평균은 원문에만 보존; 등록자 1명 이하 성적 비공개; 시트명보다 본문 학년도 우선')
   r['fill_count']=number(v[fc]);put(EXTRA if rd=='추가' else out,r)
 finish('scnu',out)

def jbnu():
 out=[]
 for y,keys in [(2024,['jbnu-che-2024-sub0','jbnu-che-2024-sub1','jbnu-che-2024-sub2']),(2025,['jbnu-che-2025-sub0'])]:
  for key in keys:
   w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
   for s in w:
    g=grid(s);h=next((i for i,v in enumerate(g) if '전형구분' in v),None)
    if h is None:continue
    pc=g[h].index('전형구분');uc=g[h].index('모집단위명')
    end=next(i for i in range(h+1,len(g)) if g[i][pc]!='전형구분');labs=hdr(g,h,end);cl=[compact(x) for x in labs]
    rd='정시' if '정시' in s.title or (y==2024 and key.endswith('sub0')) else '수시';t='수능' if rd=='정시' else '종합' if '종합' in s.title or key.endswith('sub1') else '교과'
    def col(pred):return next((j for j,x in enumerate(cl) if pred(x)),None)
    qc=[j for j,x in enumerate(cl) if x.startswith('모집인원')];q=next((j for j in qc if '최종' in cl[j]),qc[0]);ap=col(lambda x:x=='지원인원');co=col(lambda x:x=='경쟁률');fc=col(lambda x:x=='충원합격등록인원')
    cs={n:col(lambda x:('수능반영점수' in x if rd=='정시' else '학생부등급' in x and '최종등록자' in x) and f'{n}%' in x) for n in [50,70]}
    if y==2024 and rd=='정시':cs={50:None,70:15}
    if y==2024 and t=='종합':cs={50:21,70:22}
    for i,v in enumerate(g[end:],end+1):
     if not number(v[q]) or not v[uc] or any(z in v[uc] for z in ['합계','소계']):continue
     r=make(key,'전북대학교',y,rd,v[pc],v[uc],f'{s.title} 행{i}',labs,v,typ=typ(v[pc],t),q=v[q],ap=v[ap] if ap is not None else '',co=v[co] if co is not None else '',c50=v[cs[50]] if cs[50] is not None else '',c70=v[cs[70]] if cs[70] is not None else '',metric='환산점수' if rd=='정시' else '교과등급',note='전북대 공식 학과 게시판의 입학처 전체 대학 원본; 최초합격자·최종등록자·표준편차·영역별 점수 분리 보존; 순위는 인원으로 변환 안 함')
     if fc is not None:r['fill_count']=number(v[fc])
     put(out,r)
 finish('jbnu',out)

def jnu():
 out=[]
 for y,idx in [(2024,5),(2025,4),(2026,3)]:
  for ai,rd in [(0,'수시'),(1,'정시')]:
   key=f'jnu-main-sub{idx}-att{ai}';s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).worksheets[0];g=grid(s);labs=hdr(g,4,7)
   for i,v in enumerate(g[7:],8):
    q=5 if rd=='수시' else 6
    if not number(v[q]) or not v[4] or any(z in v[4] for z in ['합계','소계']):continue
    rr='추가' if '추가' in v[1] else rd
    cc=next((j for j,x in enumerate(labs) if '수능 반영 점수 70%' in x),None)
    r=make(key,'전남대학교(여수)' if '여수' in v[0] else '전남대학교',y,rr,v[2],v[4],f'{s.title} 행{i}',labs,v,typ=typ(v[2],'수능' if rd=='정시' else '교과'),q=v[q],ap=v[q+1],co=v[q+3],c50=v[17] if rd=='수시' else '',c70=v[18] if rd=='수시' else v[cc] if cc is not None else '',metric='교과등급' if rd=='수시' else '환산점수',note=v[0]+'; 예비순위는 인원으로 변환 안 함; 수능 영역별 등급·백분위·환산점수·총점 별도 보존; '+g[1][0][:300])
    put(EXTRA if rr=='추가' else out,r)
 finish('jnu',out)

def howon():
 out=[]
 for y,idx in [(2024,5),(2025,4),(2026,3)]:
  key=f'howon-board0-sub{idx}';w=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)
  for s in w:
   g=grid(s);stats='등급' in s.title;labs=hdr(g,1,4 if stats else 3)
   for i,v in enumerate(g[4 if stats else 3:],5 if stats else 4):
    if not v[0] or v[0] in ['계','합계','총계'] or v[0].startswith(('※','*')):continue
    unit=v[0]+('('+v[1]+')' if v[1] and v[1]!=v[0] else '')
    for rd in ['수시','정시']:
     indices=[j for j,x in enumerate(g[1]) if rd in x]
     if not indices or not any(positive(v[j]) for j in indices):continue
     ls=[labs[j] for j in indices];vs=[v[j] for j in indices]
     pg='전형 공통(원문 전형 미구분)' if stats else g[0][0]
     q=next((j for j in indices if '모집인원' in compact(labs[j])),None)
     if q is not None and not number(v[q]):continue
     r=make(key,'호원대학교',y,rd,pg,unit,f'{s.title} 행{i}',ls,vs,typ='기타' if stats else typ(pg,'수능' if rd=='정시' else '교과'),q=v[q] if q is not None else '',ap=v[q+1] if q is not None else '',co=v[q+2] if q is not None else '',metric='기타' if stats and rd=='정시' else '교과등급',basis='원문 내신·수능등급 및 경쟁률 표 기준',note='최고·최저·평균은 원문 열로 보존; 성적표에 세부 전형을 임의 지정하지 않음; 충원 열 인원/순위 미구분은 원문 보존')
     put(out,r)
 finish('howon',out)

def chosun():
 out=[]
 for y,idx in [(2024,2),(2025,1),(2026,0)]:
  key=f'chosun-main-sub1-att{idx}-file141'
  if y==2024:grids=[(a['sheet'],[[clean(x) for x in v] for v in a['rows']]) for a in json.loads((CACHE/'chosun-2024-grids.json').read_text(encoding='utf8'))]
  else:grids=[(s.title,grid(s)) for s in openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True)]
  for title,g in grids:
   if '용어' in title:continue
   h=next(i for i,v in enumerate(g) if '모집단위' in v);labs=hdr(g,h,h+2) if y==2024 else hdr(g,0,2);cl=[compact(x) for x in labs]
   ui=3 if y==2024 else 4;pc=1 if y==2024 else 3;q=4 if y==2024 else 5;rc=0 if y==2024 else 1
   for i,v in enumerate(g[h+2:] if y==2024 else g[2:],h+3 if y==2024 else 3):
    if not number(v[q]) or not v[ui] or any(z in v[ui] for z in ['합계','소계']):continue
    rd='수시' if '수시' in v[rc] else '정시' if '정시' in v[rc] else '추가' if '추가' in v[rc] else '기타'
    target='학생부평균등급' if rd=='수시' else '수능환산점수'
    cs={n:next((j for j,x in enumerate(cl) if target in x and f'{n}%' in x),None) for n in [50,70]}
    if y==2024 and rd=='정시':cs={n:next((j for j,x in enumerate(cl) if '수능점수(' in x and f'{n}%' in x),None) for n in [50,70]}
    if '군사' in title and y==2024:cs={n:next((j for j,x in enumerate(cl) if ('수능반영점수' in x if rd!='수시' else '(수시)학생부' in x) and f'{n}%' in x),None) for n in [50,70]}
    pg=(v[rc]+' ' if rd!='수시' else '')+v[pc]
    r=make(key,'조선대학교',y,rd,pg,v[ui],f'{title} 행{i}',labs,v,typ=typ(v[pc],'종합' if '종합' in title or '학종' in title else '수능' if rd!='수시' else '교과'),q=v[q],ap=v[q+1],co=v[7],c50=v[cs[50]] if cs[50] is not None else '',c70=v[cs[70]] if cs[70] is not None else '',metric='교과등급' if rd=='수시' else '환산점수',note='최종등록자 총점 석차순 기준의 성적: 교과등급 단독 순위가 아님; 차수별 최종추가통보번호는 인원 아님; 소수 등록자 비공개')
    put(out if rd in ['수시','정시'] else EXTRA,r)
 finish('chosun',out)

def mokpo():
 out=[];quarantine=[]
 for y in [2024,2025,2026]:
  key=f'mokpo-{y}-jungsi-post-file0';s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).worksheets[0];g=grid(s);pg='';labs=[];source_y=y
  for i,v in enumerate(g):
   if re.match(r'202\d학년도.*전형 결과',v[0]):
    source_y=int(v[0][:4]);pg=re.sub(r'^202\d학년도\s*목포대학교\s*','',v[0]);pg=re.sub(r'\s*(입학)?전형 결과$','',pg);continue
   if v[0]=='대학' and v[1]=='모집단위':
    h=i
    if i and g[i-1][0]=='대학':continue
    end=next(j for j in range(i+1,len(g)) if g[j][0]!='대학');labs=hdr(g,h,end);continue
   if not labs or not number(v[2]) or not v[1] or any(z in v[1] for z in ['합계','소계']):continue
   cc=next((j for j,x in enumerate(labs) if '수능' in x and '등급' in x and '70%' in x),None)
   if cc is None:cc=next((j for j,x in enumerate(labs) if '70%' in x),None)
   r=make(key,'국립목포대학교',y,'정시',pg,v[1],f'{s.title} 행{i+1}',labs,v,typ='기타' if any(z in pg for z in ['성인','재직','청년','평생']) else '수능',q=v[2],ap=v[3],co=v[4],c70=v[cc] if cc is not None else '',metric='수능등급' if cc is not None else '기타',note='충원 최종예비순위는 인원 아님; 90%컷·최고·평균·최저는 원문에 보존; 전문학사 시트 제외')
   if source_y!=y:r['note']+='; 사용 보류: 게시물 2024와 본문 2023 학년도 불일치';quarantine.append(r)
   else:put(out,r)
 for y in [2024,2025,2026]:
  key=f'mokpo-{y}-susi-post-file0';s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).worksheets[0];g=grid(s);pg='';labs=[]
  shared={i for m in s.merged_cells.ranges if m.min_col<=3<=m.max_col and m.max_row>m.min_row for i in range(m.min_row,m.max_row+1)}
  for i,v in enumerate(g):
   if v[0]=='대학' and v[1]=='모집단위':
    if i and g[i-1][0]=='대학':continue
    end=next(j for j in range(i+1,len(g)) if g[j][0]!='대학');labs=hdr(g,i,end);pg=next((z for z in v if '전형' in z and ('학생부' in z or '실기' in z)),v[2]);continue
   if not labs or not number(v[2]) or not v[1] or any(z in v[1] for z in ['합계','소계']):continue
   cc=next((j for j,x in enumerate(labs) if '70%' in x),None)
   note='전체 시트만 사용(전형별 복제 시트 제외); 최종등록자 기준; 90%컷·최고·평균·최저는 별도 원문 보존; 충원합격 최종순위는 인원 아님'
   if i+1 in shared:note+='; 여러 학과 공동 모집인원 '+v[2]+'명: 학과별 quota는 공란, 원문 공통값 보존'
   r=make(key,'국립목포대학교',y,'수시',pg,v[1],f'{s.title} 행{i+1}',labs,v,typ=typ(pg),q='' if i+1 in shared else v[2],ap=v[3],co=v[4],c70=v[cc] if cc is not None else '',note=note)
   put(out,r)
 finish('mokpo',out);save('honam-mokpo-year-quarantine',quarantine)

if __name__=='__main__':
 for f in [kunsan,jj,scnu,jbnu,jnu,howon,chosun,mokpo]:
  if not sys.argv[1:] or f.__name__ in sys.argv[1:]:f()
 save('honam-extra-round',EXTRA)
 (CACHE/'honam-office-audit.json').write_text(json.dumps(AUDIT,ensure_ascii=False,indent=2),encoding='utf8')
