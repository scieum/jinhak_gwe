import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { BrandLogo } from '../components/BrandLogo';
import { ModeSwitch } from './ModeSwitch';
import { MODE_HOME, MORE_PATH, NAV, locate, modeOf, type NavGroup } from './nav';
import { workspaceOf } from './workspace';
import { TeacherLockButton, TeacherLockGate } from '../components/TeacherLock';
import './shell.css';

// 소분류가 없는 대분류(학생 "홈")는 그룹 행 없이 바로 선택하는 메뉴 하나로 그린다
const isSingle = (g: NavGroup) => g.items.length === 1 && g.items[0].label === g.label;

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const loc = locate(pathname);
  const { group, item, detail } = loc;
  const mode = workspaceOf(pathname);
  const isMore = pathname === MORE_PATH[mode];
  // 교사 셸은 학생 메뉴 전체 + 교사 메뉴(teacher-dashboard 02-spec P1)
  const sections: [string | null, NavGroup[]][] = mode === 'teacher' ? [['학생', NAV.student], ['교사', NAV.teacher]] : [[null, NAV[mode]]];
  const title = item?.label ?? detail?.label ?? (isMore ? '더보기' : '진학 내비');
  const breadcrumb = group && !isSingle(group) ? `${group.label} › ${title}` : null;
  const groups = NAV[mode];
  const isHome = mode !== 'admin' && pathname === groups[0].items[0].path;

  // 지금 대분류는 항상 펼침, 나머지는 눌러서 펼친다
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const toggle = (label: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const current = (path: string) => (path === pathname ? 'page' : undefined);
  const tabs = [
    ...groups.map((g) => ({ label: g.label, icon: g.icon, path: g.items[0].path, on: g === group && !isMore })),
    { label: '더보기', icon: 'menu', path: MORE_PATH[mode], on: isMore },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to={MODE_HOME[mode]} className="sidebar__wordmark" aria-label="진학내비 홈">
          <BrandLogo />
        </Link>
        <nav aria-label="주 메뉴">
          {sections.map(([caption, list]) => <div key={caption ?? 'main'}>{caption && <p className="sidebar__caption t-caption text-muted">{caption}</p>}{list.map((g) => {
            if (isSingle(g)) {
              const i = g.items[0];
              return (
                <Link key={g.label} to={i.path} className="sidebar-item sidebar-item--top" aria-current={current(i.path)}>
                  <Icon name={i.icon} size={20} />
                  <span>{i.label}</span>
                </Link>
              );
            }
            const isCurrent = g === group;
            const expanded = isCurrent || opened.has(g.label);
            return (
              <div key={g.label}>
                <button
                  type="button"
                  className={`sidebar-group${isCurrent ? ' sidebar-group--current' : ''}`}
                  aria-expanded={expanded}
                  onClick={() => !isCurrent && toggle(g.label)}
                >
                  <Icon name={g.icon} size={20} />
                  <span className="sidebar-group__label">{g.label}</span>
                  <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={20} className="sidebar-group__chevron" />
                </button>
                {expanded &&
                  g.items.map((i) => (
                    <Link key={i.path} to={i.path} className="sidebar-item" aria-current={current(i.path)}>
                      <Icon name={i.icon} size={20} />
                      <span>{i.label}</span>
                    </Link>
                  ))}
              </div>
            );
          })}</div>)}
        </nav>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__heading">
            {breadcrumb && <p className="t-caption text-muted">{breadcrumb}</p>}
            <h1 className="t-heading-3">{title}</h1>
          </div>
          <div className="topbar__actions">{mode !== 'admin' && <ModeSwitch mode={mode} />}{modeOf(pathname) === 'teacher' && <TeacherLockButton />}</div>
        </header>

        <header className="appbar">
          {detail && (
            <button type="button" className="appbar__back" aria-label="뒤로" onClick={() => navigate(-1)}>
              <Icon name="chevron-left" />
            </button>
          )}
          <h1 className="t-heading-4">{isHome ? <BrandLogo /> : title}</h1>
          {/* 화면별 앱바 보조 동작 1개(design.md app-bar). 화면이 createPortal로 채워요. */}
          <div id="appbar-actions" className="appbar__actions" />
        </header>

        {group && !detail && !isSingle(group) && (
          <nav className="sub-nav" aria-label={`${group.label} 소분류`}>
            {group.items.map((i) => (
              <Link key={i.path} to={i.path} className="sub-nav__tab" aria-current={current(i.path)}>
                {i.label}
              </Link>
            ))}
          </nav>
        )}

        <main className="shell__content">
          <Outlet />
        </main>
        {modeOf(pathname) === 'teacher' && <TeacherLockGate />}
      </div>

      <nav className="tab-bar-pill" aria-label="하단 탭">
        {tabs.map((t) => (
          <Link key={t.label} to={t.path} className="tab-bar-pill__tab" aria-current={t.on ? 'page' : undefined}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
