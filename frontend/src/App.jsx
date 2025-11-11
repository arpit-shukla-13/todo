import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

// --- Main App Component ---
export default function App() {
  const [token, setToken] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [page, setPage] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
    setIsAuthReady(true);
  }, []);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Signup failed');
      handleLogin(e, true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogin = async (e, isAfterSignup = false) => {
    e.preventDefault();
    if (!isAfterSignup) setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Login failed');
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  if (!isAuthReady) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 font-inter">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      {token ? (
        <TodoApp token={token} onLogout={handleLogout} />
      ) : (
        <AuthForm
          page={page}
          setPage={setPage}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          handleLogin={handleLogin}
          handleSignUp={handleSignUp}
          error={error}
        />
      )}
    </div>
  );
}

// --- Enhanced TodoApp Component ---
function TodoApp({ token, onLogout }) {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    const fetchTodos = async () => {
      setLoadingTodos(true);
      try {
        const res = await fetch(`${API_URL}/todos`, {
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch todos');
        const data = await res.json();
        setTodos(data);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoadingTodos(false);
      }
    };

    if (token) {
      fetchTodos();
    }
  }, [token]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (newTodo.trim() === '') return;

    try {
      const res = await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ text: newTodo }),
      });
      if (!res.ok) throw new Error('Failed to add todo');
      const data = await res.json();
      setTodos([...todos, data]);
      setNewTodo('');
    } catch (err) {
      console.error("Error adding todo: ", err);
    }
  };

  const handleToggleTodo = async (id, currentCompleted) => {
    try {
      const res = await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ completed: !currentCompleted }),
      });
      if (!res.ok) throw new Error('Failed to update todo');
      const updatedTodo = await res.json();
      setTodos(todos.map(todo => (todo._id === id ? updatedTodo : todo)));
    } catch (err) {
      console.error("Error toggling todo: ", err);
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      const res = await fetch(`${API_URL}/todos/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      });
      if (!res.ok) throw new Error('Failed to delete todo');
      setTodos(todos.filter(todo => todo._id !== id));
    } catch (err) {
      console.error("Error deleting todo: ", err);
    }
  };

  const handleEditTodo = async (id) => {
    if (editText.trim() === '') return;
    
    try {
      const res = await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ text: editText }),
      });
      if (!res.ok) throw new Error('Failed to update todo');
      const updatedTodo = await res.json();
      setTodos(todos.map(todo => (todo._id === id ? updatedTodo : todo)));
      setEditingId(null);
      setEditText('');
    } catch (err) {
      console.error("Error editing todo: ", err);
    }
  };

  const startEditing = (todo) => {
    setEditingId(todo._id);
    setEditText(todo.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  // Filter and search todos
  const filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'active' ? !todo.completed :
      filter === 'completed' ? todo.completed : true;
    
    return matchesSearch && matchesFilter;
  });

  const remainingTasks = todos.filter(todo => !todo.completed).length;
  const completedTasks = todos.filter(todo => todo.completed).length;

  return (
    <div className="relative min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <header className="relative z-10 mb-12">
        <div className="flex justify-between items-center mb-8">
          <div className="flex-1">
            <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent pb-2 animate-gradient">
              TaskFlow Pro
            </h1>
            <p className="text-lg text-gray-300 mt-2">Streamline your productivity</p>
          </div>
          
          {/* Stats Cards */}
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 min-w-32">
              <div className="text-2xl font-bold text-white">{remainingTasks}</div>
              <div className="text-sm text-gray-300">Pending</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 min-w-32">
              <div className="text-2xl font-bold text-white">{completedTasks}</div>
              <div className="text-sm text-gray-300">Completed</div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-3 bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-semibold border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 ml-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

        {/* Add Todo Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6 transition-all duration-300 hover:bg-white/15">
          <form onSubmit={handleAddTodo} className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full p-4 pl-12 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-semibold shadow-2xl hover:shadow-purple-500/25 hover:scale-105 transition-all duration-300 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
          </form>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2 bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/20">
            {['all', 'active', 'completed'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition-all duration-300 ${
                  filter === filterType 
                    ? 'bg-purple-500 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {filterType}
              </button>
            ))}
          </div>
          
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full p-4 pl-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </header>

      {/* Todo List */}
      <div className="relative z-10">
        {loadingTodos ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTodos.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg">No tasks found</div>
                <div className="text-gray-500 text-sm mt-2">
                  {searchTerm ? 'Try adjusting your search terms' : 'Add your first task to get started'}
                </div>
              </div>
            ) : (
              filteredTodos.map((todo) => (
                <TodoItem
                  key={todo._id}
                  todo={todo}
                  onToggle={handleToggleTodo}
                  onDelete={handleDeleteTodo}
                  onEdit={handleEditTodo}
                  onStartEditing={startEditing}
                  onCancelEditing={cancelEditing}
                  isEditing={editingId === todo._id}
                  editText={editText}
                  setEditText={setEditText}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Enhanced TodoItem Component ---
function TodoItem({ 
  todo, 
  onToggle, 
  onDelete, 
  onEdit, 
  onStartEditing, 
  onCancelEditing, 
  isEditing, 
  editText, 
  setEditText 
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`group bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 transition-all duration-300 hover:bg-white/15 hover:scale-[1.02] hover:shadow-2xl ${
        todo.completed ? 'opacity-60' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 min-w-0">
          {/* Custom Checkbox */}
          <button
            onClick={() => onToggle(todo._id, todo.completed)}
            className={`relative w-6 h-6 rounded-lg border-2 transition-all duration-300 flex-shrink-0 ${
              todo.completed 
                ? 'bg-green-500 border-green-500' 
                : 'border-gray-400 hover:border-purple-500'
            }`}
          >
            {todo.completed && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Todo Text or Edit Input */}
          <div className="ml-4 flex-1 min-w-0">
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onEdit(todo._id);
                    if (e.key === 'Escape') onCancelEditing();
                  }}
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(todo._id)}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={onCancelEditing}
                    className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span
                  className={`text-lg font-medium truncate ${
                    todo.completed 
                      ? 'line-through text-gray-400' 
                      : 'text-white'
                  }`}
                >
                  {todo.text}
                </span>
                
                {/* Action Buttons */}
                <div className={`flex items-center gap-2 ml-4 transition-all duration-300 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  <button
                    onClick={() => onStartEditing(todo)}
                    className="p-2 text-blue-400 hover:bg-white/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => onDelete(todo._id)}
                    className="p-2 text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Timestamp */}
      <div className="text-xs text-gray-400 mt-2 ml-10">
        {new Date(todo.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

// --- Enhanced AuthForm Component ---
function AuthForm({
  page,
  setPage,
  email,
  setEmail,
  password,
  setPassword,
  handleLogin,
  handleSignUp,
  error
}) {
  const isLogin = page === 'login';

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12">
      <div className="relative z-10 bg-white/10 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-white/20 shadow-2xl w-full max-w-md">
        {/* Auth Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-300">
            {isLogin ? 'Sign in to continue your journey' : 'Start organizing your life'}
          </p>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleSignUp}>
          <div className="space-y-4">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pl-12"
                placeholder="Enter your email"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>

            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
                className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pl-12"
                placeholder="Enter your password"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl font-semibold shadow-2xl hover:shadow-purple-500/25 hover:scale-105 transition-all duration-300"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-400">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => {
                setPage(isLogin ? 'signup' : 'login');
                setError(null);
              }}
              className="text-purple-400 hover:text-purple-300 font-medium ml-1 transition-colors"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}


// --- Enhanced LoadingSpinner Component ---
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
      </div>
    </div>
  );
}