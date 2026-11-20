from normalize_gyeonggi_more import *
from normalize_gangwon import html_grid
from bs4 import BeautifulSoup
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
      if camp != '대전':continue
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
 save('eulji-daejeon',out)

def jbu():
 out=[]
 key='jbu-2025-guide'
 for p in tables(key)[68:70]:
  for t in p['tables']:
   rr=t['rows'];campus='';unit=''
   for ri,v in enumerate(rr[4:],5):
    if v[0]:campus=compact(v[0])
    if v[1]:unit=compact(v[1])
    if '충청' not in campus:continue
    un=unit+(' '+compact(v[2]) if v[2] else '')
    for st in [3,9]:
     if not num(v[st]):continue
     pg=rr[0][st]
     out.append(row(key,'중부대학교(금산)',2024,'수시',pg,un,f'p.{p["page"]} 행{ri}',admission_type='실기' if '실기' in pg else '교과',quota=v[st],applicants=v[st+1],competition_rate=v[st+2],cut_70=val(v[st+5]),cut_other=pairs(['충원후보순위','최종등록자 평균'],v[st+3:st+5]),metric='교과등급',basis='2024 최종등록자 성적을 2025 학생부 반영방법으로 재산출',grade_system='9',note='draft; 공식 2025 수시모집요강 p.69~70; 2025 모집단위 기준 명칭; 당시 원점수와 재산출 점수를 구분'))
 for key,y in [('jbu-2025-susi',2025),('jbu-susi',2026)]:
  sp=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser');t=sp.select('table')[0];rr=html_grid(t)
  for ri,v in enumerate(rr[4:],5):
   if '충청' not in v[0]:continue
   unit=' '.join(dict.fromkeys(v[1:3]))
   for st in [3,9,15,21]:
    if not num(v[st]):continue
    pg=rr[0][st]
    out.append(row(key,'중부대학교(금산)',y,'수시',pg,unit,f'HTML 표1 행{ri}',admission_type='실기' if '실기' in pg else '교과',quota=v[st],applicants=v[st+1],competition_rate=v[st+2],cut_other=pairs(['충원합격예비순위','학생부평균','학생부'+rr[3][st+5]],v[st+3:st+6]),metric='교과등급',basis='최종등록자',grade_system='9',note='draft; 공식 공개페이지의 산출기준; 평균·최저/100%컷을 70%컷으로 바꾸지 않음'))
 key='jbu-jeongsi';sp=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser');ix=0
 for ti,t in enumerate(sp.select('table'),1):
  rr=html_grid(t)
  if not rr or '캠퍼스' not in rr[0]:continue
  pg=['수능우수자전형','사범계전형','실기우수자전형'][ix];ix+=1;q=rr[0].index('모집 인원');labs=[' '.join(dict.fromkeys([rr[0][j],rr[1][j]])) for j in range(len(rr[0]))]
  for ri,v in enumerate(rr[2:],3):
   if '충청' not in v[0] or not num(v[q]):continue
   unit=' '.join(dict.fromkeys(v[1:q-1]))
   out.append(row(key,'중부대학교(금산)',2026,'정시',pg,unit,f'HTML 표{ti} 행{ri}',admission_type='실기' if ix==3 else '수능',quota=v[q],applicants=v[q+1],competition_rate=v[q+2],cut_other=pairs(labs[q+3:],v[q+3:]),metric='기타',basis='2026 최종등록자 성적을 2027 반영방법으로 재산출',note='draft; 원문 모집군은 2027 계획으로 2026 모집군으로 저장하지 않음; 백분위·환산점수 구분은 cut_other 원문 열명'))
 save('jbu-geumsan',out)


if __name__=='__main__':
 eulji();jbu()
