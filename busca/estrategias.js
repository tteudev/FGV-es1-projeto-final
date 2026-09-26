// Estratégias de busca: cada uma decide se o texto de uma pergunta corresponde ao termo.
// Para criar uma nova forma de busca basta criar uma nova classe com o método "corresponde".

function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

class EstrategiaBusca {
  corresponde(texto, termo) {
    throw new Error('corresponde() deve ser implementado pela estratégia');
  }
}

// O termo, como um todo, aparece no texto (ignora maiúsculas e acentos)
class BuscaPorTrecho extends EstrategiaBusca {
  corresponde(texto, termo) {
    return normalizar(texto).includes(normalizar(termo));
  }
}

// Todas as palavras do termo aparecem no texto, em qualquer ordem
class BuscaPorTodasAsPalavras extends EstrategiaBusca {
  corresponde(texto, termo) {
    const textoNormalizado = normalizar(texto);
    return normalizar(termo)
      .split(/\s+/)
      .filter(palavra => palavra !== '')
      .every(palavra => textoNormalizado.includes(palavra));
  }
}

exports.EstrategiaBusca = EstrategiaBusca;
exports.BuscaPorTrecho = BuscaPorTrecho;
exports.BuscaPorTodasAsPalavras = BuscaPorTodasAsPalavras;
