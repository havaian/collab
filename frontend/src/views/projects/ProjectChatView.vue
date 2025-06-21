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
                {{ project?.name }} - Chat
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                AI-powered collaboration
              </p>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <div class="flex -space-x-2">
                <div
                  v-for="user in onlineUsers"
                  :key="user.id"
                  class="w-8 h-8 bg-gray-300 rounded-full border-2 border-white dark:border-gray-800"
                  :title="user.username"
                >
                  <img
                    v-if="user.avatar"
                    :src="user.avatar"
                    :alt="user.username"
                    class="w-full h-full rounded-full"
                  />
                </div>
              </div>
              <span class="text-sm text-gray-600 dark:text-gray-300">
                {{ onlineUsers.length }} online
              </span>
            </div>
            <button
              @click="clearChat"
              class="btn btn-secondary btn-sm"
            >
              <Trash2 class="w-4 h-4 mr-2" />
              Clear Chat
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Chat Container -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Chat Messages -->
      <div class="flex-1 flex flex-col">
        <!-- Messages Area -->
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto p-4 space-y-4"
        >
          <div v-if="loading" class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p class="mt-2 text-gray-500 dark:text-gray-400">Loading chat history...</p>
          </div>

          <div v-else-if="messages.length === 0" class="text-center py-12">
            <MessageSquare class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Start a conversation
            </h3>
            <p class="mt-2 text-gray-500 dark:text-gray-400">
              Ask questions, get AI assistance, or collaborate with your team.
            </p>
          </div>

          <div
            v-for="message in messages"
            :key="message.id"
            class="flex"
            :class="{ 'justify-end': message.type === 'user' }"
          >
            <div
              class="max-w-3xl"
              :class="{
                'bg-primary-600 text-white': message.type === 'user',
                'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700': message.type === 'assistant',
                'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800': message.type === 'system'
              }"
            >
              <div class="px-4 py-3 rounded-lg">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <div
                      v-if="message.type === 'user'"
                      class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                    >
                      <User class="w-4 h-4" />
                    </div>
                    <div
                      v-else-if="message.type === 'assistant'"
                      class="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center"
                    >
                      <Bot class="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div
                      v-else
                      class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center"
                    >
                      <Info class="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-2 mb-1">
                      <p
                        class="text-sm font-medium"
                        :class="{
                          'text-white/90': message.type === 'user',
                          'text-gray-900 dark:text-white': message.type === 'assistant',
                          'text-yellow-800 dark:text-yellow-200': message.type === 'system'
                        }"
                      >
                        {{ getMessageAuthor(message) }}
                      </p>
                      <p
                        class="text-xs"
                        :class="{
                          'text-white/70': message.type === 'user',
                          'text-gray-500 dark:text-gray-400': message.type === 'assistant',
                          'text-yellow-600 dark:text-yellow-400': message.type === 'system'
                        }"
                      >
                        {{ formatTime(message.timestamp) }}
                      </p>
                    </div>
                    <div
                      class="prose prose-sm max-w-none"
                      :class="{
                        'prose-invert': message.type === 'user',
                        'dark:prose-invert': message.type !== 'user'
                      }"
                      v-html="formatMessage(message.content)"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Typing Indicators -->
          <div v-if="typingUsers.length > 0" class="flex">
            <div class="max-w-3xl bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
              <div class="flex items-center space-x-2">
                <div class="flex space-x-1">
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-300">
                  {{ typingUsers.join(', ') }} 
                  {{ typingUsers.length === 1 ? 'is' : 'are' }} typing...
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Input -->
        <div class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <form @submit.prevent="sendMessage" class="flex space-x-4">
            <div class="flex-1">
              <textarea
                v-model="newMessage"
                @keydown="handleKeyDown"
                @input="handleTyping"
                rows="1"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none dark:bg-gray-700 dark:text-white"
                placeholder="Type your message... (Shift+Enter for new line)"
                :disabled="sending"
              ></textarea>
            </div>
            <button
              type="submit"
              :disabled="!newMessage.trim() || sending"
              class="btn btn-primary px-6 disabled:opacity-50"
            >
              {{ sending ? 'Sending...' : 'Send' }}
              <Send class="w-4 h-4 ml-2" />
            </button>
          </form>
          
          <!-- Context Selection -->
          <div v-if="availableContext.length > 0" class="mt-3">
            <div class="flex items-center space-x-2 text-sm">
              <span class="text-gray-600 dark:text-gray-400">Include context:</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="context in availableContext"
                  :key="context.id"
                  @click="toggleContext(context.id)"
                  class="px-2 py-1 text-xs rounded-md border"
                  :class="selectedContext.includes(context.id) 
                    ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900 dark:border-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'"
                >
                  {{ context.title }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
        <!-- Context Panel -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Project Context
          </h3>
          <div class="space-y-2">
            <div
              v-for="item in contextItems"
              :key="item.id"
              class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ item.title }}
                </h4>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ item.type }}
                </span>
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {{ item.content.substring(0, 100) }}...
              </p>
            </div>
          </div>
        </div>

        <!-- Online Users -->
        <div class="p-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Online Now
          </h3>
          <div class="space-y-2">
            <div
              v-for="user in onlineUsers"
              :key="user.id"
              class="flex items-center space-x-3"
            >
              <div class="relative">
                <img
                  v-if="user.avatar"
                  :src="user.avatar"
                  :alt="user.username"
                  class="w-8 h-8 rounded-full"
                />
                <div v-else class="w-8 h-8 bg-gray-300 rounded-full"></div>
                <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
              </div>
              <span class="text-sm text-gray-900 dark:text-white">
                {{ user.username }}
              </span>
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
import { 
  ArrowLeft, MessageSquare, User, Bot, Info, Send, Trash2 
} from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'
import { useAIStore } from '@/stores/ai'
import { chatAPI } from '@/services/api'
import socketService from '@/services/socket'
import type { ChatMessage, Project, KnowledgeItem } from '@/types'

const route = useRoute()
const projectsStore = useProjectsStore()
const aiStore = useAIStore()

const id = computed(() => route.params.id as string)
const project = ref<Project | null>(null)
const loading = ref(false)
const newMessage = ref('')
const messagesContainer = ref<HTMLElement>()

const onlineUsers = ref([
  { id: '1', username: 'You', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400' }
])

const typingUsers = ref<string[]>([])
const contextItems = ref<KnowledgeItem[]>([])
const availableContext = ref<any[]>([])
const selectedContext = ref<string[]>([])

let typingTimer: NodeJS.Timeout | null = null

const getMessageAuthor = (message: ChatMessage) => {
  switch (message.type) {
    case 'user':
      return 'You'
    case 'assistant':
      return 'AI Assistant'
    case 'system':
      return 'System'
    default:
      return 'Unknown'
  }
}

const formatTime = (timestamp: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(timestamp))
}

const formatMessage = (content: string) => {
  // Simple markdown-like formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">$1</code>')
    .replace(/\n/g, '<br>')
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return

  const messageContent = newMessage.value.trim()
  newMessage.value = ''
  sending.value = true

  // Add user message immediately
  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    type: 'user',
    author: 'user',
    content: messageContent,
    timestamp: new Date(),
    context: selectedContext.value
  }

  messages.value.push(userMessage)
  scrollToBottom()

  try {
    // Send to API
    const response = await chatAPI.sendMessage(
      id.value,
      messageContent,
      selectedContext.value
    )

    // Add AI response
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      author: 'assistant',
      content: response.data.message,
      timestamp: new Date()
    }

    messages.value.push(aiMessage)
    scrollToBottom()

  } catch (error) {
    console.error('Failed to send message:', error)
    
    // Add error message
    const errorMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'system',
      author: 'system',
      content: 'Failed to send message. Please try again.',
      timestamp: new Date()
    }

    messages.value.push(errorMessage)
    scrollToBottom()
  } finally {
    sending.value = false
    selectedContext.value = []
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const handleTyping = () => {
  socketService.emitChatTyping(id.value, true)
  
  if (typingTimer) clearTimeout(typingTimer)
  
  typingTimer = setTimeout(() => {
    socketService.emitChatTyping(id.value, false)
  }, 2000)
}

const toggleContext = (contextId: string) => {
  const index = selectedContext.value.indexOf(contextId)
  if (index > -1) {
    selectedContext.value.splice(index, 1)
  } else {
    selectedContext.value.push(contextId)
  }
}

const clearChat = async () => {
  if (confirm('Are you sure you want to clear all chat messages? This action cannot be undone.')) {
    try {
      await chatAPI.clearChat(id.value)
      messages.value = []
    } catch (error) {
      console.error('Failed to clear chat:', error)
    }
  }
}

const loadChatHistory = async () => {
  loading.value = true
  try {
    const response = await chatAPI.getMessages(id.value)
    messages.value = response.data.messages || []
    scrollToBottom()
  } catch (error) {
    console.error('Failed to load chat history:', error)
  } finally {
    loading.value = false
  }
}

const loadProject = async () => {
  try {
    const response = await projectsStore.getProject(id.value)
    project.value = response
  } catch (error) {
    console.error('Failed to load project:', error)
  }
}

const setupSocketListeners = () => {
  // Join project room
  socketService.joinProject(id.value)

  // Listen for new messages
  socketService.onChatMessage((message: ChatMessage) => {
    messages.value.push(message)
    scrollToBottom()
  })

  // Listen for typing indicators
  socketService.onChatTyping((data) => {
    if (data.isTyping) {
      if (!typingUsers.value.includes(data.username)) {
        typingUsers.value.push(data.username)
      }
    } else {
      const index = typingUsers.value.indexOf(data.username)
      if (index > -1) {
        typingUsers.value.splice(index, 1)
      }
    }
  })

  // Listen for user presence
  socketService.onUserJoined((user) => {
    if (!onlineUsers.value.find(u => u.id === user.id)) {
      onlineUsers.value.push(user)
    }
  })

  socketService.onUserLeft((userId) => {
    const index = onlineUsers.value.findIndex(u => u.id === userId)
    if (index > -1) {
      onlineUsers.value.splice(index, 1)
    }
  })
}

onMounted(async () => {
  await loadProject()
  await loadChatHistory()
  setupSocketListeners()
})

onUnmounted(() => {
  socketService.leaveProject(id.value)
  socketService.off('chat:message')
  socketService.off('chat:typing')
  socketService.off('user:joined')
  socketService.off('user:left')
  
  if (typingTimer) clearTimeout(typingTimer)
})

watch(() => route.params.id, async (newId) => {
  if (newId) {
    await loadProject()
    await loadChatHistory()
  }
})
</script>