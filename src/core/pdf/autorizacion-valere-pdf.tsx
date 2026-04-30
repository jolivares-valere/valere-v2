// ============================================================
// PDF de Autorizacion a Valere Consultores — multi-CUPS.
// Documento apoderamiento representacion + clausula proteccion
// de datos. Incluye tabla de todos los CUPS autorizados con una
// unica firma del titular/representante legal.
// ============================================================
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { bytesToBase64 } from './pdf-fill';

export interface ExpedienteAutorizacionItem {
  cups: string;
  tarifa: string;
  direccion_suministro: string;
  comercializadora?: string | null;
  distribuidora?: string | null;
}

export interface AutorizacionValereData {
  // Datos del titular
  razon_social: string;
  cif: string;
  direccion_fiscal: string;
  ciudad_fiscal?: string;
  codigo_postal_fiscal?: string;

  // Datos del representante legal
  representante_nombre: string;
  representante_dni: string;
  representante_cargo?: string;  // opcional, ej: "Administrador unico"

  // CUPS incluidos
  suministros: ExpedienteAutorizacionItem[];

  // Metadatos
  fecha_emision?: string;        // si no, usa hoy
  ciudad_firma?: string;         // si no, usa "Sevilla"
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937', lineHeight: 1.45 },

  header: { backgroundColor: '#1d3b78', padding: 16, textAlign: 'center', marginBottom: 16, marginHorizontal: -40, marginTop: -40 },
  headerLogo: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  headerSub: { color: '#a3bffa', fontSize: 9, letterSpacing: 2, marginTop: 3 },

  title: { color: '#1d3b78', fontSize: 15, fontWeight: 'bold', marginTop: 16, marginBottom: 4, textAlign: 'center' },
  subtitle: { color: '#6b7280', fontSize: 10, marginBottom: 18, textAlign: 'center' },

  sectionTitle: { color: '#1d3b78', fontSize: 11, fontWeight: 'bold', marginTop: 14, marginBottom: 6, backgroundColor: '#f3f4f6', padding: 5 },

  paragraph: { fontSize: 10, marginBottom: 6, color: '#374151', textAlign: 'justify' },
  paragraphJustify: { fontSize: 10, marginBottom: 6, color: '#374151', textAlign: 'justify' },

  dataRow: { flexDirection: 'row', marginBottom: 3, fontSize: 10 },
  dataLabel: { width: 130, color: '#6b7280' },
  dataValue: { flex: 1, fontWeight: 'bold', color: '#111827' },

  // Tabla CUPS
  table: { borderWidth: 1, borderColor: '#d1d5db', marginTop: 8, marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1d3b78' },
  tableHeaderCell: { padding: 5, color: '#ffffff', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  tableCell: { padding: 5, fontSize: 9, color: '#374151', textAlign: 'left' },

  // Firma
  firmaBox: { marginTop: 20, borderWidth: 1, borderColor: '#d1d5db', padding: 14, borderRadius: 4 },
  firmaTitle: { fontSize: 11, fontWeight: 'bold', color: '#1d3b78', marginBottom: 4 },
  firmaText: { fontSize: 9, color: '#6b7280', marginBottom: 12 },
  firmaRow: { flexDirection: 'row', marginTop: 10 },
  firmaCol: { flex: 1 },
  firmaLabel: { fontSize: 9, color: '#6b7280', marginBottom: 4 },
  firmaLine: { borderBottomWidth: 1, borderBottomColor: '#374151', marginTop: 30 },

  // Proteccion de datos
  gdprBox: { backgroundColor: '#f9fafb', borderLeftWidth: 3, borderLeftColor: '#1d3b78', padding: 10, marginBottom: 10 },
  gdprTitle: { fontSize: 10, fontWeight: 'bold', color: '#1d3b78', marginBottom: 4 },
  gdprText: { fontSize: 9, color: '#374151', textAlign: 'justify', lineHeight: 1.4 },

  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e5e7eb', fontSize: 8, color: '#9ca3af', textAlign: 'center' },
});

function AutorizacionPDF({ data }: { data: AutorizacionValereData }) {
  const hoy = data.fecha_emision || new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const ciudadFirma = data.ciudad_firma || 'Sevilla';
  const cargoRepresentante = data.representante_cargo || 'representante legal';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.headerLogo}>Valere</Text>
          <Text style={styles.headerSub}>CONSULTORES</Text>
        </View>

        <Text style={styles.title}>AUTORIZACIÓN DE REPRESENTACIÓN</Text>
        <Text style={styles.subtitle}>
          Gestión de modificación de potencias contratadas — RDL 7/2026
        </Text>

        {/* Datos del apoderante */}
        <Text style={styles.sectionTitle}>1. Datos del apoderante (titular del suministro)</Text>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Razón social:</Text>
          <Text style={styles.dataValue}>{data.razon_social}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>CIF / NIF:</Text>
          <Text style={styles.dataValue}>{data.cif}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Domicilio fiscal:</Text>
          <Text style={styles.dataValue}>
            {data.direccion_fiscal}
            {data.ciudad_fiscal ? `, ${data.ciudad_fiscal}` : ''}
            {data.codigo_postal_fiscal ? ` (${data.codigo_postal_fiscal})` : ''}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>2. Datos del representante legal</Text>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Nombre y apellidos:</Text>
          <Text style={styles.dataValue}>{data.representante_nombre}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>DNI:</Text>
          <Text style={styles.dataValue}>{data.representante_dni}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>En calidad de:</Text>
          <Text style={styles.dataValue}>{cargoRepresentante}</Text>
        </View>

        {/* Objeto del apoderamiento */}
        <Text style={styles.sectionTitle}>3. Objeto del apoderamiento</Text>
        <Text style={styles.paragraphJustify}>
          El/la apoderante identificado/a en el apartado 1, debidamente representado/a por la persona física indicada en el apartado 2,
          <Text style={{ fontWeight: 'bold' }}> AUTORIZA EXPRESAMENTE </Text>
          a <Text style={{ fontWeight: 'bold' }}>VALERE CONSULTORES ASOCIADOS, S.L.</Text>, con domicilio social en C/ Astronomía S/N, Torre 4,
          planta 1, puerta 3, 41015 Sevilla, para que, en su nombre y representación, realice cuantas gestiones resulten necesarias
          ante las compañías comercializadoras y distribuidoras de energía eléctrica con el objeto de tramitar las
          <Text style={{ fontWeight: 'bold' }}> modificaciones temporales de las potencias contratadas </Text>
          en los puntos de suministro (CUPS) que se detallan en el apartado 4 del presente documento,
          al amparo del Real Decreto-Ley 7/2026 y disposiciones concordantes.
        </Text>

        <Text style={styles.paragraphJustify}>
          La presente autorización comprende, a título enunciativo y no limitativo: la solicitud, negociación, firma y seguimiento
          de las solicitudes de cambio de potencia (bajada y posterior restauración), la recepción de notificaciones y comunicaciones
          de la comercializadora y/o distribuidora, la obtención de información relativa al suministro (incluyendo datos técnicos y
          de consumo) y cualesquiera otras actuaciones necesarias para el buen fin del encargo profesional contratado.
        </Text>

        {/* Tabla CUPS */}
        <Text style={styles.sectionTitle}>4. Puntos de suministro autorizados</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderCell, flex: 3, textAlign: 'left' }}>CUPS</Text>
            <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>Tarifa</Text>
            <Text style={{ ...styles.tableHeaderCell, flex: 3, textAlign: 'left' }}>Dirección</Text>
            <Text style={{ ...styles.tableHeaderCell, flex: 2, textAlign: 'left' }}>Comercializadora</Text>
          </View>
          {data.suministros.map((s, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={{ ...styles.tableCell, flex: 3, fontFamily: 'Courier', fontSize: 8 }}>{s.cups}</Text>
              <Text style={{ ...styles.tableCell, flex: 1, textAlign: 'center' }}>{s.tarifa}</Text>
              <Text style={{ ...styles.tableCell, flex: 3, fontSize: 8 }}>{s.direccion_suministro || '—'}</Text>
              <Text style={{ ...styles.tableCell, flex: 2, fontSize: 8 }}>{s.comercializadora || '—'}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 8, color: '#6b7280', marginBottom: 8, fontStyle: 'italic' }}>
          Total: {data.suministros.length} punto{data.suministros.length === 1 ? '' : 's'} de suministro.
        </Text>

        {/* Vigencia */}
        <Text style={styles.sectionTitle}>5. Vigencia y revocación</Text>
        <Text style={styles.paragraphJustify}>
          La presente autorización tendrá vigencia desde la fecha de su firma hasta la finalización del encargo profesional
          contratado, incluyendo la fase de restauración de las potencias a sus valores originales y la recepción de las
          facturas correspondientes que permitan verificar el correcto cumplimiento. El apoderante podrá revocar la presente
          autorización en cualquier momento mediante notificación escrita a VALERE CONSULTORES ASOCIADOS, S.L., sin perjuicio
          de las gestiones ya iniciadas.
        </Text>

        {/* Proteccion de datos */}
        <View style={styles.gdprBox}>
          <Text style={styles.gdprTitle}>6. Información sobre protección de datos (RGPD / LOPDGDD)</Text>
          <Text style={styles.gdprText}>
            En cumplimiento del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016 (RGPD)
            y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales
            (LOPDGDD), se le informa de que los datos personales facilitados serán tratados por{' '}
            <Text style={{ fontWeight: 'bold' }}>VALERE CONSULTORES ASOCIADOS, S.L.</Text>{' '}
            (en adelante, el "Responsable"), con domicilio social indicado en la cabecera y correo de contacto{' '}
            <Text style={{ fontWeight: 'bold' }}>soporte@valereconsultores.com</Text>.
          </Text>
          <Text style={{ ...styles.gdprText, marginTop: 4 }}>
            <Text style={{ fontWeight: 'bold' }}>Finalidad:</Text> gestionar el encargo profesional de modificación de potencias
            contratadas, incluyendo la interlocución con comercializadoras y distribuidoras eléctricas en nombre del cliente,
            así como las comunicaciones derivadas del servicio.{' '}
            <Text style={{ fontWeight: 'bold' }}>Base jurídica:</Text> ejecución del encargo profesional (art. 6.1.b RGPD)
            y obligaciones legales del Responsable (art. 6.1.c RGPD).{' '}
            <Text style={{ fontWeight: 'bold' }}>Destinatarios:</Text> los datos se comunicarán exclusivamente a las compañías
            comercializadoras y distribuidoras eléctricas cuando resulte imprescindible para la tramitación, así como a
            administraciones públicas cuando exista obligación legal. No se realizan transferencias internacionales fuera del EEE.
          </Text>
          <Text style={{ ...styles.gdprText, marginTop: 4 }}>
            <Text style={{ fontWeight: 'bold' }}>Conservación:</Text> los datos se conservarán durante la vigencia del encargo y,
            finalizado éste, durante los plazos legalmente exigibles para atender responsabilidades derivadas del mismo (hasta 6 años,
            Código de Comercio).{' '}
            <Text style={{ fontWeight: 'bold' }}>Derechos:</Text> podrá ejercer en cualquier momento los derechos de acceso,
            rectificación, supresión, oposición, limitación del tratamiento y portabilidad dirigiéndose al correo indicado o a la
            dirección postal del Responsable. Asimismo podrá presentar reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).
          </Text>
        </View>

        {/* Firma */}
        <View style={styles.firmaBox}>
          <Text style={styles.firmaTitle}>7. Firma del apoderante / representante legal</Text>
          <Text style={styles.firmaText}>
            En {ciudadFirma}, a {hoy}.
          </Text>

          <View style={styles.firmaRow}>
            <View style={styles.firmaCol}>
              <Text style={styles.firmaLabel}>Firma:</Text>
              <View style={{ ...styles.firmaLine, marginTop: 50 }}></View>
              <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 3 }}>
                {data.representante_nombre}
              </Text>
              <Text style={{ fontSize: 8, color: '#6b7280' }}>
                DNI: {data.representante_dni}
              </Text>
            </View>
            <View style={{ width: 30 }}></View>
            <View style={styles.firmaCol}>
              <Text style={styles.firmaLabel}>Sello de la empresa:</Text>
              <View style={{ ...styles.firmaLine, marginTop: 50 }}></View>
              <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 3 }}>
                {data.razon_social}
              </Text>
              <Text style={{ fontSize: 8, color: '#6b7280' }}>
                CIF: {data.cif}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Valere Consultores Asociados SL · C/Astronomía S/N, Torre 4, planta 1, puerta 3, 41015 Sevilla · soporte@valereconsultores.com
        </Text>
      </Page>
    </Document>
  );
}

export async function generateAutorizacionValerePdfBytes(data: AutorizacionValereData): Promise<{
  bytes: Uint8Array;
  base64: string;
  fileName: string;
}> {
  const doc = <AutorizacionPDF data={data} />;
  const blob = await pdf(doc).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const base64 = bytesToBase64(bytes);

  const safe = data.razon_social.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
  const fileName = `Autorizacion_Valere_${safe}.pdf`;

  return { bytes, base64, fileName };
}
