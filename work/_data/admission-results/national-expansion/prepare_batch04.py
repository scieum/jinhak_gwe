from pathlib import Path
import json,re
P=Path(__file__).parent
jobs={'jiu-2024-susi':'https://apply.jeju.ac.kr/admission/rolling/result.htm?act=download&no=1&seq=28666'}
for x in json.loads((P/'iccu-results.links.json').read_text(encoding='utf8')):
 if re.search(r'202[456]학년도 신입학 결과',x['text']):jobs['iccu-'+re.search(r'202[456]',x['text'])[0]+'-post']=x['url']
for x in json.loads((P/'inu-2024-jeongsi-post.links.json').read_text(encoding='utf8')):
 if '.pdf' in x['url']:jobs['inu-2024-jeongsi']=x['url']
(P/'batch04.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
