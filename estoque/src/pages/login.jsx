import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./Login.module.css";
import { Link } from "react-router-dom";
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import api from '../utils/api';

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [celular, setCelular] = useState("");
  const [senha, setSenha] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/produtos');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!celular || !senha) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    if (!isValidPhoneNumber(celular)) {
      alert("Por favor, insira um número de celular válido.");
      return;
    }

    try {
      const response = await api.post('/login', {
        celular,
        senha
    });

      if (response.data.success) {
      navigate("/dashboard");
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      alert(error.response?.data?.message || "Erro ao fazer login. Tente novamente.");
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          <Link to="/">
            <img src="/box.png" alt="Ícone" className={styles.icon} />
            Mistoque
          </Link>
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
          <h1 className={styles.loginTitulo}>Entre com seus dados</h1>
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
            <div className={styles.loginCampo}>
              <input
                type="password"
                className={styles.loginInput}
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                maxLength={20}
              />
            </div>
            <button type="button" className={styles.loginBotao} onClick={handleLogin}>
              Entrar
            </button>

            <button
              type="button"
              className={styles.registerBotaoSecundario}
              onClick={() => navigate("/")}
            >
              Voltar
            </button>

            <button
              type="button"
              className={styles.registerBotaoSecundario}
              onClick={() => navigate("/celsenha")}
            >
              Esqueci minha senha
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
