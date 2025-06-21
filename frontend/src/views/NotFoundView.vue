<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
    <div class="text-center">
      <div class="mb-8">
        <div class="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">
          404
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Page Not Found
        </h1>
        <p class="text-gray-600 dark:text-gray-300 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      
      <div class="space-y-4">
        <router-link
          to="/dashboard"
          class="btn btn-primary"
        >
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to Dashboard
        </router-link>
        
        <div>
          <router-link
            to="/"
            class="text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm"
          >
            Or go back to homepage
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
</script>