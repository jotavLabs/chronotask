// Pure mapping of device-calendar events to the app's event shape. No native deps,
// no DB — the service layer adds category/priority and persists.

export type DeviceEvent = {
  id: string;
  title?: string | null;
  startDate: string | number | Date;
  endDate: string | number | Date;
  allDay?: boolean;
};

export type MappedEvent = {
  externalId: string;
  date: string; // YYYY-MM-DD (local)
  start: string; // HH:MM
  end: string; // HH:MM
  title: string;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const localTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

function toDate(v: string | number | Date): Date | null {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Maps one device event; returns null when it lacks an id or has invalid dates. */
export function mapDeviceEvent(ev: DeviceEvent): MappedEvent | null {
  if (!ev?.id) return null;
  const startD = toDate(ev.startDate);
  const endD = toDate(ev.endDate);
  if (!startD || !endD) return null;

  const date = localDate(startD);
  const title = (ev.title ?? '').trim() || '(Sem título)';

  if (ev.allDay) {
    return { externalId: ev.id, date, start: '00:00', end: '23:59', title };
  }
  // Eventos que cruzam a meia-noite são fixados ao fim do dia de início.
  const end = localDate(endD) === date ? localTime(endD) : '23:59';
  let start = localTime(startD);
  if (start >= end) start = end === '23:59' ? '00:00' : end;
  return { externalId: ev.id, date, start, end, title };
}

/** Maps many events, dropping invalid ones and de-duplicating by externalId (first wins). */
export function mapDeviceEvents(evs: DeviceEvent[]): MappedEvent[] {
  const seen = new Set<string>();
  const out: MappedEvent[] = [];
  for (const ev of evs) {
    const m = mapDeviceEvent(ev);
    if (!m || seen.has(m.externalId)) continue;
    seen.add(m.externalId);
    out.push(m);
  }
  return out;
}
