<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800">
    <!-- Navigation -->
    <nav class="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                GPT Collab
              </h1>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <router-link
              to="/login"
              class="btn btn-primary"
            >
              Get Started
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
      <div class="text-center">
        <h1 class="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Collaborate with AI on 
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">
            Every Project
          </span>
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Create shared workspaces where your team can collaborate in real-time with AI assistance. 
          Build better software together with intelligent code completion, documentation, and project insights.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <router-link
            to="/login"
            class="btn btn-primary text-lg px-8 py-3"
          >
            Start Collaborating
          </router-link>
          <button class="btn btn-secondary text-lg px-8 py-3">
            View Demo
          </button>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="card p-8 text-center">
          <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Users class="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Real-time Collaboration
          </h3>
          <p class="text-gray-600 dark:text-gray-300">
            Work together seamlessly with live editing, shared chat history, and synchronized project state.
          </p>
        </div>

        <div class="card p-8 text-center">
          <div class="w-12 h-12 bg-secondary-100 dark:bg-secondary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Brain class="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
          </div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            AI-Powered Assistance
          </h3>
          <p class="text-gray-600 dark:text-gray-300">
            Get intelligent suggestions, code reviews, and documentation help with ChatGPT integration.
          </p>
        </div>

        <div class="card p-8 text-center">
          <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
            <FileCode class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Integrated Development
          </h3>
          <p class="text-gray-600 dark:text-gray-300">
            Full-featured code editor with syntax highlighting, auto-completion, and live preview.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Users, Brain, FileCode } from 'lucide-vue-next'
</script>