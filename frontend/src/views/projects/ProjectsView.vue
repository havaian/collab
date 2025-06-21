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

      <!-- Error State -->
      <div v-else-if="projectsStore.error" class="text-center py-12">
        <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4 max-w-md mx-auto">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
                Error loading projects
              </h3>
              <p class="mt-2 text-sm text-red-700 dark:text-red-300">
                {{ projectsStore.error }}
              </p>
              <button
                @click="loadProjects"
                class="mt-3 btn btn-primary btn-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
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
                    Updated {{ formatRelativeDate(project.updatedAt) }}
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
                      @click="confirmDeleteProject(project)"
                      class="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 class="w-4 h-4 inline mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p class="mt-4 text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
              {{ project.description || 'No description provided' }}
            </p>

            <div class="mt-4 flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="flex items-center space-x-1">
                  <Users class="w-4 h-4 text-gray-400" />
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    {{ project.collaborators?.length || 0 }} member{{ (project.collaborators?.length || 0) !== 1 ? 's' : '' }}
                  </span>
                </div>
                <div class="flex items-center space-x-1">
                  <FileText class="w-4 h-4 text-gray-400" />
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    {{ project.filesCount || 0 }} files
                  </span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div class="flex -space-x-2">
                  <div
                    v-for="(collaborator, index) in (project.collaborators || []).slice(0, 3)"
                    :key="collaborator.user || index"
                    class="w-6 h-6 bg-gray-300 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center"
                    :class="{ 'z-10': index === 0, 'z-20': index === 1, 'z-30': index === 2 }"
                  >
                    <User class="w-3 h-3 text-gray-600" />
                  </div>
                  <div
                    v-if="(project.collaborators?.length || 0) > 3"
                    class="w-6 h-6 bg-gray-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center z-40"
                  >
                    <span class="text-xs text-white">+{{ (project.collaborators?.length || 0) - 3 }}</span>
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
      @click="closeCreateModal"
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
                Project Name *
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
                placeholder="Describe your project (optional)"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visibility
              </label>
              <select
                v-model="newProject.visibility"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
            
            <!-- Error display -->
            <div v-if="createError" class="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
              <p class="text-sm text-red-700 dark:text-red-300">
                {{ createError }}
              </p>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeCreateModal"
                class="btn btn-secondary"
                :disabled="isCreating"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!newProject.name.trim() || isCreating"
                class="btn btn-primary disabled:opacity-50"
              >
                <span v-if="isCreating">Creating...</span>
                <span v-else>Create Project</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click="showDeleteModal = false"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800"
        @click.stop
      >
        <div class="mt-3 text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
            <Trash2 class="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mt-4">
            Delete Project
          </h3>
          <div class="mt-2">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete "{{ projectToDelete?.name }}"? This action cannot be undone.
            </p>
          </div>
          <div class="flex justify-center space-x-3 mt-6">
            <button
              @click="showDeleteModal = false"
              class="btn btn-secondary"
              :disabled="isDeleting"
            >
              Cancel
            </button>
            <button
              @click="deleteProject"
              class="btn btn-danger"
              :disabled="isDeleting"
            >
              <span v-if="isDeleting">Deleting...</span>
              <span v-else>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Users,
  FileText,
  MessageSquare,
  Plus,
  User,
  FolderOpen,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'

// Router and store
const router = useRouter()
const projectsStore = useProjectsStore()

// Reactive data
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const activeProjectMenu = ref<string | null>(null)
const isCreating = ref(false)
const isDeleting = ref(false)
const createError = ref<string | null>(null)
const projectToDelete = ref<any>(null)

// New project form data
const newProject = ref({
  name: '',
  description: '',
  visibility: 'private' as 'private' | 'public'
})

// Methods
const loadProjects = async () => {
  try {
    await projectsStore.fetchProjects()
  } catch (error) {
    console.error('Failed to load projects:', error)
  }
}

const createProject = async () => {
  if (!newProject.value.name.trim()) return

  isCreating.value = true
  createError.value = null

  try {
    const projectData = {
      name: newProject.value.name.trim(),
      description: newProject.value.description.trim(),
      visibility: newProject.value.visibility,
      settings: {}
    }

    await projectsStore.createProject(projectData)
    
    // Reset form and close modal
    newProject.value = {
      name: '',
      description: '',
      visibility: 'private'
    }
    showCreateModal.value = false
    
    // Optionally redirect to the new project
    // router.push(`/projects/${newProjectId}`)
    
  } catch (error: any) {
    console.error('Failed to create project:', error)
    createError.value = error.message || 'Failed to create project'
  } finally {
    isCreating.value = false
  }
}

const closeCreateModal = () => {
  showCreateModal.value = false
  createError.value = null
  newProject.value = {
    name: '',
    description: '',
    visibility: 'private'
  }
}

const toggleProjectMenu = (projectId: string) => {
  activeProjectMenu.value = activeProjectMenu.value === projectId ? null : projectId
}

const editProject = (project: any) => {
  // Close menu
  activeProjectMenu.value = null
  
  // Navigate to project settings or open edit modal
  router.push(`/projects/${project.id}/settings`)
}

const confirmDeleteProject = (project: any) => {
  projectToDelete.value = project
  showDeleteModal.value = true
  activeProjectMenu.value = null
}

const deleteProject = async () => {
  if (!projectToDelete.value) return

  isDeleting.value = true

  try {
    await projectsStore.deleteProject(projectToDelete.value.id)
    showDeleteModal.value = false
    projectToDelete.value = null
  } catch (error: any) {
    console.error('Failed to delete project:', error)
    // You might want to show an error message here
  } finally {
    isDeleting.value = false
  }
}

// Utility function for relative dates
const formatRelativeDate = (date: string | Date) => {
  const now = new Date()
  const target = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
  
  return target.toLocaleDateString()
}

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (activeProjectMenu.value) {
    activeProjectMenu.value = null
  }
}

// Lifecycle
onMounted(() => {
  loadProjects()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors;
}

.btn-primary {
  @apply text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500;
}

.btn-secondary {
  @apply text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600;
}

.btn-danger {
  @apply text-white bg-red-600 hover:bg-red-700 focus:ring-red-500;
}

.btn-sm {
  @apply px-3 py-1.5 text-xs;
}
</style>