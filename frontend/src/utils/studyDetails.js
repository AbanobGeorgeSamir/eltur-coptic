import { COLLEGES } from '../data/expatriatesData';

export const OTHER_COLLEGE_VALUE = '__other__';
export const OTHER_COLLEGE_LABEL = 'أخرى';

export const collegeChoiceFor = (college = '') => {
  if (!college) return '';
  return college !== OTHER_COLLEGE_LABEL && COLLEGES.includes(college)
    ? college
    : OTHER_COLLEGE_VALUE;
};
