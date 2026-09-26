// Regra de negócio da busca. Depende apenas de duas abstrações recebidas pelo construtor:
//  - repositorio: qualquer objeto com listarPerguntas()
//  - estrategia: qualquer objeto com corresponde(texto, termo)
class ServicoBusca {
  constructor(repositorio, estrategia) {
    this.repositorio = repositorio;
    this.estrategia = estrategia;
  }

  buscar(termo) {
    const perguntas = this.repositorio.listarPerguntas();
    const termoLimpo = (termo || '').trim();
    if (termoLimpo === '') {
      return perguntas;
    }
    return perguntas.filter(p => this.estrategia.corresponde(p.texto, termoLimpo));
  }
}

exports.ServicoBusca = ServicoBusca;
