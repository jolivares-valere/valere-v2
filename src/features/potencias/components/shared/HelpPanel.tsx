// =====================================================================
// HelpPanel — Ayuda contextual por pagina.
//
// Mantener este archivo ACTUALIZADO conforme se implementen mejoras:
// cada vez que se anade/cambia una funcionalidad relevante en una pagina,
// se actualiza el bloque correspondiente aqui. Esto es la unica fuente de
// verdad para las ayudas contextuales de la app.
//
// Cambios recientes (mantener orden por fecha descendente):
//   2026-04-17 — Autorizacion Valere conjunta multi-CUPS: PDF legal unico
//                con texto de apoderamiento, clausula LOPDGDD/RGPD, tabla
//                de todos los CUPS y una sola firma. Accesible desde lista
//                de Expedientes (seleccion multiple) y desde detalle de cliente.
//   2026-04-17 — Nuevo expediente en lote multi-CUPS: seleccion multiple de
//                suministros, estrategia comun (valor fijo / % reduccion /
//                manual), preview por CUPS y creacion en batch.
//   2026-04-17 — Campo "Gestor" en clientes. Firma el gestor asignado los
//                comunicados al cliente (antes era siempre el usuario logueado).
//   2026-04-17 — Firma rediseñada con paleta Valere (azul + verde), iconos
//                circulares azules, logo circular comun, direccion unificada.
//   2026-04-17 — Email de Presentacion: se adjunta PDF de propuesta con la
//                misma informacion (para que el cliente lo firme y devuelva).
//                Anadido 4o documento requerido: documentacion excepcional.
//                Copia del PDF queda en la carpeta del cliente.
//   2026-04-17 — Envio masivo "Presentacion del servicio" con seleccion
//                multiple de clientes. Usa datos reales de los expedientes
//                abiertos (potencias, ahorros, fechas). Menciona los 3
//                documentos necesarios (autorizacion Valere, autorizacion
//                comercializadora, CIE/boletin).
//   2026-04-17 — Importacion multi-suministro desde Excel (Clientes y
//                Detalle de cliente). Plantillas de mapeo por comercializadora.
//   2026-04-17 — Fase "pendiente_firma_cliente", boton "Generar autorizacion",
//                "Subir firmado", "Retroceder" y modo ficha para PDFs planos.
//   2026-04-17 — Borrar en clientes/suministros/expedientes con confirmacion.
//   2026-04-16 — Carpeta de documentos por cliente, calendario por meses.
// =====================================================================
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle, X } from 'lucide-react';

export type HelpKey =
  | 'expediente'
  | 'clientes'
  | 'suministros'
  | 'expedientes'
  | 'calendario'
  | 'documentacion'
  | 'dashboard';

interface Props {
  topic: HelpKey;
  /** Si true, muestra solo un icono flotante pequeno (barra superior) */
  compact?: boolean;
  className?: string;
}

export default function HelpPanel({ topic, compact = false, className = '' }: Props) {
  const [open, setOpen] = useState(false);

  const content = HELP_CONTENT[topic];
  if (!content) return null;

  return (
    <>
      <Button
        variant={compact ? 'ghost' : 'outline'}
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
        title="Ayuda sobre esta pagina"
      >
        <HelpCircle size={compact ? 16 : 14} className={compact ? '' : 'mr-1'} />
        {!compact && 'Ayuda'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#284e8f]">
              <HelpCircle size={20} /> {content.title}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700 space-y-3" dangerouslySetInnerHTML={{ __html: content.html }} />
        </DialogContent>
      </Dialog>
    </>
  );
}

// =====================================================================
// Contenido de las ayudas — edita aqui cuando cambies funcionalidad.
// Formato: title + html (permite tags basicos para dar estructura).
// =====================================================================
const HELP_CONTENT: Record<HelpKey, { title: string; html: string }> = {
  expediente: {
    title: 'Ayuda — Detalle de expediente',
    html: `
<p>Un expediente tiene uno o varios <strong>ciclos</strong>. Cada ciclo incluye una solicitud de <strong>BAJADA</strong> de potencia y otra de <strong>SUBIDA</strong> para devolver la potencia a sus valores originales.</p>

<h3 class="text-[#284e8f] font-semibold mt-4">Flujo de estados de cada solicitud</h3>
<ol class="list-decimal pl-5 space-y-1">
  <li><strong>Borrador</strong> — recien creada, aun no se ha iniciado el proceso.</li>
  <li><strong>Pendiente firma cliente</strong> (color ambar) — se ha mandado al cliente el documento de autorizacion; esperamos que lo firme y lo devuelva.</li>
  <li><strong>Solicitud enviada</strong> — ya tramitada con la comercializadora/distribuidora.</li>
  <li><strong>Autorizado</strong> — la distribuidora confirma el cambio con referencia.</li>
  <li><strong>Ejecutado</strong> — el cambio es efectivo en la red.</li>
</ol>

<h3 class="text-[#284e8f] font-semibold mt-4">Botones disponibles</h3>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>Generar autorizacion</strong> (azul, solo en Borrador) — crea el PDF de autorizacion usando la plantilla de la comercializadora, lo guarda en la carpeta del cliente y lo envia por email con una ficha de datos. Avanza automaticamente a "Pendiente firma cliente".</li>
  <li><strong>Subir firmado</strong> (solo en Pendiente firma) — sube el PDF que el cliente ha devuelto firmado.</li>
  <li><strong>Avanzar</strong> — pasa al siguiente estado del flujo.</li>
  <li><strong>Retroceder</strong> (ambar) — vuelve al estado anterior. Util durante pruebas: limpia las fechas y referencias del estado abandonado para que puedas rehacer esa fase desde cero (por ejemplo, cambiar el email del cliente y reenviar la autorizacion).</li>
</ul>

<h3 class="text-[#284e8f] font-semibold mt-4">Plantillas de autorizacion</h3>
<p>Se configuran una sola vez en <strong>Documentacion &rsaquo; Comercializadoras</strong>:</p>
<ul class="list-disc pl-5 space-y-1">
  <li>Si el PDF tiene <em>campos de formulario (AcroForm)</em>, se rellenan automaticamente con los datos del cliente/CUPS/potencias.</li>
  <li>Si el PDF es <em>plano</em> (lineas de subrayado, sin campos), el sistema usa <strong>modo ficha</strong>: adjunta el PDF en blanco + incluye en el email una tabla clara con todos los datos a transcribir.</li>
</ul>

<h3 class="text-[#284e8f] font-semibold mt-4">Editar datos del cliente</h3>
<p>Usa el boton <strong>Editar cliente</strong> de la cabecera para cambiar el email u otros datos sin salir del expediente. Despues pulsa <strong>Retroceder</strong> en la solicitud para rehacer el envio.</p>

<h3 class="text-[#284e8f] font-semibold mt-4">Historial</h3>
<p>Todos los cambios de estado quedan registrados en <em>Historial de cambios</em>, incluidos los retrocesos con su motivo.</p>
`,
  },

  clientes: {
    title: 'Ayuda — Clientes',
    html: `
<p>Gestion de la cartera de clientes. Cada cliente puede tener varios suministros (CUPS) y expedientes asociados.</p>

<h3 class="text-[#284e8f] font-semibold mt-3">👥 Asesor vs Gestor</h3>
<p>Cada cliente puede tener dos perfiles del equipo asignados:</p>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>Asesor</strong> — quien capto al cliente (rol comercial). Solo informativo.</li>
  <li><strong>Gestor</strong> — quien tramita los expedientes dia a dia. <strong>Es quien aparece como firmante</strong> en los emails que el sistema manda al cliente (presentacion, autorizaciones, etc.), con su pie de firma corporativo Valere. Si no hay gestor asignado, firma el usuario que envia el correo.</li>
</ul>
<p>En la columna "Gestor" aparece un punto verde indicando que ese cliente tiene firmante automatico configurado.</p>

<h3 class="text-[#284e8f] font-semibold mt-3">Acciones disponibles</h3>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>Nuevo cliente</strong> — crea manualmente o sube un PDF de factura y se autorellenan los datos del cliente + 1 suministro.</li>
  <li><strong>Importar Excel</strong> — para clientes multi-CUPS. Sube el Excel que envia la comercializadora y da de alta cliente + todos los suministros en un solo paso. Ver detalle mas abajo.</li>
  <li><strong>Ojo</strong> — ver detalle completo, con suministros, expedientes y documentos generados.</li>
  <li><strong>Editar</strong> — modificar datos del cliente.</li>
  <li><strong>Borrar</strong> (rojo) — soft-delete con confirmacion. Requiere escribir "BORRAR". Tambien desactiva los suministros asociados. El historial se conserva.</li>
</ul>

<h3 class="text-[#284e8f] font-semibold mt-4">📤 Enviar presentacion del servicio (envio masivo)</h3>
<p>Usa el <strong>checkbox</strong> de cada fila para seleccionar uno o varios clientes. Cuando haya al menos uno marcado,
aparece un boton <strong>"Enviar presentacion (N)"</strong> en la cabecera.</p>
<p>Este email tiene como objetivo informar al cliente del servicio y del ahorro que hemos calculado para el, antes de
pedirle las autorizaciones formales. El email incluye automaticamente:</p>
<ul class="list-disc pl-5 space-y-1">
  <li>Los datos reales de sus expedientes abiertos (CUPS, tarifas, potencias actuales y propuestas).</li>
  <li>El ahorro previsto calculado en el estudio de cada expediente.</li>
  <li>Formato <strong>detallado por CUPS</strong> si tiene 5 o menos. <strong>Tabla resumen</strong> (CUPS, tarifa, ahorro por periodo y total) si tiene mas de 5 — invitando al cliente a solicitar el detalle ampliado.</li>
  <li>El ahorro total conjunto destacado.</li>
  <li>Los <strong>4 documentos</strong> que necesitamos: autorizacion a Valere, autorizacion de la comercializadora/distribuidora, CIE o boletin electrico, y documentacion excepcional si procede.</li>
</ul>

<p><strong>📎 PDF adjunto automatico:</strong> el email lleva adjunto un PDF de propuesta con la <strong>misma informacion</strong>, incluyendo un apartado de <strong>firma y sello</strong> para que el cliente lo devuelva conforme. Se guarda tambien automaticamente en la carpeta de documentos del cliente.</p>

<p><strong>Requisitos:</strong> el cliente debe tener email de contacto y al menos un expediente activo con una solicitud de bajada. Los clientes que no cumplan se marcaran como "omitidos" en el dialogo y no se les enviara nada.</p>
<p><strong>Opciones del dialogo:</strong></p>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>Previsualizar email</strong> — ver como quedara el email en una pestana antes de enviar.</li>
  <li><strong>Previsualizar PDF</strong> — abrir el PDF de propuesta generado para revisarlo.</li>
  <li><strong>Cuerpo personalizado</strong> — reemplazar la introduccion por un texto tuyo. Las tablas de datos/ahorro y los documentos requeridos se mantienen automaticamente.</li>
  <li><strong>Adjuntar PDF</strong> — activable/desactivable.</li>
  <li><strong>Guardar PDF en la carpeta del cliente</strong> — se archiva automaticamente.</li>
  <li><strong>CC al asesor</strong> — copia al asesor asignado de cada cliente.</li>
</ul>

<h3 class="text-[#284e8f] font-semibold mt-4">📊 Importar Excel multi-suministro</h3>
<p>Flujo en 5 pasos:</p>
<ol class="list-decimal pl-5 space-y-1">
  <li><strong>Subida</strong> — elige comercializadora (opcional pero recomendado) y arrastra el .xlsx / .xls / .csv.</li>
  <li><strong>Mapeo</strong> — el sistema detecta automaticamente las columnas por su nombre (CUPS, P1-P6, tarifa, etc.). Revisa y corrige si es necesario. Los campos obligatorios estan marcados con ⭐.</li>
  <li><strong>Previsualizacion</strong> — tabla con todas las filas: verde = OK, ambar = avisos, rojo = errores (se omitiran). Puedes ver los errores antes de importar.</li>
  <li><strong>Datos del cliente</strong> — si el CIF ya existe, se asocian al cliente existente; si no, creas uno nuevo.</li>
  <li><strong>Resumen</strong> — cuantos CUPS se crearon, cuantos se omitieron por duplicado, cuantos fallaron.</li>
</ol>
<p class="mt-2"><strong>Plantillas de mapeo:</strong> al importar con una comercializadora seleccionada, el mapeo se guarda. La proxima vez que subas un Excel de esa misma comercializadora, se aplicara automaticamente.</p>
<p class="text-xs text-gray-500 mt-2">Nota: tambien puedes importar CUPS a un cliente existente desde <strong>Detalle del cliente &rsaquo; Suministros &rsaquo; Importar Excel</strong>.</p>
`,
  },

  suministros: {
    title: 'Ayuda — Suministros (CUPS)',
    html: `
<p>Listado de todos los puntos de suministro activos. Cada suministro esta vinculado a un cliente y puede tener varios expedientes.</p>
<h3 class="text-[#284e8f] font-semibold mt-3">Acciones</h3>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>Ojo</strong> — ir al cliente propietario.</li>
  <li><strong>Borrar</strong> — soft-delete con confirmacion. Los expedientes historicos se conservan.</li>
</ul>
<p class="text-xs text-gray-500 mt-3">El suministro se crea automaticamente al subir una factura desde "Nuevo cliente".</p>
`,
  },

  expedientes: {
    title: 'Ayuda — Expedientes',
    html: `
<p>Lista global de todos los expedientes abiertos. Cada expediente es una autorizacion al amparo del <strong>RDL 7/2026</strong> para bajar y posteriormente subir la potencia de un CUPS.</p>
<h3 class="text-[#284e8f] font-semibold mt-3">Columnas</h3>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>Ciclos</strong>: cuantos pares bajada+subida se han realizado.</li>
  <li><strong>Ahorro previsto</strong>: calculado con los precios regulados CNMC vigentes.</li>
  <li><strong>Ahorro real</strong>: una vez ejecutado el ciclo, se calcula con fechas efectivas.</li>
</ul>
<h3 class="text-[#284e8f] font-semibold mt-3">Acciones</h3>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>Nuevo expediente</strong> — asistente que calcula el ahorro previsto, genera el estudio en la carpeta del cliente y crea la solicitud de bajada en borrador. <strong>Soporta multi-CUPS:</strong> puedes marcar uno, varios o todos los suministros del cliente y crear los expedientes de golpe.</li>
  <li><strong>Borrar</strong> — marca como "cancelado" (soft delete). Requiere escribir "CANCELAR".</li>
</ul>

<h3 class="text-[#284e8f] font-semibold mt-4">📝 Autorización Valere conjunta (multi-CUPS)</h3>
<p>Para clientes con varios CUPS (Bidafarma, cadenas, comunidades…) puedes generar un <strong>único documento legal</strong> con la autorización a Valere que agrupa <strong>todos los CUPS</strong> en una sola firma del titular/representante legal.</p>
<p><strong>Dónde:</strong></p>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>En la lista de Expedientes:</strong> marca los checkboxes de los expedientes del mismo cliente → boton <strong>"Autorizacion Valere (N)"</strong>.</li>
  <li><strong>En el detalle del cliente:</strong> boton <strong>"Autorizacion Valere conjunta"</strong> junto a la lista de CUPS — incluye todos sus expedientes activos.</li>
</ul>
<p><strong>Qué genera:</strong> un PDF profesional con:</p>
<ul class="list-disc pl-5 space-y-1">
  <li>Datos del titular (razón social, CIF, domicilio).</li>
  <li>Datos del representante legal (nombre, DNI, cargo) que tu introduces en el dialogo.</li>
  <li>Texto legal de apoderamiento de representación.</li>
  <li>Tabla con todos los CUPS (CUPS, tarifa, dirección, comercializadora).</li>
  <li>Cláusula GDPR/LOPDGDD adaptada a la normativa vigente.</li>
  <li>Un único bloque de firma + sello.</li>
</ul>
<p>El PDF se adjunta al email del cliente y queda guardado en su carpeta de documentos. Cuando reciba la respuesta firmada, subidlo desde la misma carpeta.</p>

<h3 class="text-[#284e8f] font-semibold mt-4">📦 Crear expedientes multi-CUPS</h3>
<p>En <strong>Expedientes → Nuevo</strong>, al seleccionar un cliente con varios suministros, aparecen checkboxes para marcar cuales incluir. Se crea un expediente independiente por cada CUPS marcado, todos con la misma configuracion de fechas y canal.</p>
<p><strong>Estrategias para fijar las potencias propuestas:</strong></p>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>Bajar P1–P5 a valor fijo</strong> (por defecto 1 kW) — todos los periodos se ponen al mismo valor minimo.</li>
  <li><strong>Reducir % sobre actuales</strong> — por ejemplo "reducir 50%": cada periodo baja a la mitad de su potencia actual.</li>
  <li><strong>Definir individualmente</strong> — tabla editable con una fila por CUPS donde puedes ajustar cada potencia manualmente.</li>
</ul>
<p>La tabla de revision muestra para cada CUPS su estado (✓ OK / ⚠ avisos / ❌ error). Los que tengan error se omitiran automaticamente. El total de ahorro global suma todos los CUPS.</p>
`,
  },

  calendario: {
    title: 'Ayuda — Calendario',
    html: `
<p>Vista mensual de los periodos de potencia facturables y las acciones recomendadas (subir/bajar).</p>
<h3 class="text-[#284e8f] font-semibold mt-3">Como leer el calendario</h3>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>P1/P2 altos en invierno</strong> → conviene <strong>bajar</strong> antes de la temporada alta si no hay consumo punta real.</li>
  <li><strong>P6 nunca se toca</strong> — se mantiene para conservar los derechos de extension de red.</li>
  <li><strong>Temporada alta</strong> (noviembre-febrero) → momento critico para tener las potencias bajadas.</li>
  <li><strong>Temporada baja</strong> (verano) → ventana tipica para devolver potencia (subida) sin coste economico.</li>
</ul>
`,
  },

  documentacion: {
    title: 'Ayuda — Documentacion',
    html: `
<p>Repositorio de manuales, normativa y plantillas.</p>
<h3 class="text-[#284e8f] font-semibold mt-3">Pestanas</h3>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>General</strong> — manuales de uso, circulares CNMC, plantillas genericas.</li>
  <li><strong>Comercializadoras</strong> — documentos oficiales de cada comercializadora.</li>
</ul>
<h3 class="text-[#284e8f] font-semibold mt-3">Plantillas de autorizacion</h3>
<p>Al subir un PDF a una comercializadora, pulsa el icono <strong>⚙️</strong> para configurarlo como plantilla de autorizacion:</p>
<ul class="list-disc pl-5 space-y-1">
  <li>Si el PDF tiene campos de formulario (AcroForm), mapea cada campo a los datos del sistema (nombre fiscal, CIF, CUPS, potencias...). Se rellenara 100% automaticamente al usarlo en un expediente.</li>
  <li>Si el PDF es plano, el sistema lo detecta y activa el <strong>modo ficha</strong>: se envia el PDF en blanco + una ficha de datos muy clara en el email para que el cliente copie a mano.</li>
</ul>
<p class="text-xs text-gray-500 mt-3">Sugerencia: si quieres que se rellene automaticamente, abre el PDF con Adobe Acrobat Pro &rsaquo; Herramientas &rsaquo; Preparar formulario. Detecta campos automaticamente.</p>
`,
  },

  dashboard: {
    title: 'Ayuda — Dashboard',
    html: `
<p>Resumen ejecutivo del estado de la cartera.</p>
<h3 class="text-[#284e8f] font-semibold mt-3">Indicadores (KPIs)</h3>
<ul class="list-disc pl-5 space-y-1">
  <li><strong>Clientes activos / CUPS activos</strong>.</li>
  <li><strong>Ahorro conseguido</strong> — sumatorio de ciclos ejecutados.</li>
  <li><strong>Ahorro pendiente</strong> — ciclos en curso (en cualquier fase distinta de ejecutado).</li>
  <li><strong>Dias restantes RDL 7/2026</strong> — hasta la fecha limite (31-12-2026) para aprovechar la ventana de cambios sin coste.</li>
</ul>
<h3 class="text-[#284e8f] font-semibold mt-3">Alertas</h3>
<p>Semaforo por cercania a la fecha de vencimiento de bajadas activas (roja &lt; 7 dias, naranja &lt; 15, amarilla &lt; 30).</p>
`,
  },
};
