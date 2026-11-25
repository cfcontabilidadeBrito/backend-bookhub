// Regras de negócio e acesso ao banco para empresas (os tenants).
// Empresas com dados são inativadas (ativo = 0); só empresas sem
// categorias/obras/empréstimos podem ser apagadas de vez (ver remover).
const { pool } = require("../config/db");
const HttpError = require("../utils/httpError");
const traduzirErroMysql = require("../utils/mysqlErrors");

const MENSAGENS_ERRO = {
  duplicado: "Já existe uma empresa com esse CNPJ",
  check: "O nome da empresa é obrigatório",
  emUso: "A empresa tem categorias, livros ou empréstimos e não pode ser apagada. Use a inativação.",
};

function validarId(id) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "id inválido");
  }
}

function validarNome(nome) {
  if (typeof nome !== "string" || nome.trim() === "") {
    throw new HttpError(400, "O nome da empresa é obrigatório");
  }
  return nome.trim();
}

// MySQL devolve BOOLEAN como 0/1; na API devolvemos true/false.
function formatarEmpresa(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    cnpj: linha.cnpj,
    ativo: Boolean(linha.ativo),
    papel: linha.papel,
    vinculoAtivo: Boolean(linha.vinculo_ativo),
  };
}

const SELECT_EMPRESAS_DO_USUARIO = `
  SELECT e.id, e.nome, e.cnpj, e.ativo, ue.papel, ue.ativo AS vinculo_ativo
  FROM empresas e
  JOIN usuario_empresa ue ON ue.empresa_id = e.id
  WHERE ue.usuario_id = ?
`;

// Vínculo que dá acesso: vínculo ativo E empresa ativa.
// Usado pelo login, pela troca de empresa e pelo middleware requireEmpresa.
async function buscarVinculoAtivo(usuarioId, empresaId) {
  const [linhas] = await pool.query(
    `SELECT ue.papel
     FROM usuario_empresa ue
     JOIN empresas e ON e.id = ue.empresa_id
     WHERE ue.usuario_id = ? AND ue.empresa_id = ? AND ue.ativo = TRUE AND e.ativo = TRUE`,
    [usuarioId, empresaId]
  );
  return linhas[0] || null;
}

// Empresas em que o usuário consegue entrar agora (usado no login).
async function listarAcessiveis(usuarioId) {
  const [linhas] = await pool.query(
    `${SELECT_EMPRESAS_DO_USUARIO} AND ue.ativo = TRUE AND e.ativo = TRUE ORDER BY e.nome`,
    [usuarioId]
  );
  return linhas.map(formatarEmpresa);
}

// Todas as empresas do usuário, inclusive inativas (para o admin reativar).
async function listarDoUsuario(usuarioId) {
  const [linhas] = await pool.query(`${SELECT_EMPRESAS_DO_USUARIO} ORDER BY e.nome`, [usuarioId]);
  return linhas.map(formatarEmpresa);
}

async function buscarPorId(id, usuarioId) {
  validarId(id);
  const [linhas] = await pool.query(`${SELECT_EMPRESAS_DO_USUARIO} AND e.id = ?`, [usuarioId, id]);

  // Se o usuário não participa da empresa, respondemos 404 (e não 403)
  // para não revelar que a empresa existe.
  if (linhas.length === 0) {
    throw new HttpError(404, "Empresa não encontrada");
  }
  return formatarEmpresa(linhas[0]);
}

// Só o admin da empresa pode alterá-la. Aqui NÃO exigimos empresa ativa,
// senão ninguém conseguiria reativar uma empresa inativada.
async function garantirAdmin(empresaId, usuarioId) {
  const empresa = await buscarPorId(empresaId, usuarioId);
  if (empresa.papel !== "admin" || !empresa.vinculoAtivo) {
    throw new HttpError(403, "Só o admin da empresa pode fazer isso");
  }
}

// Quem cria a empresa vira admin dela. Empresa + vínculo na MESMA transação.
async function criar(usuarioId, { nome, cnpj = null }) {
  const nomeLimpo = validarNome(nome);
  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    const [resultado] = await conexao.query("INSERT INTO empresas (nome, cnpj) VALUES (?, ?)", [nomeLimpo, cnpj]);
    await conexao.query(
      "INSERT INTO usuario_empresa (usuario_id, empresa_id, papel) VALUES (?, ?, 'admin')",
      [usuarioId, resultado.insertId]
    );

    await conexao.commit();
    return buscarPorId(resultado.insertId, usuarioId);
  } catch (err) {
    await conexao.rollback();
    throw traduzirErroMysql(err, MENSAGENS_ERRO);
  } finally {
    conexao.release();
  }
}

async function atualizar(id, usuarioId, dados) {
  await garantirAdmin(id, usuarioId);

  const sets = [];
  const valores = [];
  if ("nome" in dados) {
    sets.push("nome = ?");
    valores.push(validarNome(dados.nome));
  }
  if ("cnpj" in dados) {
    sets.push("cnpj = ?");
    valores.push(dados.cnpj || null);
  }
  if (sets.length === 0) {
    throw new HttpError(400, "Nenhum campo válido para atualizar (use nome e/ou cnpj)");
  }

  try {
    await pool.query(`UPDATE empresas SET ${sets.join(", ")} WHERE id = ?`, [...valores, id]);
  } catch (err) {
    throw traduzirErroMysql(err, MENSAGENS_ERRO);
  }
  return buscarPorId(id, usuarioId);
}

// Inativar (ativo = false) ou reativar (ativo = true) a empresa.
// Inativada, ninguém consegue mais entrar nela (ver buscarVinculoAtivo).
async function alterarStatus(id, usuarioId, ativo) {
  await garantirAdmin(id, usuarioId);
  await pool.query("UPDATE empresas SET ativo = ? WHERE id = ?", [ativo, id]);
  return buscarPorId(id, usuarioId);
}

// Apaga a empresa de vez (admin da empresa). Os vínculos (usuario_empresa)
// somem junto (ON DELETE CASCADE). Categorias, obras e empréstimos usam
// ON DELETE RESTRICT: se a empresa tiver algum deles, o banco recusa e
// respondemos 409 — nesse caso o caminho é inativar.
async function remover(id, usuarioId) {
  await garantirAdmin(id, usuarioId);
  try {
    await pool.query("DELETE FROM empresas WHERE id = ?", [id]);
  } catch (err) {
    throw traduzirErroMysql(err, MENSAGENS_ERRO);
  }
}

module.exports = {
  buscarVinculoAtivo,
  listarAcessiveis,
  listarDoUsuario,
  buscarPorId,
  criar,
  atualizar,
  alterarStatus,
  remover,
};
