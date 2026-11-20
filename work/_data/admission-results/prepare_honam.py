from pathlib import Path
import json,re
C=Path(__file__).parent/'national-expansion'
rs=json.loads((C/'honam-roster.json').read_text(encoding='utf8'))
extra=json.loads((C/'honam-roster-extra.json').read_text(encoding='utf8'))
for a in extra:
 for r in a['results']:
  if r['unvCd'] not in {d['unvCd'] for d in rs}:rs.append(r)
slugs={'0000009':'kunsan','0000228':'jesus','0000157':'woosuk-jeonju','0000159':'wku','0000025':'jbnu','0000258':'jnue','0000171':'jj','0000282':'howon','0000075':'gwangju-catholic','0000252':'gwangju-edu','0000231':'gwangju','0000076':'kwu','0000011':'mokpo','0000012':'mmu','0000020':'scnu','0000216':'nambu','0000104':'dsu','0000221':'mcu','0000092':'sehan-yeongam','0000243':'songwon','0000155':'yungsan','0000023':'jnu','0000024':'jnu-yeosu','0000172':'chosun','0000246':'chodang','0000208':'honam','0000209':'htus','0000073':'kwangshin','0000206':'hanil','0000218':'yewon-imsil'}
jobs={}
for r in rs:
 sl=r['slug']=slugs[r['unvCd']]
 if sl=='jnu-yeosu':r['unvNm']='전남대학교(여수)'
 for y in [2024,2025,2026]:jobs[f'{sl}-adiga-{y}']=f'https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&searchSyr={y+1}&unvCd={r["unvCd"]}'
(C/'honam-roster.json').write_text(json.dumps(rs,ensure_ascii=False,indent=2),encoding='utf8')
(C/'honam-initial-jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
print('campus records',len(rs),'source jobs',len(jobs))
