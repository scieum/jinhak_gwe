from pathlib import Path
import json,re
P=Path(__file__).parent
jobs={'knu-intro':'https://ipsi1.knu.ac.kr/intro/','yu-main':'https://enter.yu.ac.kr/enter/resultPage','yu-old-post':'https://enter.yu.ac.kr/page/board/doumi_data.htm?bbsid=pds&bltn_seq=37979&ctg_cd=susi&mode=view&page=1','dnue-results':'https://dnue.ac.kr/ipsi/CMS/Board/Board.do?mCode=MN027','dcu-2025-susi-post':'https://ibsi.cu.ac.kr/kor/BBSMSTR_000000000131/14804/view.do','dcu-jeongsi-list':'https://ibsi.cu.ac.kr/kor/bbs/BBSMSTR_000000000046/lst.do'}
for key in ['dcu-2026-susi-post','dcu-2026-jeongsi-post']:
 for x in json.loads((P/(key+'.links.json')).read_text(encoding='utf8')):
  m=re.search(r"fn_egov_downFile\('([^']+)','([^']+)'\)",x['url'])
  if m:jobs[key.replace('-post','')+('-xlsx' if '.xlsx' in x['text'] else '')]='https://ibsi.cu.ac.kr/cmm/fms/FileDown.do?atchFileId='+m[1]+'&fileSn='+m[2]
for x in json.loads((P/'kumoh-results.links.json').read_text(encoding='utf8')):
 if '2026학년도 수시모집 입시결과' in x['text']:jobs['kumoh-2026-susi-post']=x['url']
(P/'batch08.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
