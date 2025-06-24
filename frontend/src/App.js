// Updated src/App.js to integrate with backend
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Landing from './components/Landing';
import ProjectDashboard from './components/projects/ProjectDashboard';
import CollaborativeEditor from './components/editor/CollaborativeEditor';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            {/* Toast notifications */}
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />

            <Routes>
              {/* Dashboard Route - Shows all projects */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ProjectDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Legacy Editor Route - Redirects to standalone editor */}
              <Route
                path="/editor"
                element={
                  <ProtectedRoute>
                    <Landing />
                  </ProtectedRoute>
                }
              />

              {/* Collaborative Project Editor */}
              <Route
                path="/project/:projectId"
                element={
                  <ProtectedRoute>
                    <CollaborativeEditor />
                  </ProtectedRoute>
                }
              />

              {/* Public project view (read-only) */}
              <Route
                path="/public/:projectId"
                element={
                  <ProtectedRoute>
                    <CollaborativeEditor readOnly={true} />
                  </ProtectedRoute>
                }
              />

              {/* User profile/settings */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />

              {/* Explore public projects */}
              <Route
                path="/explore"
                element={
                  <ProtectedRoute>
                    <ExploreProjects />
                  </ProtectedRoute>
                }
              />

              {/* 404 Not Found */}
              <Route
                path="*"
                element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-gray-600 mb-4">Page not found</p>
                      <a
                        href="/"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Go Home
                      </a>
                    </div>
                  </div>
                }
              />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

// Additional components for future routes
const UserProfile = () => {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState({
    theme: user?.settings?.theme || 'oceanic-next',
    language: user?.settings?.language || 'javascript',
    notifications: user?.settings?.notifications !== false
  });

  const handleSaveSettings = async () => {
    try {
      const updatedUser = await authService.updateSettings(
        localStorage.getItem('gpt-collab-token'),
        settings
      );
      updateUser(updatedUser);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">User Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <p className="mt-1 text-sm text-gray-900">{user?.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Preferences</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="oceanic-next">Oceanic Next</option>
                    <option value="vs-dark">VS Dark</option>
                    <option value="monokai">Monokai</option>
                    <option value="github">GitHub</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Enable notifications</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExploreProjects = () => {
  const [publicProjects, setPublicProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPublicProjects();
  }, []);

  const loadPublicProjects = async () => {
    try {
      const response = await apiService.getPublicProjects({ search: searchTerm });
      setPublicProjects(response.projects);
    } catch (error) {
      toast.error('Failed to load public projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadPublicProjects();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Explore Projects</h1>
          <p className="text-gray-600 mb-6">Discover public coding projects from the community</p>

          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
            >
              Search
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicProjects.map((project) => (
            <div
              key={project._id}
              onClick={() => navigate(`/public/${project._id}`)}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {project.name}
                </h3>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  Public
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                {project.description || 'No description'}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>by {project.owner?.username}</span>
                <span>{project.settings?.language}</span>
              </div>
            </div>
          ))}
        </div>

        {publicProjects.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No public projects found
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Be the first to make a project public!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;