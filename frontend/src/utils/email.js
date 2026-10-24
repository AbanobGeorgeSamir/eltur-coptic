const COM_EMAIL = /^[^\s@]+@(?:[^\s@.]+\.)+com$/i;

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
export const isValidComEmail = (value) => COM_EMAIL.test(normalizeEmail(value));
