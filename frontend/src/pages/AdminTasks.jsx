import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import GradeScopeFields from '../components/GradeScopeFields';

export default function AdminTasks({ showToast }) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskAudiences, setTaskAudiences] = useState({});
  const [savingScopeId, setSavingScopeId] = useState('');
  const [selected, setSelected] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assignToGroup, setAssignToGroup] = useState(true);
  const [audience, setAudience] = useState({ grade: '', meetingGroup: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try {
      const [studentData, taskData] = await Promise.all([api.students(), api.tasks()]);
      setStudents(studentData);
      setTasks(taskData);
      setTaskAudiences(Object.fromEntries(taskData.filter((task) => task.assignToGroup).map((task) => [task._id, {
        grade: task.grade || '',
        meetingGroup: String(task.meetingGroup?._id || task.meetingGroup || ''),
      }])));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.createTasks({ title, description, dueAt: dueAt || undefined, assignToGroup, studentIds: assignToGroup ? [] : selected, ...audience });
      setTitle('');
      setDescription('');
      setDueAt('');
      setSelected([]);
      setAssignToGroup(true);
      setAudience({ grade: '', meetingGroup: '' });
      await load();
      showToast('تم إسناد المهمة وحفظها');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const saveTaskAudience = async (task) => {
    setError('');
    setSavingScopeId(task._id);
    try {
      await api.updateTaskAudience(task._id, taskAudiences[task._id] || {});
      await load();
      showToast('تم تحديث مرحلة المهمة واجتماعها.');
    } catch (requestError) { setError(requestError.message); }
    finally { setSavingScopeId(''); }
  };

  const deleteTask = async (task) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف المهمة "${task.title}" نهائياً؟`);
    if (!confirmed) return;
    setError('');
    try {
      await api.deleteTask(task._id);
      await load();
      showToast('تم حذف المهمة بنجاح.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="max-w-3xl mx-auto space-y-5" dir="rtl">
      <div><h1 className="text-2xl font-bold text-white">توزيع المهام الروحية</h1><p className="text-sm text-slate-400 mt-1">اختر الطلاب الذين ستُسند إليهم المهمة.</p></div>
      <form onSubmit={submit} className="bg-slate-900 border border-slate-800 p-5 md:p-6 rounded-2xl space-y-4">
        <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المهمة" className="w-full p-3 bg-slate-800 rounded-xl text-sm text-white border border-slate-700" />
        <textarea maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="التفاصيل (اختياري)" className="w-full p-3 bg-slate-800 rounded-xl text-sm text-white border border-slate-700 min-h-24" />
        <GradeScopeFields user={user} grade={audience.grade} meetingGroup={audience.meetingGroup} onChange={(key, value) => setAudience((current) => ({ ...current, [key]: value, ...(key === 'grade' ? { meetingGroup: '' } : {}) }))} idPrefix="task-audience" />
        <label className="block text-sm text-slate-300">موعد التسليم
          <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="block mt-1 w-full sm:w-auto p-2 bg-slate-800 rounded-xl border border-slate-700 text-white" />
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-slate-200">
          <input type="checkbox" checked={assignToGroup} onChange={(event) => { setAssignToGroup(event.target.checked); setSelected([]); }} className="mt-1 accent-amber-400" />
          <span><strong className="block text-amber-200">Assign to my whole group</strong><span className="mt-1 block text-xs leading-5 text-slate-400">Students added to your group later will also see this task.</span></span>
        </label>
        {!assignToGroup && <fieldset className="space-y-2"><legend className="text-sm text-slate-300">الطلاب</legend>
          {students.length === 0 && <p className="text-xs text-slate-500">لا يوجد طلاب ضمن المجموعة.</p>}
          <div className="grid sm:grid-cols-2 gap-2">{students.map((student) => (
            <label key={student.id} className="flex items-center gap-2 bg-slate-800/70 p-3 rounded-xl text-sm text-white">
              <input type="checkbox" checked={selected.includes(student.id)} disabled={!selected.includes(student.id) && selected.length >= 200} onChange={() => toggle(student.id)} />{student.name}
            </label>
          ))}</div>
        </fieldset>}
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button disabled={saving || (!assignToGroup && !selected.length)} className="px-5 py-3 bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm">{saving ? 'جارٍ الإسناد...' : assignToGroup ? 'إسناد للمجموعة كلها' : `إسناد المهمة (${selected.length})`}</button>
      </form>
      <section className="space-y-3">
        <h2 className="font-bold text-white">متابعة تسليمات الطلاب</h2>
        {tasks.map((task) => <article key={task._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h3 className="font-bold text-amber-300">{task.title}</h3><p className="mt-1 text-xs text-slate-400">{task.assignToGroup ? 'مهمة للمجموعة كلها' : `الطالب: ${task.student?.name || '—'}`}</p></div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${task.completedAt || task.completions?.length ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{task.assignToGroup ? (task.completions?.length ? 'وصلت تسليمات' : 'بانتظار التسليم') : task.completedAt ? 'تم التسليم' : 'بانتظار التسليم'}</span>
              <button type="button" onClick={() => void deleteTask(task)} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20" title="حذف المهمة">حذف</button>
            </div>
          </div>
          {task.assignToGroup && !task.audienceMode && <p role="status" className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100">مهمة قديمة بلا نطاق مرحلة محفوظ؛ هي مخفية عن الطلاب حتى يحفظ الأدمن نطاقها أدناه.</p>}
          {task.assignToGroup && <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
            <p className="text-xs font-semibold text-slate-400">نطاق ظهور المهمة للمخدومين</p>
            <GradeScopeFields user={user} grade={taskAudiences[task._id]?.grade || ''} meetingGroup={taskAudiences[task._id]?.meetingGroup || ''} onChange={(key, value) => setTaskAudiences((current) => ({ ...current, [task._id]: { ...current[task._id], [key]: value, ...(key === 'grade' ? { meetingGroup: '' } : {}) } }))} idPrefix={`task-scope-${task._id}`} />
            <button type="button" disabled={savingScopeId === task._id} onClick={() => void saveTaskAudience(task)} className="min-h-9 rounded-lg border border-amber-400/30 px-3 text-xs font-bold text-amber-200 disabled:opacity-50">{savingScopeId === task._id ? 'جارٍ الحفظ...' : 'حفظ نطاق المهمة'}</button>
          </div>}
          {task.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{task.description}</p>}
          {task.dueAt && <p className="mt-2 text-xs text-slate-400">موعد التسليم: {new Date(task.dueAt).toLocaleDateString('ar-EG')}</p>}
          {task.completionNote && <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-200">ملاحظة التسليم: {task.completionNote}</p>}
          {task.assignToGroup && <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-400">تسليمات الطلاب: {task.completions?.length || 0}</p>
            {task.completions?.map((completion) => <div key={completion._id || `${task._id}-${completion.student?._id || completion.student}`} className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-200">{completion.student?.name || 'طالب'}</p>
                <p className="text-xs text-slate-500">{completion.completedAt ? new Date(completion.completedAt).toLocaleDateString('ar-EG') : ''}</p>
              </div>
              {completion.completionNote && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-100">ملاحظة التسليم: {completion.completionNote}</p>}
            </div>)}
          </div>}
        </article>)}
        {!tasks.length && !error && <p className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">لا توجد مهام مسندة حتى الآن.</p>}
      </section>
    </div>
  );
}
