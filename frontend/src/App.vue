<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'

const authStore = useAuthStore()
const projectsStore = useProjectsStore()

onMounted(() => {
  // Initialize authentication state from localStorage
  console.log('Initializing app stores...')
  
  authStore.initializeAuth()
  projectsStore.initializeProjects()
  
  console.log('App stores initialized:', {
    isAuthenticated: authStore.isAuthenticated,
    projectsCount: projectsStore.projects.length
  })
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