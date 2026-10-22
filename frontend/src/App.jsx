import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { useAuth } from './contexts/useAuth';
import Seo from './components/Seo';
import PublicHome from './pages/PublicHome';
import { isAdminRole } from './data/grades';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Home = lazy(() => import('./pages/Home'));
const Agpeya = lazy(() => import('./pages/Agpeya'));
const Bible = lazy(() => import('./pages/Bible'));
const PrayerChecklist = lazy(() => import('./pages/PrayerChecklist'));
const SundaySchool = lazy(() => import('./pages/SundaySchool'));
const Quizzes = lazy(() => import('./pages/Quizzes'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Trips = lazy(() => import('./pages/Trips'));
const Liturgy = lazy(() => import('./pages/Liturgy'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Profile = lazy(() => import('./pages/Profile'));
const Confession = lazy(() => import('./pages/Confession'));
const AdminAttendance = lazy(() => import('./pages/AdminAttendance'));
const AdminNewsletter = lazy(() => import('./pages/AdminNewsletter'));
const AdminGallery = lazy(() => import('./pages/AdminGallery'));
const AdminLiturgy = lazy(() => import('./pages/AdminLiturgy'));
const AdminStudents = lazy(() => import('./pages/AdminStudents'));
const AdminTasks = lazy(() => import('./pages/AdminTasks'));
const AdminVerse = lazy(() => import('./pages/AdminVerse'));
const AdminDailyReading = lazy(() => import('./pages/AdminDailyReading'));
const AdminAccess = lazy(() => import('./pages/AdminAccess'));
const FatherDashboard = lazy(() => import('./pages/FatherDashboard'));

function LoadingPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4" dir="rtl" aria-busy="true">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-5 py-4 text-amber-200 shadow-xl" role="status" aria-live="polite">
        <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
        <span>جارٍ تحميل الصفحة...</span>
      </div>
    </main>
  );
}

class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-dvh place-items-center px-4 py-8" dir="rtl">
          <section role="alert" className="w-full max-w-lg rounded-3xl border border-rose-400/20 bg-slate-900 p-6 text-center shadow-2xl sm:p-8">
            <h1 className="text-xl font-extrabold text-white">تعذر عرض هذه الصفحة</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">حاول تحديث الصفحة. إذا استمرت المشكلة، عُد إلى الرئيسية وأعد المحاولة.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">إعادة المحاولة</button>
              <a href="/" className="inline-flex min-h-11 items-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200">الرئيسية</a>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

function AppFrame({ userRole, showToast, children }) {
  const [contentVersion, setContentVersion] = useState(0);
  return (
    <div className="min-h-dvh bg-transparent font-sans text-slate-100" dir="rtl">
      <a href="#main-content" className="skip-link">انتقل إلى المحتوى</a>
      <Navbar showToast={showToast} onRefresh={() => setContentVersion((version) => version + 1)} />
      <div className="flex min-h-[calc(100dvh-68px)] flex-col lg:flex-row">
        <Sidebar userRole={userRole} />
        <main id="main-content" tabIndex="-1" className="min-w-0 flex-1 overflow-x-clip px-3 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-6 sm:pb-8 lg:px-8 lg:py-8">
          <div key={contentVersion} className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function ProtectedLayout({ showToast }) {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingPage />;
  if (!user) return <Navigate to="/" replace />;
  return (
    <AppFrame userRole={user.role} showToast={showToast}>
      <Seo title="بوابة الخدمة | كنيسة موسي النبي ومارمرقس الرسول" description="بوابة خدمة كنيسة موسي النبي ومارمرقس الرسول." indexable={false} />
      <Outlet context={{ showToast }} />
    </AppFrame>
  );
}

function RootPage({ showToast }) {
  const { user, ready } = useAuth();
  // Keep the server-rendered public landing page visible while session state loads.
  if (!ready) return <PublicHome />;
  if (!user) return <><Seo title="كنيسة موسي النبي ومارمرقس الرسول | الخدمات الكنسية ومدارس الأحد" description="بوابة كنيسة موسي النبي ومارمرقس الرسول بطور سيناء: صلوات الأجبية، قراءة الكتاب المقدس، مدارس الأحد، وخدمات الكنيسة." indexable /><PublicHome /></>;
  return (
    <AppFrame userRole={user.role} showToast={showToast}>
      <Seo title="الرئيسية | كنيسة موسي النبي ومارمرقس الرسول" description="الخدمات الروحية ومتابعة الأنشطة في كنيسة موسي النبي ومارمرقس الرسول." indexable={false} />
      <Home showToast={showToast} />
    </AppFrame>
  );
}

export function AppRoutes({ showToast, serverPages = null }) {
  const { user, ready } = useAuth();
  const PrivacyPage = serverPages?.privacy || PrivacyPolicy;
  const LoginPage = serverPages?.login || Login;
  const RegisterPage = serverPages?.register || Register;
  const only = (role, element) => user?.role === role ? element : <Navigate to="/" replace />;
  const adminOnly = (element) => isAdminRole(user?.role) ? element : <Navigate to="/" replace />;
  const groupedStudentOnly = (element) => user?.role === 'student' && !user?.meetingGroup ? <Navigate to="/" replace /> : element;
  return (
    <>
      <FloatingWhatsApp />
      <Suspense fallback={<LoadingPage />}>
        <Routes>
        <Route path="/" element={<RootPage showToast={showToast} />} />
        <Route path="/privacy" element={<><Seo title="سياسة الخصوصية | كنيسة موسي النبي ومارمرقس الرسول" description="سياسة الخصوصية واستخدام البيانات في بوابة كنيسة موسي النبي ومارمرقس الرسول." indexable /><PrivacyPage /></>} />
        <Route path="/login" element={ready && user ? <Navigate to="/" replace /> : <><Seo title="تسجيل الدخول | كنيسة موسي النبي ومارمرقس الرسول" description="تسجيل الدخول إلى بوابة كنيسة موسي النبي ومارمرقس الرسول." /><LoginPage showToast={showToast} /></>} />
        <Route path="/register" element={ready && user ? <Navigate to="/" replace /> : <><Seo title="إنشاء حساب | كنيسة موسي النبي ومارمرقس الرسول" description="استمارة تسجيل بيانات الخادم/المخدوم في بوابة كنيسة موسي النبي ومارمرقس الرسول." /><RegisterPage showToast={showToast} /></>} />
        <Route element={<ProtectedLayout showToast={showToast} />}>
          <Route path="/agpeya" element={<Agpeya />} />
          <Route path="/bible" element={<Bible />} />
          <Route path="/prayers" element={groupedStudentOnly(<PrayerChecklist showToast={showToast} />)} />
          <Route path="/sunday-school" element={groupedStudentOnly(<SundaySchool />)} />
          <Route path="/quizzes" element={groupedStudentOnly(<Quizzes />)} />
          <Route path="/tasks" element={groupedStudentOnly(<Tasks showToast={showToast} />)} />
          <Route path="/trips" element={groupedStudentOnly(<Trips showToast={showToast} />)} />
          <Route path="/liturgy" element={groupedStudentOnly(<Liturgy />)} />
          <Route path="/gallery" element={groupedStudentOnly(<Gallery />)} />
          <Route path="/profile" element={<Profile showToast={showToast} />} />
          <Route path="/confession" element={groupedStudentOnly(<Confession showToast={showToast} />)} />
          <Route path="/admin-attendance" element={adminOnly(<AdminAttendance showToast={showToast} />)} />
          <Route path="/admin-newsletter" element={adminOnly(<AdminNewsletter showToast={showToast} />)} />
          <Route path="/admin-gallery" element={adminOnly(<AdminGallery showToast={showToast} />)} />
          <Route path="/admin-liturgy" element={adminOnly(<AdminLiturgy showToast={showToast} />)} />
          <Route path="/admin-students" element={adminOnly(<AdminStudents />)} />
          <Route path="/admin-tasks" element={adminOnly(<AdminTasks showToast={showToast} />)} />
          <Route path="/admin-verse" element={only('admin', <AdminVerse showToast={showToast} />)} />
          <Route path="/admin-daily-reading" element={only('admin', <AdminDailyReading showToast={showToast} />)} />
          <Route path="/admin-access" element={adminOnly(<AdminAccess />)} />
          <Route path="/father-dashboard" element={only('parent', <FatherDashboard showToast={showToast} />)} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef(null);
  const showToast = (message) => {
    setToastMessage(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(''), 3500);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppErrorBoundary>
          {toastMessage && <div role="status" aria-live="polite" className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-auto max-w-md rounded-2xl border border-amber-200/50 bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-2xl shadow-black/30 sm:inset-x-auto sm:right-5 sm:mx-0">{toastMessage}</div>}
          <AppRoutes showToast={showToast} />
        </AppErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
