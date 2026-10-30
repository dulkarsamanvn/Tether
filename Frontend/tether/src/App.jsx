import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import DashboardLayout from './layouts/DashboardLayout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import BlogEditor from './pages/dashboard/BlogEditor'
import BlogView from './pages/dashboard/BlogView'
import Home from './pages/dashboard/Home'
import MyBlogs from './pages/dashboard/MyBlogs'
import SavedBlogs from './pages/dashboard/SavedBlogs'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Home />} />
              <Route path="blogs"               element={<MyBlogs />} />
              <Route path="saved"               element={<SavedBlogs />} />
              <Route path="blogs/:id/view"       element={<BlogView />} />
              <Route path="write"               element={<BlogEditor />} />
              <Route path="blogs/:id/edit"      element={<BlogEditor />} />
            </Route>

            {/* Fallback */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
