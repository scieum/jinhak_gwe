import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { DETAILS, MODE_HOME, MORE_PATH, OUTSIDE, allItems, type Mode } from './shell/nav';
import { Placeholder } from './screens/Placeholder';
import { More } from './screens/More';

export function App() {
  return (
    <Routes>
      {/* 로그인 전 화면에는 탭바·사이드바·sub-nav가 없다 */}
      {OUTSIDE.map((o) => (
        <Route key={o.path} path={o.path} element={<main className="shell__content"><Placeholder title={o.label} slug={o.slug} /></main>} />
      ))}
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to={MODE_HOME.student} replace />} />
        <Route path="/teacher" element={<Navigate to={MODE_HOME.teacher} replace />} />
        <Route path="/admin" element={<Navigate to={MODE_HOME.admin} replace />} />
        {[...allItems(), ...DETAILS].map((s) => (
          <Route key={s.path} path={s.path} element={<Placeholder title={s.label} slug={s.slug} />} />
        ))}
        {(Object.keys(MORE_PATH) as Mode[]).map((m) => (
          <Route key={m} path={MORE_PATH[m]} element={<More mode={m} />} />
        ))}
        <Route path="*" element={<Navigate to={MODE_HOME.student} replace />} />
      </Route>
    </Routes>
  );
}
