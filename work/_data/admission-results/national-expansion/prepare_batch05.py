from pathlib import Path
import json,re
P=Path(__file__).parent
jobs={'inu-2025-jeongsi-post':'https://admission.inu.ac.kr/detail.do?board_seq=12289&categoryid=53&menuurl=7o6CZK4SE%2FZm%2Fkm5uoXMkQ%3D%3D&pageNo=1&userpwd=', 'inha-intro':'https://admission.inha.ac.kr/intro.do'}
for y in [2024,2025,2026]:
 for x in json.loads((P/f'iccu-{y}-post.links.json').read_text(encoding='utf8')):
  if 'javascript:file_download' in x['url']:jobs[f'iccu-{y}']=re.search(r"'(https[^']+)'",x['url'])[1]
for x in json.loads((P/'inu-2024-jeongsi-post.links.json').read_text(encoding='utf8')):
 if '입시결과' in x['text'] and '.pdf' in x['url']:jobs['inu-2024-jeongsi']=x['url']
(P/'batch05.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
