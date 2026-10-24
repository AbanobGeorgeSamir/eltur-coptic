import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { grades, isGradeAdminRole } from '../data/grades';

const controlClass = 'mt-1.5 block min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white';

export default function GradeScopeFields({ user, grade, meetingGroup, onChange, idPrefix = 'audience' }) {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const selectedGrade = isGradeAdminRole(user?.role) ? user.grade : grade;

  useEffect(() => {
    let active = true;
    if (!selectedGrade) {
      setGroups([]);
      setError('');
      return () => { active = false; };
    }
    api.meetingGroups(selectedGrade)
      .then((items) => {
        if (!active) return;
        const visibleGroups = isGradeAdminRole(user?.role) && user.meetingGroup
          ? items.filter((item) => item.id === user.meetingGroup)
          : items;
        setGroups(visibleGroups);
        setError('');
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [selectedGrade, user?.role, user?.meetingGroup]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {user?.role === 'admin' ? <label htmlFor={`${idPrefix}-grade`} className="block text-sm text-slate-300">
        المرحلة المستهدفة
        <select id={`${idPrefix}-grade`} value={grade} onChange={(event) => onChange('grade', event.target.value)} className={controlClass}>
          <option value="">كل المراحل (محتوى عام)</option>
          {grades.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label> : <div className="text-sm text-slate-300">
        المرحلة
        <p className={`${controlClass} flex items-center`}>{grades.find((item) => item.id === user?.grade)?.label || 'مرحلتك'}</p>
      </div>}
      {selectedGrade && isGradeAdminRole(user?.role) && user.meetingGroup ? <div className="text-sm text-slate-300">
        الاجتماع المعيّن لك
        <p className={`${controlClass} flex items-center`}>{groups[0]?.name || 'اجتماعك المعيّن'}</p>
      </div> : selectedGrade && <label htmlFor={`${idPrefix}-group`} className="block text-sm text-slate-300">
        الاجتماع
        <select id={`${idPrefix}-group`} value={meetingGroup} onChange={(event) => onChange('meetingGroup', event.target.value)} className={controlClass}>
          <option value="">كل اجتماعات المرحلة</option>
          {groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {error && <span role="alert" className="mt-1 block text-xs text-rose-300">{error}</span>}
        {!groups.length && !error && <span className="mt-1 block text-xs text-slate-500">لم تُضف اجتماعات فرعية لهذه المرحلة بعد.</span>}
      </label>}
    </div>
  );
}
