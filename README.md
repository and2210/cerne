# Cerne

**Uma árvore de cada vez.** Protótipo 2D da interação central de um roguelite, focado na sensação de caminhar até uma árvore, preparar o machado, acertar o golpe e acompanhar a queda.

Feito com HTML, CSS e JavaScript, usando Canvas 2D para o desenho e Web Audio para o som. Arte e áudio são gerados pelo próprio jogo: não há dependências externas, instalação de pacotes ou etapa de compilação.

## Jogar em outro computador

Entre na sua conta do GitHub, abra este repositório e escolha **Code → Download ZIP**. Extraia o ZIP inteiro e abra `index.html` em um navegador moderno, como Chrome, Edge ou Firefox. Mantenha `game.js` e `style.css` na mesma pasta do HTML.

Depois de baixar os arquivos, o jogo funciona sem internet. Node.js, Python e Git não são necessários para jogar. O endereço `127.0.0.1:8765` usado na prévia pertence ao computador onde o servidor foi iniciado; ele não transfere o jogo para outra máquina.

Para continuar o desenvolvimento com Git:

```sh
git clone https://github.com/and2210/cerne.git
cd cerne
```

Se o repositório estiver privado, autentique o Git com uma conta que tenha acesso.

## Controles

| Ação | Controle |
| --- | --- |
| Caminhar | WASD ou setas |
| Preparar o machado | Segurar espaço ou o botão esquerdo do mouse |
| Golpear | Soltar o botão; a faixa dourada indica o melhor momento |
| Pausar / continuar | Esc |
| Ativar / desativar som | M |

Clique na área do jogo para dar foco aos controles. O som é liberado após a primeira interação. Botões de toque aparecem em dispositivos compatíveis.

## O que já funciona

Movimentação com aceleração e frenagem rápidas, variações na caminhada, antecipação e recuperação do machado, trilha visual do golpe, pausa curta no impacto, vibração da câmera, oscilação física da árvore, lascas com gravidade, folhas, poeira e sons com pequenas variações.

A árvore tem 10 pontos de resistência. Golpes rápidos causam 1 de dano, carregados causam 2 e golpes soltos na faixa dourada causam 3. É necessário estar perto do tronco para acertar. Ao ser derrubada, a árvore cai, produz um impacto no chão e deixa um toco. Depois da animação, há um intervalo de 2,2 segundos antes do crescimento da próxima árvore no mesmo lugar.

A preferência de movimento reduzido do sistema desativa tremores, flashes e pausas no impacto. O contador de árvores vale apenas para a sessão e é zerado ao recarregar a página.

## Desenvolver e testar

Edite os arquivos e recarregue a página. Se preferir servir o jogo por HTTP e tiver Python 3 instalado, execute na pasta do repositório:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

No mesmo computador, abra **http://127.0.0.1:8765**. Encerre o servidor com `Ctrl+C`.

Os testes de lógica usam apenas módulos nativos do Node.js (validados com Node.js 24):

```sh
node --check game.js
node tests/check-game.cjs
```

Eles verificam alcance, dano, um acerto por golpe, cinco ciclos de queda e renascimento, bloqueio de dano durante o intervalo, movimento, frenagem, reinicialização dos controles na pausa e limites de movimento em uma tela estreita. O teste usa uma simulação do navegador e do Canvas; não substitui jogar para avaliar animações, áudio ou sensação de impacto.

## Arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Interface e entrada do jogo |
| `style.css` | Aparência e adaptação da interface à tela |
| `game.js` | Movimento, golpes, árvore, desenho e áudio |
| `tests/check-game.cjs` | Verificações automatizadas de lógica |
| `LEIA-ME.md` | Guia rápido original do protótipo |

## Escopo desta etapa

Este é o primeiro protótipo da ação de cortar madeira, ainda sem combate, inventário, melhorias, salvamento ou progressão roguelite. O objetivo é avaliar e ajustar o peso do golpe e o ritmo de repetição antes de expandir o jogo.
