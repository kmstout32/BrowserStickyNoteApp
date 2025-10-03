// Get elements
const todoInput = document.getElementById('todoInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');

// Load todos from localStorage
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let timerInterval = null;

// Initialize the app
function init() {
  renderTodos();
  startTimerUpdates();

  // Event listeners
  addBtn.addEventListener('click', addTodo);
  todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  });
}

// Start continuous timer updates
function startTimerUpdates() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    updateAllTimers();
  }, 1000); // Update every second
}

// Add a new todo
function addTodo() {
  const text = todoInput.value.trim();

  if (text === '') {
    alert('Please enter a task!');
    return;
  }

  const todo = {
    id: Date.now(),
    text: text,
    completed: false,
    dueDate: dueDateInput.value || null
  };

  todos.push(todo);
  saveTodos();
  renderTodos();
  todoInput.value = '';
  dueDateInput.value = '';
  todoInput.focus();
}

// Delete a todo
function deleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  saveTodos();
  renderTodos();
}

// Toggle todo completion
function toggleTodo(id) {
  const todo = todos.find(todo => todo.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    renderTodos();
  }
}

// Save todos to localStorage
function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

// Check if a todo is overdue
function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

// Format due date for display
function formatDueDate(dueDate) {
  if (!dueDate) return '';
  const date = new Date(dueDate);
  const now = new Date();
  const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formatted = date.toLocaleDateString('en-US', options);

  if (isOverdue(dueDate)) {
    return `<span class="due-date overdue">⚠️ ${formatted}</span>`;
  } else {
    return `<span class="due-date">📅 ${formatted}</span>`;
  }
}

// Calculate time remaining until due date
function getTimeRemaining(dueDate) {
  if (!dueDate) return null;

  const now = new Date().getTime();
  const due = new Date(dueDate).getTime();
  const diff = due - now;

  if (diff < 0) return null; // Overdue

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, totalMinutes: diff / (1000 * 60) };
}

// Format countdown for display
function formatCountdown(dueDate, todoId) {
  if (!dueDate) return '';

  const remaining = getTimeRemaining(dueDate);

  if (!remaining) {
    return '<span class="countdown overdue">⏰ TIME\'S UP!</span>';
  }

  const { days, hours, minutes, seconds, totalMinutes } = remaining;
  const isUrgent = totalMinutes <= 5;

  let countdownText = '';
  if (days > 0) {
    countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  } else if (hours > 0) {
    countdownText = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    countdownText = `${minutes}m ${seconds}s`;
  }

  const urgentClass = isUrgent ? 'urgent' : '';
  return `<span class="countdown ${urgentClass}" data-todo-id="${todoId}">⏰ ${countdownText}</span>`;
}

// Update all countdown timers
function updateAllTimers() {
  todos.forEach(todo => {
    if (todo.dueDate && !todo.completed) {
      const countdownElement = document.querySelector(`[data-todo-id="${todo.id}"]`);
      if (countdownElement) {
        const remaining = getTimeRemaining(todo.dueDate);

        if (!remaining) {
          countdownElement.innerHTML = '⏰ TIME\'S UP!';
          countdownElement.className = 'countdown overdue';
        } else {
          const { days, hours, minutes, seconds, totalMinutes } = remaining;
          const isUrgent = totalMinutes <= 5;

          let countdownText = '';
          if (days > 0) {
            countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
          } else if (hours > 0) {
            countdownText = `${hours}h ${minutes}m ${seconds}s`;
          } else {
            countdownText = `${minutes}m ${seconds}s`;
          }

          countdownElement.innerHTML = `⏰ ${countdownText}`;
          countdownElement.className = `countdown ${isUrgent ? 'urgent' : ''}`;
        }
      }
    }
  });
}

// Render todos to the DOM
function renderTodos() {
  todoList.innerHTML = '';

  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;

    const dueDateHtml = todo.dueDate ? `<div class="todo-due-date">${formatDueDate(todo.dueDate)}</div>` : '';
    const countdownHtml = todo.dueDate && !todo.completed ? `<div class="todo-countdown">${formatCountdown(todo.dueDate, todo.id)}</div>` : '';

    li.innerHTML = `
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
      <div class="todo-content">
        <span class="todo-text">${todo.text}</span>
        ${dueDateHtml}
        ${countdownHtml}
      </div>
      <button class="delete-btn" onclick="deleteTodo(${todo.id})">Delete</button>
    `;

    todoList.appendChild(li);
  });
}

// Start the app
init();
