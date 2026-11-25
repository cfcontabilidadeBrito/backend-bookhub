// Rotas de usuários da empresa atual: /usuarios
// Só o admin da empresa gerencia os usuários dela.
const express = require("express");
const router = express.Router();
const verifyToken = require("../../middlewares/auth");
const requireEmpresa = require("../../middlewares/requireEmpresa");
const requireRole = require("../../middlewares/requireRole");
const usuariosService = require("../../services/usuarios.service");

// Vale para todas as rotas abaixo: logado, com empresa escolhida e admin nela.
router.use(verifyToken, requireEmpresa, requireRole("admin"));

// GET /usuarios?ativo=true|false
router.get("/", async (req, res, next) => {
  try {
    const usuarios = await usuariosService.listar(req.usuario.empresaId, { ativo: req.query.ativo });
    res.status(200).json(usuarios);
  } catch (err) {
    next(err);
  }
});

// GET /usuarios/:id
router.get("/:id", async (req, res, next) => {
  try {
    const usuario = await usuariosService.buscarPorId(req.usuario.empresaId, Number(req.params.id));
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
});

// POST /usuarios  body: { "nome", "email", "senha", "papel" }
// E-mail já cadastrado: só vincula à empresa. E-mail novo: cria o usuário.
router.post("/", async (req, res, next) => {
  try {
    const usuario = await usuariosService.criar(req.usuario.empresaId, req.body || {});
    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
});

// PATCH /usuarios/:id  body: { "papel": "admin" | "leitor" }
router.patch("/:id", async (req, res, next) => {
  try {
    const usuario = await usuariosService.atualizar(
      req.usuario.empresaId,
      Number(req.params.id),
      req.usuario.id,
      req.body || {}
    );
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
});

// PATCH /usuarios/:id/inativar  - o usuário perde o acesso a ESTA empresa
router.patch("/:id/inativar", async (req, res, next) => {
  try {
    const usuario = await usuariosService.alterarStatus(req.usuario.empresaId, Number(req.params.id), req.usuario.id, false);
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
});

// PATCH /usuarios/:id/ativar
router.patch("/:id/ativar", async (req, res, next) => {
  try {
    const usuario = await usuariosService.alterarStatus(req.usuario.empresaId, Number(req.params.id), req.usuario.id, true);
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
