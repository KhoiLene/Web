/**
 * Sends a verification code via email or Zalo.
 * @param {string} identifier - email for email method, phone number for Zalo method
 * @param {'email'|'zalo'} method - the method to use
 * @returns {Promise<Object>} - the parsed JSON response from the API
 */
function sendVerificationCode(identifier, method) {
    let url = '';
    let payload = {};
    if (method === 'email') {
        url = '/api/auth/send-verification';
        payload = { email: identifier };
    } else if (method === 'zalo') {
        url = '/api/auth/send-zalo-verification';
        payload = { phoneNumber: identifier };
    } else {
        return Promise.reject(new Error('Invalid method'));
    }

    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Failed to send verification code');
            });
        }
        return response.json();
    });
}

// Make it available globally
window.sendVerificationCode = sendVerificationCode;