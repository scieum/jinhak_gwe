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
import { DeptTier } from './screens/DeptTier';
import { SpecialTracks } from './screens/SpecialTracks';
import { UnivMap } from './screens/UnivMap';
import { InterestComparison } from './screens/InterestComparison';
import { ApplicationCalendar } from './screens/ApplicationCalendar';
import { FiveToNine, ScoreTrend, StudentHome } from './screens/Results';
import { UniversityScores } from './screens/UnivScore';
import { Doelgak } from './screens/Doelgak';
import { AdminReview } from './screens/AdminReview';
import { AdminFields } from './screens/AdminFields';
import { AdminWiki } from './screens/AdminWiki';
import { AdminMap } from './screens/AdminMap';
import { ProgramDetail, UnivDetail } from './screens/UnivDetail';
import { Susiro } from './screens/Susiro';
import { MockScore } from './screens/MockScore';
import { SaenggibuAi } from './screens/SaenggibuAi';
import { TeacherDashboard } from './screens/TeacherDashboard';
import { CardCollect } from './screens/CardCollect';
import { Counsel } from './screens/Counsel';
import { ScoreImport } from './screens/ScoreImport';
import { MinimumBoard } from './screens/MinimumBoard';
import { MinimumSearch } from './screens/MinimumSearch';
import { StudentRecord } from './screens/StudentRecord';
import { ResultSummary } from './screens/ResultSummary';
import { ClassCalendar } from './screens/ClassCalendar';
import { Login, Signup } from './screens/Auth';
import { About } from './screens/About';
// 처음 온 사람(소개를 본 적 없는 기기)은 루트에서 서비스 소개로 보냄. 저장소가 막히면 소개를 다시 보여줘도 무해.
function seenAbout() { try { return localStorage.getItem('jinhak-navi-seen-about') === '1'; } catch { return false; } }
import { AdminRules as RuleEditorScreen } from './screens/AdminRules';
import './styles/student.css';
import './styles/workspace-layout.css';
import './styles/figma-alignment.css';

// slug admin-rules covers both the rule editor and review paths (nav.ts).
function AdminRules() { const p = useLocation().pathname; return p.endsWith('/review') ? <AdminReview /> : p.endsWith('/fields') ? <AdminFields /> : p.endsWith('/wiki') ? <AdminWiki /> : p.endsWith('/map') ? <AdminMap /> : <RuleEditorScreen />; }

const implemented: Record<string, React.ReactNode> = {
  'national-placement': <NationalPlacement />,
  'dept-tier': <DeptTier />, 'special-tracks': <SpecialTracks />, 'univ-map': <UnivMap />,
  compare: <InterestComparison />,
  calendar: <ApplicationCalendar />,
  'admissions-list': <AdmissionsList />,
  'admission-style': <AdmissionStyle />,
  'application-checklist': <Preparation view="checklist" />, 'eligibility-check': <Preparation view="eligibility" />,
  'counsel-tasks': <CounselTasks />, 'admission-results': <AdmissionResults />,
  home: <StudentHome />, 'grade-input': <GradeInput />, 'five-to-nine': <FiveToNine />,
  'admin-rules': <AdminRules />, 'univ-detail': <UnivDetail />, 'program-detail': <ProgramDetail />, susiro: <Susiro />, 'mock-score': <MockScore />, 'saenggibu-ai': <SaenggibuAi />,
  'teacher-dashboard': <TeacherDashboard />, 'card-collect': <CardCollect />, counsel: <Counsel />, 'score-import': <ScoreImport />, 'minimum-board': <MinimumBoard />, 'minimum-search': <MinimumSearch />, 'student-record': <StudentRecord />, 'result-summary': <ResultSummary />, 'class-calendar': <ClassCalendar />,
  'univ-score': <UniversityScores />, doelgak: <Doelgak />, 'score-trend': <ScoreTrend />,
};

export function App() {
  return (
    <Routes>
      {/* 로그인 전 화면에는 탭바·사이드바·sub-nav가 없다 */}
      {OUTSIDE.map((o) => (
        <Route key={o.path} path={o.path} element={o.slug === 'login' ? <Login /> : <Signup />} />
      ))}
      <Route path="/about" element={<About />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to={seenAbout() ? MODE_HOME.student : '/about'} replace />} />
        <Route path="/teacher" element={<Navigate to={MODE_HOME.teacher} replace />} />
        <Route path="/admin" element={<Navigate to={MODE_HOME.admin} replace />} />
        {[...allItems(), ...DETAILS.filter((d) => !allItems().some((i) => i.path === d.path))].map((s) => (
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

