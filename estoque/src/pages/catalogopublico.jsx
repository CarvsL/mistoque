import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./CatalogoPublico.module.css";
import { API_BASE_URL } from '../config/config';
<link href="https://fonts.cdnfonts.com/css/helvetica-255" rel="stylesheet" />

function CatalogoPublico() {
  const { catalogoId } = useParams();
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoriaSelecionadaFiltro, setCategoriaSelecionadaFiltro] = useState("TUDO");
  const [ordenacao, setOrdenacao] = useState('preco-asc'); // 'preco-asc', 'preco-desc', 'nome-asc'
  const [userInfo, setUserInfo] = useState({
    nome_comercial: '',
    celular: '',
    foto_perfil: '',
    cor: '#000000'
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [carrinho, setCarrinho] = useState([]);

  // Funções do carrinho
  const adicionarAoCarrinho = (produto) => {
    setCarrinho(prev => {
      const itemExistente = prev.find(item => item.id === produto.id);

      if (itemExistente) {
        return prev.map(item =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      } else {
        return [...prev, {
          ...produto,
          quantidade: 1,
          preco: Number(produto.preco) // Convertendo para número
        }];
      }
    });
    // Adicione esta linha para manter a posição de rolagem
    window.scrollTo({ top: window.scrollY, behavior: "auto" });

  };


  const removerDoCarrinho = (produtoId) => {
    setCarrinho(prev => prev.filter(item => item.id !== produtoId));
  };

  const atualizarQuantidade = (produtoId, novaQuantidade) => {
    if (novaQuantidade < 1) return;

    setCarrinho(prev =>
      prev.map(item =>
        item.id === produtoId
          ? { ...item, quantidade: novaQuantidade }
          : item
      )
    );
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) =>
      total + (Number(item.preco) * item.quantidade),
      0
    ).toFixed(2);
  };

  function getContrastColor(hexColor) {
    // Converte hex para RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);

    // Calcula a luminosidade (fórmula de percepção humana)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Retorna branco para cores escuras, preto para claras
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  const enviarPedidoWhatsApp = () => {
    if (!userInfo || !userInfo.celular || carrinho.length === 0) return;

    const numeroWhatsApp = userInfo.celular.replace(/\D/g, '');
    const mensagem = `Olá ${userInfo.nome_comercial || ''}, gostaria de fazer um pedido:\n\n${carrinho.map(item =>
      `${item.nome} - ${item.quantidade}x R$ ${(item.preco * item.quantidade).toFixed(2)}`
    ).join('\n')}\n\n*Total: R$ ${calcularTotal()}*`;

    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
  };

  useEffect(() => {
    const buscarDados = async () => {
      try {
        // Buscar informações da loja
        const responseLoja = await fetch(
          `${API_BASE_URL}/catalogo/${catalogoId}/dados-loja`
        );

        if (!responseLoja.ok) {
          throw new Error("Catálogo não encontrado.");
        }

        const dataLoja = await responseLoja.json();
        setUserInfo(dataLoja);

        // Buscar produtos do catálogo
        const responseProdutos = await fetch(
          `${API_BASE_URL}/catalogo/${catalogoId}`
        );

        if (!responseProdutos.ok) {
          throw new Error("Erro ao carregar produtos.");
        }

        const dataProdutos = await responseProdutos.json();
        setProdutos(dataProdutos);

        // Buscar categorias do usuário
        const responseCategorias = await fetch(
          `${API_BASE_URL}/catalogo/${catalogoId}/categorias`
        );

        if (responseCategorias.ok) {
          const dataCategorias = await responseCategorias.json();
          setCategorias(dataCategorias);
        }

      } catch (err) {
        console.error("Erro ao buscar catálogo:", err);
        setError("Erro ao carregar o catálogo. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

    buscarDados();
  }, [catalogoId]);

  const produtosFiltrados = (categoriaSelecionadaFiltro === "TUDO"
    ? [...produtos]
    : produtos.filter(produto => String(produto.categoria_id) === String(categoriaSelecionadaFiltro)))
    .sort((a, b) => {
      // Converter preços para números
      const precoA = Number(a.preco);
      const precoB = Number(b.preco);

      switch (ordenacao) {
        case 'preco-asc':
          return precoA - precoB;
        case 'preco-desc':
          return precoB - precoA;
        case 'nome-asc':
          return a.nome.localeCompare(b.nome);
        default:
          return 0;
      }
    });

  const handleAbrirModal = (produto) => {
    setProdutoSelecionado(produto);
  };

  const handleFecharModal = () => {
    setProdutoSelecionado(null);
  };



  const CardsPaginados = ({ produtos, cor }) => {


    const [itensPorPagina, setItensPorPagina] = useState(14);



    const totalPaginas = Math.max(1, Math.ceil(produtos.length / itensPorPagina));

    useEffect(() => {



    }, [paginaAtual]);

    const carregarItens = () => {
      const inicio = (paginaAtual - 1) * itensPorPagina;
      const fim = inicio + itensPorPagina;
      return produtos.slice(inicio, fim);
    };

    const handlePaginaAnterior = () => {
      if (paginaAtual > 1) {
        setPaginaAtual(paginaAtual - 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    const handleProximaPagina = () => {
      if (paginaAtual < totalPaginas) {
        setPaginaAtual(paginaAtual + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    const renderizarNumerosPagina = () => {
      const numeros = [];

      // Calcula a cor do texto para o botão ativo
      const activeTextColor = getContrastColor(cor || '#7a9292');

      numeros.push(
        <button
          key={1}
          onClick={() => {
            setPaginaAtual(1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}

          className={paginaAtual === 1 ? styles.activePage : ""}
          disabled={totalPaginas === 1}
          style={{
            color: paginaAtual === 1 ? activeTextColor : '#000000'
          }}
        >
          1
        </button>
      );

      if (totalPaginas > 1) {
        if (paginaAtual > 3) {
          numeros.push(<span key="left-ellipsis">...</span>);
        }

        let start = Math.max(2, paginaAtual - 1);
        let end = Math.min(totalPaginas - 1, paginaAtual + 1);

        if (paginaAtual <= 3) {
          end = Math.min(4, totalPaginas - 1);
        } else if (paginaAtual >= totalPaginas - 2) {
          start = Math.max(totalPaginas - 3, 2);
        }

        for (let i = start; i <= end; i++) {
          numeros.push(
            <button
              key={i}
              onClick={() => {
                setPaginaAtual(i);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={paginaAtual === i ? styles.activePage : ""}
              style={{
                color: paginaAtual === i ? activeTextColor : '#000000'
              }}
            >
              {i}
            </button>
          );
        }

        if (paginaAtual < totalPaginas - 2) {
          numeros.push(<span key="right-ellipsis">...</span>);
        }

        if (totalPaginas > 1) {
          numeros.push(
            <button
              key={totalPaginas}
              onClick={() => {
                setPaginaAtual(totalPaginas);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={paginaAtual === totalPaginas ? styles.activePage : ""}
              style={{
                color: paginaAtual === totalPaginas ? activeTextColor : '#000000'
              }}
            >
              {totalPaginas}
            </button>
          );
        }
      }

      return numeros;
    };

    return (
      <>


        <div className={styles.produtosContainerWrapper}>
          <div className={`${styles.produtosGrid} ${styles[`quantidade-${itensPorPagina}`]}`}>
            {carregarItens().map((produto) => (
              <div key={produto.id} className={styles.produtoCard}>
                <div className={styles.produtoImagemContainer} onClick={() => handleAbrirModal(produto)}>
                  {produto.imagem ? (
                    <img
                      src={`${API_BASE_URL}${produto.imagem}`}
                      alt={produto.nome}
                      className={styles.produtoImagem}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/caixa.jpg';
                      }}
                    />
                  ) : (
                    <img
                      src="/caixa.jpg"
                      alt="Imagem padrão"
                      className={styles.produtoImagem}
                    />
                  )}
                </div>
                <div className={styles.produtoInfo}>
                  <h3 className={styles.produtoNome}>{produto.nome}</h3>

                  <p className={styles.produtoPreco}>R$ {Number(produto.preco).toFixed(2)}</p>
                  <button style={{
                    backgroundColor: userInfo.cor || 'rgba(122, 146, 146, 1)',
                    color: getContrastColor(userInfo.cor || '#7a9292')
                  }}
                    className={styles.botaoComprar}
                    onClick={(e) => {

                      e.stopPropagation();
                      e.preventDefault();
                      adicionarAoCarrinho(produto);
                    }}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={styles.paginacao}
          style={{
            '--cor-dinamica': cor,
            '--text-color': getContrastColor(cor || '#7a9292')
          }}
        >
          {/* Botões de paginação */}
          <button
            onClick={handlePaginaAnterior}
            disabled={paginaAtual === 1}
            className={styles.navButton}

            style={{ color: '#000000' }} // Sempre preto
          >
            &lt;
          </button>

          {renderizarNumerosPagina()}

          <button
            onClick={handleProximaPagina}
            disabled={paginaAtual === totalPaginas}
            className={styles.navButton}

            style={{ color: '#000000' }} // Sempre preto
          >
            &gt;
          </button>
        </div>
      </>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Carregando...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div
      className={styles.container}
      style={{
        backgroundColor: userInfo.cor ? `${userInfo.cor}99` : 'rgba(122, 146, 146, 0.6)'
      }}
    >
      <div
        className={styles.header}
        style={{
          backgroundColor: userInfo.cor || 'rgba(122, 146, 146, 1)'
        }}
      >
        {userInfo && (
          <div className={styles.cabecalhoLoja}>
            <div className={styles.logoLojaContainer}>
              {userInfo.foto_perfil ? (
                <img
                  src={`${API_BASE_URL}${userInfo.foto_perfil}`}
                  alt={`Logo ${userInfo.nome_comercial || 'da loja'}`}
                  className={styles.logoLoja}
                />
              ) : (
                <div className={styles.logoPadrao}>
                  {userInfo.nome_comercial ? userInfo.nome_comercial.charAt(0) : 'L'}
                </div>
              )}
            </div>
            <p
              className={styles.emailLoja}
              style={{
                color: getContrastColor(userInfo.cor || '#7a9292'),
                textShadow: `0 1px 3px rgba(0,0,0,${getContrastColor(userInfo.cor || '#7a9292') === '#FFFFFF' ? '0.4' : '0.1'})`
              }}
            >
              {userInfo.nome_comercial}
            </p>
          </div>
        )}



      </div>
      <div className={styles.fundo}>
        <div className={styles.produtoscontainer}>
          <div className={styles.filtrosCategorias}>
            <select
              value={categoriaSelecionadaFiltro}
              onChange={(e) => setCategoriaSelecionadaFiltro(e.target.value)}
              className={styles.selectCategoria2}
            >
              <option value="TUDO">TODAS AS CATEGORIAS</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>

            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
              className={styles.selectCategoria2}
            >
              <option value="preco-asc">Preço: ↑ Crescente</option>
              <option value="preco-desc">Preço: ↓ Decrescente</option>
              <option value="nome-asc">Nome: A → Z</option>
            </select>
          </div>
          {produtosFiltrados.length === 0 ? (
            <p className={styles.semProdutos}>Nenhum produto encontrado nesta categoria.</p>
          ) : (
            <CardsPaginados
              produtos={produtosFiltrados}
              cor={userInfo?.cor || '#7a9292'} // Fallback para a cor original
            />
          )}
        </div>
      </div>

      {/* Modal de detalhes do produto */}
      {produtoSelecionado && (
        <div className={styles.modalOverlay} onClick={handleFecharModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <span className={styles.modalClose} onClick={handleFecharModal}>&times;</span>

            <div className={styles.modalImagemContainer}>
              {produtoSelecionado.imagem ? (
                <img
                  src={`${API_BASE_URL}${produtoSelecionado.imagem}`}
                  alt={produtoSelecionado.nome}
                  className={styles.modalImagem}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/caixa.jpg';
                  }}
                />
              ) : (
                <img
                  src="/caixa.jpg"
                  alt="Imagem padrão"
                  className={styles.modalImagem}
                />
              )}
            </div>

            <div className={styles.modalInfo}>
              <h2 className={styles.modalTitulo}>{produtoSelecionado.nome}</h2>
              <p className={styles.modalPreco}>R$ {Number(produtoSelecionado.preco).toFixed(2)}</p>
              <p className={styles.modalDescricao}>{produtoSelecionado.descricao}</p>
              <button
                style={{
                  backgroundColor: userInfo.cor || 'rgba(122, 146, 146, 1)',
                  color: getContrastColor(userInfo.cor || '#7a9292')
                }}
                className={styles.botaoComprar}
                onClick={(e) => {  // Adicione o parâmetro e aqui
                  e.stopPropagation();
                  e.preventDefault();
                  adicionarAoCarrinho(produtoSelecionado);
                  handleFecharModal();
                }}
              >
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Carrinho */}

      {carrinhoAberto && (
        <div className={styles.modalOverlay} onClick={() => setCarrinhoAberto(false)}>
          <div className={styles.modalContent2} onClick={(e) => e.stopPropagation()}>
            <span
              className={styles.modalClose}
              onClick={() => setCarrinhoAberto(false)}
            >
              &times;
            </span>

            <h2 className={styles.modalTitulo2}>Seu Carrinho</h2>

            {carrinho.length === 0 ? (
              <p className={styles.semProdutos}>Seu carrinho está vazio</p>
            ) : (
              <>
                <div className={styles.listaCarrinho}>
                  {carrinho.map(item => (
                    <div key={item.id} className={styles.itemCarrinho}>
                      <div className={styles.infoItem}>
                        <span className={styles.nomeItem}>{item.nome}</span>
                        <span className={styles.precoItem}>
                          R$ {Number(item.preco).toFixed(2)}
                        </span>
                      </div>

                      <div className={styles.controlesQuantidade}>
                        <button
                          onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                          disabled={item.quantidade <= 1}
                        >
                          -
                        </button>
                        <span>{item.quantidade}</span>
                        <button
                          onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className={styles.subtotalItem}>
                        R$ {(Number(item.preco) * item.quantidade).toFixed(2)}
                      </div>

                      <button
                        className={styles.removerItem}
                        onClick={() => removerDoCarrinho(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className={styles.totalCarrinho}>
                  <span>Total:</span>
                  <span>R$ {calcularTotal()}</span>
                </div>

                <button
                  className={styles.botaoFinalizar}
                  onClick={enviarPedidoWhatsApp}
                  disabled={carrinho.length === 0 || !userInfo?.celular}
                >
                  Finalizar Pedido
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Ícone/Botão do Carrinho */}
      <div
        className={styles.carrinhoIcone}
        onClick={() => setCarrinhoAberto(true)}
      >
        🛒
        {carrinho.length > 0 && (
          <span className={styles.contadorCarrinho}>
            {carrinho.reduce((total, item) => total + item.quantidade, 0)}
          </span>
        )}
      </div>
      <footer
        className={styles.footer}
        style={{
          backgroundColor: userInfo.cor || 'rgba(122, 146, 146, 1)',
          color: getContrastColor(userInfo.cor || '#7a9292')
        }}
      >
        <p>&copy; 2025 Mistoque. Todos os direitos reservados.</p>
      </footer>

    </div>

  );
}

export default CatalogoPublico;