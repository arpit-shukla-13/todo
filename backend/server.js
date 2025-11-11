const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGODB_CONNECTION_STRING_HERE';
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY_HERE';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// --- Mongoose Models ---

// User Model
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
});
const User = mongoose.model('user', UserSchema);

// Todo Model
const TodoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  text: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const Todo = mongoose.model('todo', TodoSchema);

// --- Auth Middleware ---
const auth = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// --- API Routes ---

// 1. Auth Routes (Register & Login)
const authRouter = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
authRouter.post(
  '/register',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      user = new User({ email, password });

      // Hash password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      // Create and return JWT
      const payload = { user: { id: user.id } };
      jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
        if (err) throw err;
        res.json({ token });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
authRouter.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: 'Invalid Credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid Credentials' });
      }

      // Create and return JWT
      const payload = { user: { id: user.id } };
      jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
        if (err) throw err;
        res.json({ token });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

app.use('/api/auth', authRouter);

// 2. Todo Routes (Protected)
const todoRouter = express.Router();

// @route   GET /api/todos
// @desc    Get all todos for the logged-in user
todoRouter.get('/', auth, async (req, res) => {
  try {
    const todos = await Todo.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/todos
// @desc    Add a new todo
todoRouter.post(
  '/',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newTodo = new Todo({
        text: req.body.text,
        user: req.user.id,
      });

      const todo = await newTodo.save();
      res.json(todo);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT /api/todos/:id
// @desc    Update a todo (mark as complete/incomplete)
todoRouter.put('/:id', auth, async (req, res) => {
  try {
    let todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ msg: 'Todo not found' });

    // Make sure user owns the todo
    if (todo.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    // Only allow updating the 'completed' status
    const newCompletedStatus = req.body.completed;
    if (typeof newCompletedStatus !== 'boolean') {
        return res.status(400).json({ msg: 'Invalid update data. Only "completed" status can be updated.' });
    }

    todo = await Todo.findByIdAndUpdate(
      req.params.id,
      { $set: { completed: newCompletedStatus } },
      { new: true }
    );

    res.json(todo);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/todos/:id
// @desc    Delete a todo
todoRouter.delete('/:id', auth, async (req, res) => {
  try {
    let todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ msg: 'Todo not found' });

    // Make sure user owns the todo
    if (todo.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Todo.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Todo removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.use('/api/todos', todoRouter);

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));