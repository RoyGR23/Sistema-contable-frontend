import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState("");

    // --- ESTADOS DEL MODAL ---
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);

    const [formulario, setFormulario] = useState({
        nombre_completo: '',
        email: '',
        rol_id: '',
        password: '',
        activo: true
    });

    const mostrarMensajeTemporal = (texto, error = false) => {
        setMensaje(texto);
        setTipoMensaje(error ? 'error' : 'exito');
        setTimeout(() => setMensaje(""), 4000);
    };

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [resUsu, resRoles] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/usuarios`),
                fetch(`${API_BASE_URL}/api/v1/roles`)
            ]);

            if (resUsu.ok) {
                const dataU = await resUsu.json();
                setUsuarios(dataU.datos);
            }
            if (resRoles.ok) {
                const dataR = await resRoles.json();
                setRoles(dataR.datos);
            }
        } catch (error) {
            mostrarMensajeTemporal("Error de conexión al cargar datos.", true);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleChangeForm = (e) => {
        setFormulario({ ...formulario, [e.target.name]: e.target.value });
    };

    const resetFormulario = () => {
        setFormulario({ nombre_completo: '', email: '', rol_id: '', password: '', activo: true });
        setUsuarioEditando(null);
        setMostrarModal(false);
    };

    const iniciarCreacion = () => {
        resetFormulario();
        setMostrarModal(true);
    };

    const iniciarEdicion = (usuario) => {
        setFormulario({
            nombre_completo: usuario.nombre_completo,
            email: usuario.email,
            rol_id: usuario.rol_id,
            password: '', // Password vacío por defecto al editar
            activo: usuario.activo
        });
        setUsuarioEditando(usuario.id);
        setMostrarModal(true);
    };

    const guardarUsuario = async (e) => {
        e.preventDefault();

        if (!formulario.nombre_completo || !formulario.email || !formulario.rol_id) {
            mostrarMensajeTemporal("Nombre, Email y Rol son obligatorios.", true);
            return;
        }

        if (!usuarioEditando && !formulario.password) {
            mostrarMensajeTemporal("La contraseña es obligatoria para usuarios nuevos.", true);
            return;
        }

        setGuardando(true);
        try {
            let url = `${API_BASE_URL}/api/v1/usuarios`;
            let method = "POST";

            if (usuarioEditando) {
                url = `${url}/${usuarioEditando}`;
                method = "PUT";
            }

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formulario)
            });

            const data = await res.json();
            if (res.ok) {
                mostrarMensajeTemporal(`¡Usuario ${usuarioEditando ? 'actualizado' : 'creado'} con éxito!`);
                resetFormulario();
                cargarDatos();
            } else {
                mostrarMensajeTemporal(data.detail || "Error al guardar el usuario.", true);
            }
        } catch (error) {
            mostrarMensajeTemporal("Error de conexión.", true);
        } finally {
            setGuardando(false);
        }
    };

    const cambiarEstado = async (id, estadoActual) => {
        const accion = estadoActual ? 'desactivar' : 'activar';
        const nuevoEstado = !estadoActual;

        if (!window.confirm(`¿Seguro que deseas ${accion} este usuario?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/usuarios/${id}/estado?activo=${nuevoEstado}`, {
                method: "PATCH"
            });
            const data = await res.json();
            if (res.ok) {
                mostrarMensajeTemporal(data.mensaje);
                cargarDatos();
            } else {
                mostrarMensajeTemporal(data.detail || `Error al ${accion} el usuario.`, true);
            }
        } catch (error) {
            mostrarMensajeTemporal("Error de conexión.", true);
        }
    };

    return (
        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', minHeight: 'calc(100vh - 60px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1200px' }}>
                <h1 style={{ color: '#2c3e50', margin: 0, fontSize: '24px' }}>Gestión de Usuarios</h1>
                <button
                    onClick={iniciarCreacion}
                    style={{ padding: '10px 20px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    + Nuevo Usuario
                </button>
            </div>

            {/* MODAL CREAR/EDITAR USUARIO */}
            {mostrarModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '600px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '20px' }}>{usuarioEditando ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</h2>
                            <button onClick={resetFormulario} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7f8c8d' }}>
                                ✖
                            </button>
                        </div>

                        <form onSubmit={guardarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Nombre Completo</label>
                                <input type="text" name="nombre_completo" value={formulario.nombre_completo} onChange={handleChangeForm} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} required />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Correo Electrónico (Login)</label>
                                    <input type="email" name="email" value={formulario.email} onChange={handleChangeForm} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} required />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Contraseña</label>
                                    <input type="password" name="password" value={formulario.password} onChange={handleChangeForm} placeholder={usuarioEditando ? "Dejar vacío para no cambiar" : "Contraseña secreta"} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Rol Asignado</label>
                                <select name="rol_id" value={formulario.rol_id} onChange={handleChangeForm} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} required>
                                    <option value="">Selecciona un rol</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={resetFormulario} style={{ flex: 1, padding: '12px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={guardando} style={{ flex: 1, padding: '12px', backgroundColor: guardando ? '#7f8c8d' : '#e67e22', color: 'white', border: 'none', borderRadius: '5px', cursor: guardando ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                    {guardando ? "Guardando..." : (usuarioEditando ? "Actualizar Empleado" : "Registrar Empleado")}
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

            {/* TABLA DE USUARIOS */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden', maxWidth: '1200px', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                            <th style={{ padding: '15px', color: '#495057' }}>Nombre Completo</th>
                            <th style={{ padding: '15px', color: '#495057' }}>Correo Electrónico</th>
                            <th style={{ padding: '15px', color: '#495057' }}>Rol</th>
                            <th style={{ padding: '15px', color: '#495057', textAlign: 'center' }}>Estado</th>
                            <th style={{ padding: '15px', color: '#495057', textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>Cargando usuarios...</td>
                            </tr>
                        ) : usuarios.length > 0 ? (
                            usuarios.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #e9ecef', color: item.activo ? '#34495e' : '#bdc3c7', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f1f3f5' } }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.nombre_completo}</td>
                                    <td style={{ padding: '15px' }}>{item.email}</td>
                                    <td style={{ padding: '15px' }}>
                                        <span style={{ backgroundColor: '#e1bee7', color: '#6a1b9a', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                                            {item.nombre_rol}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                        <span style={{ backgroundColor: item.activo ? '#d4edda' : '#f8d7da', color: item.activo ? '#155724' : '#721c24', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                                            {item.activo ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => iniciarEdicion(item)}
                                                style={{ padding: '6px 12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => cambiarEstado(item.id, item.activo)}
                                                style={{ padding: '6px 12px', backgroundColor: item.activo ? '#e74c3c' : '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                            >
                                                {item.activo ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                                    No hay usuarios registrados en el sistema.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
