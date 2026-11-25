"""Check and privately transfer runtime assets; never publish or collect student data."""
import argparse
import hashlib
import json
import re
import shutil
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from urllib.request import urlopen
from urllib.parse import urlparse

APP = Path(__file__).resolve().parents[1]
HASH = re.compile(r'[a-f0-9]{64}')
MAX_BYTES = 250 * 1024 * 1024
MAX_BUNDLE_BYTES = 600 * 1024 * 1024  # whole runtime bundle; plan PDF copies alone are ~200 MB


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def safe_path(name):
    path = PurePosixPath(name)
    if (not isinstance(name, str) or '\\' in name or ':' in name or path.is_absolute()
            or '..' in path.parts or str(path) != name
            or not name.startswith(('data/', 'assets/universities/', 'plans/'))):
        raise ValueError(f'Unsafe asset path: {name}')
    return path


def read_json(raw, name):
    try:
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise ValueError('Expected JSON object')
        return value
    except (ValueError, UnicodeError) as error:
        raise ValueError(f'{name}: invalid JSON (an HTML fallback is not a data file)') from error


def check(root=APP / 'public', url=None):
    files = {}

    def read(name):
        safe_path(name)
        if name in files:
            return files[name]
        try:
            if url:
                with urlopen(url.rstrip('/') + '/' + name, timeout=30) as response:
                    raw = response.read(MAX_BYTES + 1)
            else:
                location = (root / name).resolve()
                if not location.is_relative_to(root.resolve()):
                    raise ValueError('Asset resolves outside root')
                raw = location.read_bytes()
        except (OSError, ValueError) as error:
            raise ValueError(f'{name}: missing or unreadable; restore the private runtime bundle before building') from error
        if not raw or len(raw) > MAX_BYTES:
            raise ValueError(f'{name}: empty or oversized asset')
        files[name] = raw
        return raw

    def document(name):
        return read_json(read(name), name)

    collection = document('data/collected-results/index.json')
    placement = document('data/national-placement/index.json')
    if (collection.get('format') != 'jinhak-navi-collected-index' or collection.get('status') != 'draft'
            or collection.get('version') != 1 or not collection.get('universities')
            or placement.get('format') != 'jinhak-national-placement-index' or placement.get('version') != 2
            or placement.get('status') != 'draft' or not placement.get('years')
            or placement.get('collection_sha256') != collection.get('source_sha256')
            or placement.get('collection_rows') != collection.get('rows')
            or placement.get('collection_universities') != len(collection['universities'])):
        raise ValueError('Collection and placement indexes are missing, incompatible or from different data releases')
    susi = document('data/susi-results/index.json')
    if (susi.get('format') != 'jinhak-navi-collected-index' or susi.get('status') != 'draft'
            or susi.get('dataset') != 'organized-susi' or susi.get('review_format') != 'susi-row-review-v1'
            or susi.get('master_sha256') != collection.get('source_sha256') or not susi.get('universities')):
        raise ValueError('Susi catalog is missing or from another collection release')
    for index, key, directory, expected_format in [
        (collection, 'universities', 'collected-results', 'jinhak-navi-collected-results'),
        (susi, 'universities', 'susi-results', 'jinhak-navi-collected-results'),
        (placement, 'years', 'national-placement', 'jinhak-national-placement')]:
        total = 0
        identities = set()
        for entry in index[key]:
            identity_key = 'university' if key == 'universities' else 'year'
            identity = entry[identity_key]
            if identity in identities:
                raise ValueError(f'{directory}: duplicate index identity')
            identities.add(identity)
            sha = entry.get('sha256', '')
            if not isinstance(sha, str) or not HASH.fullmatch(sha) or entry.get('file') != f'{sha}.json':
                raise ValueError(f'{directory}: invalid content-addressed path')
            name = f'data/{directory}/{entry["file"]}'
            raw = read(name)
            if digest(raw) != sha or len(raw) != entry.get('bytes'):
                raise ValueError(f'{name}: SHA-256 or byte count mismatch')
            package = read_json(raw, name)
            if package.get('format') != expected_format or package.get('status') != 'draft' or package.get(identity_key) != identity or len(package.get('rows', [])) != entry.get('rows'):
                raise ValueError(f'{name}: package format or row count mismatch')
            if key == 'years':
                hashes = {item['university']: item['sha256'] for item in collection['universities']}
                if not package.get('sources') or any(hashes.get(name) != sha for name, sha in package['sources'].items()):
                    raise ValueError(f'{name}: placement references another source release')
            if directory == 'susi-results':
                if (package.get('review_format') != 'susi-row-review-v1'
                        or len(package.get('review_flags', [])) != entry['rows']
                        or entry.get('rounds') != {'수시': entry['rows']}):
                    raise ValueError(f'{name}: missing susi review metadata')
            total += entry['rows']
        if total != (collection['rows'] if key == 'years' else index['rows']):
            raise ValueError(f'{directory}: incomplete row coverage')
    plans = document('data/admission-plans.json')
    if plans.get('format') != 'jinhak-navi-admission-plans' or not plans.get('entries') or plans.get('review_status') != 'draft':
        raise ValueError('Admission plan catalog is missing or not a reference catalog')
    # Same-origin PDF copies (app/public/plans, gitignored): every referenced copy must exist with the catalog hash.
    plan_pdfs = {d['local_file']: d['sha256'] for e in plans['entries'] for d in e.get('documents', []) if 'local_file' in d}
    for name, sha in sorted(plan_pdfs.items()):
        if not re.fullmatch(r'plans/2028_[^/]+\.pdf', name) or digest(read(name)) != sha:
            raise ValueError(f'{name}: plan PDF copy missing or hash mismatch; rerun build_admission_plan_programs.py')
    document('data/released-results.json')
    document('data/scoring-rules.json')
    campus_map = document('data/univ-map.json')
    if (campus_map.get('format') != 'jinhak-navi-univ-map' or campus_map.get('version') not in (1, 2)
            or not campus_map.get('campuses')):
        raise ValueError('University campus map is missing or incompatible')
    logos = set()
    for mapping in ['universityLogos.json', 'universityLogoNames.json']:
        logos.update(json.loads((APP / 'src/data' / mapping).read_text(encoding='utf-8')).values())
    for name in sorted(logos):
        if not re.fullmatch(r'[a-f0-9]{64}\.(jpg|jpeg|png|gif|webp|svg|bmp)', name):
            raise ValueError(f'Invalid logo mapping: {name}')
        raw = read('assets/universities/' + name)
        if digest(raw) != name.split('.')[0]:
            raise ValueError(f'{name}: logo hash mismatch')
    report = {'files': len(files), 'bytes': sum(map(len, files.values())), 'collected_rows': collection['rows'],
              'universities': len(collection['universities']), 'placement_years': len(placement['years']),
              'plan_campuses': len(plans['entries']),
              'plan_pdfs': len(plan_pdfs), 'plan_pdf_bytes': sum(len(files[n]) for n in plan_pdfs), 'map_campuses': len(campus_map['campuses']), 'logos': len(logos)}
    return files, report


def bundle(root, destination):
    files, report = check(root)
    if destination.exists():
        raise ValueError(f'Bundle already exists: {destination}; use a new filename')
    destination.parent.mkdir(parents=True, exist_ok=True)
    manifest = {'format': 'jinhak-runtime-bundle', 'version': 1,
                'files': {name: {'sha256': digest(raw), 'bytes': len(raw)} for name, raw in sorted(files.items())}}
    with zipfile.ZipFile(destination, 'x', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('runtime-manifest.json', json.dumps(manifest, ensure_ascii=False))
        for name, raw in sorted(files.items()):
            archive.writestr(name, raw)
    return report


def restore(archive_path, root):
    # Validate all bytes and the complete runtime catalog in isolation before replacing any asset.
    with tempfile.TemporaryDirectory(prefix='jinhak-runtime-') as temporary:
        staged = Path(temporary)
        with zipfile.ZipFile(archive_path) as archive:
            infos = archive.infolist()
            names = [info.filename for info in infos]
            if len(names) != len(set(names)) or len(names) > 2000 or sum(i.file_size for i in infos) > MAX_BUNDLE_BYTES:
                raise ValueError('Duplicate, oversized or excessive bundle entries')
            manifest = read_json(archive.read('runtime-manifest.json'), 'runtime-manifest.json')
            if manifest.get('format') != 'jinhak-runtime-bundle' or manifest.get('version') != 1 or not isinstance(manifest.get('files'), dict):
                raise ValueError('Unsupported bundle manifest')
            if set(names) != set(manifest['files']) | {'runtime-manifest.json'}:
                raise ValueError('Unexpected or missing bundle entries')
            for name, expected in manifest['files'].items():
                safe_path(name)
                raw = archive.read(name)
                if digest(raw) != expected.get('sha256') or len(raw) != expected.get('bytes'):
                    raise ValueError(f'{name}: bundle integrity mismatch')
                target = staged / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(raw)
        files, report = check(staged)
        if set(files) != set(manifest['files']):
            raise ValueError('Bundle contains unreferenced files')
        root = root.resolve()
        for name in files:
            if not (root / name).resolve().is_relative_to(root):
                raise ValueError(f'{name}: restore destination escapes root')
        for name in files:
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(staged / name, target)
        return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['check', 'bundle', 'restore'], nargs='?', default='check')
    parser.add_argument('--root', type=Path, default=APP / 'public')
    parser.add_argument('--archive', type=Path)
    parser.add_argument('--url', help='Read-only check against an already deployed site or localhost')
    args = parser.parse_args()
    try:
        if args.url:
            parsed = urlparse(args.url)
            if args.action != 'check' or parsed.username or parsed.password or parsed.query or parsed.fragment or not parsed.netloc or not (parsed.scheme == 'https' or parsed.scheme == 'http' and parsed.hostname in ('localhost', '127.0.0.1')):
                raise ValueError('Use an HTTPS site base URL (HTTP allowed only for localhost), without credentials/query/fragment')
        if args.action == 'check':
            _, report = check(args.root, args.url)
        elif not args.archive:
            raise ValueError('--archive is required for bundle/restore')
        elif args.action == 'bundle':
            report = bundle(args.root, args.archive)
        else:
            report = restore(args.archive, args.root)
        print(json.dumps({'status': 'pass', 'action': args.action, **report}, ensure_ascii=True))
        return 0
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile) as error:
        print(f'FAIL: {error}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
