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
            <span class="text-gray-600 dark:text-gray-400">Projects</span>
          </div>
          
          <div class="flex items-center space-x-4">
            <button
              @click="showCreateModal = true"
              class="btn btn-primary"
            >
              <Plus class="w-4 h-4 mr-2" />
              New Project
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          My Projects
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Manage and collaborate on your projects with AI assistance.
        </p>
      </div>

      <!-- Projects Grid -->
      <div v-if="projectsStore.loading" class="text-center py-12">
        <div class="loading-spinner mx-auto mb-4"></div>
        <p class="text-gray-500 dark:text-gray-400">Loading projects...</p>
      </div>
      
      <div v-else-if="projectsStore.projects.length === 0" class="text-center py-12">
        <Folder class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No projects yet
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6">
          Create your first project to start collaborating with AI.
        </p>
        <button
          @click="showCreateModal = true"
          class="btn btn-primary"
        >
          <Plus class="w-4 h-4 mr-2" />
          Create Project
        </button>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="project in projectsStore.projects"
          :key="project.id"
          class="card hover:shadow-lg transition-shadow cursor-pointer"
          @click="$router.push(`/projects/${project.id}`)"
        >
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {{ project.name }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {{ project.description || 'No description provided' }}
                </p>
              </div>
              <div class="ml-4">
                <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                  <FileCode class="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div class="flex items-center space-x-4">
                <span class="flex items-center">
                  <Users class="w-4 h-4 mr-1" />
                  {{ project.collaborators.length }}
                </span>
                <span class="flex items-center">
                  <Clock class="w-4 h-4 mr-1" />
                  {{ formatDate(project.updatedAt) }}
                </span>
              </div>
              <span class="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Project Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showCreateModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
        @click.stop
      >
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Create New Project
        </h2>
        
        <form @submit.prevent="handleCreateProject" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Name *
            </label>
            <input
              v-model="newProject.name"
              type="text"
              required
              class="input"
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
              class="input"
              placeholder="Describe your project (optional)"
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
              :disabled="projectsStore.loading || !newProject.name.trim()"
              class="btn btn-primary"
            >
              <span v-if="!projectsStore.loading">Create Project</span>
              <span v-else class="flex items-center">
                <div class="loading-spinner mr-2"></div>
                Creating...
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  ChevronRight,
  Folder,
  FileCode,
  Users,
  Clock
} from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'

const router = useRouter()
const projectsStore = useProjectsStore()

const showCreateModal = ref(false)
const newProject = reactive({
  name: '',
  description: ''
})

const handleCreateProject = async () => {
  try {
    const project = await projectsStore.createProject(newProject)
    showCreateModal.value = false
    newProject.name = ''
    newProject.description = ''
    router.push(`/projects/${project.id}`)
  } catch (error) {
    // Error handling
  }
}

const formatDate = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

onMounted(() => {
  projectsStore.fetchProjects()
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
</style>