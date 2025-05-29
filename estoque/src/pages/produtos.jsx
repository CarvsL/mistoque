import { useEffect, useState, useRef } from "react";
import styles from "./Produtos.module.css";
import { useNavigate } from "react-router-dom";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import { Link } from "react-router-dom";
import { API_BASE_URL } from '../config/config';



function Produtos() {

  const itensPorPagina = 8;
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [produtos, setProdutos] = useState([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [imagem, setImagem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [croppedImage, setCroppedImage] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropper, setCropper] = useState(null);
  const [userInfo, setUserInfo] = useState({
    id: null,
    nome_comercial: "Carregando...",
    celular: "Carregando...",
    foto_perfil: null,
    assinatura_status: null,
    assinatura_expira_em: null,
    assinante: null
  });
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isEntradaModalOpen, setIsEntradaModalOpen] = useState(false);
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeEntradaSaida, setQuantidadeEntradaSaida] = useState("");
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [codigo, setCodigo] = useState("");
  const [modoBusca, setModoBusca] = useState("nome"); // "nome" ou "codigo"
  const [codigoBusca, setCodigoBusca] = useState(""); // Código digitado pelo usuário
  const [catalogoLink, setCatalogoLink] = useState("");
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]); // Lista de categorias
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false); // Controla a abertura do modal de categorias
  const [categoriaEditando, setCategoriaEditando] = useState(null); // Categoria sendo editada
  const [nomeCategoria, setNomeCategoria] = useState(""); // Nome da categoria sendo criada/editada
  const [categoriaSelecionadaCadastro, setCategoriaSelecionadaCadastro] = useState("");
  // No início do componente, junto com os outros estados
  const [categoriaSelecionadaFiltro, setCategoriaSelecionadaFiltro] = useState("TUDO");
  const [corLoja, setCorLoja] = useState("#000000"); // Cor padrão preta
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [tempNomeComercial, setTempNomeComercial] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [croppedProfileImage, setCroppedProfileImage] = useState(null);
  const [showProfileCropper, setShowProfileCropper] = useState(false);
  const [planoInfo, setPlanoInfo] = useState(null);

  const [isPlanosModalOpen, setIsPlanosModalOpen] = useState(false);
  const [planos, setPlanos] = useState([
    { id: 1, nome: "Básico", preco: "Grátis", limite: "6 produtos", recursos: ["Até 6 produtos", "Catálogo básico", "Suporte prioritário"] },
    { id: 2, nome: "Premium", preco: "R$ 19,90/mês", limite: "Produtos ilimitados", recursos: ["Produtos ilimitados", "Catálogo avançado", "Suporte prioritário", "Personalização avançada"] }
  ]);
  const [planoSelecionado, setPlanoSelecionado] = useState(null);
  const [mercadoPagoLoaded, setMercadoPagoLoaded] = useState(false);

  // Adicione este estado para controlar o carregamento do cancelamento
  const [cancelandoAssinatura, setCancelandoAssinatura] = useState(false);

  const handlePlanosClick = () => {
    setIsPlanosModalOpen(true);
  };


  // Adicione estas referências

  const profileImgRef = useRef(null); // Para o cropper de perfil

  // E este estado
  const [profileCropper, setProfileCropper] = useState(null); // Cropper específico para perfil

  const [menuOpen, setMenuOpen] = useState(false);

  // Função para cortar a imagem do perfil
  const handleProfileCrop = () => {
    if (profileCropper) {
      const croppedDataURL = profileCropper.getCroppedCanvas({
        width: 200,
        height: 200,
        fillColor: "#fff",
      }).toDataURL();
      setCroppedProfileImage(croppedDataURL);
      setShowProfileCropper(false);
      if (profileCropper) {
        profileCropper.destroy();
        setProfileCropper(null);
      }
    }
  };

  // Função para cancelar o corte da imagem do perfil
  const handleProfileCropCancel = () => {
    setShowProfileCropper(false);
    setProfileImage(null);
    if (profileCropper) {
      profileCropper.destroy();
      setProfileCropper(null);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  }

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
        console.log('Dados do usuário atualizados:', data);
        if (data.success && data.user) {
          setUserInfo(prevState => ({
            ...prevState,
            ...data.user
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar informações do usuário:", err);
      }
    };

    fetchUserInfo();

    // Atualiza as informações do usuário a cada 30 segundos
    const interval = setInterval(fetchUserInfo, 30000);

    return () => clearInterval(interval);
  }, []);

  // Carrega o SDK do Mercado Pago
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://sdk.mercadopago.com/js/v2';
  script.onload = () => setMercadoPagoLoaded(true);
  document.body.appendChild(script);
  
  return () => {
    document.body.removeChild(script);
  };
}, []);



// Função para lidar com a assinatura
const handleAssinarPlano = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/criar-pagamento`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.checkout_url) {
      // Redireciona na mesma janela para o fluxo de assinatura
      window.location.href = data.checkout_url;
    } else {
      alert('Erro: ' + (data.message || 'URL não recebida'));
    }
  } catch (err) {
    console.error('Erro:', err);
    alert('Erro ao assinar: ' + err.message);
  }
};

  // Busca os produtos
  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/produtos`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao buscar produtos");
      }
      const data = await response.json();

      // Garante que o campo "catalogo" seja booleano
      const produtosFormatados = data.map((produto) => ({
        ...produto,
        catalogo: Boolean(produto.catalogo), // Converte para booleano
      }));

      setProdutos(produtosFormatados); // Atualiza o estado com os produtos formatados
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      setProdutos([]);
    }
  };

  // Adicione este useEffect para carregar a cor quando o componente montar
  useEffect(() => {
    const fetchCorLoja = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/cor-loja`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setCorLoja(data.cor);
        }
      } catch (err) {
        console.error("Erro ao buscar cor da loja:", err);
      }
    };

    fetchCorLoja();
  }, []);

  // Adicione esta função para salvar a cor
  const salvarCorLoja = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/cor-loja`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cor: corLoja }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar cor da loja");
      }

      alert("Cor da loja salva com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar cor da loja:", err);
      alert("Erro ao salvar cor da loja");
    }
  };

  const handleConfirmarEntradaPorCodigo = async () => {
    if (!codigoBusca || !quantidadeEntradaSaida || quantidadeEntradaSaida <= 0) {
      alert("Preencha o código e a quantidade corretamente.");
      return;
    }

    try {
      // Busca o produto pelo código
      const response = await fetch(`${API_BASE_URL}/produtos/codigo/${codigoBusca}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Produto não encontrado.");
      }

      const produto = await response.json();

      // Realiza a entrada/saída
      const endpoint = isEntradaModalOpen ? "entrada" : "saida";
      const res = await fetch(`${API_BASE_URL}/produtos/${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          produtoId: produto.id,
          quantidade: quantidadeEntradaSaida,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao registrar entrada/saída.");
      }

      // Atualiza a lista de produtos
      fetchProdutos();

      // Fecha o modal e limpa os estados
      setIsEntradaModalOpen(false);
      setCodigoBusca("");
      setQuantidadeEntradaSaida("");
    } catch (err) {
      console.error("Erro ao registrar entrada/saída por código:", err);
      alert("Código do produto não encontrado. Verifique o código e tente novamente.");
    }
  };

  const handleConfirmarSaidaPorCodigo = async () => {
    if (!codigoBusca || !quantidadeEntradaSaida || quantidadeEntradaSaida <= 0) {
      alert("Preencha o código e a quantidade corretamente.");
      return;
    }

    try {
      // Busca o produto pelo código
      const response = await fetch(`${API_BASE_URL}/produtos/codigo/${codigoBusca}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Produto não encontrado.");
      }

      const produto = await response.json();

      // Verifica se a quantidade é suficiente
      if (produto.quantidade < quantidadeEntradaSaida) {
        alert("Quantidade insuficiente em estoque.");
        return;
      }

      // Realiza a saída
      const res = await fetch(`${API_BASE_URL}/produtos/saida`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          produtoId: produto.id,
          quantidade: quantidadeEntradaSaida,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao registrar saída.");
      }

      // Atualiza a lista de produtos
      fetchProdutos();

      // Fecha o modal e limpa os estados
      setIsSaidaModalOpen(false);
      setCodigoBusca("");
      setQuantidadeEntradaSaida("");
    } catch (err) {
      console.error("Erro ao registrar saída por código:", err);
      alert("Código do produto não encontrado. Verifique o código e tente novamente.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagem(reader.result);
        setCroppedImage(null);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCrop = () => {
    if (cropper) {
      const croppedDataURL = cropper.getCroppedCanvas({
        width: 200,
        height: 200,
        fillColor: "#fff",
      }).toDataURL();
      setCroppedImage(croppedDataURL);
      setShowCropper(false);
    }
  };

  const handleCancel = () => {
    setShowCropper(false);
    setImagem(null);
    setCroppedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("nome", nome);
    formData.append("codigo", codigo);
    formData.append("descricao", descricao);
    formData.append("preco", preco);
    formData.append("quantidade", quantidade);
    console.log("Categoria selecionada:", categoriaSelecionadaCadastro);
    formData.append("categoria_id", categoriaSelecionadaCadastro || "");
    if (croppedImage) {
      const blob = await fetch(croppedImage).then((res) => res.blob());
      formData.append("imagem", blob, "imagem.jpg");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/produtos`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          alert(errorData.message);
        } else {
          throw new Error(errorData.message || "Erro ao cadastrar produto");
        }
      } else {
        fetchProdutos();
        setIsModalOpen(false);
        setNome("");
        setCodigo("");
        setDescricao("");
        setPreco("");
        setQuantidade("");
        setImagem(null);
        setCroppedImage(null);
      }
    } catch (err) {
      console.error("Erro ao cadastrar produto:", err);
      alert("Erro ao cadastrar produto. Tente novamente.");
    }
  };

  const handleExcluir = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/produtos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao excluir produto");
      }
      fetchProdutos();
      setIsDetailModalOpen(false);
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
    }
  };

  // Verificar limite de produtos ao carregar o componente
  useEffect(() => {
    const verificarLimiteProdutos = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/verificar-limite-produtos`, {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
        setPlanoInfo(data);
      } catch (err) {
        console.error("Erro ao verificar limite de produtos:", err);
      }
    };

    verificarLimiteProdutos();
  }, [produtos]); // Atualiza quando a lista de produtos muda

  // Modal de Limite de Produtos
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  // Verificar limite antes de abrir o modal de cadastro
  const handleOpenCadastroModal = () => {
    if (planoInfo?.limite === 'basico' && planoInfo?.produtosRestantes <= 0) {
      setIsLimitModalOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  useEffect(() => {
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

    checkLogin();
    fetchProdutos();
  }, [navigate]);

  const handleEditar = async () => {
    try {
      const formData = new FormData();
      formData.append("nome", selectedProduto.nome);
      formData.append("codigo", selectedProduto.codigo);
      formData.append("descricao", selectedProduto.descricao);
      formData.append("preco", selectedProduto.preco);
      formData.append("quantidade", selectedProduto.quantidade);
      if (selectedProduto.categoria_id) {
        formData.append("categoria_id", selectedProduto.categoria_id);
      } else {
        formData.append("categoria_id", ""); // Envia uma string vazia se não houver categoria
      }

      if (croppedImage) {
        const blob = await fetch(croppedImage).then((res) => res.blob());
        formData.append("imagem", blob, "imagem.jpg");
      }

      // Debug: Verifique os dados do FormData
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const response = await fetch(`${API_BASE_URL}/produtos/${selectedProduto.id}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao editar produto");
      }

      const data = await response.json();
      setSelectedProduto(data.produto); // Atualiza o estado com o produto retornado
      fetchProdutos(); // Atualiza a lista de produtos
      setIsEditing(false); // Sai do modo de edição
      setShowCropper(false);
      setImagem(null);
      setCroppedImage(null);
    } catch (err) {
      console.error("Erro ao editar produto:", err);
      alert("Erro ao editar produto. Tente novamente.");
    }
  };

  const handleConfirmarEntrada = async () => {
    if (!produtoSelecionado || !quantidadeEntradaSaida || quantidadeEntradaSaida <= 0) {
      alert("Selecione um produto e insira uma quantidade válida.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/produtos/entrada`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          produtoId: produtoSelecionado.id,
          quantidade: quantidadeEntradaSaida,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao registrar entrada.");
      }

      // Atualiza a lista de produtos
      fetchProdutos();

      // Fecha o modal e limpa os estados
      setIsEntradaModalOpen(false);
      setProdutoSelecionado(null);
      setQuantidadeEntradaSaida("");
      setProdutosFiltrados([]);
    } catch (err) {
      console.error("Erro ao registrar entrada:", err);
      alert("Erro ao registrar entrada.");
    }
  };

  const handleConfirmarSaida = async () => {
    if (!produtoSelecionado || !quantidadeEntradaSaida || quantidadeEntradaSaida <= 0) {
      alert("Selecione um produto e insira uma quantidade válida.");
      return;
    }

    if (produtoSelecionado.quantidade < quantidadeEntradaSaida) {
      alert("Quantidade insuficiente em estoque.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/produtos/saida`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          produtoId: produtoSelecionado.id,
          quantidade: quantidadeEntradaSaida,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao registrar saída.");
      }

      // Atualiza a lista de produtos
      fetchProdutos();

      // Fecha o modal e limpa os estados
      setIsSaidaModalOpen(false);
      setProdutoSelecionado(null);
      setQuantidadeEntradaSaida("");
      setProdutosFiltrados([]);
    } catch (err) {
      console.error("Erro ao registrar saída:", err);
      alert("Erro ao registrar saída.");
    }
  };

  const handleCatalogoChange = async (produtoId, checked) => {
    try {
      console.log('Status do usuário:', userInfo); // Debug

      // Se estiver tentando marcar (checked = true) e não for assinante
      if (checked && userInfo?.assinante !== 1) {
        // Conta quantos produtos já estão no catálogo
        const produtosNoCatalogo = produtos.filter(p => p.catalogo).length;
        
        if (produtosNoCatalogo >= 6) {
          setIsLimitModalOpen(true);
          return;
        }
      }

      const response = await fetch(`${API_BASE_URL}/produtos/${produtoId}/catalogo`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ catalogo: checked }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar status do catálogo");
      }

      // Atualiza o estado local
      setProdutos((prevProdutos) =>
        prevProdutos.map((produto) =>
          produto.id === produtoId ? { ...produto, catalogo: checked } : produto
        )
      );
    } catch (err) {
      console.error("Erro ao atualizar status do catálogo:", err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const formData = new FormData();
      formData.append("nome_comercial", tempNomeComercial);

      if (croppedProfileImage) {
        const blob = await fetch(croppedProfileImage).then(res => res.blob());
        formData.append("foto_perfil", blob, "profile.jpg");
      }

      const response = await fetch(`${API_BASE_URL}/atualizar-perfil`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar perfil");
      }

      // Força uma nova requisição para obter os dados atualizados
      const userResponse = await fetch(`${API_BASE_URL}/usuario-logado`, {
        method: "GET",
        credentials: "include",
      });

      if (!userResponse.ok) {
        throw new Error("Erro ao buscar informações atualizadas");
      }

      const updatedUserData = await userResponse.json();
      
      if (updatedUserData.success && updatedUserData.user) {
        setUserInfo(updatedUserData.user);
      }

      // Reseta os estados de edição
      setIsEditingProfile(false);
      setCroppedProfileImage(null);
      setProfileImage(null);

      alert("Perfil atualizado com sucesso!");

    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      alert("Erro ao salvar alterações do perfil");
    }
  };
  const handleChangePassword = async () => {
    try {
      if (newPassword !== confirmNewPassword) {
        alert("As novas senhas não coincidem");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/alterar-senha`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao alterar senha");
      }

      alert("Senha alterada com sucesso!");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

    } catch (err) {
      console.error("Erro ao alterar senha:", err);
      alert(err.message || "Erro ao alterar senha");
    }
  };

  // Função para abrir o modal de perfil
 

 

  const handleProdutoClick = async (produto) => {
    try {
      const response = await fetch(`${API_BASE_URL}/produtos/${produto.id}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao buscar produto");
      }
      const data = await response.json();
      setSelectedProduto(data);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error("Erro ao buscar produto:", err);
    }
  };

  useEffect(() => {
    if (profileImage && profileImgRef.current && !profileCropper) {
      const newCropper = new Cropper(profileImgRef.current, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 1,
        cropBoxResizable: true,
        zoomable: false,
      });
      setProfileCropper(newCropper);
    }

    return () => {
      if (profileCropper) {
        profileCropper.destroy();
      }
    };
  }, [profileImage, showProfileCropper]);


  const handleSort = (column) => {
    let direction = "asc";
    if (sortColumn === column && sortDirection === "asc") {
      direction = "desc";
    }
    setSortColumn(column);
    setSortDirection(direction);
  };

  const getFilteredAndSortedProdutos = () => {
    if (!Array.isArray(produtos)) {
      return [];
    }

    // Filtra por termo de busca
    let filtered = produtos.filter((produto) =>
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filtra por categoria se não for "TUDO"
    if (categoriaSelecionadaFiltro !== "TUDO") {
      filtered = filtered.filter((produto) =>
        produto.categoria_id == categoriaSelecionadaFiltro
      );
    }

    if (!sortColumn) return filtered;

    return filtered.sort((a, b) => {
      // Converter para número quando for as colunas numéricas
      const valA = sortColumn === "preco" || sortColumn === "quantidade"
        ? Number(a[sortColumn])
        : a[sortColumn];
      const valB = sortColumn === "preco" || sortColumn === "quantidade"
        ? Number(b[sortColumn])
        : b[sortColumn];

      if (valA < valB) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (valA > valB) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const filteredAndSortedProdutos = getFilteredAndSortedProdutos();

  const renderSortIcon = (column) => {
    if (sortColumn === column) {
      return sortDirection === "asc" ? " ↑" : " ↓";
    }
    return null;
  };

  useEffect(() => {
    const fetchUserInfoAndCatalogoLink = async () => {
      try {
        // Busca o link do catálogo
        const catalogoResponse = await fetch(`${API_BASE_URL}/catalogo/link`, {
          method: "GET",
          credentials: "include",
        });
        if (!catalogoResponse.ok) {
          throw new Error("Erro ao buscar link do catálogo");
        }
        const catalogoData = await catalogoResponse.json();
        setCatalogoLink(catalogoData.link);

        // Busca as categorias
        await fetchCategorias();
      } catch (err) {
        console.error("Erro ao buscar informações ou link do catálogo:", err);
      }
    };

    fetchUserInfoAndCatalogoLink();
  }, []);

  useEffect(() => {
    if (imagem && imgRef.current) {
      if (cropper) {
        cropper.destroy(); // Destroi o cropper anterior, se existir
        setCropper(null);
      }

      // Inicializa o Cropper.js com as opções corretas
      const newCropper = new Cropper(imgRef.current, {
        aspectRatio: 1, // Proporção 1:1 (quadrado)
        viewMode: 1, // Restringe a área de seleção de corte aos limites da imagem
        dragMode: "move", // Permite arrastar a imagem, não a área de seleção de corte
        autoCropArea: 1, // Área de corte automática
        cropBoxResizable: true, // Permite redimensionar a área de seleção de corte
        zoomable: false, // Desativa o zoom para evitar problemas
      });

      setCropper(newCropper);
    }
  }, [imagem]); // Executa sempre que a imagem mudar

  // Busca as categorias do usuário
  const fetchCategorias = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categorias`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao buscar categorias");
      }
      const data = await response.json();
      setCategorias(data);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
    }
  };



  // Cria uma nova categoria
  const handleCriarCategoria = async (nome) => {
    try {
      // Verificar localmente se já existe uma categoria com o mesmo nome (case insensitive)
      const nomeNormalizado = nome.trim().toLowerCase();
      const categoriaExistente = categorias.some(
        cat => cat.nome.toLowerCase() === nomeNormalizado
      );

      if (categoriaExistente) {
        alert('Você já possui uma categoria com este nome');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/categorias`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao criar categoria");
      }

      fetchCategorias(); // Atualiza a lista de categorias
      setIsCategoriaModalOpen(false);
      setNomeCategoria("");
    } catch (err) {
      console.error("Erro ao criar categoria:", err);
      alert(err.message); // Mostra a mensagem de erro específica
    }
  };

  // Edita uma categoria existente
  const handleEditarCategoria = async (id, nome) => {
    try {
      // Verificar localmente se já existe outra categoria com o mesmo nome (ignorando a atual)
      const nomeNormalizado = nome.trim().toLowerCase();
      const categoriaExistente = categorias.some(
        cat => cat.id !== id && cat.nome.toLowerCase() === nomeNormalizado
      );

      if (categoriaExistente) {
        alert('Você já possui uma categoria com este nome');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/categorias/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao editar categoria");
      }

      fetchCategorias(); // Atualiza a lista de categorias
      setIsCategoriaModalOpen(false);
      setCategoriaEditando(null);
      setNomeCategoria("");
    } catch (err) {
      console.error("Erro ao editar categoria:", err);
      alert(err.message); // Mostra a mensagem de erro específica
    }
  };

  // Exclui uma categoria
  const handleExcluirCategoria = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/categorias/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao excluir categoria");
      }

      fetchCategorias(); // Atualiza a lista de categorias
      alert("Categoria excluída com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir categoria:", err);
      alert(err.message); // Mostra a mensagem específica do backend
    }
  };



  const TabelaPaginada = ({ produtos }) => {

    // Efeito para rolar a página para o topo apenas quando a página muda pelos controles
    const handleMudancaPagina = (novaPagina) => {
      if (novaPagina !== paginaAtual) {
        setPaginaAtual(novaPagina);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    const totalPaginas = Math.ceil(produtos.length / itensPorPagina);

    const carregarItens = () => {
      const inicio = (paginaAtual - 1) * itensPorPagina;
      const fim = inicio + itensPorPagina;
      return produtos.slice(inicio, fim);
    };

    const handlePaginaAnterior = () => {
      if (paginaAtual > 1) {
        handleMudancaPagina(paginaAtual - 1);

      }
    };

    const handleProximaPagina = () => {
      if (paginaAtual < totalPaginas) {
        handleMudancaPagina(paginaAtual + 1);

      }
    };


    const renderizarNumerosPagina = () => {
      const numeros = [];

      // Sempre exibir a primeira página
      numeros.push(
        <button
          key={1}
          onClick={() => handleMudancaPagina(1)}
          className={paginaAtual === 1 ? styles.activePage : ""}
        >
          1
        </button>
      );

      // Exibir "..." se a página atual estiver longe da primeira página
      if (paginaAtual > 3) {
        numeros.push(<span key="left-ellipsis">...</span>);
      }

      // Exibir 2 páginas anteriores à atual
      for (let i = Math.max(2, paginaAtual - 2); i < paginaAtual; i++) {
        numeros.push(
          <button
            key={i}
            onClick={() => handleMudancaPagina(i)}
            className={paginaAtual === i ? styles.activePage : ""}
          >
            {i}
          </button>
        );
      }

      // Exibir a página atual
      if (paginaAtual !== 1 && paginaAtual !== totalPaginas) {
        numeros.push(
          <button
            key={paginaAtual}
            onClick={() => handleMudancaPagina(paginaAtual)}
            className={styles.activePage}
          >
            {paginaAtual}
          </button>
        );
      }

      // Exibir 2 páginas posteriores à atual
      for (let i = paginaAtual + 1; i <= Math.min(paginaAtual + 2, totalPaginas - 1); i++) {
        numeros.push(
          <button
            key={i}
            onClick={() => handleMudancaPagina(i)}
            className={paginaAtual === i ? styles.activePage : ""}
          >
            {i}
          </button>
        );
      }

      // Exibir "..." se a página atual estiver longe da última página
      if (paginaAtual < totalPaginas - 2) {
        numeros.push(<span key="right-ellipsis">...</span>);
      }

      // Sempre exibir a última página
      if (totalPaginas > 1) {
        numeros.push(
          <button
            key={totalPaginas}
            onClick={() => handleMudancaPagina(totalPaginas)}
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
        <table className={styles.produtoTable}>
          <thead>
            <tr>
              <th>IMAGEM</th>
              <th onClick={() => handleSort("nome")}>NOME {renderSortIcon("nome")}</th>
              <th onClick={() => handleSort("preco")}>PREÇO {renderSortIcon("preco")}</th>

              <th onClick={() => handleSort("quantidade")} data-label="QNTD">
                <span className={styles.fullText}>QUANTIDADE</span>
                <span className={styles.shortText}>QNTD</span>
                {renderSortIcon("quantidade")}
              </th>



              <th>CATÁLOGO</th>
            </tr>
          </thead>
          <tbody>
            {carregarItens().map((produto) => (
              <tr key={produto.id} onClick={() => handleProdutoClick(produto)}>
                <td>
                  {produto.imagem ? (
                    <img
                      src={`${API_BASE_URL}${produto.imagem}`}
                      alt={produto.nome}
                      className={styles.produtoImage}
                    />
                  ) : (
                    <img
                      src="/caixa.jpg"
                      alt="Imagem padrão"
                      className={styles.produtoImage}
                    />
                  )}
                </td>
                <td className={styles.truncate}>{produto.nome}</td>
                <td>R$ {produto.preco}</td>
                <td>{produto.quantidade}</td>

                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={produto.catalogo || false}
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCatalogoChange(produto.id, e.target.checked);
                    }}
                    className={styles.customCheckbox}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginação */}
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

  // Adicione esta função para cancelar a assinatura
  const handleCancelarAssinatura = async () => {
    if (!window.confirm('Tem certeza que deseja cancelar sua assinatura? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setCancelandoAssinatura(true);
      const response = await fetch(`${API_BASE_URL}/cancelar-assinatura`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Verifica se a resposta não é ok antes de tentar parsear o JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`Erro ao cancelar assinatura: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.warning) {
        alert(data.warning);
      }
      
      alert(data.message || 'Assinatura cancelada com sucesso!');

      // Atualiza as informações do usuário
      const userResponse = await fetch(`${API_BASE_URL}/usuario-logado`, {
        method: "GET",
        credentials: "include",
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserInfo(userData);
      }

    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao cancelar assinatura: ' + err.message);
    } finally {
      setCancelandoAssinatura(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          <img src="/box.png" alt="Ícone" className={styles.icon} />
          Mistoque
        </h1>

        {/* Menu hambúrguer (visível apenas em mobile) */}
        <div className={styles.menuIcon} onClick={toggleMenu}>
          <div className={styles.bar}></div>
          <div className={styles.bar2}></div>
          <div className={styles.bar2}></div>
        </div>
      </header>

      {/* Menu móvel (aparece entre header e hero APENAS em mobile) */}
      <nav className={styles.mobileNav}>
        <ul className={`${styles.mobileNavLinks} ${menuOpen ? styles.showMenu : ''}`}>
          <li><button onClick={() => navigate("/historico")} className={styles.navButtonHist}>
            Ir para Histórico
          </button></li>

          <li><button onClick={handleProfileClick} className={styles.navButtonPerfil}>
            Meu Perfil
          </button>
          </li>

          <li> <button onClick={handlePlanosClick} className={styles.navButtonPerfil}>
            Planos
          </button>
          </li>

          <li><button onClick={handleLogout} className={styles.navButtonSair}>
            Logout
          </button>
          </li>

        </ul>
      </nav>



      <div className={styles.head}>

        <button onClick={() => navigate("/historico")} className={styles.navButtonHist}>
          Ir para Histórico
        </button>
        <button onClick={handleProfileClick} className={styles.navButtonPerfil}>
          Meu Perfil
        </button>
        <button onClick={handlePlanosClick} className={styles.navButtonPerfil}>
          Planos
        </button>
        <button onClick={handleLogout} className={styles.navButtonSair}>
          Logout
        </button>




      </div>
      <div className={styles.fundo}>

        <div className={styles.container2}>
          {/* Div do link do catálogo */}
          <div className={styles.catalogoLinkContainer}>
            <p className={styles.titlecat}>Link do Catálogo:</p>
            <a href={catalogoLink} target="_blank" rel="noopener noreferrer">
              {catalogoLink}
            </a>

            {/* Seletor de cor */}
            <div className={styles.corLojaContainer}>
              <label>Cor da Loja:</label>
              <input
                type="color"
                value={corLoja}
                onChange={(e) => setCorLoja(e.target.value)}
                className={styles.colorPicker}
              />
              <button onClick={salvarCorLoja} className={styles.salvarCorButton}>
                Salvar Cor
              </button>
            </div>
          </div>



          <div className={styles.botaoDuplo}>
            <button onClick={handleOpenCadastroModal} className={styles.cadastrarButton}>
              Cadastrar Produto
            </button>

            <button onClick={() => setIsCategoriaModalOpen(true)} className={styles.categoriaButton}>
              Categorias
            </button>



            <button onClick={() => setIsEntradaModalOpen(true)} className={styles.entradaButton}>
              Entrada
            </button>

            <button onClick={() => setIsSaidaModalOpen(true)} className={styles.saidaButton}>
              Saída
            </button>
          </div>



          <div className={styles.searchAndFilterContainer}>
            <input
              type="text"
              placeholder="Pesquisar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />

            <br />

            {/* sele categoria */}

            <select
              value={categoriaSelecionadaFiltro}
              onChange={(e) => setCategoriaSelecionadaFiltro(e.target.value)}
              className={styles.selectCategoria2}
            >
              <option className={styles.selectCategoria3} value="TUDO">TODAS AS CATEGORIAS</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>

          </div>




        </div>
      </div>


      <div className={styles.produtoTableContainer}>
        {filteredAndSortedProdutos.length === 0 ? (
          <div className={styles.emptyMessage}>
            <h3>Não há itens cadastrados</h3>
          </div>
        ) : (
          <TabelaPaginada produtos={filteredAndSortedProdutos} />
        )}
      </div>

      {/* Modais */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.profileModal}`}>
            <span
              className={styles.closeIcon}
              onClick={() => setIsModalOpen(false)}
            >
              &times;
            </span>
            <h2>Cadastrar Produto</h2>
            <form onSubmit={handleCadastro} className={styles.form}>
              <input
                type="text"
                placeholder="Nome do produto"
                value={nome}
                maxLength={30}
                onChange={(e) => setNome(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Código do produto"
                value={codigo}
                maxLength={25}
                onChange={(e) => {
                  const value = e.target.value;
                  // Verifica se o valor é um número
                  if (/^\d*$/.test(value)) {
                    setCodigo(value);
                  }
                }}
                required
              />
              <textarea
                placeholder="Descrição"
                value={descricao}
                maxLength={200}
                onChange={(e) => setDescricao(e.target.value)}
                required
              ></textarea>
              <input
                type="number"
                placeholder="Preço"
                value={preco}
                onChange={(e) => {
                  const valor = parseFloat(e.target.value); // Converte o valor para número
                  if (valor < 0) {
                    // Se o valor for negativo, define como 0
                    setPreco(0);
                  } else {
                    // Caso contrário, atualiza o valor normalmente
                    setPreco(valor);
                  }
                }}
                min="0" // Garante que o input não aceite valores negativos via seta para baixo
                required
              />
              <input
                type="number"
                placeholder="Quantidade"
                value={quantidade}
                onChange={(e) => {
                  const valor = Math.min(Math.max(0, e.target.value), 1000000); // Limita entre 0 e 1.000.000
                  setQuantidade(valor);
                }}
                min="0"
                max="1000000"
                required
              />
              <select
                value={categoriaSelecionadaCadastro || ""}
                className={styles.selectCategoria}
                onChange={(e) => {
                  const value = e.target.value;
                  setCategoriaSelecionadaCadastro(value === "" ? null : value); // Atualiza o estado corretamente
                }}
              >
                <option value="">Sem categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
              <input
                type="file"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
              {showCropper && (
                <div className={styles.modalOverlay}>
                  <div className={`${styles.modal} ${styles.cropperModal}`}>
                    <img
                      ref={imgRef}
                      src={imagem}
                      alt="Imagem para cortar"
                      className={styles.modalImage}
                    />
                    <div className={styles.cropperButtons}>
                      <button className={styles.primaryButton} onClick={handleCrop}>
                        Cortar
                      </button>
                      <button className={styles.secondaryButton} onClick={handleCancel}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {croppedImage && (
                <div className={styles.imgPreviewContainer}>
                  <img src={croppedImage} alt="Pré-visualização" className={styles.imgPreview} />
                </div>
              )}
              <button type="submit">Cadastrar</button>
            </form>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.profileModal}`}>
            <span className={styles.closeIcon} onClick={() => {
              setIsProfileModalOpen(false);
              setIsEditingProfile(false);
              setIsChangingPassword(false);
              setShowProfileCropper(false);
            }}>
              &times;
            </span>
            <h2>Perfil do Usuário</h2>

            {!isChangingPassword ? (
              <div className={styles.profileInfo}>
                {userInfo?.foto_perfil && (
                  <img
                    src={
                      croppedProfileImage ||
                      (userInfo.foto_perfil
                        ? `${API_BASE_URL}${userInfo.foto_perfil}?t=${Date.now()}`
                        : "/default-profile.jpg")
                    }
                    alt="Foto de perfil"
                    className={styles.profileImage}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/default-profile.jpg";
                    }}
                  />
                )}

                {isEditingProfile ? (
                  <>
                    <input
                      type="text"
                      value={tempNomeComercial}
                      onChange={(e) => setTempNomeComercial(e.target.value)}
                      className={styles.formInput}
                      placeholder="Nome Comercial"
                    />

                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setProfileImage(reader.result);
                            setShowProfileCropper(true);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      accept="image/*"
                    />

                    {showProfileCropper && profileImage && (
                      <div className={styles.registerCropperModal}>
                  <div className={styles.registerCropperContent}>
                          <img
                            ref={profileImgRef}
                            src={profileImage}
                            alt="Imagem de perfil para cortar"
                            className={styles.modalImage}
                          />
                          <div className={styles.cropperButtons}>
                            <button className={styles.cropperButton} onClick={handleProfileCrop}>
                              Cortar
                            </button>
                            <button className={styles.cropperButtonCancel} onClick={handleProfileCropCancel}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className={styles.profileActions}>
                      <button
                        onClick={handleSaveProfile}
                        className={styles.salvarButton}
                      >
                        Salvar Alterações
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setCroppedProfileImage(null);
                          setProfileImage(null);
                          if (profileCropper) {
                            profileCropper.destroy();
                            setProfileCropper(null);
                          }
                        }}
                        className={styles.cancelarButton}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.profileDetails}>
                      <p><strong>Nome Comercial:</strong> {userInfo.nome_comercial || "Carregando..."}</p>
                      <p><strong>Celular:</strong> {userInfo.celular || "Carregando..."}</p>
                    </div>

                    <div className={styles.profileActions}>
                      <button
                        onClick={() => {
                          setIsEditingProfile(true);
                          setTempNomeComercial(userInfo.nome_comercial || "");
                        }}
                        className={styles.editProfileButton}
                      >
                        Editar Perfil
                      </button>
                      <button
                        onClick={() => {
                          setIsChangingPassword(true);
                          setIsEditingProfile(false);
                        }}
                        className={styles.changePasswordButton}
                      >
                        Alterar Senha
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className={styles.passwordChangeForm}>
                <h3>Alterar Senha</h3>

                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Senha Atual"
                  className={styles.formInput}
                />

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova Senha"
                  className={styles.formInput}
                />

                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirmar Nova Senha"
                  className={styles.formInput}
                />

                <div className={styles.profileActions}>
                  <button
                    onClick={handleChangePassword}
                    className={styles.salvarButton}
                    disabled={!currentPassword || !newPassword || newPassword !== confirmNewPassword}
                  >
                    Salvar Nova Senha
                  </button>
                  <button
                    onClick={() => setIsChangingPassword(false)}
                    className={styles.cancelarButton}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {isDetailModalOpen && selectedProduto && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.profileModal}`}>
            {/* Botão de fechar o modal */}
            <span
              className={styles.closeIcon}
              onClick={() => {
                setIsDetailModalOpen(false);
                setIsEditing(false);
                setShowCropper(false);
                setImagem(null);
                setCroppedImage(null);
              }}
            >
              &times;
            </span>

            {/* Título do modal */}
            <h2>Produto:</h2>

            {/* Conteúdo do modal */}
            <div className={styles.modalContent}>
              {/* Campo de Nome */}
              <p className={styles.formInputLabel}>Nome:</p>
              {isEditing ? (
                <input
                  type="text"
                  value={selectedProduto.nome}
                  maxLength={30}
                  onChange={(e) =>
                    setSelectedProduto({ ...selectedProduto, nome: e.target.value })
                  }
                  className={styles.formInput}
                />
              ) : (
                <p className={styles.produtinho}>{selectedProduto.nome}</p>
              )}

              {/* Campo de Código */}
              <p className={styles.formInputLabel}>Código:</p>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="Código do produto"
                  value={selectedProduto.codigo}
                  maxLength={25}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value)) {
                      setSelectedProduto({ ...selectedProduto, codigo: value });
                    }
                  }}
                  required
                  className={styles.formInput}
                />
              ) : (
                <p className={styles.produtinho}>{selectedProduto.codigo}</p>
              )}

              {/* Campo de Descrição */}
              <p className={styles.formInputLabel}>Descrição:</p>
              {isEditing ? (
                <textarea
                  value={selectedProduto.descricao}
                  maxLength={200}
                  onChange={(e) =>
                    setSelectedProduto({ ...selectedProduto, descricao: e.target.value })
                  }
                  className={styles.formInput}
                />
              ) : (
                <p className={styles.descricao}>{selectedProduto.descricao}</p>
              )}

              {/* Campo de Preço */}
              <p className={styles.formInputLabel}>Preço:</p>
              {isEditing ? (
                <input
                  type="number"
                  value={selectedProduto.preco}
                  onChange={(e) => {
                    const valor = parseFloat(e.target.value);
                    if (valor < 0) {
                      setSelectedProduto({ ...selectedProduto, preco: 0 });
                    } else {
                      setSelectedProduto({ ...selectedProduto, preco: valor });
                    }
                  }}
                  min="0"
                  className={styles.formInput}
                />
              ) : (
                <p className={styles.produtinho}>R$ {selectedProduto.preco}</p>
              )}

              {/* Campo de Quantidade */}
              <p className={styles.formInputLabel}>Quantidade:</p>
              {isEditing ? (
                <input
                  type="number"
                  value={selectedProduto.quantidade}
                  onChange={(e) => {
                    const valor = Math.min(Math.max(0, e.target.value), 1000000);
                    setSelectedProduto({ ...selectedProduto, quantidade: valor });
                  }}
                  min="0"
                  max="1000000"
                  className={styles.formInput}
                />
              ) : (
                <p className={styles.produtinho}>{selectedProduto.quantidade}</p>
              )}

              {/* Campo de Categoria */}
              <p className={styles.formInputLabel}>Categoria:</p>
              {isEditing ? (
                <select
                  className={styles.selectCategoria}
                  value={selectedProduto.categoria_id || ""}
                  onChange={(e) =>
                    setSelectedProduto({ ...selectedProduto, categoria_id: e.target.value || null })
                  }
                >
                  <option value="">Sem categoria</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <p className={styles.produtinho}>
                  {selectedProduto.categoria_nome || "Sem categoria"}
                </p>
              )}

              {/* Campo de Imagem (Fora do modo de edição) */}
              {!isEditing && (
                <div>
                  <p className={styles.formInputLabel}>Imagem:</p>
                  {selectedProduto.imagem ? (
                    <img
                      src={`${API_BASE_URL}${selectedProduto.imagem}`}
                      alt={selectedProduto.nome}
                      className={styles.produtoImageDetail}
                    />
                  ) : (
                    <img
                      src="/caixa.jpg"
                      alt="Imagem padrão"
                      className={styles.produtoImageDetail}
                    />
                  )}
                </div>
              )}

              {/* Campo de Imagem (No modo de edição) */}
              {isEditing && (
                <div>
                  <p className={styles.formInputLabel}>Imagem:</p>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                  {showCropper && (

                    <div className={styles.registerCropperModal}>
                      <div className={styles.registerCropperContent}>
                        <img
                          ref={imgRef}
                          src={imagem}
                          alt="Imagem para cortar"
                          className={styles.modalImage}
                        />
                        <div className={styles.cropperButtons}>
                          <button className={styles.cropperButton} onClick={handleCrop}>
                            Cortar
                          </button>
                          <button className={styles.cropperButtonCancel} onClick={handleCancel}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {croppedImage && (
                    <div className={styles.imgPreviewContainer}>
                      <img src={croppedImage} alt="Pré-visualização" className={styles.imgPreview} />
                    </div>
                  )}
                </div>
              )}

              {/* Botões do modal */}
              <div className={styles.modalButtons}>
                {isEditing ? (
                  <>
                    <button onClick={handleEditar} className={styles.salvarButton}>
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Tem certeza que deseja excluir este produto?")) {
                          handleExcluir(selectedProduto.id);
                        }
                        setIsEditing(false);
                      }}
                      className={styles.excluirButton}
                    >
                      Excluir
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)} className={styles.editarButton}>
                    Editar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isEntradaModalOpen && (
        <div className={styles.entradaSaidaModal}>
          <div className={`${styles.modal} ${styles.profileModal}`}>
            <span className={styles.closeIcon} onClick={() => setIsEntradaModalOpen(false)}>
              &times;
            </span>
            <h2>Entrada de Produto</h2>
            <div className={styles.form}>
              {/* Seletor para escolher entre nome ou código */}
              <select
                value={modoBusca}
                onChange={(e) => setModoBusca(e.target.value)}
                className={styles.selectInput}
              >
                <option value="nome">Buscar por Nome</option>
                <option value="codigo">Buscar por Código</option>
              </select>

              {/* Campo de busca por nome */}
              {modoBusca === "nome" && (
                <>
                  <input
                    type="text"
                    placeholder="Digite o nome do produto"
                    onChange={(e) => {
                      const termo = e.target.value;
                      const filtrados = produtos.filter((produto) =>
                        produto.nome.toLowerCase().includes(termo.toLowerCase())
                      );
                      setProdutosFiltrados(filtrados);
                    }}
                  />
                  <ul className={styles.listaProdutos}>
                    {produtosFiltrados.map((produto) => (
                      <li key={produto.id} onClick={() => setProdutoSelecionado(produto)}>
                        {produto.nome}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Campo de busca por código */}
              {modoBusca === "codigo" && (
                <>
                  <input
                    type="text"
                    placeholder="Digite o código do produto"
                    value={codigoBusca}
                    onChange={(e) => setCodigoBusca(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Quantidade"
                    value={quantidadeEntradaSaida}
                    onChange={(e) => setQuantidadeEntradaSaida(e.target.value)}
                  />
                </>
              )}

              {/* Botão de confirmar - Alteração mínima aqui */}
              {produtoSelecionado && modoBusca === "nome" && (
                <div className={styles.fullWidthContainer}>
                  <p>Produto selecionado: {produtoSelecionado.nome}</p>
                  <input
                    type="number"
                    placeholder="Quantidade"
                    value={quantidadeEntradaSaida}
                    onChange={(e) => setQuantidadeEntradaSaida(e.target.value)}
                  />
                  <button
                    className={`${styles.salvarButton} ${styles.fullWidthButton}`}
                    onClick={handleConfirmarEntrada}
                  >
                    Confirmar
                  </button>
                </div>
              )}

              {modoBusca === "codigo" && (
                <button
                  className={`${styles.salvarButton} ${styles.fullWidthButton}`}
                  onClick={handleConfirmarEntradaPorCodigo}
                >
                  Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isSaidaModalOpen && (
        <div className={styles.entradaSaidaModal}>
          <div className={`${styles.modal} ${styles.profileModal}`}>
            <span className={styles.closeIcon} onClick={() => setIsSaidaModalOpen(false)}>
              &times;
            </span>
            <h2>Saída de Produto</h2>
            <div className={styles.form}>
              {/* Seletor para escolher entre nome ou código */}
              <select
                value={modoBusca}
                onChange={(e) => setModoBusca(e.target.value)}
                className={styles.selectInput}
              >
                <option value="nome">Buscar por Nome</option>
                <option value="codigo">Buscar por Código</option>
              </select>

              {/* Campo de busca por nome */}
              {modoBusca === "nome" && (
                <>
                  <input
                    type="text"
                    placeholder="Digite o nome do produto"
                    onChange={(e) => {
                      const termo = e.target.value;
                      const filtrados = produtos.filter((produto) =>
                        produto.nome.toLowerCase().includes(termo.toLowerCase())
                      );
                      setProdutosFiltrados(filtrados);
                    }}
                  />
                  <ul className={styles.listaProdutos}>
                    {produtosFiltrados.map((produto) => (
                      <li key={produto.id} onClick={() => setProdutoSelecionado(produto)}>
                        {produto.nome}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Campo de busca por código */}
              {modoBusca === "codigo" && (
                <>
                  <input
                    type="text"
                    placeholder="Digite o código do produto"
                    value={codigoBusca}
                    onChange={(e) => setCodigoBusca(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Quantidade"
                    value={quantidadeEntradaSaida}
                    onChange={(e) => setQuantidadeEntradaSaida(e.target.value)}
                  />
                </>
              )}

              {/* Botão de confirmar - Padronizado igual ao de entrada */}
              {produtoSelecionado && modoBusca === "nome" && (
                <div className={styles.fullWidthContainer}>
                  <p>Produto selecionado: {produtoSelecionado.nome}</p>
                  <input
                    type="number"
                    placeholder="Quantidade"
                    value={quantidadeEntradaSaida}
                    onChange={(e) => setQuantidadeEntradaSaida(e.target.value)}
                  />
                  <button
                    className={`${styles.salvarButton} ${styles.fullWidthButton}`}
                    onClick={handleConfirmarSaida}
                  >
                    Confirmar
                  </button>
                </div>
              )}

              {modoBusca === "codigo" && (
                <button
                  className={`${styles.salvarButton} ${styles.fullWidthButton}`}
                  onClick={handleConfirmarSaidaPorCodigo}
                >
                  Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isCategoriaModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.profileModal}`}>
            <span
              className={styles.closeIcon}
              onClick={() => {
                setIsCategoriaModalOpen(false);
                setCategoriaEditando(null);
                setNomeCategoria("");
              }}
            >
              &times;
            </span>
            <h2>{categoriaEditando ? "Editar Categoria" : "Criar Categoria"}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (categoriaEditando) {
                  handleEditarCategoria(categoriaEditando.id, nomeCategoria);
                } else {
                  handleCriarCategoria(nomeCategoria);
                }
              }}
            >
              <input
                type="text"
                placeholder="Nome da categoria"
                value={nomeCategoria}
                onChange={(e) => {
                  if (e.target.value.length <= 20) {
                    setNomeCategoria(e.target.value);
                  }
                }}
                required
                maxLength={20}
                className={styles.formInput} // Adicionando a classe para estilização
              />
              <button type="submit" className={styles.salvarButton}>
                {categoriaEditando ? "Salvar" : "Criar"}
              </button>
            </form>
            <ul className={styles.listaCategorias}>
              {categorias.map((categoria) => (
                <li key={categoria.id} className={styles.categoriaItem}>
                  <span>
                    {categoria.nome.length > 20
                      ? `${categoria.nome.slice(0, 20)}...`
                      : categoria.nome}
                  </span>
                  <div className={styles.botoesCategoria}>
                    <button
                      onClick={() => {
                        setCategoriaEditando(categoria);
                        setNomeCategoria(categoria.nome);
                      }}
                      className={styles.botaoEditar}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleExcluirCategoria(categoria.id)}
                      className={styles.botaoExcluir}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isLimitModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <span className={styles.closeIcon} onClick={() => setIsLimitModalOpen(false)}>
              &times;
            </span>
            <h2>Limite do Plano Básico Atingido</h2>
            <p>
              Você atingiu o limite de 6 produtos no plano básico.
              Atualize para o plano premium para cadastrar mais produtos.
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setIsLimitModalOpen(false)}
                className={styles.cancelarButton}
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setIsLimitModalOpen(false);
                  setIsPlanosModalOpen(true);
                }}
                className={styles.salvarButton}
              >
                Ver Planos
              </button>
            </div>
          </div>
        </div>
      )}

{isPlanosModalOpen && (
  <div className={styles.modalOverlay}>
    <div className={`${styles.modal} ${styles.profileModal}`}>
      <span className={styles.closeIcon} onClick={() => setIsPlanosModalOpen(false)}>
        &times;
      </span>
      <h2>Planos Disponíveis</h2>
      
      {/* Assinatura Ativa */}
      {userInfo?.assinatura_status === "ativa" && (
        <div className={styles.assinaturaContainer}>
          <h3 className={styles.assinaturaAtiva}>Assinatura Premium Ativa</h3>
          <p className={styles.beneficiosContainer}>Benefícios ativos:</p>
          <ul className={styles.beneficiosList}>
            <li className={styles.beneficioItem}>
              <span className={styles.beneficioCheck}>✓</span>
              Produtos ilimitados
            </li>
            <li className={styles.beneficioItem}>
              <span className={styles.beneficioCheck}>✓</span>
              Categorias ilimitadas
            </li>
            <li className={styles.beneficioItem}>
              <span className={styles.beneficioCheck}>✓</span>
              Suporte prioritário
            </li>
          </ul>
          
          <button
            className={`${styles.fullWidthButton} ${styles.dangerButton}`}
            onClick={handleCancelarAssinatura}
            disabled={cancelandoAssinatura}
          >
            {cancelandoAssinatura ? "Cancelando..." : "Cancelar Assinatura"}
          </button>
        </div>
      )}

      {/* Assinatura Cancelada */}
      {userInfo?.assinatura_status === "cancelada" && (
        <div className={styles.assinaturaContainer}>
          <h3 className={styles.assinaturaCancelada}>Assinatura Cancelada</h3>
          <p className={styles.assinaturaCanceladaInfo}>
            Sua assinatura permanecerá ativa até: {userInfo.assinatura_expira_em ? new Date(userInfo.assinatura_expira_em).toLocaleDateString() : 'Data não disponível'}
          </p>
        </div>
      )}

      {/* Plano Premium */}
      {(!userInfo?.assinatura_status || userInfo?.assinatura_status === "expirada") && (
        <div className={styles.planoContainer}>
          <div className={styles.planoPremium}>
            <h3 className={styles.planoPremiumTitle}>Plano Premium</h3>
            <p className={styles.planoPremiumPrice}>R$ 19,90/mês</p>
            <ul className={styles.beneficiosList}>
              <li className={styles.beneficioItem}>
                <span className={styles.beneficioCheck}>✓</span>
                Produtos ilimitados
              </li>
              <li className={styles.beneficioItem}>
                <span className={styles.beneficioCheck}>✓</span>
                Categorias ilimitadas
              </li>
              <li className={styles.beneficioItem}>
                <span className={styles.beneficioCheck}>✓</span>
                Suporte prioritário
              </li>
            </ul>
            {/* Container de largura total */}
            <div className={styles.fullWidthContainer}>
              <button
                className={`${styles.fullWidthButton} ${styles.primaryButton}`}
                onClick={handleAssinarPlano}
              >
                Assinar Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)}

      <footer id="contact" className={styles.footer}>
        <p>&copy; 2025 Mistoque. Todos os direitos reservados.</p>
      </footer>
    </div>


  );
}

export default Produtos;