import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Principal.module.css";
import { Link } from "react-router-dom";

export default function Principal() {

    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };


    return (
        <div className={styles.container}>
            {/* Header */}

            <header className={styles.header}>
                <h1 className={styles.logo}>
                    <Link to="/">
                        <img src="/box.png" alt="Ícone" className={styles.icon} />
                        Mistoque
                    </Link>
                </h1>

                {/* Menu normal (visível em telas grandes) */}
                <nav className={styles.desktopNav}>
                    <ul className={styles.navLinks}>
                        <li><Link to="/login">Entrar</Link></li>
                        <li><Link to="/register">Cadastre-se</Link></li>
                    </ul>
                </nav>

                {/* Menu hambúrguer (visível apenas em mobile) */}
                <div className={styles.menuIcon} onClick={toggleMenu}>
                    <div className={styles.bar}></div>
                    <div className={styles.bar}></div>
                    <div className={styles.bar}></div>
                </div>
            </header>

            {/* Menu móvel (aparece entre header e hero APENAS em mobile) */}
            <nav className={styles.mobileNav}>
                <ul className={`${styles.mobileNavLinks} ${menuOpen ? styles.showMenu : ''}`}>
                    <li><Link to="/login">Entrar</Link></li>
                    <li><Link to="/register">Cadastre-se</Link></li>
                </ul>
            </nav>

            <div className={styles.fundo}>

                {/* Hero Section */}
                <section className={styles.hero}>
                    <div>
                        <h2 className={styles.seues}>Seu <span className={styles.cordois}>estoque</span> organizado, seu <span className={styles.cordois}>catálogo</span> em destaque, seu negócio nas alturas.</h2>
                        <h2 className={styles.vejac}>Veja como:</h2>

                    </div>
                </section>

                {/* Dois containers lado a lado */}
                <div className={styles.twoColumns}>
                    <div className={styles.column}>
                        <h3>Catálogo próprio</h3>
                        <div className={styles.contentWrapper}>
                            <div className={styles.textContent}>
                                <span>Catálogo online 24 horas</span><br />
                                <span>Selecione seus produtos</span><br />
                                <span>Personalize com a sua cara</span><br />
                                <span>Compartilhe com seus clientes</span><br />
                            </div>
                            <img src="/caixas.png" alt="caixas" className={styles.columnImage} />

                        </div>
                        {/* Vídeo adicionado aqui */}

                    </div>

                    <div className={styles.column}>
                        <h3 >Controle total de estoque</h3>
                        <div className={styles.contentWrapper}>
                            <div className={styles.textContent}>
                                <span>Entrada e saída de produtos</span><br />
                                <span>Visualização ordenada</span><br />
                                <span>Histórico de movimentação</span><br />
                                <span>Banco de dados automático</span><br />
                            </div>
                            <img src="/mao.png" alt="mao" className={styles.columnImage} />
                        </div>
                        {/* Vídeo adicionado aqui */}

                    </div>



                </div>
                <div className={styles.videoContainer}>
                    <video controls className={styles.video}>
                        <source src="/con.mp4" type="video/mp4" />
                        Seu navegador não suporta o elemento de vídeo.
                    </video>
                </div>
                <div className={styles.whatsContainer}>
                    <h2 className={styles.vejac}>Suporte</h2>
                    <img src="/whats.png" alt="whats" className={styles.whats} />
                </div>
            </div>








            {/* Footer */}
            <footer id="contact" className={styles.footer}>
                <p>&copy; 2025 Mistoque. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
}