// Erro com status HTTP.
// Os services lançam HttpError quando uma regra de negócio falha
// (ex.: livro não encontrado = 404). Assim o service não precisa conhecer
// "res": quem traduz o erro em resposta é o errorHandler.
class HttpError extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

module.exports = HttpError;
