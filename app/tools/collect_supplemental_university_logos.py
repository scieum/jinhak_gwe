"""Cache missing institutional marks from official public UI pages, unchanged."""
import hashlib
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image

APP = Path(__file__).resolve().parents[1]
OUT = APP / 'public/assets/universities'
CACHE = APP.parent / 'work/_data/university-logos'
SOURCES = [
 ('police', '경찰대학', 'https://www.police.ac.kr/police/police/html/intro/sym/ci.do?mdex=police29', 'https://www.police.ac.kr/images/police/common/img_logo.png'),
 ('gist', '광주과학기술원(GIST)', 'https://ewww.gist.ac.kr/kr/html/sub01/01030301.html', 'https://ewww.gist.ac.kr/kr/img/sub01/01030301_img01.png'),
 ('unist', '울산과학기술원(UNIST)', 'https://www.unist.ac.kr/unist/introduction/download.do', 'https://www.unist.ac.kr/_res/unist/unist/img/common/img-logo-new-b.png'),
 ('kaist', '한국과학기술원(KAIST)', 'https://kaist.ac.kr/kr/html/kaist/010401.html', 'https://kaist.ac.kr/kr/img/content/sub01/sym_new_01.gif'),
 ('kentech', '한국에너지공과대학교', 'https://admission.kentech.ac.kr/submenu.do?menuurl=LxZUaTFmmSi27DgQxWKW1A%3D%3D', 'https://admission.kentech.ac.kr/resources/sites/eng/images/custom/top-logo.png'),
 ('karts', '한국예술종합학교', 'https://karts.ac.kr/main/index.do?menuId=010401000000', 'https://karts.ac.kr/templates/images/sub/emb02.png'),
 ('nuch', '한국전통문화대학교', 'https://www.knuh.ac.kr/english/content.do?mnuBaseId=MNU0000561&topBaseId=MNU0000557&tplBaseId=TPL0000219', 'https://www.knuh.ac.kr/img/english/sub1/ui_img02.jpg'),
]


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    records = []
    for key, name, page, url in SOURCES:
        cache = CACHE / (hashlib.sha256(url.encode()).hexdigest()+'.image')
        if cache.exists():
            raw = cache.read_bytes()
        else:
            with urlopen(Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=30) as response:
                raw = response.read(5_000_001)
        assert len(raw) <= 5_000_000
        with Image.open(io.BytesIO(raw)) as image:
            extension = {'PNG':'png', 'JPEG':'jpg', 'GIF':'gif'}[image.format]
            width, height = image.size
            assert min(width, height) >= 16
            image.verify()
        digest = hashlib.sha256(raw).hexdigest()
        filename = digest+'.'+extension
        (OUT / filename).write_bytes(raw)
        cache.write_bytes(raw)
        record = dict(id='institution-'+key, university=name, campus='대학 공통', collection_group='supplemental',
            source_page=page, source_image=url, file=filename, sha256=digest, bytes=len(raw),
            width=width, height=height, checked_at=datetime.now(timezone.utc).isoformat(),
            usage_note='공식 공개 UI 원본; 대학 식별용 표시. 사용 권한·상업 이용 허가를 부여하는 기록이 아님.')
        if key == 'police':
            record['source_stylesheet'] = 'https://www.police.ac.kr/css/police/common.css'
        records.append(record)
        print(json.dumps(dict(university=name,file=filename,width=width,height=height),ensure_ascii=False),flush=True)
    # Persist only after all seven downloads validate successfully.
    (CACHE / 'supplemental-sources.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    manifest_path = OUT / 'sources.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    ids = {r['id'] for r in records}
    manifest['entries'] = [r for r in manifest['entries'] if r['id'] not in ids] + records
    manifest['supplemental_checked_at'] = records[-1]['checked_at']
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    from collect_university_logos import write_mappings
    write_mappings(manifest['entries'])


if __name__ == '__main__':
    build()
