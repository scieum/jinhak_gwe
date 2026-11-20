import unittest
from placement_statistics import extract_statistics


def extract(text, basis='최종등록자', metric='교과등급', grade_system='9'):
    return extract_statistics(dict(cut_other=text, basis=basis, metric=metric, grade_system=grade_system))


class StatisticsTest(unittest.TestCase):
    def test_explicit_percentiles_keep_original_precision(self):
        for text, key, value in [
            ('최종등록자 75%컷 5.43', 'cut_75', '5.43'),
            ('최종등록컷(80%) 4.20', 'cut_80', '4.20'),
            ('평균등급 5.12 / 표준편차 0.8990 / 최상위 4.27 / 80%cut 5.23', 'cut_80', '5.23'),
            ('최종등록자 최저(80%) 3.54', 'cut_80', '3.54'),
            ('85%컷 4.3; 90%컷 4.8', 'cut_85', '4.3'),
            ('교과성적 최종100% 4.83', 'cut_100', '4.83'),
        ]:
            with self.subTest(text=text):
                self.assertEqual(extract(text)[key]['value'], value)

    def test_registered_grade_preferred_over_initial_and_score(self):
        text = '최초합격자 학생부교과등급: 평균 2.4 / 75%컷 2.56; 최초합격자 학생부총점: 평균 972.97 / 75%컷 968.13; 최종등록자 학생부교과등급: 평균 2.96 / 75%컷 3.15; 최종등록자 학생부총점: 평균 955.86 / 75%컷 949.29'
        result = extract(text)
        self.assertEqual(result['mean']['value'], '2.96')
        self.assertEqual(result['cut_75']['value'], '3.15')
        self.assertEqual(result['mean']['population'], '최종등록자')

    def test_mixed_exam_and_school_grades_are_separate(self):
        text = '서류평가 최종등록 평균 3.10; 학생부등급 최초합격 평균 2.17 / 최종등록 평균 2.50; 수능등급 최초합격 평균 2.64 / 최종등록 평균 2.76'
        self.assertEqual(extract(text)['mean']['value'], '2.50')
        self.assertEqual(extract(text, metric='수능등급')['mean']['value'], '2.76')

    def test_conflicting_subjects_are_not_merged(self):
        result = extract('상위9과목 / 평균 3.36; 전과목 / 평균 4.74')
        self.assertNotIn('mean', result)
        self.assertEqual(result['mean_top9']['value'], '3.36')
        self.assertEqual(result['mean_all']['value'], '4.74')
        result = extract('교과환산등급 / 평균 3.4; 전과목등급 / 평균 4.3')
        self.assertEqual(result['mean_university']['value'], '3.4')
        self.assertEqual(result['mean_all']['value'], '4.3')
        self.assertEqual(len(extract('상위9과목 / 평균 5.22; 전과목 / 평균 5.22')), 2)
        self.assertEqual(extract('대학반영 평균 5.05; 국영수사과 평균 5.76')['mean_main']['value'], '5.76')
        self.assertEqual(extract('학생부위주 통합 최초합격 내신평균 3.20'), {})

    def test_grade_label_after_score_is_disambiguated(self):
        self.assertEqual(extract('환산점수평균 490.6 / 등급평균 2.9')['mean']['value'], '2.9')
        self.assertEqual(extract('등급 평균 3.91; 환산점수 평균 942.8')['mean']['value'], '3.91')
        self.assertEqual(extract('커트라인 / 원점수 (600점 만점) 586.80; 평균 / 등급 2.57')['mean']['value'], '2.57')
        self.assertEqual(extract('학생부 교과 성적 등급 최종등록자 평균 성적 5.5')['mean']['value'], '5.5')

    def test_suppression_ranges_scores_and_invalid_grades_are_not_points(self):
        for text in ['75%컷 *', '80%컷 -', '평균 0', '평균 10', '평균 3.2~4.1', '평균 3.2 - 4.1',
                     '평균 3.2%', '평균점수 3.2', '총점 / 평균 3.2', '환산점수 평균 3.2',
                     '교과등급 구간 1.0 ~ 1.49; 최종등록자 인원 2', '예비번호 4; 등록인원 8']:
            with self.subTest(text=text):
                self.assertEqual(extract(text), {})
        self.assertEqual(extract('75%컷 3.2', metric='환산점수'), {})
        self.assertEqual(extract('75%컷 3.2', grade_system=''), {})

    def test_subset_mean_is_not_overall_mean(self):
        self.assertEqual(extract('최종등록자 (80% 컷) 평균 5.2'), {})
        self.assertEqual(extract('최종등록자 평균 5.46; 최종등록자 (80% 컷) 평균 5.2')['mean']['value'], '5.46')

    def test_population_and_evidence_remain_explicit(self):
        result = extract('제1단계 합격자 교과 평균 3.60', basis='제1단계 합격자 교과 평균')['mean']
        self.assertEqual(result['population'], '1단계 합격자')
        self.assertEqual(result['evidence'], '제1단계 합격자 교과 평균 3.60')
        self.assertEqual(extract('교과성적 최종평균 4.20', basis='최초+추가합격자')['mean']['population'], '최초·추가합격자 · 최종평균')
        self.assertEqual(extract('학생부등급(합격자) / 최초평균 4.88', basis='합격자')['mean']['population'], '최초합격자')


if __name__ == '__main__':
    unittest.main()
