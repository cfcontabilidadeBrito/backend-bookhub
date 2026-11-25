// Rotas de empréstimos: /emprestimos
const express = require("express");
const router = express.Router();
const verifyToken = require("../../middlewares/auth");
const requireEmpresa = require("../../middlewares/requireEmpresa");
const requireRole = require("../../middlewares/requireRole");
const emprestimosService = require("../../services/emprestimos.service");

// Todas as rotas deste arquivo exigem login e empresa escolhida:
// registramos os middlewares uma vez só, para o router inteiro.
router.use(verifyToken, requireEmpresa);

// GET /emprestimos?status=ativo  (admin vê todos da empresa; leitor vê os seus)
router.get("/", async (req, res, next) => {
  try {
    const emprestimos = await emprestimosService.listar(req.usuario, { status: req.query.status });
    res.status(200).json(emprestimos);
  } catch (err) {
    next(err);
  }
});

// POST /emprestimos  (só leitor)  body: { "obraId": 1 }
router.post("/", requireRole("leitor"), async (req, res, next) => {
  try {
    const emprestimo = await emprestimosService.criar(req.usuario, req.body || {});
    res.status(201).json(emprestimo);
  } catch (err) {
    next(err);
  }
});

// PATCH /emprestimos/:id/devolver  (dono do empréstimo ou admin)
router.patch("/:id/devolver", async (req, res, next) => {
  try {
    const emprestimo = await emprestimosService.devolver(Number(req.params.id), req.usuario);
    res.status(200).json(emprestimo);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
