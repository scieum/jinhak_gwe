import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
import deployment_data as deploy


class DeploymentDataTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='jinhak-deploy-test-')
        self.base = Path(self.temporary.name)
        self.root = self.base / 'public'
        self.app = self.base / 'app'
        self.patcher = patch.object(deploy, 'APP', self.app)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.addCleanup(self.temporary.cleanup)
        logo = b'local image fixture'
        name = deploy.digest(logo) + '.png'
        self.write('assets/universities/' + name, logo)
        for mapping in ['universityLogos.json', 'universityLogoNames.json']:
            path = self.app / 'src/data' / mapping
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({'test': name}), encoding='utf-8')
        source = {'format': 'jinhak-navi-collected-results', 'status': 'draft', 'university': 'test', 'rows': [[0]]}
        entry = self.package('collected-results', source)
        entry['university'] = 'test'
        collection = {'format': 'jinhak-navi-collected-index', 'status': 'draft', 'version': 1, 'source_sha256': 'a' * 64, 'rows': 1, 'universities': [entry]}
        self.write_json('data/collected-results/index.json', collection)
        package = {'format': 'jinhak-national-placement', 'status': 'draft', 'year': '2026', 'rows': [[0]], 'sources': {'test': entry['sha256']}}
        year = self.package('national-placement', package)
        year['year'] = '2026'
        self.write_json('data/national-placement/index.json', {'format': 'jinhak-national-placement-index', 'version': 2, 'status': 'draft', 'collection_sha256': 'a' * 64, 'collection_rows': 1, 'collection_universities': 1, 'years': [year]})
        self.write_json('data/admission-plans.json', {'format': 'jinhak-navi-admission-plans', 'review_status': 'draft', 'entries': [{'id': 'test'}]})
        self.write_json('data/released-results.json', {})
        self.write_json('data/scoring-rules.json', {})

    def write(self, name, raw):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)

    def write_json(self, name, value):
        self.write(name, json.dumps(value).encode())

    def package(self, folder, value):
        raw = json.dumps(value).encode()
        sha = deploy.digest(raw)
        self.write(f'data/{folder}/{sha}.json', raw)
        return {'file': sha + '.json', 'sha256': sha, 'bytes': len(raw), 'rows': 1}

    def test_roundtrip_without_originals_or_student_data(self):
        self.write('data/unreferenced-private-file.json', b'not included')
        archive = self.base / 'runtime.zip'
        report = deploy.bundle(self.root, archive)
        restored = self.base / 'restored'
        self.assertEqual(deploy.restore(archive, restored), report)
        self.assertFalse((restored / 'data/unreferenced-private-file.json').exists())
        self.assertEqual(deploy.check(self.root)[0], deploy.check(restored)[0])

    def test_missing_placement_fails_instead_of_silent_build(self):
        (self.root / 'data/national-placement/index.json').unlink()
        with self.assertRaisesRegex(ValueError, 'missing or unreadable'):
            deploy.check(self.root)

    def test_html_fallback_and_corrupted_logo_are_rejected(self):
        self.write('data/admission-plans.json', b'<!doctype html><html>SPA</html>')
        with self.assertRaisesRegex(ValueError, 'HTML fallback'):
            deploy.check(self.root)
        self.write_json('data/admission-plans.json', {'format': 'jinhak-navi-admission-plans', 'review_status': 'draft', 'entries': [{}]})
        next((self.root / 'assets/universities').iterdir()).write_bytes(b'broken')
        with self.assertRaisesRegex(ValueError, 'logo hash mismatch'):
            deploy.check(self.root)

    def test_corrupted_shard_and_mixed_releases_fail(self):
        shard = next(p for p in (self.root / 'data/collected-results').iterdir() if p.name != 'index.json')
        original = shard.read_bytes()
        shard.write_bytes(original + b' ')
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            deploy.check(self.root)
        shard.write_bytes(original)
        path = self.root / 'data/national-placement/index.json'
        value = json.loads(path.read_bytes()); value['collection_sha256'] = 'b' * 64
        path.write_text(json.dumps(value), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'different data releases'):
            deploy.check(self.root)

    def test_invalid_bundle_does_not_touch_destination(self):
        archive = self.base / 'invalid.zip'
        name = 'data/../../outside.json'
        with zipfile.ZipFile(archive, 'w') as z:
            z.writestr('runtime-manifest.json', json.dumps({'format': 'jinhak-runtime-bundle', 'version': 1, 'files': {name: {'bytes': 1, 'sha256': deploy.digest(b'x')}}}))
            z.writestr(name, b'x')
        before = deploy.check(self.root)[0]
        with self.assertRaisesRegex(ValueError, 'Unsafe asset path'):
            deploy.restore(archive, self.root)
        self.assertEqual(deploy.check(self.root)[0], before)


if __name__ == '__main__':
    unittest.main()
