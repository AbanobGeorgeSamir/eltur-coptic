import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { AppRoutes } from './App.jsx';
import Login from './pages/Login.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import Register from './pages/Register.jsx';

const serverPages = { login: Login, privacy: PrivacyPolicy, register: Register };

export function render(url = '/') {
  return renderToString(
    <StaticRouter location={url}>
      <AuthProvider>
        <AppRoutes showToast={() => {}} serverPages={serverPages} />
      </AuthProvider>
    </StaticRouter>,
  );
}
