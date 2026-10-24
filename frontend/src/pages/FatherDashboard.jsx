import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { api } from '../services/api';
import { attendanceByStudent, formatAttendanceCount, formatAttendancePercentage } from '../services/attendance';

export default function FatherDashboard() {
  const [children, setChildren] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.parentDashboard().then(setChildren).catch((requestError) => setError(requestError.message));
    api.attendanceSummary().then(setAttendanceSummary).catch((requestError) => setError(requestError.message));
  }, []);
  const summaryByStudent = attendanceByStudent(attendanceSummary);
  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">
      <header className="bg-slate-900 border border-amber-500/30 p-6 rounded-3xl text-center">
        <Award className="w-10 h-10 text-amber-400 mx-auto" />
        <h1 className="text-2xl font-bold text-white mt-3">متابعة الأبناء</h1>
        <p className="text-sm text-slate-400 mt-2">تظهر بيانات الأبناء بعد اعتماد ربط ولي الأمر من مسؤول الخدمة.</p>
      </header>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {!children.length && !error && <p className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-sm leading-6 text-slate-300">لا توجد بيانات أبناء معتمدة لهذا الحساب حالياً. إذا كنت قد أنشأت الحساب للتو، تواصل مع مسؤول الخدمة لاعتماد الربط والتحقق من رقم ولي الأمر.</p>}
      {attendanceSummary?.overall && <section className="rounded-2xl border border-amber-500/30 bg-slate-900 p-5">
        <p className="text-sm font-semibold text-slate-300">متوسط حضور الأبناء</p>
        <p className="mt-2 text-3xl font-extrabold text-amber-300">{formatAttendancePercentage(attendanceSummary.overall.percentage)}</p>
        <p className="mt-1 text-xs text-slate-400">{formatAttendanceCount(attendanceSummary.overall)} · يُستبعد العذر ويُحسب التأخير حضوراً.</p>
      </section>}
      <div className="space-y-4">{children.map(({ student, latestConfession, attendance }) => {
        const studentAttendance = summaryByStudent.get(student.id);
        return (
        <article key={student.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="min-w-0 break-words font-bold text-lg text-white">{student.name}</h2>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300">الحضور {formatAttendancePercentage(studentAttendance?.percentage)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{formatAttendanceCount(studentAttendance)}</p>
          <p className="text-sm text-slate-300 mt-3">آخر اعتراف: <span className="text-amber-300">{latestConfession?.date ? new Date(latestConfession.date).toLocaleDateString('ar-EG') : 'لا يوجد سجل'}</span></p>
          <h3 className="text-sm font-semibold text-slate-300 mt-4 mb-2">آخر سجلات الحضور</h3>
          <div className="flex flex-wrap gap-2">{attendance.map((item, index) => (
            <span key={`${item.date}-${index}`} className="px-3 py-1.5 rounded-full bg-slate-800 text-xs text-slate-300">{new Date(item.date).toLocaleDateString('ar-EG')} · {({ present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر' })[item.status] || item.status}</span>
          ))}{attendance.length === 0 && <span className="text-xs text-slate-500">لا توجد سجلات حضور.</span>}</div>
        </article>
      )})}</div>
    </div>
  );
}
