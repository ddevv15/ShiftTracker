// Single source of truth for shift duration math.
// Open shifts/breaks are measured up to `now`, so the same function serves
// live stats, closed-shift totals, admin views and CSV export.

const toMs = (value) => new Date(value).getTime();

// Optional `window` ({ from, to }) counts only the part of the shift inside
// it, so a shift crossing midnight is split correctly between days.
const computeShiftTimes = (shift, now = new Date(), window = null) => {
  let start = toMs(shift.startTime);
  let end = shift.endTime ? toMs(shift.endTime) : toMs(now);
  if (window) {
    start = Math.max(start, toMs(window.from));
    end = Math.min(end, toMs(window.to));
  }
  const totalTime = Math.max(0, end - start);

  const totalBreakTime = (shift.breaks || []).reduce((total, breakItem) => {
    // An unclosed break ends when the shift ends; breaks are clipped to the
    // shift window so an admin-shortened shift never counts stray break time
    const breakStart = Math.max(toMs(breakItem.startTime), start);
    const breakEnd = Math.min(breakItem.endTime ? toMs(breakItem.endTime) : end, end);
    return total + Math.max(0, breakEnd - breakStart);
  }, 0);

  return {
    totalTime,
    totalBreakTime,
    totalWorkingTime: Math.max(0, totalTime - totalBreakTime)
  };
};

const formatDuration = (ms) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

module.exports = {
  computeShiftTimes,
  formatDuration
};
