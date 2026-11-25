-- =====================================================================
-- BookHub - estrutura do banco (MySQL 8) - MULTI-TENANT
-- Executar com: npm run db:schema
--
-- ATENÇÃO: este script APAGA as tabelas existentes e as cria de novo.
-- Use para montar o banco do zero (aula / desenvolvimento).
--
-- Multi-tenant: cada EMPRESA (tenant) tem seus próprios livros, categorias
-- e empréstimos. Um usuário pode participar de várias empresas, com um
-- papel (admin/leitor) diferente em cada uma: isso fica em usuario_empresa.
-- =====================================================================

-- Apaga na ordem INVERSA das dependências: primeiro quem aponta para
-- outras tabelas, por último as tabelas "independentes".
DROP TABLE IF EXISTS progresso;
DROP TABLE IF EXISTS avaliacoes;
DROP TABLE IF EXISTS emprestimos;
DROP TABLE IF EXISTS obras;
DROP TABLE IF EXISTS sessoes;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuario_empresa;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS empresas;

-- Observação: as chaves estrangeiras são declaradas com
-- "CONSTRAINT nome FOREIGN KEY (...) REFERENCES ...".
-- Escrever "REFERENCES" direto na definição da coluna NÃO cria a FK no MySQL
-- (ele aceita a sintaxe, mas ignora silenciosamente).

-- 1. empresas (os tenants) ----------------------------------------------
-- Empresas não são apagadas, só inativadas (ativo = 0): assim o histórico
-- de empréstimos continua existindo.
CREATE TABLE empresas (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(150) NOT NULL,
  cnpj      VARCHAR(18) NULL,
  ativo     BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_empresas_cnpj UNIQUE (cnpj),            -- vários NULL são permitidos
  CONSTRAINT ck_empresas_nome CHECK (CHAR_LENGTH(TRIM(nome)) > 0)
) ENGINE=InnoDB;

-- 2. usuarios -----------------------------------------------------------
-- Sem coluna "papel": o papel depende da empresa (ver usuario_empresa).
CREATE TABLE usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,          -- nunca guardamos a senha em texto
  criado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuarios_email UNIQUE (email)
) ENGINE=InnoDB;

-- 3. usuario_empresa (vínculo usuário x empresa) ------------------------
-- Diz em quais empresas o usuário entra e com qual papel.
-- "Inativar usuário" = ativo = 0 no vínculo: ele perde o acesso àquela
-- empresa, mas continua acessando as outras.
CREATE TABLE usuario_empresa (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  empresa_id INT NOT NULL,
  papel      ENUM('admin', 'leitor') NOT NULL DEFAULT 'leitor',
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuario_empresa UNIQUE (usuario_id, empresa_id),   -- 1 vínculo por par
  CONSTRAINT fk_usuario_empresa_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_usuario_empresa_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. categorias (por empresa) -------------------------------------------
CREATE TABLE categorias (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  nome       VARCHAR(80) NOT NULL,
  -- O nome é único DENTRO da empresa: duas empresas podem ter "Romance".
  CONSTRAINT uq_categorias_empresa_nome UNIQUE (empresa_id, nome),
  CONSTRAINT fk_categorias_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. sessoes ------------------------------------------------------------
-- A API usa JWT (sem estado), então esta tabela ainda não é usada pelas
-- rotas. Fica pronta para uma extensão: logout / revogação de tokens.
CREATE TABLE sessoes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  criado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em  DATETIME NOT NULL,
  CONSTRAINT fk_sessoes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE              -- apagou o usuário, apaga as sessões dele
) ENGINE=InnoDB;

-- 6. obras (exposta na API como /livros), por empresa -------------------
CREATE TABLE obras (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id   INT NOT NULL,
  titulo       VARCHAR(200) NOT NULL,
  autor        VARCHAR(150) NULL,
  id_externo   VARCHAR(50) NULL,             -- ex.: id de uma API externa (opcional)
  categoria_id INT NULL,
  estoque      INT NOT NULL DEFAULT 0,
  CONSTRAINT uq_obras_empresa_id_externo UNIQUE (empresa_id, id_externo),
  CONSTRAINT ck_obras_titulo CHECK (CHAR_LENGTH(TRIM(titulo)) > 0),
  CONSTRAINT ck_obras_estoque CHECK (estoque >= 0),
  CONSTRAINT fk_obras_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_obras_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias (id)
    ON DELETE SET NULL             -- apagou a categoria, a obra fica "sem categoria"
) ENGINE=InnoDB;

-- 7. emprestimos (por empresa) ------------------------------------------
CREATE TABLE emprestimos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id    INT NOT NULL,
  usuario_id    INT NOT NULL,
  obra_id       INT NOT NULL,
  status        ENUM('ativo', 'devolvido', 'atrasado') NOT NULL DEFAULT 'ativo',
  emprestado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  devolvido_em  DATETIME NULL,
  -- RESTRICT: não deixa apagar usuário, obra ou empresa com histórico de empréstimo.
  CONSTRAINT fk_emprestimos_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_emprestimos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_emprestimos_obra
    FOREIGN KEY (obra_id) REFERENCES obras (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 8. avaliacoes ---------------------------------------------------------
-- Não precisa de empresa_id: a obra avaliada já pertence a uma empresa.
CREATE TABLE avaliacoes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  obra_id    INT NOT NULL,
  nota       TINYINT NOT NULL,
  comentario TEXT NULL,
  criado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_avaliacoes_nota CHECK (nota BETWEEN 1 AND 5),
  CONSTRAINT uq_avaliacoes_usuario_obra UNIQUE (usuario_id, obra_id),  -- 1 avaliação por leitor/obra
  CONSTRAINT fk_avaliacoes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_avaliacoes_obra
    FOREIGN KEY (obra_id) REFERENCES obras (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. progresso ----------------------------------------------------------
CREATE TABLE progresso (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL,
  obra_id       INT NOT NULL,
  status        ENUM('quero_ler', 'lendo', 'lido') NOT NULL DEFAULT 'quero_ler',
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_progresso_usuario_obra UNIQUE (usuario_id, obra_id),
  CONSTRAINT fk_progresso_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_progresso_obra
    FOREIGN KEY (obra_id) REFERENCES obras (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
