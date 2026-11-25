-- =====================================================================
-- BookHub - dados de exemplo (multi-tenant)
-- Executar com: npm run db:seed   (depois do npm run db:schema)
-- Os ids abaixo assumem um banco recém-criado pelo schema.sql.
-- =====================================================================

-- Empresas ---------------------------------------------------------------
INSERT INTO empresas (id, nome, cnpj) VALUES
  (1, 'Biblioteca Central', '11.111.111/0001-11'),
  (2, 'Biblioteca Escolar', '22.222.222/0001-22');

-- Usuários ---------------------------------------------------------------
-- As senhas estão guardadas como hash bcrypt. Senhas em texto (só para aula):
--   admin@bookhub.com -> admin123
--   ana@bookhub.com   -> leitor123
--   bruno@bookhub.com -> leitor123
INSERT INTO usuarios (id, nome, email, senha_hash) VALUES
  (1, 'Administrador', 'admin@bookhub.com', '$2b$10$4nxVQ9qUuwJRX5KZAqweKuWctLAmiRy9C5m2fyK8ZigajP0z4zWkS'),
  (2, 'Ana Souza',     'ana@bookhub.com',   '$2b$10$GtBm/DZHvXucon2PkcJAEe8c.BhU9AVaootRq5T04Htk706DZPjcm'),
  (3, 'Bruno Lima',    'bruno@bookhub.com', '$2b$10$WMi0K1RREF4oNmGSfp83cO21xta4DaGuuir3I4CRFKN/93.oaO0Zm');

-- Vínculos usuário x empresa --------------------------------------------
--   admin: admin nas DUAS empresas -> no login precisa escolher a empresa
--   ana:   leitora só na empresa 1 -> entra direto
--   bruno: leitor nas DUAS empresas -> no login precisa escolher a empresa
INSERT INTO usuario_empresa (usuario_id, empresa_id, papel) VALUES
  (1, 1, 'admin'),
  (1, 2, 'admin'),
  (2, 1, 'leitor'),
  (3, 1, 'leitor'),
  (3, 2, 'leitor');

-- Categorias -------------------------------------------------------------
INSERT INTO categorias (id, empresa_id, nome) VALUES
  (1, 1, 'Romance'),
  (2, 1, 'Ficção Científica'),
  (3, 1, 'Tecnologia'),
  (4, 2, 'Infantil');

-- Obras (livros) ---------------------------------------------------------
-- Empresa 1: quatro obras, a última sem categoria (categoria_id NULL).
-- Empresa 2: uma obra, para mostrar que cada empresa só vê as suas.
INSERT INTO obras (id, empresa_id, titulo, autor, id_externo, categoria_id, estoque) VALUES
  (1, 1, 'Dom Casmurro',       'Machado de Assis',         NULL, 1,    3),
  (2, 1, 'Duna',               'Frank Herbert',            NULL, 2,    2),
  (3, 1, 'Código Limpo',       'Robert C. Martin',         NULL, 3,    1),
  (4, 1, 'O Pequeno Príncipe', 'Antoine de Saint-Exupéry', NULL, NULL, 0),
  (5, 2, 'Menina Bonita do Laço de Fita', 'Ana Maria Machado', NULL, 4, 2);
