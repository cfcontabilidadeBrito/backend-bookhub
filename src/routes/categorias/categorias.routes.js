// Rotas de categorias: /categorias
const express = require("express");
const router = express.Router();
const verifyToken = require("../../middlewares/auth");
const requireEmpresa = require("../../middlewares/requireEmpresa");
const requireRole = require("../../middlewares/requireRole");
const categoriasService = require("../../services/categorias.service");

// Multi-tenant: categorias pertencem a uma empresa (vem do token).
router.use(verifyToken, requireEmpresa);

// GET /categorias
router.get("/", async (req, res, next) => {
  try {
    const categorias = await categoriasService.listar(req.usuario.empresaId);
    res.status(200).json(categorias);
  } catch (err) {
    next(err);
  }
});

// GET /categorias/:id
router.get("/:id", async (req, res, next) => {
  try {
    const categoria = await categoriasService.buscarPorId(req.usuario.empresaId, Number(req.params.id));
    res.status(200).json(categoria);
  } catch (err) {
    next(err);
  }
});

// POST /categorias  (só admin)
router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const categoria = await categoriasService.criar(req.usuario.empresaId, req.body || {});
    res.status(201).json(categoria);
  } catch (err) {
    next(err);
  }
});

// PATCH /categorias/:id  (só admin)
router.patch("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const categoria = await categoriasService.atualizar(req.usuario.empresaId, Number(req.params.id), req.body || {});
    res.status(200).json(categoria);
  } catch (err) {
    next(err);
  }
});

// DELETE /categorias/:id  (só admin) - as obras dessa categoria ficam sem categoria
router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    await categoriasService.remover(req.usuario.empresaId, Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
