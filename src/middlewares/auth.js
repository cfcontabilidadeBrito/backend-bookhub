// Middleware verifyToken: só deixa passar quem enviar um JWT válido.
// Espera o header:  Authorization: Bearer <token>
const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const [tipo, token] = header.split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ erro: "Token não informado" });
  }

  try {
    // jwt.verify confere a assinatura e a validade (expiração) do token.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Deixa os dados do usuário disponíveis para as próximas etapas.
    // empresaId e papel ficam null enquanto o usuário não escolher uma empresa.
    req.usuario = {
      id: payload.id,
      empresaId: payload.empresaId || null,
      papel: payload.papel || null,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}

module.exports = verifyToken;
