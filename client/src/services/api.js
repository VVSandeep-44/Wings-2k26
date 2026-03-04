const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const buildApiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);
const REGISTRATION_API_URL =
    import.meta.env.VITE_REGISTRATION_API_URL || buildApiUrl('/api/register');
const REGISTRATION_API_TIMEOUT_MS = 45000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const checkHealth = async () => {
    const url = buildApiUrl('/api/health');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
        });
    } catch (_error) {
        // best-effort warmup only
    } finally {
        clearTimeout(timeoutId);
    }
};

export const submitRegistration = async (payload, onRetryStatus) => {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            REGISTRATION_API_TIMEOUT_MS
        );

        try {
            const response = await fetch(REGISTRATION_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            const result = await response
                .json()
                .catch(() => ({ success: response.ok }));

            if (!response.ok) {
                throw new Error(
                    result.message || 'Failed to submit registration to server.'
                );
            }

            return result;
        } catch (error) {
            const canRetry =
                attempt === 1 &&
                (error.name === 'AbortError' || error.message === 'Failed to fetch');

            if (!canRetry) {
                if (error.name === 'AbortError') {
                    throw new Error(
                        'Server is taking too long to respond. Please wait 10-20 seconds and submit again.'
                    );
                }
                throw error;
            }

            if (onRetryStatus) {
                onRetryStatus('Server is waking up... retrying automatically.');
            }
            await wait(3000);
            await checkHealth();
        } finally {
            clearTimeout(timeoutId);
        }
    }
};

export const checkAdminSession = async () => {
    const response = await fetch(buildApiUrl('/api/admin-session'), {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
    });
    return response.ok;
};

export const adminLogin = async (password) => {
    const response = await fetch(buildApiUrl('/api/admin-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Invalid admin password');
    }

    return result;
};

export const adminLogout = async () => {
    await fetch(buildApiUrl('/api/admin-logout'), {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
    });
};

export const fetchRegistrations = async (limit = 20) => {
    const response = await fetch(buildApiUrl(`/api/registrations?limit=${limit}`), {
        credentials: 'include',
        cache: 'no-store',
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch registrations');
    }

    return result;
};

export const deleteRegistration = async (id) => {
    const response = await fetch(buildApiUrl(`/api/registrations/${id}`), {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete registration');
    }

    return result;
};
