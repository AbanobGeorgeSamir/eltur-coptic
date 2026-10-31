const options = require('../../shared/registration-options.json');

const countries = new Set(options.countries.map(({ name }) => name));
const egyptGovernorates = new Set(options.egyptGovernorates);
const higherEducationGrades = new Set(['university', 'expatriates']);

const isHigherEducationGrade = (grade) => higherEducationGrades.has(grade);

module.exports = {
    countries,
    egyptGovernorates,
    egyptCountryName: options.egyptCountryName,
    isHigherEducationGrade,
};
