// Ponto único onde as implementações concretas são escolhidas e ligadas.
const bd = require('../bd/bd_utils.js');
const { RepositorioPerguntasBd } = require('./repositorio_perguntas.js');
const { ServicoBusca } = require('./servico_busca.js');
const { BuscaPorTrecho, BuscaPorTodasAsPalavras } = require('./estrategias.js');

// Para oferecer um novo modo de busca: criar a classe em estrategias.js e registrá-la aqui.
const estrategias = {
  trecho: new BuscaPorTrecho(),
  palavras: new BuscaPorTodasAsPalavras(),
};
const MODO_PADRAO = 'trecho';

const repositorio = new RepositorioPerguntasBd(bd);

function buscar(termo, modo) {
  const estrategia = estrategias[modo] || estrategias[MODO_PADRAO];
  return new ServicoBusca(repositorio, estrategia).buscar(termo);
}

exports.buscar = buscar;
