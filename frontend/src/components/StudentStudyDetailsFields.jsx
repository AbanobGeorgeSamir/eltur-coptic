import { academicYears, collegeGroups } from '../data/colleges';
import { countries, EGYPT_COUNTRY_NAME, EGYPT_GOVERNORATES } from '../data/residenceOptions';
import { OTHER_COLLEGE_LABEL, OTHER_COLLEGE_VALUE } from '../utils/studyDetails';

const selectClass = 'mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20';
const labelClass = 'block text-sm font-semibold text-amber-200';

export default function StudentStudyDetailsFields({ value, onChange }) {
  const chooseCollege = (choice) => {
    onChange('collegeChoice', choice);
    onChange('college', choice === OTHER_COLLEGE_VALUE ? '' : choice);
  };

  return (
    <section className="grid animate-fade-in gap-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-4 sm:grid-cols-2 sm:p-5">
      <div className="sm:col-span-2">
        <h2 className="font-bold text-amber-200">بيانات الدراسة والإقامة</h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">اختر بيانات دراستك ومكان إقامتك الحالية.</p>
      </div>

      <label className={labelClass}>
        الفرقة <span aria-hidden="true">*</span>
        <select required value={value.academicYear} onChange={(event) => onChange('academicYear', event.target.value)} className={selectClass}>
          <option value="">اختر</option>
          {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </label>

      <label className={labelClass}>
        الكلية <span aria-hidden="true">*</span>
        <select required value={value.collegeChoice} onChange={(event) => chooseCollege(event.target.value)} className={selectClass}>
          <option value="">اختر</option>
          {collegeGroups.map((group) => {
            const choices = group.colleges.filter((college) => college !== OTHER_COLLEGE_LABEL);
            return choices.length ? (
              <optgroup key={group.label} label={group.label}>
                {choices.map((college) => <option key={college} value={college}>{college}</option>)}
              </optgroup>
            ) : null;
          })}
          <option value={OTHER_COLLEGE_VALUE}>{OTHER_COLLEGE_LABEL}</option>
        </select>
      </label>

      {value.collegeChoice === OTHER_COLLEGE_VALUE && (
        <label className={`${labelClass} sm:col-span-2`}>
          اكتب اسم الكلية <span aria-hidden="true">*</span>
          <input
            required
            maxLength={160}
            autoComplete="organization-title"
            value={value.college}
            onChange={(event) => onChange('college', event.target.value)}
            placeholder="اسم الكلية أو المعهد"
            className={selectClass}
          />
        </label>
      )}

      <label className={labelClass}>
        البلد <span aria-hidden="true">*</span>
        <select required autoComplete="country-name" value={value.country} onChange={(event) => onChange('country', event.target.value)} className={selectClass}>
          <option value="">اختر البلد</option>
          {countries.map((country) => <option key={country.code} value={country.name}>{country.name}</option>)}
        </select>
      </label>

      {value.country === EGYPT_COUNTRY_NAME && (
        <label className={labelClass}>
          المحافظة <span aria-hidden="true">*</span>
          <select required value={value.governorate} onChange={(event) => onChange('governorate', event.target.value)} className={selectClass}>
            <option value="">اختر المحافظة</option>
            {EGYPT_GOVERNORATES.map((governorate) => <option key={governorate} value={governorate}>{governorate}</option>)}
          </select>
        </label>
      )}
    </section>
  );
}
