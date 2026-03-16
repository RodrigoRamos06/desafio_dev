from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import database
from pydantic import BaseModel, Field
from typing import List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db, cursor = database.conect_db()

class LinhaPedido(BaseModel):
    prato_id: int
    quantidade: int = Field(ge=1)

class Pedido(BaseModel):
    pratos: List[LinhaPedido]

class EstadoUpdate(BaseModel):
    novo_estado: str

@app.get("/menu")
def get_menu(grouped=True):
    if grouped:
        return database.group_cat(cursor)
    return database.group_id(cursor)


@app.post("/novo_pedido/{mesa}")
def add_pedido(mesa: int, pedido: Pedido):
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
    return pedido_id

@app.get("/pedidos")
def get_pedidos():
    return database.listar_pedidos(cursor)

@app.patch("/atualizar_estado/{pedido_id}")
def update_estado(pedido_id: int, update: EstadoUpdate):
    if update.novo_estado not in database.ESTADOS:
        raise HTTPException(status_code=400, detail="Estado invalido.")

    res = database.atualizar_estado(cursor, pedido_id, update.novo_estado)
    db.commit()
    if res is None:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado.")
    return res
