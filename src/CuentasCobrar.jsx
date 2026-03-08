import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from './config';

const SEMAFORO = {
    Pendiente: { color: '#fd7e14', bg: '#fff3cd', emoji: '🟡', label: 'Pendiente' },
    Pagado: { color: '#198754', bg: '#d1e7dd', emoji: '🟢', label: 'Pagado' },
    Atrasado: { color: '#dc3545', bg: '#f8d7da', emoji: '🔴', label: 'Atrasado' },
    Anulado: { color: '#6c757d', bg: '#e9ecef', emoji: '⚫', label: 'Anulado' },
};

const ESTADOS = Object.keys(SEMAFORO);

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

export default function CuentasCobrar() {
    const [cuentas, setCuentas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [busqueda, setBusqueda] = useState('');
    const [actualizando, setActualizando] = useState(null); // id de la fila actualizandose

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

    const cambiarEstado = async (id, nuevoEstado) => {
        setActualizando(id);
        try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/cuentas-cobrar/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            if (resp.ok) {
                setCuentas(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));
                setMensaje('Estado actualizado correctamente.');
                setTimeout(() => setMensaje(''), 3000);
            } else {
                const err = await resp.json();
                setMensaje(`Error: ${err.detail}`);
            }
        } catch {
            setMensaje('Error de conexión.');
        } finally {
            setActualizando(null);
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

    // Totales resumen
    const totalPendiente = cuentas.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + parseFloat(c.saldo_pendiente || 0), 0);
    const totalAtrasado = cuentas.filter(c => c.estado === 'Atrasado').reduce((s, c) => s + parseFloat(c.saldo_pendiente || 0), 0);
    const totalCuentas = cuentas.length;

    const formatRD = v => `RD$ ${parseFloat(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    const formatFecha = f => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    return (
        <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ color: '#2c3e50', marginBottom: '5px' }}>Cuentas por Cobrar</h1>
            <p style={{ color: '#7f8c8d', marginBottom: '25px' }}>Gestión de ventas a crédito y seguimiento de pagos.</p>

            {/* Tarjetas resumen */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '28px' }}>
                <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: '5px solid #3498db' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Cuentas</div>
                    <div style={{ fontSize: '38px', fontWeight: 'bold', color: '#2c3e50' }}>{totalCuentas}</div>
                </div>
                <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: '5px solid #fd7e14' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Pendiente</div>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fd7e14' }}>{formatRD(totalPendiente)}</div>
                </div>
                <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: '5px solid #dc3545' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Atrasado</div>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc3545' }}>{formatRD(totalAtrasado)}</div>
                </div>
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="🔍 Buscar cliente, NCF..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '14px', width: '260px', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['Todos', ...ESTADOS].map(e => (
                        <button
                            key={e}
                            onClick={() => setFiltroEstado(e)}
                            style={{
                                padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                                backgroundColor: filtroEstado === e ? '#2c3e50' : '#e9ecef',
                                color: filtroEstado === e ? 'white' : '#495057',
                                transition: 'all 0.2s'
                            }}
                        >
                            {e === 'Todos' ? 'Todos' : `${SEMAFORO[e].emoji} ${e}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mensaje */}
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
                                {['NCF', 'Cliente', 'RNC/Cédula', 'Monto Original', 'Saldo Pendiente', 'Vencimiento', 'Estado', 'Acción'].map(h => (
                                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', color: '#6c757d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {cuentasFiltradas.map((c, i) => (
                                <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f0f0f0', transition: 'background-color 0.15s' }}>
                                    <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#495057' }}>{c.ncf || '—'}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>{c.nombre_cliente}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6c757d' }}>{c.rnc_cedula}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>{formatRD(c.monto_inicial)}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: parseFloat(c.saldo_pendiente) > 0 ? '#dc3545' : '#198754' }}>{formatRD(c.saldo_pendiente)}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6c757d' }}>{formatFecha(c.fecha_vencimiento)}</td>
                                    <td style={{ padding: '14px 16px' }}><SemaforoEstado estado={c.estado} /></td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <select
                                            value={c.estado}
                                            disabled={actualizando === c.id}
                                            onChange={e => cambiarEstado(c.id, e.target.value)}
                                            style={{
                                                padding: '6px 10px', borderRadius: '6px', border: '1px solid #ced4da',
                                                fontSize: '13px', cursor: 'pointer', backgroundColor: 'white',
                                                opacity: actualizando === c.id ? 0.5 : 1
                                            }}
                                        >
                                            {ESTADOS.map(estado => (
                                                <option key={estado} value={estado}>{SEMAFORO[estado].emoji} {estado}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
