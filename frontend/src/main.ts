// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

// Import global styles
import './style.css'

async function initializeApp() {
  const app = createApp(App)
  
  // Setup Pinia store
  const pinia = createPinia()
  app.use(pinia)
  
  // Setup router
  app.use(router)
  
  // Initialize authentication before mounting
  const authStore = useAuthStore()
  
  try {
    console.log('Initializing app with authentication...')
    await authStore.initializeAuth()
    console.log('Authentication initialized successfully')
  } catch (error) {
    console.error('Failed to initialize authentication:', error)
    // Continue with app initialization even if auth fails
  }
  
  // Mount the app
  app.mount('#app')
  
  console.log('App initialized and mounted')
}

// Initialize the application
initializeApp().catch(error => {
  console.error('Failed to initialize application:', error)
})

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason)
  // Optionally prevent the default browser behavior
  // event.preventDefault()
})

// Handle global errors
window.addEventListener('error', event => {
  console.error('Global error:', event.error)
})