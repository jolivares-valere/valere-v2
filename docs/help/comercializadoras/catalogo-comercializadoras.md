# Catalogo de comercializadoras y condiciones de comision

**Ruta:** menu CRM -> Comercializadoras (`/comercializadoras`)

## Que es
El catalogo maestro de canales de venta de Valere. Cada comercializadora aparece con:
- **Via de acceso**: Directa, Via Zoco (Zoco retiene el 10%, a Valere llega el 90%) o
  Via Xentia (EDP Empresas: la comision llega ya neta).
- **Segmento**: cuando las reglas cambian por segmento son entidades distintas
  (EDP Grandes Cuentas y EDP Empresas; Endesa solo pyme).
- **Condiciones de comision** por producto: tipo de regla (% sobre fee, % sobre margen,
  fijo por tarifa, EUR/kW, tramos por volumen), componente (energia/potencia/periodo/servicio),
  valor, cadencia de pago (one-shot, mensual, trimestral), si comisiona renovacion y su vigencia.

## Reglas importantes
- Los **importes/porcentajes son pactos comerciales**: los edita un admin desde la propia
  pagina (boton Editar en cada condicion). El resto de roles ven el catalogo en solo lectura.
- Las **adendas caducan**: las de Audax, ADX y NEXUS (+10%) vencen el 31/12/2026. La columna
  Vigencia avisa en ambar cuando quedan 60 dias o menos, y en rojo si ya caducaron.
- **NATURGY, ENDESA y PLENITUDE no comisionan renovacion** (tras 12 meses). Renovar Naturgy
  (la mayor cartera) es defensa de cartera, no ingreso.

## Como afecta al alta de contratos
En el formulario de contrato la compania **se elige del catalogo** (desplegable); ya no se
escribe a mano. Esto garantiza grafia unica (NEXUS, no "Nexus Energia") y que cada contrato
quede vinculado a sus condiciones de comision. Los contratos antiguos se resuelven solos al
editarlos si su compania coincide con el catalogo.

## Para dar de alta una comercializadora nueva
El maestro es abierto: un admin puede insertarla (de momento por SQL o pidiendo el alta;
el alta desde UI llega con el modulo de comisiones F4). Al crearla, definir: nombre canonico
en mayusculas, via de acceso y sus condiciones.
