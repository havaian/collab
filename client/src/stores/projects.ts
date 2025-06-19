import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project } from '@/types'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const userProjects = computed(() => projects.value)

  const fetchProjects = async () => {
    loading.value = true
    error.value = null
    
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      projects.value = [
        {
          id: '1',
          name: 'Web Development Collaboration',
          description: 'A collaborative project for building modern web applications',
          owner: '1',
          collaborators: [
            { user: '1', role: 'owner', joinedAt: new Date() },
            { user: '2', role: 'collaborator', joinedAt: new Date() }
          ],
          settings: {
            aiModel: 'gpt-4',
            defaultTheme: 'dark',
            permissions: {}
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Data Science Analysis',
          description: 'Machine learning and data analysis project',
          owner: '1',
          collaborators: [
            { user: '1', role: 'owner', joinedAt: new Date() }
          ],
          settings: {
            aiModel: 'gpt-3.5-turbo',
            defaultTheme: 'light',
            permissions: {}
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
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

  const getProject = (id: string) => {
    return projects.value.find(p => p.id === id)
  }

  const setCurrentProject = (project: Project | null) => {
    currentProject.value = project
  }

  return {
    projects,
    currentProject,
    loading,
    error,
    userProjects,
    fetchProjects,
    createProject,
    getProject,
    setCurrentProject
  }
})