// Logger: imprime uma linha por requisição, por exemplo:
//   POST /livros 201 - 12 ms
function logger(req, res, next) {
  const inicio = Date.now();

  // O evento "finish" dispara quando a resposta termina de ser enviada,
  // então já sabemos o status final e o tempo total.
  res.on("finish", () => {
    const duracao = Date.now() - inicio;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duracao} ms`);
  });

  next();
}

module.exports = logger;
