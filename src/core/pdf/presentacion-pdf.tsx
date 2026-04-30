// ============================================================
// Generador de PDF de presentacion del servicio.
// Este PDF se adjunta al email para que el cliente lo firme y
// lo devuelva. Queda guardado en la carpeta de documentos.
// ============================================================
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { EmailPresentacionData, PresentacionExpedienteData } from './email-templates';
import { bytesToBase64 } from './pdf-fill';

const formatEUR = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937' },

  // Header azul con logo texto
  header: { backgroundColor: '#284e8f', padding: 18, textAlign: 'center', marginBottom: 16, marginHorizontal: -36, marginTop: -36 },
  headerLogo: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  headerSub: { color: '#a3bffa', fontSize: 9, letterSpacing: 2, marginTop: 3 },

  title: { color: '#284e8f', fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 4 },
  subtitle: { color: '#6b7280', fontSize: 10, marginBottom: 14 },

  sectionTitle: { color: '#284e8f', fontSize: 12, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  paragraph: { fontSize: 10, lineHeight: 1.5, marginBottom: 6, color: '#374151' },

  clientBox: { backgroundColor: '#f3f4f6', padding: 10, borderRadius: 4, marginBottom: 10 },
  clientRow: { flexDirection: 'row', marginBottom: 3 },
  clientLabel: { width: 90, color: '#6b7280', fontSize: 9 },
  clientValue: { flex: 1, fontSize: 10, fontWeight: 'bold', color: '#111827' },

  // Tabla resumen
  table: { borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#284e8f' },
  tableHeaderCell: { flex: 1, padding: 5, color: '#ffffff', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  tableCell: { flex: 1, padding: 5, fontSize: 9, textAlign: 'center', color: '#374151' },
  tableTotalRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#f0fdf4' },
  tableTotalCell: { flex: 1, padding: 6, fontSize: 10, fontWeight: 'bold', color: '#166534', textAlign: 'center' },

  // Highlight
  highlight: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 6, padding: 14, alignItems: 'center', marginVertical: 10 },
  highlightAmount: { fontSize: 22, fontWeight: 'bold', color: '#166534' },
  highlightLabel: { fontSize: 9, color: '#6b7280', marginTop: 3 },

  // Bloque individual por CUPS
  cupsBlock: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, padding: 10, marginBottom: 10 },
  cupsTitle: { color: '#284e8f', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  cupsInfoRow: { flexDirection: 'row', marginBottom: 2 },
  cupsInfoLabel: { width: 90, color: '#6b7280', fontSize: 9 },
  cupsInfoValue: { flex: 1, fontSize: 9, color: '#111827' },

  // Potencias tabla pequeña
  potTable: { borderWidth: 1, borderColor: '#e5e7eb', marginTop: 6, marginBottom: 6 },
  potHeaderRow: { flexDirection: 'row', backgroundColor: '#f3f4f6' },
  potHeaderCell: { flex: 1, padding: 3, fontSize: 8, fontWeight: 'bold', textAlign: 'center', color: '#374151' },
  potHeaderP6: { flex: 1, padding: 3, fontSize: 8, fontWeight: 'bold', textAlign: 'center', color: '#ffffff', backgroundColor: '#b45309' },
  potRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  potRowLabel: { flex: 1, padding: 3, fontSize: 8, fontWeight: 'bold', color: '#6b7280' },
  potRowCell: { flex: 1, padding: 3, fontSize: 9, textAlign: 'center' },
  potRowCellP6: { flex: 1, padding: 3, fontSize: 8, textAlign: 'center', color: '#b45309', fontStyle: 'italic' },

  // Bloques de documentos
  docBlock: { backgroundColor: '#f9fafb', borderLeftWidth: 3, borderLeftColor: '#284e8f', padding: 10, marginBottom: 8 },
  docBlockExcepcional: { backgroundColor: '#fffbeb', borderLeftWidth: 3, borderLeftColor: '#f59e0b', padding: 10, marginBottom: 8 },
  docTitle: { fontSize: 11, fontWeight: 'bold', color: '#111827', marginBottom: 3 },
  docNote: { fontSize: 9, color: '#6b7280', fontStyle: 'italic', marginBottom: 3 },
  docDesc: { fontSize: 9, color: '#374151', lineHeight: 1.4 },

  // Firma
  firmaBox: { marginTop: 20, borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed', padding: 20, borderRadius: 4 },
  firmaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  firmaCol: { flex: 1 },
  firmaLabel: { fontSize: 9, color: '#6b7280', marginBottom: 30 },
  firmaLine: { borderBottomWidth: 1, borderBottomColor: '#374151', marginTop: 20 },
  firmaHint: { fontSize: 8, color: '#9ca3af', marginTop: 2 },

  // Footer
  footer: { position: 'absolute', bottom: 18, left: 36, right: 36, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e5e7eb', fontSize: 8, color: '#9ca3af', textAlign: 'center' },

  ul: { marginLeft: 10, marginBottom: 6 },
  liRow: { flexDirection: 'row', marginBottom: 2 },
  liCheck: { width: 12, color: '#166534', fontSize: 10, fontWeight: 'bold' },
  liText: { flex: 1, fontSize: 9, color: '#374151' },
});

function PotenciasTable({ actuales, nuevas }: {
  actuales: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number };
  nuevas: { p1: number; p2: number; p3: number; p4: number; p5: number };
}) {
  const actArr = [actuales.p1, actuales.p2, actuales.p3, actuales.p4, actuales.p5];
  const newArr = [nuevas.p1, nuevas.p2, nuevas.p3, nuevas.p4, nuevas.p5];

  return (
    <View style={styles.potTable}>
      <View style={styles.potHeaderRow}>
        <Text style={styles.potHeaderCell}></Text>
        <Text style={styles.potHeaderCell}>P1</Text>
        <Text style={styles.potHeaderCell}>P2</Text>
        <Text style={styles.potHeaderCell}>P3</Text>
        <Text style={styles.potHeaderCell}>P4</Text>
        <Text style={styles.potHeaderCell}>P5</Text>
        <Text style={styles.potHeaderP6}>P6</Text>
      </View>
      <View style={styles.potRow}>
        <Text style={styles.potRowLabel}>Actual</Text>
        {actArr.map((v, i) => <Text key={i} style={styles.potRowCell}>{v.toFixed(2)}</Text>)}
        <Text style={styles.potRowCellP6}>{actuales.p6.toFixed(2)}</Text>
      </View>
      <View style={styles.potRow}>
        <Text style={styles.potRowLabel}>Propuesta</Text>
        {newArr.map((v, i) => {
          const diff = actArr[i] - v;
          const color = diff > 0 ? '#166534' : diff < 0 ? '#991b1b' : '#374151';
          return <Text key={i} style={{ ...styles.potRowCell, color, fontWeight: 'bold' }}>{v.toFixed(2)}</Text>;
        })}
        <Text style={styles.potRowCellP6}>no cambia</Text>
      </View>
    </View>
  );
}

function CupsBlock({ e, i }: { e: PresentacionExpedienteData; i: number }) {
  return (
    <View style={styles.cupsBlock} wrap={false}>
      <Text style={styles.cupsTitle}>Suministro {i + 1} — {e.tarifa}</Text>

      <View style={styles.cupsInfoRow}>
        <Text style={styles.cupsInfoLabel}>CUPS:</Text>
        <Text style={styles.cupsInfoValue}>{e.cups}</Text>
      </View>
      <View style={styles.cupsInfoRow}>
        <Text style={styles.cupsInfoLabel}>Direccion:</Text>
        <Text style={styles.cupsInfoValue}>{e.direccion_suministro || '—'}</Text>
      </View>
      <View style={styles.cupsInfoRow}>
        <Text style={styles.cupsInfoLabel}>Periodo:</Text>
        <Text style={styles.cupsInfoValue}>{e.fecha_prevista_inicio} — {e.fecha_prevista_fin} ({e.dias_previstos} dias)</Text>
      </View>

      <PotenciasTable actuales={e.potencias_actuales} nuevas={e.potencias_nuevas} />

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ fontSize: 10, color: '#6b7280', marginRight: 8 }}>Ahorro previsto este suministro:</Text>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#166534' }}>{formatEUR(e.ahorro_previsto.total)}</Text>
      </View>
    </View>
  );
}

function TablaResumenMulti({ expedientes }: { expedientes: PresentacionExpedienteData[] }) {
  const total = expedientes.reduce((s, e) => s + (e.ahorro_previsto.total || 0), 0);
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>CUPS</Text>
        <Text style={styles.tableHeaderCell}>Tarifa</Text>
        <Text style={styles.tableHeaderCell}>P1 €</Text>
        <Text style={styles.tableHeaderCell}>P2 €</Text>
        <Text style={styles.tableHeaderCell}>P3 €</Text>
        <Text style={styles.tableHeaderCell}>P4 €</Text>
        <Text style={styles.tableHeaderCell}>P5 €</Text>
        <Text style={{ ...styles.tableHeaderCell, backgroundColor: '#166534' }}>TOTAL</Text>
      </View>
      {expedientes.map((e, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={{ ...styles.tableCell, flex: 2, textAlign: 'left' }}>...{e.cups.slice(-12)}</Text>
          <Text style={styles.tableCell}>{e.tarifa}</Text>
          <Text style={{ ...styles.tableCell, color: '#166534' }}>{formatEUR(e.ahorro_previsto.p1)}</Text>
          <Text style={{ ...styles.tableCell, color: '#166534' }}>{formatEUR(e.ahorro_previsto.p2)}</Text>
          <Text style={{ ...styles.tableCell, color: '#166534' }}>{formatEUR(e.ahorro_previsto.p3)}</Text>
          <Text style={{ ...styles.tableCell, color: '#166534' }}>{formatEUR(e.ahorro_previsto.p4)}</Text>
          <Text style={{ ...styles.tableCell, color: '#166534' }}>{formatEUR(e.ahorro_previsto.p5)}</Text>
          <Text style={{ ...styles.tableTotalCell }}>{formatEUR(e.ahorro_previsto.total)}</Text>
        </View>
      ))}
      <View style={styles.tableTotalRow}>
        <Text style={{ ...styles.tableTotalCell, flex: 7, textAlign: 'center' }}>AHORRO GLOBAL PREVISTO</Text>
        <Text style={{ ...styles.tableTotalCell, fontSize: 11 }}>{formatEUR(total)}</Text>
      </View>
    </View>
  );
}

function PresentacionPDF({ data }: { data: EmailPresentacionData }) {
  const numCups = data.expedientes.length;
  const umbral = data.umbral_tabla_resumen ?? 5;
  const usaResumen = numCups > umbral;
  const tarifasUnicas = Array.from(new Set(data.expedientes.map(e => e.tarifa))).join(', ');
  const sumaP1 = data.expedientes.reduce((s, e) => s + (e.potencias_actuales.p1 || 0), 0);
  const hoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.headerLogo}>Valere</Text>
          <Text style={styles.headerSub}>CONSULTORES</Text>
        </View>

        <Text style={styles.title}>Propuesta de optimizacion de potencia</Text>
        <Text style={styles.subtitle}>Real Decreto-Ley 7/2026 — Fecha: {hoy}</Text>

        {/* Cliente */}
        <View style={styles.clientBox}>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Cliente:</Text>
            <Text style={styles.clientValue}>{data.nombre_cliente}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>CIF:</Text>
            <Text style={styles.clientValue}>{data.cif}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Suministros:</Text>
            <Text style={styles.clientValue}>{numCups} CUPS · Tarifas: {tarifasUnicas}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Pot. P1 total:</Text>
            <Text style={styles.clientValue}>{sumaP1.toFixed(2)} kW</Text>
          </View>
        </View>

        {/* Ahorro total destacado */}
        <View style={styles.highlight}>
          <Text style={styles.highlightAmount}>{formatEUR(data.ahorro_total_global)}</Text>
          <Text style={styles.highlightLabel}>Ahorro total previsto conjunto</Text>
        </View>

        {/* Detalle */}
        <Text style={styles.sectionTitle}>
          {usaResumen ? 'Ahorro estimado por suministro' : 'Detalle del estudio por suministro'}
        </Text>

        {usaResumen
          ? <TablaResumenMulti expedientes={data.expedientes} />
          : data.expedientes.map((e, i) => <CupsBlock key={i} e={e} i={i} />)
        }

        {usaResumen && (
          <Text style={{ fontSize: 9, color: '#6b7280', fontStyle: 'italic', marginBottom: 10 }}>
            Si desea el detalle completo de algun CUPS en particular (desglose por periodo, dias, formulas),
            no dude en solicitarlo y le haremos llegar el estudio tecnico ampliado.
          </Text>
        )}

        {/* Documentos requeridos */}
        <Text style={styles.sectionTitle} break>¿Que necesitamos de usted para comenzar?</Text>

        <View style={styles.docBlock}>
          <Text style={styles.docTitle}>1. Autorizacion a Valere</Text>
          <Text style={styles.docNote}>(documento que le enviaremos prerrellenado)</Text>
          <Text style={styles.docDesc}>
            Firma y sello del titular para que Valere Consultores Asociados pueda representarle en las
            gestiones con la comercializadora y la distribuidora.
          </Text>
        </View>

        <View style={styles.docBlock}>
          <Text style={styles.docTitle}>2. Autorizacion de la comercializadora o distribuidora</Text>
          <Text style={styles.docNote}>(segun corresponda en cada caso)</Text>
          <Text style={styles.docDesc}>
            Es el formulario oficial de modificacion de potencia de su compania electrica. Se lo enviaremos
            prerrellenado con sus datos (o con una ficha con los valores a consignar, segun el formato de
            cada comercializadora) para que usted solo tenga que firmar y sellar.
          </Text>
        </View>

        <View style={styles.docBlock}>
          <Text style={styles.docTitle}>3. Certificado de Instalacion Electrica (CIE) o Boletin electrico</Text>
          <Text style={styles.docDesc}>
            Algunas comercializadoras y distribuidoras lo requieren en el momento de restaurar la potencia
            original (subida) para garantizar que la instalacion soporta los valores contratados. Le rogamos
            nos lo haga llegar si dispone de el; si no, se lo indicaremos en el momento oportuno.
          </Text>
        </View>

        <View style={styles.docBlockExcepcional}>
          <Text style={styles.docTitle}>4. Documentacion excepcional (si procede)</Text>
          <Text style={styles.docDesc}>
            En ocasiones, la comercializadora o la distribuidora pueden solicitar documentos adicionales
            especificos segun el caso (proyecto electrico, certificados de instalaciones singulares,
            contratos de acceso vigentes, autorizaciones sectoriales, etc.). Si llegara a ser necesario,
            se lo comunicaremos puntualmente.
          </Text>
        </View>

        {/* Que hacemos nosotros */}
        <Text style={styles.sectionTitle}>Nosotros nos encargamos de todo lo demas</Text>
        <View style={styles.ul}>
          {[
            'Estudio tecnico detallado de cada suministro',
            'Cumplimentacion de todos los formularios con los valores optimos',
            'Tramitacion con comercializadora y distribuidora',
            'Seguimiento del proceso hasta su ejecucion',
            'Restauracion automatica de la potencia antes de los meses criticos',
          ].map((t, i) => (
            <View key={i} style={styles.liRow}>
              <Text style={styles.liCheck}>✓</Text>
              <Text style={styles.liText}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Firma */}
        <View style={styles.firmaBox}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#284e8f', marginBottom: 6 }}>
            Conforme del titular
          </Text>
          <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 10 }}>
            El/la firmante declara haber recibido y leido la presente propuesta, y manifiesta su interes en
            iniciar el estudio y tramitacion del servicio de optimizacion de potencia descrito.
          </Text>

          <View style={styles.firmaRow}>
            <View style={styles.firmaCol}>
              <Text style={styles.firmaLabel}>Nombre / Razon social:</Text>
              <View style={styles.firmaLine}></View>
            </View>
            <View style={{ width: 20 }}></View>
            <View style={styles.firmaCol}>
              <Text style={styles.firmaLabel}>CIF / NIF:</Text>
              <View style={styles.firmaLine}></View>
            </View>
          </View>

          <View style={styles.firmaRow}>
            <View style={styles.firmaCol}>
              <Text style={styles.firmaLabel}>Fecha:</Text>
              <View style={styles.firmaLine}></View>
            </View>
            <View style={{ width: 20 }}></View>
            <View style={styles.firmaCol}>
              <Text style={styles.firmaLabel}>Firma y sello:</Text>
              <View style={{ ...styles.firmaLine, marginTop: 40 }}></View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Valere Consultores Asociados SL · C/Astronomia S/N, Torre 4, planta 1, puerta 3, 41015 Sevilla · soporte@valereconsultores.com
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Genera el PDF de presentacion y devuelve los bytes + base64 (listo para adjuntar).
 */
export async function generatePresentacionPdfBytes(data: EmailPresentacionData): Promise<{
  bytes: Uint8Array;
  base64: string;
  fileName: string;
}> {
  const doc = <PresentacionPDF data={data} />;
  const blob = await pdf(doc).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const base64 = bytesToBase64(bytes);

  const safeName = data.nombre_cliente.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
  const fileName = `Propuesta_Valere_${safeName}.pdf`;

  return { bytes, base64, fileName };
}
