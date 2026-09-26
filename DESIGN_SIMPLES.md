# Design Simples (YAGNI) no ESM Forum

O princípio de design simples do XP diz que devemos implementar apenas o que é necessário para os requisitos atuais (*You Aren't Gonna Need It*), sem antecipar necessidades futuras que talvez nunca existam. Neste documento analiso o backend do ESM Forum sob essa ótica.

**Observação sobre os arquivos analisados.** O enunciado menciona `routes/perguntas.js` e `routes/respostas.js`, mas o repositório não tem essas pastas. O backend é formado por três arquivos, e são eles que analiso:

- `server.js`: define os endpoints da API REST com o Express (faz o papel dos "routes").
- `modelo.js`: contém as funções de negócio e de acesso às perguntas e respostas (faz o papel dos "models").
- `bd/bd_utils.js`: pequeno utilitário sobre o `better-sqlite3`.

## 1. Aspectos que seguem o design simples

### 1.1 Não existe um sistema de usuários (`modelo.js`)

```js
function cadastrar_pergunta(texto) {
  const params = [texto, 1];
  const result = bd.exec('INSERT INTO perguntas (texto, id_usuario) VALUES(?, ?) RETURNING id_pergunta', params);
  return result.lastInsertRowid;
}
```

O autor da pergunta é sempre o usuário `1`. Não há tabela de usuários, cadastro, login nem sessão. Um sistema completo de autenticação seria desnecessário para o objetivo do fórum (demonstrar perguntas e respostas), então o código guarda só a coluna `id_usuario` e adia o resto. É um exemplo direto de YAGNI: o custo de não ter usuários é baixo, e se o requisito surgir (como no perfil de usuário pedido pelo cliente) ele será implementado nessa hora.

### 1.2 O acesso ao banco é uma camada mínima (`bd/bd_utils.js`)

```js
function query(query, params) {
  return bd.prepare(query).get(params);
}

function queryAll(query, params) {
  return bd.prepare(query).all(params);
}

function exec(statement, params) {
  return bd.prepare(statement).run(params);
}
```

Em vez de um ORM, de um padrão Repository completo ou de uma camada genérica de DAOs, o projeto tem três funções de uma linha cada. Elas escondem o `prepare` do `better-sqlite3` e nada mais. O SQL fica visível em `modelo.js`, o que facilita ler e depurar. Um ORM traria configuração, mapeamentos e dependências que o sistema, com duas tabelas, não justifica.

### 1.3 O esquema do banco tem apenas o essencial (`bd/schema.sql`)

```sql
create table perguntas (
  id_pergunta  integer unique not null primary key autoincrement,
  texto        text not null,
  id_usuario   integer not null
);

create table respostas (
  id_resposta  integer unique not null primary key autoincrement,
  id_pergunta  integer not null,
  texto        text not null
);
```

Não há colunas de data, votos, status, título ou categoria, que são coisas que "um dia" poderiam ser úteis. Cada campo existente é usado pela API. Quando as funcionalidades pedidas (votos, tags, etc.) entrarem, o esquema evolui junto com elas.

### 1.4 Controlador e modelo em um arquivo cada (`server.js` e `modelo.js`)

O `server.js` tem 65 linhas e registra quatro rotas diretamente. Não há pastas de controllers, services, middlewares próprios ou injeção de dependência. Para o tamanho atual do sistema, essa estrutura é suficiente e fácil de entender de uma vez só.

Um exemplo da simplicidade do controlador é o tratamento manual do CORS, feito com três linhas, sem instalar o pacote `cors`:

```js
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

### 1.5 Testabilidade sem framework de injeção (`modelo.js`)

```js
var bd = require('./bd/bd_utils.js');

// usada pelo teste de unidade
// para que o modelo passe a usar uma versão "mockada" de bd
function reconfig_bd(mock_bd) {
  bd = mock_bd;
}
```

Para poder testar o modelo sem banco real, foi criada uma única função que troca a dependência. Não foi necessário um contêiner de injeção de dependências nem interfaces. É a solução mais simples que resolve o problema concreto (o teste em `testes/listar_perguntas.test.js`).

## 2. Oportunidades de simplificação

### 2.1 Consulta N+1 em `listar_perguntas`

```js
function listar_perguntas() {
  const perguntas = bd.queryAll('select * from perguntas', []);
  perguntas.forEach(pergunta => pergunta['num_respostas'] = get_num_respostas(pergunta['id_pergunta']));
  return perguntas;
}
```

Para cada pergunta é executada uma segunda consulta (`get_num_respostas`). Com 100 perguntas são 101 consultas. Uma única consulta com junção resolve o mesmo problema com menos código e menos idas ao banco:

```js
function listar_perguntas() {
  return bd.queryAll(`
    select p.*, count(r.id_resposta) as num_respostas
    from perguntas p
    left join respostas r on r.id_pergunta = p.id_pergunta
    group by p.id_pergunta`, []);
}
```

Ressalva: o teste de unidade `listar_perguntas.test.js` simula duas funções do banco (`queryAll` e `query`) e depende do formato atual. Se a simplificação for feita, esse teste precisa ser ajustado, e isso deve ser feito no mesmo commit.

### 2.2 Tratamento de erros repetido e inconsistente em `server.js`

Todas as rotas repetem o mesmo bloco `try/catch`:

```js
  catch(erro) {
    res.status(500).json(erro.message);
  }
```

Além da repetição, a rota `GET /respostas/:id_pergunta` chama o modelo **fora** do `try`:

```js
app.get('/respostas/:id_pergunta', (req, res) => {
  const id_pergunta = req.params.id_pergunta;
  const pergunta = modelo.get_pergunta(id_pergunta);   // fora do try
  const respostas = modelo.get_respostas(id_pergunta); // fora do try
  try {
    res.json({ pergunta: pergunta, respostas: respostas });
  }
```

Se uma dessas chamadas lançar uma exceção, o erro não é capturado pelo `catch`, e o tratamento que existe cobre apenas o `res.json`. Uma simplificação é usar o tratamento de erros do próprio Express (um único *middleware* de erro com quatro parâmetros, `(erro, req, res, next)`), removendo os `try/catch` das rotas. Isso reduz código e corrige a inconsistência. Em Express 4, exceções síncronas dentro de um handler já são encaminhadas a esse middleware, então nenhuma biblioteca extra é necessária.

Cuidado para não exagerar: criar uma hierarquia de classes de erro ou um framework de tratamento seria o oposto do princípio que estamos estudando.

### 2.3 Pequenas inconsistências que atrapalham a leitura

- O comentário de `listar_perguntas` diz `texto: int`, mas `texto` é uma string.
- Existem duas dependências de SQLite no `package.json` (`better-sqlite3` e `sqlite3`), mas o código só usa a primeira. Remover `sqlite3` reduz o tempo de instalação e a superfície de problemas.
- A documentação em `docs/arquitetura.md` descreve o endpoint como `GET /respostas/?id_pergunta=n`, mas o código usa parâmetro de caminho (`GET /respostas/:id_pergunta`).

São mudanças pequenas que tornam o sistema mais fácil de entender sem acrescentar nada novo, o que é coerente com o design simples.

## 3. Conclusão

O código atual é um bom exemplo de design simples: implementa só o necessário, evita abstrações antecipadas e é pequeno o suficiente para ser lido inteiro. As oportunidades de melhoria que encontrei são de remoção de duplicação e de inconsistências, e não de acréscimo de estrutura. Ao implementar as novas funcionalidades, pretendo manter o mesmo critério: só criar uma abstração quando houver um motivo concreto para ela, como aconteceu com a busca (veja `IMPLEMENTACAO_SOLID.md`).
