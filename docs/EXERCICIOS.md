# Exercícios

Cada exercício indica **onde mexer** e **o que entregar**. Faça em ordem crescente de dificuldade, teste pelo Postman e crie uma branch por exercício.

> Dica: antes de codar, abra o recurso mais parecido (por exemplo, `categorias`) e copie o padrão rota → service → SQL.

## Nível 1: aquecimento

**1.1 Rota de saúde.** Crie `GET /health` (pública) que responde `{ "status": "ok" }`.
Onde: `src/routes/index.js`.

**1.2 Contar livros.** Crie `GET /livros/total` (empresa) com `{ "total": N }`, só da empresa atual.
Onde: rota e service de livros. Atenção: `/total` deve vir **antes** de `/:id`.

**1.3 Busca por título.** Adicione o filtro `?titulo=` em `GET /livros` usando `LIKE`.
Entregue: busca parcial, sem diferenciar maiúsculas de minúsculas.

## Nível 2: regras de negócio

**2.1 Paginação.** Em `GET /livros`, aceite `?pagina=1&limite=10` e devolva `{ dados, pagina, limite, total }`.
Entregue: limite máximo de 50; valores inválidos viram o padrão.

**2.2 Limite de empréstimos.** Um leitor só pode ter 3 empréstimos `ativo` ao mesmo tempo. O 4º responde `409`.
Onde: `src/services/emprestimos.service.js`, dentro da transação.

**2.3 Prazo e atraso.** Adicione `prazo_em DATETIME` em `emprestimos` (14 dias após o empréstimo). Faça `GET /emprestimos?status=atrasado` listar os `ativo` com `prazo_em < NOW()`.
Entregue: alterações no `schema.sql`, no `seed.sql` e no service.

**2.4 Soft delete de livro.** Em vez de apagar, marque o livro como inativo (`ativo BOOLEAN`). Livros inativos não aparecem na listagem.

## Nível 3: novas funcionalidades

**3.1 Avaliações.** A tabela `avaliacoes` já existe. Crie:

- `POST /livros/:id/avaliacoes` (leitor) com `{ nota, comentario }`; uma avaliação por leitor e livro (`409` se repetir).
- `GET /livros/:id/avaliacoes` (empresa) com a média e a lista.

Atenção: confirme que o livro pertence à empresa do token.

**3.2 Progresso de leitura.** A tabela `progresso` já existe. Crie `PUT /livros/:id/progresso` com `{ "status": "quero_ler" | "lendo" | "lido" }` (upsert com `ON DUPLICATE KEY UPDATE`).

**3.3 Logout com revogação.** Use a tabela `sessoes`: guarde o hash do token no login, confira em `verifyToken` e crie `POST /auth/logout`.

## Nível 4: qualidade

**4.1 Validação.** Troque as validações manuais por uma biblioteca de schema (por exemplo, `zod`) em um recurso.

**4.2 Rate limit no login.** Bloqueie mais de 5 tentativas por minuto por IP em `POST /auth/login`.

**4.3 Testes automatizados.** Adicione testes de integração com `node:test` e `supertest` para o fluxo: login → criar livro → emprestar → devolver.

## Desafio final

Escolha um: relatório dos livros mais emprestados por empresa, importação de livros de uma API externa usando `id_externo`, ou painel de empréstimos atrasados por leitor.
