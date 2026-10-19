export const schema = [
  `CREATE TABLE IF NOT EXISTS oca_registros (
    colecao text NOT NULL CHECK (colecao IN ('produtos', 'categorias', 'pedidos', 'config')),
    id text NOT NULL, dados jsonb NOT NULL CHECK (jsonb_typeof(dados) = 'object'),
    PRIMARY KEY (colecao, id)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS oca_numero_pedido
    ON oca_registros (((dados->>'numero')::bigint)) WHERE colecao = 'pedidos'`,
  `CREATE TABLE IF NOT EXISTS oca_contadores (
    id text PRIMARY KEY, valor bigint NOT NULL CHECK (valor >= 0)
  )`,
];
export function importQueries(registros) {
  return [
    ["LOCK TABLE oca_contadores, oca_registros IN EXCLUSIVE MODE", []],
    ...registros.map(({ colecao, id, dados }) => [
      "INSERT INTO oca_registros (colecao, id, dados) VALUES ($1, $2, $3::jsonb) ON CONFLICT (colecao, id) DO NOTHING",
      [colecao, id, JSON.stringify(dados)],
    ]),
    [`INSERT INTO oca_contadores (id, valor)
       SELECT 'pedidos', COALESCE(MAX((dados->>'numero')::bigint), 0)
       FROM oca_registros WHERE colecao = 'pedidos'
       ON CONFLICT (id) DO UPDATE SET valor = GREATEST(oca_contadores.valor, EXCLUDED.valor)`, []],
  ];
}
