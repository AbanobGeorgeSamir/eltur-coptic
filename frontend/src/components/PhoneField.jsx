const countries = [
  ['مصر', '+20'], ['السعودية', '+966'], ['الإمارات', '+971'], ['الأردن', '+962'],
  ['لبنان', '+961'], ['الكويت', '+965'], ['قطر', '+974'], ['البحرين', '+973'],
  ['عُمان', '+968'], ['المملكة المتحدة', '+44'], ['الولايات المتحدة', '+1'],
  ['كندا', '+1'], ['أستراليا', '+61'], ['الهند', '+91'],
];

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

export default function PhoneField({ value, onChange, label, required = false }) {
  const normalized = String(value || '');
  const country = [...countries].sort((a, b) => b[1].length - a[1].length)
    .find(([, code]) => normalized.startsWith(code)) || countries[0];
  const [, countryCode] = country;
  const maxLocalDigits = 15 - digitsOnly(countryCode).length;
  let localNumber = normalized.startsWith(countryCode) ? normalized.slice(countryCode.length) : normalized;
  localNumber = digitsOnly(localNumber).replace(/^0+/, '');

  const changeLocalNumber = (raw) => {
    let local = digitsOnly(raw);
    if (local.startsWith(digitsOnly(countryCode))) local = local.slice(digitsOnly(countryCode).length);
    local = local.replace(/^0+/, '');
    onChange(local ? `${countryCode}${local}` : '');
  };

  return (
    <label className="block text-sm text-slate-300">{label}
      <div className="mt-1.5 flex gap-2">
        <select aria-label={`مفتاح الدولة: ${label}`} value={countryCode}
          onChange={(event) => onChange(localNumber ? `${event.target.value}${localNumber}` : '')}
          className="max-w-[45%] rounded-xl border border-slate-700 bg-slate-800 p-3 text-white">
          {countries.map(([name, code], index) => <option key={`${name}-${index}`} value={code}>{name} {code}</option>)}
        </select>
        <input required={required} type="tel" inputMode="numeric" autoComplete="tel-national" dir="ltr"
          value={localNumber} onChange={(event) => changeLocalNumber(event.target.value)}
          minLength={7} maxLength={maxLocalDigits} pattern={`[0-9]{7,${maxLocalDigits}}`} title="أدخل رقم الهاتف من دون صفر البداية أو مفتاح الدولة"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-left text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
      </div>
    </label>
  );
}
