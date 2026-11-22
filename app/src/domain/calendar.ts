import { safeSourceUrl, validDate, validDeadline, type ApplicationPlan } from './planner';
import type { Board } from './board';

export interface ApplicationEvent {
  id: string; application: ApplicationPlan; title: string; date: string | null; time: string | null;
  done: boolean; kind: 'checklist' | 'exam'; boards: string[]; source: string; note: string;
}
/** A calendar is a projection of saved records, never a second copy of their dates. */
export function applicationEvents(applications: ApplicationPlan[], boards: Board[]): ApplicationEvent[] {
  const events: ApplicationEvent[] = [];
  const byId = new Map(applications.map(a => [a.id, a]));
  for (const application of applications) for (const step of application.steps) {
    if (step.status === 'na') continue;
    const due = step.due_at && validDeadline(step.due_at) ? step.due_at : null;
    events.push({ id: JSON.stringify(['step', application.id, step.id]), application, title: step.title,
      date: due?.slice(0, 10) ?? null, time: due?.slice(11) ?? null, done: step.status === 'done', kind: 'checklist', boards: [],
      source: step.source_url || application.source_url, note: step.note });
  }
  const exams = new Map<string, ApplicationEvent>();
  for (const board of boards) for (const slot of [...board.slots, ...board.exempt]) {
    const application = byId.get(slot.application_id);
    if (!application || slot.exam_kind === 'none') continue;
    const date = slot.exam_date && validDate(slot.exam_date) ? slot.exam_date : null;
    const id = JSON.stringify(['exam', application.id, slot.exam_kind, date]);
    const existing = exams.get(id);
    if (existing) { if (!existing.boards.includes(board.name)) existing.boards.push(board.name); }
    else exams.set(id, { id, application, title: slot.exam_kind, date, time: null, done: false, kind: 'exam', boards: [board.name], source: application.source_url, note: '고사 시각은 수시로에 기록되지 않아요. 원문에서 확인해 주세요.' });
  }
  for (const exam of exams.values()) exam.boards.sort((a, b) => a.localeCompare(b, 'ko'));
  return [...events, ...exams.values()].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || (a.time ?? '').localeCompare(b.time ?? '') || a.application.university.localeCompare(b.application.university, 'ko'));
}
export function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function monthDays(month: string): (string | null)[][] {
  const first = new Date(`${month}-01T00:00:00Z`);
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: first.getUTCDay() }, () => null);
  for (let day = 1; day <= count; day++) cells.push(`${month}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}
export function eventStatus(event: ApplicationEvent, today: string, now = new Date()) {
  if (event.done) return '완료';
  if (!event.date) return '날짜 미정';
  if (event.date < today || event.time && new Date(`${event.date}T${event.time}:00+09:00`) < now) return '기한 지남';
  const days = Math.round((Date.parse(`${event.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return days === 0 ? '오늘' : `D-${days}`;
}
const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
// RFC 5545 physical lines are at most 75 UTF-8 octets, including continuation space.
function fold(line: string) {
  const encoder = new TextEncoder(); let result = '', length = 0;
  for (const char of line) { const size = encoder.encode(char).length; if (length + size > 75) { result += '\r\n '; length = 1; } result += char; length += size; }
  return result;
}
export function calendarIcs(events: ApplicationEvent[], now = new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jinhak Navi//Application Calendar//KO', 'CALSCALE:GREGORIAN'];
  for (const event of events) {
    if (!event.date || !validDate(event.date)) continue;
    const a = event.application;
    lines.push('BEGIN:VEVENT', `UID:${encodeURIComponent(event.id)}@jinhak-navi.local`, `DTSTAMP:${stamp(now)}`);
    if (event.time) lines.push(`DTSTART:${stamp(new Date(`${event.date}T${event.time}:00+09:00`))}`);
    else {
      const next = new Date(Date.parse(`${event.date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
      lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${next.replace(/-/g, '')}`);
    }
    lines.push(`SUMMARY:${escapeText(`${event.done ? '[완료] ' : ''}${a.university} · ${a.department || a.program} · ${event.title}`)}`,
      `DESCRIPTION:${escapeText(`${a.year}학년도 · ${a.program}\n내가 입력한 일정 · 대학 공식 안내에서 최종 확인해 주세요.${event.boards.length ? '\n' + event.boards.join(' · ') : ''}\n${event.note}`)}`);
    if (event.source && safeSourceUrl(event.source)) lines.push(`URL:${new URL(event.source).href}`);
    lines.push('END:VEVENT');
  }
  return [...lines, 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
