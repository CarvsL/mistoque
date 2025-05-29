import { Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import Register from './pages/register';
import Dashboard from './pages/dashboard';
import Produtos from './pages/produtos';
import Historico from './pages/historico';
import CatalogoPublico from "./pages/catalogopublico";
import Principal from "./pages/principal";
import Code from "./pages/code";
import CelSenha from "./pages/celsenha";
import CodeTwo from "./pages/codetwo";
import ReSenha from "./pages/resenha";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Principal />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/code" element={<Code />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/produtos" element={<Produtos />} />
      <Route path="/historico" element={<Historico />} />
      <Route path="/catalogo/:catalogoId" element={<CatalogoPublico />} />
      <Route path="/celsenha" element={<CelSenha />} />
      <Route path="/codetwo" element={<CodeTwo />} />
      <Route path="/resenha" element={<ReSenha />} />
    </Routes>
  );
}

export default App;
