// Get elements
const todoInput = document.getElementById('todoInput');
const priorityInput = document.getElementById('priorityInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');

// Load todos from localStorage
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let timerInterval = null;
let currentFilter = 'all'; // all, today, upcoming
let currentView = 'list'; // list, calendar
let currentCalendarDate = new Date(); // Current month being viewed in calendar

// Initialize the app
function init() {
  // Load and apply saved theme
  loadTheme();

  // Initialize order and priority for existing todos without it
  let needsSave = false;
  todos.forEach((todo, index) => {
    if (todo.order === undefined) {
      todo.order = index;
      needsSave = true;
    }
    if (todo.priority === undefined) {
      todo.priority = 'medium';
      needsSave = true;
    }
  });
  if (needsSave) {
    saveTodos();
  }

  renderTodos();
  startTimerUpdates();

  // Event listeners
  addBtn.addEventListener('click', addTodo);
  todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  });

  // Tab navigation listeners
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active tab
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update filter and re-render
      currentFilter = btn.getAttribute('data-filter');
      renderTodos();
    });
  });

  // Theme toggle listener
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // View toggle listeners
  const viewButtons = document.querySelectorAll('.view-btn');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.getAttribute('data-view');
      switchView(currentView);
    });
  });

  // Calendar navigation listeners
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendar();
    });
  }
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendar();
    });
  }
}

// Theme Management
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) {
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

// Start continuous timer updates
function startTimerUpdates() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    updateAllTimers();
  }, 1000); // Update every second
}

// Natural Language Date Parser
function parseNaturalLanguageDate(text) {
  const lowerText = text.toLowerCase();
  let detectedDate = null;
  let detectedTime = null;
  let cleanedText = text;

  // Time patterns
  const timePatterns = [
    { pattern: /\bat\s+(\d{1,2}):(\d{2})\s*(am|pm)\b/i, handler: (match) => {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      if (match[3].toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (match[3].toLowerCase() === 'am' && hours === 12) hours = 0;
      return { hours, minutes };
    }},
    { pattern: /\bat\s+(\d{1,2})\s*(am|pm)\b/i, handler: (match) => {
      let hours = parseInt(match[1]);
      if (match[2].toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (match[2].toLowerCase() === 'am' && hours === 12) hours = 0;
      return { hours, minutes: 0 };
    }},
    { pattern: /\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i, handler: (match) => {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      if (match[3].toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (match[3].toLowerCase() === 'am' && hours === 12) hours = 0;
      return { hours, minutes };
    }},
    { pattern: /\b(\d{1,2})\s*(am|pm)\b/i, handler: (match) => {
      let hours = parseInt(match[1]);
      if (match[2].toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (match[2].toLowerCase() === 'am' && hours === 12) hours = 0;
      return { hours, minutes: 0 };
    }},
    { pattern: /\bat\s+noon\b/i, handler: () => ({ hours: 12, minutes: 0 }) },
    { pattern: /\bat\s+midnight\b/i, handler: () => ({ hours: 0, minutes: 0 }) },
    { pattern: /\bmorning\b/i, handler: () => ({ hours: 8, minutes: 0 }) },
    { pattern: /\bafternoon\b/i, handler: () => ({ hours: 14, minutes: 0 }) },
    { pattern: /\bevening\b/i, handler: () => ({ hours: 18, minutes: 0 }) },
    { pattern: /\bnight\b/i, handler: () => ({ hours: 21, minutes: 0 }) }
  ];

  // Date patterns
  const now = new Date();

  // Check for relative dates
  if (/\btoday\b/i.test(lowerText)) {
    detectedDate = new Date(now);
    cleanedText = cleanedText.replace(/\btoday\b/gi, '').trim();
  } else if (/\btomorrow\b/i.test(lowerText)) {
    detectedDate = new Date(now);
    detectedDate.setDate(detectedDate.getDate() + 1);
    cleanedText = cleanedText.replace(/\btomorrow\b/gi, '').trim();
  } else if (/\btonight\b/i.test(lowerText)) {
    detectedDate = new Date(now);
    detectedTime = { hours: 21, minutes: 0 };
    cleanedText = cleanedText.replace(/\btonight\b/gi, '').trim();
  } else {
    // Check for day names
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      const regex = new RegExp(`\\b${days[i]}\\b`, 'i');
      if (regex.test(lowerText)) {
        detectedDate = new Date(now);
        const currentDay = detectedDate.getDay();
        const targetDay = i;
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
        detectedDate.setDate(detectedDate.getDate() + daysToAdd);
        cleanedText = cleanedText.replace(regex, '').trim();
        break;
      }
    }

    // Check for "next week"
    if (/\bnext\s+week\b/i.test(lowerText)) {
      detectedDate = new Date(now);
      detectedDate.setDate(detectedDate.getDate() + 7);
      cleanedText = cleanedText.replace(/\bnext\s+week\b/gi, '').trim();
    }

    // Check for "in X days/hours"
    const inDaysMatch = lowerText.match(/\bin\s+(\d+)\s+days?\b/i);
    if (inDaysMatch) {
      detectedDate = new Date(now);
      detectedDate.setDate(detectedDate.getDate() + parseInt(inDaysMatch[1]));
      cleanedText = cleanedText.replace(/\bin\s+\d+\s+days?\b/gi, '').trim();
    }

    const inHoursMatch = lowerText.match(/\bin\s+(\d+)\s+hours?\b/i);
    if (inHoursMatch) {
      detectedDate = new Date(now);
      detectedDate.setHours(detectedDate.getHours() + parseInt(inHoursMatch[1]));
      cleanedText = cleanedText.replace(/\bin\s+\d+\s+hours?\b/gi, '').trim();
    }
  }

  // Extract time from text
  for (const { pattern, handler } of timePatterns) {
    const match = lowerText.match(pattern);
    if (match && !detectedTime) {
      detectedTime = handler(match);
      cleanedText = cleanedText.replace(pattern, '').trim();
      break;
    }
  }

  // Combine date and time
  if (detectedDate) {
    if (detectedTime) {
      detectedDate.setHours(detectedTime.hours, detectedTime.minutes, 0, 0);
    } else {
      // Default to 9am if no time specified
      detectedDate.setHours(9, 0, 0, 0);
    }

    // Format for datetime-local input
    const year = detectedDate.getFullYear();
    const month = String(detectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(detectedDate.getDate()).padStart(2, '0');
    const hours = String(detectedDate.getHours()).padStart(2, '0');
    const minutes = String(detectedDate.getMinutes()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

    // Clean up extra whitespace
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

    return { date: formattedDate, cleanedText };
  }

  return null;
}

// Add a new todo
function addTodo() {
  let text = todoInput.value.trim();

  if (text === '') {
    alert('Please enter a task!');
    return;
  }

  // Parse natural language date from text
  const parsedDate = parseNaturalLanguageDate(text);
  let dueDate = dueDateInput.value || null;

  if (parsedDate) {
    text = parsedDate.cleanedText;
    dueDate = parsedDate.date;
  }

  const todo = {
    id: Date.now(),
    text: text,
    completed: false,
    priority: priorityInput.value || 'medium',
    dueDate: dueDate,
    order: todos.length
  };

  todos.push(todo);
  saveTodos();
  renderTodos();
  todoInput.value = '';
  priorityInput.value = 'medium';
  dueDateInput.value = '';
  todoInput.focus();
}

// Delete a todo
function deleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  // Reorder remaining todos
  todos.forEach((todo, index) => {
    todo.order = index;
  });
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

// Edit a todo
function editTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  const todoElement = document.querySelector(`[data-id="${id}"]`);
  if (!todoElement) return;

  // Disable dragging while editing
  todoElement.setAttribute('draggable', 'false');

  const dueDateValue = todo.dueDate || '';

  todoElement.innerHTML = `
    <div class="edit-mode">
      <input type="text" class="edit-input" value="${todo.text}" id="edit-text-${id}">
      <select class="edit-priority" id="edit-priority-${id}">
        <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>Low Priority</option>
        <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
        <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>High Priority</option>
      </select>
      <input type="datetime-local" class="edit-date" value="${dueDateValue}" id="edit-date-${id}">
      <div class="edit-actions">
        <button class="save-btn" onclick="saveEdit(${id})">Save</button>
        <button class="cancel-btn" onclick="cancelEdit()">Cancel</button>
      </div>
    </div>
  `;

  // Focus on the text input
  document.getElementById(`edit-text-${id}`).focus();
}

// Save edited todo
function saveEdit(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  const newText = document.getElementById(`edit-text-${id}`).value.trim();
  const newPriority = document.getElementById(`edit-priority-${id}`).value;
  const newDueDate = document.getElementById(`edit-date-${id}`).value;

  if (newText === '') {
    alert('Task cannot be empty!');
    return;
  }

  todo.text = newText;
  todo.priority = newPriority;
  todo.dueDate = newDueDate || null;

  saveTodos();
  renderTodos();
}

// Cancel editing
function cancelEdit() {
  renderTodos();
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

// Check if date is today
function isToday(dueDate) {
  if (!dueDate) return false;
  const today = new Date();
  const due = new Date(dueDate);
  return due.getDate() === today.getDate() &&
         due.getMonth() === today.getMonth() &&
         due.getFullYear() === today.getFullYear();
}

// Check if date is in the next 7 days
function isUpcoming(dueDate) {
  if (!dueDate) return false;
  const now = new Date();
  const due = new Date(dueDate);
  const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

  return due > now && due <= sevenDaysFromNow;
}

// Filter todos based on current view
function filterTodos(todos) {
  if (currentFilter === 'all') {
    return todos;
  } else if (currentFilter === 'today') {
    // Show today's tasks and overdue tasks
    return todos.filter(todo =>
      !todo.completed && (isToday(todo.dueDate) || isOverdue(todo.dueDate))
    );
  } else if (currentFilter === 'upcoming') {
    // Show tasks due in the next 7 days (not including today)
    return todos.filter(todo =>
      !todo.completed && isUpcoming(todo.dueDate) && !isToday(todo.dueDate)
    );
  }
  return todos;
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

// Drag and Drop functionality
let draggedElement = null;
let draggedTodoId = null;

function handleDragStart(e) {
  draggedElement = this;
  draggedTodoId = parseInt(this.getAttribute('data-id'));
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');

  // Remove drag-over class from all items
  document.querySelectorAll('.todo-item').forEach(item => {
    item.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedElement) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  if (draggedElement !== this) {
    const dropTodoId = parseInt(this.getAttribute('data-id'));

    // Find the dragged todo and the drop target todo
    const draggedTodo = todos.find(t => t.id === draggedTodoId);
    const dropTodo = todos.find(t => t.id === dropTodoId);

    if (draggedTodo && dropTodo) {
      // Swap order values
      const tempOrder = draggedTodo.order;
      draggedTodo.order = dropTodo.order;
      dropTodo.order = tempOrder;

      saveTodos();
      renderTodos();
    }
  }

  return false;
}

// Render todos to the DOM
function renderTodos() {
  todoList.innerHTML = '';

  // Apply current filter
  let filteredTodos = filterTodos(todos);

  // Sort todos by order
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : 999999;
    const orderB = b.order !== undefined ? b.order : 999999;
    return orderA - orderB;
  });

  sortedTodos.forEach((todo, index) => {
    const li = document.createElement('li');
    const priorityClass = `priority-${todo.priority || 'medium'}-card`;
    li.className = `todo-item ${todo.completed ? 'completed' : ''} ${priorityClass}`;
    li.setAttribute('draggable', 'true');
    li.setAttribute('data-id', todo.id);

    const priority = todo.priority || 'medium';
    const priorityLabels = {
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };
    const priorityBadgeHtml = `<span class="priority-badge priority-${priority}">${priorityLabels[priority]}</span>`;

    const dueDateHtml = todo.dueDate ? `<div class="todo-due-date">${formatDueDate(todo.dueDate)}</div>` : '';
    const countdownHtml = todo.dueDate && !todo.completed ? `<div class="todo-countdown">${formatCountdown(todo.dueDate, todo.id)}</div>` : '';

    li.innerHTML = `
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
      <div class="todo-content">
        <div>
          ${priorityBadgeHtml}
          <span class="todo-text">${todo.text}</span>
        </div>
        ${dueDateHtml}
        ${countdownHtml}
      </div>
      <div class="todo-actions">
        <button class="edit-btn" onclick="editTodo(${todo.id})">Edit</button>
        <button class="delete-btn" onclick="deleteTodo(${todo.id})">Delete</button>
      </div>
    `;

    // Add drag event listeners
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragend', handleDragEnd);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragenter', handleDragEnter);
    li.addEventListener('dragleave', handleDragLeave);

    todoList.appendChild(li);
  });
}

// View Switching
function switchView(view) {
  const listView = document.getElementById('listView');
  const calendarView = document.getElementById('calendarView');

  if (view === 'list') {
    listView.classList.remove('hidden');
    calendarView.classList.add('hidden');
  } else if (view === 'calendar') {
    listView.classList.add('hidden');
    calendarView.classList.remove('hidden');
    renderCalendar();
  }
}

// Calendar Functions
function renderCalendar() {
  const monthYear = document.getElementById('calendarMonthYear');
  const calendarDays = document.getElementById('calendarDays');

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  // Set month/year header
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  monthYear.textContent = `${monthNames[month]} ${year}`;

  // Get calendar days
  const days = getCalendarDays(year, month);

  // Clear calendar
  calendarDays.innerHTML = '';

  // Get today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Render each day
  days.forEach(day => {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    cell.setAttribute('data-date', day.date.toISOString());

    // Check if this day is in a different month
    if (day.date.getMonth() !== month) {
      cell.classList.add('other-month');
    }

    // Check if this day is today
    const cellDate = new Date(day.date);
    cellDate.setHours(0, 0, 0, 0);
    if (cellDate.getTime() === today.getTime()) {
      cell.classList.add('today');
    }

    // Add date number
    const dateDiv = document.createElement('div');
    dateDiv.className = 'calendar-date';
    dateDiv.textContent = day.date.getDate();
    cell.appendChild(dateDiv);

    // Find todos for this day
    const dayTodos = todos.filter(todo => {
      if (!todo.dueDate) return false;
      const todoDate = new Date(todo.dueDate);
      return todoDate.getFullYear() === day.date.getFullYear() &&
             todoDate.getMonth() === day.date.getMonth() &&
             todoDate.getDate() === day.date.getDate();
    });

    // Add todos to the cell
    dayTodos.forEach(todo => {
      const taskDiv = document.createElement('div');
      taskDiv.className = `calendar-task priority-${todo.priority || 'medium'}`;
      if (todo.completed) {
        taskDiv.classList.add('completed');
      }
      taskDiv.textContent = todo.text;
      taskDiv.setAttribute('draggable', 'true');
      taskDiv.setAttribute('data-todo-id', todo.id);

      // Add drag event listeners for calendar tasks
      taskDiv.addEventListener('dragstart', handleCalendarTaskDragStart);
      taskDiv.addEventListener('dragend', handleCalendarTaskDragEnd);

      cell.appendChild(taskDiv);
    });

    // Add drop event listeners for calendar cells
    cell.addEventListener('dragover', handleCalendarCellDragOver);
    cell.addEventListener('drop', handleCalendarCellDrop);
    cell.addEventListener('dragenter', handleCalendarCellDragEnter);
    cell.addEventListener('dragleave', handleCalendarCellDragLeave);

    calendarDays.appendChild(cell);
  });
}

// Get all days to display in calendar (including prev/next month days)
function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];

  // Add days from previous month
  const prevMonthLastDay = new Date(year, month, 0);
  const prevMonthDays = prevMonthLastDay.getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthDays - i)
    });
  }

  // Add days from current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i)
    });
  }

  // Add days from next month to fill the grid
  const remainingCells = 42 - days.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      date: new Date(year, month + 1, i)
    });
  }

  return days;
}

// Calendar Drag and Drop Handlers
let draggedCalendarTaskId = null;

function handleCalendarTaskDragStart(e) {
  draggedCalendarTaskId = parseInt(this.getAttribute('data-todo-id'));
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleCalendarTaskDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.calendar-cell').forEach(cell => {
    cell.classList.remove('drag-over');
  });
}

function handleCalendarCellDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleCalendarCellDragEnter(e) {
  if (draggedCalendarTaskId !== null) {
    this.classList.add('drag-over');
  }
}

function handleCalendarCellDragLeave(e) {
  // Only remove if we're actually leaving the cell
  if (e.target === this) {
    this.classList.remove('drag-over');
  }
}

function handleCalendarCellDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  this.classList.remove('drag-over');

  if (draggedCalendarTaskId !== null) {
    const newDate = new Date(this.getAttribute('data-date'));
    const todo = todos.find(t => t.id === draggedCalendarTaskId);

    if (todo) {
      // Preserve the time if it exists, otherwise set to 9am
      if (todo.dueDate) {
        const oldDate = new Date(todo.dueDate);
        newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
      } else {
        newDate.setHours(9, 0, 0, 0);
      }

      // Format for datetime-local
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const hours = String(newDate.getHours()).padStart(2, '0');
      const minutes = String(newDate.getMinutes()).padStart(2, '0');
      todo.dueDate = `${year}-${month}-${day}T${hours}:${minutes}`;

      saveTodos();
      renderCalendar();
    }

    draggedCalendarTaskId = null;
  }

  return false;
}

// Start the app
init();
