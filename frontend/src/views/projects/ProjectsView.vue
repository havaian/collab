<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <router-link to="/dashboard" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-4">
              <ArrowLeft class="w-5 h-5" />
            </router-link>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              Projects
            </h1>
          </div>
          <button
            @click="showCreateModal = true"
            class="btn btn-primary"
          >
            <Plus class="w-4 h-4 mr-2" />
            New Project
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="projectsStore.loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-300">Loading projects...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="projectsStore.projects.length === 0" class="text-center py-12">
        <FolderOpen class="mx-auto h-16 w-16 text-gray-400" />
        <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          No projects yet
        </h3>
        <p class="mt-2 text-gray-500 dark:text-gray-400">
          Get started by creating your first collaborative project.
        </p>
        <div class="mt-6">
          <button
            @click="showCreateModal = true"
            class="btn btn-primary"
          >
            <Plus class="w-4 h-4 mr-2" />
            Create Your First Project
          </button>
        </div>
      </div>

      <!-- Projects Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="project in projectsStore.projects"
          :key="project.id"
          class="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                  <FolderOpen class="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div class="ml-3">
                  <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ project.name }}
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Created {{ formatDate(project.createdAt) }}
                  </p>
                </div>
              </div>
              <div class="relative">
                <button
                  @click="toggleProjectMenu(project.id)"
                  class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <MoreVertical class="w-4 h-4" />
                </button>
                <div
                  v-if="activeProjectMenu === project.id"
                  class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-600"
                >
                  <div class="py-1">
                    <button
                      @click="editProject(project)"
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <Edit class="w-4 h-4 inline mr-2" />
                      Edit
                    </button>
                    <button
                      @click="deleteProject(project.id)"
                      class="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 class="w-4 h-4 inline mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p class="mt-4 text-gray-600 dark:text-gray-300 text-sm">
              {{ project.description }}
            </p>

            <div class="mt-4 flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <Users class="w-4 h-4 text-gray-400" />
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {{ project.collaborators.length }} member{{ project.collaborators.length !== 1 ? 's' : '' }}
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="flex -space-x-2">
                  <div
                    v-for="(collaborator, index) in project.collaborators.slice(0, 3)"
                    :key="collaborator.user"
                    class="w-6 h-6 bg-gray-300 rounded-full border-2 border-white dark:border-gray-800"
                    :class="{ 'z-10': index === 0, 'z-20': index === 1, 'z-30': index === 2 }"
                  >
                    <!-- Avatar placeholder -->
                  </div>
                  <div
                    v-if="project.collaborators.length > 3"
                    class="w-6 h-6 bg-gray-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center z-40"
                  >
                    <span class="text-xs text-white">+{{ project.collaborators.length - 3 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6 flex space-x-3">
              <router-link
                :to="`/projects/${project.id}`"
                class="flex-1 btn btn-primary btn-sm"
              >
                Open Project
              </router-link>
              <router-link
                :to="`/projects/${project.id}/chat`"
                class="btn btn-secondary btn-sm"
              >
                <MessageSquare class="w-4 h-4" />
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Project Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click="showCreateModal = false"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800"
        @click.stop
      >
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white text-center">
            Create New Project
          </h3>
          <form @submit.prevent="createProject" class="mt-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Name
              </label>
              <input
                v-model="newProject.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                v-model="newProject.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe your project"
              ></textarea>
            </div>
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showCreateModal = false"
                class="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!newProject.name.trim()"
                class="btn btn-primary disabled:opacity-50"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
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
import { formatLongDate } from '@/utils/dateUtils'

const route = useRoute()
const projectsStore = useProjectsStore()

const id = computed(() => route.params.id as string)
const project = computed(() => projectsStore.getProject(id.value))

// Remove the old formatDate function - use formatLongDate from utils instead

onMounted(() => {
  if (!project.value) {
    projectsStore.fetchProjects()
  }
})
</script>

<!-- In template, change: {{ formatDate(project.createdAt) }} to {{ formatLongDate(project.createdAt) }} -->
<!-- And: {{ formatDate(project.updatedAt) }} to {{ formatLongDate(project.updatedAt) }} -->