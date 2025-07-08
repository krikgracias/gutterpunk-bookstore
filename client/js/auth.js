// client/js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://gutterpunk-api.onrender.com'; // Ensure this matches your Render API URL
    const messageDiv = document.getElementById('message');

    function showMessage(msg, type = 'error') {
        messageDiv.textContent = msg;
        messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
        messageDiv.style.display = 'block';
    }

    function hideMessage() {
        messageDiv.textContent = '';
        messageDiv.style.display = 'none';
    }

    // --- Login Form Logic ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideMessage();

            const email = loginForm.email.value;
            const password = loginForm.password.value;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    // Login successful
                    localStorage.setItem('userToken', data.token); // Store the token
                    localStorage.setItem('isAdmin', data.isAdmin); // Store isAdmin status
                    localStorage.setItem('username', data.username); // Store username

                    showMessage('Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = '/'; // Redirect to homepage or /account.html
                    }, 1500);
                } else {
                    // Login failed
                    showMessage(data.message || 'Login failed. Please try again.');
                }
            } catch (err) {
                console.error('Login request error:', err);
                showMessage('Network error. Could not connect to the server.');
            }
        });
    }

    // --- Register Form Logic ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideMessage();

            const username = registerForm.username.value;
            const email = registerForm.email.value;
            const password = registerForm.password.value;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    // Registration successful
                    localStorage.setItem('userToken', data.token); // Store the token
                    localStorage.setItem('isAdmin', data.isAdmin); // Store isAdmin status
                    localStorage.setItem('username', data.username); // Store username

                    showMessage('Registration successful! Redirecting...', 'success');
                    // In a real app, you'd prompt them to log in or directly log them in
                    setTimeout(() => {
                        window.location.href = '/'; // Redirect to homepage or /account.html
                    }, 1500);
                } else {
                    // Registration failed
                    showMessage(data.message || 'Registration failed. Please try again.');
                }
            } catch (err) {
                console.error('Registration request error:', err);
                showMessage('Network error. Could not connect to the server.');
            }
        });
    }
});