"""Audit local logo assets and the institution/campus directory coverage."""
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from PIL import Image

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def normalize(name):
    return re.sub(r'\s', '', unicodedata.normalize('NFKC', name).replace('대학교', '대').removeprefix('국립'))


def audit():
    names = read(APP/'src/data/universityLogoNames.json')
    plans = read(APP/'src/data/universityLogos.json')
    directory = read(ROOT/'work/_data/university-directory/directory.json')
    display = read(APP/'src/data/universityDisplayNames.json')
    index = {normalize(n): f for n, f in names.items()}
    def resolve(label):
        name = normalize(display.get(label, label))
        return index.get(name) or index.get(re.sub(r'\([^)]*\)', '', name))
    missing = [i['university'] for i in directory['universities'] if not resolve(i['university'])]
    result_missing = [e['source_label'] for i in directory['universities'] for e in i['result_entries'] if not resolve(e['source_label'])]
    plan_missing = [p['id'] for i in directory['universities'] for p in i['plan_entries'] if p['id'] not in plans]
    errors = []
    files = set(names.values()) | set(plans.values())
    manifest = read(APP/'public/assets/universities/sources.json')
    for file in sorted(files):
        path = APP/'public/assets/universities'/file
        try:
            raw = path.read_bytes()
            assert hashlib.sha256(raw).hexdigest() == path.stem, 'Hash mismatch'
            with Image.open(path) as image:
                image.verify()
            records = [r for r in manifest['entries'] if r.get('file') == file]
            assert records and all(r['sha256'] == path.stem and r['bytes'] == len(raw) and r.get('source_page') for r in records), 'Source manifest mismatch'
        except Exception as error:
            errors.append(dict(file=file, error=str(error)))
    report = dict(status='pass' if not (missing or result_missing or plan_missing or errors) else 'fail',
        universities=len(directory['universities']), result_labels=sum(len(i['result_entries']) for i in directory['universities']),
        plan_entries=sum(len(i['plan_entries']) for i in directory['universities']), unique_images=len(files),
        missing_universities=missing, missing_result_labels=result_missing, missing_plan_entries=plan_missing, file_errors=errors,
        scope='Local file/hash/image/source and name-link validation; not a usage-permission certification.')
    output = ROOT/'work/_data/university-logos/audit-2026-11-24.json'
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['status']=='pass' else 1


if __name__ == '__main__':
    raise SystemExit(audit())
