const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const welcomeText = document.getElementById('welcomeText');
const appTitle = document.getElementById('appTitle');
const logoutButton = document.getElementById('logoutButton');
const taskArea = document.getElementById('taskArea');

function login(role) {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  })
    .then(response => response.json())
    .then(data => {
      if (!data.success) {
        errorMessage.textContent = data.message || 'Login failed.';
        return;
      }
      localStorage.setItem('projectRole', data.user.role);
      localStorage.setItem('projectName', data.user.name);
      window.location.href = 'app.html';
    })
    .catch(() => {
      errorMessage.textContent = 'Unable to connect to the server.';
    });
  return false;
}

function parseQuery() {
  const query = new URLSearchParams(window.location.search);
  if (!query.toString()) return null;
  return Object.fromEntries(query.entries());
}

function getRole() {
  const role = localStorage.getItem('projectRole');
  return role || null;
}

function renderLoginPage() {
  if (!loginForm) return;
}

function logout() {
  localStorage.removeItem('projectRole');
  localStorage.removeItem('projectName');
  window.location.href = 'index.html';
}

function createTaskCard(task, channels) {
  const card = document.createElement('div');
  card.className = 'task-card';

  const header = document.createElement('div');
  header.innerHTML = `<h3>${task.name}</h3><div class="meta-row"><span>${task.category}</span><span>Status: ${task.status}</span></div>`;
  card.appendChild(header);

  const description = document.createElement('p');
  description.textContent = task.description;
  card.appendChild(description);

  if (task.category === 'Communication') {
    const channelLabel = document.createElement('label');
    channelLabel.textContent = 'Communication Channel';
    const channelSelect = document.createElement('select');
    channelSelect.innerHTML = channels.map(ch => `<option value="${ch}" ${task.channel === ch ? 'selected' : ''}>${ch}</option>`).join('');
    card.appendChild(channelLabel);
    card.appendChild(channelSelect);

    channelSelect.addEventListener('change', () => {
      task.channel = channelSelect.value;
    });
  }

  const notesLabel = document.createElement('label');
  notesLabel.textContent = 'Notes / Status Update';
  const notesTextarea = document.createElement('textarea');
  notesTextarea.value = task.notes || '';
  card.appendChild(notesLabel);
  card.appendChild(notesTextarea);

  const statusLabel = document.createElement('label');
  statusLabel.textContent = 'Task Status';
  const statusSelect = document.createElement('select');
  ['Open', 'In Progress', 'Completed'].forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    if (status === task.status) option.selected = true;
    statusSelect.appendChild(option);
  });
  card.appendChild(statusLabel);
  card.appendChild(statusSelect);

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save Changes';
  saveButton.addEventListener('click', () => {
    const payload = {
      status: statusSelect.value,
      notes: notesTextarea.value,
      channel: task.channel
    };
    fetch(`/api/tasks/${task.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          statusSelect.value = result.task.status;
          notesTextarea.value = result.task.notes;
          if (result.task.channel && task.category === 'Communication') {
            task.channel = result.task.channel;
          }
          alert('Task updated successfully.');
        } else {
          alert(result.message || 'Unable to update task.');
        }
      })
      .catch(() => alert('Server error while updating task.'));
  });
  card.appendChild(saveButton);

  return card;
}

function showApp() {
  if (!taskArea || !welcomeText || !logoutButton) return;
  const role = getRole();
  const name = localStorage.getItem('projectName') || 'User';
  if (!role) {
    window.location.href = 'index.html';
    return;
  }

  welcomeText.textContent = `Welcome ${name}, you are logged in as ${role === 'pm' ? 'Project Management' : 'Vendor'}.`;
  appTitle.textContent = role === 'pm' ? 'Project Management Dashboard' : 'Vendor Collaboration Dashboard';

  logoutButton.addEventListener('click', logout);

  fetch(`/api/tasks?role=${role}`)
    .then(response => response.json())
    .then(data => {
      if (!data.success) {
        taskArea.innerHTML = '<p>Unable to load tasks.</p>';
        return;
      }

      const grouped = data.tasks.reduce((acc, task) => {
        if (!acc[task.category]) acc[task.category] = [];
        acc[task.category].push(task);
        return acc;
      }, {});

      taskArea.innerHTML = '';
      Object.keys(grouped).forEach(category => {
        const group = document.createElement('div');
        group.className = 'task-group';
        const heading = document.createElement('h2');
        heading.textContent = category;
        group.appendChild(heading);
        grouped[category].forEach(task => {
          group.appendChild(createTaskCard(task, data.channels));
        });
        taskArea.appendChild(group);
      });
    })
    .catch(() => {
      taskArea.innerHTML = '<p>Unable to connect to the backend.</p>';
    });
}

if (window.location.pathname.endsWith('app.html')) {
  window.addEventListener('DOMContentLoaded', showApp);
} else if (window.location.pathname.endsWith('vendor-login.html') || window.location.pathname.endsWith('pm-login.html')) {
  window.addEventListener('DOMContentLoaded', renderLoginPage);
}
