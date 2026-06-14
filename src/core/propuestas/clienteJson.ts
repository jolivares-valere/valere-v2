/**
 * ClienteJson — contrato de datos UNICO para el generador de propuestas.
 *
 * Fase 2 (PPTX). Este JSON es la fuente que alimenta la Edge Function
 * `generar-propuesta-pptx` (port del generador LOWFIT). El CRM lo construye
 * desde sus tablas (empresas, cups, facturas, comercializadora_ofertas) y la
 * Edge Function lo convierte en el .pptx con la identidad Valere.
 *
 * REGLA CRITICA (de DISENO_BASE §3.1): el FEE de Valere NUNCA viaja en este
 * JSON. Todos los precios (`precioFinalEurKwh`, `totalEurAnual`, matrices) son
 * precios FINALES (base + fee ya integrado). El fee se aplica ANTES de
 * construir el JSON y no debe aparecer en ningun campo ni texto de salida.
 *
 * Ver: docs/DISENO_BASE_PROPUESTA_VALERE.md y docs/PLAN_FASE2_PROPUESTAS_PPTX.md
 */

/** Identidad visual fija (constantes exactas del generador LOWFIT). */
export const VALERE_BRAND = {
  azulMarino: '1A2B5F',
  verde: '2D6A2D',
  verdeClaro: '5CA85C',
  rojo: 'C0392B',
  ambar: 'B9770E',
  grisFondo: 'F2F2F2',
  grisTexto: '555555',
  negroTexto: '222222',
  lineas: 'CCCCCC',
  fuente: 'Calibri',
  footer:
    'VALERE CONSULTORES ASOCIADOS S.L. · C/Astronomía S/N, Torre 4, Planta 1, Puerta 3 · 41015 Sevilla',
} as const;

/** Tarifa de acceso. 3.0TD y 6.xTD tienen 6 periodos de potencia y energia. */
export type TarifaAcceso = '2.0TD' | '3.0TD' | '6.1TD' | '6.2TD' | '6.3TD' | '6.4TD';

/** Datos fotovoltaicos opcionales de un punto de suministro. */
export interface PuntoFv {
  potenciaKwp: number;
  produccionAnualKwh?: number;
  excedentesAnualKwh?: number;
}

/** Un punto de suministro (CUPS) del grupo del cliente. */
export interface PuntoSuministro {
  cups: string;
  nombrePunto?: string;
  tarifa: TarifaAcceso;
  /** Consumo por periodo P1..P6 (kWh anuales, de SIPS/facturas). */
  consumoPeriodoKwh: number[];
  /** Potencias contratadas por periodo P1..P6 (kW). */
  potenciaPeriodoKw: number[];
  fv?: PuntoFv;
  /** % que representa este punto sobre el consumo total del grupo. */
  pctGrupo?: number;
}

/**
 * Una opcion de oferta comparada. TODOS los precios son FINALES (con fee
 * integrado). No incluir aqui base, margen, comision ni fee.
 */
export interface OpcionOferta {
  retailer: string;
  productName: string;
  /** Coste total anual FINAL del grupo con esta oferta (EUR). */
  totalEurAnual: number;
  /** EUR/MWh de energia (ponderada por consumo real). */
  eurMwhEnergia: number;
  /** EUR/MWh total (energia + potencia). */
  eurMwhTotal: number;
  /** Precios FINALES por periodo de energia P1..P6 (EUR/kWh). */
  precioEnergiaEurKwh: number[];
  /** Texto de SSAA segun tipo (incluidos/no incluidos/sin cap). */
  ssaaTexto?: string;
  /** Permanencia, preaviso, etc. (condiciones contractuales). */
  permanenciaMeses?: number;
  tipoPrecio?: 'fijo' | 'indexado';
}

/** Modulos condicionales de la propuesta (cuestionario §8). */
export interface ModulosPropuesta {
  ssaa: boolean;
  multipunto: boolean;
  fv: boolean;
  potencias: boolean;
  comparativaDirecta: boolean;
  indexado: boolean;
  faq: boolean;
}

/** Contrato completo que recibe el generador. */
export interface ClienteJson {
  /** Datos del cliente (de empresas + contacto decisor). */
  cliente: {
    nombre: string;
    contactoNombre?: string;
    contactoEmail?: string;
  };
  /** Puntos de suministro del grupo. */
  puntos: PuntoSuministro[];
  /** Opciones comparadas, ya ordenadas (la 0 = mejor). Precios FINALES. */
  opciones: OpcionOferta[];
  /** Coste actual anual del grupo (referencia). */
  costeActualEurAnual: number;
  /** Ahorro de la mejor opcion (EUR/anio y %). */
  mejorAhorroEur: number;
  mejorAhorroPct: number;
  /** Modulos a activar segun el cliente. */
  modulos: ModulosPropuesta;
  /** Metadatos de salida. */
  salida: {
    formato: 'pptx';
    nombreArchivo: string;
    /** Mes/anio mostrado en portada, p.ej. "junio 2026". */
    periodo: string;
  };
}

/**
 * Guard de seguridad: verifica que un ClienteJson NO contiene rastros de fee.
 * Se usa en el builder y en el QA (CI). Lanza si encuentra terminos prohibidos.
 */
const TERMINOS_FEE = ['fee', 'margen', 'comision', 'comisión'];

export function assertSinFee(json: ClienteJson): void {
  const serializado = JSON.stringify(json).toLowerCase();
  for (const t of TERMINOS_FEE) {
    if (serializado.includes(t)) {
      throw new Error(
        `[ClienteJson] termino prohibido en la salida: "${t}". El fee debe estar ya integrado en los precios, nunca presente como campo o texto.`,
      );
    }
  }
}
