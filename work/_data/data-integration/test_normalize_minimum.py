import unittest
from normalize_minimum import applicability, condition_blocks, criterion_candidate, normalize


def simple():
    return {'required': True, 'areas': ['국어', '수학', '영어', '탐구'], 'area_count': 2,
            'sum_limit': 6, 'inquiry': '사회/과학중상위1'}


class MinimumNormalizationTests(unittest.TestCase):
    def test_sum_and_history_conjunction(self):
        rule = {'expression': {'operator': 'all_of', 'terms': [
            {'operator': 'choose_sum_at_most', 'areas': ['국어', '수학', '영어', {'choose_best_one': ['사회탐구', '과학탐구']}], 'count': 3, 'max_sum': 9},
            {'operator': 'grade_at_most', 'area': '한국사', 'max_grade': 4}]}}
        candidate, reasons = criterion_candidate(rule)
        self.assertEqual(reasons, [])
        self.assertEqual(candidate, {'areas': ['국어', '수학', '영어', '탐구'], 'count': 3, 'sum': 9, 'required': None, 'history_max': 4, 'tamgu': 'best'})

    def test_separate_science_social_not_collapsed(self):
        rule = simple(); rule['areas'] = ['국어', '수학', '영어', '사회탐구', '과학탐구']
        self.assertIsNone(criterion_candidate(rule)[0])

    def test_extra_conditions_never_dropped(self):
        for key, value in [('english_grade_adjustment', {'2': 1}), ('per_area_maximum', 3),
                           ('korean_history_required', True), ('inquiry_average_rounding', 'ceil'),
                           ('vocational_inquiry_allowed', False), ('note', '학과별 별도 조건')]:
            with self.subTest(key=key):
                self.assertIsNone(criterion_candidate({**simple(), key: value})[0])

    def test_bare_count_does_not_imply_best(self):
        rule = simple(); rule.pop('inquiry'); rule['inquiry_count'] = 1
        self.assertIsNone(criterion_candidate(rule)[0])

    def test_alias_conflict_and_missing_value(self):
        self.assertIsNone(criterion_candidate({**simple(), 'max_sum': 8})[0])
        rule = simple(); rule.pop('sum_limit')
        self.assertIsNone(criterion_candidate(rule)[0])

    def test_applicability_is_explicit(self):
        self.assertEqual(applicability({})[0], 'unspecified')
        self.assertEqual(applicability({'required': False})[0], 'not_required')
        self.assertEqual(applicability({'required': False, 'status': 'required'})[0], 'conflict')
        self.assertEqual(applicability({'status': 'conditional'})[0], 'conditional')

    def test_conflicting_none_and_sum(self):
        record = dict(id='r', package_id='p', university='u', campus='', admission_year=2028,
                      source_file='s', source_pointer='/minimum_rules/0', source_sha256='h', original_rule={**simple(), 'required': False})
        row = normalize(record)
        self.assertEqual(row['applicability'], 'conflict')
        self.assertIsNone(row['criterion_candidate'])

    def test_alternative_branches_keep_paths(self):
        blocks = condition_blocks({'any_of': [{'count': 2, 'max_sum': 4}, {'count': 3, 'max_sum': 7}]})
        self.assertEqual([b['source_path'] for b in blocks], ['/any_of/0', '/any_of/1'])
        self.assertEqual([b['parameters']['sum'][0]['value'] for b in blocks], [4, 7])

    def test_invalid_and_multiple_required(self):
        for override in [{'count': 0}, {'sum_limit': True}, {'required_areas': ['국어', '수학']}, {'required_domains': ['국어', '수학']}]:
            self.assertIsNone(criterion_candidate({**simple(), **override})[0])


if __name__ == '__main__':
    unittest.main()
