function parseTimeStr(str) {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  if (parts.length === 2) return parts[0]*60 + parts[1];
  return parts[0];
}
function formatTimeStr(sec) {
  if (sec === null || sec === undefined) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = (sec % 60).toFixed(1);
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
}
console.log(parseTimeStr("01:23"));
console.log(parseTimeStr("01:23.5"));
console.log(formatTimeStr(83.5));
