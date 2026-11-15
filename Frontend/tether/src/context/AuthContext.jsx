import { createContext, useContext, useRef, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => JSON.parse(localStorage.getItem('auth_user')) ?? null)
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') ?? null)
  const userRef = useRef(user)

  const login = (userData, authToken) => {
    userRef.current = userData
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('auth_user',  JSON.stringify(userData))
    localStorage.setItem('auth_token', authToken)
  }

  const logout = () => {
    userRef.current = null
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
  }

  const updateUser = (userData) => {
    // A slow profile save must not overwrite a different account after sign-in.
    if (!userRef.current || userRef.current.id !== userData.id) return
    const updated = { ...userRef.current, ...userData }
    userRef.current = updated
    setUser(updated)
    localStorage.setItem('auth_user', JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
