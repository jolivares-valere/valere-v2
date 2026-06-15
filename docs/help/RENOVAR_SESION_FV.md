# Cómo renovar la sesión de FusionSolar (sincronización FV)

FusionSolar (Huawei) cierra la sesión cada pocas semanas y obliga a iniciar sesión
a mano (a veces con CAPTCHA). Por eso la sincronización automática necesita que,
de vez en cuando, una persona renueve la sesión. Es rápido: unos 2 minutos.

## Cuándo hay que hacerlo
- Cuando en el CRM (Plantas FV → Credenciales) una credencial aparece en rojo:
  «Sesión caducada» o «Error de sesión».
- Cuando recibes un email de aviso de que las cookies van a caducar.

## Primera vez en tu PC (solo una vez)
1. Pide a Juan la carpeta `Renovador Valere FV` y la «anon key» del CRM.
2. Botón derecho en `INSTALAR_RENOVADOR.ps1` → «Ejecutar con PowerShell».
   (Instala lo necesario; no guarda ninguna contraseña.)

## Renovar una sesión
1. Doble clic en `RENOVAR_SESION_FV.bat`.
2. Escribe tu email y contraseña del CRM (los mismos con los que entras a Valere).
3. Elige la credencial que quieres renovar (por ejemplo, JOLIVARES).
4. Escribe la contraseña del portal FusionSolar (no se guarda en ningún sitio).
5. Se abre un navegador: inicia sesión en FusionSolar y resuelve el CAPTCHA si aparece.
6. Cuando entres al panel, el navegador se cierra solo y verás «Cookies guardadas».
7. Vuelve al CRM y pulsa «Sincronizar» en esa credencial.

## Seguridad
- Tu PC nunca guarda contraseñas ni claves de cifrado.
- Las cookies se cifran en el servidor (no en tu ordenador).
- Solo usuarios admin/master del CRM pueden renovar.
