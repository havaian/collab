import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { User } from '@/types'
import { authAPI } from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value && !!token.value)

  // Watch for changes and persist to localStorage
  watch(
    [user, token],
    ([newUser, newToken]) => {
      if (newUser && newToken) {
        localStorage.setItem('auth_token', newToken)
        localStorage.setItem('auth_user', JSON.stringify({
          ...newUser, 
          createdAt: newUser.createdAt instanceof Date ? newUser.createdAt.toISOString() : newUser.createdAt,
          lastActive: newUser.lastActive instanceof Date ? newUser.lastActive.toISOString() : newUser.lastActive
        }))
      } else {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    },
    { deep: true }
  )

  const login = async (credentials: { email: string; password: string }) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.login(credentials)
      const data = response.data
      
      // Transform backend response to frontend User type
      user.value = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        avatar: data.user.avatar || '',
        displayName: data.user.displayName,
        preferences: data.user.preferences,
        isVerified: data.user.isVerified,
        createdAt: new Date(),
        lastActive: new Date()
      }
      token.value = data.token
      
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const loginWithOAuth = (provider: 'github' | 'google') => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10141'
    window.location.href = `${API_BASE_URL}/api/auth/${provider}`
  }

  const handleOAuthCallback = async (token: string) => {
    loading.value = true
    error.value = null
    
    try {
      // Set token temporarily to get user data
      localStorage.setItem('auth_token', token)
      
      const response = await authAPI.getProfile()
      const data = response.data
      
      // Transform backend user data
      user.value = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        avatar: data.user.avatar || '',
        displayName: data.user.displayName,
        preferences: data.user.preferences,
        usage: data.user.usage,
        isVerified: data.user.isVerified,
        createdAt: new Date(),
        lastActive: new Date()
      }
      this.token = token
      
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Authentication failed'
      localStorage.removeItem('auth_token')
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      if (token.value) {
        await authAPI.logout()
      }
    } catch (err) {
      console.error('Logout API call failed:', err)
    } finally {
      user.value = null
      token.value = null
    }
  }

  const initializeAuth = async () => {
    try {
      const storedUser = localStorage.getItem('auth_user')
      const storedToken = localStorage.getItem('auth_token')
      
      if (storedUser && storedToken) {
        // Verify token is still valid by fetching user data
        try {
          const response = await authAPI.getProfile()
          const data = response.data
          
          // Update user data from server
          user.value = {
            id: data.user.id,
            username: data.user.username,
            email: data.user.email,
            avatar: data.user.avatar || '',
            displayName: data.user.displayName,
            preferences: data.user.preferences,
            usage: data.user.usage,
            isVerified: data.user.isVerified,
            createdAt: new Date(),
            lastActive: new Date()
          }
          token.value = storedToken
          
          console.log('Auth restored from server:', { user: data.user, hasToken: !!storedToken })
        } catch (err) {
          // Token is invalid, clear storage (axios interceptor will handle this)
          console.log('Token validation failed, clearing storage')
        }
      }
    } catch (err) {
      console.error('Failed to restore auth:', err)
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_token')
    }
  }

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!token.value) {
      throw new Error('Not authenticated')
    }
    
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.updateProfile(updates)
      const data = response.data
      
      // Update user data
      if (user.value) {
        user.value = {
          ...user.value,
          ...data.user,
          id: data.user.id,
          createdAt: user.value.createdAt,
          lastActive: new Date()
        }
      }
      
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update profile'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    loginWithOAuth,
    handleOAuthCallback,
    logout,
    initializeAuth,
    updateUserProfile
  }
})