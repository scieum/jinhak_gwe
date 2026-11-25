import data from './districts.json';
import type { Sido } from './sido';

type District = { name: string; d: string; label: number[] };
type Region = { d: string; bbox: { x: number; y: number; w: number; h: number }; districts: District[] };
export const REGION_BOUNDARIES: Record<Sido, Region> = data.regions;
export const DISTRICT_SOURCE = data.source;
export const DISTRICT_DATE = data.date;

/** SVG map units in, screen-pixel collision checks. Keep place names clear of campus markers. */
export function districtLabels(districts: District[], pins: { x: number; y: number; ids: string[] }[], scale: number) {
  const placed: { name: string; x: number; y: number; width: number }[] = [];
  for (const district of districts) {
    const [x, y] = district.label.map(n => n * scale), width = district.name.length * 11 + 6;
    const offsets = [0, -22, 22, -38, 38];
    const dy = offsets.find(offset => {
      const cy = y + offset;
      return pins.every(p => Math.abs(p.x * scale - x) > width / 2 + (p.ids.length > 1 ? 16 : 9)
        || Math.abs(p.y * scale - cy) > (p.ids.length > 1 ? 24 : 17))
        && placed.every(p => Math.abs(p.x - x) > (p.width + width) / 2 || Math.abs(p.y - cy) > 16);
    });
    // Dense metropolitan labels have a native title on the boundary; do not obscure a campus.
    if (dy !== undefined) placed.push({ name: district.name, x, y: y + dy, width });
  }
  return placed.map(p => ({ name: p.name, x: p.x / scale, y: p.y / scale }));
}
