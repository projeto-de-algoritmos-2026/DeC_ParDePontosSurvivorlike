export function distanciaAoQuadrado(pontoA, pontoB) {
  const diferencaX = pontoA.x - pontoB.x;
  const diferencaY = pontoA.y - pontoB.y;
  return diferencaX * diferencaX + diferencaY * diferencaY;
}

function criarPontos(jogador, inimigos) {
  const pontos = [
    {
      chave: 'jogador',
      tipo: 'jogador',
      id: 'jogador',
      x: jogador.x,
      y: jogador.y,
      referencia: jogador,
    },
  ];

  for (const inimigo of inimigos) {
    if (inimigo.vida <= 0) {
      continue;
    }

    pontos.push({
      chave: `inimigo-${inimigo.id}`,
      tipo: 'inimigo',
      id: inimigo.id,
      x: inimigo.x,
      y: inimigo.y,
      referencia: inimigo,
    });
  }

  return pontos;
}

function parValido(pontoA, pontoB) {
  return (
    (pontoA.tipo === 'jogador' && pontoB.tipo === 'inimigo') ||
    (pontoA.tipo === 'inimigo' && pontoB.tipo === 'jogador')
  );
}

function chaveDoPar(pontoA, pontoB) {
  return [pontoA.chave, pontoB.chave].sort().join('|');
}

function escolherMelhor(resultadoA, resultadoB) {
  if (!resultadoA) {
    return resultadoB;
  }

  if (!resultadoB) {
    return resultadoA;
  }

  return resultadoB.distanciaAoQuadrado < resultadoA.distanciaAoQuadrado
    ? resultadoB
    : resultadoA;
}

function avaliarPar(pontoA, pontoB, estado) {
  const chave = chaveDoPar(pontoA, pontoB);

  if (!parValido(pontoA, pontoB)) {
    if (!estado.paresInvalidos.has(chave)) {
      estado.paresInvalidos.add(chave);
      estado.paresInvalidosDescartados += 1;
    }
    return null;
  }

  if (estado.paresComparados.has(chave)) {
    return null;
  }

  estado.paresComparados.add(chave);
  estado.comparacoes += 1;

  const pontoInimigo = pontoA.tipo === 'inimigo' ? pontoA : pontoB;
  const distanciaQuadrada = distanciaAoQuadrado(pontoA, pontoB);
  const distanciaReal = Math.sqrt(distanciaQuadrada);

  estado.distanciasCalculadas.push({
    id: pontoInimigo.id,
    x: pontoInimigo.x,
    y: pontoInimigo.y,
    distanciaAoQuadrado: distanciaQuadrada,
    distanciaReal,
  });

  return {
    inimigo: pontoInimigo.referencia,
    distanciaReal,
    distanciaAoQuadrado: distanciaQuadrada,
  };
}

function forcaBrutaRestrita(pontos, estado) {
  let melhorResultado = null;

  for (let indiceA = 0; indiceA < pontos.length; indiceA += 1) {
    for (let indiceB = indiceA + 1; indiceB < pontos.length; indiceB += 1) {
      melhorResultado = escolherMelhor(
        melhorResultado,
        avaliarPar(pontos[indiceA], pontos[indiceB], estado),
      );
    }
  }

  return melhorResultado;
}

function buscarParMaisProximo(pontosOrdenadosPorX, pontosOrdenadosPorY, estado) {
  if (pontosOrdenadosPorX.length <= 3) {
    return forcaBrutaRestrita(pontosOrdenadosPorX, estado);
  }

  estado.divisoesRecursivas += 1;

  const meio = Math.floor(pontosOrdenadosPorX.length / 2);
  const esquerdaPorX = pontosOrdenadosPorX.slice(0, meio);
  const direitaPorX = pontosOrdenadosPorX.slice(meio);
  const xDivisao = pontosOrdenadosPorX[meio].x;
  const chavesDaEsquerda = new Set(esquerdaPorX.map((ponto) => ponto.chave));
  const esquerdaPorY = [];
  const direitaPorY = [];

  for (const ponto of pontosOrdenadosPorY) {
    if (chavesDaEsquerda.has(ponto.chave)) {
      esquerdaPorY.push(ponto);
    } else {
      direitaPorY.push(ponto);
    }
  }

  const melhorEsquerda = buscarParMaisProximo(esquerdaPorX, esquerdaPorY, estado);
  const melhorDireita = buscarParMaisProximo(direitaPorX, direitaPorY, estado);
  let melhorResultado = escolherMelhor(melhorEsquerda, melhorDireita);
  const limiteQuadrado = melhorResultado?.distanciaAoQuadrado ?? Infinity;

  const faixaCentral = pontosOrdenadosPorY.filter((ponto) => {
    const diferencaX = ponto.x - xDivisao;
    return diferencaX * diferencaX < limiteQuadrado;
  });

  // Mantem a etapa classica da faixa central, mas aceita somente pares jogador-inimigo.
  for (let indiceA = 0; indiceA < faixaCentral.length; indiceA += 1) {
    for (let indiceB = indiceA + 1; indiceB < faixaCentral.length; indiceB += 1) {
      const diferencaY = faixaCentral[indiceB].y - faixaCentral[indiceA].y;

      if (
        melhorResultado &&
        diferencaY * diferencaY >= melhorResultado.distanciaAoQuadrado
      ) {
        break;
      }

      estado.comparacoesNaFaixa += 1;
      melhorResultado = escolherMelhor(
        melhorResultado,
        avaliarPar(faixaCentral[indiceA], faixaCentral[indiceB], estado),
      );
    }
  }

  return melhorResultado;
}

function criarResultadoFinal(melhorResultado, estado, pontosOrdenadosPorX) {
  const distanciasCalculadas = [...estado.distanciasCalculadas].sort(
    (itemA, itemB) => itemA.id - itemB.id,
  );

  return {
    inimigo: melhorResultado?.inimigo ?? null,
    distanciaReal: melhorResultado?.distanciaReal ?? 0,
    distanciaAoQuadrado: melhorResultado?.distanciaAoQuadrado ?? 0,
    comparacoes: estado.comparacoes,
    distanciasCalculadas,
    metodo: 'divisaoEConquistaRestrita',
    totalPontos: pontosOrdenadosPorX.length,
    pontosOrdenadosPorX: pontosOrdenadosPorX.map((ponto) => ({
      tipo: ponto.tipo,
      id: ponto.id,
      x: ponto.x,
      y: ponto.y,
    })),
    divisoesRecursivas: estado.divisoesRecursivas,
    comparacoesNaFaixa: estado.comparacoesNaFaixa,
    paresInvalidosDescartados: estado.paresInvalidosDescartados,
  };
}

export function encontrarInimigoMaisProximo(jogador, inimigos) {
  const pontos = criarPontos(jogador, inimigos);
  const pontosOrdenadosPorX = [...pontos].sort((pontoA, pontoB) => pontoA.x - pontoB.x);
  const pontosOrdenadosPorY = [...pontos].sort((pontoA, pontoB) => pontoA.y - pontoB.y);
  const estado = {
    comparacoes: 0,
    comparacoesNaFaixa: 0,
    divisoesRecursivas: 0,
    paresInvalidosDescartados: 0,
    paresComparados: new Set(),
    paresInvalidos: new Set(),
    distanciasCalculadas: [],
  };

  // Adaptacao minima do Par de Pontos Mais Proximos:
  // a divisao e conquista permanece, mas pares inimigo-inimigo sao descartados.
  const melhorResultado = buscarParMaisProximo(
    pontosOrdenadosPorX,
    pontosOrdenadosPorY,
    estado,
  );

  return criarResultadoFinal(melhorResultado, estado, pontosOrdenadosPorX);
}
