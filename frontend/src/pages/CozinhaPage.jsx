import { useEffect, useMemo, useState } from 'react'
import { getPedidos, updateEstado } from '../api'
import { ORDER_STATES, ORDER_STATE_LABELS } from '../constants'
import './CozinhaPage.css'

function formatarHora(timestamp) {
  if (!timestamp) return '--:--'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '--:--'

  return date.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PedidoModal({ pedido, onClose }) {
  if (!pedido) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <h3>Mesa {pedido.mesa}</h3>
        {pedido.pratos.map((prato, index) => (
          <div key={`${prato.nome}-${index}`} className="modal-line">
            <p>
              <strong>{prato.nome}</strong> x{prato.quantidade}
            </p>
            <p className="ingredients">{prato.ingredientes}</p>
          </div>
        ))}
        <button type="button" className="btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}

export default function CozinhaPage() {
  const [pedidos, setPedidos] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [updatingPedidoId, setUpdatingPedidoId] = useState(null)
  const [selectedPedido, setSelectedPedido] = useState(null)

  async function carregarPedidos({ showLoading = false } = {}) {
    if (showLoading) setLoading(true)
    setRefreshing(true)
    setError('')
    try {
      const result = await getPedidos()
      setPedidos(result ?? {})
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    carregarPedidos({ showLoading: true })
  }, [])

  const pedidosPorColuna = useMemo(() => {
    const grouped = Object.fromEntries(ORDER_STATES.map((state) => [state, []]))

    Object.entries(pedidos).forEach(([id, pedido]) => {
      if (grouped[pedido.estado]) {
        grouped[pedido.estado].push({ id: Number(id), ...pedido })
      }
    })

    ORDER_STATES.forEach((state) => {
      grouped[state].sort((a, b) => {
        const timeA = new Date(a.data).getTime()
        const timeB = new Date(b.data).getTime()
        return timeA - timeB
      })
    })

    return grouped
  }, [pedidos])

  async function moverPedido(pedidoId, estadoAtual, direction) {
    const currentIndex = ORDER_STATES.indexOf(estadoAtual)
    const nextIndex = currentIndex + direction

    if (nextIndex < 0 || nextIndex >= ORDER_STATES.length) return

    const novoEstado = ORDER_STATES[nextIndex]

    setUpdatingPedidoId(pedidoId)
    try {
      await updateEstado(pedidoId, novoEstado)
      await carregarPedidos()
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setUpdatingPedidoId(null)
    }
  }

  return (
    <section className="kitchen-page">
      <div className="kitchen-view">
        <div className="kitchen-header">
          <h1 className="page-title">Dashboard da Cozinha</h1>
          <button
            type="button"
            className="btn"
            onClick={() => carregarPedidos()}
            disabled={refreshing}
          >
            {refreshing ? 'A atualizar...' : 'Atualizar'}
          </button>
        </div>

        {loading ? <p className="feedback">A carregar pedidos...</p> : null}
        {error ? <p className="feedback feedback-error">{error}</p> : null}

        <div className="kanban-grid">
          {ORDER_STATES.map((state, index) => (
            <article key={state} className="kanban-column">
              <header>
                <h2>{ORDER_STATE_LABELS[state]}</h2>
              </header>

              <div className="kanban-cards">
                {pedidosPorColuna[state].map((pedido) => (
                  <div
                    key={pedido.id}
                    className="pedido-card"
                    onClick={() => setSelectedPedido(pedido)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        setSelectedPedido(pedido)
                      }
                    }}
                  >
                    <div className="pedido-head">
                      <h3>Mesa {pedido.mesa}</h3>
                      <span>{formatarHora(pedido.data)}</span>
                    </div>

                    <ul>
                      {pedido.pratos.map((prato, itemIndex) => (
                        <li key={`${pedido.id}-${itemIndex}`}>
                          {prato.nome} x {prato.quantidade}
                        </li>
                      ))}
                    </ul>

                    <div className="pedido-actions">
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={(event) => {
                          event.stopPropagation()
                          moverPedido(pedido.id, pedido.estado, -1)
                        }}
                        disabled={index === 0 || updatingPedidoId === pedido.id}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={(event) => {
                          event.stopPropagation()
                          moverPedido(pedido.id, pedido.estado, 1)
                        }}
                        disabled={
                          index === ORDER_STATES.length - 1 || updatingPedidoId === pedido.id
                        }
                      >
                        Proximo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <PedidoModal pedido={selectedPedido} onClose={() => setSelectedPedido(null)} />
    </section>
  )
}
