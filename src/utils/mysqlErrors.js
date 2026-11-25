// Traduz erros conhecidos do MySQL para erros HTTP com mensagem amigável.
// Uso nos services: catch (err) { throw traduzirErroMysql(err, { ...mensagens }); }
const HttpError = require("./httpError");

function traduzirErroMysql(err, mensagens = {}) {
  switch (err.code) {
    // 1452: a chave estrangeira aponta para um registro que não existe
    // (ex.: criar livro com categoriaId inexistente).
    case "ER_NO_REFERENCED_ROW_2":
      return new HttpError(400, mensagens.referenciaInexistente || "Registro relacionado não existe");

    // 1451: tentativa de apagar um registro que ainda é usado por outro
    // (ex.: apagar livro que tem empréstimos).
    case "ER_ROW_IS_REFERENCED_2":
      return new HttpError(409, mensagens.emUso || "Registro em uso por outros dados");

    // 1062: violação de UNIQUE (ex.: categoria com nome repetido).
    case "ER_DUP_ENTRY":
      return new HttpError(409, mensagens.duplicado || "Registro duplicado");

    // 3819: violação de CHECK (ex.: título vazio, estoque negativo).
    case "ER_CHECK_CONSTRAINT_VIOLATED":
      return new HttpError(400, mensagens.check || "Dados inválidos");

    // Erro desconhecido: devolve como está; o errorHandler responde 500.
    default:
      return err;
  }
}

module.exports = traduzirErroMysql;
