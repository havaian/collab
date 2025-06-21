import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/services/api'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => user.value !== null)
  const hasToken = computed(() => token.value !== null)

  // Actions
  const clearError = () => {
    error.value = null
  }

  const login = async (credentials: { email: string; password: string }) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.login(credentials)
      const data = response.data
      
      // Transform backend user data to frontend format
      user.value = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        avatar: data.user.avatar || '',
        displayName: data.user.displayName,
        preferences: data.user.preferences || {},
        usage: data.user.usage || {},
        isVerified: data.user.isVerified || false,
        createdAt: new Date(),
        lastActive: new Date()
      }
      
      token.value = data.token
      
      // Store in localStorage for persistence
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', JSON.stringify(user.value))
      
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const register = async (userData: {
    username: string
    email: string
    password: string
  }) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.register(userData)
      const data = response.data
      
      // Auto-login after successful registration
      user.value = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        avatar: data.user.avatar || '',
        displayName: data.user.displayName,
        preferences: data.user.preferences || {},
        usage: data.user.usage || {},
        isVerified: data.user.isVerified || false,
        createdAt: new Date(),
        lastActive: new Date()
      }
      
      token.value = data.token
      
      // Store in localStorage for persistence
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', JSON.stringify(user.value))
      
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  const loginWithOAuth = (provider: 'github' | 'google') => {
    // Clear any existing errors
    error.value = null
    
    // Use the API service to get the correct OAuth URL
    const authUrl = provider === 'github' 
      ? authAPI.getGithubAuthUrl() 
      : authAPI.getGoogleAuthUrl()
    
    // Redirect to OAuth provider
    window.location.href = authUrl
  }

  const handleOAuthCallback = async (authToken: string) => {
    loading.value = true
    error.value = null
    
    try {
      // Set token temporarily to get user data
      localStorage.setItem('auth_token', authToken)
      
      const response = await authAPI.getProfile()
      const data = response.data
      
      // Transform backend user data
      user.value = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        avatar: data.user.avatar || '',
        displayName: data.user.displayName,
        preferences: data.user.preferences || {},
        usage: data.user.usage || {},
        isVerified: data.user.isVerified || false,
        createdAt: new Date(),
        lastActive: new Date()
      }
      
      // Store the token
      token.value = authToken
      localStorage.setItem('auth_user', JSON.stringify(user.value))
      
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
      // Call logout API if we have a token
      if (token.value) {
        await authAPI.logout()
      }
    } catch (err) {
      console.error('Logout API call failed:', err)
    } finally {
      // Clear state regardless of API call success
      user.value = null
      token.value = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
  }

  const updateProfile = async (profileData: Partial<User>) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.updateProfile(profileData)
      const data = response.data
      
      // Update user data
      if (user.value) {
        user.value = {
          ...user.value,
          ...data.user
        }
        localStorage.setItem('auth_user', JSON.stringify(user.value))
      }
      
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update profile'
      throw err
    } finally {
      loading.value = false
    }
  }

  const changePassword = async (passwordData: {
    currentPassword: string
    newPassword: string
  }) => {
    loading.value = true
    error.value = null
    
    try {
      await authAPI.changePassword(passwordData)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to change password'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteAccount = async (password: string) => {
    loading.value = true
    error.value = null
    
    try {
      await authAPI.deleteAccount(password)
      
      // Clear all data after successful account deletion
      user.value = null
      token.value = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete account'
      throw err
    } finally {
      loading.value = false
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
            preferences: data.user.preferences || {},
            usage: data.user.usage || {},
            isVerified: data.user.isVerified || false,
            createdAt: new Date(),
            lastActive: new Date()
          }
          token.value = storedToken
          
          console.log('Auth restored from server:', { 
            user: data.user, 
            hasToken: !!storedToken 
          })
          
        } catch (err) {
          console.error('Token verification failed:', err)
          // Clear invalid stored data
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          user.value = null
          token.value = null
        }
      }
    } catch (err) {
      console.error('Auth initialization failed:', err)
    }
  }

  // API Key management methods
  const getApiKeys = async () => {
    try {
      const response = await authAPI.getApiKeys()
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch API keys'
      throw err
    }
  }

  const updateApiKey = async (service: string, apiKey: string) => {
    try {
      await authAPI.updateApiKey(service, apiKey)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update API key'
      throw err
    }
  }

  const deleteApiKey = async (service: string) => {
    try {
      await authAPI.deleteApiKey(service)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete API key'
      throw err
    }
  }

  // Email verification methods
  const resendVerification = async () => {
    try {
      await authAPI.resendVerification()
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to resend verification email'
      throw err
    }
  }

  const verifyEmail = async (verificationToken: string) => {
    try {
      await authAPI.verifyEmail(verificationToken)
      // Refresh user data
      await initializeAuth()
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Email verification failed'
      throw err
    }
  }

  // Password reset methods
  const requestPasswordReset = async (email: string) => {
    try {
      await authAPI.requestPasswordReset(email)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to send password reset email'
      throw err
    }
  }

  const resetPassword = async (resetToken: string, newPassword: string) => {
    try {
      await authAPI.resetPassword(resetToken, newPassword)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Password reset failed'
      throw err
    }
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    
    // Getters
    isAuthenticated,
    hasToken,
    
    // Actions
    clearError,
    login,
    register,
    loginWithOAuth,
    handleOAuthCallback,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
    initializeAuth,
    
    // API Key management
    getApiKeys,
    updateApiKey,
    deleteApiKey,
    
    // Email verification
    resendVerification,
    verifyEmail,
    
    // Password reset
    requestPasswordReset,
    resetPassword
  }
})