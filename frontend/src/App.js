// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginCallback from './components/auth/LoginCallback';
import Login from './components/auth/LoginPage';
import Editor from './components/Editor';
import ProjectDashboard from './components/projects/ProjectDashboard';
import CollaborativeEditor from './components/editor/CollaborativeEditor';
import SettingsPage from './components/settings/SettingsPage';
import ProfilePage from './components/profile/ProfilePage';
import UserInvites from './components/invite/UserInvites';
import GitHubIntegration from './components/github/GitHubIntegration';
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
              {/* OAuth Callback Route - This handles the GitHub redirect */}
              <Route
                path="/auth/callback"
                element={<LoginCallback />}
              />

              {/* Login Page */}
              <Route
                path="/login"
                element={<Login />}
              />

              {/* Dashboard Route - Shows all projects (Protected) */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ProjectDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Legacy Editor Route - Redirects to standalone editor (Protected) */}
              <Route
                path="/editor"
                element={
                  <ProtectedRoute>
                    <Editor />
                  </ProtectedRoute>
                }
              />

              {/* Collaborative Project Editor (Protected) */}
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
                element={<CollaborativeEditor readOnly={true} />}
              />

              {/* Fallback route */}
              <Route
                path="*"
                element={
                  <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                      <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
                      <p className="text-gray-600">The page you're looking for doesn't exist.</p>
                      <a href="/" className="text-blue-500 hover:text-blue-700 mt-4 inline-block">
                        Go to main page
                      </a>
                    </div>
                  </div>
                }
              />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/profile/:userId?" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/invites" element={<ProtectedRoute><UserInvites /></ProtectedRoute>} />
              <Route path="/github" element={<ProtectedRoute><GitHubIntegration /></ProtectedRoute>} />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;