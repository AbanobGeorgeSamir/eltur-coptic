import options from '../../../shared/registration-options.json';

export const countries = options.countries;
export const EGYPT_COUNTRY_CODE = options.egyptCountryCode;
export const EGYPT_COUNTRY_NAME = options.egyptCountryName;
export const EGYPT_GOVERNORATES = options.egyptGovernorates;
export const higherEducationGrades = new Set(['university', 'expatriates']);
export const isHigherEducationGrade = (grade) => higherEducationGrades.has(grade);
