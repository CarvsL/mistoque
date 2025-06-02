const express = require('express');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const moment = require('moment');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const https = require('https');
const http = require('http');
require('dotenv').config();

// Constantes para URLs do Mercado Pago
const MP_API_BASE_URL = 'https://api.mercadopago.com';
const MP_PREAPPROVAL_URL = `${MP_API_BASE_URL}/preapproval`;
const MP_PAYMENTS_URL = `${MP_API_BASE_URL}/v1/payments`;

// Configuração dos rate limiters
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW), // 15 minutos
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX), // limite de tentativas
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  }
});

const registerLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW), // 15 minutos
  max: parseInt(process.env.REGISTER_RATE_LIMIT_MAX), // limite de registros
  message: {
    success: false,
    message: 'Limite de registros excedido. Tente novamente mais tarde.'
  }
});

const verifyCodeLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW), // 15 minutos
  max: parseInt(process.env.VERIFY_CODE_RATE_LIMIT_MAX), // limite de tentativas
  message: {
    success: false,
    message: 'Muitas tentativas de verificação. Tente novamente em 15 minutos.'
  }
});

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS), // limite de requisições
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.'
  }
});

// Twilio configuration
const twilio = require('twilio');
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const app = express();

// Configuração de CORS
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.FRONTEND_URL_HTTPS],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN']
  })
);

// Configuração de sessões
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseInt(process.env.SESSION_EXPIRY),
      sameSite: 'strict'
    },
  })
);

// Configuração do banco de dados
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const extensao = path.extname(file.originalname);
    let nomeUnico;
    do {
      nomeUnico = uuidv4() + extensao;
    } while (fs.existsSync(path.join(process.env.UPLOAD_DIR, nomeUnico)));
    cb(null, nomeUnico);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES.split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Middleware para JSON
app.use(express.json());

// Middleware para verificar autenticação
const verificarAutenticacao = (req, res, next) => {
  try {
    console.log('Verificando autenticação:', {
      sessionExists: !!req.session,
      userId: req.session?.userId,
      headers: req.headers,
      cookies: req.cookies
    });

    if (!req.session) {
      console.log('Sessão não existe');
      return res.status(401).json({
        success: false,
        message: 'Sessão não encontrada'
      });
    }

    if (!req.session.userId) {
      console.log('UserId não encontrado na sessão');
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    next();
  } catch (err) {
    console.error('Erro no middleware de autenticação:', err);
    res.status(500).json({
      success: false,
      message: 'Erro na verificação de autenticação'
    });
  }
};

// Generate a random 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification code endpoint
app.post('/send-verification-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Número de telefone é obrigatório' });
    }

    // Generate a new verification code
    const verificationCode = generateVerificationCode();
    
    // Store the code with the phone number (expires in 10 minutes)
    verificationCodes.set(phoneNumber, {
      code: verificationCode,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Send the verification code via Twilio
    await twilioClient.messages.create({
      body: `Seu código de verificação do Mistoque é: ${verificationCode}`,
      to: phoneNumber,
      from: TWILIO_PHONE_NUMBER
    });

    res.json({ message: 'Código de verificação enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar código de verificação:', error);
    res.status(500).json({ message: 'Erro ao enviar código de verificação' });
  }
});

// Endpoint de verificação de código atualizado e unificado
app.post('/verify-code', verifyCodeLimiter, async (req, res) => {
  try {
    const { celular, code } = req.body;

    if (!celular || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Número de telefone e código são obrigatórios' 
      });
    }

    const userData = verificationCodes.get(celular);

    if (!userData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nenhum código de verificação encontrado para este número' 
      });
    }

    if (Date.now() > userData.expiresAt) {
      verificationCodes.delete(celular);
      return res.status(400).json({ 
        success: false, 
        message: 'Código de verificação expirado' 
      });
    }

    if (userData.code !== code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código de verificação inválido' 
      });
    }

    // Se chegou aqui, o código é válido
    // Verifica se é um novo registro ou apenas verificação de telefone
    if (userData.nome) { // É um novo registro
      // Cria o hash da senha
      const senhaHash = await bcrypt.hash(userData.senha, 10);
      const fotoPerfil = userData.fotoPerfil ? `/uploads/${userData.fotoPerfil}` : null;

      // Insere o novo usuário
      const query = `INSERT INTO usuarios (nome_comercial, celular, cpf, senha_hash, foto_perfil)
                     VALUES (?, ?, ?, ?, ?)`;

      const [result] = await db.execute(query, [userData.nome, userData.celular, userData.cpf, senhaHash, fotoPerfil]);

      // Limpa os dados temporários
      verificationCodes.delete(celular);

      // Retorna sucesso com o ID do novo usuário
      return res.status(201).json({ 
        success: true, 
        message: 'Usuário registrado com sucesso!',
        userId: result.insertId
      });
    } else { // É apenas uma verificação de telefone
      // Limpa os dados temporários
      verificationCodes.delete(celular);

      return res.status(200).json({ 
        success: true, 
        message: 'Número de telefone verificado com sucesso' 
      });
    }

  } catch (error) {
    console.error('Erro ao verificar código:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao verificar código',
      error: error.message 
    });
  }
});

// Função para validar senha
function validarSenha(senha) {
  if (senha.length < 6) {
    return { valido: false, mensagem: 'A senha deve ter no mínimo 6 caracteres' };
  }

  if (senha.length > 20) {
    return { valido: false, mensagem: 'A senha deve ter no máximo 20 caracteres' };
  }
  
  if (!/[A-Za-z]/.test(senha)) {
    return { valido: false, mensagem: 'A senha deve conter pelo menos uma letra' };
  }
  
  if (!/[0-9]/.test(senha)) {
    return { valido: false, mensagem: 'A senha deve conter pelo menos um número' };
  }
  
  return { valido: true };
}

/* =================== ROTA DE REGISTRO =================== */
app.post('/register', registerLimiter, upload.single('fotoPerfil'), async (req, res) => {
  try {
    const { nome, celular, cpf, senha } = req.body;
    console.log('Dados recebidos no registro:', { nome, celular, cpf, temFoto: !!req.file });

    // Validação básica dos campos
    if (!nome || !senha || !celular || !cpf) {
      return res.status(400).json({
        success: false,
        message: 'Preencha todos os campos obrigatórios.'
      });
    }

    // Validação do tamanho do nome comercial
    if (nome.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'O nome comercial deve ter no máximo 30 caracteres.'
      });
    }

    // Validação da senha
    const validacaoSenha = validarSenha(senha);
    if (!validacaoSenha.valido) {
      return res.status(400).json({
        success: false,
        message: validacaoSenha.mensagem
      });
    }

    // Validação do formato do celular
    if (!/^\+?[1-9]\d{1,14}$/.test(celular)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de celular inválido. Use o formato +5511999999999'
      });
    }

    // Verifica se o celular ou CPF já existem
    const [existingUser] = await db.execute(
      'SELECT celular, cpf FROM usuarios WHERE celular = ? OR cpf = ?',
      [celular, cpf]
    );

    if (existingUser.length > 0) {
      const field = existingUser[0].celular === celular ? 'celular' : 'CPF';
      return res.status(409).json({
        success: false,
        message: `Este ${field} já está cadastrado.`,
        duplicateField: field.toLowerCase()
      });
    }

    // Gera o código de verificação
    const verificationCode = generateVerificationCode();
    
    // Armazena TODOS os dados do usuário temporariamente
    const tempData = {
      nome,
      celular,
      cpf,
      senha,
      fotoPerfil: req.file ? req.file.filename : null,
      code: verificationCode,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutos
    };
    
    console.log('Dados temporários armazenados:', { 
      ...tempData, 
      senha: '[PROTEGIDA]',
      code: '[PROTEGIDO]' 
    });
    
    verificationCodes.set(celular, tempData);

    // Envia o código via SMS
    try {
      await twilioClient.messages.create({
        body: `Seu código de verificação do Mistoque é: ${verificationCode}`,
        to: celular,
        from: TWILIO_PHONE_NUMBER
      });

      console.log('SMS enviado com sucesso para:', celular);

      res.status(200).json({ 
        success: true, 
        message: 'Código de verificação enviado com sucesso.',
        celular: celular // Retorna o celular para referência no frontend
      });
    } catch (smsError) {
      console.error('Erro ao enviar SMS:', smsError);
      // Em caso de erro no envio do SMS, ainda retornamos sucesso mas logamos o erro
      res.status(200).json({ 
        success: true, 
        message: 'Prossiga com a verificação do código.',
        celular: celular
      });
    }

  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor.'
    });
  }
});

/* =================== ROTA DE LOGIN =================== */
app.post('/login', loginLimiter, async (req, res) => {
  try {
    console.log('Tentativa de login:', { 
      celular: req.body.celular,
      temSenha: !!req.body.senha
    });

    const { celular, senha } = req.body;

    if (!celular || !senha) {
      return res.status(400).json({ 
        success: false,
        message: 'Preencha celular e senha.' 
      });
    }

    const query = `SELECT * FROM usuarios WHERE celular = ?`;
    const [rows] = await db.execute(query, [celular]);

    console.log('Resultado da busca:', {
      encontrado: rows.length > 0,
      celular
    });

    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Usuário não encontrado.' 
      });
    }

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    console.log('Validação de senha:', {
      userId: usuario.id,
      senhaValida
    });

    if (!senhaValida) {
      return res.status(400).json({ 
        success: false,
        message: 'Senha incorreta.' 
      });
    }

    // Configura a sessão
    req.session.userId = usuario.id;
    
    // Aguarda a sessão ser salva
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Erro ao salvar sessão:', err);
          reject(err);
        } else {
          console.log('Sessão salva com sucesso:', {
            sessionId: req.session.id,
            userId: req.session.userId
          });
          resolve();
        }
      });
    });

    // Remove dados sensíveis antes de enviar
    const userData = { ...usuario };
    delete userData.senha_hash;

    res.status(200).json({ 
      success: true,
      message: 'Login bem-sucedido!',
      user: userData
    });

  } catch (err) {
    console.error('Erro detalhado no login:', {
      error: err.message,
      stack: err.stack
    });
    
    res.status(500).json({ 
      success: false,
      message: 'Erro ao tentar fazer login.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/* =================== ROTA PARA BUSCAR USUÁRIO LOGADO =================== */
app.get('/usuario-logado', verificarAutenticacao, async (req, res) => {
  try {
    console.log('Iniciando busca de usuário logado:', {
      sessionId: req.session.id,
      userId: req.session.userId
    });

    const { userId } = req.session;

    // Primeiro, verifica se o ID é válido
    if (!userId || isNaN(userId)) {
      console.error('ID do usuário inválido:', userId);
      return res.status(400).json({
        success: false,
        message: 'ID do usuário inválido'
      });
    }

    const query = 'SELECT id, nome_comercial, celular, foto_perfil, assinatura_status, assinatura_expira_em, assinante FROM usuarios WHERE id = ?';

    console.log('Executando query com userId:', userId);
    
    const [rows] = await db.execute(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado no banco de dados'
      });
    }

    // Remove dados sensíveis
    const userData = { ...rows[0] };
    delete userData.senha_hash;

    res.status(200).json({
      success: true,
      user: userData
    });

  } catch (err) {
    console.error('Erro detalhado ao buscar usuário:', {
      error: err.message,
      stack: err.stack,
      sessionInfo: {
        exists: !!req.session,
        userId: req.session?.userId
      }
    });

    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do usuário',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/* =================== ROTA DE LOGOUT =================== */
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).send({ message: 'Erro ao deslogar.' });
    } else {
      res.status(200).send({ message: 'Logout realizado com sucesso.' });
    }
  });
});

/* =================== ROTAS PARA GERENCIAMENTO DE PRODUTOS =================== */

// Criar Produto
app.post('/produtos', verificarAutenticacao, upload.single('imagem'), async (req, res) => {
  try {
    const { userId } = req.session;
    const { nome, codigo, descricao, preco, quantidade, categoria_id } = req.body;

    // Verifica se a imagem foi enviada
    const imagem = req.file ? `/uploads/${req.file.filename}` : null;
    console.log("Imagem recebida:", imagem);

    // Converte a categoria_id para número
    const categoriaId = categoria_id ? parseInt(categoria_id, 10) : null;
    console.log("Categoria ID recebida:", categoria_id);
    console.log("Categoria ID processada:", categoriaId);

    // Verifica se a categoria existe
    if (categoriaId) {
      const [categoria] = await db.execute(
        'SELECT * FROM categorias WHERE id = ? AND usuario_id = ?',
        [categoriaId, userId]
      );

      if (categoria.length === 0) {
        return res.status(400).send({ message: 'Categoria inválida.' });
      }
    }

    // Insere o produto no banco de dados
    const query = `
      INSERT INTO produtos (usuario_id, nome, codigo, descricao, preco, quantidade, imagem, categoria_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    console.log("Valores a serem inseridos:", [userId, nome, codigo, descricao, preco, quantidade, imagem, categoriaId]);
    const [result] = await db.execute(query, [userId, nome, codigo, descricao, preco, quantidade, imagem, categoriaId]);

    // Obtém o ID do produto inserido
    const produtoId = result.insertId;

    // Registra a criação do produto no histórico
    const queryHistorico = `
      INSERT INTO historico_produtos (produto_id, usuario_id, nome_produto, tipo_alteracao, quantidade_alterada)
      VALUES (?, ?, ?, 'entrada', ?)
    `;
    await db.execute(queryHistorico, [produtoId, userId, nome, quantidade]);

    res.status(201).send({ message: 'Produto cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar produto:', err);
    res.status(500).send({ message: 'Erro ao cadastrar produto.' });
  }
});
// Listar Produtos do Usuário Logado
// Listar Produtos do Usuário Logado
app.get('/produtos', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;

    const query = `
      SELECT p.id, p.nome, p.descricao, p.preco, p.quantidade, p.imagem, p.codigo, p.catalogo,
             p.categoria_id, c.nome AS categoria_nome
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.usuario_id = ?
    `;
    const [rows] = await db.execute(query, [userId]);

    res.status(200).send(rows);
  } catch (err) {
    console.error('Erro ao buscar produtos:', err);
    res.status(500).send({ message: 'Erro ao buscar produtos.' });
  }
});


// Excluir Produto e Registrar Saída no Histórico
app.delete('/produtos/:id', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { id } = req.params; // Extrai o ID do produto da URL

    // Busca o produto antes da exclusão
    const [produto] = await db.execute('SELECT * FROM produtos WHERE id = ? AND usuario_id = ?', [id, userId]);

    // Registra a exclusão como uma "saída" no histórico
    const queryHistorico = `
      INSERT INTO historico_produtos (produto_id, usuario_id, nome_produto, tipo_alteracao, quantidade_alterada)
      VALUES (?, ?, ?, 'saida', ?)
    `;
    await db.execute(queryHistorico, [id, userId, produto[0].nome, produto[0].quantidade]);

    // Exclui o produto
    const query = 'DELETE FROM produtos WHERE id = ? AND usuario_id = ?';
    await db.execute(query, [id, userId]);

    res.status(200).send({ message: 'Produto excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir produto:', err);
    res.status(500).send({ message: 'Erro ao excluir produto.' });
  }
});


// Atualizar Produto e Registrar Histórico
app.put('/produtos/:id', verificarAutenticacao, upload.single('imagem'), async (req, res) => {
  try {
    const { userId } = req.session;
    const { id } = req.params;

    // Extrai os campos do corpo da requisição
    const { nome, codigo, descricao, preco, quantidade, categoria_id } = req.body;
    const novaImagem = req.file ? `/uploads/${req.file.filename}` : null;

    // Busca o produto antes da atualização
    const [produtoAntes] = await db.execute('SELECT * FROM produtos WHERE id = ?', [id]);

    // Atualiza o produto
    const query = `
  UPDATE produtos
  SET nome = ?, codigo = ?, descricao = ?, preco = ?, quantidade = ?, imagem = COALESCE(?, imagem), categoria_id = ?
  WHERE id = ? AND usuario_id = ?
`;
    await db.execute(query, [nome, codigo, descricao, preco, quantidade, novaImagem, categoria_id || null, id, userId]);

    // Busca o produto após a atualização
    const [produtoDepois] = await db.execute('SELECT * FROM produtos WHERE id = ?', [id]);

    // Calcula a diferença na quantidade
    const diferencaQuantidade = produtoDepois[0].quantidade - produtoAntes[0].quantidade;

    if (diferencaQuantidade !== 0) {
      const tipoAlteracao = diferencaQuantidade > 0 ? 'entrada' : 'saida';
      const queryHistorico = `
        INSERT INTO historico_produtos (produto_id, usuario_id, nome_produto, tipo_alteracao, quantidade_alterada)
        VALUES (?, ?, ?, ?, ?)
      `;
      await db.execute(queryHistorico, [id, userId, produtoDepois[0].nome, tipoAlteracao, Math.abs(diferencaQuantidade)]);
    }

    res.status(200).send({ message: 'Produto atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).send({ message: 'Erro ao atualizar produto.' });
  }
});


app.put('/produtos/:id/catalogo', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { id } = req.params;
    const { catalogo } = req.body;

    // Se estiver tentando marcar como true, verifica as limitações
    if (catalogo) {
      // Busca informações do usuário
      const [user] = await db.execute(
        'SELECT assinante FROM usuarios WHERE id = ?',
        [userId]
      );

      // Se não for assinante, verifica o limite
      if (!user[0].assinante) {
        // Conta quantos produtos já estão no catálogo
        const [count] = await db.execute(
          'SELECT COUNT(*) as total FROM produtos WHERE usuario_id = ? AND catalogo = 1',
          [userId]
        );

        if (count[0].total >= 6) {
          return res.status(400).send({ 
            message: 'Limite do plano básico atingido. Atualize para o plano premium para adicionar mais produtos ao catálogo.'
          });
        }
      }
    }

    // Atualiza o status do catálogo no banco de dados
    const query = 'UPDATE produtos SET catalogo = ? WHERE id = ? AND usuario_id = ?';
    await db.execute(query, [catalogo, id, userId]);

    res.status(200).send({ message: 'Status do catálogo atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar status do catálogo:', err);
    res.status(500).send({ message: 'Erro ao atualizar status do catálogo.' });
  }
});


/* =================== SERVIR ARQUIVOS ESTÁTICOS =================== */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =================== INICIAR O SERVIDOR =================== */
const httpPort = process.env.PORT || 5000;
const httpsPort = process.env.HTTPS_PORT || 5443;

// Criar servidor HTTP (redirecionará para HTTPS)
const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { 
    Location: `https://${process.env.DOMAIN}:${httpsPort}${req.url}` 
  });
  res.end();
});

try {
  const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8');
  const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8');

  const credentials = {
    key: privateKey,
    cert: certificate
  };

  const httpsServer = https.createServer(credentials, app);

  // Iniciar servidor HTTPS
  httpsServer.listen(httpsPort, () => {
    console.log(`Servidor HTTPS rodando em https://${process.env.DOMAIN}:${httpsPort}`);
  });

  // Iniciar servidor HTTP para redirecionamento
  httpServer.listen(httpPort, () => {
    console.log(`Servidor HTTP rodando na porta ${httpPort} (redirecionando para HTTPS)`);
  });
} catch (err) {
  console.error('Erro ao iniciar servidor HTTPS:', err);
  // Fallback para HTTP em caso de erro
  app.listen(httpPort, () => {
    console.log(`Servidor HTTP rodando na porta ${httpPort} (modo fallback)`);
  });
}

// Atualizar configuração de sessão para HTTPS
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseInt(process.env.SESSION_EXPIRY),
      sameSite: 'strict'
    },
  })
);



// Buscar Histórico de Alterações
app.get('/historico', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;

    const query = `
        SELECT hp.*, p.nome AS produto_nome
        FROM historico_produtos hp
        LEFT JOIN produtos p ON hp.produto_id = p.id
        WHERE hp.usuario_id = ?
        ORDER BY hp.data_alteracao DESC
    `;
    const [rows] = await db.execute(query, [userId]);

    res.status(200).send(rows);
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    res.status(500).send({ message: 'Erro ao buscar histórico.' });
  }
});

app.get('/produtos/codigo/:codigo', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { codigo } = req.params;

    // Busca o produto pelo código
    const query = 'SELECT * FROM produtos WHERE codigo = ? AND usuario_id = ?';
    const [rows] = await db.execute(query, [codigo, userId]);

    if (rows.length === 0) {
      return res.status(404).send({ message: 'Produto não encontrado.' });
    }

    res.status(200).send(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar produto por código:', err);
    res.status(500).send({ message: 'Erro ao buscar produto por código.' });
  }
});

app.post('/produtos/entrada', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { produtoId, quantidade } = req.body;

    // 1. Busca o produto no banco de dados
    const [produto] = await db.execute('SELECT * FROM produtos WHERE id = ? AND usuario_id = ?', [produtoId, userId]);

    if (produto.length === 0) {
      return res.status(404).send({ message: 'Produto não encontrado.' });
    }

    // 2. Atualiza a quantidade no banco de dados
    const novaQuantidade = produto[0].quantidade + parseInt(quantidade, 10);
    const query = `UPDATE produtos SET quantidade = ? WHERE id = ?`;
    await db.execute(query, [novaQuantidade, produtoId]);

    // 3. Registra a entrada no histórico
    const queryHistorico = `
        INSERT INTO historico_produtos (produto_id, usuario_id, nome_produto, tipo_alteracao, quantidade_alterada)
        VALUES (?, ?, ?, 'entrada', ?)
    `;
    await db.execute(queryHistorico, [produtoId, userId, produto[0].nome, quantidade]);

    res.status(200).send({ message: 'Entrada registrada com sucesso!' });
  } catch (err) {
    console.error('Erro ao registrar entrada:', err);
    res.status(500).send({ message: 'Erro ao registrar entrada.' });
  }
});

app.post('/produtos/saida', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { produtoId, quantidade } = req.body;

    // 1. Busca o produto no banco de dados
    const [produto] = await db.execute('SELECT * FROM produtos WHERE id = ? AND usuario_id = ?', [produtoId, userId]);

    if (produto.length === 0) {
      return res.status(404).send({ message: 'Produto não encontrado.' });
    }

    // 2. Verifica se a quantidade é suficiente
    if (produto[0].quantidade < quantidade) {
      return res.status(400).send({ message: 'Quantidade insuficiente em estoque.' });
    }

    // 3. Atualiza a quantidade no banco de dados
    const novaQuantidade = produto[0].quantidade - parseInt(quantidade, 10);
    const query = `UPDATE produtos SET quantidade = ? WHERE id = ?`;
    await db.execute(query, [novaQuantidade, produtoId]);

    // 4. Registra a saída no histórico
    const queryHistorico = `
        INSERT INTO historico_produtos (produto_id, usuario_id, nome_produto, tipo_alteracao, quantidade_alterada)
        VALUES (?, ?, ?, 'saida', ?)
    `;
    await db.execute(queryHistorico, [produtoId, userId, produto[0].nome, quantidade]);

    res.status(200).send({ message: 'Saída registrada com sucesso!' });
  } catch (err) {
    console.error('Erro ao registrar saída:', err);
    res.status(500).send({ message: 'Erro ao registrar saída.' });
  }
});

app.get('/catalogo/link', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;

    // Verifica se o usuário já tem um catalogo_id
    const [usuario] = await db.execute(
      'SELECT catalogo_id FROM usuarios WHERE id = ?',
      [userId]
    );

    let catalogoId;

    if (usuario[0].catalogo_id) {
      // Se já existe um catalogo_id, usa o mesmo
      catalogoId = usuario[0].catalogo_id;
    } else {
      // Se não existe, gera um novo UUID e salva no banco de dados
      catalogoId = uuidv4();
      await db.execute(
        'UPDATE usuarios SET catalogo_id = ? WHERE id = ?',
        [catalogoId, userId]
      );
    }

    // Retorna o link único do catálogo usando HTTPS
    const link = `${process.env.FRONTEND_URL_HTTPS}/catalogo/${catalogoId}`;
    res.status(200).send({ link });
  } catch (err) {
    console.error('Erro ao gerar link do catálogo:', err);
    res.status(500).send({ message: 'Erro ao gerar link do catálogo.' });
  }
});

app.get('/catalogo/:catalogoId', async (req, res) => {
  try {
    const { catalogoId } = req.params;

    const [usuario] = await db.execute(
      'SELECT id FROM usuarios WHERE catalogo_id = ?',
      [catalogoId]
    );

    if (usuario.length === 0) {
      return res.status(404).send({ message: 'Catálogo não encontrado.' });
    }

    // CERTIFIQUE-SE de incluir p.id na query
    const [produtos] = await db.execute(
      `SELECT p.id, p.nome, p.descricao, p.preco, p.imagem, p.categoria_id
       FROM produtos p
       WHERE p.usuario_id = ? AND p.catalogo = TRUE`,
      [usuario[0].id]
    );

    res.status(200).send(produtos);
  } catch (err) {
    console.error('Erro ao buscar catálogo:', err);
    res.status(500).send({ message: 'Erro ao buscar catálogo.' });
  }
});

// Rotas para Categorias
app.post('/categorias', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { nome } = req.body;

    // Verifica se o nome da categoria está vazio
    if (!nome || nome.trim() === '') {
      return res.status(400).send({ message: 'O nome da categoria não pode estar vazio.' });
    }

    // Verifica se o usuário já tem 10 categorias
    const [categoriasCount] = await db.execute(
      'SELECT COUNT(*) AS total FROM categorias WHERE usuario_id = ?',
      [userId]
    );

    if (categoriasCount[0].total >= 10) {
      return res.status(400).send({ message: 'Limite de 10 categorias atingido.' });
    }

    // Verifica se já existe uma categoria com o mesmo nome (case insensitive)
    const [categoriaExistente] = await db.execute(
      'SELECT id FROM categorias WHERE usuario_id = ? AND LOWER(nome) = LOWER(?)',
      [userId, nome.trim()]
    );

    if (categoriaExistente.length > 0) {
      return res.status(400).send({ message: 'Você já possui uma categoria com este nome.' });
    }

    // Insere a nova categoria
    const query = 'INSERT INTO categorias (nome, usuario_id) VALUES (?, ?)';
    await db.execute(query, [nome.trim(), userId]);

    res.status(201).send({ message: 'Categoria criada com sucesso!' });
  } catch (err) {
    console.error('Erro ao criar categoria:', err);
    res.status(500).send({ message: 'Erro ao criar categoria.' });
  }
});

app.get('/categorias', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;

    // Busca as categorias do usuário ordenadas por nome
    const query = 'SELECT id, nome FROM categorias WHERE usuario_id = ? ORDER BY nome';
    const [rows] = await db.execute(query, [userId]);

    res.status(200).send(rows);
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    res.status(500).send({ message: 'Erro ao buscar categorias.' });
  }
});

app.put('/categorias/:id', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { id } = req.params;
    const { nome } = req.body;

    // Verifica se o nome da categoria está vazio
    if (!nome || nome.trim() === '') {
      return res.status(400).send({ message: 'O nome da categoria não pode estar vazio.' });
    }

    // Verifica se já existe outra categoria com o mesmo nome (ignorando a atual)
    const [categoriaExistente] = await db.execute(
      'SELECT id FROM categorias WHERE usuario_id = ? AND LOWER(nome) = LOWER(?) AND id != ?',
      [userId, nome.trim(), id]
    );

    if (categoriaExistente.length > 0) {
      return res.status(400).send({ message: 'Você já possui uma categoria com este nome.' });
    }

    // Atualiza a categoria
    const query = 'UPDATE categorias SET nome = ? WHERE id = ? AND usuario_id = ?';
    const [result] = await db.execute(query, [nome.trim(), id, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).send({ message: 'Categoria não encontrada ou não pertence ao usuário.' });
    }

    res.status(200).send({ message: 'Categoria atualizada com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar categoria:', err);
    res.status(500).send({ message: 'Erro ao atualizar categoria.' });
  }
});

app.delete('/categorias/:id', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { id } = req.params;

    // Verifica se existem produtos associados a esta categoria
    const [produtos] = await db.execute(
      'SELECT COUNT(*) AS total FROM produtos WHERE categoria_id = ? AND usuario_id = ?',
      [id, userId]
    );

    if (produtos[0].total > 0) {
      return res.status(400).send({
        message: 'Existem produtos associados a esta categoria. Remova os produtos ou altere sua categoria antes de excluir.'
      });
    }

    // Se não houver produtos associados, exclui a categoria
    const query = 'DELETE FROM categorias WHERE id = ? AND usuario_id = ?';
    await db.execute(query, [id, userId]);

    res.status(200).send({ message: 'Categoria excluída com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir categoria:', err);
    res.status(500).send({
      message: 'Erro ao excluir categoria.',
      error: err.message
    });
  }
});

app.get('/produtos/:id', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { id } = req.params;

    const query = `
      SELECT p.*, c.nome AS categoria_nome
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = ? AND p.usuario_id = ?
    `;
    const [produto] = await db.execute(query, [id, userId]);

    if (produto.length === 0) {
      return res.status(404).send({ message: 'Produto não encontrado.' });
    }

    res.status(200).send(produto[0]);
  } catch (err) {
    console.error('Erro ao buscar produto:', err);
    res.status(500).send({ message: 'Erro ao buscar produto.' });
  }
});

// Nova rota para obter categorias do usuário pelo ID do catálogo
app.get('/catalogo/:catalogoId/categorias', async (req, res) => {
  try {
    const { catalogoId } = req.params;

    // 1. Primeiro encontre o usuário pelo catalogoId
    const [usuario] = await db.execute(
      'SELECT id FROM usuarios WHERE catalogo_id = ?',
      [catalogoId]
    );

    if (usuario.length === 0) {
      return res.status(404).send({ message: 'Catálogo não encontrado.' });
    }

    // 2. Busque as categorias do usuário
    const [categorias] = await db.execute(
      'SELECT id, nome FROM categorias WHERE usuario_id = ?',
      [usuario[0].id]
    );

    res.status(200).send(categorias);
  } catch (err) {
    console.error('Erro ao buscar categorias do catálogo:', err);
    res.status(500).send({ message: 'Erro ao buscar categorias.' });
  }
});

// Rota para buscar a cor da loja
app.get('/cor-loja', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;

    const [usuario] = await db.execute(
      'SELECT cor FROM usuarios WHERE id = ?',
      [userId]
    );

    if (usuario.length === 0) {
      return res.status(404).send({ message: 'Usuário não encontrado.' });
    }

    // Retorna a cor ou uma cor padrão se não estiver definida
    res.status(200).send({ cor: usuario[0].cor || '#000000' });
  } catch (err) {
    console.error('Erro ao buscar cor da loja:', err);
    res.status(500).send({ message: 'Erro ao buscar cor da loja.' });
  }
});

// Rota para salvar a cor da loja
app.post('/cor-loja', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { cor } = req.body;

    // Validação simples do formato hexadecimal
    if (!/^#[0-9A-F]{6}$/i.test(cor)) {
      return res.status(400).send({ message: 'Formato de cor inválido. Use formato hexadecimal (#RRGGBB).' });
    }

    // Atualiza a cor no banco de dados
    await db.execute(
      'UPDATE usuarios SET cor = ? WHERE id = ?',
      [cor, userId]
    );

    res.status(200).send({ message: 'Cor da loja salva com sucesso!' });
  } catch (err) {
    console.error('Erro ao salvar cor da loja:', err);
    res.status(500).send({ message: 'Erro ao salvar cor da loja.' });
  }
});


// Rota para obter dados da loja

app.get('/catalogo/:catalogoId/dados-loja', async (req, res) => {
  try {
    const { catalogoId } = req.params;

    // Busca o usuário pelo UUID do catálogo
    const [usuario] = await db.execute(
      'SELECT nome_comercial, foto_perfil, celular, cor FROM usuarios WHERE catalogo_id = ?',
      [catalogoId]
    );

    if (usuario.length === 0) {
      return res.status(404).send({ message: 'Catálogo não encontrado.' });
    }

    res.status(200).send(usuario[0]);
  } catch (err) {
    console.error('Erro ao buscar dados da loja:', err);
    res.status(500).send({ message: 'Erro ao buscar dados da loja.' });
  }
});

// Rota para atualizar perfil
app.post('/atualizar-perfil', verificarAutenticacao, upload.single('foto_perfil'), async (req, res) => {
  try {
    const { userId } = req.session;
    const { nome_comercial } = req.body;
    const foto_perfil = req.file ? `/uploads/${req.file.filename}` : null;

    let query = 'UPDATE usuarios SET ';
    const params = [];

    if (nome_comercial) {
      query += 'nome_comercial = ?';
      params.push(nome_comercial);
    }

    if (foto_perfil) {
      if (params.length > 0) query += ', ';
      query += 'foto_perfil = ?';
      params.push(foto_perfil);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    await db.execute(query, params);

    res.status(200).send({ message: 'Perfil atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).send({ message: 'Erro ao atualizar perfil' });
  }
});

// Rota para alterar senha
app.post('/alterar-senha', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { currentPassword, newPassword } = req.body;

    // Validação da nova senha
    const validacaoSenha = validarSenha(newPassword);
    if (!validacaoSenha.valido) {
      return res.status(400).json({
        success: false,
        message: validacaoSenha.mensagem
      });
    }

    // 1. Verificar a senha atual
    const [user] = await db.execute(
      'SELECT senha_hash FROM usuarios WHERE id = ?',
      [userId]
    );

    const senhaValida = await bcrypt.compare(currentPassword, user[0].senha_hash);
    if (!senhaValida) {
      return res.status(400).send({ message: 'Senha atual incorreta' });
    }

    // 2. Atualizar para a nova senha
    const novaSenhaHash = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE usuarios SET senha_hash = ? WHERE id = ?',
      [novaSenhaHash, userId]
    );

    res.status(200).send({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).send({ message: 'Erro ao alterar senha' });
  }

});

// Rota para verificar limite de produtos
app.get('/verificar-limite-produtos', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const hoje = new Date();

    // Verifica se é assinante ativo (não expirado)
    const [usuario] = await db.execute(
      'SELECT assinante, assinatura_expira_em FROM usuarios WHERE id = ?',
      [userId]
    );

    const assinanteAtivo = usuario[0].assinante === 1 &&
      new Date(usuario[0].assinatura_expira_em) >= hoje;

    if (assinanteAtivo) {
      return res.status(200).send({
        limite: 'ilimitado',
        assinante: true,
        dataExpiracao: usuario[0].assinatura_expira_em
      });
    }

    // Se não for assinante ativo, conta os produtos
    const [produtos] = await db.execute(
      'SELECT COUNT(*) AS total FROM produtos WHERE usuario_id = ?',
      [userId]
    );

    const limite = 6; // Limite do plano básico
    const restante = Math.max(0, limite - produtos[0].total);

    res.status(200).send({
      limite: 'basico',
      produtosCadastrados: produtos[0].total,
      produtosRestantes: restante,
      assinante: false,
      dataExpiracao: usuario[0].assinatura_expira_em
    });
  } catch (err) {
    console.error('Erro ao verificar limite:', err);
    res.status(500).send({ message: 'Erro ao verificar limite de produtos.' });
  }
});



// Rota para atualizar plano do usuário
// Rota para atualizar plano do usuário
app.post('/atualizar-plano', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { planoId } = req.body;

    console.log('Recebido planoId:', planoId); // Adicione para debug

    // Verifica se o planoId foi fornecido
    if (planoId === undefined || planoId === null) {
      return res.status(400).send({ message: 'ID do plano não fornecido.' });
    }

    // Converte para número (caso venha como string)
    const planoIdNum = Number(planoId);

    // Verifica se o plano existe
    const planosDisponiveis = [
      { id: 1, nome: "Básico", assinante: false },
      { id: 2, nome: "Premium", assinante: true }
    ];

    const planoSelecionado = planosDisponiveis.find(p => p.id === planoIdNum);

    if (!planoSelecionado) {
      return res.status(400).send({ message: 'Plano inválido.' });
    }

    console.log('Atualizando para plano:', planoSelecionado); // Adicione para debug

    // Atualiza o status de assinante no banco de dados
    const [result] = await db.execute(
      'UPDATE usuarios SET assinante = ? WHERE id = ?',
      [planoSelecionado.assinante, userId]
    );

    console.log('Resultado da atualização:', result); // Adicione para debug

    if (result.affectedRows === 0) {
      return res.status(404).send({ message: 'Usuário não encontrado.' });
    }

    res.status(200).send({
      message: 'Plano atualizado com sucesso!',
      plano: planoSelecionado.nome,
      assinante: planoSelecionado.assinante
    });
  } catch (err) {
    console.error('Erro ao atualizar plano:', err);
    res.status(500).send({ message: 'Erro ao atualizar plano.' });
  }
});


const { MercadoPagoConfig, Preference } = require('mercadopago');

const accessToken = process.env.MERCADOPAGO_TOKEN;

const client = new MercadoPagoConfig({
  accessToken: accessToken,
  options: { timeout: 10000 }
});

const preference = new Preference(client);

app.post('/criar-pagamento', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;

    // Obter email do usuário
    const [user] = await db.execute('SELECT email_user FROM usuarios WHERE id = ?', [userId]);
    
    if (!user[0]?.email_user) {
      return res.status(400).json({
        success: false,
        message: 'Email não cadastrado'
      });
    }

    // Configuração para assinatura recorrente
    const subscriptionData = {
      reason: "Assinatura Premium Mistoque",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 19.9,
        currency_id: "BRL"
      },
      back_url: `${process.env.FRONTEND_URL_HTTPS}/assinatura-sucesso`,
      payer_email: user[0].email_user,
      external_reference: userId.toString()
    };

    const response = await fetch(MP_PREAPPROVAL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao criar assinatura');
    }

    if (!data.init_point) {
      throw new Error('URL de assinatura não foi retornada');
    }

    // Apenas salva o ID da assinatura, sem mudar o status
    await db.execute(
      'UPDATE usuarios SET assinatura_id = ? WHERE id = ?',
      [data.id, userId]
    );

    res.status(200).json({
      checkout_url: data.init_point,
      subscription_id: data.id
    });

  } catch (err) {
    console.error('Erro ao criar assinatura:', err);
    res.status(500).json({
      message: 'Erro ao criar assinatura',
      error: err.message
    });
  }
});

// No backend:
app.get('/assinatura-sucesso', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL_HTTPS}/produtos`);
});


// Função para atualizar data de expiração
async function atualizarAssinatura(userId, renovar = true, porReembolso = false) {
  const hoje = new Date();
  let novaData = hoje;
  let assinante = 0; // Começa como não assinante por padrão
  let status = 'expirada'; // Status padrão

  if (renovar) {
    // Assinatura ativa/renovada
    novaData = new Date();
    novaData.setMonth(novaData.getMonth() + 1);
    assinante = 1;
    status = 'ativa';
  } else if (!porReembolso) {
    // Cancelamento normal: mantém acesso até o fim do período
    const [user] = await db.execute(
      'SELECT assinatura_expira_em FROM usuarios WHERE id = ?',
      [userId]
    );
    if (user[0]?.assinatura_expira_em) {
      novaData = new Date(user[0].assinatura_expira_em);
      if (novaData > hoje) {
        assinante = 1; // Mantém como assinante até a data de expiração
        status = 'cancelada';
      } else {
        assinante = 0;
        status = 'expirada';
      }
    }
  }
  // Caso de reembolso ou pagamento rejeitado
  else {
    assinante = 0;
    status = 'expirada';
    novaData = hoje;
  }

  await db.execute(
    'UPDATE usuarios SET assinante = ?, assinatura_expira_em = ?, assinatura_status = ? WHERE id = ?',
    [assinante, novaData, status, userId]
  );
}



// Atualize o webhook
app.post('/webhook-mercadopago', async (req, res) => {
  try {
    console.log('Webhook recebido:', req.body);

    const { type, action, data } = req.body;

    // Processar notificação de assinatura
    if (type === 'subscription_preapproval') {
      const subscriptionId = data.id;
      console.log('Processando assinatura:', subscriptionId);

      const response = await fetch(`${MP_PREAPPROVAL_URL}/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const subscription = await response.json();
      console.log('Detalhes da assinatura:', subscription);

      const userId = parseInt(subscription.external_reference);
      if (isNaN(userId)) {
        throw new Error('ID do usuário inválido');
      }

      // Só atualiza para ativa se o status for authorized ou active
      if (['authorized', 'active'].includes(subscription.status)) {
        await atualizarAssinatura(userId, true);
        console.log(`Assinatura do usuário ${userId} ativada/renovada`);
      } 
      // Se for cancelled por cancelamento manual do usuário
      else if (action === 'cancelled') {
        await atualizarAssinatura(userId, false, false);
        console.log(`Assinatura do usuário ${userId} marcada como cancelada`);
      }
      // Se for rejected, pending, cancelled (por rejeição) ou outro status de falha
      else {
        await db.execute(
          'UPDATE usuarios SET assinante = 0, assinatura_status = "expirada" WHERE id = ?',
          [userId]
        );
        console.log(`Assinatura do usuário ${userId} expirada devido ao status: ${subscription.status}`);
      }
    }
    // Processar notificação de pagamento
    else if (type === 'payment') {
      const paymentId = data.id;
      console.log('Processando pagamento:', paymentId);

      const response = await fetch(`${MP_PAYMENTS_URL}/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const payment = await response.json();
      console.log('Detalhes do pagamento:', payment);

      // Pagamento aprovado de assinatura
      if (payment.status === 'approved' && payment.point_of_interaction?.transaction_data?.subscription_id) {
        const subscriptionId = payment.point_of_interaction.transaction_data.subscription_id;

        const subResponse = await fetch(`${MP_PREAPPROVAL_URL}/${subscriptionId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const subscription = await subResponse.json();
        const userId = parseInt(subscription.external_reference);

        if (!isNaN(userId)) {
          await atualizarAssinatura(userId, true);
          console.log(`Assinatura do usuário ${userId} ativada via pagamento aprovado`);
        }
      }
      // Qualquer status diferente de approved
      else if (payment.status !== 'approved') {
        if (payment.metadata?.subscription_id || payment.point_of_interaction?.transaction_data?.subscription_id) {
          const subscriptionId = payment.metadata?.subscription_id || payment.point_of_interaction.transaction_data.subscription_id;
          
          const subResponse = await fetch(`${MP_PREAPPROVAL_URL}/${subscriptionId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });

          const subscription = await subResponse.json();
          const userId = parseInt(subscription.external_reference);

          if (!isNaN(userId)) {
            await db.execute(
              'UPDATE usuarios SET assinante = 0, assinatura_status = "expirada" WHERE id = ?',
              [userId]
            );
            console.log(`Assinatura do usuário ${userId} expirada devido a pagamento ${payment.status}`);
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Erro no webhook:', err);
    res.status(500).send({ message: 'Erro no webhook', error: err.message });
  }
});

// Rotas de retorno
app.get('/pagamento-sucesso', (req, res) => {
  res.send('Pagamento aprovado! Sua assinatura foi ativada.');
});

app.get('/pagamento-falha', (req, res) => {
  res.send('Pagamento não aprovado. Tente novamente.');
});

app.get('/pagamento-pendente', (req, res) => {
  res.send('Pagamento pendente. Aguarde confirmação.');
});

// Tarefa agendada para verificar assinaturas expiradas diariamente
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Verificando assinaturas expiradas...');
    const hoje = new Date();

    // Buscar assinaturas que expiraram
    const [assinaturas] = await db.execute(
      'SELECT id FROM usuarios WHERE assinatura_expira_em < ? AND assinatura_status IN ("ativa", "cancelada")',
      [hoje]
    );

    // Atualizar status para expirado
    for (const user of assinaturas) {
      await db.execute(
        'UPDATE usuarios SET assinante = 0, assinatura_status = "expirada" WHERE id = ?',
        [user.id]
      );
      console.log(`Assinatura do usuário ${user.id} expirada`);
    }
  } catch (err) {
    console.error('Erro na verificação de assinaturas expiradas:', err);
  }
});

// Verificação imediata ao iniciar o servidor
async function verificarAssinaturasAoIniciar() {
  try {
    console.log('Verificando assinaturas ao iniciar...');
    const hoje = new Date();

    await db.execute(
      'UPDATE usuarios SET assinante = 0, assinatura_status = "expirada" ' +
      'WHERE assinatura_expira_em < ? AND assinatura_status IN ("ativa", "cancelada")',
      [hoje]
    );
  } catch (err) {
    console.error('Erro na verificação inicial de assinaturas:', err);
  }
}

verificarAssinaturasAoIniciar();
console.log('Data/hora atual:', new Date());



cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toLocaleTimeString()}] 🔄 Verificando reembolsos manuais...`);

  try {
    const response = await axios.get(
      `${MP_PAYMENTS_URL}/search`, 
      {
        params: {
          status: 'refunded',
          sort: 'date_created',
          criteria: 'desc'
        },
        headers: { 
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const data = response.data;

    if (data.results && Array.isArray(data.results)) {
      for (const payment of data.results) {
        const paymentId = payment.id;

        // Verifica se já foi processado
        const [jaProcessado] = await db.execute(
          'SELECT 1 FROM pagamentos_reembolsados WHERE payment_id = ?',
          [paymentId]
        );

        if (jaProcessado.length > 0) {
          continue; // já processado, pula
        }

        const subscriptionId = payment.metadata?.subscription_id || 
                             payment.point_of_interaction?.transaction_data?.subscription_id;

        if (!subscriptionId) {
          console.log(`⚠️ Pagamento ${paymentId} não tem subscription_id. Ignorado.`);
          continue;
        }

        try {
          const subResponse = await axios.get(
            `${MP_PREAPPROVAL_URL}/${subscriptionId}`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          );

          const subscription = subResponse.data;
          const userId = parseInt(subscription.external_reference);

          if (!isNaN(userId)) {
            const [rows] = await db.execute(
              'SELECT assinatura_status FROM usuarios WHERE id = ?',
              [userId]
            );

            if (rows.length && rows[0].assinatura_status !== 'expirada') {
              await atualizarAssinatura(userId, false, true);
              console.log(`✅ Assinatura do usuário ${userId} cancelada por reembolso manual detectado`);

              // Marca como processado
              await db.execute(
                'INSERT INTO pagamentos_reembolsados (payment_id, user_id) VALUES (?, ?)',
                [paymentId, userId]
              );
            }
          }
        } catch (subError) {
          console.log(`⚠️ Erro ao processar subscription ${subscriptionId}:`, subError.message);
          continue;
        }
      }
    }
  } catch (err) {
    if (err.response?.status === 401) {
      console.log(`[${new Date().toLocaleTimeString()}] ⚠️ Erro de autenticação ao verificar reembolsos. Verifique o token de acesso.`);
    } else {
      console.error(`[${new Date().toLocaleTimeString()}] ❌ Erro ao verificar reembolsos:`, err.message);
    }
  }
});

// Rota para cancelar assinatura
app.post('/cancelar-assinatura', verificarAutenticacao, async (req, res) => {
  const { userId } = req.session;

  try {
    console.log('Iniciando processo de cancelamento para usuário:', userId);
    
    // Busca o ID da assinatura do usuário
    const [assinatura] = await db.execute(
      'SELECT assinatura_id, assinatura_status FROM usuarios WHERE id = ?',
      [userId]
    );

    if (!assinatura[0]) {
      return res.status(400).json({ message: 'Usuário não encontrado.' });
    }

    if (!assinatura[0].assinatura_id) {
      return res.status(400).json({ message: 'Nenhuma assinatura encontrada para este usuário.' });
    }

    const assinaturaId = assinatura[0].assinatura_id;
    console.log('ID da assinatura:', assinaturaId);

    try {
      // Primeiro verifica o status atual da assinatura
      const statusResponse = await axios.get(
        `${MP_PREAPPROVAL_URL}/${assinaturaId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      console.log('Status atual da assinatura:', statusResponse.data);

      // Tenta cancelar a assinatura
      const mpResponse = await axios.put(
        `${MP_PREAPPROVAL_URL}/${assinaturaId}`,
        { status: 'cancelled' },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Resposta do cancelamento:', mpResponse.data);

      // Atualiza o status no banco
      await db.execute(
        'UPDATE usuarios SET assinatura_status = "cancelada" WHERE id = ?',
        [userId]
      );

      return res.json({ 
        message: 'Assinatura cancelada com sucesso!',
        mpResponse: mpResponse.data 
      });

    } catch (mpError) {
      console.error('Erro detalhado do MP:', {
        status: mpError.response?.status,
        data: mpError.response?.data,
        message: mpError.message
      });
      
      // Atualiza o status no banco mesmo com erro
      await db.execute(
        'UPDATE usuarios SET assinatura_status = "cancelada" WHERE id = ?',
        [userId]
      );

      return res.status(200).json({ 
        message: 'Assinatura marcada como cancelada no sistema.',
        warning: 'Houve um erro ao comunicar com o Mercado Pago, mas a assinatura foi cancelada no sistema.',
        error: mpError.response?.data || mpError.message
      });
    }
  } catch (err) {
    console.error('Erro geral:', err);
    return res.status(500).json({ 
      message: 'Erro ao cancelar assinatura.',
      error: err.message 
    });
  }
});

// Função para limpar códigos expirados
const limparCodigosExpirados = () => {
  console.log('Iniciando limpeza de códigos expirados...');
  const agora = Date.now();
  let codigosRemovidos = 0;

  for (const [celular, dados] of verificationCodes.entries()) {
    if (agora > dados.expiresAt) {
      verificationCodes.delete(celular);
      codigosRemovidos++;
    }
  }

  if (codigosRemovidos > 0) {
    console.log(`${codigosRemovidos} códigos expirados foram removidos`);
  }
};

// Executa a limpeza a cada minuto
setInterval(limparCodigosExpirados, 60 * 1000);

// Rota para reenvio de código
app.post('/reenviar-codigo', async (req, res) => {
  try {
    console.log('Recebida requisição de reenvio para:', req.body);
    const { celular } = req.body;

    if (!celular) {
      return res.status(400).json({
        success: false,
        message: 'Número de celular é obrigatório'
      });
    }

    // Verifica se existe um registro pendente para este celular
    const dadosAntigos = verificationCodes.get(celular);
    console.log('Dados encontrados para o celular:', celular, !!dadosAntigos);

    if (!dadosAntigos) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum registro pendente encontrado para este número'
      });
    }

    // Gera um novo código
    const novoCodigo = generateVerificationCode();
    console.log('Novo código gerado:', novoCodigo);

    // Atualiza os dados com o novo código
    const novosDados = {
      ...dadosAntigos,
      code: novoCodigo,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutos
      ultimoEnvio: Date.now()
    };

    // Tenta enviar o SMS primeiro
    try {
      console.log('Tentando enviar SMS para:', celular);
      await twilioClient.messages.create({
        body: `Seu código de verificação do Mistoque é: ${novoCodigo}`,
        to: celular,
        from: TWILIO_PHONE_NUMBER
      });
      console.log('SMS enviado com sucesso');

      // Só salva os novos dados se o SMS for enviado com sucesso
      verificationCodes.set(celular, novosDados);

      res.status(200).json({
        success: true,
        message: 'Novo código enviado com sucesso'
      });
    } catch (smsError) {
      console.error('Erro ao enviar SMS:', smsError);
      
      // Se for erro de configuração do Twilio
      if (smsError.code === 20003) {
        return res.status(500).json({
          success: false,
          message: 'Erro na configuração do serviço de SMS'
        });
      }

      // Para outros erros do Twilio
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar SMS. Tente novamente.'
      });
    }

  } catch (err) {
    console.error('Erro ao processar reenvio:', err);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar reenvio do código'
    });
  }
});

// Rota para verificar se o registro ainda está pendente
app.get('/verificar-registro-pendente/:celular', (req, res) => {
  try {
    const { celular } = req.params;
    const dados = verificationCodes.get(celular);

    if (!dados) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum registro pendente encontrado'
      });
    }

    // Verifica se o código expirou
    if (Date.now() > dados.expiresAt) {
      verificationCodes.delete(celular);
      return res.status(404).json({
        success: false,
        message: 'Registro expirado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Registro pendente encontrado',
      expiresAt: dados.expiresAt,
      ultimoEnvio: dados.ultimoEnvio || 0
    });

  } catch (err) {
    console.error('Erro ao verificar registro pendente:', err);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar registro pendente'
    });
  }
});

// Rota para verificar celular na recuperação de senha
app.post('/verificar-celular-senha', async (req, res) => {
  try {
    const { celular } = req.body;

    if (!celular) {
      return res.status(400).json({
        success: false,
        message: 'Número de celular é obrigatório'
      });
    }

    // Verifica se o celular existe no banco de dados
    const [usuario] = await db.execute(
      'SELECT id FROM usuarios WHERE celular = ?',
      [celular]
    );

    if (usuario.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Celular não encontrado'
      });
    }

    // Gera o código de verificação
    const verificationCode = generateVerificationCode();
    
    // Armazena o código temporariamente
    verificationCodes.set(celular, {
      code: verificationCode,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutos
      type: 'password_reset' // Marca que é para redefinição de senha
    });

    // Envia o código via SMS
    try {
      await twilioClient.messages.create({
        body: `Seu código de verificação do Mistoque para redefinição de senha é: ${verificationCode}`,
        to: celular,
        from: TWILIO_PHONE_NUMBER
      });

      res.status(200).json({
        success: true,
        message: 'Código de verificação enviado com sucesso'
      });
    } catch (smsError) {
      console.error('Erro ao enviar SMS:', smsError);
      res.status(500).json({
        success: false,
        message: 'Erro ao enviar código de verificação'
      });
    }

  } catch (err) {
    console.error('Erro ao verificar celular:', err);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar celular'
    });
  }
});

// Rota para verificar o código na recuperação de senha
app.post('/verify-code-senha', async (req, res) => {
  try {
    const { celular, code } = req.body;

    if (!celular || !code) {
      return res.status(400).json({
        success: false,
        message: 'Celular e código são obrigatórios'
      });
    }

    const userData = verificationCodes.get(celular);

    if (!userData || userData.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Código inválido ou expirado'
      });
    }

    if (Date.now() > userData.expiresAt) {
      verificationCodes.delete(celular);
      return res.status(400).json({
        success: false,
        message: 'Código expirado'
      });
    }

    if (userData.code !== code) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido'
      });
    }

    // Gera um token para redefinição de senha
    const token = generateVerificationCode(); // Reusando a função para gerar um token
    
    // Atualiza os dados com o token
    verificationCodes.set(celular, {
      ...userData,
      token,
      tokenExpiresAt: Date.now() + 10 * 60 * 1000 // 10 minutos para usar o token
    });

    res.status(200).json({
      success: true,
      message: 'Código verificado com sucesso',
      token
    });

  } catch (err) {
    console.error('Erro ao verificar código:', err);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar código'
    });
  }
});

// Rota para redefinir a senha
app.post('/redefinir-senha', async (req, res) => {
  try {
    const { celular, token, novaSenha } = req.body;

    if (!celular || !token || !novaSenha) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
    }

    // Validação da nova senha
    const validacaoSenha = validarSenha(novaSenha);
    if (!validacaoSenha.valido) {
      return res.status(400).json({
        success: false,
        message: validacaoSenha.mensagem
      });
    }

    const userData = verificationCodes.get(celular);

    if (!userData || userData.type !== 'password_reset' || userData.token !== token) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }

    if (Date.now() > userData.tokenExpiresAt) {
      verificationCodes.delete(celular);
      return res.status(400).json({
        success: false,
        message: 'Token expirado'
      });
    }

    // Atualiza a senha no banco de dados
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await db.execute(
      'UPDATE usuarios SET senha_hash = ? WHERE celular = ?',
      [senhaHash, celular]
    );

    // Limpa os dados temporários
    verificationCodes.delete(celular);

    res.status(200).json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });

  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({
      success: false,
      message: 'Erro ao redefinir senha'
    });
  }
});

// Rota para atualizar email do usuário
app.post('/atualizar-email', verificarAutenticacao, async (req, res) => {
  try {
    const { userId } = req.session;
    const { email } = req.body;

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Email inválido' 
      });
    }

    // Atualiza o email no banco de dados
    await db.execute(
      'UPDATE usuarios SET email_user = ? WHERE id = ?',
      [email, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Email atualizado com sucesso'
    });
  } catch (err) {
    console.error('Erro ao atualizar email:', err);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar email'
    });
  }
});




