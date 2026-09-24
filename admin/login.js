document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button'), feedback = document.querySelector('#feedback');
  button.disabled = true; feedback.textContent = 'Signing in…';
  try { const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); location.replace('/admin'); }
  catch (error) { feedback.textContent = error.message || 'Could not connect. Please try again.'; button.disabled = false; }
});
