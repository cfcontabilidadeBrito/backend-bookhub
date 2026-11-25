// Monta a aplicação Express. Não sobe o servidor (isso é do server.js),
// o que facilita testar o app separadamente.
const express = require("express");
const logger = require("./middlewares/logger.middleware");
const errorHandler = require("./middlewares/errorHandler");
const routes = require("./routes");

const app = express();

// A ORDEM dos app.use importa: a requisição passa por eles de cima para baixo.

// 1. Converte o corpo JSON da requisição em objeto (req.body).
app.use(express.json());

// 2. Loga método, url, status e tempo de cada requisição.
app.use(logger);

// 3. Rotas da API.
app.use(routes);

// 4. Nenhuma rota respondeu: 404.
app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

// 5. Tratamento de erros: sempre por último.
app.use(errorHandler);

module.exports = app;
