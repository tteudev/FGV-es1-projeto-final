# Instalação e execução do ESM Forum

Este documento descreve como configurei o ambiente de desenvolvimento do ESM Forum na minha máquina (Windows 11) e os problemas que encontrei no caminho. O sistema é dividido em dois repositórios:

| Parte | Repositório (meu fork) | Original |
|---|---|---|
| Backend (Node.js, Express, SQLite) | https://github.com/tteudev/FGV-es1-projeto-final | https://github.com/jeffsantos/esmforum |
| Frontend (React) | https://github.com/tteudev/FGV-es1-projeto-final-frontend | https://github.com/jeffsantos/esmforum-react |

## Ambiente utilizado

- Windows 11 Home
- Node.js v24.16.0 e npm 11.13.0
- Git 2.54 e GitHub CLI (`gh`) 2.98

## 1. Fork e clone

Fiz o fork e o clone dos dois repositórios com o GitHub CLI:

```console
gh repo fork jeffsantos/esmforum --clone
gh repo fork jeffsantos/esmforum-react --clone
```

Esse comando já configura o remoto `origin` (meu fork) e o remoto `upstream` (repositório original), o que permite buscar atualizações do original com `git fetch upstream`. Sem o GitHub CLI, o equivalente é fazer o fork pela interface do GitHub, clonar com `git clone` e adicionar o `upstream` com `git remote add upstream <url-do-original>`.

## 2. Backend

```console
cd esmforum
npm install
node server.js
```

O servidor sobe na porta **5000** e imprime `ESM Forum rodando em 5000`.

Para rodar os testes de unidade e de integração:

```console
npx jest
```

Todos os testes existentes passaram (2 suítes, 3 testes).

Para "zerar" o banco de dados, o projeto traz o script `bd/criar_bd.sh`, que usa o utilitário de linha de comando `sqlite3`. Ele só é necessário para isso: para executar o sistema e os testes basta o `npm install`, porque o acesso ao banco é feito pela biblioteca `better-sqlite3`.

### Problema 1: `npm install` falha ao compilar o `better-sqlite3`

**Sintoma.** Logo no primeiro `npm install` apareceu:

```
gyp ERR! find VS You need to install the latest version of Visual Studio
gyp ERR! find VS including the "Desktop development with C++" workload.
```

**Causa.** O `package.json` original pedia `better-sqlite3@^11.0.0`. Essa versão não tem binário pré-compilado para o Node 24, então o npm tenta compilar o módulo nativo com `node-gyp`, o que exige o Visual Studio com o componente C++ instalado.

**Solução.** Em vez de instalar o Visual Studio (vários GB), atualizei a dependência para uma versão que já publica binários para o Node 24:

```console
npm install better-sqlite3@latest
```

Isso alterou o `package.json` e o `package-lock.json` (de `^11.0.0` para a série 13, que exige Node 22 ou superior). Depois disso a instalação concluiu sem compilar nada e os testes passaram. Se o seu Node for anterior ao 22, use a versão original ou atualize o Node.

### Problema 2: `127.0.0.1` não responde, mas `localhost` sim

No `server.js` o servidor escuta em `localhost`. No Node 24 esse nome resolveu apenas para o endereço IPv6 (`::1`), então uma requisição para `http://127.0.0.1:5000` falha, enquanto `http://localhost:5000` e `http://[::1]:5000` funcionam. O frontend usa `localhost`, então nada precisou ser mudado. Em ferramentas como Postman ou Thunder Client, use `localhost` (ou `[::1]`).

### Problema 3: `sqlite3` falha a instalação em um ambiente limpo

Ao testar a instalação do zero em uma pasta nova, o `npm install` voltou a falhar, agora no pacote `sqlite3`:

```
prebuild-install warn install No prebuilt binaries found
gyp ERR! find VS You need to install the latest version of Visual Studio
```

O `package.json` listava dois pacotes de SQLite, `better-sqlite3` e `sqlite3`, mas o código só usa o primeiro (`bd/bd_utils.js`; uma busca por `require('sqlite3')` no projeto não encontra nada). Como o `sqlite3` também precisa compilar quando não há binário, ele quebrava a instalação sem ter utilidade. Removi a dependência:

```console
npm uninstall sqlite3
```

Depois disso a instalação em pasta limpa e os testes passaram.

### Como testei o backend

Com o servidor rodando, `GET http://localhost:5000/` retornou a lista de perguntas do banco em JSON, por exemplo:

```json
[{"id_pergunta":1,"texto":"3+3","id_usuario":1,"num_respostas":0}]
```

## 3. Frontend

Com o backend em execução, em outro terminal:

```console
cd esmforum-react
npm install
npm start
```

O frontend abre em `http://localhost:3000` e consome a API em `http://localhost:5000` (o endereço está escrito diretamente nos arquivos de `src/pages/`). Por isso o backend precisa estar no ar antes.

Para verificar apenas se o código compila, sem abrir o navegador:

```console
npm run build
```

O build de produção concluiu com sucesso. O `npm install` mostra avisos de vulnerabilidades em dependências de desenvolvimento do `react-scripts`; não são relevantes para este projeto didático e não usei `npm audit fix --force`, que poderia quebrar a aplicação.

## 4. Resumo do passo a passo

1. Instalar Node.js 22 ou superior e Git.
2. Clonar os dois repositórios.
3. `cd esmforum && npm install && node server.js` (terminal 1).
4. `cd esmforum-react && npm install && npm start` (terminal 2).
5. Abrir `http://localhost:3000`.

## 5. Problemas comuns

| Problema | O que fazer |
|---|---|
| `gyp ERR! find VS` no `npm install` do backend | Atualizar o `better-sqlite3` (Problema 1), remover o `sqlite3` que não é usado (Problema 3) ou instalar o Visual Studio com o componente "Desenvolvimento para desktop com C++" |
| `127.0.0.1:5000` não conecta | Usar `localhost:5000` ou `[::1]:5000` (Problema 2) |
| Frontend abre, mas a lista de perguntas fica vazia | Conferir se o backend está rodando na porta 5000 |
| `Error: listen EADDRINUSE :::5000` | Já existe um processo usando a porta; encerrá-lo antes de subir o servidor de novo |
| Testes alteram o arquivo `bd/esmforum-teste.db` | É esperado, pois o teste de integração grava nesse banco; não é preciso versionar essa alteração |
