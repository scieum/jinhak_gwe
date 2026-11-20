from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re,json,sys
p=Path(__file__).parent/'gyeonggi-expansion'
b={}
for k,base in json.loads((p/'batch03.json').read_text(encoding='utf8')).items():
 f=p/(k+'.html')
 if not f.exists():continue
 s=BeautifulSoup(f.read_text(encoding='utf8'),'html.parser');n=0
 for a in s.select('[href],[data-url]'):
  u=a.get('href') or a.get('data-url') or '';t=a.get_text(' ',strip=True)
  if ('-post' in k and re.search('download|filedown',u,re.I) and not '.hwp' in t+u) or (k.startswith('hknu-20') and 'new_download_file' in u) or (k.startswith('ajou-20') and '.pdf' in u):
   n+=1;b[k.replace('-post','').replace('-list','')+('' if n==1 else '-'+str(n))]=urljoin(base,u)
  if k in ['tukorea-jeongsi-list','suwon-jungsi-list'] and re.search(r'202[456]',t) and re.search('결과자료|입시결과',t):
   y=re.search('202[456]',t)[0];b[k.split('-')[0]+f'-{y}-jeongsi-post']=urljoin(base,u)
b.update({
 'hs-2026-jeongsi-post':'https://ent.hs.ac.kr/ipsi/pages/?b=b_1_8&bn=22848&m=read&p=43',
 'hs-2024-jeongsi-post2':'https://ent.hs.ac.kr/ipsi/pages/?b=b_1_8&bn=21211&m=read&p=43',
 'anyang-list':'https://enter.anyang.ac.kr/10000015?mode=list',
 'yongin-2026-susi':'https://ipsi.yongin.ac.kr/ipsi/prev/result/susi/prev_susi_result_20260529_15361.pdf',
 'yongin-home':'https://ipsi.yongin.ac.kr/index.do',
 'daejin-home':'https://admission.daejin.ac.kr/',
 'sungkyul-home':'https://ipsi.sungkyul.ac.kr/main',
 'hansei-list':'https://ipsi.hansei.ac.kr/view.do?no=1098&pgMode=index',
 'sungkyul-2026-susi':'https://ipsi.sungkyul.ac.kr/files/ipsi/menu/202605/1127b839119a550ab31babd6074bda31.pdf'
})
(p/'batch04.json').write_text(json.dumps(b,ensure_ascii=False,indent=2),encoding='utf8');print(len(b))
