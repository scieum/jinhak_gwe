"""Regression checks based on visually inspected official source samples."""
from finalize_daegu_gyeongbuk import read,P,C
from normalize_honam_office import grid,number
import openpyxl,json
checks=[]
def sample(sl,pred,expected,raw=()):
 rs=[r for r in read(P/(sl+'.csv')) if pred(r)];assert len(rs)==1,(sl,len(rs));r=rs[0]
 for k,v in expected.items():assert r[k]==v,(sl,k,r[k],v)
 for v in raw:assert v in r['cut_other'],(sl,v)
 checks.append(dict(file=sl+'.csv',source_url=r['source_url'],source_page=r['source_page'],program=r['program'],recruit_unit=r['recruit_unit'],expected=expected,raw_contains=list(raw),status='passed; rendered original visually compared during collection'))
sample('nambu',lambda r:r['result_year']=='2026' and r['round']=='수시' and r['recruit_unit']=='간호학과' and '일반학생' in r['program'],dict(quota='188',applicants='988',cut_50='5.90',cut_70='6.18',fill_count=''),['393'])
sample('woosuk-jeonju',lambda r:r['result_year']=='2025' and r['recruit_unit']=='간호학과' and '지역인재' in r['program'],dict(cut_70='3.7',fill_count=''),['평균 3.43'])
sample('honam',lambda r:r['result_year']=='2025' and '시각융합' in r['recruit_unit'] and '일반고' in r['program'],dict(cut_50='',cut_70=''),['6.73'])
sample('mmu',lambda r:r['result_year']=='2025' and r['recruit_unit']=='기관시스템공학부' and '학생부성적' in r['program'],dict(quota='43',applicants='289',cut_50='',cut_70=''),['4.46','4.81'])
sample('jesus',lambda r:r['result_year']=='2026' and r['round']=='정시',dict(quota='21',applicants='77',cut_50='926.09',cut_70='922.67'))
w=openpyxl.load_workbook(C/'jbnu-che-2025-sub0.xlsx',data_only=True);jb=[]
for s in w:
 g=grid(s);h=next(i for i,v in enumerate(g) if '모집단위명' in v);u=g[h].index('모집단위명')
 source=[v for v in g[h+1:] if v[u] and v[u]!='모집단위명' and not any(z in v[u] for z in ['합계','소계']) and any(number(z) for z in v[u+1:])]
 out=[r for r in read(P/'jbnu.csv') if r['result_year']=='2025' and (' / '+s.title+' 행') in r['source_page']]
 assert len(source)==len(out),(s.title,len(source),len(out));jb.append(dict(sheet=s.title,source_rows=len(source),normalized_rows=len(out)))
(C/'honam-manual-verification.json').write_text(json.dumps(dict(samples=checks,jbnu_2025_row_coverage=jb,howon_vertical_shared_quota_cells_found=0),ensure_ascii=False,indent=2),encoding='utf8')
print('Passed',len(checks),'source samples;',jb)
