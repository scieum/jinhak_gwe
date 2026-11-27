// 수시 입결 · 내 비교의 지역 · 계열 칩(시안 admission-results 1440-compare 762:282739 · 2026-11-27 사용자 요청).
import type { Campus } from './univMap';
import type { FieldRow } from './univWiki';
import { classifyTrack } from './trackCollection';
import { currentUniversityName } from './universityIdentity';
import { yearUnitKey } from './yearNames';

export const FAMILIES = ['인문', '자연', '의약', '예체능'] as const;
export type Family = typeof FAMILIES[number];

const SIDO_SHORT: Record<string, string> = { 서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 광주광역시: '광주', 대전광역시: '대전', 울산광역시: '울산',
  세종특별자치시: '세종', 경기도: '경기', 강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남', 전북특별자치도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주' };
const norm = (s: string) => s.normalize('NFKC').replace(/\s/g, '');

/** 대학(캠퍼스) 이름 → 시·도 짧은 이름. 캠퍼스가 여러 시·도에 있으면 괄호('강원대학교(춘천)')로 좁히고, 그래도 여럿이면 ''(지역 전체에서만 보여요). */
export function regionOf(university: string, campuses: readonly Campus[]): string {
  const hint = university.match(/\(([^()]+)\)\s*$/)?.[1] ?? '';
  const base = university.replace(/\([^()]*\)\s*$/, '');
  const names = new Set([base, currentUniversityName(base), currentUniversityName(university)].map(norm));
  const own = campuses.filter(c => [c.name, ...c.aliases ?? []].some(n => names.has(norm(n))));
  const pick = (list: readonly Campus[]) => { const s = new Set(list.map(c => SIDO_SHORT[c.sido] ?? c.sido)); return s.size === 1 ? [...s][0] : ''; };
  return pick(own) || (hint ? pick(own.filter(c => `${c.sido}${c.sigungu}${c.campus}`.includes(hint.replace(/캠퍼스$/, '')))) : '');
}

/** 학과 계열: 의약(의·치·한·약·수의 · 간호 등 보건) · 예체능(체육 · 실기) 이름 규칙이 먼저, 나머지는 계열표 대계열(인문 · 자연). 모르면 ''. */
export function familyOf(university: string, unit: string, fields: readonly FieldRow[]): Family | '' {
  const key = yearUnitKey(unit), name = norm(currentUniversityName(university));
  const field = fields.find(f => yearUnitKey(f.unit) === key && norm(currentUniversityName(f.university)) === name);
  const tracks = classifyTrack(university, unit, field).map(m => m.track);
  if (tracks.includes('메디컬') || tracks.includes('보건') || field?.mid === '의약' || field?.mid === '보건') return '의약';
  if (tracks.includes('체육') || tracks.includes('예체능 실기')) return '예체능';
  return field?.major === '인문' || field?.major === '자연' ? field.major : '';
}
