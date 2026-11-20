from normalize_buk_pdf import *

def ysu():
 out=[];note='두 캠퍼스 공통 자료; 캠퍼스 임의 배분 안 함; 최종합격자 성적을 다음 학년도 반영방법으로 재산출한 원문; 80%를 70%로 바꾸지 않음'
 for y,idx in [(2024,8),(2025,6)]:
  key=f'ysu-busan-results-list-19-post-{idx}-file-1';s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).worksheets[0];g=grid(s)
  for ri,v in enumerate(g[2:],3):
   if not v[0] or v[0].startswith('*'):continue
   for j,n in [(j,4) for j in [1,5,9,13,17]]+[(j,2) for j in [22,24,26]]:
    if not any(positive(z) for z in v[j:j+n]):continue
    pg=g[0][j]
    put(out,make(key,'영산대학교',y,'수시',pg,v[0],f'{s.title} 행{ri} 열{j+1}',hdr(g,0,2)[j:j+n],v[j:j+n],typ='실기' if '실기' in pg else '교과',q=v[j] if n==4 else '',co=v[j+3] if n==4 else '',note=note,basis='최종합격자; 다음 학년도 반영방법 재산출'))
 # 2026 PDF includes both original and following-year department names.
 key='ysu-busan-results-list-19-post-3-file-0'
 for p in tables(key):
  for t in p['tables']:
   raw=t['rows'];labs=header(raw,2)
   for ri,v in rows(raw,2,[0,1]):
    for j,n in [(j,4) for j in [2,6,10,14,18]]+[(j,2) for j in [23,25,27]]:
     if not any(positive(z) for z in v[j:j+n]):continue
     pg=clean(raw[0][j])
     put(out,make(key,'영산대학교',2026,'수시',pg,v[0],f'PDF p{p["page"]} 행{ri} 열{j+1}',labs[:2]+labs[j:j+n],v[:2]+v[j:j+n],typ='실기' if '실기' in pg else '교과',q=v[j] if n==4 else '',co=v[j+1] if n==4 else '',c70=v[j+3] if n==4 else v[j+1],note=note,basis='최종합격자; 2027 반영방법 재산출'))
 for y,idx in [(2024,7),(2025,4)]:
  key=f'ysu-busan-results-list-19-post-{idx}-file-1';s=openpyxl.load_workbook(CACHE/(key+'.xlsx'),data_only=True).worksheets[0];g=grid(s);h=4 if y==2024 else 3;labs=hdr(g,0,h)
  for ri,v in enumerate(g[h:],h+1):
   if y==2024:
    for j in [1,7,13,19]:
     if not any(positive(z) for z in v[j:j+6]):continue
     put(out,make(key,'영산대학교',y,'정시',g[0][j],v[0],f'{s.title} 행{ri} 열{j+1}',labs[j:j+6],v[j:j+6],typ='실기' if '실기' in g[0][j] else '수능',metric='환산점수',note='두 캠퍼스 공통 자료; 수능·교과 평균과 표준편차 보존; 캠퍼스 임의 배분 안 함'))
   elif v[1] and any(positive(z) for z in v[4:10]):put(out,make(key,'영산대학교',y,'정시',v[0]+' '+v[3],v[1],f'{s.title} 행{ri}',labs[:10],v[:10],typ='실기' if '실기' in v[3] else '수능',metric='환산점수',note='두 캠퍼스 공통 자료; 수능·교과 평균과 표준편차 보존'))
 key='ysu-busan-results-list-19-post-2-file-0'
 for p in tables(key):
  for t in p['tables']:
   for ri,v in rows(t['rows'],3):
    if not any(positive(z) for z in v[5:]):continue
    put(out,make(key,'영산대학교',2026,'정시',v[1]+' '+v[3],v[0],f'PDF p{p["page"]} 행{ri}',header(t['rows'],3),v,typ='실기' if '실기' in v[3] else '수능',metric='환산점수',note='두 캠퍼스 공통 자료; 원문 모집단위는 2027 기준; 2026 당시 명칭과 동일성 임의 추정 안 함; 후보순위는 인원 아님'))
 save('ysu-yangsan',out)

def changwon():
 out=[]
 for y in [2024,2025,2026]:
  key=f'changwon-{y}';f=CACHE/(key+'.xlsx')
  if not f.exists():continue
  for s in openpyxl.load_workbook(f,data_only=True):
   g=grid(s);h=next((i for i,v in enumerate(g) if '모집단위' in v),None)
   if h is None:continue
   first=g[h];q=first.index('모집인원');ap=first.index('지원인원');co=first.index('경쟁률');start=next((i for i in range(h+1,len(g)) if number(g[i][q])),None)
   if start is None:continue
   labs=hdr(g,h,start);rd='정시' if '정시' in g[0][0] else '수시';pg=re.sub(r'^.*?모집\s*','',g[0][0]);pg=re.sub(r'\s*입학.*','',pg)
   typ='종합' if '학생부종합' in pg else '실기' if '실기' in pg or '예체능' in pg else '수능' if rd=='정시' else '교과'
   for ri,v in enumerate(g[start:],start+1):
    if not number(v[q]):continue
    unit=v[1]+(' '+v[2] if first[2]=='세부분야' and v[2] else '')
    r=make(key,'국립창원대학교',y,rd,pg+(' '+v[2] if first[2]=='모집군' else ''),unit,f'{s.title} 행{ri}',labs,v,typ=typ,metric='교과등급' if rd=='수시' else '환산점수',q=v[q],ap=v[ap],co=v[co],note='평균·80%·표준편차 원문 보존; 추합자수는 원문에서 마지막 예비번호와 동일하다고 정의하므로 fill_count로 해석 안 함')
    put(out,r)
 save('changwon',out)

def bnue():
 out=[]
 for y in [2024,2025]:
  key=f'bnue-{y}';groups={}
  for p in tables(key):
   for ti,t in enumerate(p['tables'],1):
    raw=t['rows'];first=[compact(x) for x in raw[0]]
    if len(first)==13 and first[1]=='전형유형':
     for ri,v in rows(raw,2,[0]):
      if not v[1] or any(z in v[1] for z in ['합계','소계']):continue
      for rd,j in [('수시',2),('정시',7)]:
       if not positive(v[j]):continue
       r=make(key,'부산교육대학교',y,rd,v[1]+'전형','초등교육과',f'PDF p{p["page"]} 표{ti} 행{ri}',header(raw,2)[j:j+5],v[j:j+5],typ='종합' if rd=='수시' else '수능',metric='교과등급' if rd=='수시' else '환산점수',q=v[j],ap=v[j+1],co=v[j+2],note='최종등록자; 후보번호는 인원 아님')
       if r:groups[(rd,compact(v[1]).replace('전형',''))]=r
    elif len(first)==6 and first[0]=='전형명' and first[1]=='모집인원':
     rd='수시' if '교과' in first[2] else '정시'
     for ri,v in rows(raw,2):
      pg=compact(v[0]);m=re.search(r'\((.*?)\)',pg);name=(m[1] if m else pg).replace('전형','');ident=(rd,name)
      if ident not in groups:continue
      r=groups[ident];r['cut_other']+=' / 성적: '+pairs(header(raw,2),v);r['source_page']+=f'; PDF p{p["page"]} 표{ti} 행{ri}'
      if y==2025:
       r['cut_70']=grade(v[5]);r['metric']='교과등급' if rd=='수시' else '수능등급'
      r['note']+='; 중간을 50%컷으로 임의 변환하지 않음; 2024는 80%, 2025는 70%컷'
  out+=list(groups.values())
 save('bnue',out)

if __name__=='__main__':
 for fn in [ysu,changwon,bnue]:
  if not sys.argv[1:] or fn.__name__ in sys.argv[1:]:fn()
 (CACHE/'buk-more-review.json').write_text(json.dumps(REVIEW,ensure_ascii=False,indent=2),encoding='utf8')
