import { Routes, Route } from 'react-router-dom'
import Home from './pages/public/Home'
import ProjectPage from './pages/public/ProjectPage'
import PrivateProject from './pages/public/PrivateProject'
import NotFound from './pages/public/NotFound'
import Login from './pages/admin/Login'
import RequireAdmin from './pages/admin/RequireAdmin'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import AddReel from './pages/admin/AddReel'
import EditProject from './pages/admin/EditProject'
import ManageProjects from './pages/admin/ManageProjects'
import Categories from './pages/admin/Categories'
import Settings from './pages/admin/Settings'
import GoogleDrivePage from './pages/admin/GoogleDrivePage'

export default function App() {
  return (
    <Routes>
      {/* Public client-facing portfolio */}
      <Route path="/" element={<Home />} />
      <Route path="/portfolio" element={<Home />} />
      <Route path="/project/:slug" element={<ProjectPage />} />
      <Route path="/private/:slug" element={<PrivateProject />} />

      {/* Admin */}
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="new" element={<AddReel />} />
        <Route path="projects" element={<ManageProjects />} />
        <Route path="projects/:id" element={<EditProject />} />
        <Route path="categories" element={<Categories />} />
        <Route path="settings" element={<Settings />} />
        <Route path="drive" element={<GoogleDrivePage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
