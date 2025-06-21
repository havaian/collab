<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <div v-if="processing" class="space-y-4">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Completing authentication...
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Please wait while we complete your {{ provider }} login
          </p>
        </div>
        
        <div v-else-if="error" class="space-y-4">
          <div class="rounded-full h-12 w-12 bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto">
            <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Authentication Failed
          </h2>
          <p class="text-gray-600 dark:text-gray-400">{{ error }}</p>
          <div class="space-y-2">
            <button 
              @click="retryAuthentication"
              class="w-full inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Try Again
            </button>
            <router-link 
              to="/login" 
              class="w-full inline-flex justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Back to Login
            </router-link>
          </div>
        </div>

        <div v-else-if="success" class="space-y-4">
          <div class="rounded-full h-12 w-12 bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
            <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Authentication Successful!
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const processing = ref(true)
const error = ref<string | null>(null)
const success = ref(false)
const provider = ref<string>('')

const processOAuthCallback = async () => {
  try {
    processing.value = true
    error.value = null
    success.value = false

    // Extract query parameters
    const { token, provider: oauthProvider, error: urlError } = route.query
    
    console.log('OAuth callback received:', { 
      hasToken: !!token, 
      provider: oauthProvider, 
      error: urlError 
    })

    // Set provider for display
    if (oauthProvider) {
      provider.value = oauthProvider as string
    }
    
    // Check for OAuth error from URL
    if (urlError) {
      throw new Error(`OAuth ${urlError === 'oauth_failed' ? 'authentication failed' : urlError}`)
    }
    
    // Validate required parameters
    if (!token) {
      throw new Error('Missing authentication token')
    }

    if (!oauthProvider) {
      throw new Error('Missing OAuth provider information')
    }

    console.log('Processing OAuth callback for provider:', oauthProvider)
    
    // Handle the OAuth callback with the token
    await authStore.handleOAuthCallback(token as string)
    
    console.log('OAuth callback processed successfully')
    
    // Show success state briefly before redirecting
    success.value = true
    processing.value = false
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      const redirectPath = (route.query.redirect as string) || '/dashboard'
      router.push(redirectPath)
    }, 1500)
    
  } catch (err: any) {
    console.error('OAuth callback error:', err)
    processing.value = false
    
    // Provide more specific error messages
    if (err.message?.includes('Network Error') || err.code === 'NETWORK_ERROR') {
      error.value = 'Unable to connect to the server. Please check your internet connection.'
    } else if (err.message?.includes('Invalid or expired token')) {
      error.value = 'The authentication token has expired. Please try logging in again.'
    } else if (err.message?.includes('Authentication failed')) {
      error.value = 'Authentication failed. Please try logging in again.'
    } else {
      error.value = err.message || 'Failed to complete authentication'
    }
  }
}

const retryAuthentication = () => {
  // Retry the authentication process
  processOAuthCallback()
}

// Process OAuth callback when component mounts
onMounted(() => {
  processOAuthCallback()
})
</script>