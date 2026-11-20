import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { DETAILS, MODE_HOME, MORE_PATH, OUTSIDE, allItems, type Mode } from './shell/nav';
import { Placeholder } from './screens/Placeholder';
import { More } from './screens/More';
import { GradeInput } from './screens/GradeInput';
import { AdmissionStyle } from './screens/AdmissionStyle';
import { Preparation, CounselTasks } from './screens/Preparation';
import { AdmissionResults } from './screens/AdmissionResults';
import { AdmissionsList } from './screens/AdmissionsList';
import { NationalPlacement } from './screens/NationalPlacement';
import { Doelgak, FiveToNine, ScoreTrend, StudentHome, UniversityScores } from './screens/Results';
import { AdminReview } from './screens/AdminReview';
import { ProgramDetail, UnivDetail } from './screens/UnivDetail';
import { Susiro } from './screens/Susiro';
import { MockScore } from './screens/MockScore';
import { SaenggibuAi } from './screens/SaenggibuAi';
import { TeacherDashboard } from './screens/TeacherDashboard';
import { CardCollect } from './screens/CardCollect';
import { Counsel } from './screens/Counsel';
import { ScoreImport } from './screens/ScoreImport';
import { HomeroomLogs } from './screens/HomeroomLogs';
import { MinimumBoard } from './screens/MinimumBoard';
import { StudentRecord } from './screens/StudentRecord';
import { ResultSummary } from './screens/ResultSummary';
import { Login, Signup } from './screens/Auth';
import { AdminRules as RuleEditorScreen } from './screens/AdminRules';
import './styles/student.css';
import './styles/workspace-layout.css';

// slug admin-rules covers both the rule editor and review paths (nav.ts).
function AdminRules() { return useLocation().pathname.endsWith('/review') ? <AdminReview /> : <RuleEditorScreen />; }

const implemented: Record<string, React.ReactNode> = {
  'national-placement': <NationalPlacement />,
  'admissions-list': <AdmissionsList />,
  'admission-style': <AdmissionStyle />,
  'application-checklist': <Preparation view="checklist" />, 'eligibility-check': <Preparation view="eligibility" />,
  'counsel-tasks': <CounselTasks />, 'admission-results': <AdmissionResults />,
  home: <StudentHome />, 'grade-input': <GradeInput />, 'five-to-nine': <FiveToNine />,
  'admin-rules': <AdminRules />, 'univ-detail': <UnivDetail />, 'program-detail': <ProgramDetail />, susiro: <Susiro />, 'mock-score': <MockScore />, 'saenggibu-ai': <SaenggibuAi />,
  'teacher-dashboard': <TeacherDashboard />, 'card-collect': <CardCollect />, counsel: <Counsel />, 'score-import': <ScoreImport />, 'homeroom-logs': <HomeroomLogs />, 'minimum-board': <MinimumBoard />, 'student-record': <StudentRecord />, 'result-summary': <ResultSummary />,
  'univ-score': <UniversityScores />, doelgak: <Doelgak />, 'score-trend': <ScoreTrend />,
};

export function App() {
  return (
    <Routes>
      {/* 로그인 전 화면에는 탭바·사이드바·sub-nav가 없다 */}
      {OUTSIDE.map((o) => (
        <Route key={o.path} path={o.path} element={o.slug === 'login' ? <Login /> : <Signup />} />
      ))}
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to={MODE_HOME.student} replace />} />
        <Route path="/teacher" element={<Navigate to={MODE_HOME.teacher} replace />} />
        <Route path="/admin" element={<Navigate to={MODE_HOME.admin} replace />} />
        {[...allItems(), ...DETAILS].map((s) => (
          <Route key={s.path} path={s.path} element={implemented[s.slug] ?? <Placeholder title={s.label} slug={s.slug} />} />
        ))}
        {(Object.keys(MORE_PATH) as Mode[]).map((m) => (
          <Route key={m} path={MORE_PATH[m]} element={<More mode={m} />} />
        ))}
        <Route path="*" element={<Navigate to={MODE_HOME.student} replace />} />
      </Route>
    </Routes>
  );
}
