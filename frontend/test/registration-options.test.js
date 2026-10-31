import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { academicYears, collegeGroups } from '../src/data/colleges.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const options = JSON.parse(fs.readFileSync(path.join(root, 'shared/registration-options.json'), 'utf8'));
const mobileCollegeOptions = fs.readFileSync(path.join(root, 'Mobile/lib/data/colleges.dart'), 'utf8');

const dartStrings = (source) => [...source.matchAll(/'((?:\\.|[^'])*)'/g)].map((match) => match[1]);

test('web and mobile share identical study choices', () => {
  const yearBlock = mobileCollegeOptions.match(/const List<String> academicYears = \[([\s\S]*?)\n\];/);
  const groupsBlock = mobileCollegeOptions.match(/const List<CollegeGroup> collegeGroups = \[([\s\S]*?)\n\];\n\nList<String> get colleges/);
  assert.ok(yearBlock, 'mobile academic year list exists');
  assert.ok(groupsBlock, 'mobile college list exists');

  const mobileYears = dartStrings(yearBlock[1]);
  const mobileGroups = [...groupsBlock[1].matchAll(/CollegeGroup\(\s*label: '([^']*)',\s*colleges: \[([\s\S]*?)\]\s*,?\s*\)/g)]
    .map((match) => ({ label: match[1], colleges: dartStrings(match[2]) }));

  assert.deepEqual(mobileYears, academicYears);
  assert.deepEqual(mobileGroups, collegeGroups);
});

test('all residence choices and Egypt governorates sync to Flutter', () => {
  const codes = options.countries.map(({ code }) => code);
  const names = options.countries.map(({ name }) => name);

  assert.ok(options.countries.length >= 249);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(new Set(names).size, names.length);
  assert.equal(options.countries.find(({ code }) => code === 'EG')?.name, options.egyptCountryName);
  assert.equal(options.egyptGovernorates.length, 27);
  const southSinai = String.fromCodePoint(0x62c, 0x646, 0x648, 0x628, 0x20, 0x633, 0x64a, 0x646, 0x627, 0x621);
  assert.ok(options.egyptGovernorates.includes(southSinai));

  execFileSync(process.execPath, [path.join(root, 'scripts/sync-registration-options.mjs'), '--check'], {
    cwd: root,
    stdio: 'pipe',
  });
});
