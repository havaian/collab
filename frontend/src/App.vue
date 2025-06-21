<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // Initialize authentication state from localStorage
  authStore.initializeAuth()
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  background-color: #f9fafb;
  transition: background-color 0.3s;
}

.dark .app {
  background-color: #111827;
}
</style>