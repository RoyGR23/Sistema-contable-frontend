import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from './config';

// ─── Config de semáforos ──────────────────────────────────────────────────────
const SEMAFORO = {
    Pendiente: { color: '#fd7e14', bg: '#fff3cd', emoji: '🟡', label: 'Pendiente' },
    Pagado: { color: '#198754', bg: '#d1e7dd', emoji: '🟢', label: 'Pagado' },
    Atrasado: { color: '#dc3545', bg: '#f8d7da', emoji: '🔴', label: 'Atrasado' },
    Anulado: { color: '#6c757d', bg: '#e9ecef', emoji: '⚫', label: 'Anulado' },
};
const ESTADOS = Object.keys(SEMAFORO);

// ─── Modal: Exportar PDF ──────────────────────────────────────────────────────
function ModalExportarPDF({ cuentas, onCerrar }) {
    const hoy = new Date().toISOString().split('T')[0];
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState(hoy);
    const [estadoFiltro, setEstadoFiltro] = useState('Todos');
    const [clienteFiltro, setClienteFiltro] = useState('');
    const [montoMin, setMontoMin] = useState('');
    const [montoMax, setMontoMax] = useState('');

    const formatRD = v => `RD$ ${parseFloat(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    const formatFecha = f => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    const cuentasFiltradas = cuentas.filter(c => {
        if (estadoFiltro !== 'Todos' && c.estado !== estadoFiltro) return false;
        if (clienteFiltro.trim() && !c.nombre_cliente.toLowerCase().includes(clienteFiltro.toLowerCase())) return false;
        const saldo = parseFloat(c.saldo_pendiente || 0);
        if (montoMin !== '' && saldo < parseFloat(montoMin)) return false;
        if (montoMax !== '' && saldo > parseFloat(montoMax)) return false;
        if (fechaDesde && c.creado_en && c.creado_en.split('T')[0] < fechaDesde) return false;
        if (fechaHasta && c.creado_en && c.creado_en.split('T')[0] > fechaHasta) return false;
        return true;
    });

    const totalSaldo = cuentasFiltradas.reduce((s, c) => s + parseFloat(c.saldo_pendiente || 0), 0);

    const [generando, setGenerando] = useState(false);

    const generarPDF = async () => {
        setGenerando(true);
        try {
            const params = new URLSearchParams();
            if (fechaDesde) params.append('fecha_desde', fechaDesde);
            if (fechaHasta) params.append('fecha_hasta', fechaHasta);
            if (estadoFiltro !== 'Todos') params.append('estado', estadoFiltro);
            if (clienteFiltro) params.append('cliente', clienteFiltro);
            if (montoMin) params.append('monto_min', montoMin);
            if (montoMax) params.append('monto_max', montoMax);

            const url = `${API_BASE_URL}/api/v1/cuentas-cobrar/exportar-pdf?${params.toString()}`;

            const response = await fetch(url, { method: 'GET' });
            if (!response.ok) {
                throw new Error('Error al generar el PDF del lado del servidor');
            }

            const blob = await response.blob();
            const tempUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = tempUrl;
            a.download = `cuentas_por_cobrar_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(tempUrl);

            onCerrar();
        } catch (error) {
            console.error(error);
            alert('Hubo un problema al generar el PDF.');
        } finally {
            setGenerando(false);
        }
    };

    const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '13px', boxSizing: 'border-box', outline: 'none' };
    const labelStyle = { fontSize: '12px', color: '#6c757d', fontWeight: '600', display: 'block', marginBottom: '5px' };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onCerrar}>
            <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '28px', width: '520px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: 0, color: '#2c3e50' }}>Exportar Reporte PDF</h3>
                        <p style={{ margin: '4px 0 0', color: '#7f8c8d', fontSize: '13px' }}>Filtra los datos antes de generar el reporte.</p>
                    </div>
                    <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6c757d' }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                        <label style={labelStyle}>Fecha desde</label>
                        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Fecha hasta</label>
                        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Estado</label>
                        <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={inputStyle}>
                            <option value="Todos">Todos los estados</option>
                            {Object.keys(SEMAFORO).map(s => <option key={s} value={s}>{SEMAFORO[s].emoji} {s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Cliente</label>
                        <input type="text" placeholder="Nombre del cliente..." value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Saldo mínimo (RD$)</label>
                        <input type="number" min="0" placeholder="0.00" value={montoMin} onChange={e => setMontoMin(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Saldo máximo (RD$)</label>
                        <input type="number" min="0" placeholder="Sin límite" value={montoMax} onChange={e => setMontoMax(e.target.value)} style={inputStyle} />
                    </div>
                </div>

                {/* Preview */}
                <div style={{ marginTop: '18px', padding: '12px 16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <span style={{ fontSize: '13px', color: '#495057' }}>
                        Registros a incluir: <strong style={{ color: '#2c3e50' }}>{cuentasFiltradas.length}</strong>
                        &nbsp;|&nbsp; Saldo total: <strong style={{ color: '#dc3545' }}>{formatRD(totalSaldo)}</strong>
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                    <button onClick={onCerrar} disabled={generando} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600', color: '#6c757d' }}>Cancelar</button>
                    <button
                        onClick={generarPDF}
                        disabled={cuentasFiltradas.length === 0 || generando}
                        style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: (cuentasFiltradas.length === 0 || generando) ? '#adb5bd' : '#dc3545', color: 'white', cursor: (cuentasFiltradas.length === 0 || generando) ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {generando ? 'Generando...' : `Generar PDF ${cuentasFiltradas.length > 0 ? `(${cuentasFiltradas.length})` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SemaforoEstado({ estado }) {
    const cfg = SEMAFORO[estado] || SEMAFORO['Pendiente'];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '20px',
            backgroundColor: cfg.bg, color: cfg.color,
            fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap'
        }}>
            {cfg.emoji} {cfg.label}
        </span>
    );
}

// ─── Modal: Realizar Abono ────────────────────────────────────────────────────
function ModalAbono({ cuenta, onCerrar, onAbonoRealizado }) {
    const [monto, setMonto] = useState('');
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [referencia, setReferencia] = useState('');
    const [notas, setNotas] = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const saldoRestante = parseFloat(cuenta.saldo_pendiente || 0);
    const formatRD = v => `RD$ ${parseFloat(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

    const handleSubmit = async () => {
        const montoNum = parseFloat(monto);
        if (!monto || isNaN(montoNum) || montoNum <= 0) { setError('El monto debe ser mayor a 0.'); return; }
        if (montoNum > saldoRestante) { setError(`El abono no puede superar el saldo pendiente (${formatRD(saldoRestante)}).`); return; }

        setCargando(true);
        setError('');
        try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/cuentas-cobrar/${cuenta.id}/abonos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monto_abonado: montoNum, metodo_pago: metodoPago, referencia, notas })
            });
            const data = await resp.json();
            if (resp.ok) {
                onAbonoRealizado(data);
                onCerrar();
            } else {
                setError(data.detail || 'Error al registrar el abono.');
            }
        } catch {
            setError('Error de conexión.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={onCerrar}>
            <div style={{
                backgroundColor: 'white', borderRadius: '14px', padding: '28px', width: '420px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>

                <h3 style={{ margin: '0 0 4px', color: '#2c3e50' }}>Realizar Abono</h3>
                <p style={{ margin: '0 0 20px', color: '#7f8c8d', fontSize: '13px' }}>
                    Cliente: <strong>{cuenta.nombre_cliente}</strong> &nbsp;|&nbsp; Saldo: <strong style={{ color: '#dc3545' }}>{formatRD(saldoRestante)}</strong>
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ fontSize: '13px', color: '#6c757d', display: 'block', marginBottom: '5px', fontWeight: '600' }}>Monto a abonar *</label>
                        <input
                            type="number" min="0.01" step="0.01" max={saldoRestante}
                            placeholder={`Máximo ${formatRD(saldoRestante)}`}
                            value={monto} onChange={e => setMonto(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', color: '#6c757d', display: 'block', marginBottom: '5px', fontWeight: '600' }}>Método de pago</label>
                        <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '14px', boxSizing: 'border-box' }}>
                            <option>Efectivo</option>
                            <option>Transferencia</option>
                            <option>Cheque</option>
                            <option>Tarjeta</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', color: '#6c757d', display: 'block', marginBottom: '5px', fontWeight: '600' }}>Referencia (opcional)</label>
                        <input type="text" placeholder="# de transacción, cheque…" value={referencia} onChange={e => setReferencia(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', color: '#6c757d', display: 'block', marginBottom: '5px', fontWeight: '600' }}>Notas (opcional)</label>
                        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '14px', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
                    </div>
                </div>

                {error && <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                    <button onClick={onCerrar} disabled={cargando}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600', color: '#6c757d' }}>
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={cargando || !monto}
                        style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: cargando || !monto ? '#6c757d' : '#198754', color: 'white', cursor: cargando || !monto ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px' }}>
                        {cargando ? 'Guardando…' : 'Realizar Abono'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Panel Lateral: Historial de Abonos ──────────────────────────────────────
function PanelAbonos({ cuenta, onCerrar, onActualizarCuenta }) {
    const [abonos, setAbonos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mostrarModalAbono, setMostrarModalAbono] = useState(false);

    const formatRD = v => `RD$ ${parseFloat(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    const formatFechaHora = f => f ? new Date(f).toLocaleString('es-DO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    const cargarAbonos = useCallback(async () => {
        setCargando(true);
        try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/cuentas-cobrar/${cuenta.id}/abonos`);
            const data = await resp.json();
            if (resp.ok) setAbonos(data.datos || []);
        } catch { /* silencioso */ } finally {
            setCargando(false);
        }
    }, [cuenta.id]);

    useEffect(() => { cargarAbonos(); }, [cargarAbonos]);

    const handleAbonoRealizado = (data) => {
        // Recargar abonos y actualizar cuenta padre
        cargarAbonos();
        if (data.cuenta_actualizada) {
            onActualizarCuenta(data.cuenta_actualizada);
        }
    };

    const saldoCero = parseFloat(cuenta.saldo_pendiente || 0) <= 0;
    const cuentaCerrada = cuenta.estado === 'Pagado' || cuenta.estado === 'Anulado';

    return (
        <>
            {/* Overlay */}
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1000 }} onClick={onCerrar} />

            {/* Panel deslizante desde la derecha */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
                backgroundColor: 'white', zIndex: 1001,
                boxShadow: '-4px 0 25px rgba(0,0,0,0.2)',
                display: 'flex', flexDirection: 'column',
                animation: 'slideIn 0.25s ease'
            }}>
                {/* Encabezado */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '18px' }}>Historial de Abonos</h3>
                        <p style={{ margin: '4px 0 0', color: '#7f8c8d', fontSize: '13px' }}>{cuenta.nombre_cliente} — {cuenta.ncf || '—'}</p>
                    </div>
                    <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6c757d', lineHeight: '1' }}>✕</button>
                </div>

                {/* Resumen de la cuenta */}
                <div style={{ padding: '12px 24px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div><div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', fontWeight: '700' }}>Monto Facturado</div><div style={{ fontSize: '15px', fontWeight: '700', color: '#2c3e50', marginTop: '4px' }}>{formatRD(cuenta.monto_inicial)}</div></div>
                    <div><div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', fontWeight: '700' }}>Saldo Pendiente</div><div style={{ fontSize: '15px', fontWeight: '700', color: saldoCero ? '#198754' : '#dc3545', marginTop: '4px' }}>{formatRD(cuenta.saldo_pendiente)}</div></div>
                    <div><div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase', fontWeight: '700' }}>Estado</div><div style={{ marginTop: '5px' }}><SemaforoEstado estado={cuenta.estado} /></div></div>
                </div>

                {/* Botón Realizar Abono */}
                <div style={{ padding: '12px 24px', borderBottom: '1px solid #e9ecef' }}>
                    <button
                        onClick={() => setMostrarModalAbono(true)}
                        disabled={saldoCero || cuentaCerrada}
                        title={saldoCero ? 'El saldo ya está en cero' : cuentaCerrada ? 'La cuenta está cerrada' : 'Registrar nuevo abono'}
                        style={{
                            padding: '9px 18px', borderRadius: '8px', border: 'none',
                            backgroundColor: saldoCero || cuentaCerrada ? '#e9ecef' : '#198754',
                            color: saldoCero || cuentaCerrada ? '#adb5bd' : 'white',
                            cursor: saldoCero || cuentaCerrada ? 'not-allowed' : 'pointer',
                            fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        Realizar Abono
                        {(saldoCero || cuentaCerrada) && <span style={{ fontSize: '12px', fontWeight: '400' }}>(Cuenta saldada)</span>}
                    </button>
                </div>

                {/* Historial */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                    {cargando ? (
                        <p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: '40px' }}>Cargando historial…</p>
                    ) : abonos.length === 0 ? (
                        <p style={{ color: '#adb5bd', textAlign: 'center', marginTop: '40px' }}>No hay abonos registrados aún.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {abonos.map(a => (
                                <div key={a.id} style={{
                                    border: '1px solid #e9ecef', borderRadius: '8px', padding: '10px 12px',
                                    backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '15px', fontWeight: '700', color: '#198754' }}>{formatRD(a.monto_abonado)}</span>
                                        <span style={{
                                            fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px',
                                            backgroundColor: '#e8f5e9', color: '#2e7d32'
                                        }}>{a.metodo_pago}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6c757d' }}>{formatFechaHora(a.creado_en)}</div>
                                    {a.referencia && <div style={{ fontSize: '11px', color: '#495057', marginTop: '3px' }}>Ref: <strong>{a.referencia}</strong></div>}
                                    {a.notas && <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '3px', fontStyle: 'italic' }}>"{a.notas}"</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de nuevo abono */}
            {mostrarModalAbono && (
                <ModalAbono
                    cuenta={cuenta}
                    onCerrar={() => setMostrarModalAbono(false)}
                    onAbonoRealizado={handleAbonoRealizado}
                />
            )}

            <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        </>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CuentasCobrar() {
    const [cuentas, setCuentas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [busqueda, setBusqueda] = useState('');
    const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
    const [mostrarModalPDF, setMostrarModalPDF] = useState(false);

    const cargarCuentas = useCallback(async () => {
        setCargando(true);
        try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/cuentas-cobrar`);
            const data = await resp.json();
            if (resp.ok) setCuentas(data.datos);
        } catch {
            setMensaje('Error cargando cuentas por cobrar.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargarCuentas(); }, [cargarCuentas]);

    // Cuando el panel actualiza la cuenta (abono realizado), reflejar los cambios
    const actualizarCuentaLocal = (cuentaActualizada) => {
        setCuentas(prev => prev.map(c => c.id === cuentaActualizada.id ? { ...c, ...cuentaActualizada } : c));
        // Si la cuenta seleccionada es la misma, actualizar también su panel
        if (cuentaSeleccionada?.id === cuentaActualizada.id) {
            setCuentaSeleccionada(prev => ({ ...prev, ...cuentaActualizada }));
        }
    };

    const cuentasFiltradas = cuentas.filter(c => {
        const coincideEstado = filtroEstado === 'Todos' || c.estado === filtroEstado;
        const q = busqueda.toLowerCase();
        const coincideBusqueda = !busqueda.trim() ||
            c.nombre_cliente.toLowerCase().includes(q) ||
            c.rnc_cedula.includes(busqueda) ||
            (c.ncf || '').toLowerCase().includes(q);
        return coincideEstado && coincideBusqueda;
    });

    const totalPendiente = cuentas.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + parseFloat(c.saldo_pendiente || 0), 0);
    const totalAtrasado = cuentas.filter(c => c.estado === 'Atrasado').reduce((s, c) => s + parseFloat(c.saldo_pendiente || 0), 0);
    const totalCuentas = cuentas.length;

    const formatRD = v => `RD$ ${parseFloat(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    const formatFecha = f => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    return (
        <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ color: '#2c3e50', marginBottom: '24px' }}>Cuentas por Cobrar</h1>
            {/* Tarjetas resumen */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div style={{ flex: 1, minWidth: '150px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', borderLeft: '4px solid #3498db' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Cuentas</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2c3e50', lineHeight: '1.2', marginTop: '6px' }}>{totalCuentas}</div>
                </div>
                <div style={{ flex: 1, minWidth: '150px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', borderLeft: '4px solid #fd7e14' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Pendiente</div>
                    <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#fd7e14', lineHeight: '1.4', marginTop: '6px' }}>{formatRD(totalPendiente)}</div>
                </div>
                <div style={{ flex: 1, minWidth: '150px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', borderLeft: '4px solid #dc3545' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Atrasado</div>
                    <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#dc3545', lineHeight: '1.4', marginTop: '6px' }}>{formatRD(totalAtrasado)}</div>
                </div>
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="text" placeholder="Buscar cliente, NCF..."
                        value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '14px', width: '260px', outline: 'none' }} />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['Todos', ...ESTADOS].map(e => (
                            <button key={e} onClick={() => setFiltroEstado(e)} style={{
                                padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                                backgroundColor: filtroEstado === e ? '#2c3e50' : '#e9ecef',
                                color: filtroEstado === e ? 'white' : '#495057', transition: 'all 0.2s'
                            }}>
                                {e === 'Todos' ? 'Todos' : `${SEMAFORO[e].emoji} ${e}`}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => setMostrarModalPDF(true)}
                    style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#dc3545', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                    Exportar PDF
                </button>
            </div>

            {mensaje && (
                <div style={{ padding: '12px 18px', backgroundColor: '#d1e7dd', color: '#0a3622', borderRadius: '8px', marginBottom: '18px', fontSize: '14px', fontWeight: '600' }}>
                    {mensaje}
                </div>
            )}

            {/* Tabla */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                {cargando ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>Cargando cuentas...</div>
                ) : cuentasFiltradas.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>No hay cuentas que coincidan con los filtros.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                                {['NCF', 'Cliente', 'RNC/Cédula', 'Monto Original', 'Saldo Pendiente', 'Vencimiento', 'Estado'].map(h => (
                                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', color: '#6c757d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {cuentasFiltradas.map((c, i) => (
                                <tr
                                    key={c.id}
                                    onClick={() => setCuentaSeleccionada(c)}
                                    style={{
                                        backgroundColor: cuentaSeleccionada?.id === c.id ? '#e8f4f8' : (i % 2 === 0 ? 'white' : '#fafafa'),
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.15s',
                                        outline: cuentaSeleccionada?.id === c.id ? '2px solid #3498db' : 'none',
                                        outlineOffset: cuentaSeleccionada?.id === c.id ? '-2px' : '0'
                                    }}
                                    onMouseEnter={e => { if (cuentaSeleccionada?.id !== c.id) e.currentTarget.style.backgroundColor = '#f0f7ff'; }}
                                    onMouseLeave={e => { if (cuentaSeleccionada?.id !== c.id) e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'white' : '#fafafa'; }}
                                >
                                    <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#495057' }}>{c.ncf || '—'}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>{c.nombre_cliente}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6c757d' }}>{c.rnc_cedula}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>{formatRD(c.monto_inicial)}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: parseFloat(c.saldo_pendiente) > 0 ? '#dc3545' : '#198754' }}>{formatRD(c.saldo_pendiente)}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6c757d' }}>{formatFecha(c.fecha_vencimiento)}</td>
                                    <td style={{ padding: '14px 16px' }}><SemaforoEstado estado={c.estado} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Panel lateral de abonos */}
            {cuentaSeleccionada && (
                <PanelAbonos
                    cuenta={cuentaSeleccionada}
                    onCerrar={() => setCuentaSeleccionada(null)}
                    onActualizarCuenta={actualizarCuentaLocal}
                />
            )}
        </div>
    );
}
