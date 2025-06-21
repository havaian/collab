import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  const login = async (credentials: { email: string; password: string }) => {
    loading.value = true
    error.value = null
    
    try {
      // Mock authentication - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      user.value = {
        id: '1',
        username: 'demo-user',
        email: credentials.email,
        avatar: `https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400`,
        createdAt: new Date(),
        lastActive: new Date()
      }
      
      // Store in localStorage for persistence
      localStorage.setItem('auth_user', JSON.stringify(user.value))
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
      
      user.value = {
        id: '1',
        username: `${provider}-user`,
        email: `user@${provider}.com`,
        avatar: `https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400`,
        createdAt: new Date(),
        lastActive: new Date()
      }
      
      localStorage.setItem('auth_user', JSON.stringify(user.value))
    } catch (err) {
      error.value = `${provider} login failed. Please try again.`
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    localStorage.removeItem('auth_user')
  }

  const initializeAuth = () => {
    const storedUser = localStorage.getItem('auth_user')
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (err) {
        localStorage.removeItem('auth_user')
      }
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    loginWithOAuth,
    logout,
    initializeAuth
  }
})