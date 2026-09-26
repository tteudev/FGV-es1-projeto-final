# Implementação com SOLID: busca de perguntas por palavra-chave

## Funcionalidade implementada

Escolhi implementar a **busca de perguntas por palavra-chave** (história 1 de `HISTORIAS.md`, primeiro cartão do quadro Kanban). A funcionalidade tem backend e frontend:

- **Backend** (`esmforum`): novo endpoint `GET /perguntas/busca?q=<termo>&modo=<trecho|palavras>`, que devolve as perguntas que correspondem ao termo, cada uma com seu `num_respostas`. Sem `q` (ou com `q` vazio) devolve todas.
- **Frontend** (`esmforum-react`): campo de busca em `src/pages/Pergunta.js`. A lista é atualizada a cada letra digitada e, quando nada é encontrado, aparece a mensagem "Nenhuma pergunta encontrada".

O critério de aceitação "ignorar maiúsculas de minúsculas" foi ampliado para também **ignorar acentos**: buscar `acao` encontra "ação".

## Estrutura

```
busca/
  estrategias.js            regras de correspondência (Strategy)
  repositorio_perguntas.js  acesso ao banco
  servico_busca.js          regra de negócio da busca
  index.js                  escolhe e liga as implementações
testes/busca.test.js        testes de unidade e de integração
```

O `server.js` ganhou apenas o `require` do módulo e uma rota que delega ao serviço:

```js
app.get('/perguntas/busca', (req, res) => {
  try {
    res.json(busca.buscar(req.query.q, req.query.modo));
  }
  catch(erro) {
    res.status(500).json(erro.message);
  }
});
```

## Como cada princípio foi aplicado

### SRP: uma responsabilidade por módulo

| Módulo | Única responsabilidade | Muda quando... |
|---|---|---|
| `server.js` (rota) | Traduzir HTTP: ler `q` e `modo`, devolver JSON | O formato da API mudar |
| `servico_busca.js` | Regra da busca: termo vazio devolve tudo, senão filtra | A regra de negócio mudar |
| `estrategias.js` | Decidir se um texto corresponde a um termo | Surgir outro critério de correspondência |
| `repositorio_perguntas.js` | Ler perguntas do banco | O esquema ou o SQL mudar |

O serviço não conhece SQL nem HTTP, e o repositório não conhece a regra da busca:

```js
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
```

### DIP: dependência de abstrações, injetadas de fora

O `ServicoBusca` (alto nível) não cria nem importa o banco nem uma estratégia específica. Ele recebe pelo construtor duas abstrações:

- um **repositório**: qualquer objeto com o método `listarPerguntas()`;
- uma **estratégia**: qualquer objeto com o método `corresponde(texto, termo)`.

O repositório, por sua vez, recebe o acesso ao banco pelo construtor:

```js
class RepositorioPerguntasBd {
  constructor(bd) {
    this.bd = bd;
  }

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
```

Somente `busca/index.js` (a "raiz de composição") conhece as classes concretas e faz a ligação:

```js
const repositorio = new RepositorioPerguntasBd(bd);

function buscar(termo, modo) {
  const estrategia = estrategias[modo] || estrategias[MODO_PADRAO];
  return new ServicoBusca(repositorio, estrategia).buscar(termo);
}
```

O ganho prático está nos testes: `testes/busca.test.js` testa o serviço com um repositório falso de três linhas, sem tocar em banco de dados, e não precisou de nada parecido com `reconfig_bd`:

```js
const repositorioFalso = {
  listarPerguntas: () => [
    { id_pergunta: 1, texto: 'Como remover um elemento de um array em JavaScript?', id_usuario: 1, num_respostas: 2 },
    // ...
  ],
};
const servico = new ServicoBusca(repositorioFalso, new BuscaPorTrecho());
```

O repositório é apenas uma classe; o arquivo do banco só é usado no teste de integração dedicado.

### OCP: novas formas de busca sem modificar o serviço

As estratégias de correspondência ficam em `estrategias.js`. Há duas implementadas:

```js
class BuscaPorTrecho extends EstrategiaBusca {           // o termo inteiro aparece no texto
  corresponde(texto, termo) {
    return normalizar(texto).includes(normalizar(termo));
  }
}

class BuscaPorTodasAsPalavras extends EstrategiaBusca {  // todas as palavras aparecem, em qualquer ordem
  corresponde(texto, termo) {
    const textoNormalizado = normalizar(texto);
    return normalizar(termo)
      .split(/\s+/)
      .filter(palavra => palavra !== '')
      .every(palavra => textoNormalizado.includes(palavra));
  }
}
```

Para criar uma terceira forma (por exemplo, busca por prefixo), basta escrever uma classe nova com o método `corresponde` e registrá-la em `busca/index.js`. O `ServicoBusca` e o repositório **não são alterados**. Isso é demonstrado em um teste que define uma estratégia nova dentro do próprio teste e a passa ao serviço:

```js
class BuscaPorPrefixo extends EstrategiaBusca {
  corresponde(texto, termo) {
    return texto.toLowerCase().startsWith(termo.toLowerCase());
  }
}
const servico = new ServicoBusca(repositorioFalso, new BuscaPorPrefixo());
expect(servico.buscar('qual').map(p => p.id_pergunta)).toEqual([2]);
```

### Outros princípios presentes

- **LSP:** `BuscaPorTrecho`, `BuscaPorTodasAsPalavras` e a estratégia definida no teste podem ser usadas no lugar uma da outra pelo serviço, sem que ele se comporte de forma diferente. O repositório falso do teste também substitui o real.
- **ISP:** as duas abstrações têm um único método cada (`listarPerguntas` e `corresponde`), então nenhuma implementação é obrigada a fornecer o que não usa.

## Decisões e limites

- **Filtro em JavaScript, não em SQL.** O filtro roda na memória depois de ler as perguntas. Foi uma escolha consciente: o `LIKE` do SQLite só ignora maiúsculas para caracteres ASCII, e eu queria ignorar acentos. Para o volume deste sistema didático isso é suficiente. Com muitos dados, seria preciso trocar por uma consulta com índice (por exemplo, o módulo FTS5 do SQLite), o que seria uma nova implementação de repositório, sem alterar o serviço.
- **Consulta única com junção.** O repositório calcula `num_respostas` com `left join` e `group by`, em vez de repetir a consulta para cada pergunta (o problema N+1 comentado em `DESIGN_SIMPLES.md`).
- **O código existente foi mantido.** `modelo.js` e as rotas atuais não foram alteradas; a busca convive com eles.

## Como testar

```console
npx jest                     # 14 testes: 3 antigos e 11 da busca
node server.js               # sobe a API em localhost:5000
```

Exemplos de chamada:

```
GET http://localhost:5000/perguntas/busca?q=array
GET http://localhost:5000/perguntas/busca?q=array%20remover&modo=palavras
GET http://localhost:5000/perguntas/busca            (todas as perguntas)
```

Para ver a interface, subir também o frontend (`npm start` em `esmforum-react`) e digitar no campo "Buscar perguntas por palavra-chave".

O que foi verificado: os 14 testes passam; o endpoint responde com a lista completa quando `q` é vazio; e, no navegador, digitar um termo sem correspondência mostra "Nenhuma pergunta encontrada" e limpar o campo devolve a lista completa.
