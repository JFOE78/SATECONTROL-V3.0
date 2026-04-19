/**
 * Convierte una fecha ISO (AAAA-MM-DD) a formato español (DD/MM/AAAA)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}
