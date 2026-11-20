"""Selected official PDF tables, with source rows and all original statistics."""
from normalize_honam_office import *
from normalize_buk_pdf import header,rows
import fitz

def nambu():
 out=[]
 for y in [2024,2025,2026]:
  for rd,tag in [('수시','susi'),('정시','jungsi')]:
   key=f'nambu-{y}-{tag}'
   for p in tables(key):
    for ti,t in enumerate(p['tables'],1):
     raw=t['rows'];tx=compact(''.join(str(x or '') for v in raw[:4] for x in v))
     if '모집인원' not in tx or '경쟁률' not in tx:continue
     h=next((i for i,v in enumerate(raw) if any(number(clean(x)) for x in v[1:4])),None)
     if h is None:continue
     g=rows(raw,h,cols=(0,));labs=header(raw,h);pg=next((clean(x) for v in raw[:h] for x in v if x and ('전형)' in x or '가족)' in x)),'일반학생전형')
     expected=10 if rd=='수시' and y==2026 else 7 if rd=='수시' else {2024:8,2025:11,2026:14}[y]
     assert len(raw[0])==expected,(key,ti,len(raw[0]))
     for ri,v in g:
      uc,q=(0,1) if rd=='수시' else (1,2)
      if not number(v[q]) or not v[uc] or '합계' in v[uc]:continue
      c50=v[7] if rd=='수시' and y==2026 else v[11] if rd=='정시' and y==2026 else ''
      c70=v[8 if y==2026 else 5] if rd=='수시' else v[12] if y==2026 else v[9] if y==2025 else ''
      r=make(key,'남부대학교',y,rd,(v[0]+' ' if rd=='정시' else '')+pg,v[uc],f'p.{p["page"]} 표{ti} 행{ri}',labs,v,typ='교과' if rd=='수시' else '수능',q=v[q],ap=v[q+1],co=v[q+2],c50=c50,c70=c70,metric='교과등급' if rd=='수시' else '환산점수',note='가산점·면접·비교과 제외 교과등급; 충원발표순위는 마지막 충원합격자 예비번호; 정시 교과·수능 환산점수 각각 원문 보존')
      put(out,r)
 finish('nambu',out)

def woosuk():
 out=[];other=[]
 for y,key in [(2024,'woosuk-result161'),(2025,'woosuk-result159'),(2026,'woosuk-result157')]:
  for p in tables(key):
   rd='정시' if '신입학 정시' in p['text'] else '수시'
   for ti,t in enumerate(p['tables'],1):
    raw=t['rows'];h=next(i for i,v in enumerate(raw) if len(v)>3 and number(clean(v[3])));labs=header(raw,h)
    for ri,v in rows(raw,h,(0,1,2)):
     if not number(v[3]) or not v[2] or '합계' in v[2]:continue
     gradecol=next((j for j,x in enumerate(labs) if '등급' in x and '70%' in x),None)
     convcol=next((j for j,x in enumerate(labs) if '환산' in x and '70%' in x),None)
     cc=gradecol if rd=='수시' else convcol
     r=make(key,'우석대학교(진천)' if '진천' in v[1] else '우석대학교(전주)',y,rd,v[0].replace('_',''),v[2],f'p.{p["page"]} 표{ti} 행{ri}',labs,v,typ=typ(v[0],'수능' if rd=='정시' else '교과'),q=v[3],co=v[4],c70=v[cc] if cc is not None else '',metric='교과등급' if rd=='수시' else '환산점수',note='원문 캠퍼스구분 사용; 충원합격순위는 인원 아님; 연도별 평균·70% 열 순서 차이 반영')
     put(other if '진천' in v[1] else out,r)
 finish('woosuk-jeonju',out);save('honam-woosuk-jincheon-reference',other)

def honam():
 out=[]
 for y,idx1,idx2 in [(2024,160,159),(2025,157,156),(2026,153,152)]:
  for rd,idx in [('수시',idx1),('정시',idx2)]:
   key=f'honam-result{idx}-file147';doc=fitz.open(CACHE/(key+'.pdf'))
   for pn,page in enumerate(doc,1):
    ts=list(page.find_tables());pg=''
    for ti,t in enumerate(ts,1):
     raw=t.extract()
     if any('전형유형' in str(x) for v in raw for x in v):
      pg=next(clean(v[-1]) for v in raw if '전형유형' in str(v));continue
     if not raw or '모집단위' not in compact(raw[0][0]):continue
     assert pg,(key,pn)
     h=3 if rd=='수시' else 2;labs=header(raw,h);q=next(j for j,x in enumerate(labs) if '모집' in x and '인원' in x);rc=next(j for j,x in enumerate(labs) if '등록' in x and '인원' in x)
     c50=next((j for j,x in enumerate(labs) if '50%' in x),None);c70=next((j for j,x in enumerate(labs) if '70%' in x),None)
     for ri,z in enumerate(raw[h:],h):
      if not z[0] or any(w in compact(z[0]) for w in ['합계','소계']):continue
      units=z[0].splitlines();qs=clean(z[q]).split(' ')
      numeric_lines=(z[q] or '').splitlines()
      vals=[]
      if len(units)>1 and len(numeric_lines)==len(units):
       # PDF row groups have no horizontal rules. Align each cell's words to department baselines.
       cells=t.rows[ri].cells;uw=page.get_text('words',clip=cells[0]);ys=sorted(set(round((w[1]+w[3])/2,1) for w in uw));centers=[]
       for yy in ys:
        if not centers or yy-centers[-1]>3:centers.append(yy)
       assert len(centers)==len(units),(key,pn,ri,units,centers)
       vals=[['']*len(z) for _ in units]
       for j,bbox in enumerate(cells):
        if not bbox:continue
        for word in page.get_text('words',clip=bbox):
         target=min(range(len(centers)),key=lambda k:abs(centers[k]-(word[1]+word[3])/2));vals[target][j]+=(' ' if vals[target][j] else '')+word[4]
       for i,u in enumerate(units):vals[i][0]=u
      else:vals=[[clean(x) for x in z]]
      for si,v in enumerate(vals,1):
       if not number(v[q]):continue
       program=v[-1] if rd=='수시' and '비고' in labs[-1] and v[-1] else pg
       ca=v[c50] if c50 is not None else '';cb=v[c70] if c70 is not None else '';note='충원합격 예비후보 순위는 원문 보존; 정시 수능백분위 합산값을 100점 백분위로 바꾸지 않음'
       if rd=='수시' and (any('평균등급' in x for x in v[q+3:]) or (y>=2025 and number(v[rc]) and float(v[rc])<=4)):
        ca=cb='';note+='; 등록인원 4명 이하 등 원문 평균등급 공개: 50%·70%컷 공란, 원문 값은 평균으로 해석'
       if len(units)>1 and len(vals)==1:note+='; 복수 모집단위 묶음 통계: 개별 학과에 수치 복제하지 않음'
       put(out,make(key,'호남대학교',y,rd,program,v[0],f'p.{pn} 표{ti} 행{ri+1} 항목{si}',labs,v,typ=typ(program,'수능' if rd=='정시' else '교과'),q=v[q],ap=v[q+1],co=v[q+2],c50=ca,c70=cb,metric='교과등급' if rd=='수시' else '기타',note=note))
 finish('honam',out)

def yewon():
 out=[]
 for y,rd,key in [(2025,'수시','yewon-2025-susi2'),(2026,'수시','yewon-susi2-pdf'),(2026,'정시','yewon-jeongsi2-pdf')]:
  raw=tables(key)[0]['tables'][0]['rows'];labs=header(raw,3);uc=1 if rd=='정시' else 0
  for ri,v in rows(raw,3,(0,)):
   unit=re.sub(r'\(2027.*','',compact(v[uc]))
   if not any(z in unit for z in ['게임애니메이션','스포츠융합']):continue
   q=uc+1
   put(out,make(key,'예원예술대학교(전북희망)',y,rd,('' if rd=='수시' else v[0]+' ')+'일반전형',unit,f'p.1 표1 행{ri}',labs,v,typ='실기' if '실기' in v[-2] else '교과',q='' if y==2025 else v[q],ap='' if y==2025 else v[q+1],co=v[1] if y==2025 else v[q+2],basis='최초합격자·최종합격자',note='공식 모집요강의 전북희망캠퍼스 학과만 수록; 최초 최고·최저·평균 및 최종 최저등급 별도 보존; 경기드림 기존 데이터 유지'))
 finish('yewon-imsil',out)

def mmu():
 out=[]
 for y,idx in [(2024,4),(2025,3),(2026,2)]:
  key=f'mmu-office-more25-result{idx}-pdf';rd='수시';unit=''
  for p in tables(key):
   if '정시모집' in p['text']:rd='정시'
   for ti,t in enumerate(p['tables'],1):
    raw=t['rows'];labs=header(raw,2);q=next(j for j,x in enumerate(labs) if '모집' in x and '인원' in x)
    for ri,z in enumerate(raw[2:],3):
     if z[1]:unit=compact(z[1])
     pg=clean(z[2])
     if not pg or pg.endswith('계') or any(w in pg for w in ['합계','소계']):continue
     pgs=re.sub(r'\n(?=\()', '',z[2]).splitlines();n=len(pgs);columns=[]
     if q==4 and z[3]:
      genders=z[3].splitlines();expanded=[];gi=-1
      for gender in genders:
       if gender in ['남','-']:gi+=1
       assert 0<=gi<len(pgs),(key,pgs,genders)
       expanded.append(pgs[gi]+('('+gender+')' if gender!='-' else ''))
      assert gi==len(pgs)-1,(key,pgs,genders)
      pgs=expanded;n=len(pgs)
     for j,x in enumerate(z):
      parts=(x or '').splitlines()
      if j>=q and n>1:
       assert len(parts) in [0,n],(key,p['page'],ri,j,n,parts)
       columns.append(parts or ['']*n)
      else:columns.append([clean(x)]*n)
     for a,program in enumerate(pgs):
      v=[cs[a] for cs in columns];v[1]=unit;v[2]=program
      if not number(v[q]):continue
      put(out,make(key,'국립목포해양대학교',y,rd,program,unit,f'p.{p["page"]} 표{ti} 행{ri} 항목{a+1}',labs,v,typ='교과' if rd=='수시' else '수능',q=v[q],ap=v[q+1],co=v[q+3],metric='교과등급' if rd=='수시' else '기타',basis='최종합격자',note='평균과 하위30%평균을 별도 보존; 하위30%평균은 70%컷이 아님; 충원합격 예비번호는 인원 아님; 학과·학부 합계 행 중복 수록 제외'))
 finish('mmu',out)

def jesus():
 out=[];key='jesus-office-more1-result0-pdf';ts=tables(key)[0]['tables'];raw=ts[0]['rows']
 starts=[3,6,9,10]
 for y,vc,pc,fc in [(2024,3,1,8),(2025,4,1,9),(2026,7,5,10)]:
  for st in starts:
   end=next((n for n in starts if n>st),len(raw));pg=re.sub(r'\(\d+명\)','',clean(raw[st][pc]));vv=raw[st:end];c50=next((clean(v[vc]).split(' ')[0] for v in vv if v[2]=='50%'),'');c70=next((clean(v[vc]).split(' ')[0] for v in vv if v[2]=='70%'),'');co=next((clean(v[vc]) for v in vv if v[2]=='경쟁률'),'')
   labs=['학부','전형 및 모집인원 원문','50% 등급(환산)','70% 등급(환산)','경쟁률','후보순위'];vals=['간호학부',clean(raw[st][pc]),next((clean(v[vc]) for v in vv if v[2]=='50%'),''),next((clean(v[vc]) for v in vv if v[2]=='70%'),''),co,clean(raw[st][fc])]
   q=re.search(r'\((\d+)명\)',clean(raw[st][pc]))
   r=make(key,'예수대학교',y,'수시',pg,'간호학부',f'p.1 표1 행{st+1}~{end} {y}열',labs,vals,typ='교과',q=q[1] if q and y==2026 else '',co=co,c50=c50,c70=c70,note='2026 공지 안의 2024·2025·2026 연도별 성적 열; 과년도 공통 전형명 셀 모집인원은 연도 귀속 불명확해 quota 공란; 후보순위는 인원 아님')
   if y==2026:
    match=ts[2]['rows'][1+starts.index(st)];r['applicants']=number(clean(match[4]));r['cut_other']+='; 2026등록현황='+pairs(header(ts[2]['rows'],1),[clean(x) for x in match])
   put(out,r)
 reg=ts[1]['rows']
 for y,j in [(2024,9),(2025,10),(2026,11)]:
  labs=['경쟁률','후보순위'];vals=[clean(reg[-1][j]),clean(reg[2][j])]
  if y==2026:
   for i in range(2,5):labs+=['영역별 '+clean(reg[i][2])];vals+=[' / '.join(clean(x) for x in reg[i][3:9])]
  put(out,make(key,'예수대학교',y,'정시','다군 일반전형','간호학부',f'p.1 표2 {y}열',labs,vals,typ='수능',q='21' if y==2026 else '',ap='77' if y==2026 else '',co=vals[0],c50=reg[2][7] if y==2026 else '',c70=reg[2][8] if y==2026 else '',metric='환산점수',note='정시 점수·영역별 성적은 2026에만 귀속; 과년도에는 연도가 명시된 경쟁률·후보순위만 수록'))
 finish('jesus',out)

if __name__=='__main__':
 for f in [nambu,woosuk,honam,yewon,mmu,jesus]:
  if not sys.argv[1:] or f.__name__ in sys.argv[1:]:f()
