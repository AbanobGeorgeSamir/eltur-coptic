const defaultApiUrl = import.meta.env.PROD
  ? '/api'
  : 'http://localhost:8000/api';
// Production browser sessions use an HttpOnly cookie. Keep API calls on the
// site origin so the browser stores and sends that cookie through Vercel's
// /api rewrite, even if a stale VITE_API_URL is set in the build environment.
const API_URL = (import.meta.env.PROD ? defaultApiUrl : (import.meta.env.VITE_API_URL || defaultApiUrl)).replace(/\/+$/, '');
const TOKEN_KEY = 'eltor_coptic_token';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function request(path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  let response;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const controller = new AbortController();
  const timeout = typeof window === 'undefined' ? null : window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        ...(body === undefined || isFormData ? {} : { 'Content-Type': 'application/json' }),
        'X-Requested-With': 'XMLHttpRequest',
        'X-Session-Transport': 'cookie',
      },
      ...(body === undefined ? {} : { body: isFormData ? body : JSON.stringify(body) }),
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('انتهت مهلة الاتصال بالخادم. تحقق من اتصال الإنترنت ثم حاول مجدداً.', 0);
    }
    throw new ApiError('تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت ثم حاول مجدداً.', 0);
  } finally {
    if (timeout !== null) window.clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || 'حدث خطأ أثناء تنفيذ الطلب.', response.status);
  }
  return data;
}

export const api = {
  login: (name, password) => request('/auth/login', { method: 'POST', body: { name, password } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),
  grades: () => request('/grades').then((res) => res.data || []),
  meetingGroups: (grade) => request(`/meeting-groups?grade=${encodeURIComponent(grade)}`).then((res) => res.data || []),
  adminMeetingGroups: (grade, includeInactive = true) => request(`/admin/meeting-groups${grade || includeInactive ? `?${[grade ? `grade=${encodeURIComponent(grade)}` : '', includeInactive ? 'includeInactive=1' : ''].filter(Boolean).join('&')}` : ''}`).then((res) => res.data || []),
  createMeetingGroup: (payload) => request('/admin/meeting-groups', { method: 'POST', body: payload }),
  updateMeetingGroup: (id, payload) => request(`/admin/meeting-groups/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  mergeMeetingGroup: (id, targetId) => request(`/admin/meeting-groups/${encodeURIComponent(id)}/merge`, { method: 'POST', body: { targetId } }),
  administrators: () => request('/administrators').then((res) => res.data || []),
  administratorCandidates: (query, offset = 0) => request(`/administrator-candidates?q=${encodeURIComponent(query)}&offset=${offset}`).then((res) => ({
    data: res.data || [],
    hasMore: res.hasMore === true,
  })),
  createAdministrator: (payload) => request('/administrators', { method: 'POST', body: payload }),
  updateAdministrator: (id, payload) => request(`/administrators/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST', body: {}, timeoutMs: 5000 }),
  updateProfile: (payload) => request('/users/me', { method: 'PATCH', body: payload }),
  deleteAccount: (password) => request('/users/me', { method: 'DELETE', body: { password } }),
  featuredVerse: () => request('/featured-verse').then((res) => res.data || null),
  saveFeaturedVerse: (payload) => request('/featured-verse', { method: 'PUT', body: payload }),
  posts: (type, options = {}) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (options.includeUnpublished) params.set('includeUnpublished', '1');
    return request(`/ministry/posts${params.size ? `?${params}` : ''}`).then((res) => res.data || []);
  },
  postsPage: async (type, page = 1, limit = 18) => {
    const response = await request(`/ministry/posts?type=${encodeURIComponent(type)}&page=${page}&limit=${limit}`);
    if (response.pagination) return response;
    const allPosts = response.data || [];
    const offset = (page - 1) * limit;
    return {
      ...response,
      data: allPosts.slice(offset, offset + limit),
      pagination: { page, limit, hasMore: allPosts.length > offset + limit },
    };
  },
  upcomingLiturgies: (limit = 2) => request(`/ministry/posts?type=liturgy&upcoming=1&limit=${limit}`).then((res) => res.data || []),
  uploadMedia: (file, filename = file?.name || 'church-file') => {
    const formData = new FormData();
    formData.append('file', file, filename);
    return request('/media', { method: 'POST', body: formData, timeoutMs: 60000 }).then((res) => res.data);
  },
  createPost: (payload) => request('/ministry/posts', { method: 'POST', body: payload }),
  updatePost: (id, payload) => request(`/ministry/posts/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  deletePost: (id) => request(`/ministry/posts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  students: () => request('/students').then((res) => res.data || []),
  unassignedStudents: () => request('/students/unassigned').then((res) => res.data || []),
  pendingParents: () => request('/parents/pending').then((res) => res.data || []),
  approveParent: (id, studentId) => request(`/parents/${encodeURIComponent(id)}/approve`, { method: 'POST', body: { studentId } }),
  assignStudent: (id, meetingGroup = '') => request(`/students/${encodeURIComponent(id)}/assign`, { method: 'POST', body: { meetingGroup } }),
  rejectStudent: (id) => request(`/students/${encodeURIComponent(id)}/reject`, { method: 'POST', body: {} }),
  updateStudent: (id, payload) => request(`/students/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  tasks: () => request('/tasks').then((res) => res.data || []),
  createTasks: (payload) => request('/tasks', { method: 'POST', body: payload }),
  updateTaskAudience: (id, payload) => request(`/tasks/${encodeURIComponent(id)}/audience`, { method: 'PATCH', body: payload }),
  completeTask: (id, completionNote = '') => request(`/tasks/${encodeURIComponent(id)}/complete`, { method: 'PATCH', body: { completionNote } }),
  tripRegistrations: () => request('/trip-registrations').then((res) => res.data || []),
  registerForTrip: (id) => request(`/trips/${encodeURIComponent(id)}/register`, { method: 'POST', body: {} }),
  updateTripPayment: (id, amountPaid) => request(`/trip-registrations/${encodeURIComponent(id)}/payment`, { method: 'PATCH', body: { amountPaid } }),
  deleteTripRegistration: (id) => request(`/trip-registrations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  attendance: () => request('/attendance').then((res) => res.data || []),
  attendanceSummary: () => request('/attendance/summary').then((res) => res.data || { overall: null, students: [] }),
  saveAttendance: async (records) => {
    for (let index = 0; index < records.length; index += 200) {
      await request('/attendance', { method: 'POST', body: { records: records.slice(index, index + 200) } });
    }
  },
  confessions: () => request('/confessions').then((res) => res.data || []),
  createConfession: (payload) => request('/confessions', { method: 'POST', body: payload }),
  updateConfession: (id, payload) => request(`/confessions/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  prayerChecklists: (date) => request(`/prayer-checklists?date=${encodeURIComponent(date)}`).then((res) => res.data || []),
  savePrayerChecklist: (payload) => request('/prayer-checklists', { method: 'POST', body: payload }),
  updatePrayerChecklist: (studentId, payload) => request(`/prayer-checklists/${encodeURIComponent(studentId)}`, { method: 'PATCH', body: payload }),
  parentDashboard: () => request('/parents/dashboard').then((res) => res.data || []),
  quizzes: () => request('/quizzes').then((res) => res.data || []),
  quizAttempts: () => request('/quiz-attempts').then((res) => res.data || []),
  quizResults: (id) => request(`/quizzes/${encodeURIComponent(id)}/results`).then((res) => res.data || []),
  createQuiz: (payload) => request('/quizzes', { method: 'POST', body: payload }),
  updateQuizAudience: (id, payload) => request(`/quizzes/${encodeURIComponent(id)}/audience`, { method: 'PATCH', body: payload }),
  submitQuiz: (id, answers) => request(`/quizzes/${encodeURIComponent(id)}/submit`, { method: 'POST', body: { answers } }),
  contact: () => request('/contact'),
};

export { API_URL, TOKEN_KEY };
