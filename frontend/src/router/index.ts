import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy-loaded components
const LoginView = () => import('@/views/auth/LoginView.vue')
const CallbackView = () => import('@/views/auth/CallbackView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { 
      requiresAuth: false,
      title: 'Home'
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { 
      requiresAuth: false,
      title: 'Login'
    }
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: CallbackView,
    meta: { 
      requiresAuth: false,
      title: 'Completing Authentication...'
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardView,
    meta: { 
      requiresAuth: true,
      title: 'Dashboard'
    }
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/views/projects/ProjectsView.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Projects'
    }
  },
  {
    path: '/projects/:id',
    name: 'Project',
    component: () => import('@/views/projects/ProjectView.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Project'
    },
    props: true
  },
  {
    path: '/projects/:id/chat',
    name: 'ProjectChat',
    component: () => import('@/views/projects/ProjectChatView.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Project Chat'
    },
    props: true
  },
  {
    path: '/projects/:id/files',
    name: 'ProjectFiles',
    component: () => import('@/views/projects/ProjectFilesView.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Project Files'
    },
    props: true
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Profile'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundView,
    meta: { 
      requiresAuth: false,
      title: '404 - Page Not Found'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Set page title
  if (to.meta.title) {
    document.title = `${to.meta.title} - GPT Collaboration App`
  }
  
  // Special handling for auth callback - always allow
  if (to.name === 'AuthCallback') {
    return next()
  }
  
  // Initialize auth if not already done
  if (authStore.user === null && !authStore.loading) {
    await authStore.initializeAuth()
  }
  
  const requiresAuth = to.meta.requiresAuth !== false // Default to true
  const isAuthenticated = authStore.isAuthenticated
  
  if (requiresAuth && !isAuthenticated) {
    // Redirect to login with return path
    console.log('Authentication required, redirecting to login')
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    })
  } else if (!requiresAuth && isAuthenticated && to.name === 'Login') {
    // Already authenticated, redirect to dashboard
    console.log('Already authenticated, redirecting to dashboard')
    next({ name: 'Dashboard' })
  } else if (to.path === '/' && isAuthenticated) {
    // Redirect authenticated users from home to dashboard
    next({ name: 'Dashboard' })
  } else {
    // Allow navigation
    next()
  }
})

// After navigation guard for error handling
router.afterEach((to, from, failure) => {
  if (failure) {
    console.error('Navigation failed:', failure)
  }
})

export default router