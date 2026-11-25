// Regras de negócio e acesso ao banco para livros.
// Na API o recurso se chama "livros"; no banco, a tabela é "obras".
// Multi-tenant: toda query filtra por empresa_id (a empresa do token).
const { pool } = require("../config/db");
const HttpError = require("../utils/httpError");
const traduzirErroMysql = require("../utils/mysqlErrors");

const MENSAGENS_ERRO = {
  referenciaInexistente: "Categoria informada não existe",
  emUso: "Não é possível apagar: o livro possui empréstimos registrados",
  duplicado: "Já existe um livro com esse idExterno",
  check: "Dados inválidos: título não pode ser vazio e estoque não pode ser negativo",
};

// SELECT base: renomeia as colunas (snake_case) para o formato da API (camelCase)
// e traz o nome da categoria com LEFT JOIN (livro sem categoria também aparece).
const SELECT_LIVROS = `
  SELECT o.id, o.titulo, o.autor, o.id_externo AS idExterno,
         o.categoria_id AS categoriaId, c.nome AS categoria, o.estoque
  FROM obras o
  LEFT JOIN categorias c ON c.id = o.categoria_id
  WHERE o.empresa_id = ?
`;

// Campos que podem ser alterados no PATCH: nome na API -> coluna no banco.
// Só montamos SQL com nomes de coluna desta lista (nunca com texto do usuário).
const CAMPOS_EDITAVEIS = {
  titulo: "titulo",
  autor: "autor",
  idExterno: "id_externo",
  categoriaId: "categoria_id",
  estoque: "estoque",
};

function validarId(id) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "id inválido");
  }
}

function validarCampos(dados) {
  if ("titulo" in dados && (typeof dados.titulo !== "string" || dados.titulo.trim() === "")) {
    throw new HttpError(400, "O título é obrigatório");
  }
  if ("estoque" in dados && (!Number.isInteger(dados.estoque) || dados.estoque < 0)) {
    throw new HttpError(400, "O estoque deve ser um número inteiro maior ou igual a zero");
  }
  if ("categoriaId" in dados && dados.categoriaId !== null && !Number.isInteger(dados.categoriaId)) {
    throw new HttpError(400, "categoriaId deve ser um número inteiro ou null");
  }
}

// A chave estrangeira só garante que a categoria EXISTE; não garante que
// ela é da MESMA empresa. Essa regra de negócio fica aqui no service.
async function garantirCategoriaDaEmpresa(empresaId, categoriaId) {
  if (categoriaId === null || categoriaId === undefined) return;

  const [linhas] = await pool.query(
    "SELECT id FROM categorias WHERE id = ? AND empresa_id = ?",
    [categoriaId, empresaId]
  );
  if (linhas.length === 0) {
    throw new HttpError(400, MENSAGENS_ERRO.referenciaInexistente);
  }
}

async function listar(empresaId, { categoriaId, autor }) {
  let sql = SELECT_LIVROS;
  const valores = [empresaId];

  // Os filtros são opcionais: só entram no WHERE se vierem na query string.
  if (categoriaId) {
    if (!Number.isInteger(Number(categoriaId))) {
      throw new HttpError(400, "categoriaId deve ser um número inteiro");
    }
    sql += " AND o.categoria_id = ?";
    valores.push(Number(categoriaId));
  }
  if (autor) {
    // O "%" vai no VALOR, não no SQL: a query continua parametrizada.
    sql += " AND o.autor LIKE ?";
    valores.push(`%${autor}%`);
  }
  sql += " ORDER BY o.titulo";

  const [linhas] = await pool.query(sql, valores);
  return linhas;
}

async function buscarPorId(empresaId, id) {
  validarId(id);
  const [linhas] = await pool.query(`${SELECT_LIVROS} AND o.id = ?`, [empresaId, id]);

  if (linhas.length === 0) {
    throw new HttpError(404, "Livro não encontrado");
  }
  return linhas[0];
}

async function criar(empresaId, dados) {
  // No POST o título é obrigatório mesmo que não venha no body.
  validarCampos({ titulo: dados.titulo ?? "", ...dados });

  const { titulo, autor = null, idExterno = null, categoriaId = null, estoque = 0 } = dados;
  await garantirCategoriaDaEmpresa(empresaId, categoriaId);

  try {
    const [resultado] = await pool.query(
      "INSERT INTO obras (empresa_id, titulo, autor, id_externo, categoria_id, estoque) VALUES (?, ?, ?, ?, ?, ?)",
      [empresaId, titulo.trim(), autor, idExterno, categoriaId, estoque]
    );
    return buscarPorId(empresaId, resultado.insertId);
  } catch (err) {
    throw traduzirErroMysql(err, MENSAGENS_ERRO);
  }
}

async function atualizar(empresaId, id, dados) {
  validarId(id);
  validarCampos(dados);
  if ("categoriaId" in dados) {
    await garantirCategoriaDaEmpresa(empresaId, dados.categoriaId);
  }

  // Monta "coluna = ?" só para os campos enviados e permitidos.
  const sets = [];
  const valores = [];
  for (const [campoApi, coluna] of Object.entries(CAMPOS_EDITAVEIS)) {
    if (campoApi in dados) {
      sets.push(`${coluna} = ?`);
      valores.push(campoApi === "titulo" ? dados.titulo.trim() : dados[campoApi]);
    }
  }

  if (sets.length === 0) {
    throw new HttpError(400, "Nenhum campo válido para atualizar");
  }

  try {
    const [resultado] = await pool.query(
      `UPDATE obras SET ${sets.join(", ")} WHERE id = ? AND empresa_id = ?`,
      [...valores, id, empresaId]
    );
    if (resultado.affectedRows === 0) {
      throw new HttpError(404, "Livro não encontrado");
    }
  } catch (err) {
    throw traduzirErroMysql(err, MENSAGENS_ERRO);
  }

  return buscarPorId(empresaId, id);
}

async function remover(empresaId, id) {
  validarId(id);

  try {
    // Se houver empréstimos, a FK com ON DELETE RESTRICT bloqueia o DELETE
    // (erro 1451), que o traduzirErroMysql transforma em 409.
    const [resultado] = await pool.query(
      "DELETE FROM obras WHERE id = ? AND empresa_id = ?",
      [id, empresaId]
    );
    if (resultado.affectedRows === 0) {
      throw new HttpError(404, "Livro não encontrado");
    }
  } catch (err) {
    throw traduzirErroMysql(err, MENSAGENS_ERRO);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
