// Regras de negócio para os usuários DA EMPRESA ATUAL.
// Todas as funções recebem empresaId (vindo do token) e só enxergam
// usuários vinculados a essa empresa.
//
// "Inativar usuário" desativa o VÍNCULO com a empresa (usuario_empresa.ativo):
// o usuário perde o acesso a esta empresa, mas continua nas outras.
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const HttpError = require("../utils/httpError");
const traduzirErroMysql = require("../utils/mysqlErrors");

const PAPEIS_VALIDOS = ["admin", "leitor"];

const SELECT_USUARIOS = `
  SELECT u.id, u.nome, u.email, ue.papel, ue.ativo, ue.criado_em AS vinculado_em
  FROM usuarios u
  JOIN usuario_empresa ue ON ue.usuario_id = u.id
  WHERE ue.empresa_id = ?
`;

function formatarUsuario(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    papel: linha.papel,
    ativo: Boolean(linha.ativo),
    vinculadoEm: linha.vinculado_em,
  };
}

function validarId(id) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "id inválido");
  }
}

function validarPapel(papel) {
  if (!PAPEIS_VALIDOS.includes(papel)) {
    throw new HttpError(400, `papel inválido. Use: ${PAPEIS_VALIDOS.join(", ")}`);
  }
}

// Evita que o admin tire o próprio acesso e deixe a empresa sem admin.
function impedirAlterarASiMesmo(id, solicitanteId) {
  if (id === solicitanteId) {
    throw new HttpError(400, "Você não pode alterar o seu próprio vínculo");
  }
}

async function listar(empresaId, { ativo }) {
  let sql = SELECT_USUARIOS;
  const valores = [empresaId];

  // ?ativo=true ou ?ativo=false (opcional)
  if (ativo === "true" || ativo === "false") {
    sql += " AND ue.ativo = ?";
    valores.push(ativo === "true");
  }
  sql += " ORDER BY u.nome";

  const [linhas] = await pool.query(sql, valores);
  return linhas.map(formatarUsuario);
}

async function buscarPorId(empresaId, id) {
  validarId(id);
  const [linhas] = await pool.query(`${SELECT_USUARIOS} AND u.id = ?`, [empresaId, id]);

  if (linhas.length === 0) {
    throw new HttpError(404, "Usuário não encontrado nesta empresa");
  }
  return formatarUsuario(linhas[0]);
}

// Adiciona um usuário à empresa.
// - E-mail já cadastrado no sistema: só cria o vínculo (nome e senha são ignorados).
// - E-mail novo: cria o usuário (nome e senha obrigatórios) e o vínculo.
async function criar(empresaId, { nome, email, senha, papel = "leitor" }) {
  if (typeof email !== "string" || email.trim() === "") {
    throw new HttpError(400, "O email é obrigatório");
  }
  validarPapel(papel);

  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    const [existentes] = await conexao.query("SELECT id FROM usuarios WHERE email = ?", [email.trim()]);
    let usuarioId = existentes[0] && existentes[0].id;

    if (!usuarioId) {
      if (typeof nome !== "string" || nome.trim() === "") {
        throw new HttpError(400, "O nome é obrigatório para um usuário novo");
      }
      if (typeof senha !== "string" || senha.length < 6) {
        throw new HttpError(400, "A senha deve ter pelo menos 6 caracteres");
      }

      // Guardamos só o hash; o número 10 é o "custo" (quanto maior, mais lento de quebrar).
      const senhaHash = await bcrypt.hash(senha, 10);
      const [resultado] = await conexao.query(
        "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)",
        [nome.trim(), email.trim(), senhaHash]
      );
      usuarioId = resultado.insertId;
    }

    await conexao.query(
      "INSERT INTO usuario_empresa (usuario_id, empresa_id, papel) VALUES (?, ?, ?)",
      [usuarioId, empresaId, papel]
    );

    await conexao.commit();
    return buscarPorId(empresaId, usuarioId);
  } catch (err) {
    await conexao.rollback();
    throw traduzirErroMysql(err, { duplicado: "Este usuário já está vinculado à empresa" });
  } finally {
    conexao.release();
  }
}

// Altera o papel do usuário nesta empresa.
async function atualizar(empresaId, id, solicitanteId, { papel }) {
  validarId(id);
  impedirAlterarASiMesmo(id, solicitanteId);
  validarPapel(papel);

  const [resultado] = await pool.query(
    "UPDATE usuario_empresa SET papel = ? WHERE usuario_id = ? AND empresa_id = ?",
    [papel, id, empresaId]
  );
  if (resultado.affectedRows === 0) {
    throw new HttpError(404, "Usuário não encontrado nesta empresa");
  }
  return buscarPorId(empresaId, id);
}

// Inativa (ativo = false) ou reativa (ativo = true) o usuário nesta empresa.
async function alterarStatus(empresaId, id, solicitanteId, ativo) {
  validarId(id);
  impedirAlterarASiMesmo(id, solicitanteId);

  const [resultado] = await pool.query(
    "UPDATE usuario_empresa SET ativo = ? WHERE usuario_id = ? AND empresa_id = ?",
    [ativo, id, empresaId]
  );
  if (resultado.affectedRows === 0) {
    throw new HttpError(404, "Usuário não encontrado nesta empresa");
  }
  return buscarPorId(empresaId, id);
}

module.exports = { listar, buscarPorId, criar, atualizar, alterarStatus };
