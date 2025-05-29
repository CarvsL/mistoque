import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import { Link } from "react-router-dom";
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAuth } from "../hooks/useAuth";

export default function CelSenha() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [celular, setCelular] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/produtos');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleVerificarCelular = async () => {
    if (!celular || !isValidPhoneNumber(celular)) {
      alert("Por favor, insira um número de celular válido.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/verificar-celular-senha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ celular }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Celular não encontrado");
      }

      // Se o celular existir, navega para a página de código
      navigate("/codetwo", {
        state: {
          celular: celular
        }
      });
    } catch (error) {
      alert(error.message || "Erro ao verificar celular");
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
          <h1 className={styles.loginTitulo}>Recuperação de Senha</h1>
          <p className={styles.loginSubtitulo}>
            Digite o número de celular cadastrado na sua conta
          </p>
          <form className={styles.loginFormulario}>
            <div className={styles.loginCampo}>
              <PhoneInput
                placeholder="Celular"
                value={celular}
                onChange={setCelular}
                defaultCountry="BR"
                international
                countryCallingCodeEditable={false}
                className={styles.phoneInput}
              />
            </div>
            <button 
              type="button" 
              className={styles.loginBotao} 
              onClick={handleVerificarCelular}
            >
              Verificar
            </button>

            <button
              type="button"
              className={styles.registerBotaoSecundario}
              onClick={() => navigate("/login")}
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
