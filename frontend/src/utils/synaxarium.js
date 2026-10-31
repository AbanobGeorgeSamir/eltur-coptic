const copticMonths = [
  'توت', 'بابه', 'هاتور', 'كيهك', 'طوبة', 'أمشير',
  'برمهات', 'برمودة', 'بشنس', 'بؤونة', 'أبيب', 'مسرى', 'النسيء',
];

const cairoDateFormatter = new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', {
  timeZone: 'Africa/Cairo',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

const numericParts = (formatter, date) => Object.fromEntries(
  formatter.formatToParts(date)
    .filter((part) => part.type !== 'literal' && part.type !== 'era')
    .map(({ type, value }) => [type, Number(value)]),
);

function copticDate(date) {
  const month = date.getUTCMonth() + 1;
  const a = Math.floor((14 - month) / 12);
  const year = date.getUTCFullYear() + 4800 - a;
  const adjustedMonth = month + 12 * a - 3;
  const julianDayNumber = date.getUTCDate()
    + Math.floor((153 * adjustedMonth + 2) / 5)
    + 365 * year
    + Math.floor(year / 4)
    - Math.floor(year / 100)
    + Math.floor(year / 400)
    - 32045;
  const daysSinceEpoch = julianDayNumber - 1825030;
  const copticYear = Math.floor((4 * daysSinceEpoch + 1463) / 1461);
  const firstDayOfYear = 365 * (copticYear - 1) + Math.floor(copticYear / 4);
  const dayOfYear = daysSinceEpoch - firstDayOfYear;

  return {
    year: copticYear,
    month: Math.floor(dayOfYear / 30) + 1,
    day: (dayOfYear % 30) + 1,
  };
}

const formatCopticDate = (year, month, day) => {
  const formattedYear = new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(year);
  return `${new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(day)} ${copticMonths[month - 1]} ${formattedYear} ش`;
};

const relativeDayLabel = (offset) => {
  if (offset === 0) return 'اليوم';
  if (offset === 1) return 'غدًا';
  if (offset === 2) return 'بعد غد';
  return `بعد ${new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(offset)} أيام`;
};

export function getCairoDateLabels(now = new Date()) {
  const today = numericParts(cairoDateFormatter, now);
  const coptic = copticDate(new Date(Date.UTC(today.year, today.month - 1, today.day, 12)));
  const gregorianLabel = new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  const weekday = new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    weekday: 'long',
  }).format(now);

  return {
    copticDate: `${weekday} ${formatCopticDate(coptic.year, coptic.month, coptic.day)}`,
    gregorianDate: `${gregorianLabel} م`,
  };
}

export function getVisibleSynaxariumObservances(observances, expanded) {
  return expanded ? observances : observances.slice(0, 3);
}

export function getUpcomingSynaxariumObservances(now = new Date(), data, lookAheadDays = 45) {
  if (!data?.days) return [];

  const daysByDate = new Map(data.days.map((day) => [`${day.month_order}-${day.day}`, day]));
  const today = numericParts(cairoDateFormatter, now);
  const observances = [];

  for (let offset = 0; offset <= lookAheadDays; offset += 1) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + offset, 12));
    const coptic = copticDate(date);
    const dayRecord = daysByDate.get(`${coptic.month}-${coptic.day}`);
    if (!dayRecord || dayRecord.extraction_status !== 'extracted') continue;

    const names = dayRecord.observances
      .map((observance) => observance.name_ar.trim())
      .filter((name) => name.length > 0);

    const gregorianDate = new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
    }).format(date);

    names.forEach((name, index) => {
      observances.push({
        id: `${dayRecord.id}-${index}`,
        name,
        copticDate: dayRecord.coptic_date_ar,
        gregorianDate,
        relativeDate: relativeDayLabel(offset),
        offset,
      });
    });
  }

  return observances;
}
