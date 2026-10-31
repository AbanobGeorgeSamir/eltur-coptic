import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const optionsPath = path.join(root, 'shared', 'registration-options.json');
const dartPath = path.join(root, 'Mobile', 'lib', 'data', 'residence_options.dart');
const options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));

const dartList = (items, render) => items.map((item) => `  ${render(item)},`).join('\n');
const output = `// Generated from shared/registration-options.json. Do not edit by hand.\n\nclass ResidenceCountry {\n  const ResidenceCountry({required this.code, required this.name});\n\n  final String code;\n  final String name;\n}\n\nconst List<ResidenceCountry> residenceCountries = [\n${dartList(options.countries, ({ code, name }) => `ResidenceCountry(code: ${JSON.stringify(code)}, name: ${JSON.stringify(name)})`)}\n];\n\nconst String egyptCountryCode = ${JSON.stringify(options.egyptCountryCode)};\nconst String egyptCountryName = ${JSON.stringify(options.egyptCountryName)};\nconst List<String> egyptGovernorates = [\n${dartList(options.egyptGovernorates, JSON.stringify)}\n];\n\nconst Set<String> higherEducationGrades = {'university', 'expatriates'};\nbool isHigherEducationGrade(String grade) => higherEducationGrades.contains(grade);\n`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(dartPath) ? fs.readFileSync(dartPath, 'utf8') : '';
  if (current !== output) {
    console.error('Mobile residence options are out of sync with shared/registration-options.json.');
    process.exitCode = 1;
  } else {
    console.log(`Options match: ${options.countries.length} countries and ${options.egyptGovernorates.length} governorates.`);
  }
} else {
  fs.writeFileSync(dartPath, output, 'utf8');
  console.log(`Generated ${path.relative(root, dartPath)} from the shared options.`);
}
