<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <div v-if="processing" class="space-y-4">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Completing authentication...
          </h2>
        </div>
        
        <div v-else-if="error" class="space-y-4">
          <div class="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto">
            <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Authentication Failed
          </h2>
          <p class="text-gray-600 dark:text-gray-400">{{ error }}</p>
          <router-link to="/login" class="btn btn-primary">
            Try Again
          </router-link>
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

onMounted(async () => {
  try {
    const { token, provider, error: urlError } = route.query
    
    if (urlError) {
      error.value = 'OAuth authentication failed'
      processing.value = false
      return
    }
    
    if (token && provider) {
      console.log('OAuth callback received:', { token, provider })
      
      // Handle the OAuth callback with the real token
      await authStore.handleOAuthCallback(token as string)
      
      // Redirect to dashboard
      router.push('/dashboard')
    } else {
      error.value = 'Missing authentication token'
      processing.value = false
    }
  } catch (err: any) {
    console.error('OAuth callback error:', err)
    error.value = err.message || 'Failed to complete authentication'
    processing.value = false
  }
})
</script>