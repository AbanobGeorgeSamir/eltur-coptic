import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  getUpcomingSynaxariumObservances,
  getVisibleSynaxariumObservances,
} from '../src/utils/synaxarium.js';

const readJson = (url) => JSON.parse(readFileSync(fileURLToPath(url), 'utf8'));
const websiteCalendar = readJson(new URL('../src/data/synaxarium_coptic_calendar.json', import.meta.url));
const mobileCalendar = readJson(new URL('../../Mobile/resources/synaxarium_coptic_calendar.json', import.meta.url));
const expectedObservanceDigest = '7fef937bed2dcd1c14b582d3f9d0c55c0c2ed3c0323a840f3d0382753980863a';

test('website and mobile use the same complete Synaxarium data', () => {
  assert.deepEqual(mobileCalendar, websiteCalendar);

  const expectedIds = websiteCalendar.month_order.flatMap((month) => (
    Array.from({ length: month.days_in_source }, (_, index) => (
      `${month.id}-${String(index + 1).padStart(2, '0')}`
    ))
  ));
  assert.equal(expectedIds.length, 366);
  assert.deepEqual(websiteCalendar.days.map((day) => day.id), expectedIds);
  assert.equal(new Set(websiteCalendar.days.map((day) => day.id)).size, 366);

  for (const day of websiteCalendar.days) {
    assert.equal(day.extraction_status, 'extracted', `${day.id} is not marked complete`);
    assert.ok(day.observances.length > 0, `${day.id} has no observances`);
    for (const [index, observance] of day.observances.entries()) {
      assert.equal(observance.id, `${day.id}-o${String(index + 1).padStart(2, '0')}`);
      assert.ok(observance.name_ar.trim(), `${observance.id} has a blank title`);
    }

    if (day.day === 12) {
      assert.ok(
        day.observances.some((observance) => observance.name_ar.includes('ميخائيل')),
        `${day.id} is missing the monthly Michael commemoration`,
      );
    }
  }

  const observanceCount = websiteCalendar.days.reduce(
    (count, day) => count + day.observances.length,
    0,
  );
  assert.equal(observanceCount, 860);
  assert.deepEqual(websiteCalendar.quality, {
    expected_date_records: 366,
    records_with_extracted_observances: 366,
    records_requiring_review: 0,
    review_date_ids: [],
    unique_source_pages_used: 366,
    total_observances: 860,
  });

  const canonical = websiteCalendar.days.flatMap((day) => (
    day.observances.map((observance) => `${day.id}\t${observance.id}\t${observance.name_ar}`)
  )).join('\n');
  const digest = createHash('sha256').update(canonical, 'utf8').digest('hex');
  assert.equal(digest, expectedObservanceDigest, 'reviewed Synaxarium titles changed');
});

test('18 Babah keeps the complete single Synaxarium commemoration', () => {
  const day = websiteCalendar.days.find((record) => record.id === 'babeh-18');
  assert.equal(day.observances.length, 1);
  assert.equal(
    day.observances[0].name_ar,
    'نياحة البابا القديس ثاؤفيلس البطريرك الثالث والعشرين من بطاركة الكرازة المرقسية.',
  );
});

test('short titles remain visible and expanding reveals every observance', () => {
  const shortTitleCalendar = {
    days: [{
      id: 'babeh-18',
      month_order: 2,
      day: 18,
      coptic_date_ar: '18 بابه',
      extraction_status: 'extracted',
      observances: [{ name_ar: 'ذكر' }],
    }],
  };
  const shortTitleResult = getUpcomingSynaxariumObservances(
    new Date(Date.UTC(2026, 9, 27, 12)),
    shortTitleCalendar,
    1,
  );
  assert.deepEqual(shortTitleResult.map((observance) => observance.name), ['ذكر']);

  const elevenObservances = Array.from({ length: 11 }, (_, index) => ({ id: String(index) }));
  assert.equal(getVisibleSynaxariumObservances(elevenObservances, false).length, 3);
  assert.deepEqual(getVisibleSynaxariumObservances(elevenObservances, true), elevenObservances);
});
