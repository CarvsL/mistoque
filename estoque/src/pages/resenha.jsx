import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Login.module.css";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ReSenha() {
  const navigate = useNavigate();
  const location = useLocation();
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthenticated = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
      return;
    }

    // Verifica se tem os dados necessários
    if (!location.state?.celular || !location.state?.token) {
      navigate("/celsenha");
    }
  }, [location.state, navigate, isAuthenticated]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleRedefinirSenha = async () => {
    if (!senha || !confirmarSenha) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    if (senha !== confirmarSenha) {
      alert("As senhas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/redefinir-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          celular: location.state?.celular,
          token: location.state?.token,
          novaSenha: senha
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao redefinir senha");
      }

      alert("Senha redefinida com sucesso!");
      navigate("/login");
    } catch (error) {
      alert(error.message || "Erro ao redefinir senha. Tente novamente.");
    }
  };

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
          <h1 className={styles.loginTitulo}>Redefinir Senha</h1>
          <p className={styles.loginSubtitulo}>
            Digite sua nova senha
          </p>
          <form className={styles.loginFormulario}>
            <div className={styles.loginCampo}>
              <input
                type="password"
                className={styles.loginInput}
                placeholder="Nova senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className={styles.loginCampo}>
              <input
                type="password"
                className={styles.loginInput}
                placeholder="Confirmar nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                maxLength={20}
              />
            </div>
            <button 
              type="button" 
              className={styles.loginBotao} 
              onClick={handleRedefinirSenha}
            >
              Redefinir Senha
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
