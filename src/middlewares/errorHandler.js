// Tratamento de erros centralizado.
// Qualquer rota que chame next(err) cai aqui. O Express reconhece este
// middleware como "de erro" porque ele tem QUATRO parâmetros.
const HttpError = require("../utils/httpError");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // JSON malformado no body (lançado pelo express.json()).
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido no corpo da requisição" });
  }

  // Erro "esperado", lançado de propósito por um service (404, 409...).
  if (err instanceof HttpError) {
    return res.status(err.status).json({ erro: err.message });
  }

  // Erro inesperado: loga tudo no console para quem mantém a API...
  if (process.env.NODE_ENV === "production") {
    console.error(`[erro] ${err.message}`);
  } else {
    console.error(err);
  }

  // ...mas o cliente recebe só uma mensagem genérica (nada de stack).
  return res.status(500).json({ erro: "Erro interno do servidor" });
}

module.exports = errorHandler;
