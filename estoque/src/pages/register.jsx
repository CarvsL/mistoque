import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useAuth } from "../hooks/useAuth";
import "cropperjs/dist/cropper.css";
import styles from "./Register.module.css";
import Cropper from "cropperjs";
import { Link } from "react-router-dom";
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';
import { cpf as cpfValidator } from 'cpf-cnpj-validator'; // Renomeamos para evitar conflito
import { isValidPhoneNumber } from 'react-phone-number-input';

export default function Register() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [recaptchaValue, setRecaptchaValue] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [cropper, setCropper] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const imgRef = useRef(null); // Ref para a imagem carregada
  const fileInputRef = useRef(null); // Ref para o campo de arquivo

  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/produtos');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (fotoPerfil && imgRef.current) {
      // Destruir o cropper anterior, se existir
      if (cropper) {
        cropper.destroy();
        setCropper(null);
      }

      // Criar um novo cropper
      const newCropper = new Cropper(imgRef.current, {
        aspectRatio: 1,
        viewMode: 1,
        responsive: true,
        autoCropArea: 1,
        cropBoxResizable: true,
        zoomable: false,
      });
      setCropper(newCropper);
    }
  }, [fotoPerfil]); // Executar sempre que fotoPerfil mudar

  const handleRecaptchaChange = (value) => {
    setRecaptchaValue(value);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFotoPerfil(reader.result);
        setCroppedImage(null);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCpfChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    let formattedValue = rawValue;

    // Formatação: 000.000.000-00
    if (rawValue.length > 9) {
      formattedValue = `${rawValue.slice(0, 3)}.${rawValue.slice(3, 6)}.${rawValue.slice(6, 9)}-${rawValue.slice(9, 11)}`;
    } else if (rawValue.length > 6) {
      formattedValue = `${rawValue.slice(0, 3)}.${rawValue.slice(3, 6)}.${rawValue.slice(6)}`;
    } else if (rawValue.length > 3) {
      formattedValue = `${rawValue.slice(0, 3)}.${rawValue.slice(3)}`;
    }

    setCpf(formattedValue);

    setCpfError("");
  };

  const handleCrop = () => {
    if (cropper) {
      const croppedDataURL = cropper.getCroppedCanvas({
        width: 200,
        height: 200,
        fillColor: "#fff",
      }).toDataURL();
      setCroppedImage(croppedDataURL);
      setShowCropper(false); // Fechar o modal de corte após o corte ser realizado
    }
  };

  const handleCancel = () => {
    setShowCropper(false); // Fechar a janela de corte
    setFotoPerfil(null); // Limpar a imagem carregada
    setCroppedImage(null); // Resetar a imagem cortada

    // Resetar o valor do campo de arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Limpa o campo de arquivo
    }
  };

  const handleRegister = async () => {
    if (!nome || !celular || !cpf || !senha || !confirmarSenha) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    const celularRegex = /^\+?[1-9]\d{1,14}$/;
    if (!celularRegex.test(celular)) {
      alert("Por favor, insira um número de celular válido.");
      return;
    }

    if (senha !== confirmarSenha) {
      alert("As senhas não coincidem.");
      return;
    }

    if (!recaptchaValue) {
      alert("Por favor, complete o reCAPTCHA.");
      return;
    }

    if (!celular || !isValidPhoneNumber(celular)) {
      alert("Por favor, insira um número de celular válido.");
      return;
    }

    const rawCpf = cpf.replace(/\D/g, ""); // Remove não-dígitos

    if (!cpfValidator.isValid(rawCpf)) {
      alert("Por favor, insira um CPF válido.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("nome", nome);
      formData.append("celular", celular);
      formData.append("cpf", rawCpf);
      formData.append("senha", senha);
      formData.append("recaptchaValue", recaptchaValue);

      // Verificar se a imagem cortada existe antes de anexar
      if (croppedImage) {
        const blob = await fetch(croppedImage).then((res) => res.blob());
        formData.append("fotoPerfil", blob, "fotoPerfil.jpg");
      }

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) throw data;

      // Redireciona para a página de código com os dados do registro
      navigate("/code", {
        state: {
          registrationData: {
            nome,
            celular,
            cpf: rawCpf,
            senha,
            fotoPerfil: croppedImage
          }
        }
      });

    } catch (err) {
      if (err.duplicateField) {
        let mensagem = `Este ${err.duplicateField} já está em uso.`;
        alert(mensagem);
      } else {
        alert(err.message || "Erro ao registrar usuário.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

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
        <div className={styles.registerContainer}>
          <h1 className={styles.registerTitulo}>Cadastro</h1>
          <form className={styles.registerFormulario}>
            <div className={styles.registerCampo}>
              <input
                type="text"
                className={styles.registerInput}
                placeholder="Nome Comercial"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={30}
              />
            </div>
            <div className={styles.registerCampo}>
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
            <div className={styles.registerCampo}>
              <input
                type="text"
                className={`${styles.registerInput} ${cpfError && styles.errorInput}`}
                placeholder="CPF"
                value={cpf}
                onChange={handleCpfChange}
                maxLength={14}
              />
              {cpfError && <span className={styles.errorText}>{cpfError}</span>}
            </div>
            <div className={styles.registerCampo}>
              <input
                type="password"
                className={styles.registerInput}
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className={styles.registerCampo}>
              <input
                type="password"
                className={styles.registerInput}
                placeholder="Confirmar Senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className={styles.registerCampo}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.registerInput}
                ref={fileInputRef} // Referência para o campo de arquivo
              />
              {showCropper && fotoPerfil && (
                <div className={styles.registerCropperModal}>
                  <div className={styles.registerCropperContent}>
                    <img ref={imgRef} src={fotoPerfil} alt="Imagem para recorte" />
                    <div className={styles.cropperButtons}>
                      <button type="button" onClick={handleCrop} className={styles.cropperButton}>
                        Cortar
                      </button>
                      <button type="button" onClick={handleCancel} className={styles.cropperButtonCancel}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {croppedImage && (
                <div className={styles.registerImgPreviewContainer}>
                  <img src={croppedImage} alt="Pré-visualização" className={styles.registerImgPreview} />
                </div>
              )}
            </div>

            <div className={styles.recaptchaContainer}>
              <ReCAPTCHA
                sitekey="6LcLL78qAAAAAFxrO-ZXBaCnMDVSmGK4VfrIFMr7"
                onChange={handleRecaptchaChange}
              />
            </div>

            <button
              type="button"
              className={styles.registerBotao}
              onClick={handleRegister}
              disabled={isSubmitting || !recaptchaValue}
            >
              {isSubmitting ? "Cadastrando..." : "Cadastrar"}
            </button>
            <button
              type="button"
              className={styles.registerBotaoSecundario}
              onClick={() => navigate("/")}
            >
              {isSubmitting ? "Voltando..." : "Voltar"}
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