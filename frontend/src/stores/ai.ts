import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatAPI } from '@/services/api'
import type { ChatMessage } from '@/types'

export const useAIStore = defineStore('ai', () => {
  // State
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const sending = ref(false)
  const error = ref<string | null>(null)
  const currentProjectId = ref<string | null>(null)
  const currentThreadId = ref<string | null>(null)

  // Settings
  const settings = ref({
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    includeContext: true
  })

  // Statistics
  const stats = ref({
    totalMessages: 0,
    totalTokens: 0,
    totalCost: 0,
    messagesThisMonth: 0,
    tokensThisMonth: 0,
    costThisMonth: 0
  })

  // Available models
  const availableModels = ref([
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      contextWindow: 4096,
      costPer1kTokens: { input: 0.0015, output: 0.002 }
    },
    {
      id: 'gpt-3.5-turbo-16k',
      name: 'GPT-3.5 Turbo 16K',
      contextWindow: 16384,
      costPer1kTokens: { input: 0.003, output: 0.004 }
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      contextWindow: 8192,
      costPer1kTokens: { input: 0.03, output: 0.06 }
    },
    {
      id: 'gpt-4-turbo-preview',
      name: 'GPT-4 Turbo',
      contextWindow: 128000,
      costPer1kTokens: { input: 0.01, output: 0.03 }
    }
  ])

  // Computed
  const messageCount = computed(() => messages.value.length)
  const lastMessage = computed(() => 
    messages.value.length > 0 ? messages.value[messages.value.length - 1] : null
  )
  const isConfigured = computed(() => {
    // Check if user has OpenAI API key configured
    // This would be checked from user profile/settings
    return true // Placeholder
  })

  // Actions
  const loadMessages = async (projectId: string, threadId?: string) => {
    loading.value = true
    error.value = null
    currentProjectId.value = projectId
    currentThreadId.value = threadId || null

    try {
      const response = await chatAPI.getMessages(projectId)
      messages.value = response.data.messages || []
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to load messages'
      console.error('Failed to load messages:', err)
    } finally {
      loading.value = false
    }
  }

  const sendMessage = async (
    projectId: string, 
    content: string, 
    options: {
      threadId?: string
      includeContext?: boolean
      model?: string
      temperature?: number
      maxTokens?: number
    } = {}
  ) => {
    if (sending.value) return
    
    sending.value = true
    error.value = null

    // Add user message immediately for better UX
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      author: 'user',
      content,
      timestamp: new Date(),
      context: options.includeContext ? [] : undefined
    }

    messages.value.push(userMessage)

    try {
      const response = await chatAPI.sendMessage(projectId, content, options.includeContext ? [] : undefined)
      
      // Remove the temporary user message and add the real ones
      messages.value.pop()
      
      if (response.data.userMessage) {
        messages.value.push({
          ...response.data.userMessage,
          timestamp: new Date(response.data.userMessage.createdAt)
        })
      }
      
      if (response.data.assistantMessage) {
        messages.value.push({
          ...response.data.assistantMessage,
          timestamp: new Date(response.data.assistantMessage.createdAt)
        })
      }

      // Update stats
      if (response.data.usage) {
        stats.value.totalTokens += response.data.usage.totalTokens
        stats.value.totalCost += response.data.cost || 0
        stats.value.totalMessages += 2 // user + assistant
      }

      return response.data

    } catch (err: any) {
      // Remove the temporary user message on error
      messages.value.pop()
      
      error.value = err.response?.data?.message || 'Failed to send message'
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'system',
        author: 'system',
        content: `Error: ${error.value}`,
        timestamp: new Date()
      }
      
      messages.value.push(errorMessage)
      
      throw err
    } finally {
      sending.value = false
    }
  }

  const clearMessages = async (projectId: string, threadId?: string) => {
    try {
      await chatAPI.clearChat(projectId)
      
      if (threadId) {
        // Remove messages for specific thread
        messages.value = messages.value.filter(msg => msg.context !== threadId)
      } else {
        // Clear all messages
        messages.value = []
      }
      
      // Reset stats if clearing all
      if (!threadId) {
        stats.value = {
          totalMessages: 0,
          totalTokens: 0,
          totalCost: 0,
          messagesThisMonth: 0,
          tokensThisMonth: 0,
          costThisMonth: 0
        }
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to clear messages'
      throw err
    }
  }

  const loadStats = async (projectId: string) => {
    try {
      const response = await chatAPI.getMessages(projectId) // This endpoint should include stats
      if (response.data.stats) {
        stats.value = response.data.stats
      }
    } catch (err: any) {
      console.error('Failed to load stats:', err)
    }
  }

  const updateSettings = async (
    projectId: string, 
    newSettings: Partial<typeof settings.value>
  ) => {
    try {
      // Update settings via API
      const response = await chatAPI.sendMessage(projectId, '', []) // This needs a proper settings endpoint
      
      // Update local settings
      Object.assign(settings.value, newSettings)
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update settings'
      throw err
    }
  }

  const testConnection = async (projectId: string) => {
    try {
      loading.value = true
      error.value = null
      
      // Make a test API call
      const response = await chatAPI.sendMessage(
        projectId, 
        'Test message - please respond briefly to confirm the connection is working.',
        []
      )
      
      return {
        success: true,
        message: 'AI connection successful!',
        model: response.data.assistantMessage?.model,
        cost: response.data.cost
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Connection test failed'
      error.value = errorMessage
      
      return {
        success: false,
        message: errorMessage
      }
    } finally {
      loading.value = false
    }
  }

  const addMessage = (message: ChatMessage) => {
    messages.value.push(message)
  }

  const removeMessage = (messageId: string) => {
    const index = messages.value.findIndex(msg => msg.id === messageId)
    if (index > -1) {
      messages.value.splice(index, 1)
    }
  }

  const editMessage = (messageId: string, newContent: string) => {
    const message = messages.value.find(msg => msg.id === messageId)
    if (message && message.type === 'user') {
      message.content = newContent
      // In a real app, you'd also update this on the server
    }
  }

  const getMessagesForThread = (threadId: string) => {
    return messages.value.filter(msg => msg.context === threadId)
  }

  const getMessageById = (messageId: string) => {
    return messages.value.find(msg => msg.id === messageId)
  }

  const estimateCost = (content: string, model: string = settings.value.model) => {
    // Rough estimation - 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(content.length / 4)
    const modelPricing = availableModels.value.find(m => m.id === model)
    
    if (!modelPricing) return 0
    
    // Estimate based on input tokens (rough approximation)
    return (estimatedTokens / 1000) * modelPricing.costPer1kTokens.input
  }

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    }).format(cost)
  }

  const reset = () => {
    messages.value = []
    loading.value = false
    sending.value = false
    error.value = null
    currentProjectId.value = null
    currentThreadId.value = null
    stats.value = {
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
      messagesThisMonth: 0,
      tokensThisMonth: 0,
      costThisMonth: 0
    }
  }

  return {
    // State
    messages,
    loading,
    sending,
    error,
    currentProjectId,
    currentThreadId,
    settings,
    stats,
    availableModels,
    
    // Computed
    messageCount,
    lastMessage,
    isConfigured,
    
    // Actions
    loadMessages,
    sendMessage,
    clearMessages,
    loadStats,
    updateSettings,
    testConnection,
    addMessage,
    removeMessage,
    editMessage,
    getMessagesForThread,
    getMessageById,
    estimateCost,
    formatCost,
    reset
  }
})