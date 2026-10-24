import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { attendanceByStudent, formatAttendanceCount, formatAttendancePercentage } from '../services/attendance';

const statuses = [
  ['present', 'حاضر'], ['absent', 'غائب'], ['late', 'متأخر'], ['excused', 'بعذر'],
];
const statusLabels = Object.fromEntries(statuses);
const statusTones = {
  present: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  late: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  absent: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  excused: 'border-slate-600 bg-slate-800 text-slate-300',
};

const todayInCairo = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
const recordDate = (record) => String(record.date || '').slice(0, 10);
const recordStudentId = (record) => String(
  typeof record.student === 'object'
    ? record.student?._id || record.student?.id || ''
    : record.student || '',
);
const dateLabel = (value) => new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'UTC',
  dateStyle: 'medium',
}).format(new Date(`${value}T12:00:00Z`));

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex min-w-16 justify-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusTones[status] || 'border-slate-700 bg-slate-800/70 text-slate-500'}`}>
      {statusLabels[status] || 'لم يسجل'}
    </span>
  );
}

function StatusSelect({ student, date, value, saving, onChange }) {
  return (
    <select
      aria-label={`حالة حضور ${student.fullNameArabic || student.name} في ${dateLabel(date)}`}
      value={value}
      disabled={saving}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-10 w-full rounded-xl border border-amber-500/30 bg-slate-950 px-2.5 py-2 text-sm font-semibold text-white focus:border-amber-300 sm:min-w-28"
    >
      {statuses.map(([status, label]) => <option key={status} value={status}>{label}</option>)}
    </select>
  );
}

export default function AdminAttendance({ showToast }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [date, setDate] = useState(todayInCairo);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let current = true;
    Promise.all([api.students(), api.attendance(), api.attendanceSummary()])
      .then(([studentRows, records, attendanceSummary]) => {
        if (!current) return;
        setStudents(studentRows);
        setAttendance(records);
        setSummary(attendanceSummary);
        setError('');
      })
      .catch((requestError) => { if (current) setError(requestError.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const summaryByStudent = attendanceByStudent(summary);
  const attendanceByDate = useMemo(() => new Map(
    attendance.map((record) => [`${recordStudentId(record)}:${recordDate(record)}`, record]),
  ), [attendance]);
  const dates = useMemo(() => [...new Set([date, ...attendance.map(recordDate).filter(Boolean)])]
    .sort((a, b) => b.localeCompare(a)), [attendance, date]);

  const statusFor = (student, day = date) => (
    values[`${student.id}:${day}`]
      ?? attendanceByDate.get(`${student.id}:${day}`)?.status
      ?? 'absent'
  );

  const setStatus = (studentId, day, status) => {
    setValues((old) => ({ ...old, [`${studentId}:${day}`]: status }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.saveAttendance(students.map((student) => ({
        studentId: student.id,
        date,
        service: 'Sunday service',
        status: statusFor(student),
      })));
      const [records, attendanceSummary] = await Promise.all([api.attendance(), api.attendanceSummary()]);
      setAttendance(records);
      setSummary(attendanceSummary);
      showToast('تم حفظ سجل الحضور في قاعدة البيانات');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5" dir="rtl">
      <header className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-gradient-to-l from-amber-950/40 to-slate-900 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <h1 className="text-2xl font-bold text-white">الحضور والغياب</h1>
          <p className="mt-1 text-sm text-slate-400">سجل الطلاب بحسب تاريخ كل خدمة.</p>
          <p className="mt-2 text-xs font-semibold text-amber-300">{dates.length} تاريخاً في السجل</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[auto_auto] sm:items-end">
          <label className="text-xs font-semibold text-slate-400">تاريخ الخدمة الجديدة أو التعديل
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white sm:w-auto" />
          </label>
          <button disabled={saving || loading || students.length === 0} onClick={save} className="min-h-11 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            {saving ? 'جارٍ الحفظ...' : `حفظ حضور ${dateLabel(date)}`}
          </button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">{error}</p>}
      {summary && <section aria-label="ملخص الحضور" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-slate-900 p-4 sm:p-5">
          <p className="text-sm font-semibold text-slate-300">نسبة حضور جميع الطلاب</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-300">{formatAttendancePercentage(summary.overall?.percentage)}</p>
          <p className="mt-1 text-xs text-slate-400">{formatAttendanceCount(summary.overall)}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <p className="text-sm font-semibold text-slate-300">الطلاب ذوو سجلات</p>
          <p className="mt-2 text-3xl font-extrabold text-white">{(summary.students || []).filter((item) => item.total > 0).length}</p>
          <p className="mt-1 text-xs text-slate-400">من أصل {students.length} طالباً في المجموعة</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:col-span-2 sm:p-5 xl:col-span-1">
          <p className="text-sm font-semibold text-slate-300">طريقة الحساب</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">الحاضر والمتأخر من السجلات المحتسبة؛ تُستبعد حالات العذر.</p>
        </article>
      </section>}

      {loading && <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">جارٍ تحميل سجل الحضور...</p>}
      {!loading && students.length === 0 && !error && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-400">لا يوجد طلاب معيّنون إلى حسابك.</p>}

      {!loading && students.length > 0 && <section aria-labelledby="attendance-history-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="attendance-history-title" className="text-lg font-bold text-white">سجل الحضور الكامل</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">كل عمود يمثل تاريخ خدمة. اختر التاريخ بالأعلى لتعديل سجل ذلك اليوم.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
            {statuses.map(([status]) => <StatusBadge key={status} status={status} />)}
            <StatusBadge status="unrecorded" />
          </div>
        </div>

        <div className="space-y-3 sm:hidden">
          {students.map((student) => {
            const studentSummary = summaryByStudent.get(student.id);
            return (
              <article key={student.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                <header className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
                  <div className="min-w-0">
                    <h3 className="break-words font-bold text-white">{student.fullNameArabic || student.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">{student.confessionFather || '—'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">{formatAttendancePercentage(studentSummary?.percentage)}</span>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[330px] text-right text-sm">
                    <thead className="bg-slate-950/70 text-xs text-slate-400"><tr><th scope="col" className="px-4 py-2.5">تاريخ الخدمة</th><th scope="col" className="px-4 py-2.5">الحضور</th></tr></thead>
                    <tbody>
                      {dates.map((day) => {
                        const selected = day === date;
                        const status = statusFor(student, day);
                        return <tr key={day} className="border-t border-slate-800">
                          <th scope="row" className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold ${selected ? 'text-amber-300' : 'text-slate-300'}`}>{dateLabel(day)}{selected && <span className="mr-1 text-[10px]">· التعديل</span>}</th>
                          <td className="px-4 py-2">
                            {selected
                              ? <StatusSelect student={student} date={day} value={status} saving={saving} onChange={(value) => setStatus(student.id, day, value)} />
                              : <StatusBadge status={attendanceByDate.get(`${student.id}:${day}`)?.status} />}
                          </td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 sm:block">
          <table className="w-full text-right text-sm" style={{ minWidth: `${260 + dates.length * 126}px` }}>
            <thead className="sticky top-0 z-20 bg-slate-800 text-amber-300">
              <tr>
                <th scope="col" className="sticky right-0 z-30 min-w-56 border-l border-slate-700 bg-slate-800 p-3">الطالب</th>
                {dates.map((day) => <th key={day} scope="col" className={`min-w-32 border-l border-slate-700 p-3 text-center ${day === date ? 'bg-amber-500/15 text-amber-200' : ''}`}>
                  <span className="block whitespace-nowrap">{dateLabel(day)}</span>
                  {day === date && <span className="mt-1 block text-[10px] text-amber-300">التاريخ المحدد</span>}
                </th>)}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const studentSummary = summaryByStudent.get(student.id);
                return <tr key={student.id} className="border-t border-slate-800 text-slate-200">
                  <th scope="row" className="sticky right-0 z-10 min-w-56 border-l border-slate-800 bg-slate-900 p-3 text-right">
                    <span className="block break-words font-bold text-white">{student.fullNameArabic || student.name}</span>
                    <span className="mt-1 block text-xs font-normal text-slate-400">{formatAttendancePercentage(studentSummary?.percentage)} · {formatAttendanceCount(studentSummary)}</span>
                  </th>
                  {dates.map((day) => {
                    const selected = day === date;
                    const record = attendanceByDate.get(`${student.id}:${day}`);
                    return <td key={day} className={`border-l border-slate-800 p-2 text-center ${selected ? 'bg-amber-500/[0.04]' : ''}`}>
                      {selected
                        ? <StatusSelect student={student} date={day} value={statusFor(student, day)} saving={saving} onChange={(value) => setStatus(student.id, day, value)} />
                        : <StatusBadge status={record?.status} />}
                    </td>;
                  })}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>}
    </div>
  );
}
