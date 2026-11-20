from normalize_buk_pdf import *

def title(doc,p,t,old):
 x,y,x1,_=t['bbox'];s=doc[p-1].get_text(clip=(max(0,x-4),0,min(doc[p-1].rect.width,x1+4),y),sort=True)
 lines=[compact(z) for z in s.splitlines() if '현황' in z]
 if not lines:return old
 z=lines[-1]
 for name in ['지역인재기회균형대상자','지역인재교과','교과성적우수자','학교생활우수자전형','잠재능력우수자','농·어촌학생','농어촌학생','특성화고교출신자','예체능우수자','체육특기자','기회균형대상자']:
  if name in z:return '특성화고교출신자(동일계)' if name=='특성화고교출신자' else name
 return old

def main():
 out=[]
 for y in [2024,2025,2026]:
  for rd,part,idx in [('수시','rolling',0),('수시','rolling',1),('정시','regular',0)]:
   key=f'donga-{y}-{part}-page-file-{idx}';doc=fitz.open(CACHE/(key+'.pdf'));pg='일반학생' if rd=='정시' else '';groups={}
   for p in tables(key):
    ts=sorted(p['tables'],key=lambda t:(int(t['bbox'][0]>doc[p['page']-1].rect.width*.45),t['bbox'][1]))
    for ti,t in enumerate(ts,1):
     raw=t['rows'];first=[compact(z) for z in raw[0]];uc=next((j for j,z in enumerate(first) if '모집단위' in z or z=='모집전형'),None)
     if uc is None:continue
     pg=title(doc,p['page'],t,pg);m=re.search(r'\((.*?)\)',first[uc])
     if m:pg=m[1]
     if not pg:raise ValueError((key,p['page'],'no program'))
     q=next((j for j,z in enumerate(first) if z=='모집인원'),None);ap=next((j for j,z in enumerate(first) if z=='지원인원'),None);co=next((j for j,z in enumerate(first) if z=='경쟁률'),None)
     h=next((i for i,v in enumerate(raw) if i and clean(v[uc]) and compact(v[uc]) not in ['모집단위','모집전형'] and any(positive(z) for z in v[uc+1:])),None)
     if h is None:continue
     # Header depth must not include a suppressed first data row.
     h=1 if raw[1][uc] is not None and (q is not None or ap is not None) else min(h,3 if rd=='정시' else 2)
     labs=header(raw,h)
     stats=('교과평균등급' in first or '대학수학능력시험' in first) and ap is None
     gradecol=first.index('교과평균등급') if '교과평균등급' in first else None
     c70=(len(first)-1) if gradecol is not None else 5 if rd=='정시' and stats and len(first)==9 else None
     for ri,v in rows(raw,h,range(uc+1)):
      if not v[uc] or any(z in compact(v[uc]) for z in ['합계','소계','모집단위','모집전형']):continue
      if ap is not None and not number(v[ap]):continue
      if ap is None and not any(positive(z) for z in v[uc+1:]) and not any('미공개' in z for z in v):continue
      unit=v[uc];program=pg
      if first[uc]=='모집전형':program=v[uc];unit=v[0]+'(모집단위 미표기)'
      elif idx==0 and rd=='수시' and '지역인재' in unit:
       m=re.search(r'\((.*?)\)',unit)
       if m:program=m[1];unit=unit[:unit.index('(')].strip()
      if rd=='정시':
       pc=next((j for j,z in enumerate(first) if z=='전형구분'),None)
       program='일반학생 '+v[pc] if pc is not None else v[0]
      typ='실기' if any(z in program for z in ['실기','예체능','체육']) else '수능' if rd=='정시' else '종합' if idx==0 else '교과'
      quota=v[q] if q is not None else ''
      if rd=='정시' and ap is not None:
       if '모집인원(이월후)' in first:quota=v[first.index('모집인원(이월후)')]
       elif '모집' in first:
        candidates=[z for z in v[uc+2:ap] if number(z)];quota=candidates[-1] if candidates else ''
      r=make(key,'동아대학교',y,rd,program,unit,f'PDF p{p["page"]} 표{ti} 행{ri}',labs,v,typ=typ,metric='환산점수' if rd=='정시' else '교과등급',q=quota,ap=v[ap] if ap is not None else '',co=v[co] if co is not None else '',c70=v[c70] if c70 is not None else '',note='최고·평균·70%·등록인원 3명 이하 미공개 원문 보존; 충원 최종순위는 인원 아님')
      if not r:continue
      ident=(program,compact(unit))
      if ident not in groups:groups[ident]=r
      else:
       dest=groups[ident];dest['cut_other']+=' / 별도 성적표: '+r['cut_other'];dest['source_page']+='; '+r['source_page'].split(' / ',1)[-1]
       for col in ['cut_50','cut_70','quota','applicants','competition_rate']:
        if r[col] and not dest[col]:dest[col]=r[col]
   out+=list(groups.values())
 save('donga',out)
 (CACHE/'buk-donga-review.json').write_text(json.dumps(REVIEW,ensure_ascii=False,indent=2),encoding='utf8')
if __name__=='__main__':main()
