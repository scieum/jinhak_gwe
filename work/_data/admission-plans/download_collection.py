"""Download the four official public Adiga plan archives; retain their provenance."""
import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
out = ROOT / 'collection'
out.mkdir(exist_ok=True)
records = []
for i, source in enumerate(json.loads((ROOT / 'collection-files.json').read_text(encoding='utf8'))):
    if not source['title'].endswith('.zip'):
        continue
    path = out / f'archive-{i + 1}.zip'
    if not path.exists():
        with urlopen(Request(source['url'], headers={'User-Agent': 'Mozilla/5.0'}), timeout=60) as response:
            with path.with_suffix('.tmp').open('wb') as stream:
                while chunk := response.read(1024 * 1024):
                    stream.write(chunk)
        path.with_suffix('.tmp').replace(path)
    with zipfile.ZipFile(path) as archive:
        members = []
        for member in archive.infolist():
            if member.is_dir():
                continue
            name = member.filename
            if not member.flag_bits & 0x800:
                try:
                    name = name.encode('cp437').decode('cp949')
                except (UnicodeError, LookupError):
                    pass
            members.append({'name': name, 'zip_name': member.filename, 'bytes': member.file_size})
        record = {**source, 'path': path.name, 'bytes': path.stat().st_size,
                  'sha256': hashlib.file_digest(path.open('rb'), 'sha256').hexdigest(),
                  'checked_at': datetime.now(timezone.utc).isoformat(), 'members': members}
        records.append(record)
        (out / 'index.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf8')
        print(json.dumps({'archive': path.name, 'bytes': record['bytes'], 'members': len(members), 'sample': members[:3]}, ensure_ascii=True), flush=True)
