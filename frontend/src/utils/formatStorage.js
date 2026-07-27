const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;

/** Drops trailing zeros so 4.00 reads as 4 and 1.50 as 1.5. */
function trim(value, decimals) {
  return String(Number(value.toFixed(decimals)));
}

/**
 * Formats a byte count with the unit that keeps the number readable.
 *
 * Admins can set any quota in MB, so a fixed GB unit turns small plans into unreadable values
 * like "0.01GB". Picking the unit from the size keeps 10 MB as "10MB" and 4096 MB as "4GB".
 *
 * Only MB and GB are used: quotas are configured in megabytes, so a KB tier would only ever show
 * up on the used side and force the reader to compare mismatched units ("320KB / 10MB").
 */
export function formatStorageBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "0MB";
  // Anything under 0.1MB still holds documents, so avoid rounding it down to a bare "0MB".
  if (value < BYTES_PER_MB / 10) return "<0.1MB";
  if (value < BYTES_PER_GB) return `${trim(value / BYTES_PER_MB, 1)}MB`;
  return `${trim(value / BYTES_PER_GB, 2)}GB`;
}

/** Same rule for quotas, which the backend stores and the admin edits in megabytes. */
export function formatStorageMb(megabytes) {
  const value = Number(megabytes);
  if (!Number.isFinite(value) || value <= 0) return "0MB";
  return formatStorageBytes(value * BYTES_PER_MB);
}
