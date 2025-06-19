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
                {{ project?.name || 'Loading...' }} - AI Chat
              </h1>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>GPT-4 Active</span>
            </div>
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
            class="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FileCode class="w-4 h-4 inline mr-2" />
            Files
          </router-link>
          
          <router-link
            :to="`/projects/${id}/chat`"
            class="py-4 px-1 border-b-2 font-medium text-sm border-primary-500 text-primary-600 dark:text-primary-400"
          >
            <MessageSquare class="w-4 h-4 inline mr-2" />
            Chat
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Chat Interface -->
    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="card flex flex-col h-[calc(100vh-12rem)]">
        <!-- Chat Messages -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <div v-if="messages.length === 0" class="text-center py-12">
            <MessageSquare class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Start chatting with AI
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              Ask questions about your project, get code suggestions, or brainstorm ideas.
            </p>
          </div>
          
          <div
            v-for="message in messages"
            :key="message.id"
            class="flex"
            :class="message.type === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-3xl rounded-lg px-4 py-3"
              :class="message.type === 'user' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'"
            >
              <div class="flex items-start space-x-2">
                <div v-if="message.type === 'assistant'" class="flex-shrink-0">
                  <div class="w-6 h-6 bg-secondary-100 dark:bg-secondary-900 rounded-full flex items-center justify-center">
                    <Bot class="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                  </div>
                </div>
                <div class="flex-1">
                  <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-xs opacity-70">
                      {{ formatTime(message.timestamp) }}
                    </span>
                    <div v-if="message.type === 'user'" class="flex-shrink-0">
                      <div class="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <User class="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Typing Indicator -->
          <div v-if="isTyping" class="flex justify-start">
            <div class="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
              <div class="flex items-center space-x-2">
                <div class="w-6 h-6 bg-secondary-100 dark:bg-secondary-900 rounded-full flex items-center justify-center">
                  <Bot class="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                </div>
                <div class="flex space-x-1">
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Input -->
        <div class="border-t border-gray-200 dark:border-gray-700 p-4">
          <form @submit.prevent="sendMessage" class="flex space-x-4">
            <div class="flex-1">
              <textarea
                v-model="newMessage"
                :disabled="isTyping"
                placeholder="Ask AI about your project..."
                rows="1"
                class="input resize-none"
                @keydown.enter.prevent="sendMessage"
                @input="adjustTextareaHeight"
                ref="messageInput"
              ></textarea>
            </div>
            <button
              type="submit"
              :disabled="!newMessage.trim() || isTyping"
              class="btn btn-primary"
            >
              <Send class="w-4 h-4" />
            </button>
          </form>
          
          <div class="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>{{ newMessage.length }}/2000</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowLeft,
  FileText,
  FileCode,
  MessageSquare,
  Bot,
  User,
  Send
} from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'
import type { ChatMessage } from '@/types'

const route = useRoute()
const projectsStore = useProjectsStore()

const id = computed(() => route.params.id as string)
const project = computed(() => projectsStore.getProject(id.value))

const messageInput = ref<HTMLTextAreaElement>()
const newMessage = ref('')
const isTyping = ref(false)

const messages = ref<ChatMessage[]>([
  {
    id: '1',
    type: 'system',
    author: 'system',
    content: 'Welcome to your project chat! I\'m here to help you with coding, documentation, and project planning.',
    timestamp: new Date(),
    context: []
  }
])

const sendMessage = async () => {
  if (!newMessage.value.trim() || isTyping.value) return
  
  const userMessage: ChatMessage = {
    id: String(Date.now()),
    type: 'user',
    author: '1', // Current user ID
    content: newMessage.value,
    timestamp: new Date(),
    context: []
  }
  
  messages.value.push(userMessage)
  newMessage.value = ''
  isTyping.value = true
  
  // Simulate AI response
  setTimeout(() => {
    const aiResponse: ChatMessage = {
      id: String(Date.now() + 1),
      type: 'assistant',
      author: 'assistant',
      content: generateMockResponse(userMessage.content),
      timestamp: new Date(),
      context: []
    }
    
    messages.value.push(aiResponse)
    isTyping.value = false
  }, 1500)
  
  // Reset textarea height
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
  }
}

const generateMockResponse = (userMessage: string): string => {
  const responses = [
    "I'd be happy to help you with that! Based on your project structure, here are some suggestions...",
    "Great question! Let me analyze your code and provide some recommendations.",
    "I can help you implement that feature. Here's how we can approach it step by step:",
    "That's an interesting challenge. Let me break down the solution for you.",
    "I see what you're trying to achieve. Here are a few ways we can tackle this problem."
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

const adjustTextareaHeight = () => {
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
    messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 120) + 'px'
  }
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  // Auto-focus message input
  nextTick(() => {
    messageInput.value?.focus()
  })
})
</script>