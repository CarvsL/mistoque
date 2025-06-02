import axios from 'axios';

// Determina qual URL da API usar baseado no protocolo atual
const getApiUrl = () => {
  const isHttps = window.location.protocol === 'https:';
  return isHttps ? import.meta.env.VITE_API_URL_HTTPS : import.meta.env.VITE_API_URL;
};

// Cria uma instância do Axios com configurações base
const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para obter o token CSRF antes de requisições que precisam dele
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de requisição
api.interceptors.request.use(async (config) => {
  // Lista de rotas que não precisam de CSRF
  const publicRoutes = [
    '/login',
    '/register',
    '/verify-code',
    '/verify-code-senha',
    '/reenviar-codigo',
    '/reenviar-codigo-senha',
    '/verificar-celular-senha',
    '/redefinir-senha',
    '/webhook-mercadopago',
    '/csrf-token'
  ];

  // Se for uma rota pública, não precisa do token CSRF
  if (publicRoutes.some(route => config.url.includes(route))) {
    return config;
  }

  // Se não tiver o token CSRF no header, tenta obtê-lo
  if (!config.headers['X-XSRF-TOKEN']) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const response = await axios.get(`${getApiUrl()}/csrf-token`, { withCredentials: true });
        const token = response.data.csrfToken;
        
        // Atualiza o token no header
        config.headers['X-XSRF-TOKEN'] = token;
        
        // Processa a fila de requisições pendentes
        processQueue(null, token);
      } catch (error) {
        processQueue(error, null);
        throw error;
      } finally {
        isRefreshing = false;
      }
    } else {
      // Se já está atualizando, adiciona à fila
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        config.headers['X-XSRF-TOKEN'] = token;
        return config;
      }).catch(error => {
        return Promise.reject(error);
      });
    }
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Interceptor de resposta
api.interceptors.response.use(
  response => response,
  error => {
    // Se receber erro de CSRF, tenta obter um novo token e repetir a requisição
    if (error.response?.status === 403 && error.response?.data?.error === 'Token CSRF inválido') {
      // Remove o token atual
      delete api.defaults.headers['X-XSRF-TOKEN'];
      
      // Repete a requisição original
      return api(error.config);
    }
    return Promise.reject(error);
  }
);

export default api; 