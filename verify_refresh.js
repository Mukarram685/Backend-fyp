// verify_refresh.js
const BASE_URL = 'http://localhost:3000/api/v1';

async function run() {
    try {
        console.log('Starting verification...');

        // Use a random email to avoid conflict
        const email = `verify_${Date.now()}@test.com`;
        const password = 'password123';

        // 1. Register
        console.log('1. Registering...');
        const regRes = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Verify User',
                email,
                password,
                phoneNumber: 1234567890
            })
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(`Register failed: ${JSON.stringify(regData)}`);
        console.log('   Register success.');

        // 2. Login (to get tokens)
        console.log('2. Logging in...');
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);

        const { accessToken, refreshToken } = loginData;
        if (!accessToken || !refreshToken) throw new Error('Tokens missing in login response');
        console.log('   Login success. Access Token and Refresh Token received.');

        // 3. Refresh Token
        console.log('3. Refreshing token...');
        const refreshRes = await fetch(`${BASE_URL}/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        const refreshData = await refreshRes.json();
        if (!refreshRes.ok) throw new Error(`Refresh failed: ${JSON.stringify(refreshData)}`);

        const { accessToken: newAccess, refreshToken: newRefresh } = refreshData;
        if (!newAccess || !newRefresh) throw new Error('Tokens missing in refresh response');
        console.log('   Refresh success. New tokens received.');

        // 4. Logout
        console.log('4. Logging out...');
        const logoutRes = await fetch(`${BASE_URL}/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newAccess}`
            }
        });
        const logoutData = await logoutRes.json();
        if (!logoutRes.ok) throw new Error(`Logout failed: ${JSON.stringify(logoutData)}`);
        console.log('   Logout success.');

        // 5. Verify refresh token is invalid (Optional but good)
        console.log('5. Verifying old refresh token is invalid...');
        const invalidRes = await fetch(`${BASE_URL}/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: newRefresh }) // The one we just logged out with
        });
        if (invalidRes.status === 401 || invalidRes.status === 403 || invalidRes.status === 404) {
            console.log('   Verified: Refresh token is invalid after logout.');
        } else {
            console.log('   Warning: Refresh token might still be valid? Status:', invalidRes.status);
            const data = await invalidRes.json();
            console.log(data);
        }

        console.log('Verification PASSED!');

    } catch (error) {
        console.error('Verification FAILED:', error); // Log error message
        if (error.cause) console.error('Cause:', error.cause); // Log cause if available
        process.exit(1);
    }
}

run();
