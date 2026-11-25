// Rotas de autenticação: /auth
// A rota lê a requisição, chama o service e escolhe o status HTTP.
// Ela NÃO faz SQL: isso é trabalho do service.
const express = require("express");
const router = express.Router();
const verifyToken = require("../../middlewares/auth");
const authService = require("../../services/auth.service");

// POST /auth/login  (público)
// Uma empresa: token já vem com ela. Várias: token sem empresa + lista "empresas".
router.post("/login", async (req, res, next) => {
  try {
    const { email, senha } = req.body || {};
    const resultado = await authService.login(email, senha);
    res.status(200).json(resultado);
  } catch (err) {
    next(err); // repassa para o errorHandler
  }
});

// POST /auth/empresa  (precisa de token)  body: { "empresaId": 1 }
// Escolhe ou troca a empresa e devolve um token novo para ela.
router.post("/empresa", verifyToken, async (req, res, next) => {
  try {
    const { empresaId } = req.body || {};
    const resultado = await authService.selecionarEmpresa(req.usuario.id, empresaId);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
});

// GET /auth/me  (precisa de token)
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const usuario = await authService.buscarUsuarioLogado(req.usuario);
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
