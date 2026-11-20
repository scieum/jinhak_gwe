// 내비게이션 데이터 단일 출처. design.md App Shell(대분류-소분류)과 rules/design-rules.json screens slug를 따른다.
// 아이콘 이름은 work/design-system.json navigation/sidebar.icons 기준.
export type Mode = 'student' | 'teacher' | 'admin';

export interface NavItem {
  label: string;
  slug: string;
  path: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  icon: string;
  items: NavItem[];
}

export interface DetailScreen {
  label: string;
  slug: string;
  path: string;
  mode: Mode;
  group: string;
}

const student = (label: string, slug: string, icon: string): NavItem => ({ label, slug, path: `/${slug}`, icon });
const teacher = (label: string, slug: string, icon: string, path = `/teacher/${slug}`): NavItem => ({
  label,
  slug,
  path,
  icon,
});

export const NAV: Record<Mode, NavGroup[]> = {
  student: [
    { label: '홈', icon: 'house', items: [student('홈', 'home', 'house')] },
    {
      label: '성적',
      icon: 'chart-column',
      items: [
        student('성적 입력', 'grade-input', 'chart-column'),
        student('성적 추이', 'score-trend', 'calendar'),
        student('5 to 9', 'five-to-nine', 'sliders-horizontal'),
        student('대학별 환산', 'univ-score', 'arrow-up-down'),
        student('모의고사', 'mock-score', 'check'),
      ],
    },
    {
      label: '대학 찾기',
      icon: 'search',
      items: [
        student('전형 성향 탐색', 'admission-style', 'sparkles'),
        student('전형계획', 'admissions-list', 'file-text'),
        student('수시 입결', 'admission-results', 'chart-column'),
        student('전국 배치표', 'national-placement', 'layout-grid'),
        student('될각', 'doelgak', 'target'),
        student('지원 자격 확인표', 'eligibility-check', 'check'),
        student('전형 비교', 'compare', 'arrow-up-down'),
      ],
    },
    {
      label: '수시 전략',
      icon: 'layout-grid',
      items: [student('수시로', 'susiro', 'layout-grid'), student('원서·서류 체크리스트', 'application-checklist', 'check'), student('상담 질문·할 일', 'counsel-tasks', 'message-square'), student('생기부 AI', 'saenggibu-ai', 'sparkles')],
    },
  ],
  teacher: [
    {
      label: '우리 반',
      icon: 'users',
      items: [
        teacher('우리 반 홈', 'teacher-dashboard', 'users'),
        teacher('학생 기록', 'student-record', 'user'),
        teacher('학생 상담', 'counsel', 'message-square'),
        teacher('누가기록', 'homeroom-logs', 'file-text'),
      ],
    },
    {
      label: '성적 관리',
      icon: 'chart-column',
      items: [
        teacher('성적 불러오기', 'score-import', 'download'),
        teacher('수능 최저 판정', 'minimum-board', 'book-open'),
        // 모의고사 수합은 별도 slug가 없다 — work/result-summary/02-spec.md에서 결과 집계 화면의 탭으로 정함
        teacher('모의고사 수합', 'result-summary', 'check', '/teacher/result-summary/mock'),
      ],
    },
    {
      label: '수합·집계',
      icon: 'layout-grid',
      items: [teacher('카드 수합', 'card-collect', 'upload'), teacher('결과 집계', 'result-summary', 'chart-column')],
    },
  ],
  admin: [
    {
      label: '규칙 관리',
      icon: 'sliders-horizontal',
      // slug admin-rules 하나가 "규칙 편집기·검수"를 함께 맡는다
      items: [
        { label: '규칙 편집기', slug: 'admin-rules', path: '/admin/admin-rules', icon: 'file-text' },
        { label: '검수', slug: 'admin-rules', path: '/admin/admin-rules/review', icon: 'check' },
      ],
    },
  ],
};

// 상세 화면: 소분류가 아니라 sub-nav 없이 뒤로가기로 들어간다
export const DETAILS: DetailScreen[] = [
  { label: '대학 상세', slug: 'univ-detail', path: '/univ-detail', mode: 'student', group: '대학 찾기' },
  { label: '전형 상세', slug: 'program-detail', path: '/program-detail', mode: 'student', group: '대학 찾기' },
];

// 셸 밖(로그인 전) 화면
export const OUTSIDE = [
  { label: '로그인', slug: 'login', path: '/login' },
  { label: '회원가입', slug: 'signup', path: '/signup' },
];

export const MODE_HOME: Record<Mode, string> = {
  student: '/home',
  teacher: '/teacher/teacher-dashboard',
  admin: '/admin/admin-rules',
};

// 모바일 하단 탭바 "더보기"(교사 모드·설정·잠금)
export const MORE_PATH: Record<Mode, string> = { student: '/more', teacher: '/teacher/more', admin: '/admin/more' };

export function modeOf(pathname: string): Mode {
  if (pathname.startsWith('/teacher')) return 'teacher';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'student';
}

export interface Location {
  mode: Mode;
  group?: NavGroup;
  item?: NavItem;
  detail?: DetailScreen;
}

export function locate(pathname: string): Location {
  const mode = modeOf(pathname);
  for (const group of NAV[mode]) {
    const item = group.items.find((i) => i.path === pathname);
    if (item) return { mode, group, item };
  }
  const detail = DETAILS.find((d) => d.path === pathname);
  if (detail) return { mode, group: NAV[mode].find((g) => g.label === detail.group), detail };
  return { mode };
}

export const allItems = (): NavItem[] => Object.values(NAV).flatMap((groups) => groups.flatMap((g) => g.items));
