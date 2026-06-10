import { mapDeviceEvent, mapDeviceEvents } from '../calendar';
import type { DeviceEvent } from '../calendar';

const ev = (over: Partial<DeviceEvent> = {}): DeviceEvent => ({
  id: 'a1',
  title: 'Dentista',
  startDate: new Date(2026, 5, 12, 9, 30),
  endDate: new Date(2026, 5, 12, 10, 15),
  ...over,
});

describe('mapDeviceEvent', () => {
  it('maps a timed event to date + HH:MM', () => {
    expect(mapDeviceEvent(ev())).toEqual({
      externalId: 'a1',
      date: '2026-06-12',
      start: '09:30',
      end: '10:15',
      title: 'Dentista',
    });
  });

  it('maps an all-day event to a full-day span', () => {
    const m = mapDeviceEvent(ev({ allDay: true }));
    expect(m).toMatchObject({ start: '00:00', end: '23:59' });
  });

  it('clamps an event crossing midnight to end of day', () => {
    const m = mapDeviceEvent(ev({ endDate: new Date(2026, 5, 13, 1, 0) }));
    expect(m).toMatchObject({ date: '2026-06-12', end: '23:59' });
  });

  it('falls back to a placeholder title', () => {
    expect(mapDeviceEvent(ev({ title: '   ' }))?.title).toBe('(Sem título)');
  });

  it('returns null for missing id or invalid dates', () => {
    expect(mapDeviceEvent(ev({ id: '' }))).toBeNull();
    expect(mapDeviceEvent(ev({ startDate: 'not-a-date' }))).toBeNull();
  });
});

describe('mapDeviceEvents', () => {
  it('drops invalid and de-duplicates by externalId', () => {
    const out = mapDeviceEvents([
      ev({ id: 'x' }),
      ev({ id: 'x', title: 'dup' }),
      ev({ id: '' }),
      ev({ id: 'y' }),
    ]);
    expect(out.map((e) => e.externalId)).toEqual(['x', 'y']);
    expect(out[0].title).toBe('Dentista'); // first wins
  });
});
