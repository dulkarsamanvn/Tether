import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
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
import TrashBlogs from './pages/dashboard/TrashBlogs'
import AuthorProfile from './pages/dashboard/AuthorProfile'
import AuthorConnections from './pages/dashboard/AuthorConnections'
import DiscoverAuthors from './pages/dashboard/DiscoverAuthors'
import EditProfile from './pages/dashboard/EditProfile'
import Following from './pages/dashboard/Following'
import LlmConfiguration from './pages/dashboard/LlmConfiguration'
import AuthorAnalytics from './pages/dashboard/AuthorAnalytics'

// A data router lets the editor finish a pending autosave before dashboard navigation.
const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'blogs', element: <MyBlogs /> },
      { path: 'analytics', element: <AuthorAnalytics /> },
      { path: 'saved', element: <SavedBlogs /> },
      { path: 'trash', element: <TrashBlogs /> },
      { path: 'authors', element: <DiscoverAuthors /> },
      { path: 'authors/:authorId', element: <AuthorProfile /> },
      { path: 'authors/:authorId/followers', element: <AuthorConnections kind="followers" /> },
      { path: 'authors/:authorId/following', element: <AuthorConnections kind="following" /> },
      { path: 'profile', element: <AuthorProfile ownProfile /> },
      { path: 'profile/edit', element: <EditProfile /> },
      { path: 'following', element: <Following /> },
      { path: 'llm-configuration', element: <LlmConfiguration /> },
      { path: 'blogs/:id/view', element: <BlogView /> },
      { path: 'write', element: <BlogEditor /> },
      { path: 'blogs/:id/edit', element: <BlogEditor /> },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
])

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
