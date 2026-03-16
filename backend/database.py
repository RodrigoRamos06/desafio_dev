import psycopg2

ESTADOS = ["order_preview", "preparing", "cooling_down", "ready_to_serve", "concluded"]

def conect_db():
    db = psycopg2.connect(
        host="localhost",
        database = "escondidinho_db",
        user = "postgres",
        password = "123456"
    )
    cursor = db.cursor()
    return db, cursor

def close_db(db, cursor):
    cursor.close()
    db.close()

def menu(cursor):
    cursor.execute("""
        SELECT prato_id, nome, categoria, ingredientes, descricao
        FROM pratos;
    """)
    return cursor.fetchall()

def group_cat(cursor):
    dic_pratos = {}

    res = menu(cursor)
    for i in res:
        if i[2] not in dic_pratos:     
            dic_pratos[i[2]] = [{'id': i[0], 'nome': i[1], 'ingredientes': i[3], 'descricao': i[4]}]
        else:
            dic_pratos[i[2]].append({'id': i[0], 'nome': i[1], 'ingredientes': i[3], 'descricao': i[4]})

    return dic_pratos

def group_id(cursor):
    dic_pratos = {}

    res = menu(cursor)
    for i in res:
        if i[0] not in dic_pratos:
            dic_pratos[i[0]] = [{'nome': i[1], 'categoria': i[2], 'ingredientes': i[3], 'descricao': i[4]}]
        else:
            dic_pratos[i[0]].append({'nome': i[1], 'categoria': i[2], 'ingredientes': i[3], 'descricao': i[4]})

    return dic_pratos

def criar_pedido(cursor, mesa):
    cursor.execute("""
        INSERT INTO pedidos (mesa)
        VALUES (%s)
        RETURNING pedido_id;
    """, (mesa,))
    return cursor.fetchone()[0]

def linha_pedido(cursor, pedido_id, pratos):
    for i in pratos:
        cursor.execute("""
            INSERT INTO linkar_pedido (pedido_id, prato_id, quantidade)
            VALUES (%s, %s, %s);
        """, (pedido_id, i[0], i[1]))

def listar_pedidos(cursor):
    dic_pedidos = {} 

    cursor.execute("""
        SELECT lp.pedido_id, ped.mesa, prt.nome, prt.ingredientes, lp.quantidade, ped.estado, ped.criado_em
        FROM pedidos AS ped
        RIGHT JOIN linkar_pedido AS lp ON ped.pedido_id = lp.pedido_id
        LEFT JOIN pratos AS prt ON prt.prato_id = lp.prato_id;
    """)
    res = cursor.fetchall()
    # print(res)
    for i in res:
        if i[0] not in dic_pedidos:
            dic_pedidos[i[0]] = {} 
            dic_pedidos[i[0]]['mesa'] = i[1]
            dic_pedidos[i[0]]['estado'] = i[5]
            dic_pedidos[i[0]]['data'] = i[6]
            dic_pedidos[i[0]]['pratos'] = [{"nome": i[2], "ingredientes": i[3], "quantidade": i[4]}]

        else:
            dic_pedidos[i[0]]['pratos'].append({"nome": i[2], "ingredientes": i[3], "quantidade": i[4]})

    return dic_pedidos

def atualizar_estado(cursor, pedido_id, novo_est):
    if novo_est not in ESTADOS:
        return None

    cursor.execute("""
        UPDATE pedidos
        SET estado = %s
        WHERE pedido_id = %s;
    """, (novo_est, pedido_id))
    if cursor.rowcount == 0:
        return None

    return {"pedido_id": pedido_id, "estado": novo_est}

# db, cursor = conect_db()
# atualizar_estado(cursor, 6, ESTADOS[2])
# db.commit()
