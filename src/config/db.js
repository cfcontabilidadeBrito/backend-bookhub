// Configuração do banco de dados (MySQL).
// Lê as variáveis do arquivo .env e cria um POOL de conexões:
// em vez de abrir uma conexão nova a cada requisição, o pool reaproveita
// um pequeno conjunto de conexões já abertas (mais rápido e mais seguro).
require("dotenv").config({ quiet: true });
const mysql = require("mysql2/promise");

// Variáveis sem as quais a API não consegue funcionar.
const VARIAVEIS_OBRIGATORIAS = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET"];

// Confere o .env ANTES de tentar conectar, para dar uma mensagem clara
// em vez de um stack trace confuso.
function validarEnv() {
  const faltando = VARIAVEIS_OBRIGATORIAS.filter((nome) => !process.env[nome]);

  if (faltando.length > 0) {
    console.error("\n[config] Configuração incompleta. Variáveis faltando no .env:");
    faltando.forEach((nome) => console.error(`  - ${nome}`));
    console.error("\nCopie o arquivo .env.example para .env e preencha os valores.");
    console.error("Veja o passo a passo no README.md.\n");
    process.exit(1);
  }
}

// createPool não conecta ainda: a conexão só é aberta na primeira query.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Faz um teste simples ao subir o servidor.
// Se falhar, mostra para onde tentou conectar (NUNCA a senha) e encerra.
async function testarConexao() {
  try {
    const conexao = await pool.getConnection();
    await conexao.ping();
    conexao.release();
    console.log(`[db] Conectado ao MySQL em ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}`);
  } catch (err) {
    console.error("\n[db] Não foi possível conectar ao MySQL.");
    console.error(`  host:    ${process.env.DB_HOST}`);
    console.error(`  porta:   ${process.env.DB_PORT || 3306}`);
    console.error(`  usuário: ${process.env.DB_USER}`);
    console.error(`  banco:   ${process.env.DB_NAME}`);
    console.error(`  motivo:  ${err.code || ""} ${err.message}`);
    console.error("\nConfira as credenciais no .env e se a porta do MySQL está exposta no EasyPanel.\n");
    process.exit(1);
  }
}

module.exports = { pool, validarEnv, testarConexao };
