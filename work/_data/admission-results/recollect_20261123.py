"""Targeted official-source recollection; cache evidence without modifying existing rows."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from urllib.parse import urljoin
import csv, hashlib, json, re, sys
import requests, urllib3
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / 'recollect-20261123'
CACHE.mkdir(exist_ok=True)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
SEEDS = {
    'ggu-board': 'https://www.ggu.ac.kr/matriculation/sub030101',
    'chodang-board': 'https://ipsi.cdu.ac.kr/mod/page/view.do?MID=ADM_09060000',
    'jnue-home': 'https://portal.jnue.kr/portal/enter/main/main.do',
    'sehan-home': 'https://apply.sehan.ac.kr/',
    'gwangju-catholic-results': 'https://admission.gjc.ac.kr/sub/?mode=gradresult',
    'chungwoon-regular': 'https://enter.chungwoon.ac.kr/enter/selectBbsNttList.do?bbsNo=10&key=139',
    'u1-board': 'https://ipsi.u1.ac.kr/ipsi/data/result.do',
    'jbu-results': 'https://ipsi.joongbu.ac.kr/menu.es?mid=a60203010200',
    'jwu-regular': 'https://ipsi.jwu.ac.kr/boards/admission-results?category=regular',
    'hsmu-board': 'https://www.hsmu.ac.kr/admission/contents/AMS40100000.do',
    'dgist-home': 'https://admission.dgist.ac.kr/',
    'postech-home': 'https://adm-u.postech.ac.kr/',
    'kma-home': 'https://www.kma.ac.kr/',
    'kna-home': 'https://www.navy.ac.kr/',
    'afa-home': 'https://rokaf.airforce.mil.kr/sites/afaadmission/index.do',
    'kafna-faq': 'https://tapply.tonc.net/kafna/?doc=bbs/faqlist.php',
}

def fetch(item):
    key, url = item
    meta = dict(key=key, url=url, fetched_at=datetime.now(timezone.utc).isoformat())
    try:
        # Public document downloads only; the execution host lacks the proxy CA.
        r = requests.get(url, timeout=(12, 30), verify=False, headers={'User-Agent': 'Mozilla/5.0'})
        meta['tls_verification'] = False
        meta.update(status=r.status_code, final_url=r.url, bytes=len(r.content), sha256=hashlib.sha256(r.content).hexdigest())
        r.raise_for_status()
        ext = 'pdf' if r.content.startswith(b'%PDF') else 'zip' if r.content.startswith(b'PK') else 'ole' if r.content.startswith(bytes.fromhex('d0cf11e0')) else 'png' if r.content.startswith(bytes.fromhex('89504e47')) else 'jpg' if r.content.startswith(bytes.fromhex('ffd8ff')) else 'html'
        (CACHE / f'{key}.{ext}').write_bytes(r.content)
        meta['file'] = f'{key}.{ext}'
        if ext == 'html':
            r.encoding = r.apparent_encoding
            soup = BeautifulSoup(r.text, 'html.parser')
            (CACHE / f'{key}.txt').write_text(soup.get_text(' ', strip=True), encoding='utf8')
            links = [{'text': a.get_text(' ', strip=True), 'url': urljoin(r.url, a.get('href','')), 'onclick': a.get('onclick','')} for a in soup.select('a[href]')]
            links += [{'text': a.get('alt',''), 'url': urljoin(r.url,a['src']), 'kind':a.name} for a in soup.select('img[src],iframe[src],script[src]')]
            (CACHE / f'{key}.links.json').write_text(json.dumps(links, ensure_ascii=False, indent=2),encoding='utf8')
            meta['tables'] = len(soup.find_all('table'))
        elif ext == 'pdf':
            import fitz
            doc=fitz.open(stream=r.content, filetype='pdf')
            (CACHE/f'{key}.txt').write_text('\n'.join(f'PAGE {i+1}\n'+p.get_text(sort=True) for i,p in enumerate(doc)),encoding='utf8')
            meta['pages']=len(doc)
    except Exception as e:
        meta['error'] = str(e)
    (CACHE / f'{key}.meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2),encoding='utf8')
    return meta

def run(jobs):
    with ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(fetch, jobs.items()):
            print(json.dumps(result, ensure_ascii=False),flush=True)

def prepare_followup():
    jobs={}
    for key in ['chodang-board','dgist-home','postech-home','hsmu-board']:
        links=json.loads((CACHE/f'{key}.links.json').read_text(encoding='utf8'))
        for i,x in enumerate(links):
            wanted = (key=='chodang-board' and 'downloadUploadFile' in x['url'] or
                      key=='dgist-home' and x['text'] in ['보도자료','자료실','공지사항','입학자료 열람 및 다운로드'] or
                      key=='postech-home' and x['text'] in ['대입정보포털','서식 및 참고자료','모집요강'] or
                      key=='hsmu-board' and 'AMS20200000' in x['url'])
            if wanted and x['url'] not in jobs.values():jobs[f'{key}-link{i}']=x['url']
    for slug,years in [('chodang',[2026]),('jnue',[2025]),('sehan-yeongam',[2026]),('gwangju-catholic',[2024,2025]),('postech',[2024,2026])]:
        for year in years:
            meta=json.loads((ROOT/'national-expansion'/f'{slug}-adiga-{year}.meta.json').read_text(encoding='utf8'))
            jobs[f'{slug}-adiga-{year}']=meta['url']
    # Source-hosted alternate entrance discovered from official prior documents.
    jobs['sehan-old-results']='https://house.sehan.ac.kr/html/iphak1/data/resu.html?sub_node=3_0'
    jobs['sehan-apply']='https://apply.sehan.ac.kr/apply/'
    jobs['jnue-entrance']='https://enter.jnue.kr/'
    (CACHE/'followup-jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')

def adiga(key):
    source=json.loads((CACHE/f'{key}.meta.json').read_text(encoding='utf8'))['url']
    sess=requests.Session();sess.verify=False
    sess.headers.update({'User-Agent':'Mozilla/5.0','Referer':source})
    r=sess.get(source,timeout=30);r.raise_for_status();r.encoding='utf8'
    soup=BeautifulSoup(r.text,'html.parser')
    csrf=soup.select_one('meta[name="_csrf"]')
    if csrf:sess.headers['X-CSRF-TOKEN']=csrf['content']
    for button in soup.select('button[onclick]'):
        if '전형 결과' not in button.get_text():continue
        args=re.findall(r'"([^"]*)"',button['onclick'])
        if len(args)!=4:continue
        params=dict(zip(['searchSyr','unvCd','tsrdCmphSlcnArtclUpCd','compUnvCd'],args))
        outkey=key+'-'+args[2]
        resp=sess.post('https://www.adiga.kr/uct/acd/ade/criteriaAndResultItemNewAjax.do',data=params,timeout=30)
        resp.encoding='utf8'
        (CACHE/f'{outkey}.html').write_bytes(resp.content)
        fragment=BeautifulSoup(resp.text,'html.parser')
        (CACHE/f'{outkey}.txt').write_text(fragment.get_text(' ',strip=True),encoding='utf8')
        meta=dict(url=source,request_url=resp.url,method='POST public result accordion',params=params,status=resp.status_code,bytes=len(resp.content),sha256=hashlib.sha256(resp.content).hexdigest(),fetched_at=datetime.now(timezone.utc).isoformat(),tables=len(fragment.find_all('table')))
        (CACHE/f'{outkey}.meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
        print(outkey,resp.status_code,len(resp.content),'tables',meta['tables'],flush=True)

def roster():
    source='https://www.adiga.kr/uct/acd/ade/criteriaAndResultView.do?menuId=PCUCTACD2000'
    sess=requests.Session();sess.verify=False
    sess.headers['User-Agent']='Mozilla/5.0'
    r=sess.get(source,timeout=30);r.encoding='utf8'
    soup=BeautifulSoup(r.text,'html.parser');csrf=soup.select_one('meta[name="_csrf"]')
    if csrf:sess.headers['X-CSRF-TOKEN']=csrf['content']
    sess.headers['Referer']=source
    params={'searchSyr':'2027','pagination.currentPage':'1','pagination.cntPerPage':'500','searchConstIndex':'0'}
    r=sess.post('https://www.adiga.kr/uct/acd/ade/criteriaAndResultAjax.do',data=params,timeout=30);r.raise_for_status();r.encoding='utf8'
    (CACHE/'adiga-roster.html').write_bytes(r.content)
    out=[]
    for t in BeautifulSoup(r.text,'html.parser').select('input[onchange]'):
        m=re.search(r'fnSelCompUnv\(this, (\{.*\})\)',t['onchange'])
        if m:out.append(json.loads(m[1]))
    (CACHE/'adiga-roster.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
    targets={'금강':'ggu','청운':'chungwoon','유원':'u1','중부':'jbu','중원':'jwu','화성의과학':'hsmu'}
    jobs={}
    for d in out:
        for name,slug in targets.items():
            if name in d['unvNm']:
                print(d['unvNm'],d['unvCd'])
                for y in ([2024,2025,2026] if slug in ['jbu','jwu','hsmu'] else [2026]):
                    jobs[f'{slug}-adiga-{y}']='https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&searchSyr='+str(y+1)+'&unvCd='+d['unvCd']
    jobs['jnue-list-js']='https://www.jnue.kr/js/portal/list.js?2026111901'
    (CACHE/'target-adiga-jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf8')
    run(jobs)

def jnue_list(keys=None):
    jobs={}
    for key in keys or ['jnue-board45','jnue-board50']:
        s=BeautifulSoup((CACHE/f'{key}.html').read_bytes(),'html.parser')
        params={k:s.find(id=k).get('value','') for k in ['boardId','menuId']}
        params.update(pageIndex='1',pageSize='100',searchCondition='',searchKeyword='',category='')
        url='https://www.jnue.kr/portal/bbs/external_article_list.ajax'
        r=requests.post(url,data=params,verify=False,timeout=30);r.raise_for_status();r.encoding='utf8'
        (CACHE/f'{key}-ajax.json').write_text(r.text,encoding='utf8')
        (CACHE/f'{key}-ajax.meta.json').write_text(json.dumps(dict(url=url,method='POST public board list',params=params,sha256=hashlib.sha256(r.content).hexdigest(),fetched_at=datetime.now(timezone.utc).isoformat()),ensure_ascii=False,indent=2),encoding='utf8')
        result=r.json()
        print(key,'count',result.get('cnt'))
        for item in result.get('list',[]):
            if re.search(r'202[456].*(결과|통계|성적)',item['title']):
                print(item['boardSeq'],item['title'])
                for i,f in enumerate(item.get('files',[])):
                    print(f['orginlNm'],f['fileDownloadUrl'])
                    jobs[f'jnue-post{item["boardSeq"]}-file{i}']=f['fileDownloadUrl']
    jobs['sehan-header']='https://apply.sehan.ac.kr/apply/2019/CM/IN/Header.xml'
    run(jobs)

def more():
    jobs={}
    links=json.loads((CACHE/'jnue-entrance.links.json').read_text(encoding='utf8'))
    for x in links:
        if 'menuId=M000700010' in x['url']:jobs['jnue-notices']=x['url']
        if 'menuId=M000800010' in x['url']:jobs['jnue-regular-notices']=x['url']
    run(jobs);jnue_list(list(jobs))
    url='https://apply.sehan.ac.kr/apply/mainSvr/selectMenuListByHeader.do'
    r=requests.post(url,json={},verify=False,timeout=30);r.raise_for_status();r.encoding='utf8'
    (CACHE/'sehan-menu.json').write_text(r.text,encoding='utf8')
    print('SEHAN',r.text[:18000])

def sehan():
    def query(key, endpoint, params):
        url='https://apply.sehan.ac.kr/apply/admi/'+endpoint+'.do'
        r=requests.post(url,json=params,verify=False,timeout=30);r.raise_for_status();r.encoding='utf8'
        (CACHE/f'{key}.json').write_text(r.text,encoding='utf8')
        (CACHE/f'{key}.meta.json').write_text(json.dumps(dict(url=url,source_page='https://apply.sehan.ac.kr/apply/websquare/websquare.jsp?w2xPath=/apply/2019/AD/AS/SADASEAM02.xml',method='POST public results',params=params,sha256=hashlib.sha256(r.content).hexdigest(),fetched_at=datetime.now(timezone.utc).isoformat()),ensure_ascii=False,indent=2),encoding='utf8')
        return r.json()
    print('YEARS',query('sehan-years','selectPreviousApplySeltYrList',{}))
    p={'SELT_YR':'2026','COLL_DIV_CD':'','SELT_TYPE_CD':'','ORDER_GB':'1'}
    print('ROUNDS',query('sehan-rounds','selectPreviousApplyCollDivCdList',p))
    d=query('sehan-2026-results','selectPreviousExamResultList',p)
    print('RESULTS',len(d.get('rows',[])),str(d)[:1700])
    run({'sehan-2027-guide':'https://apply.sehan.ac.kr/apply/resource/data/2027_sehan_susi_web_1.pdf'})

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf8')
    if sys.argv[1] == 'seed': run(SEEDS)
    elif sys.argv[1] == 'prepare': prepare_followup()
    elif sys.argv[1] == 'adiga':
        for key in sys.argv[2:]:adiga(key)
    elif sys.argv[1] == 'roster':roster()
    elif sys.argv[1] == 'jnue-list':jnue_list()
    elif sys.argv[1] == 'more':more()
    elif sys.argv[1] == 'sehan':sehan()
    elif sys.argv[1] == 'fetch': run(json.loads(Path(sys.argv[2]).read_text(encoding='utf-8-sig')))
    elif sys.argv[1] == 'inspect':
        for key in sys.argv[2:]:
            print('\nSOURCE',key)
            f=CACHE/f'{key}.links.json'
            if f.exists():
                for item in json.loads(f.read_text(encoding='utf8')):
                    if re.search(r'결과|202[4567]|다운|첨부|download|\.pdf|경쟁률|입학자료',item['text']+' '+item['url'],re.I):print(json.dumps(item,ensure_ascii=False))
