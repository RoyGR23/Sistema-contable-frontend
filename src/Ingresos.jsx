import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from './config';

const FILAS_POR_PAGINA = 20;

export default function Ingresos({ usuario }) {
    const [ingresos, setIngresos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState('');
    const [exportando, setExportando] = useState(false);
    const [pagina, setPagina] = useState(1);

    // Filtros
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [filtroMetodo, setFiltroMetodo] = useState('Todos');
    const [filtroTipo, setFiltroTipo] = useState('Todos');
    const [busqueda, setBusqueda] = useState('');
    const [montoMin, setMontoMin] = useState('');
    const [montoMax, setMontoMax] = useState('');

    const cargarIngresos = useCallback(async () => {
        setCargando(true);
        setMensaje('');
        try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/ingresos`);
            const data = await resp.json();
            if (resp.ok) setIngresos(data.datos);
            else setMensaje('Error cargando los ingresos.');
        } catch {
            setMensaje('Error de conexión con el servidor.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargarIngresos(); }, [cargarIngresos]);

    // Reiniciar página cuando cambien los filtros
    useEffect(() => { setPagina(1); }, [busqueda, fechaDesde, fechaHasta, filtroMetodo, filtroTipo, montoMin, montoMax]);

    const ingresosFiltrados = ingresos.filter(i => {
        if (filtroTipo !== 'Todos' && i.tipo_venta !== filtroTipo) return false;
        if (filtroMetodo !== 'Todos' && i.metodo_pago !== filtroMetodo) return false;
        const q = busqueda.toLowerCase();
        if (busqueda.trim() && !(
            (i.nombre_cliente || '').toLowerCase().includes(q) ||
            (i.rnc_cliente || '').includes(busqueda) ||
            (i.ncf || '').toLowerCase().includes(q)
        )) return false;
        const fechaVenta = i.fecha ? i.fecha.split('T')[0] : '';
        if (fechaDesde && fechaVenta && fechaVenta < fechaDesde) return false;
        if (fechaHasta && fechaVenta && fechaVenta > fechaHasta) return false;
        const total = parseFloat(i.total_pagar || 0);
        if (montoMin !== '' && total < parseFloat(montoMin)) return false;
        if (montoMax !== '' && total > parseFloat(montoMax)) return false;
        return true;
    });

    // Paginación
    const totalPaginas = Math.max(1, Math.ceil(ingresosFiltrados.length / FILAS_POR_PAGINA));
    const paginaActual = Math.min(pagina, totalPaginas);
    const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
    const ingresosPagina = ingresosFiltrados.slice(inicio, inicio + FILAS_POR_PAGINA);

    // Totales basados en TODOS los filtrados (no solo la página)
    const totalIngresos = ingresosFiltrados.reduce((s, i) => s + parseFloat(i.total_pagar || 0), 0);
    const totalContado = ingresosFiltrados.filter(i => i.tipo_venta === 'Contado').reduce((s, i) => s + parseFloat(i.total_pagar || 0), 0);
    const totalCredito = ingresosFiltrados.filter(i => i.tipo_venta === 'Crédito').reduce((s, i) => s + parseFloat(i.total_pagar || 0), 0);

    const formatRD = v => `RD$ ${parseFloat(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    const formatFecha = f => f ? new Date(f).toLocaleString('es-DO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const metodosUnicos = ['Todos', ...new Set(ingresos.map(i => i.metodo_pago).filter(Boolean))];

    const limpiarFiltros = () => {
        setBusqueda(''); setFechaDesde(''); setFechaHasta('');
        setFiltroMetodo('Todos'); setFiltroTipo('Todos');
        setMontoMin(''); setMontoMax('');
    };

    const exportarPDF = async () => {
        setExportando(true);
        try {
            const params = new URLSearchParams();
            if (fechaDesde) params.append('fecha_desde', fechaDesde);
            if (fechaHasta) params.append('fecha_hasta', fechaHasta);
            if (filtroTipo !== 'Todos') params.append('tipo_venta', filtroTipo);
            if (filtroMetodo !== 'Todos') params.append('metodo_pago', filtroMetodo);
            if (busqueda.trim()) params.append('cliente', busqueda.trim());
            if (montoMin) params.append('monto_min', montoMin);
            if (montoMax) params.append('monto_max', montoMax);

            const resp = await fetch(`${API_BASE_URL}/api/v1/ingresos/exportar-pdf?${params}`);
            if (!resp.ok) throw new Error('Error generando PDF');
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'reporte_ingresos.pdf';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setMensaje('Error al generar el PDF. Intente de nuevo.');
        } finally {
            setExportando(false);
        }
    };

    const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
    const labelStyle = { display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '5px', fontWeight: '600' };

    return (
        <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
            {/* Encabezado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ color: '#2c3e50', margin: 0 }}>Ingresos</h1>
                <button
                    onClick={exportarPDF}
                    disabled={exportando || ingresosFiltrados.length === 0}
                    style={{
                        padding: '10px 20px', borderRadius: '8px', border: 'none',
                        backgroundColor: exportando || ingresosFiltrados.length === 0 ? '#e9ecef' : '#dc3545',
                        color: exportando || ingresosFiltrados.length === 0 ? '#adb5bd' : 'white',
                        cursor: exportando || ingresosFiltrados.length === 0 ? 'not-allowed' : 'pointer',
                        fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                    {exportando ? '⏳ Generando...' : '📄 Exportar PDF'}
                </button>
            </div>

            {/* Tarjetas resumen dinámicas */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div style={{ flex: 1, minWidth: '130px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', borderLeft: '4px solid #3498db' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Registros</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2c3e50', marginTop: '6px' }}>{ingresosFiltrados.length}</div>
                </div>
                <div style={{ flex: 2, minWidth: '180px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', borderLeft: '4px solid #198754' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Ingresos</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#198754', marginTop: '6px' }}>{formatRD(totalIngresos)}</div>
                </div>
                <div style={{ flex: 2, minWidth: '180px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', borderLeft: '4px solid #0d6efd' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Contado</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d6efd', marginTop: '6px' }}>{formatRD(totalContado)}</div>
                </div>
                <div style={{ flex: 2, minWidth: '180px', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', borderLeft: '4px solid #fd7e14' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Crédito</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fd7e14', marginTop: '6px' }}>{formatRD(totalCredito)}</div>
                </div>
            </div>

            {/* Panel de Filtros */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#34495e' }}>Filtros de Búsqueda</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '15px' }}>
                    <div>
                        <label style={labelStyle}>Buscar (Cliente, NCF, RNC)</label>
                        <input type="text" placeholder="Término de búsqueda..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Tipo de Venta</label>
                        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={inputStyle}>
                            <option value="Todos">Todos</option>
                            <option value="Contado">Contado</option>
                            <option value="Crédito">Crédito</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Método de Pago</label>
                        <select value={filtroMetodo} onChange={e => setFiltroMetodo(e.target.value)} style={inputStyle}>
                            {metodosUnicos.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Fecha Desde</label>
                        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Fecha Hasta</label>
                        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Monto Mínimo</label>
                        <input type="number" min="0" placeholder="0.00" value={montoMin} onChange={e => setMontoMin(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Monto Máximo</label>
                        <input type="number" min="0" placeholder="Sin límite" value={montoMax} onChange={e => setMontoMax(e.target.value)} style={inputStyle} />
                    </div>
                </div>
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={limpiarFiltros} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: 'transparent', color: '#6c757d', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        Limpiar Filtros
                    </button>
                    <button onClick={cargarIngresos} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0d6efd', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        🔄 Actualizar
                    </button>
                </div>
            </div>

            {mensaje && (
                <div style={{ padding: '12px 18px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '18px', fontSize: '14px', fontWeight: '600' }}>
                    {mensaje}
                </div>
            )}

            {/* Tabla con paginación */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                {cargando ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>Cargando ingresos...</div>
                ) : ingresosFiltrados.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>No hay registros que coincidan con los filtros.</div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                                        {['Fecha', 'NCF', 'Cliente', 'RNC/Cédula', 'Tipo', 'Total', 'Método Pago'].map(h => (
                                            <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: '#6c757d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingresosPagina.map((i, index) => (
                                        <tr key={i.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6c757d', whiteSpace: 'nowrap' }}>{formatFecha(i.fecha)}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#495057' }}>{i.ncf}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>{i.nombre_cliente}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6c757d' }}>{i.rnc_cliente}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', backgroundColor: i.tipo_venta === 'Crédito' ? '#fff3cd' : '#d1e7dd', color: i.tipo_venta === 'Crédito' ? '#856404' : '#0a3622' }}>
                                                    {i.tipo_venta}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: '#198754', whiteSpace: 'nowrap' }}>{formatRD(i.total_pagar)}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#e8f4fd', color: '#0a58ca' }}>
                                                    {i.metodo_pago}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e9ecef', fontSize: '13px', color: '#6c757d' }}>
                            <span>
                                Mostrando {inicio + 1}–{Math.min(inicio + FILAS_POR_PAGINA, ingresosFiltrados.length)} de {ingresosFiltrados.length} registros
                            </span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                                    disabled={paginaActual === 1}
                                    style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ced4da', backgroundColor: paginaActual === 1 ? '#f8f9fa' : 'white', color: paginaActual === 1 ? '#adb5bd' : '#495057', cursor: paginaActual === 1 ? 'default' : 'pointer', fontWeight: '600' }}>
                                    ‹ Anterior
                                </button>
                                <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#0d6efd', color: 'white', fontWeight: '700', fontSize: '13px' }}>
                                    {paginaActual} / {totalPaginas}
                                </span>
                                <button
                                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                                    disabled={paginaActual === totalPaginas}
                                    style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ced4da', backgroundColor: paginaActual === totalPaginas ? '#f8f9fa' : 'white', color: paginaActual === totalPaginas ? '#adb5bd' : '#495057', cursor: paginaActual === totalPaginas ? 'default' : 'pointer', fontWeight: '600' }}>
                                    Siguiente ›
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
