# Prompt para o Claude Code: backend do BookHub

Copie tudo abaixo da linha e cole no Claude Code, dentro da pasta do repositório.

---

Você vai criar a estrutura do backend do **BookHub**, uma API de biblioteca usada em aula (DevHub). O código precisa ser didático: simples de ler, com cada responsabilidade em seu lugar e comentários curtos explicando o "porquê" nos pontos-chave. Não use TypeScript nem frameworks além dos listados.

## Antes de escrever código

1. Leia a estrutura atual do repositório. Se já existir uma pasta `backend/`, um `package.json` ou o middleware `src/middlewares/auth.js`, **preserve** o que existe e me diga o que vai mudar antes de alterar.
2. Me mostre a árvore de pastas que pretende criar e espere minha confirmação.

## Padrão obrigatório do projeto

O backend atual usa **CommonJS** e este padrão nos arquivos de rota, que deve ser mantido exatamente:

```javascript
const express = require("express");
const router = express.Router();
const verifyToken = require("../../middlewares/auth");
```

Isso implica que:
- As rotas ficam em subpastas por recurso, dois níveis abaixo de `src/` (ex.: `src/routes/livros/livros.routes.js`), para que `../../middlewares/auth` resolva para `src/middlewares/auth.js`.
- `src/middlewares/auth.js` exporta a função diretamente: `module.exports = verifyToken;`
- Nada de `import/export` (ESM). Use `require` e `module.exports` em tudo.

## Stack

- Node.js + Express
- `mysql2` (com `mysql2/promise` e pool de conexões)
- `dotenv` para variáveis de ambiente
- `jsonwebtoken` para o token usado pelo `verifyToken`
- `bcryptjs` para hash de senha
- `nodemon` como dependência de desenvolvimento

## Estrutura esperada

```text
backend/
├── src/
│   ├── config/
│   │   └── db.js                  # pool mysql2 lendo o .env
│   ├── middlewares/
│   │   ├── auth.js                # verifyToken (JWT)
│   │   ├── requireRole.js         # restringe por papel: admin ou leitor
│   │   ├── logger.middleware.js   # loga método, url, status e tempo
│   │   └── errorHandler.js        # tratamento de erros centralizado
│   ├── routes/
│   │   ├── index.js               # registra todas as rotas
│   │   ├── auth/auth.routes.js
│   │   ├── livros/livros.routes.js
│   │   ├── categorias/categorias.routes.js
│   │   └── emprestimos/emprestimos.routes.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── livros.service.js
│   │   ├── categorias.service.js
│   │   └── emprestimos.service.js
│   ├── app.js                     # cria o app, middlewares e rotas
│   └── server.js                  # só sobe o servidor
├── database/
│   ├── schema.sql                 # CREATE TABLE na ordem das dependências
│   └── seed.sql                   # dados de exemplo
├── postman/
│   └── BookHub-API.postman_collection.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Responsabilidades, que devem ficar claras no código:
- **routes**: recebem a requisição, leem `req.params`, `req.query` e `req.body`, chamam o service e escolhem o status HTTP. Não fazem SQL.
- **services**: regras de negócio e acesso ao banco. Não conhecem `req` nem `res`.
- **middlewares**: etapas intermediárias que chamam `next()` ou encerram a resposta.
- **app.js**: registra, nesta ordem, `express.json()`, o logger, as rotas, a rota 404 e o `errorHandler`.

## Variáveis de ambiente

Crie um `.env.example` (versionado) e garanta que `.env` esteja no `.gitignore`. O banco é um MySQL hospedado no EasyPanel, então inclua:

```env
# Servidor
PORT=3000
NODE_ENV=development

# MySQL (EasyPanel): preencha com as credenciais do serviço
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=bookhub

# Autenticação
JWT_SECRET=
JWT_EXPIRES_IN=1d
```

Em `src/config/db.js`:
- Leia essas variáveis com `dotenv` e crie um pool com `mysql2/promise`.
- Ao subir, teste a conexão e, em caso de falha, mostre uma mensagem clara (host, porta, usuário e banco, **nunca a senha**) e encerre o processo.

## Banco de dados (MySQL 8)

`database/schema.sql` deve criar as tabelas em ordem de dependência, com `ENGINE=InnoDB`, `INT AUTO_INCREMENT` nas chaves e **chaves estrangeiras declaradas com `CONSTRAINT nome FOREIGN KEY (...) REFERENCES ...`** (não use `REFERENCES` inline na coluna, que o MySQL ignora):

1. `usuarios` (id, nome, email UNIQUE, senha_hash, papel ENUM('admin','leitor'), criado_em)
2. `categorias` (id, nome UNIQUE)
3. `sessoes` (usuario_id → usuarios, ON DELETE CASCADE)
4. `obras` (id, titulo NOT NULL com CHECK para não vazio, autor, id_externo UNIQUE opcional, categoria_id → categorias ON DELETE SET NULL, estoque INT CHECK >= 0)
5. `emprestimos` (usuario_id e obra_id com ON DELETE RESTRICT, status ENUM('ativo','devolvido','atrasado'), emprestado_em, devolvido_em)
6. `avaliacoes` (nota 1 a 5, UNIQUE usuario_id + obra_id, CASCADE)
7. `progresso` (status ENUM('quero_ler','lendo','lido'), UNIQUE usuario_id + obra_id, CASCADE)

`database/seed.sql`: um admin, dois leitores (senhas com hash bcrypt e a senha em texto indicada num comentário), três categorias e quatro obras, sendo uma sem categoria.

Adicione scripts no `package.json`:
- `npm run dev`: nodemon
- `npm start`: produção
- `npm run db:schema` e `npm run db:seed`: um script Node em `database/run-sql.js` que executa os arquivos `.sql` usando o `.env`

## Rotas

Todas as respostas em JSON. Erros no formato `{ "erro": "mensagem" }`.

**Auth** (`/auth`)
| Método | Caminho | Acesso | Sucesso | Erros |
|---|---|---|---|---|
| POST | /auth/login | público | 200 com `{ token, usuario }` | 400 campos faltando, 401 credenciais inválidas |
| GET | /auth/me | verifyToken | 200 | 401 |

**Livros** (`/livros`, tabela `obras`)
| Método | Caminho | Acesso | Sucesso | Erros |
|---|---|---|---|---|
| GET | /livros | público | 200 lista, aceita `?categoriaId=` e `?autor=` | |
| GET | /livros/:id | público | 200 | 404 |
| POST | /livros | admin | 201 com o livro criado | 400 título vazio, 401, 403 |
| PATCH | /livros/:id | admin | 200 | 400, 401, 403, 404 |
| DELETE | /livros/:id | admin | 204 | 401, 403, 404, 409 se tiver empréstimos |

**Categorias** (`/categorias`): GET público; POST, PATCH e DELETE só admin. Ao apagar uma categoria em uso, as obras ficam com `categoria_id` NULL.

**Empréstimos** (`/emprestimos`)
| Método | Caminho | Acesso | Regra |
|---|---|---|---|
| GET | /emprestimos | verifyToken | admin vê todos; leitor vê só os seus; aceita `?status=` |
| POST | /emprestimos | leitor | body `{ obraId }`; 409 se estoque for 0; baixa 1 no estoque |
| PATCH | /emprestimos/:id/devolver | verifyToken | status = 'devolvido', devolvido_em = NOW(), estoque + 1 |

Regras de negócio que precisam estar nos services:
- Criar empréstimo e baixar o estoque na **mesma transação**. Use `UPDATE obras SET estoque = estoque - 1 WHERE id = ? AND estoque > 0` e verifique `affectedRows`.
- Todo UPDATE e DELETE filtra pelo `id` com `WHERE`.
- Use sempre **queries parametrizadas** (`?`), nunca concatenação de strings.
- Traduza o erro MySQL `ER_NO_REFERENCED_ROW_2` (1452) para 400 com mensagem amigável, e `ER_ROW_IS_REFERENCED_2` (1451) para 409.

## Middlewares

- **auth.js (verifyToken)**: lê `Authorization: Bearer <token>`, valida com `JWT_SECRET`, coloca `{ id, papel }` em `req.usuario` e chama `next()`. Sem token ou token inválido: 401.
- **requireRole.js**: fábrica `requireRole("admin")` que devolve 403 se `req.usuario.papel` não bater. Uso na rota: `router.post("/", verifyToken, requireRole("admin"), ...)`.
- **logger.middleware.js**: imprime `POST /livros 201 - 12 ms` ao final de cada resposta.
- **errorHandler.js**: captura erros repassados com `next(err)`, loga o erro completo no console e responde 500 com `{ "erro": "Erro interno do servidor" }`, sem expor stack em produção.

## Postman

Gere `postman/BookHub-API.postman_collection.json` com:
- uma variável `baseUrl` = `http://localhost:3000` e uma variável `token`;
- uma pasta por recurso, com nomes claros ("Listar livros", "Criar livro"…);
- na requisição de login, um script de teste que salva o token retornado na variável `token`;
- nas rotas protegidas, o header `Authorization: Bearer {{token}}`.

## README.md

Explique em português:
1. Como criar o serviço MySQL no EasyPanel e onde encontrar host, porta, usuário e senha.
2. Como copiar `.env.example` para `.env` e preencher.
3. `npm install`, `npm run db:schema`, `npm run db:seed`, `npm run dev`.
4. Como importar a Collection no Postman.
5. A tabela de rotas e o caminho de uma requisição: Postman → Express → middlewares → rota → service → MySQL → resposta.

## Para terminar

- Rode `npm install` e confirme que o servidor sobe sem `.env` preenchido mostrando a mensagem clara de configuração faltando, e não um stack trace.
- Não invente credenciais e não crie o arquivo `.env` com valores reais.
- Ao final, me dê um resumo do que foi criado e a lista exata das rotas implementadas, para eu atualizar os slides da aula.
