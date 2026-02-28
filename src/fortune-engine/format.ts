export function formatCash(n: number): string {
  if (n < 0) return '-' + formatCash(-n);
  if (n < 1000) return '$' + n.toFixed(n < 10 ? 2 : 0);
  if (n < 1e6) return '$' + (n / 1e3).toFixed(2) + 'K';
  if (n < 1e9) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n < 1e12) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n < 1e15) return '$' + (n / 1e12).toFixed(2) + 'T';
  return '$' + n.toExponential(2);
}

export function formatNumber(n: number): string {
  if (n < 1000) return n.toFixed(0);
  if (n < 1e6) return (n / 1e3).toFixed(1) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(1) + 'M';
  if (n < 1e12) return (n / 1e9).toFixed(1) + 'B';
  return n.toExponential(1);
}

export function formatPercent(n: number, decimals = 1): string {
  const prefix = n >= 0 ? '+' : '';
  return prefix + n.toFixed(decimals) + '%';
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + (s % 60) + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

export function formatPrice(n: number): string {
  if (n >= 1000) return formatCash(n);
  if (n >= 1) return '$' + n.toFixed(2);
  return '$' + n.toFixed(4);
}
