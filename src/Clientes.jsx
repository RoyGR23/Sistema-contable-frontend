import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

export default function Clientes() {
    const [clientes, setClientes] = useState([]);

    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [nuevoCliente, setNuevoCliente] = useState({ nombre_cliente: '', rnc_cedula: '', telefono: '', email: '', direccion: '' });
    const [tipoDocumento, setTipoDocumento] = useState('cedula'); // 'cedula' o 'rnc'
    const [clienteEditando, setClienteEditando] = useState(null);
    const [totalCompras, setTotalCompras] = useState(null);
    const [cargandoCompras, setCargandoCompras] = useState(false);
    const [transaccionesCliente, setTransaccionesCliente] = useState([]);
    const [cargandoTransaccionesCliente, setCargandoTransaccionesCliente] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    // Filtros de fecha para las transacciones
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState(""); // 'exito' o 'error'
    const [busquedaCliente, setBusquedaCliente] = useState("");

    // Función auxiliar para mostrar un mensaje por 3 segundos
    const mostrarMensajeTemporal = (texto, error = false) => {
        setMensaje(texto);
        setTipoMensaje(error ? 'error' : 'exito');
        setTimeout(() => {
            setMensaje("");
            setTipoMensaje("");
        }, 3000);
    };

    const cargarClientes = async () => {
        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/v1/clientes`);
            const resultado = await respuesta.json();
            if (respuesta.ok) {
                setClientes(resultado.datos);
            }
        } catch (error) {
            console.error("Error al cargar clientes:", error);
        }
    };

    const cargarComprasCliente = async (rnc_cedula) => {
        setCargandoCompras(true);
        setTotalCompras(null);
        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/v1/clientes/${rnc_cedula}/compras`);
            const resultado = await respuesta.json();
            if (respuesta.ok && resultado.ha_comprado) {
                setTotalCompras(resultado.total_compras);
            } else {
                setTotalCompras(0);
            }
        } catch (error) {
            console.error("Error al cargar compras del cliente:", error);
            setTotalCompras(0);
        } finally {
            setCargandoCompras(false);
        }
    };

    const cargarTransaccionesCliente = async (rnc_cedula, fInicio = fechaInicio, fFin = fechaFin) => {
        setCargandoTransaccionesCliente(true);
        setPaginaActual(1); // Resetear a la primera página al recargar
        try {
            // Construir URL con parámetros opcionales
            const url = new URL(`${API_BASE_URL}/api/v1/clientes/${rnc_cedula}/transacciones`);
            if (fInicio) url.searchParams.append('fecha_inicio', fInicio);
            if (fFin) url.searchParams.append('fecha_fin', fFin);

            const respuesta = await fetch(url);
            const resultado = await respuesta.json();
            if (respuesta.ok) {
                setTransaccionesCliente(resultado.datos);
            }
        } catch (error) {
            console.error("Error al cargar transacciones del cliente:", error);
        } finally {
            setCargandoTransaccionesCliente(false);
        }
    };

    useEffect(() => {
        cargarClientes();
    }, []);

    const manejarCambio = (e) => {
        let { name, value } = e.target;

        // Limpiar el campo rnc_cedula si acabamos de cambiar el tipo de documento para evitar errores
        if (name === 'tipoDocumento') {
            setTipoDocumento(value);
            setNuevoCliente({ ...nuevoCliente, rnc_cedula: '' });
            return;
        }

        // Formato para Cédula o RNC (11 dígitos): XXX-XXXXXXX-X solo si está seleccionada Cédula
        if (name === 'rnc_cedula' && tipoDocumento === 'cedula') {
            // Eliminar todo lo que no sea número
            const soloNumeros = value.replace(/\D/g, '');

            // Limitar a máximo 11 dígitos
            let formateado = soloNumeros.substring(0, 11);

            // Aplicar guiones
            if (formateado.length > 3 && formateado.length <= 10) {
                formateado = `${formateado.slice(0, 3)}-${formateado.slice(3)}`;
            } else if (formateado.length > 10) {
                formateado = `${formateado.slice(0, 3)}-${formateado.slice(3, 10)}-${formateado.slice(10)}`;
            }

            // Asignar el valor formateado
            value = formateado;
        }

        setNuevoCliente({ ...nuevoCliente, [name]: value });
    };

    const guardarCliente = async (e) => {
        e.preventDefault();

        // Validación del documento
        if (tipoDocumento === 'cedula') {
            // Validar que RNC/Cédula tenga exactamente 13 caracteres de longitud contando los dos guiones (11 números)
            if (nuevoCliente.rnc_cedula.length !== 13) {
                mostrarMensajeTemporal("Una cédula debe tener exactamente 11 números.", true);
                return;
            }
        } else {
            // RNC libre
            if (nuevoCliente.rnc_cedula.trim() === '') {
                mostrarMensajeTemporal("El RNC no puede estar vacío.", true);
                return;
            }
        }

        if (!nuevoCliente.nombre_cliente || !nuevoCliente.rnc_cedula) {
            mostrarMensajeTemporal("Razón social/Nombre y Cédula/RNC son obligatorios.", true);
            return;
        }

        setCargando(true);
        setMensaje("");

        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/v1/clientes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nuevoCliente)
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                mostrarMensajeTemporal("¡Cliente registrado exitosamente!");
                setMostrarFormulario(false);
                setNuevoCliente({ nombre_cliente: '', rnc_cedula: '', telefono: '', email: '', direccion: '' });
                cargarClientes(); // Recargar la lista
            } else {
                mostrarMensajeTemporal(`Error: ${resultado.detail}`, true);
            }
        } catch (error) {
            mostrarMensajeTemporal("Error de conexión con el servidor.", true);
        } finally {
            setCargando(false);
        }
    };

    const manejarCambioEdicion = (e) => {
        setClienteEditando({ ...clienteEditando, [e.target.name]: e.target.value });
    };

    const guardarEdicion = async (e) => {
        e.preventDefault();

        if (!clienteEditando.nombre_cliente) {
            mostrarMensajeTemporal("El nombre del cliente es obligatorio.", true);
            return;
        }

        setCargando(true);
        setMensaje("");

        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/v1/clientes/${clienteEditando.rnc_cedula}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(clienteEditando)
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                mostrarMensajeTemporal("¡Cliente actualizado exitosamente!");
                setClienteEditando(null);
                cargarClientes(); // Recargar la lista
            } else {
                mostrarMensajeTemporal(`Error: ${resultado.detail}`, true);
            }
        } catch (error) {
            mostrarMensajeTemporal("Error de conexión con el servidor.", true);
        } finally {
            setCargando(false);
        }
    };

    const eliminarCliente = async (rnc_cedula) => {
        if (!window.confirm("¿Seguro que deseas eliminar este cliente?")) return;

        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/v1/clientes/${rnc_cedula}`, {
                method: "DELETE"
            });

            if (respuesta.ok) {
                cargarClientes(); // Recargar tras borrar
            } else {
                const res = await respuesta.json();
                alert(`Error al eliminar: ${res.detail}`);
            }
        } catch (error) {
            alert("Error de conexión al eliminar.");
        }
    };

    const clientesFiltrados = clientes.filter(c => {
        const termino = busquedaCliente.toLowerCase();
        return c.nombre_cliente.toLowerCase().includes(termino) ||
            c.rnc_cedula.includes(termino) ||
            (c.telefono && c.telefono.includes(termino));
    });

    // --- Paginación para las transacciones ---
    const transaccionesPorPagina = 10;
    const indiceUltimaTransaccion = paginaActual * transaccionesPorPagina;
    const indicePrimeraTransaccion = indiceUltimaTransaccion - transaccionesPorPagina;
    const transaccionesActuales = transaccionesCliente.slice(indicePrimeraTransaccion, indiceUltimaTransaccion);
    const totalPaginas = Math.ceil(transaccionesCliente.length / transaccionesPorPagina);

    return (
        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
            {clienteEditando ? (
                <div style={{ width: '100%', maxWidth: '1100px', backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '24px' }}>Detalles del Cliente</h2>
                        <button onClick={() => { setClienteEditando(null); setMensaje(""); }} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Volver a la Lista
                        </button>
                    </div>

                    {mensaje && (
                        <div style={{ padding: '15px', marginBottom: '20px', backgroundColor: tipoMensaje === 'error' ? '#f8d7da' : '#d4edda', color: tipoMensaje === 'error' ? '#721c24' : '#155724', borderRadius: '5px' }}>
                            <strong>{mensaje}</strong>
                        </div>
                    )}

                    <form onSubmit={guardarEdicion} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d' }}>Razón Social / Nombre</label>
                            <input type="text" name="nombre_cliente" value={clienteEditando.nombre_cliente} onChange={manejarCambioEdicion} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} required />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d' }}>Cédula / RNC</label>
                            <input type="text" value={clienteEditando.rnc_cedula} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', backgroundColor: '#e9ecef', color: '#6c757d' }} disabled title="El RNC/Cédula no se puede modificar" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d' }}>Teléfono</label>
                            <input type="text" name="telefono" value={clienteEditando.telefono || ''} onChange={manejarCambioEdicion} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d' }}>Email</label>
                            <input type="email" name="email" value={clienteEditando.email || ''} onChange={manejarCambioEdicion} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                            <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d' }}>Dirección</label>
                            <input type="text" name="direccion" value={clienteEditando.direccion || ''} onChange={manejarCambioEdicion} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button type="submit" disabled={cargando} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: cargando ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                {cargando ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </form>

                    {/* Historial de Compras del Cliente */}
                    <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>Historial de Compras</h4>
                        {cargandoCompras ? (
                            <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '14px' }}>Calculando total de compras...</span>
                        ) : totalCompras > 0 ? (
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '14px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>Total acumulado en facturas:</span>
                                <strong style={{ fontSize: '26px', color: '#28a745' }}>RD$ {totalCompras.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                            </div>
                        ) : (
                            <span style={{ color: '#6c757d', fontSize: '14px' }}>Este cliente aún no tiene facturas/compras registradas.</span>
                        )}
                    </div>

                    {/* Tabla de Facturas del Cliente */}
                    {totalCompras > 0 && (
                        <div style={{ marginTop: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e9ecef', paddingBottom: '10px', marginBottom: '15px' }}>
                                <h4 style={{ margin: 0, color: '#495057', fontSize: '16px' }}>Transacciones</h4>

                                {/* Filtros de Fecha */}
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Desde:</label>
                                        <input
                                            type="date"
                                            value={fechaInicio}
                                            onChange={(e) => {
                                                setFechaInicio(e.target.value);
                                                cargarTransaccionesCliente(clienteEditando.rnc_cedula, e.target.value, fechaFin);
                                            }}
                                            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Hasta:</label>
                                        <input
                                            type="date"
                                            value={fechaFin}
                                            onChange={(e) => {
                                                setFechaFin(e.target.value);
                                                cargarTransaccionesCliente(clienteEditando.rnc_cedula, fechaInicio, e.target.value);
                                            }}
                                            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            setFechaInicio("");
                                            setFechaFin("");
                                            cargarTransaccionesCliente(clienteEditando.rnc_cedula, "", "");
                                        }}
                                        style={{ padding: '5px 10px', marginTop: '16px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                                        title="Limpiar filtros de fecha"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e9ecef', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#e9ecef', borderBottom: '2px solid #dee2e6' }}>
                                            <th style={{ padding: '10px 15px', color: '#495057' }}>Fecha</th>
                                            <th style={{ padding: '10px 15px', color: '#495057' }}>NCF</th>
                                            <th style={{ padding: '10px 15px', color: '#495057' }}>ITBIS</th>
                                            <th style={{ padding: '10px 15px', color: '#495057' }}>Monto Total</th>
                                            <th style={{ padding: '10px 15px', color: '#495057' }}>Método de Pago</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cargandoTransaccionesCliente ? (
                                            <tr>
                                                <td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#7f8c8d' }}>Cargando facturas...</td>
                                            </tr>
                                        ) : transaccionesActuales.length > 0 ? transaccionesActuales.map((t) => (
                                            <tr key={t.id} style={{ borderBottom: '1px solid #e9ecef', color: '#34495e' }}>
                                                <td style={{ padding: '10px 15px' }}>{new Date(t.fecha).toLocaleDateString('es-DO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td style={{ padding: '10px 15px' }}>{t.ncf}</td>
                                                <td style={{ padding: '10px 15px' }}>RD$ {t.total_itbis.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td style={{ padding: '10px 15px', color: '#28a745', fontWeight: 'bold' }}>RD$ {t.total_pagar.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td style={{ padding: '10px 15px' }}>{t.metodo_pago}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#7f8c8d' }}>No hay transacciones en este rango de fechas.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Controles de Paginación */}
                            {totalPaginas > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '15px', gap: '15px' }}>
                                    <button
                                        onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                                        disabled={paginaActual === 1}
                                        style={{ padding: '8px 15px', backgroundColor: paginaActual === 1 ? '#e9ecef' : '#007bff', color: paginaActual === 1 ? '#6c757d' : 'white', border: 'none', borderRadius: '5px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                    >
                                        Anterior
                                    </button>
                                    <span style={{ fontSize: '14px', color: '#495057' }}>
                                        Página <strong>{paginaActual}</strong> de <strong>{totalPaginas}</strong>
                                    </span>
                                    <button
                                        onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                                        disabled={paginaActual === totalPaginas}
                                        style={{ padding: '8px 15px', backgroundColor: paginaActual === totalPaginas ? '#e9ecef' : '#007bff', color: paginaActual === totalPaginas ? '#6c757d' : 'white', border: 'none', borderRadius: '5px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1100px', marginBottom: '5px' }}>
                        <h1 style={{ color: '#2c3e50', margin: 0, fontSize: '22px' }}>Gestión de Clientes</h1>
                        <button
                            onClick={() => {
                                setMostrarFormulario(true);
                                setMensaje(""); // Limpiar mensajes si se oculta o muestra
                            }}
                            style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            + Nuevo Cliente
                        </button>
                    </div>

                    <div style={{ width: '100%', maxWidth: '1100px', marginBottom: '15px' }}>
                        <input
                            type="text"
                            placeholder="Buscar cliente por nombre, cédula/RNC o teléfono..."
                            value={busquedaCliente}
                            onChange={(e) => setBusquedaCliente(e.target.value)}
                            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                        />
                    </div>

                    {mensaje && (
                        <div style={{ padding: '15px', backgroundColor: tipoMensaje === 'error' ? '#f8d7da' : '#d4edda', color: tipoMensaje === 'error' ? '#721c24' : '#155724', borderRadius: '5px' }}>
                            <strong>{mensaje}</strong>
                        </div>
                    )}

                    {mostrarFormulario && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
                        }}>
                            <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: '400px', maxWidth: '90%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ margin: 0, color: '#34495e', fontSize: '20px' }}>Agregar Cliente</h3>
                                    <button type="button" onClick={() => { setMostrarFormulario(false); setMensaje(""); }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7f8c8d' }}>✕</button>
                                </div>
                                <form onSubmit={guardarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d', fontSize: '13px' }}>Razón Social / Nombre</label>
                                        <input type="text" name="nombre_cliente" value={nuevoCliente.nombre_cliente} onChange={manejarCambio} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px' }} required placeholder="Ej: Juan Pérez o Mi Empresa S.R.L" />
                                    </div>

                                    {/* Selector de tipo de documento */}
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', width: '100px' }}>
                                            <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d', fontSize: '13px' }}>Tipo</label>
                                            <select name="tipoDocumento" value={tipoDocumento} onChange={manejarCambio} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: 'white' }}>
                                                <option value="cedula">Cédula</option>
                                                <option value="rnc">RNC</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d', fontSize: '13px' }}>{tipoDocumento === 'cedula' ? 'Cédula de Identidad' : 'RNC'}</label>
                                            <input
                                                type="text"
                                                name="rnc_cedula"
                                                value={nuevoCliente.rnc_cedula}
                                                onChange={manejarCambio}
                                                style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px' }}
                                                required
                                                placeholder={tipoDocumento === 'cedula'}
                                                maxLength={tipoDocumento === 'cedula' ? "13" : "30"}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d', fontSize: '13px' }}>Teléfono</label>
                                            <input type="text" name="telefono" value={nuevoCliente.telefono} onChange={manejarCambio} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d', fontSize: '13px' }}>Email</label>
                                            <input type="email" name="email" value={nuevoCliente.email} onChange={manejarCambio} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ marginBottom: '5px', fontWeight: 'bold', color: '#7f8c8d', fontSize: '13px' }}>Dirección</label>
                                        <input type="text" name="direccion" value={nuevoCliente.direccion} onChange={manejarCambio} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '10px' }}>
                                        <button type="button" onClick={() => { setMostrarFormulario(false); setMensaje(""); }} style={{ padding: '10px 15px', backgroundColor: '#f8f9fa', color: '#495057', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                            Cancelar
                                        </button>
                                        <button type="submit" disabled={cargando} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: cargando ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                            {cargando ? "Guardando..." : "Guardar Cliente"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                                    <th style={{ padding: '12px 15px', color: '#495057' }}>Nombre</th>
                                    <th style={{ padding: '12px 15px', color: '#495057' }}>RNC / Cédula</th>
                                    <th style={{ padding: '12px 15px', color: '#495057' }}>Teléfono</th>
                                    <th style={{ padding: '12px 15px', color: '#495057' }}>Email</th>
                                    <th style={{ padding: '12px 15px', color: '#495057' }}>Dirección</th>
                                    <th style={{ padding: '12px 15px', color: '#495057', textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesFiltrados.map((cliente) => (
                                    <tr key={cliente.rnc_cedula} style={{ borderBottom: '1px solid #e9ecef', color: '#34495e' }}>
                                        <td
                                            className="cliente-nombre-celda"
                                            onClick={() => {
                                                setClienteEditando(cliente);
                                                setMensaje("");
                                                cargarComprasCliente(cliente.rnc_cedula);
                                                cargarTransaccionesCliente(cliente.rnc_cedula);
                                            }}
                                            title="Ver/Editar Detalles del Cliente"
                                        >
                                            {cliente.nombre_cliente}
                                        </td>
                                        <td style={{ padding: '12px 15px' }}>{cliente.rnc_cedula}</td>
                                        <td style={{ padding: '12px 15px' }}>{cliente.telefono || '-'}</td>
                                        <td style={{ padding: '12px 15px' }}>{cliente.email || '-'}</td>
                                        <td style={{ padding: '12px 15px' }}>{cliente.direccion || '-'}</td>
                                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                            <button onClick={() => eliminarCliente(cliente.rnc_cedula)} style={{ padding: '5px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="Eliminar Cliente">
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {clientesFiltrados.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                                            {clientes.length === 0 ? "No hay clientes registrados." : "No se encontraron clientes que coincidan con la búsqueda."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
