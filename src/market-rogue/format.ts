export function formatCash(n: number): string {
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e4) return '$' + (n / 1e3).toFixed(1) + 'K';
  if (Math.abs(n) >= 100) return '$' + Math.floor(n).toLocaleString();
  return '$' + n.toFixed(2);
}

export function formatPrice(n: number): string {
  return '$' + n.toFixed(2);
}

export function formatPercent(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}
