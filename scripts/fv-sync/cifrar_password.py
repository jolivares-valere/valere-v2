"""
Ejecutar desde: scripts/fv-sync/  con el venv activado
  python ../../AppData/.../outputs/cifrar_password.py
O copiar este archivo a scripts/fv-sync/ y ejecutar:
  python cifrar_password.py
"""
import getpass
import sys
import os

# Añadir el directorio del script al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from crypto import encrypt_password
except ImportError:
    # Si se ejecuta desde otro directorio
    script_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, script_dir)
    from crypto import encrypt_password

KEY = "1doMcEYZBiBnKo5npSgV1JGzDlBDYT0m0LSXBWyefts="

print("=== Cifrador de contraseña FusionSolar ===")
print("(La contraseña NO se muestra al escribir)\n")

try:
    pw = getpass.getpass("Contraseña FusionSolar de JOLIVARES: ")
    if not pw:
        print("ERROR: contraseña vacía")
        sys.exit(1)
    blob = encrypt_password(pw, KEY)
    print(f"\nBlob cifrado:\n{blob}\n")
    print("Copia ese blob y dáselo a Claude para actualizar Supabase.")
except KeyboardInterrupt:
    print("\nCancelado.")
