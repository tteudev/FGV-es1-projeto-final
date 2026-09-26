# Análise SOLID do backend do ESM Forum

Analisei o backend atual em busca de trechos que seguem e que violam os princípios SOLID. O enunciado cita `routes/` e `models/`, mas o repositório não tem essas pastas: o código está em `server.js` (rotas, papel de controlador), `modelo.js` (papel de modelo) e `bd/bd_utils.js` (acesso ao banco). São esses os arquivos analisados. A análise foi feita sobre o código original, antes da implementação da busca (ver `IMPLEMENTACAO_SOLID.md`).

## 1. Pontos positivos: trechos que seguem SOLID

### 1.1 Separação em três módulos com papéis distintos: SRP

**Princípio:** Single Responsibility Principle (uma classe ou módulo deve ter um único motivo para mudar).

**Onde:** a divisão entre `server.js`, `modelo.js` e `bd/bd_utils.js`.

```js
// server.js: só trata HTTP (recebe a requisição, chama o modelo, devolve JSON)
app.post('/perguntas', (req, res) => {
  try {
    const id_pergunta = modelo.cadastrar_pergunta(req.body.pergunta);
    res.json({id_pergunta: id_pergunta});
  }
  catch(erro) {
    res.status(500).json(erro.message);
  }
});
```

```js
// bd/bd_utils.js: só sabe executar comandos no SQLite
function queryAll(query, params) {
  return bd.prepare(query).all(params);
}
```

**Por que respeita o princípio:** o `server.js` muda se o formato da API mudar (rotas, códigos HTTP), o `bd_utils.js` muda se a biblioteca de banco mudar, e o `modelo.js` muda se as regras de perguntas e respostas mudarem. Cada arquivo tem um motivo principal de mudança, e a rota acima não conhece SQL.

### 1.2 O modelo pode receber outro banco de dados: DIP e LSP

**Princípios:** Dependency Inversion Principle e Liskov Substitution Principle.

**Onde:** `reconfig_bd` em `modelo.js` e o teste `testes/listar_perguntas.test.js`.

```js
// modelo.js
function reconfig_bd(mock_bd) {
  bd = mock_bd;
}
```

```js
// testes/listar_perguntas.test.js
var mock_bd = {};
mock_bd.queryAll = jest.fn().mockReturnValue([ /* ... */ ]);
mock_bd.query = jest.fn().mockReturnValue({ 'count(*)': 0 });
modelo.reconfig_bd(mock_bd);
```

**Por que respeita os princípios:** as funções do modelo usam o banco apenas por meio de `queryAll`, `query` e `exec`, sem depender de detalhes do `better-sqlite3`. Por isso um objeto de teste com os mesmos métodos pode substituir o banco real sem que o modelo perceba (Liskov), e o teste de unidade roda sem abrir nenhum arquivo `.db`. Isso é um passo na direção da inversão de dependência (ver a ressalva na seção 2.1).

### 1.3 Interface pequena e coesa no acesso ao banco: ISP

**Princípio:** Interface Segregation Principle (clientes não devem depender de métodos que não usam).

**Onde:** as três funções exportadas por `bd/bd_utils.js`.

```js
exports.query = query;      // uma linha
exports.queryAll = queryAll; // várias linhas
exports.exec = exec;        // comandos que alteram dados
```

**Por que respeita o princípio:** o contrato entre o modelo e o banco tem só três operações, cada uma com um propósito claro. O modelo não é obrigado a conhecer as dezenas de recursos do `better-sqlite3` (transações, funções personalizadas, backup, etc.). Como o contrato é pequeno, é fácil criar um substituto de teste, como o mock do item anterior, que implementa apenas as duas funções que o teste usa.

## 2. Oportunidades de melhoria: trechos que violam SOLID

### 2.1 `modelo.js` depende do módulo concreto e mistura regras com SQL: DIP e SRP

**Princípios violados:** Dependency Inversion Principle (principal) e Single Responsibility Principle.

**Onde:**

```js
// modelo.js
var bd = require('./bd/bd_utils.js');   // dependência concreta, criada no import

function reconfig_bd(mock_bd) {
  bd = mock_bd;                          // troca de dependência alterando estado do módulo
}

function listar_perguntas() {
  const perguntas = bd.queryAll('select * from perguntas', []);   // SQL dentro da regra de negócio
  perguntas.forEach(pergunta => pergunta['num_respostas'] = get_num_respostas(pergunta['id_pergunta']));
  return perguntas;
}
```

**Por que viola:**
- O módulo de alto nível (o modelo) importa diretamente o módulo concreto de baixo nível. A dependência não vem de fora e não é uma abstração declarada. A função `reconfig_bd` é um remendo que troca uma variável global do módulo: além de ser estado compartilhado (um teste que esquece de restaurar o banco afeta os outros), ela existe só para testes.
- O mesmo arquivo cuida das regras de perguntas e respostas e também de montar as consultas SQL, ou seja, tem dois motivos para mudar (regras de negócio e esquema do banco). Um exemplo concreto: `cadastrar_pergunta` traz a regra "o autor é o usuário 1" misturada com o `INSERT`.

**Como melhorar:** separar em duas camadas e injetar a dependência pelo construtor, em vez de importá-la:

```js
class RepositorioPerguntas {           // dados: só SQL
  constructor(bd) { this.bd = bd; }
  listarPerguntas() { return this.bd.queryAll('select * from perguntas', []); }
}

class ServicoPerguntas {               // negócio: regras, sem SQL
  constructor(repositorio) { this.repositorio = repositorio; }
  listar() { return this.repositorio.listarPerguntas(); }
}

// quem monta o sistema escolhe as implementações
const servico = new ServicoPerguntas(new RepositorioPerguntas(bd));
```

Com isso, o teste cria `new ServicoPerguntas(repositorioFalso)` sem precisar de `reconfig_bd`, e o SQL passa a existir em um só lugar. Foi exatamente essa estrutura que usei na implementação da busca.

### 2.2 Adicionar informação às perguntas exige modificar `listar_perguntas`: OCP

**Princípio violado:** Open/Closed Principle (o código deve estar aberto para extensão e fechado para modificação).

**Onde:**

```js
// modelo.js
function listar_perguntas() {
  const perguntas = bd.queryAll('select * from perguntas', []);
  perguntas.forEach(pergunta => pergunta['num_respostas'] = get_num_respostas(pergunta['id_pergunta']));
  return perguntas;
}
```

**Por que viola:** o número de respostas foi "embutido" na própria função de listagem. As funcionalidades pedidas pelo cliente vão querer acrescentar mais dados a cada pergunta: o saldo de votos, as tags, o nome do autor. Cada uma exigirá editar esta função e, junto com ela, o teste que depende do formato atual (`testes/listar_perguntas.test.js` simula exatamente as duas chamadas ao banco que a função faz). A função cresce a cada requisito novo, e cada mudança arrisca quebrar o que já funcionava.

O mesmo acontece em `server.js`: cada rota nova exige editar o arquivo único e repetir o bloco `try/catch` (a rota `GET /respostas/:id_pergunta` ainda chama o modelo fora do `try`, um exemplo do risco da repetição).

**Como melhorar:** manter a listagem base intocada e acrescentar os dados extras por composição, por exemplo com decoradores que "enriquecem" o resultado (ver a proposta do padrão Decorator em `PADROES_PROPOSTOS.md`):

```js
// cada extensão é uma classe nova; o repositório base não é alterado
const repositorio = new RepositorioComTags(new RepositorioComVotos(new RepositorioPerguntasBd(bd)));
```

Para as rotas, as rotas de cada funcionalidade podem viver em módulos próprios (`Router` do Express), de modo que adicionar uma funcionalidade significa adicionar um arquivo e uma linha de registro, e não editar as rotas existentes (ver `PROPOSTA_ARQUITETURA.md`).

## 3. Resumo

| # | Trecho | Princípio | Situação |
|---|---|---|---|
| 1.1 | Divisão `server.js` / `modelo.js` / `bd_utils.js` | SRP | Respeita |
| 1.2 | `reconfig_bd` com mock nos testes | DIP e LSP | Respeita (parcialmente para DIP) |
| 1.3 | Três funções em `bd_utils.js` | ISP | Respeita |
| 2.1 | `modelo.js` importa o módulo concreto e mistura SQL e regras | DIP e SRP | Viola |
| 2.2 | `listar_perguntas` embute `num_respostas`; `server.js` concentra as rotas | OCP | Viola |
