import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('priority_review',Path(__file__).with_name('build_priority_review.py'))
module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

class PriorityReviewTests(unittest.TestCase):
    def fixture(self, root):
        data=root/module.DATA; data.mkdir(parents=True)
        document=b'%PDF-fixture'; (root/'source.pdf').write_bytes(document)
        rule={'id':'r','evidence':{'document_id':'d','pdf_pages':[2]},'status':'not_applicable'}
        package={'source':{'local_path':'source.pdf','sha256':module.digest(document)},'minimum_rules':[rule],
                 'scoring_rules_draft':{'role':'susi_tiebreak_only','evidence':{'pdf_pages':[3]}}}
        raw=json.dumps(package).encode(); (root/'package.json').write_bytes(raw)
        identity={'package_id':'p','university':'Test','campus':'Main','admission_year':2028,'source_file':'package.json','source_sha256':module.digest(raw)}
        record={**identity,'id':'p:r','original_rule':rule,'source_pointer':'/minimum_rules/0','checks':{'references_valid':True}}
        source=json.dumps({'records':[record]}).encode()
        (data/'minimum-source-review.json').write_bytes(source)
        (data/'package-inventory.json').write_text(json.dumps([identity]))
        (data/'minimum-normalized-review.json').write_text(json.dumps({'source_sha256':module.digest(source),'records':[{**record,'category':'no_minimum_source_statement'}]}))
        (data/'minimum-scope-review.json').write_text(json.dumps({'rows':[{**identity,'scope_status':'classified'}]}))
        return data

    def test_preserves_source_and_does_not_invent_reviews_or_tests(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t); self.fixture(root)
            packets,index=module.build(root,['Test']); p=packets['p.json']
            self.assertEqual(index[0]['scope_pairs'],1)
            self.assertFalse(p['executable']); self.assertEqual(p['review_status'],'draft')
            self.assertIsNone(p['scoring']['review']['reviewer']); self.assertEqual(p['scoring']['review']['tests'],[])
            self.assertEqual(p['scoring']['original']['role'],'susi_tiebreak_only')
            self.assertEqual(p['scoring']['evidence'][0]['pdf_pages'],[3])
            self.assertEqual(p['minimum']['rules'][0]['record']['original_rule']['evidence']['pdf_pages'],[2])
            self.assertTrue(any('동점자' in s for s in p['scoring']['release_blockers']))
            module.write(root,packets,index)
            self.assertFalse((root/'app/public').exists())
            self.assertEqual(module.build(root,['Test']), (packets,index))

    def test_stale_documents_packages_and_normalization_fail_closed(self):
        for file in ['source.pdf','package.json','minimum-source-review.json']:
            with self.subTest(file=file), tempfile.TemporaryDirectory() as t:
                root=Path(t); data=self.fixture(root)
                path=(data if file.startswith('minimum') else root)/file
                path.write_bytes(path.read_bytes()+b' ')
                with self.assertRaises(ValueError): module.build(root,['Test'])
                self.assertFalse((data/'priority-review').exists())

    def test_scope_hash_and_unknown_university_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t); data=self.fixture(root)
            with self.assertRaises(ValueError): module.build(root,['Missing'])
            path=data/'minimum-scope-review.json'; value=json.loads(path.read_text()); value['rows'][0]['source_sha256']='stale'; path.write_text(json.dumps(value))
            with self.assertRaises(ValueError): module.build(root,['Test'])

    def test_source_paths_cannot_escape_workspace(self):
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaises(ValueError): module.read(Path(t),'../outside.pdf')

if __name__=='__main__': unittest.main()
