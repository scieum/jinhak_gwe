import unittest
from pathlib import Path

from build_admission_plan_programs import UNKNOWN, method_text, minimum_text, package_programs, plan_document, quota_text, unique_names

SHA = 'a' * 64
SRC = {'id': 'doc', 'kind': 'pdf', 'pages': 10, 'url': 'https://u.ac.kr/2028plan.pdf', 'sha256': SHA,
       'checked_at': '2026-11-20T00:00:00+00:00', 'has_2028': True}
NOWHERE = Path('__no_sources__')


class AdmissionPlanProgramsTest(unittest.TestCase):
    def test_documents_need_https_pdf_pages_and_a_2028_check(self):
        self.assertEqual(plan_document(SRC, NOWHERE)['year_check'], 'text')
        for change in [{'kind': 'hwp'}, {'url': 'http://u.ac.kr/a.pdf'}, {'pages': None}, {'archive': {'id': 'zip'}},
                       {'has_2028': None, 'url': 'https://u.ac.kr/a.pdf'}]:
            self.assertIsNone(plan_document({**SRC, **change}, NOWHERE), change)

    def test_quota_only_from_explicit_status(self):
        self.assertEqual(quota_text({'status': 'fixed', 'value': 580}), '580명')
        self.assertEqual(quota_text({'status': 'pending', 'value': 3}), UNKNOWN)
        self.assertEqual(quota_text(None), UNKNOWN)

    def test_method_needs_same_document_and_full_100_percent(self):
        program = {'evaluation': [{'stage': 1, 'elements': {'서류': 100}, 'evidence': {'document_id': 'doc', 'pdf_pages': [3]}},
                                  {'stage': '2단계', 'elements': {'stage1': 70, '면접': 30}, 'evidence': {'document_id': 'doc', 'pdf_pages': [4]}}]}
        self.assertEqual(method_text(program, {'doc'}), ('1단계 서류 100% → 2단계 1단계 성적 70% · 면접 30%', [3, 4]))
        self.assertEqual(method_text(program, {'other'}), (None, []))
        program['evaluation'][1]['elements']['면접'] = 20
        self.assertEqual(method_text(program, {'doc'}), (None, []))

    def test_minimum_only_from_classified_explicit_rules(self):
        rules = [{'evidence': {'document_id': 'doc', 'pdf_pages': [5]}}, {'evidence': {'document_id': 'doc', 'pdf_pages': [6]}}]
        row = lambda ids, status='classified': {'scope_status': status, 'rule_ids': ids}
        app = {'p:minimum_rules:0': 'not_required', 'p:minimum_rules:1': 'required'}
        self.assertEqual(minimum_text([row(['p:minimum_rules:0'])], rules, app, {'doc'}), ('미적용(원문 명시)', [5]))
        self.assertEqual(minimum_text([row(['p:minimum_rules:0']), row(['p:minimum_rules:1'])], rules, app, {'doc'})[0], '모집단위별 적용 다름 · 원문 확인')
        self.assertEqual(minimum_text([row(['p:minimum_rules:0']), row([], 'explicit_pending')], rules, app, {'doc'}), (None, []))
        self.assertEqual(minimum_text([], rules, app, {'doc'}), (None, []))

    def test_same_name_programs_get_distinguishing_labels(self):
        programs = [{'name': '일반', 'round': '정시', 'group': '가'}, {'name': '일반', 'round': '정시', 'group': '나군'},
                    {'name': '일반', 'round': '정시', 'group': '나군'}, {'name': '교과', 'round': '수시'}]
        self.assertEqual(sorted(unique_names(programs).values()), ['교과', '일반 (가군)', '일반 (나군) #1', '일반 (나군) #2'])

    def test_programs_without_pdf_page_evidence_are_skipped(self):
        package = {'source': SRC, 'recruit_units': [{'id': 'u1', 'name': '의예과'}], 'programs': [
            {'id': 'a', 'name': '지역인재', 'round': '수시', 'type': '학생부교과', 'recruit_unit_ids': ['u1'],
             'quota': {'status': 'fixed', 'value': 20}, 'evidence': {'document_id': 'doc', 'pdf_pages': [2]}},
            {'id': 'b', 'name': '일반', 'round': '수시', 'type': '학생부종합', 'evidence': {'document_id': 'doc'}}]}
        programs, docs, skipped = package_programs(package, {}, [], {})
        self.assertEqual([(p['name'], p['type'], p['unit'], p['quota'], p['pages'], p['minimum']) for p in programs],
                         [('지역인재', '교과', '의예과', '20명', [2], UNKNOWN)])
        self.assertEqual([d['id'] for d in docs], ['doc'])
        self.assertEqual(skipped['no_pdf_page_evidence'], 1)


if __name__ == '__main__':
    unittest.main()
