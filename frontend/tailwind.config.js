/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-light': 'bounce 1s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 20px 40px -7px rgba(0, 0, 0, 0.1)',
        'strong': '0 8px 50px -12px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    // Custom plugin for component classes
    function({ addUtilities, addComponents, theme }) {
      const newComponents = {
        '.btn': {
          '@apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
        '.btn-primary': {
          '@apply bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500': {},
        },
        '.btn-secondary': {
          '@apply bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700': {},
        },
        '.btn-danger': {
          '@apply bg-error-600 text-white hover:bg-error-700 focus:ring-error-500': {},
        },
        '.btn-sm': {
          '@apply px-3 py-1.5 text-xs': {},
        },
        '.btn-lg': {
          '@apply px-6 py-3 text-base': {},
        },
        '.card': {
          '@apply bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700': {},
        },
        '.input': {
          '@apply block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm': {},
        },
        '.label': {
          '@apply block text-sm font-medium text-gray-700 dark:text-gray-300': {},
        },
        '.badge': {
          '@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium': {},
        },
        '.badge-primary': {
          '@apply bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200': {},
        },
        '.badge-secondary': {
          '@apply bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200': {},
        },
        '.badge-success': {
          '@apply bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200': {},
        },
        '.badge-warning': {
          '@apply bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200': {},
        },
        '.badge-error': {
          '@apply bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200': {},
        }
      }

      addComponents(newComponents)

      const newUtilities = {
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': `${theme('colors.gray.400')} ${theme('colors.gray.100')}`,
        },
        '.scrollbar-webkit': {
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme('colors.gray.100'),
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme('colors.gray.400'),
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: theme('colors.gray.500'),
          },
        },
        '.text-balance': {
          'text-wrap': 'balance',
        }
      }

      addUtilities(newUtilities)
    }
  ],
}