<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Project Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-4">
            <router-link to="/projects" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <ArrowLeft class="w-5 h-5" />
            </router-link>
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ project?.name || 'Loading...' }}
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ project?.description }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <Users class="w-4 h-4 text-gray-400" />
              <span class="text-sm text-gray-600 dark:text-gray-300">
                {{ project?.collaborators.length || 0 }} members
              </span>
            </div>
            <button class="btn btn-secondary">
              <Settings class="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Project Navigation -->
    <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex space-x-8">
          <router-link
            :to="`/projects/${id}`"
            class="py-4 px-1 border-b-2 font-medium text-sm"
            :class="$route.name === 'project' 
              ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
          >
            <FileText class="w-4 h-4 inline mr-2" />
            Overview
          </router-link>
          
          <router-link
            :to="`/projects/${id}/files`"
            class="py-4 px-1 border-b-2 font-medium text-sm"
            :class="$route.name === 'project-files' 
              ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
          >
            <FileCode class="w-4 h-4 inline mr-2" />
            Files
          </router-link>
          
          <router-link
            :to="`/projects/${id}/chat`"
            class="py-4 px-1 border-b-2 font-medium text-sm"
            :class="$route.name === 'project-chat' 
              ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
          >
            <MessageSquare class="w-4 h-4 inline mr-2" />
            Chat
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="!project" class="text-center py-12">
        <div class="loading-spinner mx-auto mb-4"></div>
        <p class="text-gray-500 dark:text-gray-400">Loading project...</p>
      </div>
      
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Project Details -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Project Info -->
          <div class="card p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Project Information
            </h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <p class="text-gray-900 dark:text-white">{{ project.name }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <p class="text-gray-600 dark:text-gray-300">
                  {{ project.description || 'No description provided' }}
                </p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created
                  </label>
                  <p class="text-gray-600 dark:text-gray-300">
                    {{ formatDate(project.createdAt) }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Updated
                  </label>
                  <p class="text-gray-600 dark:text-gray-300">
                    {{ formatDate(project.updatedAt) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="card p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <router-link
                :to="`/projects/${id}/files`"
                class="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FileCode class="w-8 h-8 text-primary-600 dark:text-primary-400 mr-3" />
                <div>
                  <h3 class="font-medium text-gray-900 dark:text-white">
                    Manage Files
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Edit and organize project files
                  </p>
                </div>
              </router-link>
              
              <router-link
                :to="`/projects/${id}/chat`"
                class="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <MessageSquare class="w-8 h-8 text-secondary-600 dark:text-secondary-400 mr-3" />
                <div>
                  <h3 class="font-medium text-gray-900 dark:text-white">
                    AI Chat
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Collaborate with ChatGPT
                  </p>
                </div>
              </router-link>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Collaborators -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Collaborators
              </h2>
              <button class="btn btn-secondary text-sm">
                <Plus class="w-4 h-4 mr-1" />
                Invite
              </button>
            </div>
            <div class="space-y-3">
              <div
                v-for="collaborator in project.collaborators"
                :key="collaborator.user"
                class="flex items-center justify-between"
              >
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <User class="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      User {{ collaborator.user }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {{ collaborator.role }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Settings -->
          <div class="card p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              AI Settings
            </h2>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AI Model
                </label>
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  {{ project.settings.aiModel }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Theme
                </label>
                <p class="text-sm text-gray-600 dark:text-gray-300 capitalize">
                  {{ project.settings.defaultTheme }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowLeft,
  Users,
  Settings,
  FileText,
  FileCode,
  MessageSquare,
  Plus,
  User
} from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'

const route = useRoute()
const projectsStore = useProjectsStore()

const id = computed(() => route.params.id as string)
const project = computed(() => projectsStore.getProject(id.value))

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(() => {
  if (!project.value) {
    projectsStore.fetchProjects()
  }
})
</script>