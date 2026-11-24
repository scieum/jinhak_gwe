// 샘플 모드에서만 대학 지도(univ-map)가 보여 주는 데모: 시·도별 개수 = Figma univ-map/390(504:81770) · /1440(506:82015) 그대로(대학 206곳 + 위치 확인 중 6곳).
// 좌표는 시안 예시예요(demo-dataset "지도 위치·지역별 건수는 시안 예시다") — 시·도 대표점 둘레에 고르게 흩어 놓은 가짜 좌표라 실제 캠퍼스 위치가 아니에요.
// 시안 목록에 그려진 서울 4곳(건국·경희·고려·성균관) · 관심 대학(경희·건국·성균관·동국·한양·중앙)의 캠퍼스만 실제 이름이고 나머지는 "예시대학"이에요.
// 샘플 띠가 보이는 샘플 모드에서만 쓰고, 샘플을 지우면 public/data/univ-map.json(관리자 2명 검수분)만 보여요.
import { SIDO } from '../../domain/auth';
import type { Campus, Founding, Kind, UnivMapData } from '../../domain/univMap';
import type { Sido } from '../../assets/map/sido';

// 시안 개수(합 206). 울산은 시안에서 "확인 중"(개수 표식 없음)
const COUNT: Record<Sido, number> = {
  서울특별시: 48, 부산광역시: 15, 대구광역시: 5, 인천광역시: 5, 광주광역시: 7, 대전광역시: 10, 울산광역시: 0, 세종특별자치시: 3,
  경기도: 30, 강원특별자치도: 9, 충청북도: 12, 충청남도: 16, 전북특별자치도: 9, 전라남도: 6, 경상북도: 19, 경상남도: 10, 제주특별자치도: 2,
};
const PENDING: Partial<Record<Sido, number>> = { 울산광역시: 2, 경기도: 2, 강원특별자치도: 2 }; // 시안 "위치 확인 중 6곳"
// 시·도 대표점(경위도) = 지도 개수 표식 자리(assets/map/sido LABEL과 같은 값)
const CENTER: Record<Sido, [number, number]> = {
  서울특별시: [127.0, 37.56], 부산광역시: [129.05, 35.2], 대구광역시: [128.58, 35.87], 인천광역시: [126.65, 37.47], 광주광역시: [126.85, 35.16],
  대전광역시: [127.38, 36.34], 울산광역시: [129.25, 35.56], 세종특별자치시: [127.24, 36.6], 경기도: [127.35, 37.27], 강원특별자치도: [128.3, 37.7],
  충청북도: [127.85, 36.85], 충청남도: [126.85, 36.5], 전북특별자치도: [127.15, 35.75], 전라남도: [126.95, 34.8], 경상북도: [128.85, 36.45],
  경상남도: [128.25, 35.3], 제주특별자치도: [126.55, 33.38],
};
// 실제 이름 캠퍼스: 대학, 캠퍼스, 본교/분교, 설립, 시·도, 시·군·구
type Named = [name: string, campus: string, type: '본교' | '분교', founding: Founding, sido: Sido, sigungu: string];
const NAMED: Named[] = [
  ['건국대학교', '서울캠퍼스', '본교', '사립', '서울특별시', '광진구'], ['경희대학교', '서울캠퍼스', '본교', '사립', '서울특별시', '동대문구'],
  ['고려대학교', '안암캠퍼스', '본교', '사립', '서울특별시', '성북구'], ['성균관대학교', '인문사회과학캠퍼스', '본교', '사립', '서울특별시', '종로구'],
  ['중앙대학교', '서울캠퍼스', '본교', '사립', '서울특별시', '동작구'], ['한양대학교', '서울캠퍼스', '본교', '사립', '서울특별시', '성동구'],
  ['경희대학교', '국제캠퍼스', '본교', '사립', '경기도', '용인시'], ['성균관대학교', '자연과학캠퍼스', '본교', '사립', '경기도', '수원시'],
  ['한양대학교', 'ERICA캠퍼스', '분교', '사립', '경기도', '안산시'], ['중앙대학교', '다빈치캠퍼스', '본교', '사립', '경기도', '안성시'],
  ['건국대학교', '글로컬캠퍼스', '분교', '사립', '충청북도', '충주시'], ['동국대학교', 'WISE캠퍼스', '분교', '사립', '경상북도', '경주시'],
  ['고려대학교', '세종캠퍼스', '분교', '사립', '세종특별자치시', '세종시'],
];
const FOUNDINGS: Founding[] = ['사립', '사립', '국립', '사립', '공립'], KINDS: Kind[] = ['일반대학', '일반대학', '일반대학', '교육대학', '산업대학'];

function campuses(): Campus[] {
  const out: Campus[] = [];
  let filler = 0;
  for (const sido of SIDO) {
    const named = NAMED.filter(n => n[4] === sido), [lng, lat] = CENTER[sido];
    for (let i = 0; i < COUNT[sido]; i++) {
      // 대표점 둘레 나선(황금각)으로 흩는다 — 시안 예시 좌표
      const r = 0.035 * Math.sqrt(i + 1), a = i * 2.39996;
      const n = named[i], k = ++filler;
      const [name, campus, campus_type, founding, , sigungu] = n ?? [`예시대학 ${String(k).padStart(3, '0')}`, '예시캠퍼스', '본교', FOUNDINGS[k % 5], sido, '예시구'];
      out.push({ id: `sample-${k}|${campus}`.replace(/\s/g, ''), univ_id: `sample-${name}`, name, campus, campus_type, school_kind: n ? '일반대학' : KINDS[k % 5], founding,
        sido, sigungu, address: '', lat: lat + r * Math.sin(a), lng: lng + r * Math.cos(a) * 1.25 });
    }
  }
  return out;
}

export const sampleUnivMap: UnivMapData = {
  base_date: '2026-11-20', list_source: '', list_as_of: '', reviewed_at: '', campuses: campuses(), pending: PENDING,
};
export const SAMPLE_UNIV_MAP_SOURCE = '지도·지역별 수는 시안 예시 · 샘플의 대학·숫자는 예시예요 · 캠퍼스 위치는 공식 주소 확인 뒤 표시';
