"""Small official result formats, preserving 80% cut and original grouped metrics."""
from normalize_honam_office import *
from normalize_daegu_adiga import htmlgrid,labels
from bs4 import BeautifulSoup

def jnue():
 key='jnue-2026-results';text=(CACHE/(key+'.hwp-preview.txt')).read_text(encoding='utf8');chunks=text.split('2. 전형별 교과등급 현황');first=re.findall(r'<([^<>]*)>',chunks[0]);cuts=re.findall(r'<([^<>]*)>',chunks[1]);paras=json.loads((CACHE/'jnue-2026-hwp-paragraphs.json').read_text(encoding='utf8'));out=[]
 programs=['교직적성우수자','지역인재선발','국가보훈대상자','다문화가정자녀','농어촌학생','기회균형선발','장애인등대상자']
 for pg in programs:
  i=first.index(pg);v=first[i:i+12];ci=cuts.index(pg);cv=cuts[ci:ci+4]
  labs=['전형명','모집인원','지원남','지원여','지원계','최초남','최초여','최초계','입학남','입학여','입학계','경쟁률','추가합격 예비번호','1단계 교과80%컷','최종입학자 교과80%컷'];vals=v+cv[1:]
  for start,end,label in [(176,232,'서류700점'),(243,len(paras),'면접300점')]:
   block=paras[start:end];pi=block.index(pg);endp=next((j for j in range(pi+1,len(block)) if block[j] in programs),len(block));vv=block[pi+1:endp];labs.append(label+' 분포/등록계/평균');vals.append(' / '.join(vv))
  r=make(key,'전주교육대학교',2026,'수시',pg,'초등교육과','HWP 입학자 현황·교과등급·서류/면접 평가 표',labs,vals,typ='종합',q=v[1],ap=v[4],co=v[11],basis='최종입학자; 80%컷',note='HWP 원본의 내장 텍스트와 본문 레코드 대조; 80%컷은 cut_other에 보존하고 50%·70%로 전용하지 않음; 예비번호는 인원 아님')
  put(out,r)
 finish('jnue',out)

def jnue_2024():
 key='jnue-adiga-2024';s=BeautifulSoup((CACHE/(key+'.html')).read_text(encoding='utf8'),'html.parser');ts=[htmlgrid(t) for t in s.find_all('table')];out=[]
 for rd,ix,ci,scoretabs in [('수시',9,10,[11,12]),('정시',21,22,[23])]:
  g=ts[ix];labs=labels(g,2);cutgrid=ts[ci];cl=labels(cutgrid,2 if rd=='수시' else 1)
  for ri,v in enumerate(g[2:],3):
   pi,q,ap=(1,2,5) if rd=='수시' else (0,1,4);pg=v[pi]
   if '합계' in pg:continue
   rawlabs=labs[:];rawv=v[:]
   for cv in cutgrid[2 if rd=='수시' else 1:]:
    if compact(cv[2 if rd=='수시' else 0])==compact(pg):rawlabs+=cl;rawv+=cv
   for ti in scoretabs:
    sg=ts[ti]
    for sv in sg[1:]:
     if compact(sv[0]).replace('전형','').replace('학생','')==compact(pg).replace('학생',''):
      rawlabs+=['표'+str(ti+1)+' '+x for x in sg[0]];rawv+=sv
   r=row(key,'전주교육대학교',2024,rd,pg,'초등교육과',f'HTML 표{ix+1} 행{ri}; 표{ci+1} 및 성적분포',admission_type='종합' if rd=='수시' else '수능',quota=number(v[q].rstrip('*')),applicants=number(v[ap]),competition_rate=number(v[-1]),cut_other=pairs(rawlabs,rawv),metric='교과등급' if rd=='수시' else '환산점수',basis='최종입학자; 80%컷',grade_system='9' if rd=='수시' else '',note='draft; 대학 제공 어디가 공식 공개표; 80%컷을 50%·70%로 변환하지 않음; 모집인원 * 원문 주석 보존; 예비순위는 인원 아님')
   out.append(r)
 save('jnue-adiga',out)

if __name__=='__main__':jnue();jnue_2024()
