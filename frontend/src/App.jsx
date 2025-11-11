import React, { useState, useEffect } from 'react';


const API_URL = 'http://localhost:5000/api';

// --- Main App Component ---
export default function App() {
  const [token, setToken] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [page, setPage] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // --- Auth State Effect ---
  useEffect(() => {
    
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
    setIsAuthReady(true);
  }, []);

  // --- Handlers for Auth ---
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
      
      // Signup ke baad automatically login karwa do
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

  // --- Render Logic ---
  if (!isAuthReady) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-inter p-4">
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

// --- TodoApp Component ---

function TodoApp({ token, onLogout }) {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [loadingTodos, setLoadingTodos] = useState(true);

  // --- Data Fetching Effect ---
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

  const remainingTasks = todos.filter(todo => !todo.completed).length;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent pb-2">
            My MERN Todo List
          </h1>
          <p className="text-lg text-gray-600">Aapke paas {remainingTasks} task baaki hain.</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-lg font-semibold shadow-md hover:bg-red-50 hover:text-red-600 transition-all duration-200 border border-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </header>

      <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6 transition-all duration-300">
        <form onSubmit={handleAddTodo} className="flex space-x-3">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new todo..."
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button
            type="submit"
            className="flex-shrink-0 bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </form>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-lg p-6 transition-all duration-300">
        {loadingTodos ? (
          <p className="text-center text-gray-500">Loading todos...</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {todos.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No todos yet. Add one above!</p>
            ) : (
              todos.map((todo) => (
                <TodoItem
                  key={todo._id}
                  todo={todo}
                  onToggle={handleToggleTodo}
                  onDelete={handleDeleteTodo}
                />
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

// --- TodoItem Component ---
function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className="flex items-center justify-between py-4 group transition-all duration-200 ease-in-out hover:bg-gray-50 -mx-6 px-6 rounded-lg">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo._id, todo.completed)}
          className="h-6 w-6 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
        <span
          className={`ml-4 text-lg font-medium ${
            todo.completed ? 'line-through text-gray-400 italic' : 'text-gray-800'
          }`}
        >
          {todo.text}
        </span>
      </div>
      <button
        onClick={() => onDelete(todo._id)}
        className="text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-red-600 hover:scale-110"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </li>
  );
}


// --- AuthForm Component ---
// This component renders for login/signup
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
      <div className="bg-white/80 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent pb-2">
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p className="text-center text-gray-500 mt-2">
            {isLogin ? 'Sign in to continue' : 'Get started with your todo list'}
          </p>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleSignUp}>
          <div className="mb-5 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              Email Address
            </label>
            <div className="absolute inset-y-0 left-0 pl-3 pt-7 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Password
            </label>
            <div className="absolute inset-y-0 left-0 pl-3 pt-7 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-600 bg-red-100 border border-red-300 p-3 rounded-lg text-sm mb-4 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-blue-500/50"
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => {
              setPage(isLogin ? 'signup' : 'login');
              setError(null);
            }}
            className="font-medium text-blue-600 hover:text-blue-700 ml-1"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

// --- LoadingSpinner Component ---
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
    </div>
  );
}