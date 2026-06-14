/**
 * buildClienteJson — construye el ClienteJson desde una propuesta del CRM.
 *
 * Toma los datos ya guardados en `proposals` (ranking, costes, ahorro) mas el
 * contexto del cliente (empresa, contacto) y los puntos de suministro (cups +
 * consumo por periodo), y produce el contrato unico que alimenta el generador.
 *
 * v1 (Fase 2): llena las slides nucleo que SI tienen datos en la propuesta
 * guardada (portada, resumen, puntos, perfil, ranking, dictamen, cierre).
 * Las matrices de precios P1..P6 quedan para cuando AnalisisPage persista ese
 * detalle (los modulos correspondientes se desactivan si faltan datos).
 *
 * REGLA: el fee no se calcula ni se incluye aqui. Los precios de entrada ya son
 * finales. assertSinFee valida la salida.
 */

import {
  ClienteJson,
  OpcionOferta,
  PuntoSuministro,
  ModulosPropuesta,
  assertSinFee,
} from './clienteJson';

/** Forma minima de una propuesta de la tabla `proposals` (lo que usamos). */
export interface ProposalRow {
  id: string;
  current_annual_cost_eur?: number | null;
  best_offer_annual_cost_eur?: number | null;
  best_offer_retailer?: string | null;
  best_offer_savings_eur?: number | null;
  best_offer_savings_pct?: number | null;
  comparison_results?: ComparisonResultRow[] | null;
  created_at?: string | null;
}

/** Forma de cada fila guardada en comparison_results (de AnalisisPage). */
export interface ComparisonResultRow {
  offerName: string;
  retailerName: string;
  annualCost: number;
  savings: number;
  savingsPct: number;
  surplusModel?: string;
}

/** Contexto del cliente y sus puntos para enriquecer el JSON. */
export interface BuildContext {
  empresaNombre: string;
  contactoNombre?: string;
  contactoEmail?: string;
  /** Puntos de suministro del grupo (de cups + facturas). */
  puntos: PuntoSuministro[];
  /** Mes/anio para la portada, p.ej. "junio 2026". */
  periodo: string;
}

const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);

/** Construye el ClienteJson. Lanza si la salida contiene rastros de fee. */
export function buildClienteJson(proposal: ProposalRow, ctx: BuildContext): ClienteJson {
  const comparisons = Array.isArray(proposal.comparison_results)
    ? proposal.comparison_results
    : [];

  // Ordenar por ahorro descendente (la 0 = mejor opcion).
  const ordenadas = [...comparisons].sort((a, b) => num(b.savings) - num(a.savings));

  const opciones: OpcionOferta[] = ordenadas.map((c) => ({
    retailer: c.retailerName || 'Desconocido',
    productName: c.offerName || 'Oferta',
    totalEurAnual: num(c.annualCost),
    // v1: aun no persistimos €/MWh ni precios por periodo -> 0/[] (modulos off).
    eurMwhEnergia: 0,
    eurMwhTotal: 0,
    precioEnergiaEurKwh: [],
  }));

  // Calcular % de cada punto sobre el consumo total del grupo.
  const totalGrupoKwh = ctx.puntos.reduce(
    (acc, p) => acc + p.consumoPeriodoKwh.reduce((a, k) => a + num(k), 0),
    0,
  );
  const puntos: PuntoSuministro[] = ctx.puntos.map((p) => {
    const totalPunto = p.consumoPeriodoKwh.reduce((a, k) => a + num(k), 0);
    return {
      ...p,
      pctGrupo: totalGrupoKwh > 0 ? (totalPunto / totalGrupoKwh) * 100 : 0,
    };
  });

  // Modulos: activar solo lo que tiene datos suficientes.
  const tieneFv = puntos.some((p) => p.fv && p.fv.potenciaKwp > 0);
  const tienePreciosPeriodo = opciones.some((o) => o.precioEnergiaEurKwh.length === 6);
  const modulos: ModulosPropuesta = {
    ssaa: opciones.some((o) => !!o.ssaaTexto),
    multipunto: puntos.length > 1,
    fv: tieneFv,
    potencias: false, // requiere maximetros, fase posterior
    comparativaDirecta: opciones.length >= 2,
    indexado: opciones.some((o) => o.tipoPrecio === 'indexado'),
    faq: false,
  };
  void tienePreciosPeriodo; // reservado para activar matrices cuando haya datos

  const nombreLimpio = ctx.empresaNombre.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);

  const json: ClienteJson = {
    cliente: {
      nombre: ctx.empresaNombre,
      contactoNombre: ctx.contactoNombre,
      contactoEmail: ctx.contactoEmail,
    },
    puntos,
    opciones,
    costeActualEurAnual: num(proposal.current_annual_cost_eur),
    mejorAhorroEur: num(proposal.best_offer_savings_eur),
    mejorAhorroPct: num(proposal.best_offer_savings_pct),
    modulos,
    salida: {
      formato: 'pptx',
      nombreArchivo: `Propuesta_${nombreLimpio}_Valere.pptx`,
      periodo: ctx.periodo,
    },
  };

  // Seguridad: ningun rastro de fee en la salida.
  assertSinFee(json);
  return json;
}
