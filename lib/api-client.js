const axios = require('axios');

const MAX_REQUESTS_COUNT = 3;
const INTERVAL_MS = 500;
let PENDING_REQUESTS = 0;

// create new axios instance
const apiClient = axios.create({});

/**
 * Axios Request Interceptor
 */
apiClient.interceptors.request.use(function (config) {
    return new Promise((resolve, reject) => {
        let interval = setInterval(() => {
            if (PENDING_REQUESTS < MAX_REQUESTS_COUNT) {
                PENDING_REQUESTS++;
                clearInterval(interval);
                resolve(config);
            }
        }, INTERVAL_MS);
    });
});

/**
 * Axios Response Interceptor
 */
apiClient.interceptors.response.use(
    function (response) {
        PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1);
        console.log('Pending requests: ', PENDING_REQUESTS)
        return Promise.resolve(response);
    },
    function (error) {
        PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1);
        console.log('Pending requests: ', PENDING_REQUESTS)
        return Promise.reject(error);
    }
);

module.exports = apiClient;
