import { useEffect, useMemo, useState } from 'react'
import { getMenu, submitPedido } from '../api'
import { CATEGORY_ORDER } from '../constants'

const ALL_FILTER = 'Todos'

function buildCategories(menuData) {
  const menu = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, []]))

  Object.entries(menuData ?? {}).forEach(([category, pratos]) => {
    menu[category] = Array.isArray(pratos) ? pratos : []
  })

  const extraCategories = Object.keys(menuData ?? {}).filter(
    (category) => !CATEGORY_ORDER.includes(category),
  )

  return [...CATEGORY_ORDER, ...extraCategories].map((category) => ({
    category,
    pratos: menu[category] ?? [],
  }))
}

function Toast({ message, tone }) {
  if (!message) return null

  return (
    <div className={`toast ${tone === 'error' ? 'toast-error' : ''}`} role="status">
      {message}
    </div>
  )
}

export default function ClientePage() {
  const [menuData, setMenuData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER)
  const [mesa, setMesa] = useState('')
  const [quantities, setQuantities] = useState({})
  const [pedidoAtual, setPedidoAtual] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ message: '', tone: 'success' })

  useEffect(() => {
    let active = true

    async function loadMenu() {
      setLoading(true)
      setError('')
      try {
        const menu = await getMenu()
        if (active) {
          setMenuData(menu ?? {})
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadMenu()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!toast.message) return undefined
    const timeoutId = setTimeout(() => setToast({ message: '', tone: 'success' }), 3500)
    return () => clearTimeout(timeoutId)
  }, [toast.message])

  const categories = useMemo(() => buildCategories(menuData), [menuData])

  const visibleCategories = useMemo(() => {
    if (activeFilter === ALL_FILTER) return categories
    return categories.filter(({ category }) => category === activeFilter)
  }, [activeFilter, categories])

  const pedidoEntries = useMemo(
    () =>
      Object.entries(pedidoAtual).map(([id, dados]) => ({
        id: Number(id),
        ...dados,
      })),
    [pedidoAtual],
  )

  const hasPedido = pedidoEntries.length > 0

  function updateQuantity(pratoId, nextValue) {
    const parsed = Number(nextValue)
    const quantidade = Number.isInteger(parsed) && parsed > 0 ? parsed : 1
    setQuantities((current) => ({ ...current, [pratoId]: quantidade }))
  }

  function addPrato(prato) {
    const quantidade = quantities[prato.id] ?? 1
    setPedidoAtual((current) => {
      const oldQuantity = current[prato.id]?.quantidade ?? 0
      return {
        ...current,
        [prato.id]: { nome: prato.nome, quantidade: oldQuantity + quantidade },
      }
    })
  }

  async function onSubmit(event) {
    event.preventDefault()

    const mesaNumber = Number(mesa)
    if (!Number.isInteger(mesaNumber) || mesaNumber < 1) {
      setToast({ message: 'Indica um numero de mesa valido.', tone: 'error' })
      return
    }

    if (!hasPedido) {
      setToast({ message: 'Adiciona pelo menos um prato antes de confirmar.', tone: 'error' })
      return
    }

    const pratos = pedidoEntries.map((linha) => ({
      prato_id: linha.id,
      quantidade: linha.quantidade,
    }))

    setSubmitting(true)
    try {
      const pedidoId = await submitPedido(mesaNumber, pratos)
      setToast({
        message: `Pedido #${pedidoId} enviado para a cozinha.`,
        tone: 'success',
      })
      setPedidoAtual({})
      setMesa('')
      setQuantities({})
    } catch (submitError) {
      setToast({ message: submitError.message, tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="view-grid">
      <Toast message={toast.message} tone={toast.tone} />

      <div className="menu-column">
        <h1 className="page-title">O Escondidinho</h1>

        <div className="filters">
          <button
            type="button"
            className={`btn ${activeFilter === ALL_FILTER ? 'btn-active' : ''}`}
            onClick={() => setActiveFilter(ALL_FILTER)}
          >
            Todos
          </button>
          {categories.map(({ category }) => (
            <button
              type="button"
              key={category}
              className={`btn ${activeFilter === category ? 'btn-active' : ''}`}
              onClick={() => setActiveFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? <p className="feedback">A carregar menu...</p> : null}
        {error ? <p className="feedback feedback-error">{error}</p> : null}

        {!loading &&
          !error &&
          visibleCategories.map(({ category, pratos }) => (
            <div key={category} className="category-block">
              <h2>{category}</h2>
              {pratos.length === 0 ? (
                <p className="feedback">Sem pratos nesta categoria.</p>
              ) : (
                pratos.map((prato) => (
                  <article key={prato.id} className="dish-card">
                    <h3>{prato.nome}</h3>
                    <p>{prato.descricao}</p>
                    <p className="ingredients">{prato.ingredientes}</p>
                    <div className="dish-actions">
                      <input
                        type="number"
                        min="1"
                        value={quantities[prato.id] ?? 1}
                        onChange={(event) => updateQuantity(prato.id, event.target.value)}
                      />
                      <button type="button" className="btn" onClick={() => addPrato(prato)}>
                        + Adicionar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          ))}
      </div>

      <aside className="order-panel">
        <h2>O Teu Pedido</h2>

        <form className="mesa-field" onSubmit={onSubmit}>
          <label htmlFor="mesa">Mesa</label>
          <input
            id="mesa"
            type="number"
            min="1"
            placeholder="--"
            value={mesa}
            onChange={(event) => setMesa(event.target.value)}
          />

          <div className="order-list">
            {!hasPedido ? (
              <p className="feedback">Ainda nao adicionaste nenhum prato.</p>
            ) : (
              pedidoEntries.map((linha) => (
                <div key={linha.id} className="order-line">
                  <span>{linha.nome}</span>
                  <span>x{linha.quantidade}</span>
                </div>
              ))
            )}
          </div>

          <button type="submit" className="btn btn-submit" disabled={!hasPedido || submitting}>
            {submitting ? 'A submeter...' : 'Confirmar Pedido'}
          </button>
        </form>
      </aside>
    </section>
  )
}

