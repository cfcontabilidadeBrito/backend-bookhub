// Rotas de empresas: /empresas
// Não exigem empresa selecionada: o usuário precisa listar e criar empresas
// antes mesmo de escolher uma. A permissão de admin é conferida no service,
// porque depende de qual empresa está sendo alterada (:id).
const express = require("express");
const router = express.Router();
const verifyToken = require("../../middlewares/auth");
const empresasService = require("../../services/empresas.service");

router.use(verifyToken);

// GET /empresas  - empresas do usuário logado (inclusive inativas)
router.get("/", async (req, res, next) => {
  try {
    const empresas = await empresasService.listarDoUsuario(req.usuario.id);
    res.status(200).json(empresas);
  } catch (err) {
    next(err);
  }
});

// GET /empresas/:id
router.get("/:id", async (req, res, next) => {
  try {
    const empresa = await empresasService.buscarPorId(Number(req.params.id), req.usuario.id);
    res.status(200).json(empresa);
  } catch (err) {
    next(err);
  }
});

// POST /empresas  body: { "nome": "...", "cnpj": "..." }  - quem cria vira admin
router.post("/", async (req, res, next) => {
  try {
    const empresa = await empresasService.criar(req.usuario.id, req.body || {});
    res.status(201).json(empresa);
  } catch (err) {
    next(err);
  }
});

// PATCH /empresas/:id  (admin da empresa)
router.patch("/:id", async (req, res, next) => {
  try {
    const empresa = await empresasService.atualizar(Number(req.params.id), req.usuario.id, req.body || {});
    res.status(200).json(empresa);
  } catch (err) {
    next(err);
  }
});

// PATCH /empresas/:id/inativar  (admin da empresa) - ninguém mais acessa a empresa
router.patch("/:id/inativar", async (req, res, next) => {
  try {
    const empresa = await empresasService.alterarStatus(Number(req.params.id), req.usuario.id, false);
    res.status(200).json(empresa);
  } catch (err) {
    next(err);
  }
});

// PATCH /empresas/:id/ativar  (admin da empresa)
router.patch("/:id/ativar", async (req, res, next) => {
  try {
    const empresa = await empresasService.alterarStatus(Number(req.params.id), req.usuario.id, true);
    res.status(200).json(empresa);
  } catch (err) {
    next(err);
  }
});

// DELETE /empresas/:id  (admin da empresa) - só apaga empresa sem categorias,
// livros ou empréstimos; caso contrário responde 409 (use /inativar)
router.delete("/:id", async (req, res, next) => {
  try {
    await empresasService.remover(Number(req.params.id), req.usuario.id);
    res.status(200).json({ message: "Empresa removida com sucesso" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
