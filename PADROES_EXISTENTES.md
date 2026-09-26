# Padrões de Projeto já presentes no ESM Forum

Analisei o código do backend (`server.js`, `modelo.js`, `bd/bd_utils.js`) e do frontend (`esmforum-react/src`) procurando padrões de projeto, mesmo que aplicados de forma parcial ou informal. A análise é sobre o código original; o padrão Strategy, que introduzi na busca, é comentado à parte no final.

## Resumo

| # | Padrão | Onde | Completude |
|---|---|---|---|
| 1 | Facade | `bd/bd_utils.js`; `modelo.js` em relação ao `server.js` | Completo (o primeiro), parcial (o segundo) |
| 2 | Singleton (via módulo) | conexão em `bd/bd_utils.js` | Parcial |
| 3 | Chain of Responsibility (middleware) | `app.use(...)` em `server.js` | Parcial |
| 4 | Injeção de dependência / Test Double | `reconfig_bd` em `modelo.js` | Parcial |
| 5 | Composite (composição de componentes) | React: `Menu`, `Outlet` e rotas aninhadas | Parcial |

## 1. Facade

**O que é:** uma interface simples que esconde a complexidade de um subsistema.

**Onde:** `bd/bd_utils.js` é uma fachada sobre a biblioteca `better-sqlite3`:

```js
function query(query, params)    { return bd.prepare(query).get(params); }
function queryAll(query, params) { return bd.prepare(query).all(params); }
function exec(statement, params) { return bd.prepare(statement).run(params); }
```

O `modelo.js` chama três funções e não precisa saber sobre `prepare`, `get`, `all` ou `run`. De forma menos rígida, o `modelo.js` também atua como fachada do domínio para o `server.js`: a rota chama `modelo.cadastrar_pergunta(texto)` sem saber que existe SQL por trás.

**Está completo?** A fachada do banco é completa para o que o sistema usa. Poderia melhorar em pontos pequenos: não há tratamento de erros nem suporte a transações, e o nome do arquivo do banco está escrito dentro do módulo (`'./bd/esmforum.db'`). A fachada `modelo.js` é parcial, porque mistura regras de negócio e SQL (ver `ANALISE_SOLID.md`, item 2.1).

## 2. Singleton (via módulo do Node.js)

**O que é:** garante uma única instância de uma classe e um ponto global de acesso.

**Onde:** `bd/bd_utils.js` cria a conexão uma única vez, e o sistema de módulos do Node armazena o módulo em cache, então todo `require('./bd/bd_utils.js')` recebe o mesmo objeto e a mesma conexão:

```js
var bd = new Database('./bd/esmforum.db');   // uma única conexão para todo o processo

function reconfig(nome) {
  bd = new Database(nome);                   // permite trocar a instância
}
```

**Está completo?** É um Singleton informal. Compartilhar uma única conexão é adequado para o SQLite. As fraquezas são: a variável é global e mutável, e a função `reconfig` (usada pelos testes) abre uma nova conexão sem fechar a anterior. Uma versão mais completa exporia a conexão por uma função de acesso e teria um método para fechá-la.

## 3. Chain of Responsibility (middlewares do Express)

**O que é:** o pedido passa por uma cadeia de tratadores, e cada um decide se o processa e se o repassa.

**Onde:** o Express monta a cadeia com `app.use`. Dois elos são registrados no `server.js`:

```js
app.use(express.json());              // converte o corpo JSON em req.body

app.use((req, res, next) => {         // adiciona os cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  // ...
  next();                             // repassa para o próximo elo
});
```

**Está completo?** É parcial. A cadeia existe e funciona, mas só tem dois elos e não há tratamento de erros nem registro de requisições (*log*). O cabeçalho `Access-Control-Allow-Origin: *` também é permissivo demais para uso real. Um elo de tratamento de erros (`(erro, req, res, next)`) eliminaria os `try/catch` repetidos nas rotas.

## 4. Injeção de dependência (com Test Double)

**O que é:** em vez de um objeto criar suas dependências, elas são fornecidas de fora, o que permite trocá-las (por exemplo, por um objeto de teste).

**Onde:** `reconfig_bd` em `modelo.js` recebe um substituto do banco:

```js
function reconfig_bd(mock_bd) {
  bd = mock_bd;
}
```

usado em `testes/listar_perguntas.test.js`, que passa um mock com `queryAll` e `query`.

**Está completo?** É uma injeção por *setter* sobre estado global do módulo, e não por construtor. Funciona, mas é frágil: a troca vale para todo o módulo e precisa ser desfeita. Em `IMPLEMENTACAO_SOLID.md` a busca usa injeção pelo construtor, que é a forma mais limpa.

## 5. Composite / composição de componentes (frontend)

**O que é:** tratar objetos individuais e composições de objetos de maneira uniforme, montando estruturas em árvore.

**Onde:** no React, a aplicação é uma árvore de componentes. Em `src/index.js` as rotas são aninhadas, e o componente `Menu` renderiza um `<Outlet />` onde entram as páginas filhas:

```jsx
<Route path="/" element={<Menu />}>
  <Route index element={<Pergunta />} />
  <Route path="resposta/:id_pergunta" element={<Resposta />} />
  <Route path="sobre" element={<Sobre />} />
</Route>
```

**Está completo?** É parcial: não é o Composite clássico dos livros (não há uma interface comum com operações sobre folhas e nós), mas reflete a mesma ideia de estruturar a interface como uma árvore de partes intercambiáveis. Um ponto fraco de implementação: em `Pergunta.js` e `Resposta.js`, alguns componentes (`TabelaPerguntas`, `LinhaTabela`) são declarados dentro de outro componente, o que faz o React recriá-los a cada renderização. Movê-los para fora seria melhor.

## Padrão introduzido na Parte 3: Strategy

Não existia no código original, mas passou a existir com a busca: as classes de `busca/estrategias.js` (`BuscaPorTrecho`, `BuscaPorTodasAsPalavras`) são estratégias intercambiáveis usadas pelo `ServicoBusca`. Está completo para o que a busca precisa. A proposta de estendê-lo à ordenação está em `PADROES_PROPOSTOS.md`.

## Padrões que procurei e não encontrei

- **Observer:** não há eventos nem notificações no backend. Seria útil para as notificações de novas respostas (ver `PADROES_PROPOSTOS.md`).
- **Factory:** os objetos são criados diretamente com `new` ou como literais, sem fábricas. Hoje o sistema é pequeno demais para que isso seja um problema.
- **Repository/DAO:** o acesso a dados está dentro de `modelo.js`. A busca introduziu um repositório, mas o restante do sistema ainda não o usa.
