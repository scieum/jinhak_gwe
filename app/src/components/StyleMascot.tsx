import type { StyleId } from '../domain/admissionStyle';

export type MascotKind = StyleId | 'mixed' | 'open' | 'insufficient' | 'guide';
const descriptions: Record<MascotKind, string> = {
  guide: '나침반 수첩을 들고 손을 흔드는 길콩',
  record: '체크 수첩에 기록하는 길콩', explore: '돋보기로 잎을 살펴보는 길콩',
  reason: '근거 연결 보드를 설명하는 길콩', practice: '앞치마를 입고 블록을 만드는 길콩',
  exam: '전략판과 타이머를 든 길콩', mixed: '갈림길 지도와 나침반을 든 길콩',
  open: '별을 들고 두 팔을 펼친 길콩', insufficient: '새싹을 돌보며 첫걸음을 내딛는 길콩',
};
export function StyleMascot({ kind = 'guide' }: { kind?: MascotKind }) {
  const filename = kind === 'guide' ? 'gilkong.png' : `gilkong-${kind}-v1.png`;
  return <img className="style-mascot" src={`${import.meta.env.BASE_URL}assets/admission-style/${filename}`}
    alt={descriptions[kind]} width={1254} height={1254} decoding="async" />;
}
