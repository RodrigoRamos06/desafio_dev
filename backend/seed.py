import database

PRATOS_BASE = [
    ("Pao e Azeitonas", "Entradas", "Cesto de pao caseiro com azeitonas temperadas",
     "pao rustico, azeitonas, azeite, oregano"),

    ("Queijo Curado", "Entradas", "Selecao de queijo curado com doce de abobora",
     "queijo curado, doce de abobora"),

    ("Salada de Polvo", "Entradas", "Polvo cozido com cebola, salsa e azeite",
     "polvo, cebola roxa, salsa, azeite, vinagre"),

    ("Sopa de Pedra", "Sopas", "Sopa rica de feijão com carnes, enchidos e legumes",
     "feijão, orelha de porco, chouriço, morcela, batata, cenoura, couve"),

    ("Canja de Galinha", "Sopas", "Caldo de galinha com massa pevide",
     "galinha, massa pevide, cebola"),

    ("Caldo Verde", "Sopas", "Sopa de couve com chouriço",
     "batata, couve-galega, chouriço, cebola"),

    ("Arroz de Marisco", "Peixe", "Arroz malandrinho com variados frutos do mar",
     "arroz, camarão, amêijoas, mexilhão, sapateira, tomate, coentros"),

    ("Sardinha Assada", "Peixe", "Sardinhas grelhadas servidas com batata cozida e pimento",
     "sardinhas, batatas, pimento, couve"),

    ("Bacalhau à Brás", "Peixe", "Bacalhau com batata palha e ovo",
     "bacalhau desfiado, batata palha, ovos, cebola, azeitonas, salsa"),

    ("Arroz de Pato", "Carne", "Pato desfiado no forno com chouriço e bacon",
     "pato, arroz, chouriço, bacon, cebola"),

    ("Carne de Porco à Alentejana", "Carne", "Porco com amêijoas e batatas fritas aos cubos",
     "carne de porco, amêijoas, batatas, coentros, vinho branco"),

    ("Bitoque", "Carne", "Bife com ovo e batata frita",
     "bife de vaca, ovo, batatas, louro, manteiga"),

    ("Pastel de Nata", "Sobremesa", "Pastel de nata com canela",
     "massa folhada, leite, ovo, açúcar, farinha, canela, limão"),

    ("Arroz Doce", "Sobremesa", "Arroz cremoso com leite e decorado com canela",
     "arroz, leite, açúcar, ovo, limão, canela"),

    ("Baba de Camelo", "Sobremesa", "Doce de leite condensado cozido com ovos e amêndoa",
     "leite condensado, ovos, amêndoas torradas"),
]

def create_tables(cursor):
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS pratos (
            prato_id        SERIAL PRIMARY KEY,
            nome            TEXT NOT NULL,
            categoria       TEXT NOT NULL,
            descricao       TEXT,
            ingredientes    TEXT
        );""" 
    )

    cursor.execute("""
            CREATE TABLE IF NOT EXISTS pedidos (
            pedido_id    SERIAL PRIMARY KEY,
            mesa         INTEGER NOT NULL,
            estado       TEXT NOT NULL DEFAULT 'order_preview',
            criado_em    TIMESTAMP DEFAULT NOW()
        );""" 
    )

    cursor.execute("""
            CREATE TABLE IF NOT EXISTS linkar_pedido (
            link_id     SERIAL PRIMARY KEY,
            pedido_id   INTEGER REFERENCES pedidos(pedido_id),
            prato_id    INTEGER REFERENCES pratos(prato_id),
            quantidade  INTEGER NOT NULL
        );""" 
    )

def inserir_pratos_em_falta(cursor):
    inseridos = 0
    for nome, categoria, descricao, ingredientes in PRATOS_BASE:
        cursor.execute("""
            INSERT INTO pratos (nome, categoria, descricao, ingredientes)
            SELECT %s, %s, %s, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM pratos WHERE nome = %s
            );
        """, (nome, categoria, descricao, ingredientes, nome))
        inseridos += cursor.rowcount
    return inseridos



if __name__ == '__main__':
    db, cursor = database.conect_db()

    create_tables(cursor)
    inseridos = inserir_pratos_em_falta(cursor)
    db.commit()
    print(f"Pratos inseridos nesta execucao: {inseridos}")

    database.close_db(db, cursor)
