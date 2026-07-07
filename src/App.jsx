import React, { useState, useMemo } from "react";
import { Search, Lock, Clock, ExternalLink, AlertTriangle, CheckCircle2, RefreshCw, Car } from "lucide-react";

// ============================================================================
// CONFIGURA ESTO: pega aquí los links CSV publicados de tu Google Sheet.
// Instrucciones completas en el README.md de este proyecto.
// ============================================================================
const CLIENTES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-68zHiEuuETlBQ4OaSzvTKID5HXSRqqpQ80VHktss9q2iEHzcDSNpWisLXVfExLDqghGd-4zCHoeT/pub?gid=0&single=true&output=csv";
const LOTES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-68zHiEuuETlBQ4OaSzvTKID5HXSRqqpQ80VHktss9q2iEHzcDSNpWisLXVfExLDqghGd-4zCHoeT/pub?gid=1098400018&single=true&output=csv";
const FINANZAS_CSV_URL = "PEGA_AQUI_TU_LINK_CSV_DE_FINANZAS";

// Fórmula de comisión: $300 por pujas hasta $5,000, +$100 por cada $5,000 adicionales.
function calcularComision(bid) {
  const b = Number(bid) || 0;
  if (b <= 0) return 0;
  const tier = Math.ceil(b / 5000);
  return 300 + 100 * (tier - 1);
}

// Fórmula de depósito requerido: 10% de la puja o $500, lo que sea mayor.
function calcularDeposito(bid) {
  const b = Number(bid) || 0;
  if (b <= 0) return 0;
  return Math.max(500, b * 0.1);
}

// Contraseña simple del panel general — esto NO es seguridad real (los datos
// ya son públicos vía el link de Google Sheets), solo evita que un cliente
// casual entre a ver el panel de todos los demás.
const ADMIN_PASSWORD = "cambia-esta-clave";

const COLORS = {
  bg: "#0D0F12",
  surface: "#16191D",
  surfaceAlt: "#1E2227",
  border: "#2B2F35",
  accent: "#14B8A6",
  accentDim: "#0B4A43",
  orange: "#E8542E",
  green: "#4CAF6D",
  text: "#F3F4F6",
  muted: "#9098A3",
};

function parseCSV(text) {
  const rows = [];
  let cur = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); field = ""; rows.push(cur); cur = [];
      } else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((v) => v && v.trim() !== "")).map((r) => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = (r[idx] || "").trim(); });
    return obj;
  });
}

function formatCountdown(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { label: "Fecha no válida", urgent: false, past: false };
  const diffMs = d - new Date();
  if (diffMs <= 0) return { label: "Subasta ya pasó", urgent: false, past: true };
  const hours = diffMs / 36e5;
  const days = Math.floor(hours / 24);
  const remH = Math.floor(hours % 24);
  const urgent = hours < 24;
  return { label: days > 0 ? `en ${days}d ${remH}h` : `en ${remH}h`, urgent, past: false };
}

const ESTATUS_COLOR = {
  "Vigilando": COLORS.muted,
  "Puja enviada": COLORS.accent,
  "Ganado": COLORS.green,
  "Perdido": COLORS.orange,
};

function useSheetData() {
  const [clientes, setClientes] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rC, rL, rF] = await Promise.all([fetch(CLIENTES_CSV_URL), fetch(LOTES_CSV_URL), fetch(FINANZAS_CSV_URL)]);
      if (!rC.ok || !rL.ok || !rF.ok) throw new Error("No se pudo leer el Google Sheet");
      const [tC, tL, tF] = await Promise.all([rC.text(), rL.text(), rF.text()]);
      setClientes(parseCSV(tC));
      setLotes(parseCSV(tL));
      setFinanzas(parseCSV(tF));
      setLoaded(true);
    } catch (e) {
      setError("No se pudo cargar la información. Revisa que los links CSV estén bien configurados y publicados.");
    } finally {
      setLoading(false);
    }
  };

  return { clientes, lotes, finanzas, loading, error, loaded, load };
}

function LoteCard({ lote }) {
  const cd = formatCountdown(lote["Fecha_Subasta"]);
  const estColor = ESTATUS_COLOR[lote["Estatus_Lote"]] || COLORS.muted;
  return (
    <div className="rounded-xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.text }}>
          Lote #{lote["Lote_Numero"] || "—"}
        </span>
        <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ color: estColor, background: "rgba(255,255,255,0.06)" }}>
          {lote["Estatus_Lote"] || "Sin estatus"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-2" style={{ color: cd.urgent ? COLORS.orange : COLORS.muted, fontSize: 13 }}>
        <Clock size={13} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{cd.past ? cd.label : `Subasta ${cd.label}`}</span>
        {cd.urgent && <AlertTriangle size={13} />}
      </div>
      {lote["Puja_Actual"] && (
        <p className="mt-1" style={{ color: COLORS.muted, fontSize: 13 }}>
          Puja actual: <span style={{ color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>${lote["Puja_Actual"]}</span>
        </p>
      )}
      {lote["Notas"] && <p className="mt-1" style={{ color: COLORS.muted, fontSize: 12.5 }}>{lote["Notas"]}</p>}
      {lote["Link_Copart_IAAI"] && (
        <a href={lote["Link_Copart_IAAI"]} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-sm" style={{ color: COLORS.accent }}>
          Ver lote <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

function ClienteView({ data }) {
  const [codigo, setCodigo] = useState("");
  const [buscado, setBuscado] = useState(null);

  const buscar = async () => {
    if (!data.loaded) await data.load();
    setBuscado(codigo.trim().toUpperCase());
  };

  const cliente = useMemo(() => {
    if (!buscado) return null;
    return data.clientes.find((c) => (c["Codigo"] || "").toUpperCase() === buscado) || null;
  }, [buscado, data.clientes]);

  const lotesCliente = useMemo(() => {
    if (!buscado) return [];
    return data.lotes
      .filter((l) => (l["Codigo_Cliente"] || "").toUpperCase() === buscado)
      .sort((a, b) => new Date(a["Fecha_Subasta"]) - new Date(b["Fecha_Subasta"]));
  }, [buscado, data.lotes]);

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <p style={{ color: COLORS.muted, fontSize: 13 }} className="mb-3">Escribe el código que te compartimos para ver el estatus de tu búsqueda.</p>
        <div className="flex gap-2">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder="Ej. AS-001"
            className="flex-1 rounded-lg px-3 py-2 outline-none"
            style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}
          />
          <button onClick={buscar} className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold"
            style={{ background: COLORS.accent, color: COLORS.bg }}>
            {data.loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
            Buscar
          </button>
        </div>
        {data.error && <p className="mt-2 text-sm" style={{ color: COLORS.orange }}>{data.error}</p>}
      </div>

      {buscado && !data.loading && !cliente && (
        <p className="mt-4 text-center" style={{ color: COLORS.muted }}>No encontramos ese código. Verifica que esté bien escrito.</p>
      )}

      {cliente && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl p-4" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Car size={16} color={COLORS.accent} />
              <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16, color: COLORS.text }}>
                Hola, {cliente["Nombre"] || "cliente"}
              </span>
            </div>
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Buscando: <span style={{ color: COLORS.text }}>{cliente["Auto_Buscado"]}</span></p>
            {cliente["Presupuesto_Max"] && <p style={{ color: COLORS.muted, fontSize: 13 }}>Presupuesto: <span style={{ color: COLORS.text }}>${cliente["Presupuesto_Max"]}</span></p>}
            {cliente["Preferencia_Dano"] && <p style={{ color: COLORS.muted, fontSize: 13 }}>Preferencia de daño: <span style={{ color: COLORS.text }}>{cliente["Preferencia_Dano"]}</span></p>}
            <p className="mt-2 inline-block px-2 py-0.5 rounded text-xs font-bold" style={{ color: COLORS.accent, background: "rgba(20,184,166,0.12)" }}>
              {cliente["Estatus"] || "En proceso"}
            </p>
            {cliente["Notas"] && <p className="mt-2" style={{ color: COLORS.muted, fontSize: 12.5 }}>{cliente["Notas"]}</p>}
          </div>

          {lotesCliente.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }} className="text-center">Todavía no hay lotes específicos asignados a tu búsqueda.</p>
          ) : (
            lotesCliente.map((l, i) => <LoteCard key={i} lote={l} />)
          )}
        </div>
      )}
    </div>
  );
}

const PREFERRED_STATUS_ORDER = ["Buscando", "Cotizando", "Pujando", "Ganado", "Entregado", "Perdido"];

function ClienteCard({ cliente, loteCount }) {
  return (
    <div className="rounded-lg p-3" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center justify-between gap-2">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: COLORS.accent }}>{cliente["Codigo"]}</span>
        {loteCount > 0 && (
          <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: "rgba(20,184,166,0.12)", color: COLORS.accent }}>
            {loteCount} lote{loteCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }} className="mt-1">{cliente["Nombre"] || "Sin nombre"}</p>
      <p style={{ color: COLORS.muted, fontSize: 12.5 }}>{cliente["Auto_Buscado"] || "—"}</p>
      {cliente["Presupuesto_Max"] && (
        <p style={{ color: COLORS.muted, fontSize: 12 }} className="mt-1">
          Presupuesto: <span style={{ color: COLORS.text }}>${cliente["Presupuesto_Max"]}</span>
        </p>
      )}
      {cliente["Notas"] && <p style={{ color: COLORS.muted, fontSize: 11.5 }} className="mt-1 italic">{cliente["Notas"]}</p>}
    </div>
  );
}

function ClientesKanban({ data }) {
  const loteCountByCode = useMemo(() => {
    const m = {};
    data.lotes.forEach((l) => {
      const code = (l["Codigo_Cliente"] || "").toUpperCase();
      m[code] = (m[code] || 0) + 1;
    });
    return m;
  }, [data.lotes]);

  const columns = useMemo(() => {
    const byStatus = {};
    data.clientes.forEach((c) => {
      const est = c["Estatus"] || "Sin estatus";
      if (!byStatus[est]) byStatus[est] = [];
      byStatus[est].push(c);
    });
    const ordered = PREFERRED_STATUS_ORDER.filter((s) => byStatus[s]).map((s) => [s, byStatus[s]]);
    const extra = Object.keys(byStatus).filter((s) => !PREFERRED_STATUS_ORDER.includes(s)).sort();
    extra.forEach((s) => ordered.push([s, byStatus[s]]));
    return ordered;
  }, [data.clientes]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16, color: COLORS.text }}>Pipeline de clientes</span>
        <button onClick={data.load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.text }}>
          <RefreshCw size={13} className={data.loading ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>
      {columns.length === 0 ? (
        <p style={{ color: COLORS.muted }}>No hay clientes cargados todavía.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map(([status, clientes]) => (
            <div key={status} className="rounded-xl p-3 shrink-0" style={{ width: 220, background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 12.5, color: COLORS.text, textTransform: "uppercase", letterSpacing: "0.03em" }}>{status}</span>
                <span style={{ color: COLORS.muted, fontSize: 12 }}>{clientes.length}</span>
              </div>
              <div className="space-y-2">
                {clientes.map((c, i) => (
                  <ClienteCard key={i} cliente={c} loteCount={loteCountByCode[(c["Codigo"] || "").toUpperCase()] || 0} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LotesAdminView({ data }) {
  const allSorted = useMemo(() => {
    return [...data.lotes].sort((a, b) => new Date(a["Fecha_Subasta"]) - new Date(b["Fecha_Subasta"]));
  }, [data.lotes]);

  const clienteMap = useMemo(() => {
    const m = {};
    data.clientes.forEach((c) => { m[(c["Codigo"] || "").toUpperCase()] = c; });
    return m;
  }, [data.clientes]);

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16, color: COLORS.text }}>Todos los lotes — por subasta más próxima</span>
        <button onClick={data.load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.text }}>
          <RefreshCw size={13} className={data.loading ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>
      {allSorted.length === 0 && <p style={{ color: COLORS.muted }}>No hay lotes cargados todavía.</p>}
      {allSorted.map((l, i) => {
        const c = clienteMap[(l["Codigo_Cliente"] || "").toUpperCase()];
        return (
          <div key={i} className="rounded-xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span style={{ color: COLORS.muted, fontSize: 12.5 }}>
                Cliente: <span style={{ color: COLORS.text, fontWeight: 600 }}>{c ? c["Nombre"] : l["Codigo_Cliente"]}</span>
              </span>
            </div>
            <LoteCard lote={l} />
          </div>
        );
      })}
    </div>
  );
}

function currency(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const MOV_INFO = {
  "Deposito": { label: "Depósito", color: COLORS.green, sign: 1, target: "deposito" },
  "Retiro_Deposito": { label: "Retiro de depósito", color: COLORS.orange, sign: -1, target: "deposito" },
  "Aplicado_Compra": { label: "Aplicado a compra", color: COLORS.orange, sign: -1, target: "deposito" },
  "Fee_Cobrado": { label: "Fee cobrado", color: COLORS.accent, sign: 1, target: "fee" },
  "Fee_Usado": { label: "Fee usado (lote ganado)", color: COLORS.muted, sign: -1, target: "fee" },
};

function FeeCalculator() {
  const [bid, setBid] = useState("");
  const fee = calcularComision(bid);
  const deposito = calcularDeposito(bid);
  return (
    <div className="rounded-xl p-4" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
      <p style={{ color: COLORS.muted, fontSize: 12 }} className="mb-2">Calculadora rápida — para cotizarle al cliente antes de pujar</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ color: COLORS.muted, fontSize: 13 }}>Monto de la puja</span>
        <input
          type="number" value={bid} onChange={(e) => setBid(e.target.value)}
          className="w-28 rounded-lg px-2 py-1.5 outline-none text-right"
          style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>
      <div className="flex gap-6 mt-3">
        <div>
          <p style={{ color: COLORS.muted, fontSize: 11 }}>Fee de broker</p>
          <p style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18 }}>{currency(fee)}</p>
        </div>
        <div>
          <p style={{ color: COLORS.muted, fontSize: 11 }}>Depósito requerido</p>
          <p style={{ color: COLORS.green, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18 }}>{currency(deposito)}</p>
          <p style={{ color: COLORS.muted, fontSize: 10 }}>10% o $500, lo mayor</p>
        </div>
      </div>
    </div>
  );
}

function FinanzasView({ data }) {
  const clienteMap = useMemo(() => {
    const m = {};
    data.clientes.forEach((c) => { m[(c["Codigo"] || "").toUpperCase()] = c; });
    return m;
  }, [data.clientes]);

  const movimientos = useMemo(() => {
    return data.finanzas
      .map((f) => {
        const info = MOV_INFO[f["Tipo_Movimiento"]] || { label: f["Tipo_Movimiento"] || "Movimiento", color: COLORS.muted, sign: 0, target: null };
        const monto = Number(f["Monto"]) || 0;
        const cliente = clienteMap[(f["Codigo_Cliente"] || "").toUpperCase()];
        return { ...f, monto, info, clienteNombre: cliente ? cliente["Nombre"] : f["Codigo_Cliente"] };
      })
      .sort((a, b) => new Date(b["Fecha"]) - new Date(a["Fecha"]));
  }, [data.finanzas, clienteMap]);

  const cuentas = useMemo(() => {
    const saldos = {};
    movimientos.forEach((m) => {
      const code = (m["Codigo_Cliente"] || "").toUpperCase();
      if (!saldos[code]) saldos[code] = { deposito: 0, fee: 0 };
      if (m.info.target === "deposito") saldos[code].deposito += m.info.sign * m.monto;
      if (m.info.target === "fee") saldos[code].fee += m.info.sign * m.monto;
    });
    return Object.keys(saldos).map((code) => ({
      codigo: code,
      nombre: clienteMap[code] ? clienteMap[code]["Nombre"] : code,
      ...saldos[code],
    }));
  }, [movimientos, clienteMap]);

  const totales = useMemo(() => {
    const depositosEnResguardo = cuentas.reduce((a, c) => a + Math.max(0, c.deposito), 0);
    const feesDisponibles = cuentas.reduce((a, c) => a + Math.max(0, c.fee), 0);
    const feesCobradosHistorico = movimientos.filter((m) => m["Tipo_Movimiento"] === "Fee_Cobrado").reduce((a, m) => a + m.monto, 0);
    const feesUsados = movimientos.filter((m) => m["Tipo_Movimiento"] === "Fee_Usado").reduce((a, m) => a + m.monto, 0);
    return { depositosEnResguardo, feesDisponibles, feesCobradosHistorico, feesUsados };
  }, [cuentas, movimientos]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16, color: COLORS.text }}>Finanzas</span>
        <button onClick={data.load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.text }}>
          <RefreshCw size={13} className={data.loading ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      <FeeCalculator />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <p style={{ color: COLORS.muted, fontSize: 11 }}>Depósitos en resguardo</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: COLORS.green }}>{currency(totales.depositosEnResguardo)}</p>
          <p style={{ color: COLORS.muted, fontSize: 10.5 }}>Dinero de clientes, reembolsable</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <p style={{ color: COLORS.muted, fontSize: 11 }}>Fees disponibles sin usar</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: COLORS.accent }}>{currency(totales.feesDisponibles)}</p>
          <p style={{ color: COLORS.muted, fontSize: 10.5 }}>Ya cobrado, esperando un lote ganador</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <p style={{ color: COLORS.muted, fontSize: 11 }}>Fees cobrados (histórico)</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: COLORS.text }}>{currency(totales.feesCobradosHistorico)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <p style={{ color: COLORS.muted, fontSize: 11 }}>Fees ya aplicados a un lote</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: COLORS.text }}>{currency(totales.feesUsados)}</p>
        </div>
      </div>

      <div>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14, color: COLORS.text, textTransform: "uppercase", letterSpacing: "0.02em" }}>Cuentas por cliente</span>
        {cuentas.length === 0 ? (
          <p style={{ color: COLORS.muted, fontSize: 13 }} className="mt-2">No hay movimientos cargados todavía.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {cuentas.map((c) => (
              <div key={c.codigo} className="rounded-xl p-3 flex items-center justify-between flex-wrap gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                <div>
                  <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{c.nombre}</span>
                  <span style={{ color: COLORS.muted, fontSize: 11.5 }} className="ml-2">{c.codigo}</span>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p style={{ color: COLORS.muted, fontSize: 10.5 }}>Depósito</p>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", color: c.deposito > 0 ? COLORS.green : COLORS.muted, fontSize: 14, fontWeight: 700 }}>{currency(c.deposito)}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ color: COLORS.muted, fontSize: 10.5 }}>Fee disponible</p>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", color: c.fee > 0 ? COLORS.accent : COLORS.muted, fontSize: 14, fontWeight: 700 }}>{currency(c.fee)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14, color: COLORS.text, textTransform: "uppercase", letterSpacing: "0.02em" }}>Historial de movimientos</span>
        {movimientos.length === 0 ? (
          <p style={{ color: COLORS.muted, fontSize: 13 }} className="mt-2">No hay movimientos cargados todavía en la pestaña Finanzas del Sheet.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {movimientos.map((m, i) => (
              <div key={i} className="rounded-lg p-3 flex items-center justify-between flex-wrap gap-2" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded font-bold" style={{ color: m.info.color, background: "rgba(255,255,255,0.06)", fontSize: 10.5 }}>{m.info.label}</span>
                    <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600 }}>{m.clienteNombre}</span>
                  </div>
                  <p style={{ color: COLORS.muted, fontSize: 11.5 }} className="mt-0.5">
                    {m["Fecha"] || "sin fecha"}{m["Lote_Numero"] ? ` · Lote #${m["Lote_Numero"]}` : ""}{m["Notas"] ? ` · ${m["Notas"]}` : ""}
                  </p>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: m.info.sign >= 0 ? COLORS.green : COLORS.orange }}>
                  {m.info.sign >= 0 ? "+" : "−"}{currency(m.monto)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  return (
    <div className="max-w-sm mx-auto rounded-xl p-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Lock size={16} color={COLORS.accent} />
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, color: COLORS.text }}>Acceso de operación</span>
      </div>
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onUnlock(pw)}
        placeholder="Contraseña"
        className="w-full rounded-lg px-3 py-2 outline-none mb-2"
        style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
      />
      <button onClick={() => onUnlock(pw)} className="w-full py-2 rounded-lg font-semibold" style={{ background: COLORS.accent, color: COLORS.bg }}>
        Entrar
      </button>
    </div>
  );
}

export default function App() {
  const data = useSheetData();
  const [tab, setTab] = useState("cliente");
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = (pw) => {
    if (pw === ADMIN_PASSWORD) {
      setUnlocked(true);
      data.load();
    }
  };

  const tabs = [
    { k: "cliente", l: "Mi estatus" },
    { k: "clientes", l: "Clientes" },
    { k: "lotes", l: "Lotes" },
    { k: "finanzas", l: "Finanzas" },
  ];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=JetBrains+Mono:wght@500;700&display=swap');`}</style>

      <div className="px-4 pt-6 pb-4 sm:px-8 text-center" style={{ borderBottom: `2px solid ${COLORS.border}` }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>
          Panel de operación
        </h1>
        <p style={{ color: COLORS.muted, fontSize: 12 }}>Clientes y lotes de Copart / IAAI en un solo lugar</p>
      </div>

      <div className="flex justify-center gap-1 px-3 pt-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className="px-4 py-2 rounded-t-lg text-sm font-semibold"
            style={{ background: tab === t.k ? COLORS.surface : "transparent", borderTop: tab === t.k ? `2px solid ${COLORS.accent}` : "2px solid transparent", color: tab === t.k ? COLORS.text : COLORS.muted }}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-8">
        {tab === "cliente" && <ClienteView data={data} />}
        {tab !== "cliente" && !unlocked && <AdminGate onUnlock={handleUnlock} />}
        {tab === "clientes" && unlocked && <ClientesKanban data={data} />}
        {tab === "lotes" && unlocked && <LotesAdminView data={data} />}
        {tab === "finanzas" && unlocked && <FinanzasView data={data} />}
      </div>
    </div>
  );
}
