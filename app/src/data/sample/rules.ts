// 샘플 모드에서 될각·홈 판정에 쓰는 규칙 사본. 원래 규칙(draft)은 그대로이고, 사본에만 sample 표식을 붙여요.
// 샘플 모드가 꺼지면 reviewed()가 이 사본도 막아요(NEVER-1). 실제 검수 상태는 바뀌지 않아요.
import type { Provenance } from '../../engine/types';
import { baseConversionRule, distributionRule, enrollmentRule, judgmentRule } from '../conversion-rules';
import { isSampleMode } from './mode';

const copy = <T extends Provenance>(r: T): T => ({ ...r, id: `sample-${r.id}`, source: `샘플 데이터(가상) · ${r.source}`, sample: true });
const real = { base: baseConversionRule, enrollment: enrollmentRule, distribution: distributionRule, judgment: judgmentRule };
export const sampleRules = { ...real, base: copy(baseConversionRule), enrollment: copy(enrollmentRule), judgment: copy(judgmentRule) };
/** 지금 쓸 환산·판정 규칙. 샘플 모드일 때만 sample 사본이에요. */
export const activeRules = () => isSampleMode() ? sampleRules : real;
