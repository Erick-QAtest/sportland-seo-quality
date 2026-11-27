"""Imprime el JSON de variables para articleUpdate (solo cuerpo).
Uso: python3 scripts/payload-articulo.py <gid> <archivo.html> > salida.json"""
import json, sys
print(json.dumps({'id': sys.argv[1], 'article': {'body': open(sys.argv[2], encoding='utf-8').read()}}))
