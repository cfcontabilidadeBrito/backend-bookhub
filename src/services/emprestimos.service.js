// Regras de negócio e acesso ao banco para empréstimos.
// Aqui aparece o conceito mais importante da aula: TRANSAÇÃO.
// Emprestar = baixar o estoque + registrar o empréstimo. Ou as duas coisas
// acontecem, ou nenhuma acontece.
// Multi-tenant: toda query filtra por empresa_id (a empresa do token).
const { pool } = require("../config/db");
const HttpError = require("../utils/httpError");
const traduzirErroMysql = require("../utils/mysqlErrors");

const STATUS_VALIDOS = ["ativo", "devolvido", "atrasado"];

const SELECT_EMPRESTIMOS = `
  SELECT e.id, e.usuario_id AS usuarioId, u.nome AS usuario,
         e.obra_id AS obraId, o.titulo AS livro,
         e.status, e.emprestado_em AS emprestadoEm, e.devolvido_em AS devolvidoEm
  FROM emprestimos e
  JOIN usuarios u ON u.id = e.usuario_id
  JOIN obras o ON o.id = e.obra_id
  WHERE e.empresa_id = ?
`;

// "usuario" é o req.usuario: { id, empresaId, papel }.
async function listar(usuario, { status }) {
  let sql = SELECT_EMPRESTIMOS;
  const valores = [usuario.empresaId];

  // Admin vê todos os da empresa; leitor vê só os próprios.
  if (usuario.papel !== "admin") {
    sql += " AND e.usuario_id = ?";
    valores.push(usuario.id);
  }

  if (status) {
    if (!STATUS_VALIDOS.includes(status)) {
      throw new HttpError(400, `status inválido. Use: ${STATUS_VALIDOS.join(", ")}`);
    }
    sql += " AND e.status = ?";
    valores.push(status);
  }
  sql += " ORDER BY e.emprestado_em DESC";

  const [linhas] = await pool.query(sql, valores);
  return linhas;
}

async function buscarPorId(empresaId, id) {
  const [linhas] = await pool.query(`${SELECT_EMPRESTIMOS} AND e.id = ?`, [empresaId, id]);
  return linhas[0];
}

async function criar(usuario, { obraId }) {
  if (!Number.isInteger(obraId) || obraId <= 0) {
    throw new HttpError(400, "Informe obraId (número inteiro)");
  }

  // Para usar transação, pegamos UMA conexão do pool: todas as queries
  // da transação precisam passar pela mesma conexão.
  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    // Baixa o estoque só se ainda houver exemplar (estoque > 0) e se o livro
    // for da empresa atual. Fazer a checagem no próprio UPDATE evita que
    // dois leitores peguem o último exemplar ao mesmo tempo.
    const [baixa] = await conexao.query(
      "UPDATE obras SET estoque = estoque - 1 WHERE id = ? AND empresa_id = ? AND estoque > 0",
      [obraId, usuario.empresaId]
    );

    if (baixa.affectedRows === 0) {
      // Nenhuma linha alterada: ou o livro não existe (nesta empresa), ou está sem estoque.
      const [obras] = await conexao.query(
        "SELECT id FROM obras WHERE id = ? AND empresa_id = ?",
        [obraId, usuario.empresaId]
      );
      if (obras.length === 0) {
        throw new HttpError(404, "Livro não encontrado");
      }
      throw new HttpError(409, "Livro sem exemplares disponíveis");
    }

    const [resultado] = await conexao.query(
      "INSERT INTO emprestimos (empresa_id, usuario_id, obra_id, status) VALUES (?, ?, ?, 'ativo')",
      [usuario.empresaId, usuario.id, obraId]
    );

    // Tudo certo: grava as duas alterações de uma vez.
    await conexao.commit();
    return buscarPorId(usuario.empresaId, resultado.insertId);
  } catch (err) {
    // Deu erro no meio: desfaz tudo (o estoque volta ao valor anterior).
    await conexao.rollback();
    throw traduzirErroMysql(err, { referenciaInexistente: "Usuário ou livro não existe" });
  } finally {
    // Sempre devolve a conexão ao pool, com sucesso ou com erro.
    conexao.release();
  }
}

async function devolver(id, usuario) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "id inválido");
  }

  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    // FOR UPDATE trava a linha até o fim da transação, evitando
    // que a mesma devolução seja processada duas vezes em paralelo.
    const [linhas] = await conexao.query(
      "SELECT id, usuario_id, obra_id, status FROM emprestimos WHERE id = ? AND empresa_id = ? FOR UPDATE",
      [id, usuario.empresaId]
    );
    const emprestimo = linhas[0];

    if (!emprestimo) {
      throw new HttpError(404, "Empréstimo não encontrado");
    }
    if (usuario.papel !== "admin" && emprestimo.usuario_id !== usuario.id) {
      throw new HttpError(403, "Você só pode devolver os seus próprios empréstimos");
    }
    if (emprestimo.status === "devolvido") {
      throw new HttpError(409, "Este empréstimo já foi devolvido");
    }

    await conexao.query(
      "UPDATE emprestimos SET status = 'devolvido', devolvido_em = NOW() WHERE id = ? AND empresa_id = ?",
      [id, usuario.empresaId]
    );
    await conexao.query(
      "UPDATE obras SET estoque = estoque + 1 WHERE id = ? AND empresa_id = ?",
      [emprestimo.obra_id, usuario.empresaId]
    );

    await conexao.commit();
    return buscarPorId(usuario.empresaId, id);
  } catch (err) {
    await conexao.rollback();
    throw err;
  } finally {
    conexao.release();
  }
}

module.exports = { listar, criar, devolver };
