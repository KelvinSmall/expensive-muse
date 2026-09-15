import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/public/Home'
import ProjectPage from './pages/public/ProjectPage'
import PrivateProject from './pages/public/PrivateProject'
import NotFound from './pages/public/NotFound'

// Every admin page — including the video-compression engine pulled in by
// AddReel/BulkUpload — is loaded on demand, not bundled into the public
// site. A client opening a portfolio link never downloads a byte of
// admin code, which is most of what keeps the public pages fast on a
// slow connection.
const Login = lazy(() => import('./pages/admin/Login'))
const ResetPassword = lazy(() => import('./pages/admin/ResetPassword'))
const RequireAdmin = lazy(() => import('./pages/admin/RequireAdmin'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const AddReel = lazy(() => import('./pages/admin/AddReel'))
const AddGallery = lazy(() => import('./pages/admin/AddGallery'))
const BulkUpload = lazy(() => import('./pages/admin/BulkUpload'))
const EditProject = lazy(() => import('./pages/admin/EditProject'))
const ManageProjects = lazy(() => import('./pages/admin/ManageProjects'))
const Categories = lazy(() => import('./pages/admin/Categories'))
const ShareLink = lazy(() => import('./pages/admin/ShareLink'))
const Settings = lazy(() => import('./pages/admin/Settings'))
const GoogleDrivePage = lazy(() => import('./pages/admin/GoogleDrivePage'))

function AdminFallback() {
  return <div className="min-h-screen bg-bg" />
}

export default function App() {
  return (
    <Routes>
      {/* Public client-facing portfolio — eager-loaded, no admin code attached */}
      <Route path="/" element={<Home />} />
      <Route path="/portfolio" element={<Home />} />
      <Route path="/project/:slug" element={<ProjectPage />} />
      <Route path="/private/:slug" element={<PrivateProject />} />

      {/* Admin — loaded only when someone actually visits /admin/* */}
      <Route
        path="/admin/login"
        element={
          <Suspense fallback={<AdminFallback />}>
            <Login />
          </Suspense>
        }
      />
      <Route
        path="/admin/reset-password"
        element={
          <Suspense fallback={<AdminFallback />}>
            <ResetPassword />
          </Suspense>
        }
      />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<AdminFallback />}>
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          </Suspense>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<AdminFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="new"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AddReel />
            </Suspense>
          }
        />
        <Route
          path="new-gallery"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AddGallery />
            </Suspense>
          }
        />
        <Route
          path="bulk-upload"
          element={
            <Suspense fallback={<AdminFallback />}>
              <BulkUpload />
            </Suspense>
          }
        />
        <Route
          path="projects"
          element={
            <Suspense fallback={<AdminFallback />}>
              <ManageProjects />
            </Suspense>
          }
        />
        <Route
          path="projects/:id"
          element={
            <Suspense fallback={<AdminFallback />}>
              <EditProject />
            </Suspense>
          }
        />
        <Route
          path="categories"
          element={
            <Suspense fallback={<AdminFallback />}>
              <Categories />
            </Suspense>
          }
        />
        <Route
          path="share-link"
          element={
            <Suspense fallback={<AdminFallback />}>
              <ShareLink />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<AdminFallback />}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="drive"
          element={
            <Suspense fallback={<AdminFallback />}>
              <GoogleDrivePage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
