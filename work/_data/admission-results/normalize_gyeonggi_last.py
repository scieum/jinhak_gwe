from normalize_gyeonggi import *
from bs4 import BeautifulSoup
from normalize_gangwon import html_grid

def kyungdong_yangju():
 import normalize_gangwon as gw
 import inspect
 src=inspect.getsource(gw.kyungdong).replace("if '원주' not in campus and '고성' not in campus:continue","if '양주' not in campus:continue").replace("'경동대학교('+('원주문막' if '원주' in campus else '고성')+')'","'경동대학교(양주)'").replace("save('kyungdong',out)","save('kyungdong-yangju',out)")
 env=dict(gw.__dict__);exec(src,env);env['kyungdong']()

def jbu():
 out=[]
 key='jbu-2025-guide'
 for p in tables(key)[68:70]:
  for t in p['tables']:
   rr=t['rows'];campus='';unit=''
   for ri,v in enumerate(rr[4:],5):
    if v[0]:campus=compact(v[0])
    if v[1]:unit=compact(v[1])
    if '고양' not in campus:continue
    un=unit+(' '+compact(v[2]) if v[2] else '')
    for st in [3,9]:
     if not num(v[st]):continue
     pg=rr[0][st]
     out.append(row(key,'중부대학교(고양)',2024,'수시',pg,un,f'p.{p["page"]} 행{ri}',admission_type='실기' if '실기' in pg else '교과',quota=v[st],applicants=v[st+1],competition_rate=v[st+2],cut_70=val(v[st+5]),cut_other=pairs(['충원후보순위','최종등록자 평균'],v[st+3:st+5]),metric='교과등급',basis='2024 최종등록자 성적을 2025 학생부 반영방법으로 재산출',grade_system='9',note='draft; 공식 2025 수시모집요강 p.69~70; 2025 모집단위 기준 명칭; 당시 원점수와 재산출 점수를 구분'))
 for key,y in [('jbu-2025-susi',2025),('jbu-susi',2026)]:
  sp=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser');t=sp.select('table')[0];rr=html_grid(t)
  for ri,v in enumerate(rr[4:],5):
   if '고양' not in v[0]:continue
   unit=' '.join(dict.fromkeys(v[1:3]))
   for st in [3,9,15,21]:
    if not num(v[st]):continue
    pg=rr[0][st]
    out.append(row(key,'중부대학교(고양)',y,'수시',pg,unit,f'HTML 표1 행{ri}',admission_type='실기' if '실기' in pg else '교과',quota=v[st],applicants=v[st+1],competition_rate=v[st+2],cut_other=pairs(['충원합격예비순위','학생부평균','학생부'+rr[3][st+5]],v[st+3:st+6]),metric='교과등급',basis='최종등록자',grade_system='9',note='draft; 공식 공개페이지의 산출기준; 평균·최저/100%컷을 70%컷으로 바꾸지 않음'))
 key='jbu-jeongsi';sp=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser');ix=0
 for ti,t in enumerate(sp.select('table'),1):
  rr=html_grid(t)
  if not rr or '캠퍼스' not in rr[0]:continue
  pg=['수능우수자전형','사범계전형','실기우수자전형'][ix];ix+=1;q=rr[0].index('모집 인원');labs=[' '.join(dict.fromkeys([rr[0][j],rr[1][j]])) for j in range(len(rr[0]))]
  for ri,v in enumerate(rr[2:],3):
   if '고양' not in v[0] or not num(v[q]):continue
   unit=' '.join(dict.fromkeys(v[1:q-1]))
   out.append(row(key,'중부대학교(고양)',2026,'정시',pg,unit,f'HTML 표{ti} 행{ri}',admission_type='실기' if ix==3 else '수능',quota=v[q],applicants=v[q+1],competition_rate=v[q+2],cut_other=pairs(labs[q+3:],v[q+3:]),metric='기타',basis='2026 최종등록자 성적을 2027 반영방법으로 재산출',note='draft; 원문 모집군은 2027 계획으로 2026 모집군으로 저장하지 않음; 백분위·환산점수 구분은 cut_other 원문 열명'))
 save('jbu',out)

def dyu():
 out=[];allowed=set()
 for p in tables('dyu-2024-susi')[1:]:
  allowed.update(compact(v[1]) for v in p['tables'][0]['rows'][2:] if v[1])
 allowed.update(['보건행정학과','철도시스템공학과','안전공학부','연기예술학과','영상미디어학과','연기예술학과영상미디어학과'])
 for y,rnd,key in [(2024,'수시','dyu-2024-susi'),(2025,'수시','dyu-2025-susi'),(2026,'수시','dyu-susi-file0'),(2024,'정시','dyu-2024-jeongsi'),(2025,'정시','dyu-jeongsi-file0')]:
  for p in tables(key):
   rr=p['tables'][0]['rows'];labs=header_labels(rr,2);unit='';campus='';gun=''
   for ri,v in enumerate(rr[2:],3):
    if y==2024:
     if v[0]:campus=compact(v[0])
     if v[1]:unit=compact(v[1])
     if rnd=='수시':pg=clean(v[2]);st=4
     else:
      if v[2]:gun=clean(v[2])
      pg=clean(v[3])+' '+gun+'군';st=4
    else:
     if v[0]:unit=compact(v[0])
     pg=clean(v[1]);st=2
    if unit not in allowed or not any(num(x) for x in v[st:]):continue
    out.append(row(key,'동양대학교(동두천)',y,rnd,pg,unit,f'p.{p["page"]} 표1 행{ri}',admission_type='실기' if '실기' in pg else ('수능' if rnd=='정시' and ('수능' in pg or any(num(x) for x in v[2:10])) else '교과'),cut_other=pairs(labs[st:],v[st:]),metric='교과등급' if rnd=='수시' else '기타',basis='최종등록자' if y==2024 and rnd=='정시' else ('최초합격자·최종합격자(충원 포함)' if y>2024 and rnd=='수시' else '최종합격자'),grade_system='9' if rnd=='수시' else '',note='draft; 동두천 모집단위만 수록; 개편 전후 명칭은 원본 유지; 표의 합격자 최저값은 100% 기준'))
 save('dyu',out)

def yewon():
 out=[]
 key='yewon-2025-susi2';rr=tables(key)[0]['tables'][0]['rows'];labs=header_labels(rr,3)
 for ri,v in enumerate(rr[3:],4):
  if '게임애니메이션학과' in v[0] or '스포츠융합' in v[0] or not num(v[1]):continue
  out.append(row(key,'예원예술대학교(경기드림)',2025,'수시','일반전형',v[0],f'p.1 표1 행{ri}',admission_type='실기',competition_rate=v[1],cut_other=pairs(labs[2:],v[2:]),metric='교과등급',basis='최초합격자·최종합격자 원문 구분',grade_system='9',note='draft; 경기드림캠퍼스; 모집/지원인원 원문 미공개; 2025 정시 원본 링크는 현재 404'))
 for rnd,key in [('수시','yewon-susi2-pdf'),('정시','yewon-jeongsi2-pdf')]:
  rr=tables(key)[0]['tables'][0]['rows'];labs=header_labels(rr,3);gun='';ui=0 if rnd=='수시' else 1;st=ui+1
  for ri,v in enumerate(rr[3:],4):
   if rnd=='정시' and v[0]:gun=clean(v[0])
   unit=re.sub(r'\(2027.*','',compact(v[ui]))
   if unit in ['게임애니메이션학과','스포츠융합복지학과'] or not num(v[st]):continue
   out.append(row(key,'예원예술대학교(경기드림)',2026,rnd,(gun+' ' if gun else '')+'일반전형',unit,f'p.1 표1 행{ri}',admission_type='실기',quota=v[st],applicants=v[st+1],competition_rate=v[st+2],cut_other=pairs(labs[st+3:],v[st+3:]),metric='교과등급',basis='최초합격자·최종합격자 원문 구분',grade_system='9',note='draft; 경기드림캠퍼스(공식 모집요강 캠퍼스표 확인); 전북 학과 및 캠퍼스 미분리 정원외 합계 제외; 학생부 미반영 학과 성적은 공란'))
 save('yewon',out)

def stu():
 from normalize_gyeonggi_more import merged_values
 out=[]
 common=['기회균형선발전형','농어촌학생전형','특성화고졸업자전형','특수교육대상자전형']
 for y,rnd,key in [(2024,'수시','stu-susi-post4-pdf'),(2025,'수시','stu-susi-post2-pdf'),(2026,'수시','stu-susi-post0-pdf'),(2024,'정시','stu-jeongsi-post3-pdf'),(2025,'정시','stu-jeongsi-post1-pdf'),(2026,'정시','stu-jeongsi-post0-pdf')]:
  for p in tables(key):
   pn=p['page']
   if pn<3 or (y==2026 and rnd=='수시' and pn==3):continue
   for ti,t in enumerate(p['tables']):
    if rnd=='수시':
     if y==2024:mp={3:['교과성적전형']*2,4:['일반·기독교전형']*2,5:['H+인재전형','사회배려및기여자전형'],6:['대안학교출신자전형','어학특기자전형','실기전형'],7:common}
     elif y==2025:mp={3:['교과성적전형']*2,4:['일반·기독교전형']*2,5:['H+인재전형','사회기여및배려자전형'],6:['어학특기자전형','실기전형','실기전형'],7:common}
     else:mp={4:['교과성적전형']*2,5:['일반·기독교전형']*2,6:['H+인재전형','사회기여및배려자전형','어학특기자전형'],7:common,8:['실기전형','실기전형'],10:['교과성적전형','일반·기독교전형'],11:['기회균형선발전형','실기전형','실기전형']}
     if pn not in mp or ti>=len(mp[pn]):continue
     pg=mp[pn][ti]
    else:pg='실기전형' if (y==2024 and pn==4) or (y==2025 and ti==1) or (y==2026 and ti==0) else ('일반전형' if y==2024 else '일반·기독교전형')
    rr=t['rows'];ged=y==2026 and rnd=='수시' and pn>=10;h=1 if ged else 2
    labs=header_labels(rr,h)
    ui=0 if compact(rr[0][0])=='학과' else 1
    if len(rr)<=h:continue
    st=ui+1
    if st<len(rr[0]) and compact(rr[0][st])=='전공':st+=1
    units=[];last=''
    for ri,v in enumerate(rr):
     if ri<h:units.append('');continue
     if v[ui]:last=compact(v[ui])
     unit=last
     if st==ui+2 and v[ui+1]:unit+=' '+compact(v[ui+1])
     units.append(unit)
    for (a,b),vs in merged_values(rr,h,st,len(rr[0])).items():
     us=list(dict.fromkeys(units[a:b]));unit=' / '.join(us)
     if not unit or any(x in unit for x in ['합계','소계','총계']):continue
     kw={};extra=[]
     for j,v in vs.items():
      lab=compact(labs[j])
      if lab=='모집인원':kw['quota']=v
      elif lab in ['지원자','지원인원']:kw['applicants']=v
      elif lab=='경쟁률':kw['competition_rate']=v
      elif '70%' in lab:kw['cut_70']=v
      else:extra.append(clean(labs[j])+' '+v)
     if not kw and not extra:continue
     metric='기타' if ged or '어학' in pg else ('환산점수' if rnd=='정시' else '교과등급')
     typ='실기' if '실기' in pg or '어학' in pg else ('수능' if rnd=='정시' else ('종합' if pg.startswith(('H+','사회','대안')) else '교과'))
     basis='검정고시 출신 합격자' if ged else ('최종등록자 전과목 등급' if '전과목' in ''.join(labs) else '최종등록자 본교 반영기준')
     out.append(row(key,'서울신학대학교',y,rnd,pg,unit,f'p.{pn} 표{ti+1} 행{a+1}-{b}',admission_type=typ,cut_other='; '.join(extra),metric=metric,basis=basis,grade_system='9' if metric=='교과등급' else '',note='draft; 경기도 부천 소재; 병합 모집인원·성적은 공동 모집단위에 기록; 검정고시 별도; 예비순위는 충원인원과 구분',**kw))
 save('stu',out)

def sjs():
 out=[];music=['보컬','드럼','건반','기타','베이스','작곡','싱어송라이터'];welfare=['사회복지학과','상담심리학과'];theology=['신학과','목회사역학과']
 def group(key,y,rnd,pg,typ,units,q,apps,ratio,total=None):
  base=dict(admission_type=typ,basis='원서접수 마감 지원현황',note='draft; 공식 게시물 표/이미지 직접 전사; 합격성적 공개자료 아님; 병합 모집인원은 공동 모집단위로 보존')
  vals=dict(quota=str(q),competition_rate=str(ratio))
  if total is not None:vals['applicants']=str(total)
  if len(units)==1:vals['applicants']=str(apps[0])
  out.append(row(key,'서울장신대학교',y,rnd,pg,' / '.join(units),'본문 표/첨부 이미지 '+pg,**base,**vals))
  if len(units)>1:
   for u,a in zip(units,apps):out.append(row(key,'서울장신대학교',y,rnd,pg,u,'본문 표/첨부 이미지 학과별 지원인원',applicants=str(a),**base))
 def mus(key,y,pg,q,apps,ratio,total):group(key,y,'수시',pg,'실기',['실용음악과 '+x for x in music],q,apps,ratio,total)
 k='sjs-40687';y=2024
 for pg,typ,us,q,apps,ratio,total in [('담임목사추천','교과',theology,21,[29,0],'1.38',29),('만학도','교과',theology,2,[1,1],'1.00',2),('일반전형','교과',welfare,20,[23,10],'1.65',33),('대안학교','교과',welfare,1,[0,0],'0.00',0),('교역자추천','교과',welfare,3,[3,0],'1.00',3),('일반전형(면접중심)','교과',welfare,12,[5,2],'0.58',7),('대안학교(면접중심)','교과',welfare,1,[0,0],'0.00',0),('교역자추천(면접중심)','교과',welfare,3,[2,0],'0.67',2),('만학도(면접중심)','교과',welfare,1,[0,0],'0.00',0),('농어촌학생','교과',theology,1,[0,0],'0.00',0),('농어촌학생','교과',welfare,1,[1,0],'1.00',1),('특성화고교출신','교과',welfare,1,[2,0],'2.00',2),('특수교육대상자','교과',theology,1,[0,0],'0.00',0),('특수교육대상자','교과',welfare,1,[0,0],'0.00',0),('특수교육대상자(면접중심)','교과',welfare,1,[1,0],'1.00',1),('재외국민과 외국인','기타',theology,1,[0,0],'0.00',0)]:group(k,y,'수시',pg,typ,us,q,apps,ratio,total)
 mus(k,y,'일반전형(실기)',11,[8,2,1,1,1,2,0],'1.36',15);mus(k,y,'농어촌학생(실기)',1,[1,0,0,0,0,0,0],'1.00',1);mus(k,y,'특수교육대상자(실기)',1,[0]*7,'0.00',0);group(k,y,'수시','북한이탈주민','실기',['실용음악과 보컬'],'',[1],'',1)
 k='sjs-43703';y=2025
 for pg,us,q,apps,ratio,total in [('일반전형',welfare,21,[36,24],'2.86',60),('대안학교',welfare,1,[0,0],'0.00',0),('교역자추천',welfare,3,[2,1],'1.00',3),('일반전형(면접중심)',['신학과'],23,[45],'1.96',45),('일반전형(면접중심)',welfare,12,[7,7],'1.17',14),('대안학교(면접중심)',welfare,1,[0,0],'0.00',0),('교역자추천(면접중심)',welfare,3,[2,2],'1.33',4),('농어촌학생',['신학과'],1,[2],'2.00',2),('농어촌학생',welfare,1,[1,0],'1.00',1),('특성화고교출신',welfare,1,[1,0],'1.00',1),('특수교육대상자',welfare,4,[2,1],'0.75',3),('특수교육대상자',['신학과'],2,[0],'0.00',0),('특수교육대상자(면접중심)',welfare,1,[0,0],'0.00',0),('재외국민',['신학과'],1,[0],'0.00',0)]:group(k,y,'수시',pg,'교과',us,q,apps,ratio,total)
 for pg,q,apps,ratio,total in [('일반전형(실기)',9,[7,2,1,1,1,1,1],'1.56',14),('일반전형(실기·교과)',12,[0,0,0,1,0,3,0],'0.33',4),('특수교육대상자(실기)',1,[0]*7,'0.00',0),('농어촌학생(실기·교과)',1,[0]*7,'0.00',0),('특수교육대상자(실기·교과)',2,[0]*7,'0.00',0)]:mus(k,y,pg,q,apps,ratio,total)
 k='sjs-45192'
 for u,q,a,r in [('신학과',4,11,'2.75'),('사회복지학과 / 상담심리학과',20,71,'3.55'),('실용음악과',16,14,'0.88')]:group(k,2025,'정시','일반전형','기타',[u],q,[a],r,a)
 k='sjs-46893';y=2026
 for pg,typ,us,q,apps,ratio,total in [('일반전형','교과',welfare,32,[43,19],'1.94',62),('교역자추천','교과',welfare,9,[9,5],'1.56',14),('교역자추천','교과',['신학과'],23,[34],'1.48',34),('농어촌학생','교과',['신학과'],1,[1],'1.00',1),('농어촌학생','교과',welfare,2,[1,0],'0.50',1),('특수교육대상자','교과',welfare,4,[5,0],'1.25',5),('특수교육대상자','교과',['신학과'],1,[0],'0.00',0),('재외국민·외국인(2%이내)','기타',['복지상담학부'],1,[0],'0.00',0),('재외국민·외국인(2%이내)','기타',['신학부'],1,[0],'0.00',0)]:group(k,y,'수시',pg,typ,us,q,apps,ratio,total)
 mus(k,y,'일반전형(실기)',21,[13,3,2,3,0,1,2],'1.14',24);mus(k,y,'특수교육대상자(실기)',1,[0,1,0,0,0,0,0],'1.00',1);mus(k,y,'농어촌학생(실기)',1,[0]*7,'0.00',0)
 for u in ['복지상담학부','신학부','실용음악과']:group(k,y,'수시','재외국민·외국인·북한이탈주민','기타',[u],'제한없음',[0],'')
 k='sjs-47982'
 for pg,us,q,apps,ratio in [('일반전형',['신학과'],9,[16],'1.78'),('일반전형',welfare,16,[34,33],'4.19'),('일반전형',['실용음악과'],14,[12],'0.86'),('농어촌',['신학과'],1,[0],'0.00'),('특수교육',['신학과'],1,[1],'1.00'),('재외국민 및 외국인',['신학과'],1,[0],'0.00'),('북한이탈',['신학과'],'제한없음',[1],''),('농어촌',welfare,2,[3],'1.50'),('특수교육',welfare,2,[1],'0.50'),('농어촌',['실용음악과'],1,[0],'0.00'),('특수교육',['실용음악과'],1,[0],'0.00')]:
  if len(us)>len(apps):group(k,2026,'정시',pg,'기타',[' / '.join(us)],q,apps,ratio,apps[0])
  else:group(k,2026,'정시',pg,'기타',us,q,apps,ratio)
 save('sjs',out)

def acts():
 out=[]
 for y in [2024,2025,2026]:
  for rnd,rk in [('수시','susi'),('정시','jeongsi')]:
   # The legacy endpoint repeats the same regular-admission rows for all
   # historical years. Only the year linked by the official menu is accepted.
   if rnd=='정시' and y!=2026:continue
   key=f'acts-{y}-{rk}-view';sp=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser')
   for ti,t in enumerate(sp.select('table'),1):
    rr=html_grid(t)
    for ri,v in enumerate(rr[1:],2):
     if len(v)!=6 or not num(v[2]) or not num(v[3]):continue
     out.append(row(key,'아신대학교',y,rnd,v[0],v[1],f'HTML 표{ti} 행{ri}',admission_type='기타',quota=v[2],applicants=v[3],competition_rate=val(v[4].split(':')[0]),basis='원서접수 마감 지원현황',note='draft; 성적표 아님; 최초합격자 평균 조회 메뉴는 해당 연도 데이터 행이 비어 있어 성적 미수록'))
 save('acts',out)

def cuk():
 out=[]
 def emit(key,y,pg,unit,loc,labels,values,regular=False,metric='',basis=''):
  unit=compact(unit)
  if not unit or any(x in unit for x in ['의예','간호','신학','합계','총계','소계','총합']):return
  kw={};extras=[]
  for lab,v in zip(labels,values):
   if not val(v):continue
   lab=compact(lab);v=clean(v)
   if re.search('202[345]',lab) and str(y) not in lab:continue
   if lab in ['모집','모집인원','모집인원(A)']:kw['quota']=v
   elif lab=='지원인원':kw['applicants']=v
   elif lab in ['경쟁률',str(y)+'학년도경쟁률','경쟁률'+str(y)+'학년도','경쟁률'+str(y)]:kw['competition_rate']=v
   elif lab=='충원율':kw['fill_rate']=v
   elif lab=='추가합격인원':kw['fill_count']=v
   elif '70%컷' in lab:kw['cut_70']=v
   else:extras.append(lab+' '+v)
  if not kw and not extras:return
  out.append(row(key,'가톨릭대학교(성심)',y,'정시' if regular else '수시',pg,unit,loc,admission_type=('실기' if '실기' in pg else '수능') if regular else ('논술' if '논술' in pg else ('교과' if '교과' in pg else '종합')),cut_other='; '.join(extras),metric=metric,basis=basis or ('성적통계(원문 대상별 구분)' if metric else '경쟁률·충원현황'),grade_system='9' if metric=='교과등급' else '',note='draft; 성심캠퍼스; 병합 통계는 공동 모집단위로 유지; 예비순위는 충원인원과 구분',**kw))
 for y in [2024,2026]:
  key=f'cuk-{y}';pg=''
  for p in tables(key):
   pn=p['page'];regular=pn>= (20 if y==2024 else 40)
   if not ((5<=pn<=22) if y==2024 else (9<=pn<=42)):continue
   # Grade comparison pages repeat values already in the year-specific tables.
   if y==2026 and pn==12:continue
   m=re.findall(r'학생부(?:교과|종합)\([^)]*전형\)',compact(p['text'][:240]))
   if m:pg=m[0]
   if '논술전형' in p['text'][:160]:pg='논술전형'
   for ti,t in enumerate(p['tables']):
    rr=t['rows'];localpg=pg
    if y==2024 and pn==19:localpg=['학생부종합(농어촌학생전형)','학생부종합(특성화고교졸업자전형)','학생부종합(특성화고등을졸업한재직자전형)'][ti]
    if y==2026 and pn==37 and ti>0:localpg='학생부종합(특성화고등을졸업한재직자전형)'
    if regular and y==2026 and pn==40:
     typ='';gun=''
     for ri,v in enumerate(rr[3:],4):
      if v[0]:typ=clean(v[0])
      if not v[1] or not v[3]:continue
      g=re.match(r'([가나다]군)\s*(\d+)',v[3])
      if not g:continue
      emit(key,y,typ+' '+g[1],v[1]+(' '+v[2] if v[2] else ''),f'p.{pn} 표{ti+1} 행{ri}',['모집인원','지원인원','경쟁률','2025경쟁률','추가합격예비순위','충원율'],[g[2]]+v[4:],True)
     continue
    if regular and y==2026:
     h=2;start=3 if pn==41 else (4 if ti==0 else 3);ui=1
    elif regular:h=2;start=3;ui=2
    elif y==2024:
     h=2 if rr[1][0] is None and any(x for x in rr[1]) else 1
     start=1 if pn in [12,15] else 2;ui=start-1
    else:
     h=3 if pn==29 and ti==2 else (1 if pn==23 or (pn==28 and ti==1) else 2);start=1;ui=0
    labels=header_labels(rr,h)
    metric=''
    if any('최고' in clean(x) for r in rr[:h] for x in r):metric='교과등급' if not regular else ('백분위' if pn==22 or (y==2026 and pn==42 and ti==1) else '환산점수')
    if not regular and not metric and any('일반선택' in clean(x) or '이수단위' in clean(x) for x in rr[0]):metric='기타'
    units=[];last='';typ='';gun='';pgs=[]
    for ri,v in enumerate(rr):
     if ri<h:units.append('');pgs.append('');continue
     if v[ui]:last=clean(v[ui])
     elif regular and y==2024 and v[1]:last=clean(v[1])
     elif y==2024 and not regular and ui==1 and v[0]:last=clean(v[0])
     units.append(last)
     if regular:
      if y==2026:
       if v[0]:typ=clean(v[0])
       if v[2]:gun=clean(v[2])
      else:
       typ='일반전형'
       if v[0]:gun=clean(v[0])
      pgs.append(typ+' '+gun)
     else:pgs.append(localpg)
    groups={}
    for col in range(start,len(rr[0])):
     for ri in range(h,len(rr)):
      value=rr[ri][col]
      if not val(value):continue
      en=ri+1
      while en<len(rr) and rr[en][col] is None:en+=1
      relevant=[j for j in range(start,len(labels)) if not (re.search('202[345]',labels[j]) and str(y) not in labels[j])]
      us=list(dict.fromkeys(units[z] for z in range(ri,en) if units[z] and any(num(rr[z][j]) for j in relevant)))
      if not us:continue
      unit=' / '.join(us);group=(unit,pgs[ri],ri if len(us)>1 else -1)
      # Multiple physical subrows belong to one logical department row.
      d=groups.setdefault(group,{'labels':[],'vals':[],'rows':[]});d['labels'].append(labels[col]);d['vals'].append(value);d['rows'].append(ri+1)
    for (unit,pr,_),g in groups.items():emit(key,y,pr,unit,f'p.{pn} 표{ti+1} 행'+','.join(map(str,sorted(set(g['rows'])))),g['labels'],g['vals'],regular,metric,basis='선택과목·이수 현황' if metric=='기타' else '')
 # The 2025 PDF has no rule lines. Group original words by baseline; do not
 # use text-table columns, which split both Korean unit names and decimals.
 key='cuk-2025';doc=fitz.open(CACHE/(key+'.pdf'))
 pgs={5:'학생부교과(지역균형전형)',6:'학생부교과(지역균형전형)',7:'학생부종합(잠재능력우수자서류전형)',8:'학생부종합(잠재능력우수자서류전형)',9:'학생부종합(잠재능력우수자면접전형)',10:'학생부종합(잠재능력우수자면접전형)',11:'학생부종합(잠재능력우수자면접전형)',12:'학생부종합(가톨릭지도자추천전형)',13:'학생부종합(학교장추천전형)',14:'학생부종합(기회균형Ⅰ전형)',15:'학생부종합(기회균형Ⅰ전형)',16:'학생부종합(기회균형Ⅱ전형)',17:'학생부교과(농어촌학생전형)',18:'학생부교과(특성화고교졸업자전형)',19:'학생부교과(특성화고등을졸업한재직자전형)',20:'학생부종합(장애인등대상자전형)',21:'논술전형',22:'논술전형'}
 audit=[]
 for pn in range(5,26):
  if pn==24:continue
  p=doc[pn-1];lines=[]
  for w in sorted(p.get_text('words'),key=lambda w:((w[1]+w[3])/2,w[0])):
   if w[0]>550:continue
   cy=(w[1]+w[3])/2
   if not lines or abs(lines[-1][0]-cy)>2:lines.append((cy,[w]))
   else:lines[-1][1].append(w)
  if pn==20:
   us=[[],[]]
   for cy,ws in lines:
    unit=''.join(w[4] for w in sorted(ws,key=lambda w:w[0]) if 50<w[0]<185)
    apps=[w[4] for w in ws if 245<w[0]<300 and num(w[4])]
    if not unit or not apps or not 145<cy<550:continue
    ix=0 if cy<370 else 1;us[ix].append(unit)
    emit(key,2025,pgs[pn],unit,f'p.20 y={cy:.1f}',['지원인원'],apps)
   for ix,names in enumerate(us):emit(key,2025,pgs[pn],' / '.join(names),'p.20 병합 모집단위 '+str(ix+1),['모집인원','경쟁률','추가합격예비순위','충원율'],['6','10.83','2','33.33'] if ix==0 else ['4','8.00','4','100.00'])
   continue
  mode='score' if pn in [6,8,10,15,22,25] else ('interview' if pn==11 else 'counts');skip=False
  for cy,ws in lines:
   ws=sorted(ws,key=lambda w:w[0]);line=' '.join(w[4] for w in ws)
   if pn in [10,11] and re.match(r'2\)\s*2024',line):skip=True
   if skip:continue
   if '학생부' in line and ('성적 통계' in line or '성적통계' in line):mode='score'
   if '면접응시자의 합격률' in line or '수능최저학력기준 충족률' in line:mode='interview'
   if '평균백분위' in line or '평균 백분위' in line:mode='percentile'
   toks=[w[4] for w in ws];j=len(toks)
   while j>0 and (num(toks[j-1]) or toks[j-1] in ['-','*']):j-=1
   vv=toks[j:];unit=''.join(toks[:j])
   if len(vv)<3 or not re.search('[가-힣]',unit) or any(z in unit for z in ['※','계(명)','합계','학년도','비율','기준','최고','최저','평균','지원자','교과','성적']):continue
   labels=[];metric='';regular=pn>=23;pg=pgs.get(pn,'일반전형')
   if regular:
    g=re.search('([가나다]군)',unit)
    if not g:continue
    pg='일반전형 '+g[1];unit=unit.split(g[1])[0];unit=re.sub(r'^수능\([^)]*\)','',unit)
    if pn==23:labels=['모집인원','지원인원','경쟁률','2024학년도경쟁률','추가합격예비순위','충원율']
    else:
     metric='백분위' if mode=='percentile' else '환산점수';labels=['최고','평균','상위80%컷','최고-80%컷']+(['영어등급평균'] if len(vv)==5 else [])
   elif mode=='score':
    if len(vv) not in [9,12]:audit.append([pn,line]);continue
    bs=['지원자']+(['1단계합격자'] if len(vv)==12 else [])+['최초합격자','최종등록자'];labels=[b+' '+m for b in bs for m in ['최고','평균','최저']];metric='교과등급'
   elif mode=='interview':
    labels=['모집인원','1단계합격인원','결시인원','결시율','추가합격예비순위','충원율','면접응시자합격률','서류1배수합격률']
   elif pn==5:labels=['모집인원','지원인원','경쟁률','2024학년도경쟁률','수능최저충족인원','수능최저충족률','추가합격예비순위','충원율','실질경쟁률']
   elif pn==17:labels=['모집인원','지원인원','경쟁률','수능최저충족인원','수능최저충족률','추가합격예비순위','충원율','실질경쟁률']
   elif pn in [18,19]:labels=['모집인원','지원인원','경쟁률','추가합격예비순위','충원율']
   elif pn==16:labels=['모집인원','지원인원','경쟁률','2024학년도경쟁률','수능최저충족인원','수능최저충족률','추가합격예비순위','충원율','실질경쟁률']
   elif pn==21:labels=['모집인원','지원인원','경쟁률','2024학년도경쟁률','결시인원','수능최저충족인원','수능최저충족률','수능최저충족응시인원','수능최저충족응시비율','추가합격예비순위','충원율','실질경쟁률']
   else:labels=['모집인원','지원인원','경쟁률','2024학년도경쟁률','추가합격예비순위','충원율']
   if len(vv)!=len(labels):audit.append([pn,line]);continue
   emit(key,2025,pg,unit,f'p.{pn} y={cy:.1f}',labels,vv,regular,metric)
 (CACHE/'cuk-2025-unparsed.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8')
 save('cuk',out)

if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf8')
 for name in sys.argv[1:]:globals()[name]()
