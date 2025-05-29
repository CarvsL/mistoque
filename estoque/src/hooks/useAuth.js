import { useEffect, useState } from "react";
import api from '../utils/api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // Estado para armazenar se o usuário está autenticado ou não.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout;

    const checkAuth = async () => {
      try {
        const response = await api.get('/usuario-logado');
        if (isMounted) {
          setIsAuthenticated(true);
          setIsLoading(false);
        }
      } catch (error) {
        if (!isMounted) return;

        if (error.response?.status === 401) {
          setIsAuthenticated(false);
          setIsLoading(false);
        } else if (error.response?.status === 429) {
          // Se receber erro de rate limit, tenta novamente em 5 segundos
          retryTimeout = setTimeout(checkAuth, 5000);
        } else {
          console.error("Erro ao verificar autenticação:", error);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    };

    checkAuth(); // Executa a verificação assim que o componente é montado.

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []); // O useEffect será executado apenas uma vez.

  return { isAuthenticated, isLoading }; // Retorna o estado de autenticação.
}