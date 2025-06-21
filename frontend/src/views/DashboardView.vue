<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <FileCode class="w-5 h-5 text-white" />
              </div>
            </div>
            <div class="ml-4">
              <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
                Dashboard
              </h1>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <button class="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <Bell class="w-5 h-5" />
            </button>
            <div class="relative">
              <img
                class="h-8 w-8 rounded-full"
                :src="authStore.user?.avatar || ''"
                :alt="authStore.user?.username"
              />
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Welcome Section -->
      <div class="px-4 py-6 sm:px-0">
        <div class="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome back, {{ authStore.user?.username }}!
          </h2>
          <p class="text-gray-600 dark:text-gray-300 mb-6">
            Ready to collaborate on your projects?
          </p>
          <router-link to="/projects" class="btn btn-primary">
            <Plus class="w-4 h-4 mr-2" />
            View Projects
          </router-link>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <FolderOpen class="h-6 w-6 text-gray-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Projects
                  </dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ projectsStore.projects.length }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Users class="h-6 w-6 text-gray-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Collaborations
                  </dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ collaborationCount }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Clock class="h-6 w-6 text-gray-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Recent Activity
                  </dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">
                    2 hours ago
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Projects -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Recent Projects
          </h3>
          <div class="mt-5">
            <div v-if="projectsStore.loading" class="text-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
            <div v-else-if="projectsStore.projects.length === 0" class="text-center py-8">
              <FolderOpen class="mx-auto h-12 w-12 text-gray-400" />
              <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No projects yet
              </h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new project.
              </p>
              <div class="mt-6">
                <router-link to="/projects" class="btn btn-primary">
                  <Plus class="w-4 h-4 mr-2" />
                  Create Project
                </router-link>
              </div>
            </div>
            <div v-else class="space-y-4">
              <div
                v-for="project in recentProjects"
                :key="project.id"
                class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                    <FolderOpen class="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ project.name }}
                    </h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ project.description }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDate(project.updatedAt) }}
                  </span>
                  <router-link
                    :to="`/projects/${project.id}`"
                    class="btn btn-secondary btn-sm"
                  >
                    Open
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { FileCode, Bell, Plus, FolderOpen, Users, Clock } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { formatRelativeTime } from '@/utils/dateUtils'

const authStore = useAuthStore()
const projectsStore = useProjectsStore()

const recentProjects = computed(() => {
  return projectsStore.projects.slice(0, 5) // Show only 5 most recent
})

const collaborationCount = computed(() => {
  return projectsStore.projects.filter(p => 
    p.collaborators.length > 1
  ).length
})

// Remove the old formatDate function - use formatRelativeTime from utils instead

onMounted(async () => {
  if (projectsStore.projects.length === 0) {
    await projectsStore.fetchProjects()
  }
})
</script>

<!-- In template, change: {{ formatDate(project.updatedAt) }} to {{ formatRelativeTime(project.updatedAt) }} -->