# Arquitetura do BookHub

Este documento explica **como o projeto está organizado e por quê**. Leia junto com o código: abra cada arquivo citado.

## 1. Camadas

```text
Requisição HTTP
   │
   ▼
routes/        lê req (params, query, body), chama o service, escolhe o status HTTP
   │
   ▼
services/      regras de negócio + SQL. Não conhecem req nem res
   │
   ▼
config/db.js   pool de conexões MySQL
```

| Camada | Pode | Não pode |
|---|---|---|
| `routes/` | ler `req`, chamar services, responder com `res` | escrever SQL |
| `services/` | validar regras, executar SQL, lançar `HttpError` | usar `req`/`res` |
| `middlewares/` | validar token, empresa e papel; chamar `next()` ou responder | conter regra de negócio do recurso |

**Por que separar?** Cada pedaço muda por um motivo diferente. Trocar o formato da resposta mexe em `routes/`; mudar uma regra de estoque mexe em `services/`. Quem lê o código sabe onde procurar.

## 2. Middlewares (a ordem importa)

Em `src/app.js`, o Express executa de cima para baixo:

1. `express.json()`: transforma o corpo em `req.body`.
2. `logger`: imprime `POST /livros 201 - 12 ms`.
3. `routes`: as rotas da API.
4. Handler de 404: nenhuma rota respondeu.
5. `errorHandler`: **sempre por último**; transforma erros em `{ "erro": "..." }`.

Dentro de uma rota protegida, a cadeia típica é:

```js
router.post("/", verifyToken, requireEmpresa, requireRole("admin"), handler);
```

- `verifyToken` valida o JWT e preenche `req.usuario = { id, empresaId, papel }`.
- `requireEmpresa` confere **no banco** se o vínculo usuário-empresa e a empresa continuam ativos, e atualiza o papel.
- `requireRole("admin")` barra quem não tem o papel exigido **na empresa atual**.

## 3. Multi-tenant

Cada **empresa** é um tenant: tem seus próprios livros, categorias e empréstimos.

Regra de ouro: **todo SQL de dados de negócio filtra por `empresa_id`**, e o `empresa_id` vem do **token**, nunca do corpo da requisição. Assim, uma empresa não enxerga dados de outra: o id alheio responde 404, como se não existisse.

Exemplo do padrão (simplificado):

```js
const [linhas] = await pool.query(
  "SELECT * FROM obras WHERE id = ? AND empresa_id = ?",
  [id, empresaId]
);
```

O vínculo entre usuário e empresa fica em `usuario_empresa`, com o papel (`admin`/`leitor`) e a flag `ativo`. Um mesmo usuário pode ser admin numa empresa e leitor em outra.

## 4. Autenticação

```text
POST /auth/login
  ├─ 1 empresa ativa   → token já com empresaId
  ├─ várias empresas   → token sem empresaId + lista; depois POST /auth/empresa
  └─ nenhuma           → 403
```

- Senhas são guardadas com `bcryptjs` (`senha_hash`), nunca em texto.
- O JWT é assinado com `JWT_SECRET` e expira em `JWT_EXPIRES_IN`.
- Como o token vale por horas, `requireEmpresa` reconsulta o banco a cada requisição: inativar um usuário corta o acesso imediatamente.

## 5. Modelo de dados

```text
empresas 1───N usuario_empresa N───1 usuarios
   │                                     │
   ├──N categorias                       ├──N emprestimos
   ├──N obras (livros) ──N emprestimos   ├──N avaliacoes   (extensão)
   └──N emprestimos                      └──N progresso    (extensão)
```

Pontos de atenção em `database/schema.sql`:

- `FOREIGN KEY` declarada com `CONSTRAINT ... FOREIGN KEY`. Escrever `REFERENCES` direto na coluna **não cria a FK** no MySQL.
- `ON DELETE RESTRICT` em `emprestimos`: não dá para apagar usuário, obra ou empresa que tenha histórico.
- `ON DELETE SET NULL` em `obras.categoria_id`: apagar a categoria deixa a obra "sem categoria".
- Unicidade por empresa: `UNIQUE (empresa_id, nome)` em categorias. Duas empresas podem ter "Romance".
- As tabelas `sessoes`, `avaliacoes` e `progresso` existem no schema mas **ainda não têm rotas**. São a base dos exercícios.

## 6. Transações

Emprestar um livro faz duas coisas: baixa o estoque e cria o empréstimo. As duas acontecem na **mesma transação**: se uma falhar, nenhuma é gravada. Veja `src/services/emprestimos.service.js`.

## 7. Tratamento de erros

- Services lançam `HttpError(status, mensagem)` (`src/utils/httpError.js`).
- Erros do MySQL (ex.: chave duplicada, FK violada) são traduzidos em `src/utils/mysqlErrors.js`.
- O `errorHandler` devolve sempre `{ "erro": "mensagem" }`.

## 8. Segurança: o que já está e o que falta

Já está:

- SQL parametrizado (`?`), sem concatenar entrada do usuário.
- Hash de senha com bcrypt.
- Isolamento por empresa em todas as queries.
- `.env` fora do Git.

Fica como estudo (bom tema de aula):

- Limitar tentativas de login (rate limit).
- Validar o corpo com uma biblioteca de schema.
- Revogar tokens (a tabela `sessoes` está pronta para isso).
- CORS configurado para o front-end.
- HTTPS e senha forte no banco em produção.
