import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css"; // Importando os estilos
import { API_BASE_URL } from '../config/config';

function Dashboard() {
  const [usuario, setUsuario] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/usuario-logado`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUsuario(data);
        } else {
          alert("Erro ao buscar os dados do usuário. Redirecionando para login.");
          navigate("/");
        }
      } catch (err) {
        console.error("Erro ao buscar os dados do usuário:", err);
        navigate("/");
      }
    };

    fetchUsuario();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
      navigate("/");
    } catch (err) {
      console.error("Erro ao deslogar:", err);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          <img src="/box.png" alt="Ícone" className={styles.icon} />
          Mistoque
        </h1>
      </header>
      <div className={styles.fundo}>
        
          {usuario ? (
            <div className={styles.userInfo}>
              <h1>Bem-vindo(a), {usuario.email}!</h1>
              <img
                src={`${API_BASE_URL}${usuario.foto_perfil}`}
                alt="Foto de Perfil"
                className={styles.userPhoto}
              />
              <p>Bem Vindo,  {usuario.celular}.</p>
              <button onClick={() => navigate("/produtos")} className={styles.enterButton}>
                Entrar
              </button>
              <br />
              <button onClick={handleLogout} className={styles.logoutButton}>
                Sair

              </button>
            </div>
          ) : (
            <div className={styles.welcomeMessage}>
              <h1>Bem-vindo(a) ao Mistoque!</h1>
            </div>
          )}
        
      </div>
      <footer id="contact" className={styles.footer}>
        <p>&copy; 2025 Mistoque. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default Dashboard;
