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
                {{ project?.name || 'Loading...' }} - Files
              </h1>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <button
              @click="showCreateFileModal = true"
              class="btn btn-primary"
            >
              <Plus class="w-4 h-4 mr-2" />
              New File
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
            class="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FileText class="w-4 h-4 inline mr-2" />
            Overview
          </router-link>
          
          <router-link
            :to="`/projects/${id}/files`"
            class="py-4 px-1 border-b-2 font-medium text-sm border-primary-500 text-primary-600 dark:text-primary-400"
          >
            <FileCode class="w-4 h-4 inline mr-2" />
            Files
          </router-link>
          
          <router-link
            :to="`/projects/${id}/chat`"
            class="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <MessageSquare class="w-4 h-4 inline mr-2" />
            Chat
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- File Explorer -->
        <div class="lg:col-span-1">
          <div class="card p-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Project Files
            </h2>
            
            <div v-if="files.length === 0" class="text-center py-8">
              <FileCode class="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p class="text-sm text-gray-500 dark:text-gray-400">
                No files yet
              </p>
              <button
                @click="showCreateFileModal = true"
                class="btn btn-secondary text-sm mt-2"
              >
                Create First File
              </button>
            </div>
            
            <div v-else class="space-y-1">
              <div
                v-for="file in files"
                :key="file.id"
                class="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                :class="{ 'bg-primary-50 dark:bg-primary-900': selectedFile?.id === file.id }"
                @click="selectFile(file)"
              >
                <FileCode class="w-4 h-4 text-gray-400 mr-2" />
                <span class="text-sm text-gray-900 dark:text-white truncate">
                  {{ file.name }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Code Editor -->
        <div class="lg:col-span-3">
          <div v-if="!selectedFile" class="card p-8 text-center">
            <FileCode class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Select a file to edit
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              Choose a file from the sidebar or create a new one to get started.
            </p>
          </div>
          
          <div v-else class="card">
            <!-- File Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center space-x-2">
                <FileCode class="w-4 h-4 text-gray-400" />
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ selectedFile.name }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ selectedFile.language }}
                </span>
              </div>
              
              <div class="flex items-center space-x-2">
                <button
                  @click="saveFile"
                  :disabled="!hasChanges"
                  class="btn btn-primary text-sm"
                  :class="{ 'opacity-50 cursor-not-allowed': !hasChanges }"
                >
                  <Save class="w-4 h-4 mr-1" />
                  Save
                </button>
                <button class="btn btn-secondary text-sm">
                  <MoreHorizontal class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Monaco Editor Container -->
            <div class="relative">
              <div
                ref="editorContainer"
                class="h-96 bg-gray-900"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create File Modal -->
    <div
      v-if="showCreateFileModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showCreateFileModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
        @click.stop
      >
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Create New File
        </h2>
        
        <form @submit.prevent="createFile" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              File Name *
            </label>
            <input
              v-model="newFile.name"
              type="text"
              required
              class="input"
              placeholder="e.g., main.js, index.html, README.md"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              File Type
            </label>
            <select v-model="newFile.type" class="input">
              <option value="code">Code</option>
              <option value="text">Text</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="showCreateFileModal = false"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!newFile.name.trim()"
              class="btn btn-primary"
            >
              Create File
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowLeft,
  FileText,
  FileCode,
  MessageSquare,
  Plus,
  Save,
  MoreHorizontal
} from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'
import type { ProjectFile } from '@/types'

const route = useRoute()
const projectsStore = useProjectsStore()

const id = computed(() => route.params.id as string)
const project = computed(() => projectsStore.getProject(id.value))

const editorContainer = ref<HTMLElement>()
const selectedFile = ref<ProjectFile | null>(null)
const files = ref<ProjectFile[]>([])
const hasChanges = ref(false)
const showCreateFileModal = ref(false)

const newFile = reactive({
  name: '',
  type: 'code' as 'code' | 'text' | 'markdown'
})

// Mock files data
const mockFiles: ProjectFile[] = [
  {
    id: '1',
    projectId: id.value,
    name: 'main.js',
    path: '/main.js',
    type: 'code',
    content: '// Welcome to your project!\nconsole.log("Hello, World!");',
    language: 'javascript',
    version: 1,
    lastModified: new Date(),
    lastModifiedBy: '1',
    history: []
  },
  {
    id: '2',
    projectId: id.value,
    name: 'README.md',
    path: '/README.md',
    type: 'markdown',
    content: '# Project README\n\nThis is your collaborative project with AI assistance.',
    language: 'markdown',
    version: 1,
    lastModified: new Date(),
    lastModifiedBy: '1',
    history: []
  }
]

const selectFile = (file: ProjectFile) => {
  selectedFile.value = file
  hasChanges.value = false
  
  nextTick(() => {
    initializeMonaco()
  })
}

const initializeMonaco = async () => {
  if (!editorContainer.value || !selectedFile.value) return
  
  try {
    // For now, just show a placeholder for Monaco editor
    // In a real implementation, you would initialize Monaco Editor here
    editorContainer.value.innerHTML = `
      <div class="p-4 text-gray-600 dark:text-gray-300">
        <p class="mb-2"><strong>File:</strong> ${selectedFile.value.name}</p>
        <p class="mb-4"><strong>Type:</strong> ${selectedFile.value.type}</p>
        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm">
          <pre>${selectedFile.value.content}</pre>
        </div>
        <p class="text-xs text-gray-500 mt-4">
          Monaco Editor will be integrated here for real-time collaborative editing
        </p>
      </div>
    `
  } catch (error) {
    console.error('Failed to initialize Monaco editor:', error)
  }
}

const saveFile = () => {
  if (!selectedFile.value) return
  
  // Mock save functionality
  console.log('Saving file:', selectedFile.value.name)
  hasChanges.value = false
  
  // In a real implementation, you would call an API to save the file
}

const createFile = () => {
  const file: ProjectFile = {
    id: String(Date.now()),
    projectId: id.value,
    name: newFile.name,
    path: `/${newFile.name}`,
    type: newFile.type,
    content: newFile.type === 'markdown' ? '# New File\n\nStart writing...' : '// New file\n',
    language: getLanguageFromExtension(newFile.name),
    version: 1,
    lastModified: new Date(),
    lastModifiedBy: '1',
    history: []
  }
  
  files.value.push(file)
  selectedFile.value = file
  showCreateFileModal.value = false
  
  // Reset form
  newFile.name = ''
  newFile.type = 'code'
  
  nextTick(() => {
    initializeMonaco()
  })
}

const getLanguageFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'txt': 'plaintext'
  }
  return languageMap[ext || ''] || 'plaintext'
}

onMounted(() => {
  files.value = mockFiles
  if (files.value.length > 0) {
    selectFile(files.value[0])
  }
})
</script>