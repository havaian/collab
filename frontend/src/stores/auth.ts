import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { User } from '@/types'

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
      // Mock authentication - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock response that matches backend structure
      const mockResponse = {
        user: {
          id: '1',
          username: 'demo-user',
          email: credentials.email,
          avatar: `https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400`,
          createdAt: new Date(),
          lastActive: new Date()
        },
        token: 'mock-jwt-token-' + Date.now()
      }
      
      user.value = mockResponse.user
      token.value = mockResponse.token
      
    } catch (err) {
      error.value = 'Login failed. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const loginWithOAuth = async (provider: 'github' | 'google') => {
    loading.value = true
    error.value = null
    
    try {
      // Mock OAuth login
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const mockResponse = {
        user: {
          id: '1',
          username: `${provider}-user`,
          email: `user@${provider}.com`,
          avatar: `https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400`,
          createdAt: new Date(),
          lastActive: new Date()
        },
        token: `mock-${provider}-token-` + Date.now()
      }
      
      user.value = mockResponse.user
      token.value = mockResponse.token
      
    } catch (err) {
      error.value = `${provider} login failed. Please try again.`
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    // localStorage cleanup happens automatically via watcher
  }

  const initializeAuth = () => {
    try {
      const storedUser = localStorage.getItem('auth_user')
      const storedToken = localStorage.getItem('auth_token')
      
      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser)
        
        // Convert date strings back to Date objects
        if (parsedUser.createdAt) {
          parsedUser.createdAt = new Date(parsedUser.createdAt)
        }
        if (parsedUser.lastActive) {
          parsedUser.lastActive = new Date(parsedUser.lastActive)
        }
        
        user.value = parsedUser
        token.value = storedToken
        
        console.log('Auth restored from localStorage:', { user: parsedUser, hasToken: !!storedToken })
      }
    } catch (err) {
      console.error('Failed to restore auth from localStorage:', err)
      // Clear corrupted data
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_token')
    }
  }

  const updateUserProfile = (updates: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...updates }
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
    logout,
    initializeAuth,
    updateUserProfile
  }
})