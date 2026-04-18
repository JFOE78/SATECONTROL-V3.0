import json
import uuid

# --- NUEVOS DATOS (BACKUP) ---
backup_data = {
  "obras": [
    {"id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "nombre": "Alcosa Bloque 13.", "numBloques": 20},
    {"id": "efbfe2f6-01a2-4700-ac1c-5c2a4c5e4913", "nombre": "Alcosa Bloque 5", "numBloques": 20}
  ],
  "operarios": {
    "1b775ce7-a547-4074-a5a3-399410e9590d": "Juan",
    "30185401-074d-4c8c-8184-3e17a66cfc33": "Mosquito",
    "5a8b2741-faad-41f9-9121-9011b61c8576": "Jesules",
    "6d86daea-8f45-4331-914a-650b2b0a04b4": "Antonio",
    "f2792e5e-29b1-46de-bd50-1257aa823a54": "David"
  },
  "partes": [
    {"id": "12633398-1f79-43c3-bc13-b86cc3a00814", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-25", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "170d37f5-be6f-4475-97e4-0ee17031e42e", "obra_id": "efbfe2f6-01a2-4700-ac1c-5c2a4c5e4913", "fecha": "2026-04-01", "produccion": {"fase1": 121.85, "fase2": 121.85, "fase3": 121.85}},
    {"id": "1f3a973a-cfd5-4b7e-adc2-f98a829e8ca0", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-16", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "285908d5-0960-410c-83dd-f5668952bfc7", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-09", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "455d4438-bc59-4526-8ef4-1f1bdd6aa9eb", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-13", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "53cd2e07-39d1-4b1f-9fe1-0e250b010b23", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-24", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "5e92a8b2-eeee-4211-9896-62ad783e8468", "obra_id": "efbfe2f6-01a2-4700-ac1c-5c2a4c5e4913", "fecha": "2026-04-07", "produccion": {"fase1": 121.85, "fase2": 121.85, "fase3": 121.85}},
    {"id": "78ed81f1-eefe-4a82-80c6-eef9008d5721", "obra_id": "efbfe2f6-01a2-4700-ac1c-5c2a4c5e4913", "fecha": "2026-04-06", "produccion": {"fase1": 121.85, "fase2": 121.85, "fase3": 121.85}},
    {"id": "9d08477d-2748-4d56-b7f8-069a8e4f296b", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-10", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "b6a870f0-61e8-4c62-aeb8-ef4b05bbbeae", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-23", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "bebcecc9-e043-43b8-9bd4-6602e3dd2956", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-17", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "c2e59ec0-7b0c-4ede-8914-5d1e25883575", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-11", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "c3720888-3177-4572-80ef-c52040625f57", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-19", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "d6a01707-23cd-40cc-a389-5affc7875006", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-18", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}},
    {"id": "f0927f60-b719-4f77-9f1f-0fa93c0464f0", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-26", "produccion": {"fase1": 64.74, "fase2": 64.74, "fase3": 64.74, "fase4": 64.74}},
    {"id": "f1bcbe99-01f2-47be-8048-52298ecfe27a", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64", "fecha": "2026-03-12", "produccion": {"fase1": 39.74, "fase2": 39.74, "fase3": 39.74, "fase4": 39.74}}
  ],
  "partes_operarios": [
    # Simplificado: todos estuvieron en casi todos
    {"parte_id": "all", "operarios": ["Juan", "Mosquito", "Antonio", "Jesules", "David"]}
  ],
  "anticipos": [
    {"fecha": "2026-03-13", "op": "Juan", "cant": 400},
    {"fecha": "2026-03-13", "op": "Mosquito", "cant": 400},
    {"fecha": "2026-03-13", "op": "Antonio", "cant": 400},
    {"fecha": "2026-03-13", "op": "Jesules", "cant": 400},
    {"fecha": "2026-03-13", "op": "David", "cant": 400},
    {"fecha": "2026-03-20", "op": "Juan", "cant": 400},
    {"fecha": "2026-03-20", "op": "Mosquito", "cant": 400},
    {"fecha": "2026-03-20", "op": "Antonio", "cant": 400},
    {"fecha": "2026-03-20", "op": "Jesules", "cant": 400},
    {"fecha": "2026-03-20", "op": "David", "cant": 400},
    {"fecha": "2026-03-27", "op": "Juan", "cant": 400},
    {"fecha": "2026-03-27", "op": "Mosquito", "cant": 400},
    {"fecha": "2026-03-27", "op": "Antonio", "cant": 400},
    {"fecha": "2026-03-27", "op": "Jesules", "cant": 400},
    {"fecha": "2026-03-27", "op": "David", "cant": 400},
    {"fecha": "2026-04-03", "op": "Juan", "cant": 300},
    {"fecha": "2026-04-03", "op": "Mosquito", "cant": 300},
    {"fecha": "2026-04-03", "op": "Antonio", "cant": 300},
    {"fecha": "2026-04-03", "op": "Jesules", "cant": 300},
    {"fecha": "2026-04-03", "op": "David", "cant": 300},
    {"fecha": "2026-04-10", "op": "Juan", "cant": 500},
    {"fecha": "2026-04-10", "op": "Mosquito", "cant": 500},
    {"fecha": "2026-04-10", "op": "Antonio", "cant": 500},
    {"fecha": "2026-04-10", "op": "Jesules", "cant": 500},
    {"fecha": "2026-04-10", "op": "David", "cant": 500}
  ],
  "gastos": [
    {"concepto": "Llana dientes grandes Leroy Merlín", "monto": 14.79, "fecha": "2026-03-12", "pagado_por": "Antonio", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64"},
    {"concepto": "Plana dientes y fletal esponja", "monto": 27, "fecha": "2026-03-20", "pagado_por": "Mosquito", "obra_id": "a00c382a-13f9-4b82-a711-d4919b6b1c64"}
  ]
}

# --- TARIFAS (Para cálculos) ---
TARIFAS = {"fase1": 4.5, "fase2": 1, "fase3": 0.5, "fase4": 2}
OPERARIOS_COSTES = {"Juan": 120, "Mosquito": 120, "Antonio": 120, "Jesules": 80, "David": 70}

def calculate_economics(produccion, operarios_presentes):
    ingresos = sum(vol * TARIFAS.get(fid, 0) for fid, vol in produccion.items())
    coste_mo = sum(OPERARIOS_COSTES.get(op, 120) for op in operarios_presentes)
    beneficio = ingresos - coste_mo
    return {
        "ingresos": ingresos,
        "costeManoObra": coste_mo,
        "beneficio": beneficio,
        "beneficioPorOperario": beneficio / len(operarios_presentes) if operarios_presentes else 0
    }

# Convertir avances
avances = []
for p in backup_data["partes"]:
    ops = ["Juan", "Mosquito", "Antonio", "Jesules", "David"]
    econ = calculate_economics(p["produccion"], ops)
    avances.append({
        "id": p["id"],
        "fecha": p["fecha"],
        "obraId": p["obra_id"],
        "bloque": "Bloque 1",
        "operariosPresentes": ops,
        "produccion": [{"itemId": fid, "m2": vol, "bloque": "Bloque 1"} for fid, vol in p["produccion"].items()],
        "resumen": econ
    })

# Convertir anticipos
anticipos = []
for a in backup_data["anticipos"]:
    anticipos.append({
        "id": str(uuid.uuid4()),
        "fecha": a["fecha"],
        "obraId": backup_data["obras"][0]["id"] if "2026-03" in a["fecha"] else backup_data["obras"][1]["id"],
        "operario": a["op"],
        "cantidad": a["cant"]
    })

# Convertir gastos
gastos = []
for g in backup_data["gastos"]:
    gastos.append({
        "id": str(uuid.uuid4()),
        "fecha": g["fecha"],
        "obraId": g["obra_id"],
        "concepto": g["concepto"],
        "monto": g["monto"],
        "pagadoPor": g["pagado_por"]
    })

merged_data = {
    "obras": backup_data["obras"],
    "avances": avances,
    "anticipos": anticipos,
    "gastos": gastos,
    "items": {
        "fase1": {"nombre": "Colocación de Eps", "precio": 4.5},
        "fase2": {"nombre": "Fijación de Espigas", "precio": 1},
        "fase3": {"nombre": "Esquineros", "precio": 0.5},
        "fase4": {"nombre": "Armado de malla y planimetría", "precio": 2}
    },
    "operarios": [{"nombre": k, "coste": v} for k, v in OPERARIOS_COSTES.items()]
}

print(json.dumps(merged_data, indent=2))
