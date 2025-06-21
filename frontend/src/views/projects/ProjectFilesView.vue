<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-4">
            <router-link :to="`/projects/${id}`" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <ArrowLeft class="w-5 h-5" />
            </router-link>
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ project?.name }} - Files
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Collaborative file editing
              </p>
            </div>
          </div>
          
          <button
            @click="showCreateFileModal = true"
            class="btn btn-primary"
          >
            <Plus class="w-4 h-4 mr-2" />
            New File
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- File Explorer Sidebar -->
      <div class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">
            Project Files
          </h3>
        </div>
        
        <div class="flex-1 overflow-y-auto">
          <div v-if="filesLoading" class="p-4 text-center">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading files...</p>
          </div>
          
          <div v-else-if="files.length === 0" class="p-4 text-center">
            <FileText class="mx-auto h-8 w-8 text-gray-400" />
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No files yet</p>
            <button
              @click="showCreateFileModal = true"
              class="mt-2 text-xs text-primary-600 hover:text-primary-700"
            >
              Create your first file
            </button>
          </div>
          
          <div v-else class="p-2">
            <div
              v-for="file in files"
              :key="file.id"
              @click="selectFile(file)"
              class="flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group"
              :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedFile?.id === file.id }"
            >
              <div class="flex-shrink-0 mr-3">
                <component
                  :is="getFileIcon(file.type, file.name)"
                  class="w-4 h-4"
                  :class="getFileIconColor(file.type, file.name)"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ file.name }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatFileSize(file.content?.length || 0) }}
                </p>
              </div>
              <div class="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                <button
                  @click.stop="deleteFile(file.id)"
                  class="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- File Editor -->
      <div class="flex-1 flex flex-col">
        <div v-if="!selectedFile" class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <FileText class="mx-auto h-16 w-16 text-gray-400" />
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Select a file to edit
            </h3>
            <p class="mt-2 text-gray-500 dark:text-gray-400">
              Choose a file from the sidebar to start editing
            </p>
          </div>
        </div>

        <div v-else class="flex-1 flex flex-col">
          <!-- File Header -->
          <div class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center space-x-3">
              <component
                :is="getFileIcon(selectedFile.type, selectedFile.name)"
                class="w-5 h-5"
                :class="getFileIconColor(selectedFile.type, selectedFile.name)"
              />
              <h2 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ selectedFile.name }}
              </h2>
              <span
                v-if="hasUnsavedChanges"
                class="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded"
              >
                Unsaved changes
              </span>
            </div>
            
            <div class="flex items-center space-x-2">
              <button
                @click="runCode"
                v-if="canExecuteFile(selectedFile)"
                :disabled="executing"
                class="btn btn-primary btn-sm"
              >
                <Play class="w-4 h-4 mr-2" />
                {{ executing ? 'Running...' : 'Run' }}
              </button>
              <button
                @click="saveFile"
                :disabled="!hasUnsavedChanges || saving"
                class="btn btn-secondary btn-sm"
              >
                <Save class="w-4 h-4 mr-2" />
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
              <button
                @click="showFileHistory = true"
                class="btn btn-secondary btn-sm"
              >
                <History class="w-4 h-4 mr-2" />
                History
              </button>
            </div>
          </div>

          <!-- Monaco Editor -->
          <div ref="editorContainer" class="flex-1 relative">
            <!-- Editor will be mounted here -->
          </div>

          <!-- Code Execution Output -->
          <div
            v-if="executionResult"
            class="border-t border-gray-200 dark:border-gray-700 bg-gray-900 text-green-400 p-4 max-h-64 overflow-y-auto"
          >
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-medium text-white">Output</h4>
              <button
                @click="executionResult = null"
                class="text-gray-400 hover:text-white"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
            <pre class="text-sm font-mono whitespace-pre-wrap">{{ executionResult.output }}</pre>
            <div v-if="executionResult.error" class="mt-2 text-red-400">
              <p class="text-sm font-medium">Error:</p>
              <pre class="text-sm font-mono whitespace-pre-wrap">{{ executionResult.error }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Collaborators Panel -->
      <div class="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">
            Active Editors
          </h3>
        </div>
        
        <div class="p-4 space-y-3">
          <div
            v-for="editor in activeEditors"
            :key="editor.userId"
            class="flex items-center space-x-3"
          >
            <div class="relative">
              <img
                v-if="editor.avatar"
                :src="editor.avatar"
                :alt="editor.username"
                class="w-8 h-8 rounded-full"
              />
              <div v-else class="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div
                class="absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white dark:border-gray-800 rounded-full"
                :style="{ backgroundColor: editor.cursorColor }"
              ></div>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ editor.username }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ editor.isTyping ? 'Typing...' : 'Viewing' }}
              </p>
            </div>
          </div>
          
          <div v-if="activeEditors.length === 0" class="text-center py-4">
            <Users class="mx-auto h-8 w-8 text-gray-400" />
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No active editors
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Create File Modal -->
    <div
      v-if="showCreateFileModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click="showCreateFileModal = false"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800"
        @click.stop
      >
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white text-center">
            Create New File
          </h3>
          <form @submit.prevent="createFile" class="mt-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                File Name
              </label>
              <input
                v-model="newFile.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="example.js"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                File Type
              </label>
              <select
                v-model="newFile.type"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="code">Code File</option>
                <option value="text">Text File</option>
                <option value="markdown">Markdown File</option>
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
                class="btn btn-primary disabled:opacity-50"
              >
                Create File
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- File History Modal -->
    <div
      v-if="showFileHistory"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click="showFileHistory = false"
    >
      <div
        class="relative top-10 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800"
        @click.stop
      >
        <div class="mt-3">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              File History - {{ selectedFile?.name }}
            </h3>
            <button
              @click="showFileHistory = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X class="w-6 h-6" />
            </button>
          </div>
          
          <div class="space-y-4 max-h-96 overflow-y-auto">
            <div
              v-for="version in fileHistory"
              :key="version.version"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div class="flex items-center justify-between mb-2">
                <div>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    Version {{ version.version }}
                  </span>
                  <span class="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    by {{ version.modifiedBy }}
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatRelativeTime(file.lastModified) }}
                  </span>
                  <button
                    @click="restoreVersion(version)"
                    class="btn btn-secondary btn-sm"
                  >
                    Restore
                  </button>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ version.changes }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as monaco from 'monaco-editor'
import { 
  ArrowLeft, Plus, FileText, Trash2, Play, Save, History, 
  X, Users 
} from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'
import { filesAPI, codeExecutionAPI } from '@/services/api'
import socketService from '@/services/socket'
import type { ProjectFile, Project, FileHistory } from '@/types'
import { formatRelativeTime, formatFileSize } from '@/utils/dateUtils'

const route = useRoute()
const projectsStore = useProjectsStore()

const id = computed(() => route.params.id as string)
const project = ref<Project | null>(null)
const files = ref<ProjectFile[]>([])
const selectedFile = ref<ProjectFile | null>(null)
const filesLoading = ref(false)
const saving = ref(false)
const executing = ref(false)
const hasUnsavedChanges = ref(false)
const executionResult = ref<any>(null)

const showCreateFileModal = ref(false)
const showFileHistory = ref(false)
const fileHistory = ref<FileHistory[]>([])

const editorContainer = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

const activeEditors = ref([
  {
    userId: '1',
    username: 'You',
    avatar: '',
    cursorColor: '#3B82F6',
    isTyping: false
  }
])

const newFile = reactive({
  name: '',
  type: 'code' as 'code' | 'text' | 'markdown'
})

const getFileIcon = (type: string, name: string) => {
  const extension = name.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return 'FileText'
    case 'py':
      return 'FileText'
    case 'html':
    case 'css':
      return 'FileText'
    case 'md':
      return 'FileText'
    case 'json':
      return 'FileText'
    default:
      return 'FileText'
  }
}

const getFileIconColor = (type: string, name: string) => {
  const extension = name.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'js':
    case 'jsx':
      return 'text-yellow-500'
    case 'ts':
    case 'tsx':
      return 'text-blue-500'
    case 'py':
      return 'text-green-500'
    case 'html':
      return 'text-orange-500'
    case 'css':
      return 'text-blue-400'
    case 'md':
      return 'text-gray-600'
    case 'json':
      return 'text-purple-500'
    default:
      return 'text-gray-500'
  }
}

const canExecuteFile = (file: ProjectFile) => {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return ['js', 'py', 'ts', 'jsx', 'tsx'].includes(extension || '')
}

const getLanguageFromExtension = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'txt': 'plaintext'
  }
  return languageMap[extension || ''] || 'plaintext'
}

const setupEditor = () => {
  if (!editorContainer.value || !selectedFile.value) return

  // Dispose existing editor
  if (editor) {
    editor.dispose()
  }

  const language = getLanguageFromExtension(selectedFile.value.name)

  editor = monaco.editor.create(editorContainer.value, {
    value: selectedFile.value.content || '',
    language,
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on',
    lineNumbers: 'on',
    renderWhitespace: 'selection'
  })

  // Track changes
  editor.onDidChangeModelContent(() => {
    hasUnsavedChanges.value = true
    
    // Emit typing indicator
    socketService.emitUserTyping(id.value, selectedFile.value?.id, true)
    
    // Debounce the typing indicator
    setTimeout(() => {
      socketService.emitUserTyping(id.value, selectedFile.value?.id, false)
    }, 2000)
  })

  // Track cursor position
  editor.onDidChangeCursorPosition((e) => {
    socketService.emitCursorMove(id.value, selectedFile.value!.id, {
      line: e.position.lineNumber,
      column: e.position.column
    })
  })
}

const selectFile = async (file: ProjectFile) => {
  // Save current file if it has unsaved changes
  if (hasUnsavedChanges.value && selectedFile.value) {
    if (confirm('You have unsaved changes. Do you want to save them?')) {
      await saveFile()
    }
  }

  selectedFile.value = file
  hasUnsavedChanges.value = false
  
  await nextTick()
  setupEditor()
}

const createFile = async () => {
  try {
    const response = await filesAPI.createFile(id.value, {
      name: newFile.name,
      type: newFile.type,
      content: '',
      path: newFile.name
    })

    files.value.push(response.data.file)
    
    // Reset form
    newFile.name = ''
    newFile.type = 'code'
    showCreateFileModal.value = false
    
    // Select the new file
    await selectFile(response.data.file)
  } catch (error) {
    console.error('Failed to create file:', error)
  }
}

const saveFile = async () => {
  if (!selectedFile.value || !editor || saving.value) return

  saving.value = true
  
  try {
    const content = editor.getValue()
    
    await filesAPI.updateFile(id.value, selectedFile.value.id, {
      content,
      version: selectedFile.value.version + 1
    })

    selectedFile.value.content = content
    selectedFile.value.version += 1
    hasUnsavedChanges.value = false

    // Emit file update to other collaborators
    socketService.emitFileUpdate(selectedFile.value.id, content, id.value)
    
  } catch (error) {
    console.error('Failed to save file:', error)
  } finally {
    saving.value = false
  }
}

const deleteFile = async (fileId: string) => {
  if (confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
    try {
      await filesAPI.deleteFile(id.value, fileId)
      
      // Remove from local files
      const index = files.value.findIndex(f => f.id === fileId)
      if (index > -1) {
        files.value.splice(index, 1)
      }
      
      // Clear selection if this file was selected
      if (selectedFile.value?.id === fileId) {
        selectedFile.value = null
        if (editor) {
          editor.dispose()
          editor = null
        }
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }
}

const runCode = async () => {
  if (!selectedFile.value || !editor || executing.value) return

  executing.value = true
  executionResult.value = null

  try {
    const code = editor.getValue()
    const extension = selectedFile.value.name.split('.').pop()?.toLowerCase()
    
    // Map file extension to language ID for Judge0
    const languageIdMap: Record<string, number> = {
      'js': 63,    // JavaScript (Node.js)
      'py': 71,    // Python 3
      'ts': 74,    // TypeScript
      'cpp': 54,   // C++
      'java': 62   // Java
    }

    const languageId = languageIdMap[extension || ''] || 63

    const response = await codeExecutionAPI.executeCode(id.value, {
      code,
      languageId,
      fileId: selectedFile.value.id
    })

    executionResult.value = response.data
  } catch (error) {
    console.error('Failed to execute code:', error)
    executionResult.value = {
      output: '',
      error: 'Failed to execute code. Please try again.'
    }
  } finally {
    executing.value = false
  }
}

const loadFiles = async () => {
  filesLoading.value = true
  try {
    const response = await filesAPI.getFiles(id.value)
    files.value = response.data.files || []
  } catch (error) {
    console.error('Failed to load files:', error)
  } finally {
    filesLoading.value = false
  }
}

const loadProject = async () => {
  try {
    project.value = await projectsStore.getProject(id.value)
  } catch (error) {
    console.error('Failed to load project:', error)
  }
}

const loadFileHistory = async () => {
  if (!selectedFile.value) return
  
  try {
    const response = await filesAPI.getFileHistory(id.value, selectedFile.value.id)
    fileHistory.value = response.data.history || []
  } catch (error) {
    console.error('Failed to load file history:', error)
  }
}

const restoreVersion = async (version: FileHistory) => {
  if (!selectedFile.value || !editor) return

  if (confirm(`Are you sure you want to restore version ${version.version}? Current changes will be lost.`)) {
    editor.setValue(version.content)
    selectedFile.value.content = version.content
    hasUnsavedChanges.value = true
    showFileHistory.value = false
  }
}

const setupSocketListeners = () => {
  // Join project room
  socketService.joinProject(id.value)

  // Listen for file updates from other users
  socketService.onFileUpdate((data) => {
    if (selectedFile.value?.id === data.fileId && editor) {
      const currentPosition = editor.getPosition()
      editor.setValue(data.content)
      if (currentPosition) {
        editor.setPosition(currentPosition)
      }
    }
  })

  // Listen for user typing indicators
  socketService.onUserTyping((data) => {
    const editor = activeEditors.value.find(e => e.userId === data.userId)
    if (editor) {
      editor.isTyping = data.isTyping
    }
  })

  // Listen for cursor movements
  socketService.onCursorMove((data) => {
    // TODO: Show other users' cursors in the editor
    console.log('Cursor moved:', data)
  })
}

// Keyboard shortcuts
const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 's':
        event.preventDefault()
        saveFile()
        break
      case 'r':
        if (selectedFile.value && canExecuteFile(selectedFile.value)) {
          event.preventDefault()
          runCode()
        }
        break
    }
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeyboardShortcuts)
  
  await loadProject()
  await loadFiles()
  setupSocketListeners()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyboardShortcuts)
  
  if (editor) {
    editor.dispose()
  }
  
  socketService.leaveProject(id.value)
  socketService.off('file:updated')
  socketService.off('user:typing')
  socketService.off('cursor:move')
})

watch(() => route.params.id, async (newId) => {
  if (newId) {
    await loadProject()
    await loadFiles()
    selectedFile.value = null
    if (editor) {
      editor.dispose()
      editor = null
    }
  }
})

watch(showFileHistory, async (show) => {
  if (show) {
    await loadFileHistory()
  }
})
</script>