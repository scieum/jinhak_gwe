from pathlib import Path
import json
P=Path(__file__).parent
jobs={'jejunu-2024-2026':'https://ibsi.jejunu.ac.kr/files/ibsi/content/202605/d1d48e51aa241bd6096bbcba0bdecc5f.xlsx',
'inu-2026-jeongsi-post':'https://admission.inu.ac.kr/detail.do?board_seq=15141&categoryid=53&menuurl=7o6CZK4SE%2FZm%2Fkm5uoXMkQ%3D%3D&pageNo=1&userpwd=',
'jiu-susi':'https://www.jeju.ac.kr/admission/rolling/result.htm','jiu-jeongsi':'https://www.jeju.ac.kr/admission/regular/result.htm'}
for x in json.loads((P/'inu-2026-susi-post.links.json').read_text(encoding='utf8')):
 if '결과.pdf' in x['text']:jobs['inu-2026-susi']=x['url']
 for y in [2024,2025]:
  if f'{y}학년도 수시모집' in x['text'] and '바로가기' in x['text']:jobs[f'inu-{y}-susi-post']=x['url']
(P/'batch02.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
