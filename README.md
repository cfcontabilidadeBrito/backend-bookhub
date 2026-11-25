# BookHub API (backend)

![Node](https://img.shields.io/badge/Node.js-%E2%89%A5%2020-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)

API de biblioteca usada na aula DevHub. Feita com **Node.js + Express**, **MySQL** (`mysql2`), autenticação com **JWT** e senhas com **bcrypt**.

É **multi-tenant**: cada **empresa** tem seus próprios livros, categorias e empréstimos. Um usuário pode participar de várias empresas, com um papel (`admin` ou `leitor`) diferente em cada uma. O vínculo fica na tabela `usuario_empresa`.

## Estrutura

```text
backend/
├── src/
│   ├── config/db.js               # pool de conexões MySQL (lê o .env)
│   ├── middlewares/
│   │   ├── auth.js                # verifyToken: exige JWT válido
│   │   ├── requireEmpresa.js      # exige empresa escolhida e acesso ativo a ela
│   │   ├── requireRole.js         # restringe por papel (admin / leitor)
│   │   ├── logger.middleware.js   # loga "POST /livros 201 - 12 ms"
│   │   └── errorHandler.js        # tratamento de erros centralizado
│   ├── routes/                    # lê a requisição e escolhe o status HTTP
│   ├── services/                  # regras de negócio e SQL
│   ├── utils/                     # HttpError e tradução de erros do MySQL
│   ├── app.js                     # monta o Express (middlewares + rotas)
│   └── server.js                  # sobe o servidor
├── database/
│   ├── schema.sql                 # cria as tabelas
│   ├── seed.sql                   # dados de exemplo
│   └── run-sql.js                 # executa um .sql usando o .env
├── postman/BookHub-API.postman_collection.json
├── docs/
│   ├── ARQUITETURA.md             # como e por que o projeto é organizado assim
│   ├── EXERCICIOS.md              # exercícios para praticar
│   └── PROMPT-backend-bookhub.md  # o prompt que originou este projeto
├── docker-compose.yml             # MySQL local (alternativa ao EasyPanel)
└── .env.example
```

> Quer entender as decisões de projeto? Leia [docs/ARQUITETURA.md](docs/ARQUITETURA.md). Quer praticar? Vá para [docs/EXERCICIOS.md](docs/EXERCICIOS.md).

## Pré-requisitos

- [Node.js](https://nodejs.org) 20 ou superior (`node -v`). Com nvm: `nvm use`.
- Um MySQL 8: no **Docker** (seção 1A) ou no **EasyPanel** (seção 1B).
- [Postman](https://www.postman.com) para testar as rotas.

Quem faz o quê:

- **routes**: leem `req.params`, `req.query` e `req.body`, chamam o service e escolhem o status HTTP. Não fazem SQL.
- **services**: regras de negócio e acesso ao banco. Não conhecem `req` nem `res`.
- **middlewares**: etapas no meio do caminho, que chamam `next()` ou encerram a resposta.

## 1A. MySQL local com Docker (mais simples)

```bash
docker compose up -d
```

Isso sobe um MySQL 8 em `localhost:3306` com o banco `bookhub`. No `.env`, use:

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=bookhub
DB_PASSWORD=bookhub123
DB_NAME=bookhub
```

Essas credenciais são só para uso local. Para parar: `docker compose down` (os dados ficam guardados; `docker compose down -v` apaga tudo).

## 1B. Criar o MySQL no EasyPanel

1. No EasyPanel, abra (ou crie) o seu **projeto** e clique em **+ Service → MySQL**.
2. Dê um nome ao serviço (ex.: `bookhub-db`). Em **Database** escreva `bookhub`. Defina usuário e senha (ou use os gerados) e clique em **Create**.
3. Abra o serviço criado. Na aba **Credentials** (ou **Overview**) aparecem:
   - **User** e **Password**
   - **Database name**
   - **Internal host** (ex.: `meuprojeto_bookhub-db`) e porta `3306`
4. **Atenção:** o host interno só funciona para apps que rodam *dentro* do EasyPanel. Para conectar do seu computador:
   - na aba **Exposed Ports** (ou **Advanced**), exponha a porta do MySQL (ex.: porta pública `3306` ou outra livre, como `33060`);
   - use como host o **IP ou domínio do servidor** do EasyPanel e como porta a **porta exposta**.
5. Se usar uma porta pública, prefira uma senha forte: o banco fica acessível pela internet.

## 2. Configurar o `.env`

```bash
cp .env.example .env        # no Windows (PowerShell): Copy-Item .env.example .env
```

Abra o `.env` e preencha:

| Variável | O que colocar |
|---|---|
| `PORT` | porta da API (padrão `3000`) |
| `NODE_ENV` | `development` ou `production` |
| `DB_HOST` | IP/domínio do servidor EasyPanel (ou host interno, se a API rodar lá) |
| `DB_PORT` | porta exposta do MySQL |
| `DB_USER` / `DB_PASSWORD` | credenciais do serviço |
| `DB_NAME` | `bookhub` |
| `JWT_SECRET` | um texto longo e aleatório (gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `JWT_EXPIRES_IN` | validade do token (ex.: `1d`, `8h`) |

O `.env` está no `.gitignore`: **nunca** envie credenciais reais para o Git.

## 3. Instalar, criar o banco e rodar

```bash
npm install
npm run db:schema   # cria as tabelas (ATENÇÃO: apaga as tabelas existentes)
npm run db:seed     # insere os dados de exemplo
npm run dev         # sobe com nodemon (reinicia ao salvar)
```

Em produção: `npm start`.

Se faltar alguma variável no `.env`, ou o MySQL não responder, o servidor mostra uma mensagem explicando o problema (sem exibir a senha) e encerra.

### Dados do seed

| Empresa | Livros | Categorias |
|---|---|---|
| 1. Biblioteca Central | 4 (um sem categoria, um com estoque 0) | Romance, Ficção Científica, Tecnologia |
| 2. Biblioteca Escolar | 1 | Infantil |

| E-mail | Senha | Empresas (papel) | No login |
|---|---|---|---|
| admin@bookhub.com | admin123 | 1 (admin), 2 (admin) | escolhe a empresa |
| ana@bookhub.com | leitor123 | 1 (leitor) | entra direto |
| bruno@bookhub.com | leitor123 | 1 (leitor), 2 (leitor) | escolhe a empresa |

## 4. Importar no Postman

1. No Postman, clique em **Import** e escolha `postman/BookHub-API.postman_collection.json`.
2. A collection já tem as variáveis `baseUrl` (`http://localhost:3000`) e `token`.
3. Rode um dos logins em **Auth**. Um script de teste salva o token na variável `token` automaticamente.
4. Se a resposta trouxer `"precisaEscolherEmpresa": true`, rode **Auth → Escolher empresa** com o `empresaId` desejado. O token é trocado sozinho.
5. As rotas protegidas já enviam `Authorization: Bearer {{token}}`.

## 5. Login e empresa (multi-tenant)

```text
POST /auth/login { email, senha }
  ├─ 1 empresa ativa   → token JÁ com a empresa        (precisaEscolherEmpresa: false)
  ├─ várias empresas   → token SEM empresa + "empresas" (precisaEscolherEmpresa: true)
  │                         └─ POST /auth/empresa { empresaId } → token com a empresa
  └─ nenhuma empresa ativa → 403
```

- O token carrega `{ id, empresaId, papel }`.
- Livros, categorias, empréstimos e usuários sempre usam a **empresa do token**. Uma empresa nunca vê os dados de outra: o id de outra empresa responde 404.
- O middleware `requireEmpresa` confere **no banco**, a cada requisição, se o vínculo e a empresa continuam ativos. Assim, inativar um usuário ou uma empresa corta o acesso na hora, mesmo com token ainda válido.
- Para trocar de empresa, chame `POST /auth/empresa` de novo.

## 6. Rotas

Todas as respostas são JSON. Erros sempre no formato `{ "erro": "mensagem" }`.

Legenda de acesso:
- **token**: precisa estar logado.
- **empresa**: precisa ter escolhido a empresa (token com `empresaId`) e ter acesso ativo a ela.
- **admin** / **leitor**: papel do usuário **na empresa atual**.

### Auth

| Método | Caminho | Acesso | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/auth/login` | público | 200 `{ token, usuario, empresa \| empresas, precisaEscolherEmpresa }` | 400 campos faltando, 401 credenciais inválidas, 403 sem empresa ativa |
| POST | `/auth/empresa` | token | 200 `{ token, empresa }`; body `{ "empresaId": 1 }` | 400, 401, 403 sem acesso |
| GET | `/auth/me` | token | 200 usuário + `empresaAtual` + `empresas` | 401 |

### Empresas

Empresas não são apagadas, só inativadas, para preservar o histórico.

| Método | Caminho | Acesso | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/empresas` | token | 200 empresas do usuário (inclusive inativas) | 401 |
| GET | `/empresas/:id` | token (participa) | 200 | 401, 404 |
| POST | `/empresas` | token | 201, e quem cria vira admin; body `{ "nome", "cnpj" }` | 400, 401, 409 CNPJ repetido |
| PATCH | `/empresas/:id` | admin da empresa | 200 | 400, 401, 403, 404, 409 |
| PATCH | `/empresas/:id/inativar` | admin da empresa | 200, e ninguém mais acessa a empresa | 401, 403, 404 |
| PATCH | `/empresas/:id/ativar` | admin da empresa | 200 | 401, 403, 404 |

### Usuários (da empresa atual)

"Inativar usuário" desativa o **vínculo com a empresa atual**: ele perde o acesso a ela, mas continua nas outras. O admin não pode alterar nem inativar o próprio vínculo, para não deixar a empresa sem admin.

| Método | Caminho | Acesso | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/usuarios?ativo=true\|false` | empresa + admin | 200 lista | 401, 403 |
| GET | `/usuarios/:id` | empresa + admin | 200 | 401, 403, 404 |
| POST | `/usuarios` | empresa + admin | 201; body `{ "nome", "email", "senha", "papel" }`; e-mail existente só cria o vínculo | 400, 401, 403, 409 já vinculado |
| PATCH | `/usuarios/:id` | empresa + admin | 200; body `{ "papel": "admin" \| "leitor" }` | 400, 401, 403, 404 |
| PATCH | `/usuarios/:id/inativar` | empresa + admin | 200 | 400, 401, 403, 404 |
| PATCH | `/usuarios/:id/ativar` | empresa + admin | 200 | 400, 401, 403, 404 |

### Livros (tabela `obras`)

| Método | Caminho | Acesso | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/livros` | empresa | 200 lista (filtros `?categoriaId=` e `?autor=`) | 400, 401, 403 |
| GET | `/livros/:id` | empresa | 200 | 401, 403, 404 |
| POST | `/livros` | empresa + admin | 201 livro criado | 400, 401, 403 |
| PATCH | `/livros/:id` | empresa + admin | 200 livro atualizado | 400, 401, 403, 404 |
| DELETE | `/livros/:id` | empresa + admin | 204 | 401, 403, 404, 409 (tem empréstimos) |

Body de criação: `{ "titulo": "...", "autor": "...", "categoriaId": 1, "estoque": 2, "idExterno": "..." }`. Só `titulo` é obrigatório, e a categoria precisa ser da mesma empresa.

### Categorias

| Método | Caminho | Acesso | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/categorias` | empresa | 200 lista | 401, 403 |
| GET | `/categorias/:id` | empresa | 200 | 401, 403, 404 |
| POST | `/categorias` | empresa + admin | 201 | 400, 401, 403, 409 (nome repetido na empresa) |
| PATCH | `/categorias/:id` | empresa + admin | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/categorias/:id` | empresa + admin | 204 (obras ficam sem categoria) | 401, 403, 404 |

### Empréstimos

| Método | Caminho | Acesso | Regra |
|---|---|---|---|
| GET | `/emprestimos` | empresa | admin vê todos da empresa; leitor vê só os seus; filtro `?status=ativo\|devolvido\|atrasado` |
| POST | `/emprestimos` | empresa + leitor | body `{ "obraId": 1 }`; 201; 404 livro inexistente na empresa; 409 sem estoque; baixa 1 no estoque |
| PATCH | `/emprestimos/:id/devolver` | empresa (dono ou admin) | status `devolvido`, `devolvido_em = NOW()`, estoque + 1; 403 se não for o dono; 409 se já devolvido |

O empréstimo baixa o estoque e registra o empréstimo na **mesma transação**: se uma das etapas falhar, nada é gravado.

## Caminho de uma requisição

```text
Postman
  │  POST /livros  + Authorization: Bearer <token>  + body JSON
  ▼
Express (app.js)
  │  express.json()        → transforma o corpo em req.body
  │  logger                → começa a cronometrar
  ▼
Rota (routes/livros/livros.routes.js)
  │  verifyToken           → valida o JWT e preenche req.usuario { id, empresaId, papel }
  │  requireEmpresa        → 403 se não escolheu empresa ou perdeu o acesso
  │  requireRole("admin")  → 403 se não for admin NESTA empresa
  │  handler               → lê req.body e chama o service
  ▼
Service (services/livros.service.js)
  │  valida as regras e executa SQL parametrizado (?) sempre com empresa_id
  ▼
MySQL
  │  INSERT INTO obras (empresa_id, ...) ...
  ▼
Resposta
     201 + JSON do livro   (ou next(err) → errorHandler → { "erro": "..." })
     logger imprime: POST /livros 201 - 12 ms
```

## Para ir além

- [docs/ARQUITETURA.md](docs/ARQUITETURA.md): camadas, multi-tenant, autenticação, modelo de dados.
- [docs/EXERCICIOS.md](docs/EXERCICIOS.md): exercícios por nível, de rota simples a testes automatizados.

## Contribuindo

Encontrou um erro ou tem uma sugestão? Abra uma *issue*. Para sugerir mudanças, faça um *fork*, crie uma branch e abra um *pull request*.

## Licença

[MIT](LICENSE).
