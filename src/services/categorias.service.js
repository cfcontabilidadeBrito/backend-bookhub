// Regras de negócio e acesso ao banco para categorias.
// Multi-tenant: toda query filtra por empresa_id (a empresa do token),
// então uma empresa nunca enxerga nem altera categorias de outra.
const { pool } = require("../config/db");
const HttpError = require("../utils/httpError");
const traduzirErroMysql = require("../utils/mysqlErrors");

function validarId(id) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "id inválido");
  }
}

function validarNome(nome) {
  if (typeof nome !== "string" || nome.trim() === "") {
    throw new HttpError(400, "O nome da categoria é obrigatório");
  }
  return nome.trim();
}

async function listar(empresaId) {
  const [linhas] = await pool.query(
    "SELECT id, nome FROM categorias WHERE empresa_id = ? ORDER BY nome",
    [empresaId]
  );
  return linhas;
}

async function buscarPorId(empresaId, id) {
  validarId(id);
  const [linhas] = await pool.query(
    "SELECT id, nome FROM categorias WHERE id = ? AND empresa_id = ?",
    [id, empresaId]
  );

  if (linhas.length === 0) {
    throw new HttpError(404, "Categoria não encontrada");
  }
  return linhas[0];
}

async function criar(empresaId, { nome }) {
  const nomeLimpo = validarNome(nome);

  try {
    const [resultado] = await pool.query(
      "INSERT INTO categorias (empresa_id, nome) VALUES (?, ?)",
      [empresaId, nomeLimpo]
    );
    return { id: resultado.insertId, nome: nomeLimpo };
  } catch (err) {
    throw traduzirErroMysql(err, { duplicado: "Já existe uma categoria com esse nome" });
  }
}

async function atualizar(empresaId, id, { nome }) {
  validarId(id);
  const nomeLimpo = validarNome(nome);

  try {
    const [resultado] = await pool.query(
      "UPDATE categorias SET nome = ? WHERE id = ? AND empresa_id = ?",
      [nomeLimpo, id, empresaId]
    );
    if (resultado.affectedRows === 0) {
      throw new HttpError(404, "Categoria não encontrada");
    }
    return { id, nome: nomeLimpo };
  } catch (err) {
    throw traduzirErroMysql(err, { duplicado: "Já existe uma categoria com esse nome" });
  }
}

async function remover(empresaId, id) {
  validarId(id);

  // Não precisamos mexer nas obras: a chave estrangeira foi criada com
  // ON DELETE SET NULL, então o próprio MySQL deixa categoria_id = NULL.
  const [resultado] = await pool.query(
    "DELETE FROM categorias WHERE id = ? AND empresa_id = ?",
    [id, empresaId]
  );

  if (resultado.affectedRows === 0) {
    throw new HttpError(404, "Categoria não encontrada");
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
