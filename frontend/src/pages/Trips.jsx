import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { Trash2 } from 'lucide-react';
import PostMedia from '../components/PostMedia';
import { api } from '../services/api';
import { uploadMediaFile } from '../utils/uploadMediaFile';
import { isAdminRole } from '../data/grades';
import GradeScopeFields from '../components/GradeScopeFields';

const money = (value) => `${Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م`;
const tripIdFor = (value) => (typeof value === 'object' && value ? value._id : value) || '';

export default function Trips({ showToast }) {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const isStudent = user?.role === 'student';
  const [trips, setTrips] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [students, setStudents] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventAt, setEventAt] = useState('');
  const [feeAmount, setFeeAmount] = useState('0');
  const [assignToGroup, setAssignToGroup] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [editingTripId, setEditingTripId] = useState('');
  const [editDraft, setEditDraft] = useState(null);
  const [editAudienceNeedsReview, setEditAudienceNeedsReview] = useState(false);
  const [editAudienceReviewed, setEditAudienceReviewed] = useState(false);
  const [editFile, setEditFile] = useState(null);
  const [editStudentQuery, setEditStudentQuery] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [audience, setAudience] = useState({ grade: '', meetingGroup: '' });
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [deletingRegistrationId, setDeletingRegistrationId] = useState('');
  const [deletingTripId, setDeletingTripId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [postData, registrationData, studentData] = await Promise.all([
        api.posts('trip'), api.tripRegistrations(), isAdmin ? api.students() : Promise.resolve([]),
      ]);
      setTrips(postData);
      setRegistrations(registrationData);
      setStudents(studentData);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  const registrationByTrip = useMemo(() => new Set(registrations.map((item) => tripIdFor(item.trip))), [registrations]);
  const totalDue = registrations.reduce((sum, item) => sum + Number(item.amountDue || 0), 0);
  const totalPaid = registrations.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);

  const createTrip = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const mediaUrl = file ? await uploadMediaFile(file) : '';
      const mediaKind = file
        ? file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
        : 'link';
      await api.createPost({
        type: 'trip', title: title.trim(), body: body.trim(), feeAmount: Number(feeAmount || 0),
        eventAt: eventAt ? new Date(`${eventAt}T12:00:00`).toISOString() : undefined,
        mediaUrl, mediaKind,
        assignToGroup,
        studentIds: assignToGroup ? [] : selectedStudents,
        ...audience,
      });
      setTitle('');
      setBody('');
      setEventAt('');
      setFeeAmount('0');
      setFile(null);
      setAssignToGroup(true);
      setSelectedStudents([]);
      setAudience({ grade: '', meetingGroup: '' });
      setStudentQuery('');
      await load();
      showToast('تم نشر الرحلة');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const register = async (trip) => {
    setSaving(true);
    setError('');
    try {
      await api.registerForTrip(trip._id);
      await load();
      showToast('تم إرسال طلب التسجيل للرحلة');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async (registration) => {
    setError('');
    try {
      await api.updateTripPayment(registration._id, Number(paymentDrafts[registration._id] ?? registration.amountPaid));
      await load();
      showToast('تم تحديث المبلغ المدفوع');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteRegistration = async (registration) => {
    const studentName = registration.student?.name || 'الطالب';
    const tripTitle = registration.trip?.title || 'الرحلة';
    const paid = Number(registration.amountPaid || 0);
    const paymentNote = paid > 0
      ? ` وسيتم حذف المبلغ المسجل كمدفوع (${money(paid)}) أيضًا.`
      : '';
    if (!window.confirm(`هل تريد حذف طلب ${studentName} في ${tripTitle}؟${paymentNote}`)) return;

    setError('');
    setDeletingRegistrationId(registration._id);
    try {
      await api.deleteTripRegistration(registration._id);
      await load();
      showToast('تم حذف طلب تسجيل الرحلة');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingRegistrationId('');
    }
  };

  const deleteTrip = async (trip) => {
    const tripRegistrations = registrations.filter((item) => tripIdFor(item.trip) === trip._id);
    const registeredPayments = tripRegistrations.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
    const registrationNote = tripRegistrations.length
      ? ` وسيتم حذف ${tripRegistrations.length} طلب تسجيل والمبالغ المسجلة لها (${money(registeredPayments)}).`
      : '';
    if (!window.confirm(`هل تريد حذف رحلة "${trip.title}" نهائيًا؟${registrationNote}`)) return;

    setError('');
    setDeletingTripId(trip._id);
    try {
      await api.deletePost(trip._id);
      if (editingTripId === trip._id) {
        setEditingTripId('');
        setEditDraft(null);
        setEditFile(null);
        setEditAudienceNeedsReview(false);
        setEditAudienceReviewed(false);
      }
      await load();
      showToast('تم حذف الرحلة');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingTripId('');
    }
  };

  const startEditing = (trip) => {
    setEditingTripId(trip._id);
    setEditAudienceNeedsReview(!trip.audienceMode);
    setEditAudienceReviewed(false);
    setEditDraft({
      title: trip.title || '',
      body: trip.body || '',
      eventAt: trip.eventAt ? new Date(trip.eventAt).toISOString().slice(0, 10) : '',
      feeAmount: String(trip.feeAmount ?? 0),
      assignToGroup: trip.assignToGroup !== false,
      published: trip.published !== false,
      grade: trip.grade || '',
      meetingGroup: String(trip.meetingGroup?._id || trip.meetingGroup || ''),
      studentIds: Array.isArray(trip.assignedStudents) ? trip.assignedStudents.map((id) => String(id?._id || id)) : [],
    });
    setEditFile(null);
    setEditStudentQuery('');
  };

  const saveTrip = async (event) => {
    event.preventDefault();
    if (!editingTripId || !editDraft) return;
    setEditSaving(true);
    setError('');
    try {
      if (editAudienceNeedsReview && !editAudienceReviewed) {
        throw new Error('يُرجى مراجعة نطاق المرحلة لهذه الرحلة القديمة وتأكيده قبل الحفظ.');
      }
      const mediaUrl = editFile ? await uploadMediaFile(editFile) : undefined;
      const mediaKind = editFile
        ? editFile.type === 'application/pdf' || editFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
        : undefined;
      const originalTrip = trips.find((trip) => trip._id === editingTripId);
      const tripPayload = {
        title: editDraft.title.trim(),
        body: editDraft.body.trim(),
        eventAt: editDraft.eventAt ? new Date(`${editDraft.eventAt}T12:00:00`).toISOString() : null,
        feeAmount: Number(editDraft.feeAmount || 0),
        assignToGroup: editDraft.assignToGroup,
        published: editDraft.published,
        studentIds: editDraft.assignToGroup ? [] : editDraft.studentIds,
        ...(mediaUrl ? { mediaUrl, mediaKind } : {}),
      };
      const originalGrade = originalTrip?.grade || '';
      const originalMeetingGroup = String(originalTrip?.meetingGroup?._id || originalTrip?.meetingGroup || '');
      if (editDraft.grade !== originalGrade || editDraft.meetingGroup !== originalMeetingGroup || (editAudienceNeedsReview && editAudienceReviewed)) {
        tripPayload.grade = editDraft.grade;
        tripPayload.meetingGroup = editDraft.meetingGroup;
      }
      await api.updatePost(editingTripId, tripPayload);
      setEditingTripId('');
      setEditDraft(null);
      setEditFile(null);
      setEditAudienceNeedsReview(false);
      setEditAudienceReviewed(false);
      await load();
      showToast('تم تحديث بيانات الرحلة');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setEditSaving(false);
    }
  };

  const toggleEditStudent = (id) => setEditDraft((current) => ({
    ...current,
    studentIds: current.studentIds.includes(id)
      ? current.studentIds.filter((item) => item !== id)
      : current.studentIds.length < 200 ? [...current.studentIds, id] : current.studentIds,
  }));

  const eventLabel = (value) => value ? new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : 'الموعد يحدد لاحقاً';

  const toggleStudent = (id) => setSelectedStudents((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : current.length < 200 ? [...current, id] : current);
  const matchingStudents = students.filter((student) => student.name?.toLocaleLowerCase('ar').includes(studentQuery.trim().toLocaleLowerCase('ar')));
  const matchingEditStudents = students.filter((student) => student.name?.toLocaleLowerCase('ar').includes(editStudentQuery.trim().toLocaleLowerCase('ar')));

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-extrabold text-white">{isAdmin ? 'الرحلات والتحصيل' : 'الرحلات'}</h1>
        <p className="mt-1 text-sm text-slate-400">{isAdmin ? 'أنشئ رحلة وتابع طلبات الطلاب والمبالغ المحصلة.' : 'استعرض الرحلات المتاحة وتابع طلبات التسجيل.'}</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p>}

      {isAdmin && <form onSubmit={createTrip} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <GradeScopeFields user={user} grade={audience.grade} meetingGroup={audience.meetingGroup} onChange={(key, value) => setAudience((current) => ({ ...current, [key]: value, ...(key === 'grade' ? { meetingGroup: '' } : {}) }))} idPrefix="trip-audience" />
        <h2 className="font-bold text-amber-300">إضافة رحلة</h2>
        <input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="اسم الرحلة" className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-white" />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="التفاصيل ومكان التجمع" className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-white" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-300">الموعد<input type="date" value={eventAt} onChange={(event) => setEventAt(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white" /></label>
          <label className="text-sm text-slate-300">رسوم الطالب (ج.م)<input required type="number" min="0" max="1000000" step="0.01" value={feeAmount} onChange={(event) => setFeeAmount(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white" /></label>
          <label className="text-sm text-slate-300 sm:col-span-2">مرفق اختياري من الجهاز (صورة أو PDF، حتى 5 ميجابايت)
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-sm text-white" />
          </label>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-slate-200">
          <input type="checkbox" checked={assignToGroup} onChange={(event) => { setAssignToGroup(event.target.checked); setSelectedStudents([]); }} className="mt-1 accent-amber-400" />
          <span><strong className="block text-amber-200">إتاحة الرحلة لجميع الطلاب</strong><span className="mt-1 block text-xs leading-5 text-slate-400">أو ألغِ الخيار لتحديد طلاب معينين.</span></span>
        </label>
        {!assignToGroup && <fieldset className="space-y-2 rounded-xl border border-slate-800 p-3">
          <legend className="px-1 text-sm font-semibold text-slate-300">اختر الطلاب ({selectedStudents.length}/200)</legend>
          <input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="ابحث باسم الطالب" className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white" />
          <div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
            {matchingStudents.map((student) => <label key={student.id} className="flex items-center gap-2 rounded-lg bg-slate-800/70 p-2.5 text-sm text-white">
              <input type="checkbox" checked={selectedStudents.includes(student.id)} disabled={!selectedStudents.includes(student.id) && selectedStudents.length >= 200} onChange={() => toggleStudent(student.id)} />{student.name}
            </label>)}
            {!matchingStudents.length && <p className="text-xs text-slate-500">لا يوجد طلاب مطابقون.</p>}
          </div>
        </fieldset>}
        {file && <p className="text-xs text-amber-300">{file.name}</p>}
        <button disabled={saving || (!assignToGroup && !selectedStudents.length)} className="min-h-11 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-slate-950 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'نشر الرحلة'}</button>
      </form>}

      {isAdmin && <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-400">طلبات التسجيل</p><p className="mt-1 text-xl font-extrabold text-white">{registrations.length}</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-400">إجمالي المستحق</p><p className="mt-1 text-xl font-extrabold text-white">{money(totalDue)}</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs text-slate-400">المحصل · المتبقي</p><p className="mt-1 text-xl font-extrabold text-emerald-300">{money(totalPaid)} · {money(totalDue - totalPaid)}</p></div>
      </section>}

      <section className="space-y-3">
        <h2 className="font-bold text-white">الرحلات المعلنة</h2>
        {loading ? <p className="text-sm text-slate-400">جارٍ تحميل الرحلات...</p> : trips.length ? trips.map((trip) => {
          const registered = registrationByTrip.has(trip._id);
          const tripRegistrationCount = isAdmin
            ? registrations.filter((item) => tripIdFor(item.trip) === trip._id).length
            : 0;
          return <article key={trip._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><h3 className="font-bold text-amber-300">{trip.title}</h3>{!trip.audienceMode && <p role="status" className="mt-1 text-xs text-amber-200">رحلة قديمة بلا نطاق مرحلة؛ مخفية عن الطلاب حتى مراجعتها.</p>}<p className="mt-1 text-xs text-slate-400">{eventLabel(trip.eventAt)} · الرسوم: {money(trip.feeAmount)}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{trip.body}</p><PostMedia mediaUrl={trip.mediaUrl} mediaKind={trip.mediaKind} title={trip.title} /></div>
              {isStudent && <button disabled={saving || registered} onClick={() => register(trip)} className="min-h-11 shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-default disabled:opacity-50">{registered ? 'تم التسجيل' : 'سجل في الرحلة'}</button>}
              {isAdmin && <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => editingTripId === trip._id ? (setEditingTripId(''), setEditDraft(null), setEditFile(null), setEditAudienceNeedsReview(false), setEditAudienceReviewed(false)) : startEditing(trip)} className="min-h-11 rounded-xl border border-amber-400/40 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-400/10">
                  {editingTripId === trip._id ? 'إلغاء التعديل' : 'تعديل الرحلة'}
                </button>
                <button
                  type="button"
                  disabled={deletingTripId === trip._id}
                  onClick={() => void deleteTrip(trip)}
                  aria-label={`حذف رحلة ${trip.title}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-500/30 px-4 py-2 text-sm font-bold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  {deletingTripId === trip._id ? 'جارٍ الحذف...' : 'حذف الرحلة'}
                  {tripRegistrationCount > 0 && <span className="text-xs">({tripRegistrationCount})</span>}
                </button>
              </div>}
            </div>
            {isAdmin && editingTripId === trip._id && editDraft && <form onSubmit={saveTrip} className="mt-5 space-y-4 border-t border-slate-800 pt-5">
              <GradeScopeFields user={user} grade={editDraft.grade} meetingGroup={editDraft.meetingGroup} onChange={(key, value) => setEditDraft((current) => ({ ...current, [key]: value, ...(key === 'grade' ? { meetingGroup: '' } : {}) }))} idPrefix={`trip-edit-${trip._id}`} />
              {editAudienceNeedsReview && <label className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm leading-6 text-amber-100">
                <input type="checkbox" checked={editAudienceReviewed} onChange={(event) => setEditAudienceReviewed(event.target.checked)} className="mt-1 accent-amber-400" />
                <span>هذه رحلة قديمة بلا نطاق مرحلة محفوظ. راجع المرحلة والاجتماع أعلاه، ثم أكد النطاق قبل حفظها. اختيار كل المراحل يجعلها مشتركة.</span>
              </label>}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-300">اسم الرحلة
                  <input required maxLength={200} value={editDraft.title} onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">الموعد
                  <input type="date" value={editDraft.eventAt} onChange={(event) => setEditDraft((current) => ({ ...current, eventAt: event.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">رسوم الطالب (ج.م)
                  <input required type="number" min="0" max="1000000" step="0.01" value={editDraft.feeAmount} onChange={(event) => setEditDraft((current) => ({ ...current, feeAmount: event.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300 sm:col-span-2">التفاصيل ومكان التجمع
                  <textarea maxLength={20000} value={editDraft.body} onChange={(event) => setEditDraft((current) => ({ ...current, body: event.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white" />
                </label>
                <label className="text-sm text-slate-300 sm:col-span-2">استبدال المرفق بصورة أو PDF
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.pdf" onChange={(event) => setEditFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-sm text-white" />
                </label>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-slate-200">
                <input type="checkbox" checked={editDraft.assignToGroup} onChange={(event) => setEditDraft((current) => ({ ...current, assignToGroup: event.target.checked, studentIds: [] }))} className="mt-1 accent-amber-400" />
                <span><strong className="block text-amber-200">إتاحة الرحلة لجميع الطلاب</strong><span className="mt-1 block text-xs leading-5 text-slate-400">أو ألغِ الخيار لتحديد طلاب معينين.</span></span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editDraft.published} onChange={(event) => setEditDraft((current) => ({ ...current, published: event.target.checked }))} className="accent-amber-400" />نشر الرحلة وإتاحتها للتسجيل</label>
              {!editDraft.assignToGroup && <fieldset className="space-y-2 rounded-xl border border-slate-800 p-3">
                <legend className="px-1 text-sm font-semibold text-slate-300">اختر الطلاب ({editDraft.studentIds.length}/200)</legend>
                <input value={editStudentQuery} onChange={(event) => setEditStudentQuery(event.target.value)} placeholder="ابحث باسم الطالب" className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white" />
                <div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
                  {matchingEditStudents.map((student) => <label key={student.id} className="flex items-center gap-2 rounded-lg bg-slate-800/70 p-2.5 text-sm text-white">
                    <input type="checkbox" checked={editDraft.studentIds.includes(student.id)} disabled={!editDraft.studentIds.includes(student.id) && editDraft.studentIds.length >= 200} onChange={() => toggleEditStudent(student.id)} />{student.name}
                  </label>)}
                  {!matchingEditStudents.length && <p className="text-xs text-slate-500">لا يوجد طلاب مطابقون.</p>}
                </div>
              </fieldset>}
              <div className="flex flex-wrap gap-2">
                <button disabled={editSaving || (!editDraft.assignToGroup && !editDraft.studentIds.length)} className="min-h-10 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{editSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button>
                {editFile && <span className="self-center text-xs text-amber-300">{editFile.name}</span>}
              </div>
            </form>}
          </article>;
        }) : <p className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">لا توجد رحلات معلنة حالياً.</p>}
      </section>

      {registrations.length > 0 && <section className="space-y-3">
        <h2 className="font-bold text-white">{isAdmin ? 'طلبات الطلاب والتحصيل' : 'تسجيلات الأبناء'}</h2>
        {registrations.map((registration) => {
          const studentName = registration.student?.name || 'الطالب';
          const due = Number(registration.amountDue || 0);
          const paid = Number(registration.amountPaid || 0);
          return <article key={registration._id} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0"><h3 className="break-words font-bold text-white">{registration.student?.name || 'طالب'} · {registration.trip?.title || 'رحلة'}</h3><p className="mt-1 text-sm text-slate-400">{registration.student?.phone || '—'} · المستحق: {money(due)} · المدفوع: {money(paid)} · المتبقي: {money(due - paid)}</p></div>
            {isAdmin && <div className="flex flex-wrap gap-2">
              <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); savePayment(registration); }}>
                <input aria-label="المبلغ المدفوع" type="number" min="0" max={due} step="0.01" value={paymentDrafts[registration._id] ?? paid} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [registration._id]: event.target.value }))} className="min-h-10 w-32 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white" />
                <button className="min-h-10 rounded-lg border border-amber-400/40 px-3 text-sm font-bold text-amber-200">حفظ التحصيل</button>
              </form>
              <button
                type="button"
                disabled={deletingRegistrationId === registration._id}
                onClick={() => void deleteRegistration(registration)}
                aria-label={`حذف طلب ${studentName}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-500/30 px-3 text-sm font-bold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {deletingRegistrationId === registration._id ? 'جارٍ الحذف...' : 'حذف الطلب'}
              </button>
            </div>}
          </article>;
        })}
      </section>}
    </div>
  );
}
