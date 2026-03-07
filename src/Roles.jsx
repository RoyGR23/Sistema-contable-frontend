import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

export default function Roles() {
    const [roles, setRoles] = useState([]);
    const [modulos, setModulos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState(""); // 'exito' o 'error'

    // --- ESTADOS DEL MODAL ---
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [rolEditando, setRolEditando] = useState(null);

    const [formulario, setFormulario] = useState({
        nombre: '',
        descripcion: ''
    });

    // permissions: { "modulo_id": { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false } }
    const [permisos, setPermisos] = useState({});

    const mostrarMensajeTemporal = (texto, error = false) => {
        setMensaje(texto);
        setTipoMensaje(error ? 'error' : 'exito');
        setTimeout(() => setMensaje(""), 4000);
    };

    const cargarDatosCentrales = async () => {
        setCargando(true);
        try {
            const [resRoles, resModulos] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/roles`),
                fetch(`${API_BASE_URL}/api/v1/modulos`)
            ]);

            if (resRoles.ok) {
                const data = await resRoles.json();
                setRoles(data.datos);
            }
            if (resModulos.ok) {
                const data = await resModulos.json();
                setModulos(data.datos);
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

    // Inicializa la matriz de permisos por defecto (todo falso)
    const inicializarPermisosBase = () => {
        const initialState = {};
        modulos.forEach(m => {
            initialState[m.id] = { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false };
        });
        setPermisos(initialState);
    };

    const handleChangeForm = (e) => {
        setFormulario({ ...formulario, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (moduloId, permiso) => {
        setPermisos(prev => ({
            ...prev,
            [moduloId]: {
                ...prev[moduloId],
                [permiso]: !prev[moduloId][permiso]
            }
        }));
    };

    const resetFormulario = () => {
        setFormulario({ nombre: '', descripcion: '' });
        setRolEditando(null);
        inicializarPermisosBase();
        setMostrarModal(false);
    };

    const iniciarCreacion = () => {
        inicializarPermisosBase();
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

        // Preparamos base falsa
        const currentPerms = {};
        modulos.forEach(m => {
            currentPerms[m.id] = { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false };
        });
        setPermisos(currentPerms);
        setMostrarModal(true);

        try {
            // Cargar los permisos actuales de este rol
            const res = await fetch(`${API_BASE_URL}/api/v1/roles/${rol.id}/permisos`);
            if (res.ok) {
                const data = await res.json();
                const permisosDB = data.datos;

                // Mezclamos lo que venga de BD
                const newPerms = { ...currentPerms };
                permisosDB.forEach(p => {
                    if (newPerms[p.modulo_id]) {
                        newPerms[p.modulo_id] = {
                            puede_ver: p.puede_ver,
                            puede_crear: p.puede_crear,
                            puede_editar: p.puede_editar,
                            puede_eliminar: p.puede_eliminar
                        };
                    }
                });
                setPermisos(newPerms);
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

            // 2. Preparar el arreglo de permisos
            const permisosPayload = [];
            Object.keys(permisos).forEach(modulo_id => {
                const p = permisos[modulo_id];
                permisosPayload.push({
                    modulo_id: modulo_id,
                    puede_ver: p.puede_ver,
                    puede_crear: p.puede_crear,
                    puede_editar: p.puede_editar,
                    puede_eliminar: p.puede_eliminar
                });
            });

            // 3. Guardar Permisos
            const resPerm = await fetch(`${API_BASE_URL}/api/v1/roles/${rolId}/permisos`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(permisosPayload)
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
                        backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '700px',
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
                                <h3 style={{ color: '#2c3e50', marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>Matriz de Permisos</h3>
                                {modulos.length === 0 ? (
                                    <p style={{ color: '#7f8c8d', fontSize: '14px' }}>No hay módulos configurados en la base de datos.</p>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                                                <th style={{ padding: '10px', textAlign: 'left', color: '#495057' }}>Módulo</th>
                                                <th style={{ padding: '10px', textAlign: 'center', color: '#495057' }}>Ver</th>
                                                <th style={{ padding: '10px', textAlign: 'center', color: '#495057' }}>Crear</th>
                                                <th style={{ padding: '10px', textAlign: 'center', color: '#495057' }}>Editar</th>
                                                <th style={{ padding: '10px', textAlign: 'center', color: '#495057' }}>Eliminar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {modulos.map(m => (
                                                <tr key={m.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#34495e' }}>{m.nombre}</td>
                                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                                        <input type="checkbox" checked={permisos[m.id]?.puede_ver || false} onChange={() => handleCheckboxChange(m.id, 'puede_ver')} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
                                                    </td>
                                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                                        <input type="checkbox" checked={permisos[m.id]?.puede_crear || false} onChange={() => handleCheckboxChange(m.id, 'puede_crear')} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
                                                    </td>
                                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                                        <input type="checkbox" checked={permisos[m.id]?.puede_editar || false} onChange={() => handleCheckboxChange(m.id, 'puede_editar')} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
                                                    </td>
                                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                                        <input type="checkbox" checked={permisos[m.id]?.puede_eliminar || false} onChange={() => handleCheckboxChange(m.id, 'puede_eliminar')} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
