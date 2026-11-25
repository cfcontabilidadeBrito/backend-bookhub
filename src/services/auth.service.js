// Regras de autenticação: conferir e-mail/senha, escolher a empresa
// e gerar o token JWT.
// O service não conhece req nem res: recebe dados e devolve dados (ou lança erro).
//
// Fluxo multi-tenant:
//   1. POST /auth/login  -> se o usuário tem UMA empresa, o token já sai com ela.
//                           se tem VÁRIAS, o token sai sem empresa + lista de empresas.
//   2. POST /auth/empresa -> troca o token por um token da empresa escolhida.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const HttpError = require("../utils/httpError");
const empresasService = require("./empresas.service");

// Nunca devolvemos senha_hash para o cliente.
function formatarUsuario(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    criadoEm: linha.criado_em,
  };
}

// O token carrega só o necessário: quem é, em qual empresa e com qual papel.
function gerarToken(usuarioId, empresa) {
  const payload = { id: usuarioId };
  if (empresa) {
    payload.empresaId = empresa.id;
    payload.papel = empresa.papel;
  }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

async function login(email, senha) {
  if (!email || !senha) {
    throw new HttpError(400, "Informe email e senha");
  }

  const [linhas] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
  const usuario = linhas[0];

  // bcrypt.compare gera o hash da senha digitada e compara com o salvo.
  const senhaConfere = usuario && (await bcrypt.compare(senha, usuario.senha_hash));

  // Mesma mensagem para "e-mail não existe" e "senha errada":
  // assim ninguém descobre quais e-mails estão cadastrados.
  if (!senhaConfere) {
    throw new HttpError(401, "Email ou senha inválidos");
  }

  // Só entram na lista as empresas ativas em que o vínculo também está ativo.
  const empresas = await empresasService.listarAcessiveis(usuario.id);

  if (empresas.length === 0) {
    throw new HttpError(403, "Usuário sem acesso a nenhuma empresa ativa");
  }

  // Uma empresa só: entra direto.
  if (empresas.length === 1) {
    return {
      token: gerarToken(usuario.id, empresas[0]),
      usuario: formatarUsuario(usuario),
      empresa: empresas[0],
      precisaEscolherEmpresa: false,
    };
  }

  // Várias empresas: o cliente mostra a lista e chama POST /auth/empresa.
  return {
    token: gerarToken(usuario.id, null),
    usuario: formatarUsuario(usuario),
    empresas,
    precisaEscolherEmpresa: true,
  };
}

// Escolhe (ou troca) a empresa e devolve um token novo para ela.
async function selecionarEmpresa(usuarioId, empresaId) {
  if (!Number.isInteger(empresaId) || empresaId <= 0) {
    throw new HttpError(400, "Informe empresaId (número inteiro)");
  }

  const vinculo = await empresasService.buscarVinculoAtivo(usuarioId, empresaId);
  if (!vinculo) {
    throw new HttpError(403, "Sem acesso a esta empresa (usuário ou empresa inativos)");
  }

  const empresa = await empresasService.buscarPorId(empresaId, usuarioId);
  return { token: gerarToken(usuarioId, empresa), empresa };
}

// Dados do usuário logado + empresa atual + empresas que ele pode acessar.
async function buscarUsuarioLogado({ id, empresaId }) {
  const [linhas] = await pool.query("SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?", [id]);

  if (linhas.length === 0) {
    throw new HttpError(404, "Usuário não encontrado");
  }

  const empresas = await empresasService.listarAcessiveis(id);
  const empresaAtual = empresas.find((e) => e.id === empresaId) || null;

  return { ...formatarUsuario(linhas[0]), empresaAtual, empresas };
}

module.exports = { login, selecionarEmpresa, buscarUsuarioLogado };
