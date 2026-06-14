import { describe, it, expect } from 'vitest';
import { buildClienteJson, ProposalRow, BuildContext } from './buildClienteJson';
import { assertSinFee } from './clienteJson';

const ctxBase: BuildContext = {
  empresaNombre: 'TEST INDUSTRIAL SL',
  contactoNombre: 'Responsable Energia',
  contactoEmail: 'energia@test.example',
  periodo: 'junio 2026',
  puntos: [
    {
      cups: 'ES0021000000000001RK',
      nombrePunto: 'Nave 1',
      tarifa: '6.1TD',
      consumoPeriodoKwh: [100000, 90000, 80000, 70000, 60000, 50000],
      potenciaPeriodoKw: [450, 450, 450, 400, 350, 350],
    },
  ],
};

const proposalBase: ProposalRow = {
  id: 'p1',
  current_annual_cost_eur: 200000,
  best_offer_annual_cost_eur: 170000,
  best_offer_retailer: 'VISALIA',
  best_offer_savings_eur: 30000,
  best_offer_savings_pct: 15,
  comparison_results: [
    { offerName: 'Plana', retailerName: 'VISALIA', annualCost: 170000, savings: 30000, savingsPct: 15 },
    { offerName: 'Open', retailerName: 'ENDESA', annualCost: 185000, savings: 15000, savingsPct: 7.5 },
  ],
};

describe('buildClienteJson', () => {
  it('mapea cliente, ahorro y opciones ordenadas (mejor primero)', () => {
    const json = buildClienteJson(proposalBase, ctxBase);
    expect(json.cliente.nombre).toBe('TEST INDUSTRIAL SL');
    expect(json.costeActualEurAnual).toBe(200000);
    expect(json.mejorAhorroEur).toBe(30000);
    expect(json.mejorAhorroPct).toBe(15);
    expect(json.opciones).toHaveLength(2);
    // la 0 debe ser la de mayor ahorro
    expect(json.opciones[0].retailer).toBe('VISALIA');
    expect(json.opciones[1].retailer).toBe('ENDESA');
  });

  it('calcula el % de cada punto sobre el grupo', () => {
    const ctx: BuildContext = {
      ...ctxBase,
      puntos: [
        { ...ctxBase.puntos[0], consumoPeriodoKwh: [100, 0, 0, 0, 0, 0] },
        { ...ctxBase.puntos[0], cups: 'ES0021000000000002RE', consumoPeriodoKwh: [300, 0, 0, 0, 0, 0] },
      ],
    };
    const json = buildClienteJson(proposalBase, ctx);
    expect(json.puntos[0].pctGrupo).toBeCloseTo(25);
    expect(json.puntos[1].pctGrupo).toBeCloseTo(75);
  });

  it('activa modulo multipunto solo con >1 punto', () => {
    const mono = buildClienteJson(proposalBase, ctxBase);
    expect(mono.modulos.multipunto).toBe(false);
    const multi = buildClienteJson(proposalBase, {
      ...ctxBase,
      puntos: [ctxBase.puntos[0], { ...ctxBase.puntos[0], cups: 'ES0021000000000002RE' }],
    });
    expect(multi.modulos.multipunto).toBe(true);
  });

  it('activa modulo fv solo si hay instalacion FV', () => {
    const sinFv = buildClienteJson(proposalBase, ctxBase);
    expect(sinFv.modulos.fv).toBe(false);
    const conFv = buildClienteJson(proposalBase, {
      ...ctxBase,
      puntos: [{ ...ctxBase.puntos[0], fv: { potenciaKwp: 100 } }],
    });
    expect(conFv.modulos.fv).toBe(true);
  });

  it('nombre de archivo saneado y con extension pptx', () => {
    const json = buildClienteJson(proposalBase, ctxBase);
    expect(json.salida.nombreArchivo).toMatch(/^Propuesta_TEST_INDUSTRIAL_SL_Valere\.pptx$/);
    expect(json.salida.formato).toBe('pptx');
  });

  it('CRITICO: la salida no contiene fee, margen ni comision', () => {
    const json = buildClienteJson(proposalBase, ctxBase);
    // assertSinFee no debe lanzar
    expect(() => assertSinFee(json)).not.toThrow();
    const txt = JSON.stringify(json).toLowerCase();
    expect(txt).not.toContain('fee');
    expect(txt).not.toContain('margen');
    expect(txt).not.toContain('comision');
  });

  it('assertSinFee lanza si se inyecta un termino prohibido', () => {
    const json = buildClienteJson(proposalBase, ctxBase);
    // inyectar fee en un texto de opcion
    json.opciones[0].ssaaTexto = 'incluye fee oculto';
    expect(() => assertSinFee(json)).toThrow(/termino prohibido/);
  });

  it('tolera comparison_results vacio o nulo sin crashear', () => {
    const vacia = buildClienteJson({ ...proposalBase, comparison_results: null }, ctxBase);
    expect(vacia.opciones).toHaveLength(0);
    expect(vacia.modulos.comparativaDirecta).toBe(false);
  });
});
