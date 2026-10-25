import type { Config, Pedido } from "@/lib/types";
import { formatBRL, formatData } from "@/lib/format";
import { formasPagamento } from "@/lib/periodoOrcamentos";
import styles from "./CupomConteudo.module.css";

export function CupomConteudo({ pedido, config }: { pedido: Pedido; config: Config }) {
  const finalizado = pedido.status_pagamento === "finalizado";
  const descontoTotal = pedido.itens.reduce((s, item) => s + Math.round((item.desconto_unitario ?? 0) * item.quantidade * 100), 0) / 100;
  return <article id="cupom-conteudo" className={styles.cupom} aria-label="Prévia do cupom não fiscal de 80 mm">
    <header className={styles.cabecalho}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt={config.distribuidora_nome} className={styles.logo} />
      <p className={styles.empresa}>{config.distribuidora_nome}</p>
      {config.distribuidora_contato && <p>{config.distribuidora_contato}</p>}
      {config.endereco && <p>{config.endereco}</p>}
      <h1>{finalizado ? "RECIBO DE VENDA" : "ORÇAMENTO"}</h1>
      <p>DOCUMENTO NÃO FISCAL</p>
      <p>Nº {String(pedido.numero).padStart(4, "0")}</p>
      <p>{formatData(pedido.created_at)}</p>
    </header>
    {(pedido.cliente_nome || pedido.telefone || pedido.criado_por) && <section className={styles.secao} aria-label="Dados do cliente e responsável">
      {pedido.cliente_nome && <p><strong>Cliente:</strong> {pedido.cliente_nome}</p>}
      {pedido.telefone && <p><strong>Telefone:</strong> {pedido.telefone}</p>}
      {pedido.criado_por && <p><strong>Responsável:</strong> {pedido.criado_por.nome}</p>}
    </section>}
    <section className={styles.secao} aria-label="Produtos do cupom">
      <h2>ITENS</h2>
      <ol className={styles.itens}>
        {pedido.itens.map((item, index) => <li key={item.id} className={styles.item}>
          <p className={styles.nome}>{index + 1}. {item.produto_nome}</p>
          {item.modo === "pacote" && <p>Pacote{item.pack_quantidade ? ` com ${item.pack_quantidade} itens` : ""}</p>}
          {(item.desconto_unitario ?? 0) > 0 ? <>
            <p>Valor Original: {formatBRL(item.preco_original ?? item.preco_unitario)}</p>
            <p>Desconto: {formatBRL(item.desconto_unitario!)}</p>
            <p><strong>Valor final: {formatBRL(item.preco_unitario)}</strong></p>
          </> : <p>Valor Original: {formatBRL(item.preco_unitario)}</p>}
          <div className={styles.linha}>
            <span>{item.quantidade} {item.modo === "pacote" ? "pct" : "un"} × {formatBRL(item.preco_unitario)}</span>
            <strong>{formatBRL(item.subtotal)}</strong>
          </div>
        </li>)}
      </ol>
    </section>
    <section className={styles.totais} aria-label="Total e pagamento">
      {descontoTotal > 0 && <div className={styles.linha}><span>Desconto total</span><span>{formatBRL(descontoTotal)}</span></div>}
      <div className={`${styles.linha} ${styles.total}`}><strong>TOTAL</strong><strong>{formatBRL(pedido.valor_total)}</strong></div>
      <p><strong>{finalizado ? "Pagamento finalizado" : "Pagamento pendente"}</strong></p>
      {finalizado && pedido.forma_pagamento && <p>Forma de pagamento: {formasPagamento[pedido.forma_pagamento]}</p>}
      {finalizado && pedido.pago_em && <p>Pago em: {formatData(pedido.pago_em)}</p>}
    </section>
    {pedido.observacao && <section className={styles.observacao}><h2>OBSERVAÇÃO</h2><p>{pedido.observacao}</p></section>}
    <footer className={styles.rodape}><p>Este documento não é fiscal.</p><p>Obrigado pela preferência!</p></footer>
  </article>;
}
