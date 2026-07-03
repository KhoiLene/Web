document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMessage = document.getElementById('errorMessage');

    // Simple admin check (in real app, this would be an API call)
    if (username === 'admin' && password === 'admin') {
        // Redirect to admin panel
        window.location.href = '/admin/';
    } else {
        // For regular users, go back to previous page or home
        const previousPage = document.referrer || '/';
        window.location.href = previousPage;
    }

    // Clear error message on each attempt
    errorMessage.textContent = '';
});