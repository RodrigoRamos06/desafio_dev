import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getPedidos, subscribePedidos, updateEstado } from '../api'
import { ORDER_STATES, ORDER_STATE_LABELS } from '../constants'
import './CozinhaPage.css'

const COLUMN_ID_PREFIX = 'column-'

function getColumnId(estado) {
  return `${COLUMN_ID_PREFIX}${estado}`
}

function getEstadoFromColumnId(value) {
  if (typeof value !== 'string') return null
  if (!value.startsWith(COLUMN_ID_PREFIX)) return null
  return value.slice(COLUMN_ID_PREFIX.length)
}

function formatarHora(timestamp) {
  if (!timestamp) return '--:--'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '--:--'

  return date.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PedidoPreview({ pedido }) {
  return (
    <>
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
    </>
  )
}

function DraggablePedidoCard({
  pedido,
  estado,
  index,
  isUpdating,
  onOpen,
  onMove,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useDraggable({
    id: `pedido-${pedido.id}`,
    data: { type: 'pedido', pedidoId: pedido.id, estado },
    disabled: isUpdating,
  })

  const style = {
    ...(transform && !isDragging
      ? {
          transform: CSS.Transform.toString(transform),
          transition,
        }
      : {}),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`pedido-card ${isDragging ? 'dragging' : ''}`}
      onClick={() => onOpen(pedido)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onOpen(pedido)
        }
      }}
      {...listeners}
      {...attributes}
    >
      <PedidoPreview pedido={pedido} />

      <div className="pedido-actions">
        <button
          type="button"
          className="btn btn-small"
          onClick={(event) => {
            event.stopPropagation()
            onMove(pedido.id, pedido.estado, -1)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          disabled={index === 0 || isUpdating}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={(event) => {
            event.stopPropagation()
            onMove(pedido.id, pedido.estado, 1)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          disabled={index === ORDER_STATES.length - 1 || isUpdating}
        >
          Proximo
        </button>
      </div>
    </div>
  )
}

function DroppableColumn({ state, label, pedidos, index, updatingPedidoId, onOpen, onMove }) {
  const { setNodeRef, isOver } = useDroppable({
    id: getColumnId(state),
    data: { type: 'column', estado: state },
  })

  return (
    <article ref={setNodeRef} className={`kanban-column ${isOver ? 'drop-target' : ''}`}>
      <header>
        <h2>{label}</h2>
      </header>

      <div className="kanban-cards">
        {pedidos.map((pedido) => (
          <DraggablePedidoCard
            key={pedido.id}
            pedido={pedido}
            estado={state}
            index={index}
            isUpdating={updatingPedidoId === pedido.id}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
      </div>
    </article>
  )
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
  const [liveStatus, setLiveStatus] = useState('reconnecting')
  const [updatingPedidoId, setUpdatingPedidoId] = useState(null)
  const [selectedPedido, setSelectedPedido] = useState(null)
  const [activeDragPedido, setActiveDragPedido] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const carregarPedidos = useCallback(async ({ showLoading = false } = {}) => {
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
  }, [])

  useEffect(() => {
    carregarPedidos({ showLoading: true })
  }, [carregarPedidos])

  useEffect(() => {
    let debounceTimerId = null
    const unsubscribe = subscribePedidos({
      onOpen: () => setLiveStatus('connected'),
      onError: () => setLiveStatus('reconnecting'),
      onPedidosChanged: () => {
        if (debounceTimerId) {
          clearTimeout(debounceTimerId)
        }
        debounceTimerId = setTimeout(() => {
          carregarPedidos()
        }, 300)
      },
    })

    return () => {
      if (debounceTimerId) {
        clearTimeout(debounceTimerId)
      }
      unsubscribe()
    }
  }, [carregarPedidos])

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

  async function moverPedidoParaEstado(pedidoId, estadoAtual, novoEstado) {
    if (!estadoAtual || !novoEstado || estadoAtual === novoEstado) return
    setUpdatingPedidoId(pedidoId)
    setError('')
    setPedidos((current) => {
      if (!current[pedidoId]) return current
      return {
        ...current,
        [pedidoId]: {
          ...current[pedidoId],
          estado: novoEstado,
        },
      }
    })

    try {
      await updateEstado(pedidoId, novoEstado)
    } catch (updateError) {
      setPedidos((current) => {
        if (!current[pedidoId]) return current
        return {
          ...current,
          [pedidoId]: {
            ...current[pedidoId],
            estado: estadoAtual,
          },
        }
      })
      setError(updateError.message)
    } finally {
      setUpdatingPedidoId(null)
    }
  }

  async function moverPedido(pedidoId, estadoAtual, direction) {
    const currentIndex = ORDER_STATES.indexOf(estadoAtual)
    const nextIndex = currentIndex + direction
    if (nextIndex < 0 || nextIndex >= ORDER_STATES.length) return

    const novoEstado = ORDER_STATES[nextIndex]
    await moverPedidoParaEstado(pedidoId, estadoAtual, novoEstado)
  }

  function handleDragStart(event) {
    const pedidoId = event.active.data.current?.pedidoId
    if (!pedidoId || !pedidos[pedidoId]) return

    setActiveDragPedido({
      id: pedidoId,
      ...pedidos[pedidoId],
    })
  }

  function handleDragCancel() {
    setActiveDragPedido(null)
  }

  async function handleDragEnd(event) {
    setActiveDragPedido(null)

    const { active, over } = event
    if (!over) return

    const pedidoId = active.data.current?.pedidoId
    const estadoAtual = active.data.current?.estado
    if (!pedidoId || !estadoAtual) return

    const novoEstado = getEstadoFromColumnId(over.id)
    if (!novoEstado || novoEstado === estadoAtual) return

    await moverPedidoParaEstado(pedidoId, estadoAtual, novoEstado)
  }

  return (
    <section className="kitchen-page">
      <div className="kitchen-view">
        <div className="kitchen-header">
          <h1 className="page-title">Dashboard da Cozinha</h1>
          <div className="kitchen-header-actions">
            <span
              className={`live-indicator ${liveStatus === 'connected' ? 'connected' : 'reconnecting'}`}
            >
              {liveStatus === 'connected' ? 'Live' : 'Reconectar...'}
            </span>
            <button
              type="button"
              className="btn"
              onClick={() => carregarPedidos()}
              disabled={refreshing}
            >
              {refreshing ? 'A atualizar...' : 'Atualizar'}
            </button>
          </div>
        </div>

        {loading ? <p className="feedback">A carregar pedidos...</p> : null}
        {error ? <p className="feedback feedback-error">{error}</p> : null}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <div className="kanban-grid">
            {ORDER_STATES.map((state, index) => (
              <DroppableColumn
                key={state}
                state={state}
                label={ORDER_STATE_LABELS[state]}
                pedidos={pedidosPorColuna[state]}
                index={index}
                updatingPedidoId={updatingPedidoId}
                onOpen={setSelectedPedido}
                onMove={moverPedido}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDragPedido ? (
              <div className="pedido-card pedido-card-overlay">
                <PedidoPreview pedido={activeDragPedido} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <PedidoModal pedido={selectedPedido} onClose={() => setSelectedPedido(null)} />
    </section>
  )
}
