<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Navigation -->
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-4">
            <router-link to="/dashboard" class="text-xl font-bold text-gray-900 dark:text-white">
              GPT Collab
            </router-link>
            <ChevronRight class="w-4 h-4 text-gray-400" />
            <span class="text-gray-600 dark:text-gray-400">Profile</span>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        Profile Settings
      </h1>

      <div class="space-y-6">
        <!-- Profile Information -->
        <div class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Profile Information
          </h2>
          
          <div class="flex items-center space-x-6 mb-6">
            <div class="relative">
              <img
                :src="authStore.user?.avatar"
                :alt="authStore.user?.username"
                class="w-20 h-20 rounded-full object-cover"
              />
              <button class="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700">
                <Camera class="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ authStore.user?.username }}
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                {{ authStore.user?.email }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Member since {{ formatDate(authStore.user?.createdAt) }}
              </p>
            </div>
          </div>

          <form class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  :value="authStore.user?.username"
                  class="input"
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  :value="authStore.user?.email"
                  class="input"
                  placeholder="Enter email"
                />
              </div>
            </div>
            
            <div class="flex justify-end">
              <button type="submit" class="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>

        <!-- API Keys -->
        <div class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            API Keys
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Configure your API keys for AI integrations. Keys are encrypted and stored securely.
          </p>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                OpenAI API Key
              </label>
              <div class="flex space-x-2">
                <input
                  v-model="apiKeys.openai"
                  :type="showApiKey ? 'text' : 'password'"
                  class="input flex-1"
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  @click="showApiKey = !showApiKey"
                  class="btn btn-secondary"
                >
                  <Eye v-if="!showApiKey" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Required for ChatGPT integration. Get your key from 
                <a href="https://platform.openai.com/api-keys" target="_blank" class="text-primary-600 hover:text-primary-700">
                  OpenAI Platform
                </a>
              </p>
            </div>
          </div>
          
          <div class="flex justify-end mt-4">
            <button class="btn btn-primary">
              Save API Keys
            </button>
          </div>
        </div>

        <!-- Preferences -->
        <div class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Preferences
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Theme
              </label>
              <select class="input">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default AI Model
              </label>
              <select class="input">
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
            
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                  Email Notifications
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Receive notifications about project updates
                </p>
              </div>
              <button
                type="button"
                class="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                :class="{ 'bg-primary-600': notifications }"
                @click="notifications = !notifications"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="{ 'translate-x-6': notifications, 'translate-x-1': !notifications }"
                />
              </button>
            </div>
          </div>
          
          <div class="flex justify-end mt-4">
            <button class="btn btn-primary">
              Save Preferences
            </button>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="card p-6 border-red-200 dark:border-red-800">
          <h2 class="text-lg font-semibold text-red-900 dark:text-red-400 mb-4">
            Danger Zone
          </h2>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
              <div>
                <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                  Delete Account
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <button class="btn btn-danger">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ChevronRight, Camera, Eye, EyeOff } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const showApiKey = ref(false)
const notifications = ref(true)

const apiKeys = reactive({
  openai: ''
})

const formatDate = (date: Date | string | undefined | null) => {
  // Handle null, undefined, or invalid dates
  if (!date) {
    return 'Unknown'
  }
  
  // Convert string to Date object if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }
  
  // Use relative time formatting
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.ceil((dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    'day'
  )
}

// Alternative: For ProjectView.vue that uses a different format:
const formatDateLong = (date: Date | string | undefined | null) => {
  if (!date) {
    return 'Unknown'
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>