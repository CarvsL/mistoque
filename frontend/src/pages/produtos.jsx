import api from '../utils/api';

// ... existing code ...

// Substitua todas as chamadas axios.xxx por api.xxx
// Por exemplo:
const handleEditar = async (e) => {
  e.preventDefault();
  try {
    const formData = new FormData();
    formData.append('nome', produtoEditando.nome);
    formData.append('codigo', produtoEditando.codigo);
    formData.append('descricao', produtoEditando.descricao);
    formData.append('preco', produtoEditando.preco);
    formData.append('quantidade', produtoEditando.quantidade);
    formData.append('categoria_id', produtoEditando.categoria_id || '');
    if (novaImagem) {
      formData.append('imagem', novaImagem);
    }

    await api.put(`/produtos/${produtoEditando.id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Atualiza a lista de produtos
    buscarProdutos();
    setShowModalEditar(false);
    toast.success('Produto editado com sucesso!');
  } catch (error) {
    console.error('Erro ao editar produto:', error);
    toast.error(error.response?.data?.message || 'Erro ao editar produto');
  }
};

// ... existing code ... 