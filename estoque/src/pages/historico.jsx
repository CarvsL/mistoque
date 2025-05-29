import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Historico.module.css";
import { API_BASE_URL } from '../config/config';

function Historico() {
  const [historico, setHistorico] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [userInfo, setUserInfo] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const navigate = useNavigate();
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  }
  const [menuOpen, setMenuOpen] = useState(false);
  

  // Função para verificar se o usuário está logado
  const checkLogin = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/usuario-logado`, {
        credentials: "include",
      });
      if (!response.ok) {
        navigate("/");
      }
    } catch (err) {
      console.error("Erro ao verificar login:", err);
      navigate("/");
    }
  };

  // Verifica o login ao carregar o componente
  useEffect(() => {
    checkLogin();
  }, [navigate]);

  // Busca as informações do usuário logado
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/usuario-logado`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Erro ao buscar informações do usuário");
        }
        const data = await response.json();
        setUserInfo(data.user);
      } catch (err) {
        console.error("Erro ao buscar informações do usuário:", err);
      }
    };

    fetchUserInfo();
  }, []);

  // Busca o histórico de alterações
  useEffect(() => {
    const fetchHistorico = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/historico`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Erro ao buscar histórico");
        }
        const data = await response.json();
        setHistorico(data);
      } catch (err) {
        console.error("Erro ao buscar histórico:", err);
      }
    };

    fetchHistorico();
  }, []);

  // Função para ordenar os dados
  const handleSort = (column) => {
    let direction = "asc";
    if (sortColumn === column && sortDirection === "asc") {
      direction = "desc";
    }
    setSortColumn(column);
    setSortDirection(direction);
  };

  // Função para renderizar o ícone de ordenação
  const renderSortIcon = (column) => {
    if (sortColumn === column) {
      return sortDirection === "asc" ? " ↑" : " ↓";
    }
    return null;
  };

  // Função para filtrar e ordenar os dados
  const getFilteredAndSortedHistorico = () => {
    if (!Array.isArray(historico)) {
      return [];
    }
  
    const filtered = historico.filter((item) => {
      const produtoNome = item.produto_nome || "";
      return produtoNome.toLowerCase().includes(searchTerm.toLowerCase());
    });
  
    if (!sortColumn) return filtered;
  
    return [...filtered].sort((a, b) => {
      // Tratamento especial para cada tipo de coluna
      let valA, valB;
  
      if (sortColumn === "quantidade_alterada") {
        // Converte para número
        valA = Number(a[sortColumn]);
        valB = Number(b[sortColumn]);
      } else if (sortColumn === "data_alteracao") {
        // Converte para Date
        valA = new Date(a[sortColumn]).getTime();
        valB = new Date(b[sortColumn]).getTime();
      } else {
        // Mantém como string para outras colunas
        valA = a[sortColumn];
        valB = b[sortColumn];
      }
  
      if (valA < valB) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (valA > valB) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const filteredAndSortedHistorico = getFilteredAndSortedHistorico();

  // Componente de Tabela Paginada
  const TabelaPaginada = ({ historico }) => {
    const itensPorPagina = 15;
    const [paginaAtual, setPaginaAtual] = useState(1);

    useEffect(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, [paginaAtual]);

    const totalPaginas = Math.ceil(historico.length / itensPorPagina);

    const carregarItens = () => {
      const inicio = (paginaAtual - 1) * itensPorPagina;
      const fim = inicio + itensPorPagina;
      return historico.slice(inicio, fim);
    };

    const handlePaginaAnterior = () => {
      if (paginaAtual > 1) {
        setPaginaAtual(paginaAtual - 1);
      }
    };

    const handleProximaPagina = () => {
      if (paginaAtual < totalPaginas) {
        setPaginaAtual(paginaAtual + 1);
      }
    };

    const renderizarNumerosPagina = () => {
      const numeros = [];
      const maxBotoes = 5;

      if (totalPaginas > 1) {
        numeros.push(
          <button
            key={1}
            onClick={() => setPaginaAtual(1)}
            className={paginaAtual === 1 ? styles.activePage : ""}
          >
            1
          </button>
        );
      }

      if (paginaAtual > 3 && totalPaginas > maxBotoes) {
        numeros.push(<span key="left-ellipsis">...</span>);
      }

      let inicio = Math.max(2, paginaAtual - 1);
      let fim = Math.min(paginaAtual + 1, totalPaginas - 1);

      if (paginaAtual <= 3) {
        fim = Math.min(4, totalPaginas - 1);
      } else if (paginaAtual >= totalPaginas - 2) {
        inicio = Math.max(totalPaginas - 3, 2);
      }

      for (let i = inicio; i <= fim; i++) {
        if (i > 1 && i < totalPaginas) {
          numeros.push(
            <button
              key={i}
              onClick={() => setPaginaAtual(i)}
              className={paginaAtual === i ? styles.activePage : ""}
            >
              {i}
            </button>
          );
        }
      }

      if (paginaAtual < totalPaginas - 2 && totalPaginas > maxBotoes) {
        numeros.push(<span key="right-ellipsis">...</span>);
      }

      if (totalPaginas > 1) {
        numeros.push(
          <button
            key={totalPaginas}
            onClick={() => setPaginaAtual(totalPaginas)}
            className={paginaAtual === totalPaginas ? styles.activePage : ""}
          >
            {totalPaginas}
          </button>
        );
      }

      return numeros;
    };

    return (
      <>
        <table className={styles.historicoTable}>
          <thead>
            <tr>
              <th onClick={() => handleSort("data_alteracao")}>Data{renderSortIcon("data_alteracao")}</th>
              <th onClick={() => handleSort("produto_nome")}>Produto{renderSortIcon("produto_nome")}</th>
              <th onClick={() => handleSort("tipo_alteracao")}>Alteração{renderSortIcon("tipo_alteracao")}</th>
              <th onClick={() => handleSort("quantidade_alterada")}>Quantidade{renderSortIcon("quantidade_alterada")}</th>
            </tr>
          </thead>
          <tbody>
            {carregarItens().map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.data_alteracao).toLocaleString()}</td>
                <td>{item.nome_produto}</td>
                <td>{item.tipo_alteracao === "entrada" ? "Entrada" : "Saída"}</td>
                <td>{Number(item.quantidade_alterada).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.paginacao}>
          <button
            onClick={handlePaginaAnterior}
            disabled={paginaAtual === 1}
            className={styles.navButton}
          >
            &lt;
          </button>

          {renderizarNumerosPagina()}

          <button
            onClick={handleProximaPagina}
            disabled={paginaAtual === totalPaginas}
            className={styles.navButton}
          >
            &gt;
          </button>
        </div>
      </>
    );
  };

  // Função para abrir o modal de perfil
  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  // Função para fechar o modal de perfil
  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  // Função para deslogar o usuário
  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao deslogar");
      }
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

        <div className={styles.menuIcon} onClick={toggleMenu}>
          <div className={styles.bar}></div>
          <div className={styles.bar2}></div>
          <div className={styles.bar2}></div>
        </div>
      </header>

      <nav className={styles.mobileNav}>
        <ul className={`${styles.mobileNavLinks} ${menuOpen ? styles.showMenu : ''}`}>
          <li><button onClick={() => navigate("/produtos")} className={styles.navButtonHist}>
            Voltar
          </button></li>

          

          

          
        </ul>
      </nav>

      <div className={styles.head}>
        <button onClick={() => navigate("/produtos")} className={styles.navButtonHist}>
          Voltar
        </button>
       
      </div>

      <div className={styles.fundo}>
        <div className={styles.container2}>
          <p className={styles.titlecat}>Histórico de Alterações</p>
          <input
            type="text"
            placeholder="Pesquisar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      

      <div className={styles.historicoTableContainer}>
        {filteredAndSortedHistorico.length === 0 ? (
          <div className={styles.emptyMessage}>
            <h3>Não há alterações registradas</h3>
          </div>
        ) : (
          <TabelaPaginada historico={filteredAndSortedHistorico} />
        )}
      </div>

      {isProfileModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <span className={styles.closeIcon} onClick={handleCloseProfileModal}>
              &times;
            </span>
            <h2>Perfil do Usuário</h2>
            <div className={styles.profileInfo}>
              {userInfo && userInfo.foto_perfil && (
                <img
                  src={`${API_BASE_URL}${userInfo.foto_perfil}`}
                  alt="Foto de perfil"
                  className={styles.profileImage}
                />
              )}
              <div className={styles.profileDetails}>
                <p><strong>Nome Comercial:</strong> {userInfo?.nome_comercial || "Não informado"}</p>
                <p><strong>Celular:</strong> {userInfo?.celular || "Não informado"}</p>
              </div>
            </div>
            
          </div>
        </div>
      )}
      <footer id="contact" className={styles.footer}>
        <p>&copy; 2025 Mistoque. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default Historico;