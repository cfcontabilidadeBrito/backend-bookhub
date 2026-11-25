// Fábrica de middleware: requireRole("admin") devolve um middleware
// que só deixa passar usuários com esse papel.
// Deve vir DEPOIS do verifyToken, que é quem preenche req.usuario.
// Uso: router.post("/", verifyToken, requireRole("admin"), handler)
function requireRole(...papeisPermitidos) {
  return function (req, res, next) {
    if (!req.usuario || !papeisPermitidos.includes(req.usuario.papel)) {
      return res.status(403).json({ erro: "Acesso negado para o seu perfil" });
    }
    return next();
  };
}

module.exports = requireRole;
