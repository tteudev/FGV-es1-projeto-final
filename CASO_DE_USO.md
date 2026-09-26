# Caso de Uso Detalhado

Escolhi detalhar a **História 2 (Sistema de votação)** de `HISTORIAS.md`. Ela tem regras de negócio mais ricas que as outras, com fluxos alternativos naturais (trocar o voto, retirar o voto, pergunta inexistente).

## Caso de Uso: Votar em Pergunta

**Atores:**
- Usuário do fórum (ator principal), identificado pelo seu `id_usuario`. Na versão atual do sistema não há login: o usuário padrão é o de `id_usuario = 1`.

**Pré-condições:**
- O backend e o frontend estão em execução.
- O usuário está identificado no sistema (possui um `id_usuario`).
- A pergunta que será votada existe no banco de dados.

**Fluxo Principal (primeiro voto do usuário na pergunta):**
1. O sistema exibe a lista de perguntas, cada uma com botões de upvote e downvote e o saldo atual de votos.
2. O usuário clica no botão de upvote (ou de downvote) de uma pergunta.
3. O frontend envia ao servidor a requisição `POST /perguntas/:id_pergunta/votos` com o `id_usuario` e o valor do voto (+1 ou -1).
4. O sistema verifica que a pergunta existe.
5. O sistema verifica se o usuário já votou nesta pergunta e constata que não.
6. O sistema registra o voto no banco de dados.
7. O sistema recalcula o saldo de votos da pergunta (soma dos valores dos votos).
8. O sistema devolve o novo saldo e o voto atual do usuário.
9. O frontend atualiza o saldo na tela e destaca o botão escolhido.

**Fluxos Alternativos:**

*Alternativo 1: usuário já votou com o valor oposto (trocar o voto)*
5a. O sistema constata que o usuário já votou nesta pergunta com valor diferente do atual.
5b. O sistema substitui o voto anterior pelo novo (o saldo varia em 2 unidades).
5c. Retorna ao passo 7 do fluxo principal.

*Alternativo 2: usuário repete o mesmo voto (retirar o voto)*
5a. O sistema constata que o usuário já votou nesta pergunta com o mesmo valor.
5b. O sistema remove o voto do usuário.
5c. Retorna ao passo 7 do fluxo principal; o passo 9 remove o destaque do botão.

*Alternativo 3: pergunta inexistente*
4a. O sistema constata que não existe pergunta com o identificador informado.
4b. O sistema devolve o erro 404 com a mensagem "Pergunta não encontrada" e não altera o banco.
4c. O frontend exibe a mensagem de erro ao usuário. O caso de uso termina.

*Alternativo 4: valor de voto inválido*
3a. O valor enviado não é +1 nem -1.
3b. O sistema devolve o erro 400 com a mensagem "Voto inválido" e não altera o banco. O caso de uso termina.

**Pós-condições:**
- Sucesso: existe no máximo um voto do usuário para a pergunta; o saldo de votos exibido corresponde à soma dos votos registrados no banco.
- Falha (fluxos 3 e 4): o banco de dados permanece inalterado.

**Regras de negócio:**
- RN1: um usuário só pode ter um voto por pergunta (garantido no banco por uma restrição de unicidade sobre o par pergunta e usuário).
- RN2: o valor do voto é +1 (upvote) ou -1 (downvote).
- RN3: o saldo de votos de uma pergunta é a soma dos valores dos seus votos.
