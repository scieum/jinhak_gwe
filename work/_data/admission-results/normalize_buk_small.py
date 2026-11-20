from normalize_buk_pdf import *

def kosin():
 out=[]
 for y in [2024,2025,2026]:
  for kind in ['counts','grades']:
   key=f'kosin-{y}-susi-{kind}'
   for p in tables(key):
    expanded=[]
    for t in p['tables']:
     starts=[i for i,v in enumerate(t['rows']) if clean(v[0])=='모집단위']
     for a,b in zip(starts,starts[1:]+[len(t['rows'])]):expanded.append({'rows':t['rows'][a:b]})
    for ti,t in enumerate(expanded,1):
     raw=t['rows'];h=2 if kind=='counts' else 3;step=3 if kind=='counts' else 7;labs=header(raw,h)
     for j in range(1,len(raw[0]),step):
      if j+step>len(raw[0]):continue
      pg=clean(raw[0][j])
      if not pg or '합계' in pg:continue
      if y==2026 and pg=='지역인재기회균형':pg+='(교과)' if j==10 else '(종합)'
      typ='종합' if any(z in pg for z in ['학교생활','자기추천','고신희망','기회균형','지역인재종합','성인학습']) and '(교과)' not in pg else '실기' if '실기' in pg else '교과'
      shared=kind=='counts' and any(v[j] is None for v in raw[h:])
      for ri,v in rows(raw,h,[0]):
       vals=v[j:j+step]
       if not any(positive(z) for z in vals):continue
       put(out,make(key,'고신대학교',y,'수시',pg,v[0],f'PDF p{p["page"]} 표{ti} 행{ri} 열{j+1}',labs[j:j+step],vals,typ=typ,q='' if shared else vals[0],ap=vals[1] if kind=='counts' else '',co=vals[2] if kind=='counts' and not shared else vals[1] if kind=='grades' else '',c70=vals[6] if kind=='grades' else '',note='지원현황·최종등록자 성적 별도 출처; 충원합격순위는 인원 아님'+('; 여러 학과에 걸친 통합모집 인원·경쟁률은 학과별 칸에 복제 안 함' if shared else '')))
 save('kosin',out)

def silla():
 out=[];key='silla-2026-susi';doc=fitz.open(CACHE/(key+'.pdf'));p=doc[0];t=p.find_tables().tables[0];raw=t.extract();labs=header(raw,2)
 for ri,v in rows(raw,2,[0]):
  for j,n in [(2,4),(6,4),(10,3),(13,3),(16,3),(19,3),(22,3)]:
   if not any(positive(z) for z in v[j:j+n]):continue
   pg=clean(raw[0][j]);put(out,make(key,'신라대학교',2026,'수시',pg,v[1],f'PDF p1 행{ri} 열{j+1}',labs[j:j+n],v[j:j+n],typ='종합' if '종합' in pg else '실기' if '실기' in pg else '교과',co=v[j],note='2027 진로선택 반영방법 적용 재산출; 일반고·면접의 최저는 100%컷; 평균을 70%로 바꾸지 않음',basis='최종등록자; 2027 반영방법 재산출'))
  # Last three cells have missing rules in the PDF. Read their observed text positions.
  cell=t.rows[ri-1].cells[-1];x,y,x1,y1=cell
  words=p.get_text('words',clip=(489.8,y,540,y1));vals=[w[4] for w in sorted(words,key=lambda w:w[0])]
  if len(vals)==3 and all(number(z) for z in vals):put(out,make(key,'신라대학교',2026,'수시','사회배려',v[1],f'PDF p1 행{ri} 사회배려 열', ['경쟁률','후보','평균'],vals,co=vals[0],note='원문 우측 3열 경계선 누락: 같은 행의 텍스트 좌표로 추출; 2027 반영방법 재산출; 평균을 70%로 바꾸지 않음',basis='최종등록자; 2027 반영방법 재산출'))
 save('silla',out)

if __name__=='__main__':
 for fn in [kosin,silla]:
  if not sys.argv[1:] or fn.__name__ in sys.argv[1:]:fn()
 (CACHE/'buk-small-review.json').write_text(json.dumps(REVIEW,ensure_ascii=False,indent=2),encoding='utf8')
