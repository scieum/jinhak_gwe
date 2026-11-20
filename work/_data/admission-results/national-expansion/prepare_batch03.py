from pathlib import Path
import json
P=Path(__file__).parent
jobs={'iccu-results':'https://admission.iccu.ac.kr/bbs/board.php?bo_table=result'}
for key in ['inu-2026-jeongsi-post','inu-2025-susi-post','inu-2024-susi-post']:
 for x in json.loads((P/(key+'.links.json')).read_text(encoding='utf8')):
  if '.pdf' in x['url']:jobs[key.replace('-post','')]=x['url']
  if '2024학년도 정시모집' in x['text'] and '바로가기' in x['text']:jobs['inu-2024-jeongsi-post']=x['url']
  if '2025' in x['text']:print(x)
(P/'batch03.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
