# Planejamento de Pair Programming

Estou desenvolvendo este projeto de forma individual. Este documento descreve como eu aplicaria o pair programming no desenvolvimento das cinco funcionalidades do ESM Forum se tivesse um par, e como adaptei alguns dos seus benefícios ao trabalho sozinho.

## 1. Estratégia

Em pair programming, duas pessoas trabalham juntas em um único código: uma escreve (**driver**) e a outra revisa e pensa à frente (**navigator**). A prática traz revisão contínua de código, difusão de conhecimento e menos defeitos, ao custo de ter duas pessoas ocupadas na mesma tarefa. Por isso eu não usaria pair programming o tempo todo, e sim nos pontos em que ele mais compensa.

### Onde eu aplicaria

| Funcionalidade | Usar pair? | Motivo |
|---|---|---|
| Sistema de votação | Sim | Envolve regras fáceis de errar (um voto por usuário, troca de voto) e mudança no esquema do banco |
| Busca por palavra-chave | Sim, no design | A estrutura (separação de responsabilidades e estratégias de busca) é uma decisão que se beneficia de duas opiniões |
| Categorização (tags) | Parcial | Relação N:N entre perguntas e tags e ajuste na interface; o resto é rotina |
| Perfil de usuário | Sim | Exige criar o conceito de usuário, hoje inexistente (o `id_usuario` é fixo em 1), com impacto em todo o sistema |
| Notificações | Sim, no design | Decisão de arquitetura (como e quando notificar) que afeta várias partes |

Trabalho rotineiro, como ajustar textos, criar botões simples ou atualizar documentação, eu faria sozinho, pois o ganho do pareamento é pequeno.

### Como seria uma sessão

1. **Alinhamento (5 min):** o par lê o card do GitHub Projects e combina o objetivo da sessão e o critério de "pronto".
2. **Sessões curtas com troca de papéis** (ver seção 3).
3. **Teste primeiro, quando possível:** o navigator descreve o comportamento esperado e o driver escreve o teste no Jest antes do código.
4. **Fechamento (5 min):** rodar os testes (`npx jest`), fazer o commit e mover o card no quadro.

## 2. Ferramentas

Como o trabalho seria a distância, usaria:

- **VS Code Live Share:** edição colaborativa em tempo real no mesmo projeto, com cursores e terminal compartilhados. É a principal ferramenta, pois o navigator pode apontar trechos e também editar quando necessário.
- **Discord ou Google Meet:** áudio (e vídeo, se possível) para conversar durante a sessão. A comunicação verbal constante é o que diferencia pair programming de revisão de código.
- **GitHub (branches e pull requests):** cada funcionalidade em um branch próprio; a dupla faz os commits alternadamente, e a mensagem de cada commit pode citar o nome do par.
- **GitHub Projects:** para acompanhar o card em andamento.
- **Terminal integrado do VS Code:** para rodar backend, frontend e testes sem sair do editor.

## 3. Rotação de papéis

Eu usaria uma rotação por tempo, no estilo Pomodoro:

- Ciclos de **25 minutos**, seguidos de **5 minutos** de pausa e troca de papéis.
- Ao trocar, o novo driver assume o teclado com o código exatamente no estado em que está, sem explicações longas.
- A cada quatro ciclos, uma pausa maior de 15 minutos.
- Se o driver travar por mais de 5 minutos, o navigator assume o teclado antes do fim do ciclo.

**Divisão de responsabilidades:**

| Papel | Faz | Não faz |
|---|---|---|
| Driver | Escreve o código e executa os testes, pensando na tarefa imediata | Decidir a arquitetura sozinho |
| Navigator | Revisa cada linha, pensa no próximo passo, procura casos de borda e consulta a documentação | Ditar caractere por caractere o que o driver deve digitar |

## 4. O que faço no trabalho individual

Sem um par, tento reproduzir alguns efeitos da prática:

- **Alternar "chapéus":** separo momentos de escrever código e momentos de revisá-lo com outro olhar, usando os ciclos de 25 minutos acima.
- **Explicar em voz alta** (*rubber duck debugging*) o que o código faz antes do commit.
- **Revisar o próprio diff** (`git diff`) antes de cada commit.
- **Commits pequenos** e testes antes ou junto do código, para que o histórico mostre a evolução em passos curtos.
- **Registrar decisões** de design nos arquivos `.md` do repositório, para que "outro par de olhos", inclusive eu mesmo semanas depois, entenda os motivos.

## 5. Riscos e como lidar

- **Diferença de ritmo ou de conhecimento entre o par:** o navigator explica as decisões, e o driver pode pedir uma pausa para entender.
- **Cansaço:** manter os ciclos curtos e as pausas obrigatórias.
- **Custo:** limitar o pair programming aos pontos críticos da tabela da seção 1.
