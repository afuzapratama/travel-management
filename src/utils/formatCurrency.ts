// ============================================
// FORMAT CURRENCY - Indonesian Rupiah
// ============================================

export function formatRupiah(amount: number): string {
  return amount.toLocaleString('id-ID');
}

export function formatRupiahFull(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function parseRupiahInput(value: string): number {
  // Remove all non-digit characters
  const clean = value.replace(/\D/g, '');
  return parseInt(clean, 10) || 0;
}
