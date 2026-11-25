import csv
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from organize_susi_results import COLUMNS, classify, organize, provider, write_csv


def row(**patch):
    value = dict.fromkeys(COLUMNS, '')
    value.update(university='대학(서울)', result_year='2025', round='수시', admission_type='교과',
        program='지역추천', recruit_unit='국어국문학과', cut_50='2.00', cut_70='2.80', metric='교과등급',
        basis='최종등록자', grade_system='9', source_url='https://university.ac.kr/result.pdf', source_page='3')
    return dict(value, **patch)


class SusiOrganizationTests(unittest.TestCase):
    def test_different_score_scales_and_order(self):
        self.assertEqual(classify(row())[1], [])
        self.assertIn('cut_order_requires_review', classify(row(cut_50='3', cut_70='2'))[1])
        self.assertEqual(classify(row(metric='환산점수', cut_50='980', cut_70='970'))[1], [])
        self.assertIn('cut_70_grade_range', classify(row(cut_70='0'))[1])
        self.assertIn('cut_70_percentile_range', classify(row(metric='백분위', cut_70='101'))[1])

    def test_prose_suppression_and_counts_never_become_cuts(self):
        value = row(cut_50='', cut_70='', cut_other='평균 2.35 / 최저 3.10 / 80% 2.9')
        kind, issues, labels, _ = classify(value)
        self.assertEqual(kind, 'other_statistic_or_note')
        self.assertEqual(labels, ['평균', '최저', '기타백분위컷'])
        self.assertEqual(value['cut_70'], '')
        self.assertIn('cut_70_not_numeric', classify(row(cut_70='비공개'))[1])
        self.assertEqual(classify(row(cut_50='', cut_70='', quota='0'))[0], 'counts_only')
        self.assertTrue(classify(row(recruit_unit='합계'))[3])

    def test_unsafe_sources_and_missing_basis_are_reviewed(self):
        for url in ['javascript:alert(1)', 'https://user:password@host/', 'https://[broken']:
            self.assertIn('invalid_source_url', classify(row(source_url=url))[1])
        self.assertEqual(provider('https://[broken'), 'unresolved')
        self.assertEqual(provider('https://www.adiga.kr/page'), 'adiga')
        self.assertNotEqual(provider('https://not-adiga.kr/page'), 'adiga')
        self.assertIn('cut_without_basis', classify(row(basis=''))[1])

    def test_lossless_sorted_import_scope_conflicts_and_coverage(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            rows = [row(note='원문\n주석, 보존'), row(cut_70='2.90', source_url='https://www.adiga.kr/result'),
                row(metric='환산점수', cut_50='950', cut_70='940'), row(round='정시'),
                row(result_year='2024', university='대학(분교)', program='다른 전형')]
            rows.append(rows[0].copy())
            source = root/'all.csv'; write_csv(source, rows, COLUMNS)
            before = source.read_bytes()
            directory = root/'directory.json'
            directory.write_text(json.dumps({'universities': [
                {'id':'u1', 'university':'대학', 'result_entries':[
                    {'source_label':'대학(서울)', 'campus_label':'서울', 'campus_status':'named'},
                    {'source_label':'대학(분교)', 'campus_label':'분교', 'campus_status':'named'}]},
                {'id':'u2', 'university':'미수집대학', 'result_entries':[]}]}), encoding='utf-8')
            report = organize(source, directory, root/'out')
            self.assertEqual(source.read_bytes(), before)
            self.assertEqual(report['susi_rows'], 5)
            self.assertEqual(report['non_susi_rows'], 1)
            self.assertEqual(report['different_values_groups'], 1)
            self.assertEqual(report['exact_duplicate_rows'], 1)
            self.assertEqual(report['mapped_universities'], 1)
            self.assertEqual(len(report['empty_university_years']), 2)
            self.assertFalse(report['calculation_enabled'])
            with (root/'out/susi.csv').open(encoding='utf-8-sig', newline='') as f:
                restored = list(csv.DictReader(f))
            self.assertIn(rows[0], restored)
            index = json.loads((root/'out/app-import/index.json').read_text(encoding='utf-8'))
            self.assertEqual(index['status'], 'draft')
            for entry in index['universities']:
                raw = (root/'out/app-import'/entry['file']).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), entry['sha256'])
                payload = json.loads(raw)
                self.assertNotIn('approvals', payload)
                self.assertEqual(payload['status'], 'draft')


if __name__ == '__main__':
    unittest.main()
