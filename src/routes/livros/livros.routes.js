// Rotas de livros: /livros
const express = require("express");
const router = express.Router();
const verifyToken = require("../../middlewares/auth");
const requireEmpresa = require("../../middlewares/requireEmpresa");
const requireRole = require("../../middlewares/requireRole");
const livrosService = require("../../services/livros.service");

// Multi-tenant: cada empresa tem seu acervo, então até a listagem precisa
// saber de qual empresa é a requisição (vem do token).
router.use(verifyToken, requireEmpresa);

// GET /livros?categoriaId=1&autor=machado
router.get("/", async (req, res, next) => {
  try {
    const { categoriaId, autor } = req.query;
    const livros = await livrosService.listar(req.usuario.empresaId, { categoriaId, autor });
    res.status(200).json(livros);
  } catch (err) {
    next(err);
  }
});

// GET /livros/:id
router.get("/:id", async (req, res, next) => {
  try {
    const livro = await livrosService.buscarPorId(req.usuario.empresaId, Number(req.params.id));
    res.status(200).json(livro);
  } catch (err) {
    next(err);
  }
});

// POST /livros  (só admin)
// verifyToken (quem é?) e requireEmpresa (de qual empresa?) já rodaram no router.use;
// requireRole decide se ele PODE.
router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const livro = await livrosService.criar(req.usuario.empresaId, req.body || {});
    res.status(201).json(livro);
  } catch (err) {
    next(err);
  }
});

// PATCH /livros/:id  (só admin) - altera apenas os campos enviados
router.patch("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const livro = await livrosService.atualizar(req.usuario.empresaId, Number(req.params.id), req.body || {});
    res.status(200).json(livro);
  } catch (err) {
    next(err);
  }
});

// DELETE /livros/:id  (só admin)
router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    await livrosService.remover(req.usuario.empresaId, Number(req.params.id));
    res.status(204).send(); // 204 = sucesso, sem corpo na resposta
  } catch (err) {
    next(err);
  }
});

module.exports = router;
