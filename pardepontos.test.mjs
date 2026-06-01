import assert from 'node:assert/strict';
import test from 'node:test';

import {
  distanciaAoQuadrado,
  encontrarInimigoMaisProximo,
} from './pardepontos.js';

test('calcula a distancia ao quadrado entre dois pontos', () => {
  const pontoA = { x: 2, y: 3 };
  const pontoB = { x: 5, y: 7 };

  assert.equal(distanciaAoQuadrado(pontoA, pontoB), 25);
});

test('encontra somente o inimigo vivo mais proximo do jogador', () => {
  const jogador = { x: 0, y: 0 };
  const inimigos = [
    { id: 1, x: 10, y: 0, vida: 0 },
    { id: 2, x: 8, y: 0, vida: 3 },
    { id: 3, x: 3, y: 4, vida: 2 },
  ];

  const resultado = encontrarInimigoMaisProximo(jogador, inimigos);

  assert.equal(resultado.inimigo.id, 3);
  assert.equal(resultado.distanciaAoQuadrado, 25);
  assert.equal(resultado.distanciaReal, 5);
  assert.equal(resultado.comparacoes, 2);
  assert.deepEqual(
    resultado.distanciasCalculadas.map((item) => item.id),
    [2, 3],
  );
});

test('usa uma adaptacao por divisao e conquista filtrando pares invalidos', () => {
  const jogador = { x: 100, y: 100 };
  const inimigos = [
    { id: 1, x: 104, y: 101, vida: 2 },
    { id: 2, x: 105, y: 101, vida: 2 },
    { id: 3, x: 210, y: 180, vida: 2 },
    { id: 4, x: 50, y: 90, vida: 2 },
  ];

  const resultado = encontrarInimigoMaisProximo(jogador, inimigos);

  assert.equal(resultado.inimigo.id, 1);
  assert.equal(resultado.metodo, 'divisaoEConquistaRestrita');
  assert.equal(resultado.totalPontos, 5);
  assert.equal(resultado.pontosOrdenadosPorX.length, 5);
  assert.ok(resultado.divisoesRecursivas > 0);
  assert.ok(resultado.comparacoesNaFaixa >= 0);
  assert.ok(resultado.paresInvalidosDescartados > 0);
});

test('retorna dados vazios quando nao ha inimigos vivos', () => {
  const resultado = encontrarInimigoMaisProximo(
    { x: 0, y: 0 },
    [{ id: 1, x: 1, y: 1, vida: 0 }],
  );

  assert.equal(resultado.inimigo, null);
  assert.equal(resultado.distanciaReal, 0);
  assert.equal(resultado.distanciaAoQuadrado, 0);
  assert.equal(resultado.comparacoes, 0);
  assert.deepEqual(resultado.distanciasCalculadas, []);
});
