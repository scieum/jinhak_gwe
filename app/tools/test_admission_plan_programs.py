import tempfile
import unittest
from collections import Counter
from hashlib import sha256
from pathlib import Path

from build_admission_plan_programs import CARRYOVER, FIELD_CHIPS, FIELD_ORDER, UNKNOWN, attach_fields, attach_local_files, method_text, minimum_text, package_programs, plan_document, plan_filename, quota_text, unique_names

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

    def test_unit_quotas_need_same_document_pages_and_keep_pools_whole(self):
        ev = lambda *pages: {'document_id': 'doc', 'pdf_pages': list(pages)}
        units = [{'id': f'u{i}', 'name': n} for i, n in enumerate(['경영학과', '경제학과', '국문과', '사학과', '철학과'])]
        package = {'source': SRC, 'recruit_units': units, 'programs': [
            {'id': 'a', 'name': '교과', 'round': '수시', 'type': '학생부교과', 'evidence': ev(2)}],
            'allocations': [{'program_id': 'a', 'unit_id': 'u0', 'quota': 12, 'evidence': ev(3)},
                            {'program_id': 'a', 'unit_id': 'u1', 'quota': 5, 'evidence': {'document_id': 'xlsx', 'cells': ['F6']}},
                            {'program_id': 'a', 'unit_id': 'u4', 'quota': 3, 'evidence': ev(99)}],
            'unspecified_allocations': [{'program_id': 'a', 'unit_id': 'u2', 'quota': None, 'source_term': '약간 명', 'evidence': ev(4)}],
            'carryover_allocations': [{'program_id': 'a', 'unit_id': 'u3', 'quota': None, 'evidence': ev(4)}],
            'pooled_quotas': [{'program_id': 'a', 'quota': 30, 'unit_ids': ['u1', 'u4'], 'evidence': ev(5)}]}
        [program], _, _ = package_programs(package, {}, [], {})
        self.assertEqual(program['units'], [['경영학과', 12, [3]], ['국문과', '약간 명', [4]], ['사학과', CARRYOVER, [4]]])
        self.assertEqual(program['pooled'], [{'quota': 30, 'units': ['경제학과', '철학과'], 'pages': [5]}])

    def test_fields_from_exact_university_and_unit_names(self):
        self.assertTrue(set(FIELD_CHIPS.values()) <= set(FIELD_ORDER))
        table = [{'대학': '가대학교', '모집단위': '기계공학과', '중계열': '공학', '대계열': '자연'},
                 {'대학': '가대학교', '모집단위': '경영학과', '중계열': '경상', '대계열': '인문'},
                 {'대학': '가대학교', '모집단위': '체육교육과', '중계열': '교육', '대계열': ''},
                 {'대학': '가대학교', '모집단위': '자유전공', '중계열': '', '대계열': ''},
                 {'대학': '나대학교', '모집단위': '국문과', '중계열': '어문', '대계열': '인문'}]
        program = lambda **kw: {'name': 'x', **kw}
        catalog = {'entries': [{'university': '가대학교', 'programs': [
            program(units=[['경영학과', 3, [1]], ['기계공학과', 2, [1]], ['국문과', 1, [1]]]),  # 국문과는 나대학교 행이라 안 맞음
            program(pooled=[{'quota': 9, 'units': ['체육교육과'], 'pages': [1]}]),
            program(units=[['자유전공', 3, [1]], ['기계공학부', 1, [1]]], fields=['인문']),  # 계열 빈 행 · 이름 다름 → 없음
            program()]}]}
        self.assertEqual(attach_fields(catalog, table), 2)
        self.assertEqual([p.get('fields') for p in catalog['entries'][0]['programs']], [['사회', '공학'], ['예체능'], None, None])

    def test_plan_pdf_file_names(self):
        self.assertEqual(plan_filename('성균관대학교', '본교'), '2028_성균관대학교_시행계획.pdf')
        self.assertEqual(plan_filename('가톨릭대학교', '제3캠퍼스', 'adiga'), '2028_가톨릭대학교_제3캠퍼스_시행계획_어디가.pdf')
        self.assertEqual(plan_filename('가/나:대학교?', '본교', 'university'), '2028_가나대학교_시행계획_입학처.pdf')

    def test_local_copies_only_for_hash_verified_pdfs(self):
        with tempfile.TemporaryDirectory() as tmp:
            good = Path(tmp) / 'good.pdf'
            good.write_bytes(b'%PDF-1')
            (Path(tmp) / 'bad.pdf').write_bytes(b'changed')
            sha = sha256(b'%PDF-1').hexdigest()
            doc = lambda i, sha, provider='university', fmt='pdf': {'id': i, 'sha256': sha, 'provider': provider, 'format': fmt}
            entry = {'university': '가나대학교', 'campus': '본교', 'documents': [
                doc('a', sha), doc('b', sha, 'adiga'), doc('c', SHA), doc('d', 'f' * 64), doc('e', sha, fmt='hwp')]}
            sources = [{'id': 'good', 'sha256': sha, 'local_path': str(good)}, {'id': 'bad', 'sha256': SHA, 'local_path': str(Path(tmp) / 'bad.pdf')}]
            report = Counter()
            files = attach_local_files(entry, sources, report, Path(tmp))
        self.assertEqual([d.get('local_file') for d in entry['documents']],
                         ['plans/2028_가나대학교_시행계획_입학처.pdf', 'plans/2028_가나대학교_시행계획_어디가.pdf', None, None, None])
        self.assertEqual(set(files), {'2028_가나대학교_시행계획_입학처.pdf', '2028_가나대학교_시행계획_어디가.pdf'})
        self.assertEqual((report['local_pdf_missing_or_hash_mismatch'], report['local_pdf_no_source']), (1, 1))


if __name__ == '__main__':
    unittest.main()
