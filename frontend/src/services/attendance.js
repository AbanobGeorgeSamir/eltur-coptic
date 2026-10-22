export function formatAttendancePercentage(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(Number(value))}%`;
}

export function formatAttendanceCount(summary) {
  if (!summary?.total) return 'لا توجد سجلات حضور بعد';
  return `${summary.attended} من ${summary.total} سجلاً محتسباً`;
}

export function attendanceByStudent(summary) {
  return new Map((summary?.students || []).map((item) => [item.studentId, item]));
}
