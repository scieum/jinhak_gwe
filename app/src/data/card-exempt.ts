/**
 * R-CARD-001 6회 제한 제외 기관 (PRD 6-7: 과학기술원, 사관학교, 경찰대 등). Names are compared without spaces.
 * shortcut: 전문대학은 이름으로 가릴 수 없어 아직 목록에 없어요 — 대학 구분 데이터가 생기면 그쪽으로 옮겨요.
 */
export const cardExemptInstitutions: readonly string[] = [
  '한국과학기술원', 'KAIST', '광주과학기술원', 'GIST', '대구경북과학기술원', 'DGIST', '울산과학기술원', 'UNIST', '한국에너지공과대학교', '한국에너지공대', 'KENTECH',
  '육군사관학교', '해군사관학교', '공군사관학교', '국군간호사관학교', '경찰대학', '경찰대학교',
];
