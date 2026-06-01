import { encontrarInimigoMaisProximo } from './pardepontos.js';

const canvasJogo = document.querySelector('#canvasJogo');
const contexto = canvasJogo.getContext('2d');

const elementosPainel = {
  posicaoJogador: document.querySelector('#posicaoJogador'),
  coordenadasInimigo: document.querySelector('#coordenadasInimigo'),
  divisoesRecursivas: document.querySelector('#divisoesRecursivas'),
  comparacoesFaixa: document.querySelector('#comparacoesFaixa'),
  paresInvalidos: document.querySelector('#paresInvalidos'),
  listaDistancias: document.querySelector('#listaDistancias'),
};

const teclasPressionadas = new Set();
const inimigos = [];
const projeteis = [];
const distanciasAnalisadasRecentes = [];

const jogador = {
  x: 0,
  y: 0,
  tamanho: 26,
  velocidade: 260,
};

let larguraCanvas = 0;
let alturaCanvas = 0;
let proximoIdInimigo = 1;
let inimigosDerrotados = 0;
let tempoUltimoFrame = performance.now();
let tempoDesdeSpawn = 0;
let tempoDesdeDisparo = 0;
let tempoDesdeRegistroDistancias = 0;
let proximoIdDistancia = 1;

const intervaloSpawn = 0.85;
const intervaloDisparo = 0.45;
const velocidadeProjetil = 520;
const limiteDistanciasAnalisadas = 5;
const intervaloRegistroDistancias = 0.25;

function ajustarCanvas() {
  const retangulo = canvasJogo.getBoundingClientRect();
  const escalaPixel = window.devicePixelRatio || 1;

  larguraCanvas = retangulo.width;
  alturaCanvas = retangulo.height;
  canvasJogo.width = Math.floor(larguraCanvas * escalaPixel);
  canvasJogo.height = Math.floor(alturaCanvas * escalaPixel);
  contexto.setTransform(escalaPixel, 0, 0, escalaPixel, 0, 0);

  if (jogador.x === 0 && jogador.y === 0) {
    jogador.x = larguraCanvas / 2;
    jogador.y = alturaCanvas / 2;
  }
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function sortearEntre(minimo, maximo) {
  return Math.random() * (maximo - minimo) + minimo;
}

function criarInimigo() {
  const margem = 36;
  const lado = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (lado === 0) {
    x = sortearEntre(0, larguraCanvas);
    y = -margem;
  } else if (lado === 1) {
    x = larguraCanvas + margem;
    y = sortearEntre(0, alturaCanvas);
  } else if (lado === 2) {
    x = sortearEntre(0, larguraCanvas);
    y = alturaCanvas + margem;
  } else {
    x = -margem;
    y = sortearEntre(0, alturaCanvas);
  }

  inimigos.push({
    id: proximoIdInimigo,
    x,
    y,
    vida: 2,
    tamanho: 18,
    velocidade: sortearEntre(56, 92),
  });

  proximoIdInimigo += 1;
}

function atualizarJogador(deltaTempo) {
  let direcaoX = 0;
  let direcaoY = 0;

  if (teclasPressionadas.has('KeyA') || teclasPressionadas.has('ArrowLeft')) {
    direcaoX -= 1;
  }

  if (teclasPressionadas.has('KeyD') || teclasPressionadas.has('ArrowRight')) {
    direcaoX += 1;
  }

  if (teclasPressionadas.has('KeyW') || teclasPressionadas.has('ArrowUp')) {
    direcaoY -= 1;
  }

  if (teclasPressionadas.has('KeyS') || teclasPressionadas.has('ArrowDown')) {
    direcaoY += 1;
  }

  const tamanhoDirecao = Math.hypot(direcaoX, direcaoY) || 1;
  jogador.x += (direcaoX / tamanhoDirecao) * jogador.velocidade * deltaTempo;
  jogador.y += (direcaoY / tamanhoDirecao) * jogador.velocidade * deltaTempo;

  const metade = jogador.tamanho / 2;
  jogador.x = limitar(jogador.x, metade, larguraCanvas - metade);
  jogador.y = limitar(jogador.y, metade, alturaCanvas - metade);
}

function atualizarInimigos(deltaTempo) {
  for (const inimigo of inimigos) {
    if (inimigo.vida <= 0) {
      continue;
    }

    const direcaoX = jogador.x - inimigo.x;
    const direcaoY = jogador.y - inimigo.y;
    const distancia = Math.hypot(direcaoX, direcaoY) || 1;

    inimigo.x += (direcaoX / distancia) * inimigo.velocidade * deltaTempo;
    inimigo.y += (direcaoY / distancia) * inimigo.velocidade * deltaTempo;
  }
}

function dispararNoAlvo(alvo) {
  const direcaoX = alvo.x - jogador.x;
  const direcaoY = alvo.y - jogador.y;
  const distancia = Math.hypot(direcaoX, direcaoY) || 1;

  projeteis.push({
    x: jogador.x,
    y: jogador.y,
    raio: 5,
    velocidadeX: (direcaoX / distancia) * velocidadeProjetil,
    velocidadeY: (direcaoY / distancia) * velocidadeProjetil,
    dano: 1,
  });
}

function atualizarProjeteis(deltaTempo) {
  for (const projetil of projeteis) {
    projetil.x += projetil.velocidadeX * deltaTempo;
    projetil.y += projetil.velocidadeY * deltaTempo;
  }

  for (const projetil of projeteis) {
    if (projetil.remover) {
      continue;
    }

    for (const inimigo of inimigos) {
      if (inimigo.vida <= 0) {
        continue;
      }

      const distancia = Math.hypot(projetil.x - inimigo.x, projetil.y - inimigo.y);
      if (distancia <= projetil.raio + inimigo.tamanho) {
        inimigo.vida -= projetil.dano;
        projetil.remover = true;

        if (inimigo.vida <= 0) {
          inimigosDerrotados += 1;
        }
        break;
      }
    }
  }

  for (let indice = projeteis.length - 1; indice >= 0; indice -= 1) {
    const projetil = projeteis[indice];
    const saiuDaTela =
      projetil.x < -40 ||
      projetil.x > larguraCanvas + 40 ||
      projetil.y < -40 ||
      projetil.y > alturaCanvas + 40;

    if (projetil.remover || saiuDaTela) {
      projeteis.splice(indice, 1);
    }
  }
}

function removerInimigosDerrotados() {
  for (let indice = inimigos.length - 1; indice >= 0; indice -= 1) {
    if (inimigos[indice].vida <= 0) {
      inimigos.splice(indice, 1);
    }
  }
}

function formatarCoordenadasInimigo(inimigo) {
  if (!inimigo) {
    return '-';
  }

  return `x: ${inimigo.x.toFixed(0)}, y: ${inimigo.y.toFixed(0)}`;
}

function registrarDistanciasAnalisadas(resultadoAlvo) {
  for (const item of resultadoAlvo.distanciasCalculadas) {
    distanciasAnalisadasRecentes.push({
      idRegistro: proximoIdDistancia,
      idInimigo: item.id,
      distanciaAoQuadrado: item.distanciaAoQuadrado,
      distanciaReal: item.distanciaReal,
      ehAlvo: resultadoAlvo.inimigo?.id === item.id,
    });
    proximoIdDistancia += 1;
  }

  if (distanciasAnalisadasRecentes.length > limiteDistanciasAnalisadas) {
    distanciasAnalisadasRecentes.splice(
      0,
      distanciasAnalisadasRecentes.length - limiteDistanciasAnalisadas,
    );
  }
}

function atualizarPainel(resultadoAlvo) {
  elementosPainel.posicaoJogador.textContent =
    `x: ${jogador.x.toFixed(0)}, y: ${jogador.y.toFixed(0)}`;
  elementosPainel.coordenadasInimigo.textContent = formatarCoordenadasInimigo(
    resultadoAlvo.inimigo,
  );
  elementosPainel.divisoesRecursivas.textContent = String(resultadoAlvo.divisoesRecursivas);
  elementosPainel.comparacoesFaixa.textContent = String(resultadoAlvo.comparacoesNaFaixa);
  elementosPainel.paresInvalidos.textContent = String(
    resultadoAlvo.paresInvalidosDescartados,
  );

  elementosPainel.listaDistancias.innerHTML = '';
  for (const item of [...distanciasAnalisadasRecentes].reverse()) {
    const itemLista = document.createElement('li');
    itemLista.textContent =
      `${item.idRegistro}. #${item.idInimigo}: d²=${item.distanciaAoQuadrado.toFixed(0)}, d=${item.distanciaReal.toFixed(1)}px`;

    if (item.ehAlvo) {
      itemLista.classList.add('alvo');
    }

    elementosPainel.listaDistancias.appendChild(itemLista);
  }
}

function desenharGrade() {
  contexto.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  contexto.lineWidth = 1;

  for (let x = 0; x < larguraCanvas; x += 48) {
    contexto.beginPath();
    contexto.moveTo(x, 0);
    contexto.lineTo(x, alturaCanvas);
    contexto.stroke();
  }

  for (let y = 0; y < alturaCanvas; y += 48) {
    contexto.beginPath();
    contexto.moveTo(0, y);
    contexto.lineTo(larguraCanvas, y);
    contexto.stroke();
  }
}

function desenharJogador() {
  const metade = jogador.tamanho / 2;
  contexto.fillStyle = '#00c853';
  contexto.fillRect(jogador.x - metade, jogador.y - metade, jogador.tamanho, jogador.tamanho);

  contexto.strokeStyle = '#d7ffd9';
  contexto.lineWidth = 2;
  contexto.strokeRect(jogador.x - metade, jogador.y - metade, jogador.tamanho, jogador.tamanho);
}

function desenharInimigo(inimigo, alvo) {
  const angulo = Math.atan2(jogador.y - inimigo.y, jogador.x - inimigo.x);
  const tamanho = inimigo.tamanho;
  const selecionado = alvo && alvo.id === inimigo.id;

  contexto.save();
  contexto.translate(inimigo.x, inimigo.y);
  contexto.rotate(angulo + Math.PI / 2);

  contexto.beginPath();
  contexto.moveTo(0, -tamanho);
  contexto.lineTo(tamanho * 0.88, tamanho);
  contexto.lineTo(-tamanho * 0.88, tamanho);
  contexto.closePath();

  contexto.fillStyle = '#ff0000';
  contexto.fill();
  contexto.lineWidth = selecionado ? 4 : 2;
  contexto.strokeStyle = selecionado ? '#ffffff' : '#ff8a8a';
  contexto.stroke();
  contexto.restore();

  contexto.fillStyle = '#ffffff';
  contexto.font = '12px Segoe UI, Arial, sans-serif';
  contexto.textAlign = 'center';
  contexto.fillText(`#${inimigo.id}`, inimigo.x, inimigo.y - tamanho - 8);
}

function desenharProjeteis() {
  contexto.fillStyle = '#f8f32b';

  for (const projetil of projeteis) {
    contexto.beginPath();
    contexto.arc(projetil.x, projetil.y, projetil.raio, 0, Math.PI * 2);
    contexto.fill();
  }
}

function desenharIndicadorAlvo(alvo) {
  if (!alvo) {
    return;
  }

  contexto.strokeStyle = 'rgba(255, 209, 102, 0.8)';
  contexto.lineWidth = 2;
  contexto.setLineDash([8, 8]);
  contexto.beginPath();
  contexto.moveTo(jogador.x, jogador.y);
  contexto.lineTo(alvo.x, alvo.y);
  contexto.stroke();
  contexto.setLineDash([]);
}

function desenhar(resultadoAlvo) {
  contexto.clearRect(0, 0, larguraCanvas, alturaCanvas);
  desenharGrade();
  desenharIndicadorAlvo(resultadoAlvo.inimigo);
  desenharProjeteis();

  for (const inimigo of inimigos) {
    desenharInimigo(inimigo, resultadoAlvo.inimigo);
  }

  desenharJogador();
}

function atualizarJogo(tempoAtual) {
  const deltaTempo = Math.min((tempoAtual - tempoUltimoFrame) / 1000, 0.05);
  tempoUltimoFrame = tempoAtual;

  tempoDesdeSpawn += deltaTempo;
  tempoDesdeDisparo += deltaTempo;
  tempoDesdeRegistroDistancias += deltaTempo;

  if (tempoDesdeSpawn >= intervaloSpawn) {
    criarInimigo();
    tempoDesdeSpawn = 0;
  }

  atualizarJogador(deltaTempo);
  atualizarInimigos(deltaTempo);

  const resultadoAlvo = encontrarInimigoMaisProximo(jogador, inimigos);

  if (resultadoAlvo.inimigo && tempoDesdeDisparo >= intervaloDisparo) {
    dispararNoAlvo(resultadoAlvo.inimigo);
    tempoDesdeDisparo = 0;
  }

  atualizarProjeteis(deltaTempo);
  removerInimigosDerrotados();

  const resultadoAtualizado = encontrarInimigoMaisProximo(jogador, inimigos);
  if (tempoDesdeRegistroDistancias >= intervaloRegistroDistancias) {
    registrarDistanciasAnalisadas(resultadoAtualizado);
    tempoDesdeRegistroDistancias = 0;
  }

  atualizarPainel(resultadoAtualizado);
  desenhar(resultadoAtualizado);

  requestAnimationFrame(atualizarJogo);
}

window.addEventListener('keydown', (evento) => {
  teclasPressionadas.add(evento.code);
});

window.addEventListener('keyup', (evento) => {
  teclasPressionadas.delete(evento.code);
});

window.addEventListener('resize', ajustarCanvas);

ajustarCanvas();
for (let contador = 0; contador < 4; contador += 1) {
  criarInimigo();
}
requestAnimationFrame(atualizarJogo);
