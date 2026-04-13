/**
 * Generate an array of time slots from start to end with the given step in minutes.
 * e.g. generateTimeSlots('06:00', '20:00', 15) => ['06:00', '06:15', ..., '20:00']
 */
export function generateTimeSlots(start = '06:00', end = '20:00', stepMinutes = 15) {
  const times = [];
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let current = startH * 60 + startM;
  const last = endH * 60 + endM;

  while (current <= last) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += stepMinutes;
  }

  return times;
}
