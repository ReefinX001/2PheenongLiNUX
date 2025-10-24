// API Utility Functions
class ApiUtils {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    // Generic request method
    async request(url, options = {}) {
        try {
            const config = {
                headers: { ...this.defaultHeaders, ...options.headers },
                ...options
            };

            const response = await fetch(this.baseUrl + url, config);

            // Handle different response types
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/')) {
                data = await response.text();
            } else {
                data = await response.blob();
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || `HTTP ${response.status}`);
            }

            return {
                success: true,
                data: data,
                status: response.status,
                headers: response.headers
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.status || 500
            };
        }
    }

    // GET request
    async get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;

        return await this.request(fullUrl, {
            method: 'GET'
        });
    }

    // POST request
    async post(url, data = {}) {
        return await this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(url, data = {}) {
        return await this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(url) {
        return await this.request(url, {
            method: 'DELETE'
        });
    }

    // File upload
    async upload(url, file, fieldName = 'file') {
        try {
            const formData = new FormData();
            formData.append(fieldName, file);

            const response = await fetch(this.baseUrl + url, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || `HTTP ${response.status}`);
            }

            return {
                success: true,
                data: data,
                status: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.status || 500
            };
        }
    }

    // Batch requests
    async batch(requests) {
        try {
            const promises = requests.map(req =>
                this.request(req.url, req.options)
            );

            const results = await Promise.allSettled(promises);

            return results.map((result, index) => ({
                id: requests[index].id || index,
                success: result.status === 'fulfilled' && result.value.success,
                data: result.status === 'fulfilled' ? result.value.data : null,
                error: result.status === 'rejected' ? result.reason.message :
                       (result.value && !result.value.success ? result.value.error : null)
            }));
        } catch (error) {
            throw new Error(`Batch request failed: ${error.message}`);
        }
    }

    // Set default headers
    setDefaultHeaders(headers) {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    }

    // Set base URL
    setBaseUrl(url) {
        this.baseUrl = url;
    }

    // Add interceptor for requests
    addRequestInterceptor(interceptor) {
        this.requestInterceptors = this.requestInterceptors || [];
        this.requestInterceptors.push(interceptor);
    }

    // Add interceptor for responses
    addResponseInterceptor(interceptor) {
        this.responseInterceptors = this.responseInterceptors || [];
        this.responseInterceptors.push(interceptor);
    }
}

// Create instances for different API endpoints
const publicApi = new ApiUtils('/api');
const adminApi = new ApiUtils('/admin-api');

// Load security utilities
const loadSecurityUtils = () => {
    if (typeof SecurityUtils === 'undefined') {
        const script = document.createElement('script');
        script.src = '/views/utils/security.js';
        document.head.appendChild(script);
    }
};
loadSecurityUtils();

// Add common request interceptor for admin API with secure token handling
adminApi.addRequestInterceptor((config) => {
    // Use secure storage for auth tokens
    try {
        const secureStorage = window.SecurityUtils ? SecurityUtils.secureStorage : null;
        let adminToken = null;

        if (secureStorage) {
            // Try secure storage first
            adminToken = secureStorage.getSecure('adminToken', true); // Use sessionStorage
        } else {
            // Fallback to sessionStorage (better than localStorage)
            adminToken = sessionStorage.getItem('adminToken');
        }

        if (adminToken) {
            config.headers['Authorization'] = `Bearer ${adminToken}`;
        }

        // Add CSRF token for state-changing requests
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method)) {
            const csrfToken = window.SecurityUtils ? SecurityUtils.csrf.getToken() : null;
            if (csrfToken) {
                config.headers['X-CSRF-Token'] = csrfToken;
            }
        }
    } catch (error) {
        console.error('Error retrieving auth token:', error);
    }

    return config;
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiUtils, publicApi, adminApi };
} else {
    window.ApiUtils = ApiUtils;
    window.publicApi = publicApi;
    window.adminApi = adminApi;
}
