// Middleware requireEmpresa: garante que o usuário escolheu uma empresa
// e que ainda tem acesso a ela. Deve vir DEPOIS do verifyToken.
//
// Por que consultar o banco se o token já tem empresaId e papel?
// Porque o token vale por horas: se o admin inativar o usuário ou a empresa,
// o acesso precisa ser cortado NA HORA, e não só quando o token expirar.
// De quebra, o papel é atualizado (se o admin mudou de leitor para admin).
const empresasService = require("../services/empresas.service");

async function requireEmpresa(req, res, next) {
  try {
    const { id, empresaId } = req.usuario;

    if (!empresaId) {
      return res.status(403).json({ erro: "Selecione uma empresa em POST /auth/empresa" });
    }

    const vinculo = await empresasService.buscarVinculoAtivo(id, empresaId);
    if (!vinculo) {
      return res.status(403).json({ erro: "Sem acesso a esta empresa (usuário ou empresa inativos)" });
    }

    req.usuario.papel = vinculo.papel; // papel sempre vem do banco
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = requireEmpresa;
