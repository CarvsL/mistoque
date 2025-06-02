import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Code.module.css";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Code() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(120); // 2 minutos
  const [podeReenviar, setPodeReenviar] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/produtos');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Verifica se tem os dados necessários e inicia o timer
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
      return;
    }

    if (!location.state?.registrationData) {
      navigate("/register");
      return;
    }

    // Inicia o timer
    startContador();

    // Limpa o timer quando o componente for desmontado
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [location.state, navigate, isAuthenticated]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const startContador = () => {
    // Limpa o timer anterior se existir
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setSegundosRestantes(120);
    setPodeReenviar(false);

    timerRef.current = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPodeReenviar(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const reenviarCodigo = async () => {
    try {
      setPodeReenviar(false); // Desabilita o botão imediatamente

      const response = await fetch(`${import.meta.env.VITE_API_URL_HTTPS}/reenviar-codigo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          celular: location.state?.registrationData?.celular
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setSegundosRestantes(data.segundosRestantes);
          startContador();
        } else {
          throw new Error(data.message || "Erro ao reenviar código");
        }
        return;
      }

      // Se o reenvio for bem-sucedido
      alert("Novo código enviado com sucesso!");
      startContador(); // Reinicia o contador

    } catch (error) {
      alert(error.message || "Erro ao reenviar o código. Tente novamente.");
      setPodeReenviar(true); // Reabilita o botão em caso de erro
    }
  };

  const formatarTempo = (segundos) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  };

  const handleVerifyCode = async () => {
    if (!code) {
      alert("Por favor, digite o código recebido.");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL_HTTPS}/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          celular: location.state?.registrationData?.celular,
          code
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao verificar código");
      }

      // Se a verificação for bem-sucedida, redireciona para o login
      navigate("/login");
    } catch (error) {
      alert(error.message || "Erro ao verificar o código. Tente novamente.");
    }
  };

  const voltarParaRegistro = () => {
    if (window.confirm('Tem certeza que deseja voltar? Seu registro será cancelado.')) {
      navigate("/register");
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          <img src="/box.png" alt="Ícone" className={styles.icon} />
          Mistoque
        </h1>

        <nav className={styles.desktopNav}>
          <ul className={styles.navLinks}>
            <li><Link to="/login">Entrar</Link></li>
            <li><Link to="/register">Cadastre-se</Link></li>
          </ul>
        </nav>

        <div className={styles.menuIcon} onClick={toggleMenu}>
          <div className={styles.bar}></div>
          <div className={styles.bar}></div>
          <div className={styles.bar}></div>
        </div>
      </header>

      <nav className={styles.mobileNav}>
        <ul className={`${styles.mobileNavLinks} ${menuOpen ? styles.showMenu : ''}`}>
          <li><Link to="/login">Entrar</Link></li>
          <li><Link to="/register">Cadastre-se</Link></li>
        </ul>
      </nav>

      <div className={styles.fundo}>
        <div className={styles.loginContainer}>
          <h1 className={styles.loginTitulo}>Digite o código enviado para seu celular</h1>
          <p className={styles.loginSubtitulo}>
            Um código de verificação foi enviado para {location.state?.registrationData?.celular}
          </p>
          <form className={styles.loginFormulario}>
            <div className={styles.loginCampo}>
              <input
                type="text"
                className={styles.loginInput}
                placeholder="Digite o código"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
              />
            </div>
            <button 
              type="button" 
              className={styles.loginBotao} 
              onClick={handleVerifyCode}
            >
              Verificar
            </button>

            <button 
              type="button" 
              className={styles.loginBotao}
              onClick={reenviarCodigo}
              disabled={!podeReenviar}
            >
              {podeReenviar 
                ? 'Reenviar Código' 
                : `Aguarde ${formatarTempo(segundosRestantes)} para reenviar`}
            </button>

            <button
              type="button"
              className={styles.registerBotaoSecundario}
              onClick={voltarParaRegistro}
            >
              Voltar
            </button>
          </form>
        </div>
      </div>
      <footer id="contact" className={styles.footer}>
        <p>&copy; 2025 Mistoque. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
