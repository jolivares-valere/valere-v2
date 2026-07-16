# DOC 1 — Análisis comparativo de plataformas (telemedida, FV y CRM energético)

> **Objetivo**: comparar las plataformas que usa Valere hoy para decidir qué internalizar en el CRM propio. Cuatro plataformas analizadas en vivo, módulo a módulo, entre el 12 y el 13 de junio de 2026: **Telegest** (Energygest), **Linkener** (SIGE), **Segenet** y **Zocoenergía**.
>
> **Fecha**: 2026-06-13 · **Autor**: Cowork (Agente 1) · Fuentes: `notas_telegest.md`, `notas_solar_telegest.md`, `conectividad_contadores_telegest.md`, `notas_linkener.md`, `notas_segenet.md`, `notas_zocoenergia.md`.

---

## 0. Mapa de un vistazo: qué es cada una

| Plataforma | Categoría | Para qué la usa Valere | Fortaleza principal |
|---|---|---|---|
| **Telegest** (Energygest) | Telemedida + analítica energética | Lectura de contadores fiscales (30 suministros) y "solar" | Lectura directa de contadores (IEC-102) e inversores cloud; estudio de potencia doble escenario |
| **Linkener** (SIGE) | Telemedida + EMS moderno | Telemedida de ~16 suministros | Arquitectura moderna, organigrama multinivel, IA por agentes, teleactuación |
| **Segenet** | Telemedida media | Telemedida de 10 suministros | Optimización de potencia AUTOMÁTICA mensual; simulación de factura con pérdidas + coseno φ |
| **Zocoenergía** | **CRM de asesoría energética** | CRM comercial (contratos, comisiones, comparadores, SIPS) | SIPS/Datadis instantáneo por CUPS; motor de comisiones; OCR; verificación por llamada |

**Dos familias distintas**:
- **Telemedida/EMS** (Telegest, Linkener, Segenet): leen el dato físico del contador/inversor y lo explotan (curvas, optimización, simulación). Es de donde Valere quiere extraer la **lectura directa**.
- **CRM comercial** (Zocoenergía): gestiona el negocio de la asesoría (ventas, contratos, comisiones) y consulta datos administrativos del CUPS por **SIPS/Datadis** (no lee hardware). Es la referencia funcional directa del **CRM Valere** que estamos construyendo, y de donde sale el "cómo se conecta con SIPS".

---

## 1. Ficha por plataforma

### 1.1 Telegest (Energygest) — telemedida + analítica
- **Stack**: PHP server-rendered (jQuery 1.8, Bootstrap 2/3, amCharts 3 — generación 2012). Multitenancy por path `/asesoriaN/`. White-label Valere (tema verde). Sin API REST pública.
- **Telemedida**: contador fiscal por **IEC 60870-5-102** vía GPRS/IP o GSM/CSD. Curva horaria/cuartohoraria + cierres mensuales + instantáneos por fase (V, I, P, Q, FP). 30 suministros con telemedida (19 IP-GPRS + 11 GSM); concentrador TCP único de Energygest (`135.125.28.202` multiplexado por puerto). Submetering (multi-contador por CUPS).
- **FV / inversores**: lee inversores por **cuenta cloud del fabricante (user+pass, "bot")** — 4 marcas: Solis, SMA, Huawei, Sungrow. NO Modbus (salvo caso Deraza, SmartLogger IP local). Verificado por correos y POC propio (TRH = 4× Sungrow SG110CX; Deraza = 7× Huawei SUN2000). Cobra ~10 €/mes/planta.
- **Explotación**: estudio de potencia **doble escenario** (mantener tipo 3 vs cambiar a tipo 4), potencias óptimas P1-P6, **estudio "regantes"** (estacional), batch nocturno multisuministro; **simulación + validación de factura** (>2% desviación = aviso); sinóptico FV (inferido del contador bidireccional); 9 tipos de incidencias de calidad; Synctia (pre-estudio baterías).
- **Debilidad**: stack anticuado, UX por recargas, Google Maps API key expuesta, sin CRM (ni pipeline ni comisiones), seguridad PHP-session sin 2FA.

### 1.2 Linkener (SIGE) — el más moderno
- **Stack**: **Angular SPA + microservicios REST** (`server.meters.es/v1/...`) + **OAuth2/OIDC con Ory Hydra (JWT)**. Lo más avanzado de las cuatro. White-label "ValereVitaly". ~16 suministros.
- **Telemedida**: curva H/CH/D/Sem/M, gráficos multi-dispositivo con muchas variables (activa, reactiva ind./cap., potencia, importes, precio OMIE, límite reactiva) + variables de **producción FV**. Endpoint `legacy-service/api/v2/graph`. **Datadis** integrado.
- **Diferenciales**: **Link·IA** (hasta 10 agentes de IA por cuenta que responden sobre suministros/contratos/facturación); **organigrama visual multinivel** (empresa→suministros→usuarios, drag&drop); **teleactuación** (cortar/reconectar contador en remoto); dashboards configurables; validador de facturas; gestor de penalizaciones.
- **Debilidad**: no se vio lectura directa de inversores (variables FV pero origen no confirmado); orientado a EMS, no a CRM comercial.

### 1.3 Segenet — telemedida media con automatización
- **Stack**: Laravel/PHP + Bootstrap 4 + amCharts 4 + jQuery. **API REST v2** (`/api/v2/probes`, `/data`, `/closes`, `/maximeter`, `/reactive`, `/fv`...). White-label. 10 suministros, 9 puntos fiscales (6.1TD/3.0TD/6.2TD).
- **Diferenciales**: **optimización de potencia AUTOMÁTICA a principios de cada mes** (sola, sin pedirla); **simulación de factura con pérdidas de red + coseno φ** (más fina que el resto); **comprobar facturas** (PDF real vs telemedida); **mapa de calor** de consumo (horas×días); comparador de ofertas con 4 métodos de carga (sistema/Excel/SIPS/distribuidora); rankings y estadísticas; **FV nativa** (contador bidireccional). 
- **Relevante**: Zocoenergía **revende la telemedida de Segenet** vía su API (`/api/tools/segenet/*`). Es decir, Segenet es proveedor mayorista de telemedida para otros CRMs.
- **Debilidad**: generación FV inferida del contador (como Telegest), no del inversor; stack intermedio.

### 1.4 Zocoenergía — CRM de asesoría (referencia directa del CRM Valere)
- **Stack**: **Laravel/PHP + Vue SPA (Vite)**. API REST propia `/api/...` (cookie + XSRF). Multitenant por `enterprise`. Login Google + user/pass.
- **CRM completo**: Escritorio (KPIs comisiones/consumo/rentabilidad), **Contratos** (con 3 vías de alta: en cuenta / directa / **por factura con OCR**), **Cuentas** (cliente), **Oportunidades** (pipeline), Contactos, Tareas, Calendario, **Liquidaciones** (comisiones por agente/comercializadora, export PDF/Excel), **Productos** (catálogo comercializadoras + comisiones), Documentos, **Mi red** (red de agentes multinivel), Herramientas.
- **⭐ SIPS instantáneo por CUPS** (lo que Juan quería entender): con solo el CUPS, el backend devuelve titular (CIF), consumo P1-P6, potencia/maxímetro, tarifa, curva de facturación 12 meses y último cambio de comercializadora. Endpoints: `orders/getAPIConsumption`, `tools/getAPIConsumption`, `accounts/getCIFByCUPS`, `sips/getGasCupsByAddress` (SIPS de gas por dirección, estructura oficial Nedgia). **Fuente: SIPS oficial + Datadis**, consultado desde el servidor y normalizado.
- **Herramientas**: comparador de luz / luz multipunto / gas / **telefonía**; buscador de CUPS; optimizador de potencia (solo 3.0TD); creador de banner; monitorización de contadores (vía **Segenet**); administración (estados configurables, correo masivo, registros/auditoría, editor de permisos, fichajes).
- **Integraciones**: SIPS, Datadis, Segenet (telemedida), **OCR** de facturas, **Twilio** (llamadas de verificación grabadas + SMS + descarga de llamada Naturgy), Google.
- **Debilidad**: sin telemedida propia (depende de Segenet), sin lectura de inversores FV, optimizador solo 3.0TD; **seguridad floja** (APP_DEBUG=true en producción con stack traces, posible IDOR multitenant en `/api/enterprises/:id`, catálogo de comisiones expuesto, sin HSTS/X-Frame-Options). Es SaaS de terceros (sin control de datos ni roadmap, con cuota).

---

## 2. Tabla comparativa

| Criterio | Telegest | Linkener | Segenet | Zocoenergía |
|---|---|---|---|---|
| **Categoría** | Telemedida+analítica | Telemedida/EMS | Telemedida media | **CRM comercial** |
| **Stack** | PHP/jQuery 2012 | Angular+microservicios+OAuth2 | Laravel+Bootstrap4 | Laravel+Vue |
| **API REST** | No pública | Sí (microservicios) | Sí (v2 documentada) | Sí (propia) |
| **Lectura contador (IEC-102)** | ✅ directa | ✅ (+Datadis) | ✅ | ❌ (usa Segenet) |
| **Lectura inversor FV** | ✅ cloud fabricante (bot) | ~ variables FV | ~ contador bidireccional | ❌ |
| **SIPS por CUPS** | parcial | sí | sí (carga ofertas) | ✅ **instantáneo y completo** |
| **Datadis** | — | ✅ | ✅ | ✅ |
| **OCR de factura** | — | — | comprobar facturas | ✅ (alta por factura) |
| **Estudio de potencia** | ✅ doble escenario + regantes | ~ | ✅ **automático mensual** | solo 3.0TD |
| **Simulación de factura** | ✅ potente | ✅ | ✅ pérdidas+cos φ | comparador |
| **Validación factura real** | ✅ | ✅ | ✅ | ✅ (comparador) |
| **CRM (contratos/pipeline)** | ❌ | ~ (EMS) | ~ ofertas | ✅ completo |
| **Comisiones / liquidaciones** | ❌ | ❌ | ❌ | ✅ **motor + red multinivel** |
| **Verificación por llamada** | ❌ | ❌ | ❌ | ✅ Twilio grabada |
| **IA / asistente** | chat básico | ✅ **Link·IA agentes** | ❌ | ❌ |
| **Organigrama multinivel** | ❌ | ✅ **visual** | ❌ | ✅ Mi red |
| **Teleactuación contador** | (Synctia baterías) | ✅ | ❌ | ❌ |
| **Telefonía (comparador)** | ❌ | ❌ | ❌ | ✅ |
| **Seguridad** | PHP session, sin 2FA, API key Maps expuesta | OAuth2/JWT (la mejor) | login 3 pasos | **floja** (APP_DEBUG, posible IDOR, sin HSTS) |
| **Dependencia para Valere** | proveedor acceso contadores | SaaS | proveedor telemedida mayorista | SaaS competidor |

---

## 3. Lecturas clave para Valere

**De dónde sale cada capacidad que queremos:**
- **Lectura directa de contadores e inversores** → de **Telegest** (IEC-102 + bot cloud de inversores). Es el núcleo del proyecto `PLAN_TELEMEDIDA_FV_DIRECTA`. Ninguna otra lo hace tan directo; Zoco ni siquiera lo intenta (revende Segenet).
- **SIPS/Datadis instantáneo por CUPS** → de **Zocoenergía**. Es el "truco" que Juan quería entender: no es magia, es consultar SIPS oficial + Datadis desde el backend y cachear. El CRM Valere ya tiene la base (Datadis + SIPS a medias) → cerrarlo da paridad inmediata.
- **Estudio de potencia avanzado** → de **Telegest** (doble escenario, regantes) y **Segenet** (automático mensual, pérdidas+cos φ). Valere debe combinar ambos: motor de optimización multi-tarifa (no solo 3.0TD como Zoco) y job mensual automático.
- **CRM comercial + comisiones + red de agentes** → de **Zocoenergía**. Es lo que Valere gestiona hoy en Excel y Zoco tiene resuelto. Oportunidad grande (Liquidaciones + Mi red multinivel).
- **OCR de factura para alta/comparador** → de **Zoco** y **Segenet**. Valere ya tiene importador/OCR → conectarlo al alta de contrato y al comparador.
- **Arquitectura/seguridad de referencia** → de **Linkener** (Angular+microservicios+OAuth2/JWT, organigrama visual, IA por agentes). Valida que el CRM Valere (React+Supabase, RLS, asistente RAG) va en la dirección correcta; subir el listón con organigrama y agentes IA.
- **Verificación de contrato por llamada grabada (Twilio)** → de **Zoco**. Diferencial de cumplimiento normativo.

**Qué NINGUNA tiene (hueco de mercado para Valere):**
- Ficha única que combine **(a) telemedida directa del contador + (b) producción real por inversor FV + (c) datos administrativos SIPS/Datadis + (d) CRM comercial con comisiones**. Telegest tiene a+b; Zoco tiene c+d; nadie las cuatro. **Ese es el producto diferencial de Valere.**

---

## 4. Conclusión

Valere paga hoy por cuatro plataformas que, sumadas, hacen lo que un único CRM propio podría hacer:
- Telegest y Segenet/Linkener aportan el **dato físico** (contador/inversor) — internalizable con el proyecto de telemedida directa (VPS + IEC-102 + bot cloud).
- Zocoenergía aporta el **dato administrativo y el negocio** (SIPS/Datadis instantáneo + contratos + comisiones) — replicable porque el CRM Valere ya tiene Datadis, SIPS y calculadora empezados.

El camino: cerrar el **SIPS/Datadis por CUPS** (rápido, alto impacto, ya casi montado) para igualar a Zoco; e ir ejecutando el **proyecto de telemedida/FV directa** para superar a todos en el dato físico. Resultado: un solo sistema, sin cuotas de terceros, con control total de datos (RGPD) y un diferencial que ninguna de las cuatro plataformas ofrece hoy.

> Continúa en **DOC 2 — Propuesta priorizada de mejoras** y **DOC 3 / PLAN_TELEMEDIDA_FV_DIRECTA**.
