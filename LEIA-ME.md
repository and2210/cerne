# Cerne

Protótipo da interação central de um roguelite: caminhar, preparar o machado e derrubar uma árvore. Abra `index.html` em um navegador moderno. Não exige instalação, internet ou servidor.

**WASD / setas:** mover. **Espaço / botão esquerdo:** segurar para preparar, soltar para golpear. Soltar na faixa dourada produz um golpe mais forte. **Esc:** pausar. **M:** alternar som. Controles de toque aparecem em dispositivos compatíveis.

Aproxime-se do tronco. Golpes rápidos causam 1 de dano, carregados 2 e golpes na faixa dourada 3. A árvore tem 10 pontos de resistência. Ela cai, deixa um toco e outra cresce após 2,2 segundos. O contador vale apenas para a sessão atual.

O protótipo inclui aceleração e frenagem rápidas, animação procedural de caminhada, antecipação e recuperação do golpe, pausa curta no impacto, vibração da câmera, oscilação física da árvore, lascas com gravidade, folhas, poeira, som sintetizado com variação e queda com impacto próprio. A preferência de movimento reduzido do sistema desativa tremores, flashes e pausas no impacto.

Arte e som são gerados pelo próprio jogo. O som começa após a primeira interação, conforme a política dos navegadores. Esta etapa não inclui combate, inventário ou progressão roguelite; o foco é validar a sensação de cortar madeira.

Para ajustar o comportamento, edite `game.js`. A apresentação está em `style.css`, e a interface em `index.html`.
