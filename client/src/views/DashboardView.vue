<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Navigation -->
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              GPT Collab
            </h1>
          </div>
          
          <div class="flex items-center space-x-4">
            <button class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <Bell class="w-5 h-5" />
            </button>
            
            <div class="relative">
              <button
                @click="showProfileMenu = !showProfileMenu"
                class="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <img
                  :src="authStore.user?.avatar"
                  :alt="authStore.user?.username"
                  class="w-8 h-8 rounded-full"
                />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ authStore.user?.username }}
                </span>
                <ChevronDown class="w-4 h-4 text-gray-400" />
              </button>
              
              <!-- Profile Dropdown -->
              <div
                v-if="showProfileMenu"
                class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
              >
                <div class="py-1">
                  <router-link
                    to="/profile"
                    class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    @click="showProfileMenu = false"
                  >
                    <User class="w-4 h-4 mr-2" />
                    Profile
                  </router-link>
                  <button
                    @click="handleLogout"
                    class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <LogOut class="w-4 h-4 mr-2" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {{ authStore.user?.username }}!
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Here's what's happening with your collaborative projects.
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <router-link
          to="/projects"
          class="card p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div class="flex items-center">
            <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <Folder class="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                My Projects
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ projectsStore.projects.length }} active projects
              </p>
            </div>
          </div>
        </router-link>

        <button
          @click="showCreateProjectModal = true"
          class="card p-6 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <div class="flex items-center">
            <div class="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Plus class="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                New Project
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Start collaborating
              </p>
            </div>
          </div>
        </button>

        <div class="card p-6">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-secondary-100 dark:bg-secondary-900 rounded-lg flex items-center justify-center">
              <Users class="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Collaborators
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                3 team members
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Projects -->
      <div class="card">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            Recent Projects
          </h2>
        </div>
        
        <div v-if="projectsStore.loading" class="p-6 text-center">
          <div class="loading-spinner mx-auto"></div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Loading projects...
          </p>
        </div>
        
        <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="project in projectsStore.projects.slice(0, 5)"
            :key="project.id"
            class="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            @click="$router.push(`/projects/${project.id}`)"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ project.name }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {{ project.description }}
                </p>
                <div class="flex items-center mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>{{ project.collaborators.length }} collaborators</span>
                  <span class="mx-2">•</span>
                  <span>Updated {{ formatDate(project.updatedAt) }}</span>
                </div>
              </div>
              <ChevronRight class="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Project Modal -->
    <div
      v-if="showCreateProjectModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showCreateProjectModal = false"
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
              Project Name
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
              placeholder="Describe your project"
            ></textarea>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="showCreateProjectModal = false"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="projectsStore.loading"
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
  Bell,
  ChevronDown,
  User,
  LogOut,
  Folder,
  Plus,
  Users,
  ChevronRight
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'

const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()

const showProfileMenu = ref(false)
const showCreateProjectModal = ref(false)

const newProject = reactive({
  name: '',
  description: ''
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const handleCreateProject = async () => {
  try {
    const project = await projectsStore.createProject(newProject)
    showCreateProjectModal.value = false
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