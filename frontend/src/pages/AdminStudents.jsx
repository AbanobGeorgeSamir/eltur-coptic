import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, RotateCcw, Search, GraduationCap, Building2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import { grades, gradeLabel, isGradeAdminRole } from '../data/grades';
import { ACADEMIC_YEARS, COLLEGES } from '../data/expatriatesData';
import StudentStudyDetailsFields from '../components/StudentStudyDetailsFields';
import { EGYPT_GOVERNORATES, EGYPT_PLACES_BY_GOVERNORATE, EGYPT_COUNTRY_NAME, isHigherEducationGrade } from '../data/residenceOptions';
import { collegeChoiceFor } from '../utils/studyDetails';

export default function AdminStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [pendingParents, setPendingParents] = useState([]);
  const [approvingParent, setApprovingParent] = useState('');
  const [assigningId, setAssigningId] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterGovernorate, setFilterGovernorate] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState(null);
  const [savingId, setSavingId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [assignedStudents, unassignedStudents, parents] = await Promise.all([
        api.students(),
        api.unassignedStudents(),
        api.pendingParents(),
      ]);
      setStudents([...new Map([...unassignedStudents, ...assignedStudents].map((student) => [student.id, student])).values()]);
      setPendingParents(parents);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);

  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load, refresh]);

  const visibleStudents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ar');
    return students.filter((student) => {
      if (filterGrade && student.grade !== filterGrade) return false;
      if (filterAcademicYear && student.academicYear !== filterAcademicYear) return false;
      if (filterCollege && student.college !== filterCollege) return false;
      if (filterGovernorate && student.governorate !== filterGovernorate) return false;
      if (filterCity && student.city !== filterCity) return false;
      if (!normalized) return true;
      return [student.name, student.email, student.phone, student.whatsappNumber, student.academicYear, student.college, student.governorate, student.city]
        .some((value) => String(value || '').toLocaleLowerCase('ar').includes(normalized));
    });
  }, [students, query, filterGrade, filterAcademicYear, filterCollege, filterGovernorate, filterCity]);

  const filterAcademicYearOptions = ACADEMIC_YEARS;
  const filterCollegeOptions = useMemo(() => [...new Set([...COLLEGES.filter((college) => college !== 'أخرى'), ...students.map((student) => student.college).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'ar')), [students]);
  const filterGovernorateOptions = [...new Set([...EGYPT_GOVERNORATES, ...students.map((student) => student.governorate).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'ar'));
  const filterCityOptions = [...new Set([...(EGYPT_PLACES_BY_GOVERNORATE[filterGovernorate] || Object.values(EGYPT_PLACES_BY_GOVERNORATE).flat()), ...students.map((student) => student.city).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'ar'));

  const pendingCount = visibleStudents.filter((student) => !student.assignedAdmin).length;
  const hasActiveFilters = Boolean(filterGrade || filterAcademicYear || filterCollege || filterGovernorate || filterCity || query);

  const resetFilters = () => {
    setFilterGrade('');
    setFilterAcademicYear('');
    setFilterCollege('');
    setFilterGovernorate('');
    setFilterCity('');
    setQuery('');
  };

  const assign = async (id, meetingGroup) => {
    setError('');
    setNotice('');
    setAssigningId(id);
    try {
      await api.assignStudent(id, meetingGroup);
      setNotice(meetingGroup ? 'تم ضم الطالب إلى المجموعة.' : 'تم قبول طلب الطالب.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAssigningId('');
    }
  };

  const reject = async (student) => {
    const confirmed = window.confirm(`هل تريد رفض تسجيل ${student.name || 'هذا الطالب'}؟ سيُحذف الحساب وسجلاته المرتبطة نهائيًا.`);
    if (!confirmed) return;
    setError('');
    setNotice('');
    setRejectingId(student.id);
    try {
      await api.rejectStudent(student.id);
      setNotice('تم رفض تسجيل الطالب وحذف الحساب وسجلاته المرتبطة.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRejectingId('');
    }
  };

  const deleteStudent = async (student) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف حساب الطالب "${student.name || 'هذا الطالب'}" وجميع سجلاته نهائياً؟`);
    if (!confirmed) return;
    setError('');
    setNotice('');
    try {
      await api.deleteStudent(student.id);
      setNotice('تم حذف حساب الطالب وجميع سجلاته بنجاح.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const approveParent = async (parentId, studentId) => {
    setError('');
    setApprovingParent(`${parentId}:${studentId}`);
    try {
      await api.approveParent(parentId, studentId);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setApprovingParent('');
    }
  };

  const edit = (student) => {
    setEditingId(student.id);
    setDraft({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      interests: student.interests || '',
      fatherName: student.fatherName || '',
      confessionFather: student.confessionFather || '',
      guardianPhone: student.guardianPhone || '',
      address: student.address || '',
      birthDate: student.birthDate ? new Date(student.birthDate).toISOString().slice(0, 10) : '',
      gender: student.gender || 'male',
      nationalId: student.nationalId || '',
      whatsappNumber: student.whatsappNumber || '',
      isDeacon: Boolean(student.isDeacon),
      grade: student.grade || '',
      academicYear: ACADEMIC_YEARS.includes(student.academicYear) ? student.academicYear : '',
      college: student.college || '',
      collegeChoice: collegeChoiceFor(student.college || ''),
      governorate: student.governorate || '',
      city: student.city || '',
      meetingGroup: student.meetingGroup || '',
    });
  };

  const updateDraft = (key, value) => setDraft((current) => ({
    ...current,
    [key]: value,
    ...(key === 'grade' ? { meetingGroup: '', ...(!isHigherEducationGrade(value) ? { academicYear: '', college: '', collegeChoice: '', governorate: '', city: '' } : {}) } : {}),
    ...(key === 'governorate' ? { city: '' } : {}),
  }));

  const saveStudent = async (event) => {
    event.preventDefault();
    if (!draft || !editingId) return;
    setSavingId(editingId);
    setError('');
    try {
      const originalStudent = students.find((student) => student.id === editingId);
      const studentPayload = {
        ...draft,
        birthDate: draft.birthDate ? new Date(`${draft.birthDate}T12:00:00`).toISOString() : undefined,
        ...(isHigherEducationGrade(draft.grade) ? { country: EGYPT_COUNTRY_NAME } : {}),
      };
      delete studentPayload.collegeChoice;
      if (draft.grade === (originalStudent?.grade || '')
        && draft.meetingGroup === (originalStudent?.meetingGroup || '')) {
        delete studentPayload.grade;
        delete studentPayload.meetingGroup;
      }
      await api.updateStudent(editingId, studentPayload);
      setEditingId('');
      setDraft(null);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الطلاب والمخدومين</h1>
          <p className="text-sm text-slate-400 mt-1">راجع طلبات التسجيل، واستخدم فلاتر المراحل والفرق والكليات للوصول السريع.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300 disabled:opacity-50"
        >
          {loading ? 'جارٍ التحديث…' : 'تحديث القائمة'}
        </button>
      </div>

      {/* Search & Dedicated Filters Section */}
      <section aria-label="فلاتر البحث والفرز" className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <span className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <Filter className="h-4 w-4" /> فلاتر وتصنيف الطلاب
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 transition hover:text-rose-200"
            >
              <RotateCcw className="h-3.5 w-3.5" /> إعادة ضبط الفلاتر
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-semibold text-slate-400">
            بحث عام
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="ابحث بالاسم أو الهاتف..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pr-9 pl-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </label>

          <label className="block text-xs font-semibold text-slate-400">
            المرحلة الدراسية
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="">كل المراحل</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>{grade.label}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5 text-amber-400" /> الفرقة (المغتربين)</span>
            <select
              value={filterAcademicYear}
              onChange={(e) => setFilterAcademicYear(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="">كل الفرق</option>
              {filterAcademicYearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-blue-400" /> الكلية (المغتربين)</span>
            <select
              value={filterCollege}
              onChange={(e) => setFilterCollege(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="">كل الكليات</option>
              {filterCollegeOptions.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-400">
            المحافظة
            <select value={filterGovernorate} onChange={(event) => { setFilterGovernorate(event.target.value); setFilterCity(''); }} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-white focus:border-amber-400 focus:outline-none">
              <option value="">كل المحافظات</option>
              {filterGovernorateOptions.map((governorate) => <option key={governorate} value={governorate}>{governorate}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-400">
            المدينة أو الحي أو المركز
            <select value={filterCity} onChange={(event) => setFilterCity(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-white focus:border-amber-400 focus:outline-none">
              <option value="">كل الأماكن</option>
              {filterCityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
            <span>النتائج المعروضة: <strong className="text-amber-300">{visibleStudents.length}</strong> من أصل {students.length} طالب</span>
            {filterGrade && <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-300">المرحلة: {gradeLabel(filterGrade)}</span>}
            {filterAcademicYear && <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-300">الفرقة: {filterAcademicYear}</span>}
            {filterCollege && <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-blue-300">الكلية: {filterCollege}</span>}
          </div>
        )}
      </section>

      {error && <p role="alert" className="text-sm text-rose-300 bg-rose-950/40 border border-rose-800 p-3 rounded-xl">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-800 p-3 rounded-xl">{notice}</p>}

      {pendingParents.length > 0 && (
        <section aria-labelledby="parent-approval-title" className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4 sm:p-5">
          <div>
            <h2 id="parent-approval-title" className="font-bold text-white">طلبات ربط أولياء الأمور</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">تأكد من هوية ولي الأمر خارج التطبيق قبل منح الوصول إلى بيانات الطالب.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {pendingParents.map((item) => {
              const key = `${item.parentId}:${item.studentId}`;
              return (
                <article key={key} className="rounded-xl border border-white/[0.08] bg-slate-950/70 p-3">
                  <p className="font-semibold text-white">{item.parentName}</p>
                  <p className="mt-1 text-sm text-slate-300" dir="ltr">{item.parentPhone}</p>
                  <p className="mt-2 text-xs text-slate-400">يريد متابعة: <span className="font-semibold text-amber-200">{item.studentName}</span></p>
                  <button
                    type="button"
                    disabled={Boolean(approvingParent)}
                    onClick={() => void approveParent(item.parentId, item.studentId)}
                    className="mt-3 min-h-10 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-wait disabled:opacity-50"
                  >
                    {approvingParent === key ? 'جارٍ الاعتماد...' : 'اعتماد ربط الطالب'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!error && !loading && students.length === 0 && (
        <p className="bg-slate-900 p-5 rounded-2xl text-slate-400 text-center">لا يوجد طلاب مسجلون حاليًا.</p>
      )}

      {!error && !loading && students.length > 0 && visibleStudents.length === 0 && (
        <div className="bg-slate-900 p-6 rounded-2xl text-center space-y-2 border border-slate-800">
          <p className="text-slate-300 font-semibold">لا توجد نتائج مطابقة لمعايير البحث والتصفية المحددة.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-amber-300 underline underline-offset-4 hover:text-amber-200"
          >
            إلغاء الفلاتر وعرض جميع الطلاب
          </button>
        </div>
      )}

      {pendingCount > 0 && (
        <section aria-live="polite" className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-4">
          <h2 className="font-bold text-amber-200">طلبات تسجيل بانتظار قرار الأدمن ({pendingCount})</h2>
          <p className="mt-1 text-sm text-slate-400">اختر مجموعة لضم الطالب إليها، أو ارفض طلب التسجيل.</p>
        </section>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {visibleStudents.map((student) => (
          <article key={student.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <div className="flex items-center gap-3">
                {student.picture ? (
                  <img src={student.picture} alt={`صورة ${student.name}`} loading="lazy" className="h-14 w-14 shrink-0 rounded-full border border-amber-500/20 object-cover" />
                ) : (
                  <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-500/10 text-xl font-bold text-amber-300">
                    {student.name?.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-bold text-white text-base">{student.name}</h2>
                  {student.email && <p className="mt-0.5 break-all text-xs text-slate-400">{student.email}</p>}
                  <p className="mt-1 text-xs font-semibold text-amber-200">
                    {gradeLabel(student.grade)}{student.meetingGroupName ? ` · ${student.meetingGroupName}` : ''}
                  </p>
                  {!student.assignedAdmin && <p className="mt-0.5 text-xs font-medium text-amber-400/80">لم يتم ربطه بمسؤول بعد</p>}
                </div>
              </div>

              {/* Expatriates Information Badges */}
              {(isHigherEducationGrade(student.grade) || student.academicYear || student.college || student.governorate || student.city) && (
                <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80 text-xs">
                  {student.academicYear && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-300">
                      <GraduationCap className="h-3.5 w-3.5" /> الفرقة: {student.academicYear}
                    </span>
                  )}
                  {student.college && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 font-semibold text-blue-300">
                      <Building2 className="h-3.5 w-3.5" /> الكلية: {student.college}
                    </span>
                  )}
                  {student.governorate && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-semibold text-cyan-200">المحافظة: {student.governorate}</span>
                  )}
                  {student.city && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-300">المدينة/المركز: {student.city}</span>
                  )}
                </div>
              )}

              {student.interests && (
                <p className="mt-3 text-sm text-slate-300">
                  <span className="font-semibold text-amber-200/90">اهتمامات الطالب: </span>{student.interests}
                </p>
              )}
              {student.phone && <p className="mt-2 text-sm text-slate-400" dir="ltr">{student.phone}</p>}
              {student.address && <p className="text-xs text-slate-400 mt-1">{student.address}</p>}
              {student.whatsappNumber && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-300">
                  <span>واتساب:</span><span dir="ltr" className="font-mono">{student.whatsappNumber}</span>
                  <a className="hover:underline font-bold" href={`https://wa.me/${student.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">فتح المحادثة</a>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80">
              {!student.assignedAdmin && (
                <PendingStudentActions
                  student={student}
                  user={user}
                  busy={loading || Boolean(assigningId || rejectingId)}
                  assigning={assigningId === student.id}
                  rejecting={rejectingId === student.id}
                  onAssign={(meetingGroup) => void assign(student.id, meetingGroup)}
                  onReject={() => void reject(student)}
                />
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => editingId === student.id ? (setEditingId(''), setDraft(null)) : edit(student)}
                  className="min-h-10 rounded-xl border border-amber-400/40 px-3.5 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-400/10"
                >
                  {editingId === student.id ? 'إلغاء التعديل' : 'تعديل بيانات الطالب'}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteStudent(student)}
                  className="min-h-10 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
                >
                  حذف المستخدم
                </button>
              </div>

              {editingId === student.id && draft && (
                <form onSubmit={saveStudent} className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['name', 'الاسم رباعي', 'text'], ['email', 'البريد الإلكتروني (اختياري)', 'email'],
                      ['phone', 'هاتف الطالب', 'tel'], ['fatherName', 'اسم الأب', 'text'],
                      ['confessionFather', 'أب الاعتراف', 'text'], ['guardianPhone', 'هاتف ولي الأمر', 'tel'],
                      ['whatsappNumber', 'رقم واتساب', 'tel'], ['address', 'العنوان', 'text'],
                      ['nationalId', 'الرقم القومي (14 رقمًا)', 'text'],
                    ].map(([key, label, type]) => (
                      <label key={key} className="block text-xs text-slate-400">{label}
                        <input
                          required={key !== 'whatsappNumber' && key !== 'email'}
                          maxLength={key === 'nationalId' ? 14 : undefined}
                          pattern={key === 'nationalId' ? '[0-9]{14}' : undefined}
                          value={draft[key]}
                          type={type}
                          onChange={(event) => updateDraft(key, event.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white"
                        />
                      </label>
                    ))}
                    <label className="block text-xs text-slate-400 sm:col-span-2">اهتماماتك
                      <textarea
                        maxLength={500}
                        rows={3}
                        value={draft.interests}
                        onChange={(event) => updateDraft('interests', event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white"
                      />
                    </label>
                    <label className="block text-xs text-slate-400">تاريخ الميلاد
                      <input
                        required
                        type="date"
                        value={draft.birthDate}
                        onChange={(event) => updateDraft('birthDate', event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white"
                      />
                    </label>
                    <label className="block text-xs text-slate-400">النوع
                      <select
                        value={draft.gender}
                        onChange={(event) => updateDraft('gender', event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white"
                      >
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </label>
                    <label className="block text-xs text-slate-400">المرحلة الدراسية
                      <select
                        value={draft.grade}
                        disabled={isGradeAdminRole(user?.role)}
                        onChange={(event) => updateDraft('grade', event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white disabled:opacity-60"
                      >
                        {user?.role === 'admin' && <option value="">اختر المرحلة</option>}
                        {grades.filter((item) => !isGradeAdminRole(user?.role) || item.id === user.grade).map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                        {draft.grade === 'primary' && <option value="primary">ابتدائي (حساب سابق)</option>}
                      </select>
                    </label>

                    {isHigherEducationGrade(draft.grade) && (
                      <div className="sm:col-span-2">
                        <StudentStudyDetailsFields value={draft} onChange={updateDraft} />
                      </div>
                    )}

                    <StudentGroupSelector user={user} grade={draft.grade} value={draft.meetingGroup} onChange={(value) => updateDraft('meetingGroup', value)} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={draft.isDeacon} onChange={(event) => updateDraft('isDeacon', event.target.checked)} />شماس
                  </label>
                  <button
                    disabled={savingId === student.id}
                    className="min-h-10 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
                  >
                    {savingId === student.id ? 'جارٍ الحفظ...' : 'حفظ بيانات الطالب'}
                  </button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StudentGroupSelector({ user, grade, value, onChange }) {
  const [groups, setGroups] = useState([]);
  useEffect(() => {
    let active = true;
    if (!grade) { setGroups([]); return () => { active = false; }; }
    api.adminMeetingGroups(grade, true).then((items) => { if (active) setGroups(items); }).catch(() => { if (active) setGroups([]); });
    return () => { active = false; };
  }, [grade]);
  const allowedGroups = isGradeAdminRole(user?.role) && user.meetingGroup
    ? groups.filter((group) => group.id === user.meetingGroup)
    : groups;
  return (
    <label className="block text-xs text-slate-400">مجموعة الاجتماع (اختياري)
      <select
        value={value}
        disabled={isGradeAdminRole(user?.role) && Boolean(user.meetingGroup)}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white disabled:opacity-60"
      >
        <option value="">دون مجموعة محددة</option>
        {allowedGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
      </select>
    </label>
  );
}

function PendingStudentActions({ student, user, busy, assigning, rejecting, onAssign, onReject }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  useEffect(() => {
    let active = true;
    if (!student.grade) { setGroups([]); return () => { active = false; }; }
    api.adminMeetingGroups(student.grade, true).then((items) => { if (active) setGroups(items); }).catch(() => { if (active) setGroups([]); });
    return () => { active = false; };
  }, [student.grade]);
  const meetingGroup = isGradeAdminRole(user?.role) ? user?.meetingGroup || '' : '';
  const allowedGroups = meetingGroup ? groups.filter((group) => group.id === meetingGroup) : groups;
  return (
    <div className="mt-4 space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
      <p className="text-xs font-semibold text-amber-200">طلب تسجيل بحاجة لضم أو رفض</p>
      {allowedGroups.length > 0 && (
        <label className="block text-xs text-slate-300">ضم إلى مجموعة (اختياري)
          <select
            value={selectedGroup}
            disabled={busy}
            onChange={(event) => setSelectedGroup(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs text-white"
          >
            <option value="">ضم دون تحديد مجموعة</option>
            {allowedGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAssign(selectedGroup)}
          className="min-h-10 rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
        >
          {assigning ? 'جارٍ الضم...' : 'قبول وضم الطالب'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="min-h-10 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
        >
          {rejecting ? 'جارٍ الرفض...' : 'رفض طلب التسجيل'}
        </button>
      </div>
    </div>
  );
}
