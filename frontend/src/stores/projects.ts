import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Project } from '@/types'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const userProjects = computed(() => projects.value)

  // Watch projects and persist to localStorage
  watch(
    projects,
    (newProjects) => {
      try {
        const serializedProjects = newProjects.map(project => ({
          ...project,
          createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : project.createdAt,
          updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : project.updatedAt,
          collaborators: project.collaborators.map(collab => ({
            ...collab,
            joinedAt: collab.joinedAt instanceof Date ? collab.joinedAt.toISOString() : collab.joinedAt
          }))
        }))
        
        localStorage.setItem('projects_data', JSON.stringify(serializedProjects))
        console.log('Projects saved to localStorage:', serializedProjects.length)
      } catch (err) {
        console.error('Failed to save projects to localStorage:', err)
      }
    },
    { deep: true }
  )

  const initializeProjects = () => {
    try {
      const storedProjects = localStorage.getItem('projects_data')
      if (storedProjects) {
        const parsedProjects = JSON.parse(storedProjects)
        
        // Convert date strings back to Date objects
        projects.value = parsedProjects.map((project: any) => ({
          ...project,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
          collaborators: project.collaborators.map((collab: any) => ({
            ...collab,
            joinedAt: new Date(collab.joinedAt)
          }))
        }))
        
        console.log('Projects restored from localStorage:', projects.value.length)
      }
    } catch (err) {
      console.error('Failed to restore projects from localStorage:', err)
      localStorage.removeItem('projects_data')
    }
  }

  const fetchProjects = async () => {
    loading.value = true
    error.value = null
    
    try {
      // First, try to load from localStorage
      if (projects.value.length === 0) {
        initializeProjects()
      }
      
      // If still no projects, create mock data
      if (projects.value.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        projects.value = []
      }
    } catch (err) {
      error.value = 'Failed to fetch projects'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createProject = async (projectData: Partial<Project>) => {
    loading.value = true
    error.value = null
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newProject: Project = {
        id: String(Date.now()),
        name: projectData.name || 'Untitled Project',
        description: projectData.description || '',
        owner: '1', // Current user ID
        collaborators: [
          { user: '1', role: 'owner', joinedAt: new Date() }
        ],
        settings: {
          aiModel: 'gpt-4',
          defaultTheme: 'dark',
          permissions: {}
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      projects.value.unshift(newProject)
      return newProject
    } catch (err) {
      error.value = 'Failed to create project'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      // Remove from local array
      const index = projects.value.findIndex(p => p.id === projectId)
      if (index > -1) {
        projects.value.splice(index, 1)
      }
    } catch (err) {
      error.value = 'Failed to delete project'
      throw err
    }
  }

  const getProject = (id: string) => {
    return projects.value.find(p => p.id === id)
  }

  const setCurrentProject = (project: Project | null) => {
    currentProject.value = project
  }

  const clearProjects = () => {
    projects.value = []
    currentProject.value = null
    localStorage.removeItem('projects_data')
  }

  return {
    projects,
    currentProject,
    loading,
    error,
    userProjects,
    fetchProjects,
    createProject,
    deleteProject,
    getProject,
    setCurrentProject,
    initializeProjects,
    clearProjects
  }
})