import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

export default function Descuentos() {
    const [descuentos, setDescuentos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState(""); // 'exito' o 'error'

    // --- ESTADOS DEL MODAL ---
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [descuentoEditando, setDescuentoEditando] = useState(null);

    // El creador es estático por ahora
    const [formulario, setFormulario] = useState({
        nombre_descuento: '',
        tipo: 'P',
        valor_descuento: '',
        cliente_id: '',
        usuario_creador: 'Admin'
    });

    const mostrarMensajeTemporal = (texto, error = false) => {
        setMensaje(texto);
        setTipoMensaje(error ? 'error' : 'exito');
        setTimeout(() => setMensaje(""), 4000);
    };

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [resDesc, resCli] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/descuentos`),
                fetch(`${API_BASE_URL}/api/v1/clientes`)
            ]);

            if (resDesc.ok) {
                const dataDesc = await resDesc.json();
                setDescuentos(dataDesc.datos);
            }
            if (resCli.ok) {
                const dataCli = await resCli.json();
                setClientes(dataCli.datos);
            }
        } catch (error) {
            mostrarMensajeTemporal("Error de conexión con el servidor.", true);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleChangeForm = (e) => {
        const { name, value } = e.target;
        setFormulario({ ...formulario, [name]: value });
    };

    const resetFormulario = () => {
        setFormulario({
            nombre_descuento: '',
            tipo: 'P',
            valor_descuento: '',
            cliente_id: '',
            usuario_creador: 'Admin'
        });
        setDescuentoEditando(null);
        setMostrarModal(false);
    };

    const iniciarEdicion = (descuento) => {
        setFormulario({
            nombre_descuento: descuento.nombre_descuento,
            tipo: descuento.tipo,
            valor_descuento: descuento.valor_descuento,
            cliente_id: descuento.cliente_id || '',
            usuario_creador: descuento.usuario_creador // Se mantiene por defecto
        });
        setDescuentoEditando(descuento.id);
        setMostrarModal(true);
    };

    const guardarDescuento = async (e) => {
        e.preventDefault();

        if (!formulario.nombre_descuento || !formulario.tipo || !formulario.valor_descuento) {
            mostrarMensajeTemporal("Por favor complete los campos obligatorios.", true);
            return;
        }

        const valor = parseFloat(formulario.valor_descuento);
        if (formulario.tipo === 'P' && (valor <= 0 || valor > 100)) {
            mostrarMensajeTemporal("El porcentaje debe ser mayor a 0 y menor o igual a 100.", true);
            return;
        }

        setGuardando(true);
        try {
            const payload = { ...formulario, valor_descuento: valor };
            if (!payload.cliente_id) payload.cliente_id = null; // Limpiar si está vacío

            let respuesta;
            if (descuentoEditando) {
                respuesta = await fetch(`${API_BASE_URL}/api/v1/descuentos/${descuentoEditando}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            } else {
                respuesta = await fetch(`${API_BASE_URL}/api/v1/descuentos`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            }

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                mostrarMensajeTemporal(`¡Descuento ${descuentoEditando ? 'actualizado' : 'creado'} exitosamente!`);
                resetFormulario();
                cargarDatos(); // Actualizar la lista
            } else {
                mostrarMensajeTemporal("Error al crear: " + resultado.detail, true);
            }
        } catch (error) {
            mostrarMensajeTemporal("Error de conexión con el servidor.", true);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', minHeight: 'calc(100vh - 60px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1200px' }}>
                <h1 style={{ color: '#2c3e50', margin: 0, fontSize: '24px' }}>Gestión de Descuentos</h1>
                <button
                    onClick={() => setMostrarModal(true)}
                    style={{ padding: '10px 20px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                >
                    + Nuevo Descuento
                </button>
            </div>

            {/* MODAL NUEVO DESCUENTO */}
            {mostrarModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '20px' }}>{descuentoEditando ? 'Editar Descuento' : 'Añadir Nuevo Descuento'}</h2>
                            <button onClick={resetFormulario} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7f8c8d' }}>
                                ✖
                            </button>
                        </div>

                        <form onSubmit={guardarDescuento} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Nombre / Razón del Descuento</label>
                                <input type="text" name="nombre_descuento" value={formulario.nombre_descuento} onChange={handleChangeForm} placeholder="Ej. Black Friday, Empleado, etc." style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} required />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Tipo</label>
                                    <select name="tipo" value={formulario.tipo} onChange={handleChangeForm} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }}>
                                        <option value="P">Porcentaje (%)</option>
                                        <option value="R">Monto / Resta (RD$)</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Valor a Descontar</label>
                                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #bdc3c7', borderRadius: '5px', padding: '0 10px' }}>
                                        <span style={{ color: '#7f8c8d', fontWeight: 'bold' }}>{formulario.tipo === 'P' ? '%' : '$'}</span>
                                        <input type="number" name="valor_descuento" value={formulario.valor_descuento} onChange={handleChangeForm} placeholder="0.00" step="0.01" min="0" style={{ padding: '10px', border: 'none', outline: 'none', width: '100%', fontSize: '14px' }} required />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Asignar a Cliente (Opcional)</label>
                                <select name="cliente_id" value={formulario.cliente_id} onChange={handleChangeForm} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }}>
                                    <option value="">Aplicable a todos (Elegible manualmente en POS)</option>
                                    {clientes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre_cliente} ({c.rnc_cedula})
                                        </option>
                                    ))}
                                </select>
                                <span style={{ fontSize: '12px', color: '#7f8c8d' }}>Si seleccionas un cliente, el descuento se aplicará automáticamente al elegirlo en el Punto de Venta.</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={resetFormulario} style={{ flex: 1, padding: '12px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={guardando} style={{ flex: 1, padding: '12px', backgroundColor: guardando ? '#7f8c8d' : (descuentoEditando ? '#2980b9' : '#8e44ad'), color: 'white', border: 'none', borderRadius: '5px', cursor: guardando ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                    {guardando ? "Guardando..." : (descuentoEditando ? "Actualizar" : "Crear Descuento")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ minHeight: '60px', width: '100%', maxWidth: '1200px' }}>
                {mensaje && (
                    <div style={{ width: '100%', padding: '15px', backgroundColor: tipoMensaje === 'error' ? '#f8d7da' : '#d4edda', color: tipoMensaje === 'error' ? '#721c24' : '#155724', borderRadius: '5px', boxSizing: 'border-box' }}>
                        <strong>{mensaje}</strong>
                    </div>
                )}
            </div>

            {/* TABLA DE DESCUENTOS */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden', maxWidth: '1200px', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                            <th style={{ padding: '15px', color: '#495057' }}>Nombre</th>
                            <th style={{ padding: '15px', color: '#495057' }}>Tipo</th>
                            <th style={{ padding: '15px', color: '#495057' }}>Valor</th>
                            <th style={{ padding: '15px', color: '#495057' }}>Asignado A</th>
                            <th style={{ padding: '15px', color: '#495057' }}>Creado Por</th>
                            <th style={{ padding: '15px', color: '#495057' }}>Fecha Creación</th>
                            <th style={{ padding: '15px', color: '#495057', textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>Cargando descuentos...</td>
                            </tr>
                        ) : descuentos.length > 0 ? (
                            descuentos.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #e9ecef', color: '#34495e', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f1f3f5' } }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.nombre_descuento}</td>
                                    <td style={{ padding: '15px' }}>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                            backgroundColor: item.tipo === 'P' ? '#e3f2fd' : '#fff3e0',
                                            color: item.tipo === 'P' ? '#1565c0' : '#e65100'
                                        }}>
                                            {item.tipo === 'P' ? 'Porcentaje' : 'Monto Fijo'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px', color: '#8e44ad', fontWeight: 'bold' }}>
                                        {item.tipo === 'P' ? `${item.valor_descuento}%` : `RD$ ${item.valor_descuento.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                                    </td>
                                    <td style={{ padding: '15px' }}>{item.nombre_cliente}</td>
                                    <td style={{ padding: '15px' }}>{item.usuario_creador}</td>
                                    <td style={{ padding: '15px', color: '#7f8c8d' }}>{new Date(item.creado_en).toLocaleDateString()}</td>
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => iniciarEdicion(item)}
                                            style={{ padding: '5px 10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                                        >
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                                    Aún no has creado ningún descuento.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
