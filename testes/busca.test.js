const { ServicoBusca } = require('../busca/servico_busca.js');
const { RepositorioPerguntasBd } = require('../busca/repositorio_perguntas.js');
const { EstrategiaBusca, BuscaPorTrecho, BuscaPorTodasAsPalavras } = require('../busca/estrategias.js');
const bd = require('../bd/bd_utils.js');

// repositório falso: devolve sempre as mesmas perguntas, sem acessar o banco
const repositorioFalso = {
  listarPerguntas: () => [
    { id_pergunta: 1, texto: 'Como remover um elemento de um array em JavaScript?', id_usuario: 1, num_respostas: 2 },
    { id_pergunta: 2, texto: 'Qual a diferença entre var e let?', id_usuario: 1, num_respostas: 0 },
    { id_pergunta: 3, texto: 'Como programar em Python com ação e reação?', id_usuario: 1, num_respostas: 1 },
  ],
};

describe('ServicoBusca com BuscaPorTrecho', () => {
  const servico = new ServicoBusca(repositorioFalso, new BuscaPorTrecho());

  test('encontra perguntas que contêm o termo', () => {
    const resultado = servico.buscar('array');
    expect(resultado.length).toBe(1);
    expect(resultado[0].id_pergunta).toBe(1);
  });

  test('ignora maiúsculas e minúsculas', () => {
    expect(servico.buscar('JAVASCRIPT').length).toBe(1);
  });

  test('ignora acentos', () => {
    expect(servico.buscar('acao').map(p => p.id_pergunta)).toEqual([3]);
    expect(servico.buscar('diferenca').map(p => p.id_pergunta)).toEqual([2]);
  });

  test('preserva o número de respostas de cada pergunta', () => {
    expect(servico.buscar('array')[0].num_respostas).toBe(2);
  });

  test('retorna lista vazia quando nada corresponde', () => {
    expect(servico.buscar('cobol')).toEqual([]);
  });

  test('termo vazio ou só com espaços retorna todas as perguntas', () => {
    expect(servico.buscar('').length).toBe(3);
    expect(servico.buscar('   ').length).toBe(3);
    expect(servico.buscar(undefined).length).toBe(3);
  });
});

describe('Extensão por novas estratégias (OCP)', () => {
  test('BuscaPorTodasAsPalavras aceita as palavras em qualquer ordem', () => {
    const servico = new ServicoBusca(repositorioFalso, new BuscaPorTodasAsPalavras());
    expect(servico.buscar('array remover').map(p => p.id_pergunta)).toEqual([1]);
    expect(servico.buscar('array python')).toEqual([]);
  });

  test('uma estratégia nova funciona sem alterar o serviço', () => {
    class BuscaPorPrefixo extends EstrategiaBusca {
      corresponde(texto, termo) {
        return texto.toLowerCase().startsWith(termo.toLowerCase());
      }
    }
    const servico = new ServicoBusca(repositorioFalso, new BuscaPorPrefixo());
    expect(servico.buscar('qual').map(p => p.id_pergunta)).toEqual([2]);
  });

  test('a estratégia base exige implementação', () => {
    expect(() => new EstrategiaBusca().corresponde('a', 'b')).toThrow();
  });
});

describe('RepositorioPerguntasBd (integração com o banco de teste)', () => {
  beforeEach(() => {
    bd.reconfig('./bd/esmforum-teste.db');
    bd.exec('delete from perguntas', []);
    bd.exec('delete from respostas', []);
  });

  test('lista perguntas com a contagem de respostas', () => {
    const id1 = bd.exec('INSERT INTO perguntas (texto, id_usuario) VALUES(?, ?)', ['Pergunta A', 1]).lastInsertRowid;
    bd.exec('INSERT INTO perguntas (texto, id_usuario) VALUES(?, ?)', ['Pergunta B', 1]);
    bd.exec('INSERT INTO respostas (id_pergunta, texto) VALUES(?, ?)', [id1, 'r1']);
    bd.exec('INSERT INTO respostas (id_pergunta, texto) VALUES(?, ?)', [id1, 'r2']);

    const perguntas = new RepositorioPerguntasBd(bd).listarPerguntas();
    expect(perguntas.length).toBe(2);
    expect(perguntas.find(p => p.texto === 'Pergunta A').num_respostas).toBe(2);
    expect(perguntas.find(p => p.texto === 'Pergunta B').num_respostas).toBe(0);
  });

  test('busca ponta a ponta usando o banco', () => {
    bd.exec('INSERT INTO perguntas (texto, id_usuario) VALUES(?, ?)', ['Como usar Jest?', 1]);
    bd.exec('INSERT INTO perguntas (texto, id_usuario) VALUES(?, ?)', ['O que é SQLite?', 1]);

    const servico = new ServicoBusca(new RepositorioPerguntasBd(bd), new BuscaPorTrecho());
    const resultado = servico.buscar('sqlite');
    expect(resultado.length).toBe(1);
    expect(resultado[0].texto).toBe('O que é SQLite?');
  });
});
