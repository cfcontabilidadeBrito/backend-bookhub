// Ponto de entrada: só confere a configuração, testa o banco e sobe o servidor.
const { validarEnv, testarConexao } = require("./config/db");
const app = require("./app");

const PORT = Number(process.env.PORT) || 3000;

async function iniciar() {
  validarEnv(); // encerra com mensagem clara se faltar algo no .env
  await testarConexao(); // encerra com mensagem clara se o MySQL não responder

  app.listen(PORT, () => {
    console.log(`[server] BookHub API rodando em http://localhost:${PORT}`);
  });
}

iniciar();
