import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { BrandLogo } from '../components/BrandLogo';
import { ModeSwitch } from './ModeSwitch';
import { MODE_HOME, MORE_PATH, NAV, locate, modeOf, type NavGroup } from './nav';
import { workspaceOf } from './workspace';
import { TeacherLockButton, TeacherLockGate } from '../components/TeacherLock';
import { dataAsOf } from '../data/catalog';
import { SampleBanner, SampleReshowButton } from './SampleBanner';
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
  // 교사 셸은 교사 메뉴만(v2 시안, 2026-11-24 사용자 결정). 학생 화면은 모드 전환으로 간다.
  const sections: [string | null, NavGroup[]][] = [[null, NAV[mode]]];
  const title = item?.label ?? detail?.label ?? (isMore ? '더보기' : 'U:NAVI');
  const breadcrumb = group && !isSingle(group) ? `${group.label} › ${title}` : null;
  const groups = NAV[mode];
  // 모바일 머리(v2 시안 · design.md page-header/brand-logo): 상세 = app-bar 뒤로가기 + 화면 제목,
  // 그 밖 = app-bar brand-logo → 대분류 제목 heading-1 → sub-nav (소분류 없는 홈은 제목 줄 없음)
  const mobileTitle = detail ? null : isMore ? '더보기' : group && !isSingle(group) ? group.label : null;

  // 지금 대분류는 항상 펼침, 나머지는 눌러서 펼친다
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const toggle = (label: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  // 넘치는 sub-nav는 고른 탭이 보이게 가로로 민다(v2 시안: 선택 탭이 화면 안)
  const subNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const n = subNav.current, t = n?.querySelector<HTMLElement>('[aria-current="page"]');
    if (n && t && t.offsetLeft + t.offsetWidth > n.clientWidth) n.scrollLeft = t.offsetLeft + t.offsetWidth - n.clientWidth + t.offsetWidth / 2;
  }, [pathname]);

  const current = (path: string) => (path === pathname ? 'page' : undefined);
  const tabs = [
    ...groups.map((g) => ({ label: g.label, icon: g.icon, path: g.items[0].path, on: g === group && !isMore })),
    { label: '더보기', icon: 'menu', path: MORE_PATH[mode], on: isMore },
  ];

  return (
    <div className="shell" data-screen={pathname.split('/').filter(Boolean).at(-1) ?? 'home'}>
      <aside className="sidebar">
        <Link to={MODE_HOME[mode]} className="sidebar__wordmark" aria-label="U:NAVI 홈">
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
        <footer className="sidebar__footer"><p className="t-caption text-muted">데이터 기준일 {dataAsOf}</p>{mode === 'student' && <Link to="/grade-input?backup=1" className="button-pill-soft"><Icon name="download" size={20} />백업</Link>}<SampleReshowButton className="text-button" /></footer>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__heading">
            <p className="t-caption text-muted">{breadcrumb ?? title}</p>
            <h1 className="t-heading-3">{title}</h1>
          </div>
          <div className="topbar__actions"><div id="topbar-screen-actions" />{mode !== 'admin' && <ModeSwitch mode={mode} />}{modeOf(pathname) === 'teacher' && <TeacherLockButton />}</div>
        </header>

        <header className="appbar">
          {detail ? (
            <>
              <button type="button" className="appbar__back" aria-label="뒤로" onClick={() => navigate(-1)}>
                <Icon name="chevron-left" />
              </button>
              <h1 className="t-heading-4">{title}</h1>
            </>
          ) : (
            <Link to={MODE_HOME[mode]} className="appbar__logo" aria-label="U:NAVI 홈"><BrandLogo /></Link>
          )}
          {/* 화면별 앱바 보조 동작 1개(design.md app-bar). 화면이 createPortal로 채워요. */}
          <div id="appbar-actions" className="appbar__actions" />
        </header>
        {mobileTitle && <h1 className="appbar-title">{mobileTitle}</h1>}
        <SampleBanner />

        {group && !detail && !isSingle(group) && (
          <nav ref={subNav} className="sub-nav" aria-label={`${group.label} 소분류`}>
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
