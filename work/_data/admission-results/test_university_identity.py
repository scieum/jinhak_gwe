import unittest
import university_identity as identity


class IdentityTest(unittest.TestCase):
    def row(self, name, year='2026', unit='국어국문학과'):
        return dict(university=name, result_year=year, recruit_unit=unit, note='draft', cut_70='2.400')

    def test_current_label_preserves_campus_year_score_and_original_name(self):
        raw = self.row('강릉원주대(원주)', '2024')
        result = identity.normalize(raw)
        self.assertEqual(result['university'], '강원대학교(원주)')
        self.assertEqual(result['result_year'], '2024')
        self.assertEqual(result['cut_70'], '2.400')
        self.assertIn('수집 원본 대학명=강릉원주대(원주)', result['note'])
        self.assertEqual(result, identity.normalize(result))
        self.assertEqual(raw['university'], '강릉원주대(원주)')

    def test_explicit_year_and_unit_are_required_for_campus_and_degree(self):
        self.assertEqual(identity.normalize(self.row('국립경국대학교', unit='소방방재학과'))['university'], '국립경국대학교(예천)')
        self.assertEqual(identity.normalize(self.row('국립경국대학교', '2024', '소방방재학과'))['university'], '국립경국대학교')
        self.assertTrue(identity.exclusion_reason(self.row('국립목포대학교', unit='스마트해양・에너지학부')))
        self.assertFalse(identity.exclusion_reason(self.row('국립목포대학교', '2025', '스마트해양・에너지학부')))
        self.assertFalse(identity.exclusion_reason(self.row('국립목포대학교', unit='스마트모빌리티학부')))
        self.assertEqual(identity.normalize(self.row('국립창원대학교', unit='간호학과'))['university'], '국립창원대학교')

    def test_pending_and_unknown_labels_are_not_inferred(self):
        for name in ['부산교육대학교', '국립한밭대학교', '국립순천대학교', '한경국립대학교', '강릉원주대학교']:
            self.assertEqual(identity.current_name(name), name)


if __name__ == '__main__': unittest.main()
