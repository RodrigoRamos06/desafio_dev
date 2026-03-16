import asyncio
import json
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import database
from pydantic import BaseModel, Field

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db, cursor = database.conect_db()
subscribers: set[asyncio.Queue[str]] = set()
subscribers_lock = asyncio.Lock()

class LinhaPedido(BaseModel):
    prato_id: int
    quantidade: int = Field(ge=1)

class Pedido(BaseModel):
    pratos: List[LinhaPedido]

class EstadoUpdate(BaseModel):
    novo_estado: str


def format_sse_event(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


async def publish_pedidos_changed(source: str, pedido_id: int) -> None:
    payload = {
        "source": source,
        "pedido_id": pedido_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    message = format_sse_event("pedidos_changed", payload)

    async with subscribers_lock:
        targets = list(subscribers)

    stale_queues = []
    for queue in targets:
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            stale_queues.append(queue)

    if stale_queues:
        async with subscribers_lock:
            for queue in stale_queues:
                subscribers.discard(queue)


async def pedidos_event_stream(request: Request):
    queue: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
    async with subscribers_lock:
        subscribers.add(queue)

    try:
        while True:
            if await request.is_disconnected():
                break

            try:
                message = await asyncio.wait_for(queue.get(), timeout=15)
                yield message
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
    finally:
        async with subscribers_lock:
            subscribers.discard(queue)

@app.get("/menu")
def get_menu(grouped=True):
    if grouped:
        return database.group_cat(cursor)
    return database.group_id(cursor)


@app.post("/novo_pedido/{mesa}")
async def add_pedido(mesa: int, pedido: Pedido):
    if mesa < 1:
        raise HTTPException(status_code=400, detail="Mesa invalida. Usa um valor inteiro >= 1.")

    if not pedido.pratos:
        raise HTTPException(status_code=400, detail="O pedido precisa de pelo menos um prato.")

    for linha in pedido.pratos:
        if linha.quantidade < 1:
            raise HTTPException(
                status_code=400,
                detail=f"Quantidade invalida para prato {linha.prato_id}.",
            )

    pedido_id = database.criar_pedido(cursor, mesa)

    pratos_lista = [(p.prato_id, p.quantidade) for p in pedido.pratos]
    database.linha_pedido(cursor, pedido_id, pratos_lista)
    db.commit()
    await publish_pedidos_changed("novo_pedido", pedido_id)
    return pedido_id

@app.get("/pedidos")
def get_pedidos():
    return database.listar_pedidos(cursor)


@app.get("/pedidos/stream")
async def stream_pedidos(request: Request):
    return StreamingResponse(
        pedidos_event_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.patch("/atualizar_estado/{pedido_id}")
async def update_estado(pedido_id: int, update: EstadoUpdate):
    if update.novo_estado not in database.ESTADOS:
        raise HTTPException(status_code=400, detail="Estado invalido.")

    res = database.atualizar_estado(cursor, pedido_id, update.novo_estado)
    db.commit()
    if res is None:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado.")
    await publish_pedidos_changed("atualizar_estado", pedido_id)
    return res
