// ============================================================
// Helper para agregar los datos de presentacion de un cliente:
//   - cargar el cliente + sus expedientes activos + CUPS + estudios de ahorro
//   - construir la estructura EmailPresentacionData lista para la plantilla
// ============================================================
import { supabase } from '@/core/supabase/client';
import { ratesToMap } from '@/core/energia/savings_potencias';
import type { TariffType, RegulatedRate } from '@/core/types/entities';
import type { EmailPresentacionData, PresentacionExpedienteData } from './email-templates';
import { formatFecha } from '@/core/utils/dates';
import { getAsesorData, generateSignature } from './email-signatures';

export interface ClientPresentacionResult {
  success: boolean;
  skipReason?: 'no_email' | 'no_expedientes' | 'sin_bajadas';
  data?: EmailPresentacionData;
  asesorEmail?: string;
  clientEmail?: string;
  clientId?: string;
}

/**
 * Carga todo lo necesario para generar un email de presentacion de un cliente.
 * Usa el expediente activo mas reciente por CUPS y su solicitud de bajada
 * como fuente de datos (potencias nuevas, fechas, ahorro previsto).
 */
export async function loadPresentacionForClient(
  clientId: string,
  rates: RegulatedRate[],
  remitente: { nombre: string; email: string; firmaHtml: string }
): Promise<ClientPresentacionResult> {
  // Cliente (incluye gestor y asesor)
  const { data: client } = await supabase
    .from('empresas')
    .select(`
      id, nombre, cif, email_contacto, asesor_id, gestor_id,
      asesor:profiles!empresas_comercial_id_fkey(email),
      gestor:profiles!empresas_comercial_id_fkey(email, nombre, apellidos)
    `)
    .eq('id', clientId)
    .single();

  if (!client) return { success: false, clientId };
  if (!client.email_contacto) return { success: false, skipReason: 'no_email', clientId };

  // Si hay gestor asignado, sobrescribimos el remitente con su firma
  let remitenteFinal = remitente;
  const gestorEmail = (client.gestor as any)?.email;
  if (gestorEmail) {
    const gestorData = getAsesorData(gestorEmail);
    if (gestorData) {
      remitenteFinal = {
        nombre: `${gestorData.nombre} ${gestorData.apellidos}`.trim(),
        email: gestorData.email,
        firmaHtml: generateSignature(gestorData),
      };
    }
  }

  // Expedientes activos con supply + ciclos + bajadas
  const { data: expedientes } = await supabase
    .from('expedientes')
    .select(`
      id, anio, estado,
      supply:cups!inner(cups, tariff_type, denominacion, direccion_suministro, p1_kw, p2_kw, p3_kw, p4_kw, p5_kw, p6_kw),
      ciclos(id, numero_ciclo, estado)
    `)
    .eq('empresa_id', clientId)
    .in('estado', ['activo'])
    .order('created_at', { ascending: false });

  if (!expedientes || expedientes.length === 0) {
    return { success: false, skipReason: 'no_expedientes', clientId };
  }

  // Para cada expediente, obtener la bajada mas reciente + su estudio de ahorro
  const expPresentaciones: PresentacionExpedienteData[] = [];

  for (const exp of expedientes as any[]) {
    const cicloIds = (exp.ciclos || []).map((c: any) => c.id);
    if (cicloIds.length === 0) continue;

    const { data: bajadas } = await supabase
      .from('solicitudes_potencia')
      .select('*')
      .in('ciclo_id', cicloIds)
      .eq('tipo', 'bajada')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!bajadas || bajadas.length === 0) continue;
    const bajada = bajadas[0];

    // Estudio de ahorro
    const { data: savings } = await supabase
      .from('savings_calculations')
      .select('*')
      .eq('request_id', bajada.id)
      .maybeSingle();

    const tariffType = exp.supply?.tariff_type as TariffType;
    const rateMap = ratesToMap(rates, tariffType);

    expPresentaciones.push({
      cups: exp.supply?.cups || '',
      tarifa: exp.supply?.tariff_type || '',
      direccion_suministro: exp.supply?.denominacion || exp.supply?.direccion_suministro || '',
      fecha_prevista_inicio: bajada.fecha_prevista_inicio ? formatFecha(bajada.fecha_prevista_inicio) : '—',
      fecha_prevista_fin: bajada.fecha_prevista_fin ? formatFecha(bajada.fecha_prevista_fin) : '—',
      dias_previstos: savings?.dias_previstos || 0,
      potencias_actuales: {
        p1: bajada.p1_actual || 0, p2: bajada.p2_actual || 0,
        p3: bajada.p3_actual || 0, p4: bajada.p4_actual || 0,
        p5: bajada.p5_actual || 0, p6: bajada.p6_referencia || 0,
      },
      potencias_nuevas: {
        p1: bajada.p1_nueva || 0, p2: bajada.p2_nueva || 0,
        p3: bajada.p3_nueva || 0, p4: bajada.p4_nueva || 0,
        p5: bajada.p5_nueva || 0,
      },
      precios_periodo: {
        p1: rateMap['P1'] || 0, p2: rateMap['P2'] || 0,
        p3: rateMap['P3'] || 0, p4: rateMap['P4'] || 0,
        p5: rateMap['P5'] || 0,
      },
      ahorro_previsto: {
        p1: savings?.ahorro_previsto_p1 || 0, p2: savings?.ahorro_previsto_p2 || 0,
        p3: savings?.ahorro_previsto_p3 || 0, p4: savings?.ahorro_previsto_p4 || 0,
        p5: savings?.ahorro_previsto_p5 || 0,
        total: savings?.ahorro_previsto_total || 0,
      },
    });
  }

  if (expPresentaciones.length === 0) {
    return { success: false, skipReason: 'sin_bajadas', clientId };
  }

  const totalGlobal = expPresentaciones.reduce((s, e) => s + (e.ahorro_previsto.total || 0), 0);

  const data: EmailPresentacionData = {
    nombre_cliente: client.nombre_fiscal,
    cif: client.cif,
    expedientes: expPresentaciones,
    ahorro_total_global: totalGlobal,
    nombre_remitente: remitenteFinal.nombre,
    email_remitente: remitenteFinal.email,
    firma_html: remitenteFinal.firmaHtml,
  };

  return {
    success: true,
    data,
    asesorEmail: (client.asesor as any)?.email,
    clientEmail: client.email_contacto,
    clientId,
  };
}
