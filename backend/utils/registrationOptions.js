const options = require('../../shared/registration-options.json');

const egyptGovernorates = new Set(options.egyptGovernorates);
const egyptPlacesByGovernorate = new Map(
    Object.entries(options.egyptPlacesByGovernorate)
        .map(([governorate, places]) => [governorate, new Set(places)])
);
const higherEducationGrades = new Set(['university', 'expatriates']);

const isHigherEducationGrade = (grade) => higherEducationGrades.has(grade);

module.exports = {
    egyptGovernorates,
    egyptPlacesByGovernorate,
    egyptCountryName: options.egyptCountryName,
    isHigherEducationGrade,
};
