const weekdayOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const cairoWeekdayTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Cairo',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export const isPermanentLiturgy = (post) => post.liturgyType === 'permanent'
  || (!post.liturgyType && !post.eventAt);

export const nextLiturgyOffsetMinutes = (post, now = new Date()) => {
  if (isPermanentLiturgy(post)) {
    const parts = Object.fromEntries(cairoWeekdayTime.formatToParts(now)
      .map(({ type, value }) => [type, value]));
    const currentDay = weekdayOrder.indexOf(parts.weekday.toLowerCase());
    const targetDay = weekdayOrder.indexOf(post.dayOfWeek || 'friday');
    if (currentDay < 0 || targetDay < 0) return Number.POSITIVE_INFINITY;

    const currentMinute = Number(parts.hour) * 60 + Number(parts.minute);
    const timeMatch = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(post.startTime || '00:00');
    const startMinute = timeMatch ? Number(timeMatch[1]) * 60 + Number(timeMatch[2]) : 0;
    const endMatch = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(post.endTime || '');
    const endMinute = endMatch ? Number(endMatch[1]) * 60 + Number(endMatch[2]) : -1;

    let daysAhead = (targetDay - currentDay + weekdayOrder.length) % weekdayOrder.length;
    if (daysAhead === 0 && startMinute < currentMinute) {
      if (endMinute > currentMinute) return 0;
      daysAhead = weekdayOrder.length;
    }
    return daysAhead * 24 * 60 + startMinute - currentMinute;
  }

  const eventTime = new Date(post.startAt || post.eventAt || '').getTime();
  return Number.isFinite(eventTime) ? (eventTime - now.getTime()) / 60_000 : Number.POSITIVE_INFINITY;
};

export const compareUpcomingLiturgies = (a, b, now = new Date()) => {
  const difference = nextLiturgyOffsetMinutes(a, now) - nextLiturgyOffsetMinutes(b, now);
  if (Number.isFinite(difference) && difference !== 0) return difference;
  return String(a.title || '').localeCompare(String(b.title || ''), 'ar');
};

export const cairoWeekdayLabels = {
  saturday: 'السبت',
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
};
