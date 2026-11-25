// Executa um arquivo .sql no banco configurado no .env.
// Uso: node database/run-sql.js database/schema.sql
//      (ou pelos atalhos: npm run db:schema / npm run db:seed)
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const arquivo = process.argv[2];
  if (!arquivo) {
    console.error("Informe o arquivo .sql. Ex.: node database/run-sql.js database/schema.sql");
    process.exit(1);
  }

  const faltando = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter((nome) => !process.env[nome]);
  if (faltando.length > 0) {
    console.error(`[db] Variáveis faltando no .env: ${faltando.join(", ")}`);
    console.error("Copie .env.example para .env e preencha os valores (veja o README.md).");
    process.exit(1);
  }

  const caminho = path.resolve(arquivo);
  const sql = fs.readFileSync(caminho, "utf8");

  let conexao;
  try {
    conexao = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // Permite vários comandos SQL separados por ";" numa só chamada.
      // Usamos SÓ neste script, com arquivos nossos; na API fica desligado
      // porque aumenta o estrago de uma eventual SQL injection.
      multipleStatements: true,
    });

    await conexao.query(sql);
    console.log(`[db] ${path.basename(caminho)} executado com sucesso em ${process.env.DB_NAME}.`);
  } catch (err) {
    console.error(`[db] Erro ao executar ${path.basename(caminho)}:`);
    console.error(`  host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}  usuário: ${process.env.DB_USER}  banco: ${process.env.DB_NAME}`);
    console.error(`  motivo: ${err.code || ""} ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (conexao) await conexao.end();
  }
}

main();
