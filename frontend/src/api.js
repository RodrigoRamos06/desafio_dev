const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  })

  const rawBody = await response.text()
  let body = null

  if (rawBody) {
    try {
      body = JSON.parse(rawBody)
    } catch {
      body = { message: rawBody }
    }
  }

  if (!response.ok) {
    const message =
      body?.detail ??
      body?.message ??
      `Pedido falhou com status ${response.status}.`
    throw new Error(message)
  }

  return body
}

export function getMenu() {
  return request('/menu')
}

export function submitPedido(mesa, pratos) {
  return request(`/novo_pedido/${mesa}`, {
    method: 'POST',
    body: JSON.stringify({ pratos }),
  })
}

export function getPedidos() {
  return request('/pedidos')
}

export function updateEstado(pedidoId, novoEstado) {
  return request(`/atualizar_estado/${pedidoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ novo_estado: novoEstado }),
  })
}

export function subscribePedidos({ onOpen, onError, onPedidosChanged } = {}) {
  const eventSource = new EventSource(`${API_BASE_URL}/pedidos/stream`)

  eventSource.onopen = () => {
    onOpen?.()
  }

  eventSource.onerror = (event) => {
    onError?.(event)
  }

  eventSource.addEventListener('pedidos_changed', (event) => {
    try {
      const payload = JSON.parse(event.data)
      onPedidosChanged?.(payload)
    } catch {
      onPedidosChanged?.(null)
    }
  })

  return () => {
    eventSource.close()
  }
}
