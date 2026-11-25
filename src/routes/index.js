// Registra todas as rotas da API em um só lugar.
// Cada recurso tem seu próprio arquivo; aqui só dizemos o prefixo de cada um.
const express = require("express");
const router = express.Router();

const authRoutes = require("./auth/auth.routes");
const empresasRoutes = require("./empresas/empresas.routes");
const usuariosRoutes = require("./usuarios/usuarios.routes");
const livrosRoutes = require("./livros/livros.routes");
const categoriasRoutes = require("./categorias/categorias.routes");
const emprestimosRoutes = require("./emprestimos/emprestimos.routes");

// Rota simples para checar se a API está no ar.
router.get("/", (req, res) => {
  res.json({ api: "BookHub", status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/empresas", empresasRoutes);
router.use("/usuarios", usuariosRoutes);
router.use("/livros", livrosRoutes);
router.use("/categorias", categoriasRoutes);
router.use("/emprestimos", emprestimosRoutes);

module.exports = router;
