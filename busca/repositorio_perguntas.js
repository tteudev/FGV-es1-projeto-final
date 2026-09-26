// Camada de dados da busca: só sabe recuperar perguntas do banco.
// Recebe o acesso ao banco (bd_utils ou um mock) pelo construtor.
class RepositorioPerguntasBd {
  constructor(bd) {
    this.bd = bd;
  }

  // retorna [{ id_pergunta, texto, id_usuario, num_respostas }]
  listarPerguntas() {
    return this.bd.queryAll(
      `select p.*, count(r.id_resposta) as num_respostas
         from perguntas p
         left join respostas r on r.id_pergunta = p.id_pergunta
        group by p.id_pergunta`,
      []
    );
  }
}

exports.RepositorioPerguntasBd = RepositorioPerguntasBd;
