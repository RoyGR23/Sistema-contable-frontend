import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

export default function Roles() {
    const [roles, setRoles] = useState([]);
    const [permisosLista, setPermisosLista] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState("");

    // --- ESTADOS DEL MODAL ---
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [rolEditando, setRolEditando] = useState(null);

    const [formulario, setFormulario] = useState({
        nombre: '',
        descripcion: ''
    });

    // Array de IDs de permisos (permisos_id) que tiene seleccionado este rol
    const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);

    const mostrarMensajeTemporal = (texto, error = false) => {
        setMensaje(texto);
        setTipoMensaje(error ? 'error' : 'exito');
        setTimeout(() => setMensaje(""), 4000);
    };

    const cargarDatosCentrales = async () => {
        setCargando(true);
        try {
            const [resRoles, resPerms] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/roles`),
                fetch(`${API_BASE_URL}/api/v1/permisos`)
            ]);

            if (resRoles.ok) {
                const data = await resRoles.json();
                setRoles(data.datos);
            }
            if (resPerms.ok) {
                const data = await resPerms.json();
                setPermisosLista(data.datos);
            }
        } catch (error) {
            mostrarMensajeTemporal("Error de conexión al cargar datos.", true);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatosCentrales();
    }, []);

    const handleChangeForm = (e) => {
        setFormulario({ ...formulario, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (permisoId) => {
        setPermisosSeleccionados(prev => {
            if (prev.includes(permisoId)) {
                return prev.filter(id => id !== permisoId);
            } else {
                return [...prev, permisoId];
            }
        });
    };

    const resetFormulario = () => {
        setFormulario({ nombre: '', descripcion: '' });
        setRolEditando(null);
        setPermisosSeleccionados([]);
        setMostrarModal(false);
    };

    const iniciarCreacion = () => {
        setPermisosSeleccionados([]);
        setFormulario({ nombre: '', descripcion: '' });
        setRolEditando(null);
        setMostrarModal(true);
    };

    const iniciarEdicion = async (rol) => {
        setFormulario({
            nombre: rol.nombre,
            descripcion: rol.descripcion || ''
        });
        setRolEditando(rol.id);
        setPermisosSeleccionados([]);
        setMostrarModal(true);

        try {
            // Cargar los IDs de permisos de este rol
            const res = await fetch(`${API_BASE_URL}/api/v1/roles/${rol.id}/permisos`);
            if (res.ok) {
                const data = await res.json();
                setPermisosSeleccionados(data.datos || []);
            }
        } catch (error) {
            console.error("No se pudieron cargar los permisos del rol.");
        }
    };

    const guardarRolYPermisos = async (e) => {
        e.preventDefault();

        if (!formulario.nombre) {
            mostrarMensajeTemporal("El nombre del rol es obligatorio.", true);
            return;
        }

        setGuardando(true);
        try {
            // 1. Guardar el Rol
            let urlRol = `${API_BASE_URL}/api/v1/roles`;
            let methodRol = "POST";
            if (rolEditando) {
                urlRol = `${urlRol}/${rolEditando}`;
                methodRol = "PUT";
            }

            const resRol = await fetch(urlRol, {
                method: methodRol,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formulario)
            });

            const dataRol = await resRol.json();
            if (!resRol.ok) throw new Error(dataRol.detail || "Error guardando rol");

            const rolId = rolEditando ? rolEditando : dataRol.datos.id;

            // 2. Guardar Permisos (Array de IDs)
            const resPerm = await fetch(`${API_BASE_URL}/api/v1/roles/${rolId}/permisos`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ permisos_ids: permisosSeleccionados })
            });

            if (!resPerm.ok) {
                const dataP = await resPerm.json();
                throw new Error("Rol guardado, pero " + (dataP.detail || "fallaron los permisos"));
            }

            mostrarMensajeTemporal(`¡Rol ${rolEditando ? 'actualizado' : 'creado'} con éxito!`);
            resetFormulario();
            cargarDatosCentrales();

        } catch (error) {
            mostrarMensajeTemporal(error.message, true);
        } finally {
            setGuardando(false);
        }
    };

    // Agrupar permisos devueltos por la BD según su columna "modulo"
    const permisosAgrupados = permisosLista.reduce((acc, permiso) => {
        const mod = permiso.modulo || 'Otros';
        if (!acc[mod]) acc[mod] = [];
        acc[mod].push(permiso);
        return acc;
    }, {});

    const eliminarRol = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este rol? Esta acción es irreversible.")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/roles/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                mostrarMensajeTemporal("Rol eliminado exitosamente.");
                cargarDatosCentrales();
            } else {
                mostrarMensajeTemporal(data.detail || "No se pudo eliminar el rol.", true);
            }
        } catch (error) {
            mostrarMensajeTemporal("Error de conexión.", true);
        }
    };

    return (
        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', minHeight: 'calc(100vh - 60px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1200px' }}>
                <h1 style={{ color: '#2c3e50', margin: 0, fontSize: '24px' }}>Gestión de Roles y Permisos</h1>
                <button
                    onClick={iniciarCreacion}
                    style={{ padding: '10px 20px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    + Nuevo Rol
                </button>
            </div>

            {/* MODAL CREAR/EDITAR ROL */}
            {mostrarModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '800px',
                        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '20px' }}>{rolEditando ? 'Editar Rol' : 'Añadir Nuevo Rol'}</h2>
                            <button onClick={resetFormulario} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7f8c8d' }}>
                                ✖
                            </button>
                        </div>

                        <form onSubmit={guardarRolYPermisos} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Nombre del Rol</label>
                                    <input type="text" name="nombre" value={formulario.nombre} onChange={handleChangeForm} placeholder="Ej: Cajero, Gerente" style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} required />
                                </div>
                                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Descripción</label>
                                    <input type="text" name="descripcion" value={formulario.descripcion} onChange={handleChangeForm} placeholder="Opcional. Breve descripción de funciones." style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} />
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                <h3 style={{ color: '#2c3e50', marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>Listado de Acciones y Permisos</h3>
                                {Object.keys(permisosAgrupados).length === 0 ? (
                                    <p style={{ color: '#7f8c8d', fontSize: '14px' }}>No hay permisos configurados en la base de datos.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {Object.keys(permisosAgrupados).map(modulo => (
                                            <div key={modulo} style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '15px' }}>
                                                <h4 style={{ margin: '0 0 10px 0', color: '#2980b9', textTransform: 'capitalize' }}>Módulo: {modulo}</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
                                                    {permisosAgrupados[modulo].map(permiso => (
                                                        <label key={permiso.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#34495e' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={permisosSeleccionados.includes(permiso.id)}
                                                                onChange={() => handleCheckboxChange(permiso.id)}
                                                                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                                            />
                                                            {permiso.codigo.replace(/_/g, ' ')}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={resetFormulario} style={{ flex: 1, padding: '12px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={guardando} style={{ flex: 1, padding: '12px', backgroundColor: guardando ? '#7f8c8d' : (rolEditando ? '#2980b9' : '#34495e'), color: 'white', border: 'none', borderRadius: '5px', cursor: guardando ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                    {guardando ? "Guardando..." : (rolEditando ? "Actualizar Rol" : "Crear Rol")}
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

            {/* TABLA DE ROLES */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden', maxWidth: '1200px', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                            <th style={{ padding: '15px', color: '#495057' }}>Nombre del Rol</th>
                            <th style={{ padding: '15px', color: '#495057' }}>Descripción</th>
                            <th style={{ padding: '15px', color: '#495057', textAlign: 'center', width: '200px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr>
                                <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>Cargando roles...</td>
                            </tr>
                        ) : roles.length > 0 ? (
                            roles.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #e9ecef', color: '#34495e', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f1f3f5' } }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.nombre}</td>
                                    <td style={{ padding: '15px', color: '#7f8c8d' }}>{item.descripcion || '-'}</td>
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => iniciarEdicion(item)}
                                                style={{ padding: '6px 12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                            >
                                                Editar Permisos
                                            </button>
                                            <button
                                                onClick={() => eliminarRol(item.id)}
                                                style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                                    No hay roles registrados en el sistema.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
