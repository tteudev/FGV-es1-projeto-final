# Histórias de Usuário

Das cinco funcionalidades solicitadas pelo cliente, escolhi três para escrever as histórias: **busca por palavra-chave**, **votação em perguntas** e **categorização por tags**. Elas são as três primeiras do quadro Kanban (ver `PROCESSO.md`) e não dependem do conceito de usuário autenticado, que o sistema ainda não tem: hoje toda pergunta é gravada com `id_usuario = 1` (`modelo.js`). Por isso, nas histórias que precisam identificar quem age, o usuário é representado apenas pelo seu `id_usuario`.

## Priorização

| Ordem | História | Justificativa |
|---|---|---|
| 1ª | Busca por palavra-chave | Maior valor imediato: com o crescimento do fórum, a lista única de perguntas deixa de ser navegável. Tem escopo pequeno e nenhuma dependência, o que reduz o risco. Também é a funcionalidade que implemento no código (Parte 3) |
| 2ª | Sistema de votação | Dá aos usuários um jeito de destacar as boas perguntas. Exige uma nova tabela e regras de negócio (um voto por usuário), e precisa identificar o usuário, mas com o `id_usuario` já existente é viável |
| 3ª | Categorização por tags | Melhora a organização e complementa a busca, mas exige uma relação N:N entre perguntas e tags e alterações na tela de cadastro, por isso vem depois. Seu valor cresce quando já existem muitas perguntas para organizar |

Critérios usados: valor para o usuário, dependências entre histórias e esforço estimado. Como a busca é a de menor esforço e maior valor, fica em primeiro lugar.

---

## História 1: Busca por palavra-chave

**Como** usuário do fórum,
**Eu quero** buscar perguntas digitando uma palavra-chave,
**Para** encontrar rapidamente perguntas sobre um assunto sem precisar percorrer toda a lista.

**Critérios de Aceitação:**
- [ ] A página de perguntas exibe um campo de busca
- [ ] Ao buscar por um termo, a lista mostra apenas as perguntas cujo texto contém o termo, sem diferenciar maiúsculas de minúsculas
- [ ] Cada pergunta encontrada continua exibindo seu número de respostas e o link para as respostas
- [ ] Se nenhuma pergunta for encontrada, o sistema exibe a mensagem "Nenhuma pergunta encontrada"
- [ ] Ao limpar o campo de busca, a lista completa de perguntas volta a ser exibida

---

## História 2: Sistema de votação

**Como** usuário do fórum,
**Eu quero** votar em perguntas (upvote/downvote),
**Para** destacar perguntas úteis e relevantes para a comunidade.

**Critérios de Aceitação:**
- [ ] Cada pergunta exibe botões de upvote e downvote e o saldo de votos (votos positivos menos negativos)
- [ ] Ao votar, o saldo exibido é atualizado sem recarregar a página
- [ ] Um usuário pode mudar seu voto (de upvote para downvote e vice-versa), e o saldo reflete a troca
- [ ] Um usuário não pode votar mais de uma vez na mesma pergunta: repetir o mesmo voto o retira
- [ ] Votar em uma pergunta que não existe retorna um erro claro e não altera nenhum dado

---

## História 3: Categorização por tags

**Como** usuário do fórum,
**Eu quero** classificar minhas perguntas com tags (como tecnologia, carreira e dúvidas-gerais),
**Para** organizar o conteúdo e permitir que outros usuários encontrem perguntas do seu interesse.

**Critérios de Aceitação:**
- [ ] Ao cadastrar uma pergunta, o usuário pode escolher uma ou mais tags de uma lista predefinida
- [ ] Uma pergunta sem nenhuma tag continua sendo aceita e recebe a tag "dúvidas-gerais"
- [ ] A lista de perguntas exibe as tags de cada pergunta
- [ ] O usuário pode filtrar a lista clicando em uma tag, vendo somente as perguntas com aquela tag
- [ ] Tags que não existem na lista predefinida são rejeitadas com uma mensagem de erro
