from pathlib import Path
import json,re
P=Path(__file__).parent
jobs={'knu-results':'https://ipsi1.knu.ac.kr/data/?r=GCgVAF0VXCE0PmQ','knu-2026-viewer':'https://ipsi1.knu.ac.kr/_common/pdf_viewer.php?e_no=12&m_type=enterinfo','yu-new-main':'https://enter.yu.ac.kr/main','daegu-script':'https://ipsi.daegu.ac.kr/js/site/article/Article.js'}
for x in json.loads((P/'dnue-results.links.json').read_text(encoding='utf8')):
 if re.search(r'202[456]학년도 입학전형 결과',x['text']):jobs['dnue-'+re.search(r'202[456]',x['text'])[0]+'-viewer']=x['url']
for x in json.loads((P/'kumoh-2026-susi-post.links.json').read_text(encoding='utf8')):
 if 'xlsx' in x['text']:jobs['kumoh-2024-2026']=x['url']
for x in json.loads((P/'dcu-2025-susi-post.links.json').read_text(encoding='utf8')):
 m=re.search(r"fn_egov_downFile\('([^']+)','([^']+)'\)",x['url'])
 if m:jobs['dcu-2025-susi']='https://ibsi.cu.ac.kr/cmm/fms/FileDown.do?atchFileId='+m[1]+'&fileSn='+m[2]
for x in json.loads((P/'dcu-jeongsi-list.links.json').read_text(encoding='utf8')):
 if re.search(r'202[45]학년도 정시모집 경쟁률',x['text']):jobs['dcu-'+re.search(r'202[45]',x['text'])[0]+'-jeongsi-post']=x['url']
(P/'batch09.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
