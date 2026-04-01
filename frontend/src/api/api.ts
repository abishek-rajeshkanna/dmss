import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

export type TokenResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type LoginRequest = {
  email: string
  password: string
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Trigger refresh logic if 401 Unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login') {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return client(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // Direct axios call to avoid interceptor loop
          const res = await axios.post<TokenResponse>(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const newTokens = res.data;
          
          localStorage.setItem('accessToken', newTokens.accessToken);
          localStorage.setItem('refreshToken', newTokens.refreshToken);
          
          client.defaults.headers.common['Authorization'] = 'Bearer ' + newTokens.accessToken;
          originalRequest.headers.Authorization = 'Bearer ' + newTokens.accessToken;
          
          processQueue(null, newTokens.accessToken);
          return client(originalRequest);
        } catch (err) {
          processQueue(err, null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      } else {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
)

function normalizeError(e: any): Error {
  const msg =
    e?.response?.data?.message ??
    e?.response?.data?.error ??
    e?.message ??
    'Request failed'
  return new Error(msg)
}

function createCrud<T>(resource: string) {
  return {
    async list(params?: Record<string, any>) {
      try {
        const res = await client.get<{ content: T[]; [key: string]: any }>(`/${resource}`, { params })
        return res.data
      } catch (e) {
        throw normalizeError(e)
      }
    },
    async get(id: string | number) {
      try {
        const res = await client.get<T>(`/${resource}/${id}`)
        return res.data
      } catch (e) {
        throw normalizeError(e)
      }
    },
    async create(body: Partial<T>) {
      try {
        const res = await client.post<T>(`/${resource}`, body)
        return res.data
      } catch (e) {
        throw normalizeError(e)
      }
    },
    async update(id: string | number, body: Partial<T>) {
      try {
        const res = await client.put<T>(`/${resource}/${id}`, body)
        return res.data
      } catch (e) {
        throw normalizeError(e)
      }
    },
    async delete(id: string | number) {
      try {
        await client.delete(`/${resource}/${id}`)
      } catch (e) {
        throw normalizeError(e)
      }
    },
  }
}

export const api = {
  auth: {
    async login(body: LoginRequest) {
      try {
        const res = await client.post<TokenResponse>('/auth/login', body)
        return res.data
      } catch (e) {
        throw normalizeError(e)
      }
    },
    async refresh(refreshToken: string) {
      try {
        const res = await client.post<TokenResponse>('/auth/refresh', { refreshToken })
        return res.data
      } catch (e) {
        throw normalizeError(e)
      }
    },
    async logout() {
      try {
        await client.post('/auth/logout')
      } catch (e) {
        throw normalizeError(e)
      }
    },
  },
  users: createCrud<any>('users'),
  customers: createCrud<any>('customers'),
  inventory: createCrud<any>('inventory'),
  testDrives: createCrud<any>('test-drives'),
  orders: createCrud<any>('orders'),
  payments: createCrud<any>('payments'),
  serviceTickets: createCrud<any>('service-tickets'),
  dealerships: createCrud<any>('dealerships'),
  notifications: createCrud<any>('notifications'),
  auditLogs: createCrud<any>('audit-logs'),
  dashboard: {
    async getStats() {
      try {
        const res = await client.get('/dashboard/stats')
        return res.data
      } catch (e) {
        throw normalizeError(e)
      }
    }
  }
}

