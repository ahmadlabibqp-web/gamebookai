import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { LandingPage } from '@/pages/LandingPage';
import { Sidebar } from '@/components/Sidebar';

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const UploadPage = lazy(() =>
  import('@/pages/UploadPage').then((m) => ({ default: m.UploadPage })),
);
const DocumentDetailPage = lazy(() =>
  import('@/pages/DocumentDetailPage').then((m) => ({
    default: m.DocumentDetailPage,
  })),
);
const PlayGamePage = lazy(() =>
  import('@/pages/PlayGamePage').then((m) => ({ default: m.PlayGamePage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const ProgressPage = lazy(() =>
  import('@/pages/ProgressPage').then((m) => ({ default: m.ProgressPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <>
      {isLanding ? (
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      ) : (
        <Sidebar>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/upload"
              element={
                <Suspense fallback={<PageLoader />}>
                  <UploadPage />
                </Suspense>
              }
            />
            <Route
              path="/document/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <DocumentDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/document/:id/play/:gameId"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PlayGamePage />
                </Suspense>
              }
            />
            <Route
              path="/settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route
              path="/progress"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProgressPage />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<PageLoader />}>
                  <NotFoundPage />
                </Suspense>
              }
            />
          </Routes>
        </Sidebar>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
