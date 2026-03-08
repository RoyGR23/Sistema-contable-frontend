import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';
import ModalAutorizacion from './ModalAutorizacion';

export default function Inventario({ usuario }) {
    const [inventario, setInventario] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState(""); // 'exito' o 'error'
    const [busqueda, setBusqueda] = useState("");
    const [ordenColumna, setOrdenColumna] = useState(null);
    const [ordenDireccion, setOrdenDireccion] = useState('asc'); // 'asc' o 'desc'

    // --- ESTADOS DEL MODAL ---
    const [mostrarModal, setMostrarModal] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [editandoItem, setEditandoItem] = useState(null);
    const [formulario, setFormulario] = useState({
        prenda: '', color: '', talla: '', precio: '', stock: ''
    });

    const [prendasConfig, setPrendasConfig] = useState([]);
    const [coloresConfig, setColoresConfig] = useState([]);
    const [tallasConfig, setTallasConfig] = useState([]);

    const [modalAuth, setModalAuth] = useState(null);
    const permisos_acciones = usuario?.permisos_acciones || [];
    const puedeAgregar = permisos_acciones.includes('inventario_agregar');
    const puedeEditar = permisos_acciones.includes('inventario_editar');
    const puedeEliminar = permisos_acciones.includes('inventario_eliminar');

    const mostrarMensajeTemporal = (texto, error = false) => {
        setMensaje(texto);
        setTipoMensaje(error ? 'error' : 'exito');
        setTimeout(() => setMensaje(""), 3000);
    };

    const cargarInventario = async () => {
        setCargando(true);
        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/v1/inventario`);
            const resultado = await respuesta.json();
            if (respuesta.ok) {
                setInventario(resultado.datos);
            } else {
                mostrarMensajeTemporal("Error al cargar inventario: " + resultado.detail, true);
            }
        } catch (error) {
            mostrarMensajeTemporal("Error de conexión con el servidor.", true);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarInventario();

        const cargarCategorias = async () => {
            try {
                const [resP, resC, resT] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/v1/categorias/prendas`),
                    fetch(`${API_BASE_URL}/api/v1/categorias/colores`),
                    fetch(`${API_BASE_URL}/api/v1/categorias/tallas`)
                ]);
                if (resP.ok) setPrendasConfig((await resP.json()).datos);
                if (resC.ok) setColoresConfig((await resC.json()).datos);
                if (resT.ok) setTallasConfig((await resT.json()).datos);
            } catch (error) {
                console.error("Error cargando categorías para el formulario:", error);
            }
        };

        cargarCategorias();
    }, []);

    const handleChangeForm = (e) => {
        const { name, value } = e.target;
        setFormulario({ ...formulario, [name]: value });
    };

    const calcularSKU = () => {
        if (!formulario.prenda || !formulario.color || !formulario.talla) return "SKU Auto-generador";
        const pre = formulario.prenda.substring(0, 3).toUpperCase();
        const col = formulario.color.substring(0, 3).toUpperCase();
        return `${pre}-${col}-${formulario.talla}`;
    };

    const iniciarEdicion = (item) => {
        setEditandoItem(item);
        setFormulario({
            prenda: item.nombre,
            color: item.color,
            talla: item.talla,
            precio: item.precio ? item.precio.toString() : '',
            stock: item.cantidad_disponible ? item.cantidad_disponible.toString() : ''
        });
        setMostrarModal(true);
    };

    const resetFormulario = () => {
        setFormulario({ prenda: '', color: '', talla: '', precio: '', stock: '' });
        setEditandoItem(null);
        setMostrarModal(false);
    };

    const guardarProducto = async (e) => {
        e.preventDefault();
        if (!formulario.prenda || !formulario.color || !formulario.talla || !formulario.precio || !formulario.stock) {
            mostrarMensajeTemporal("Por favor complete todos los campos.", true);
            return;
        }

        setGuardando(true);
        const skuGenerado = calcularSKU();

        if (!editandoItem) {
            // Verificar si el SKU ya existe en el inventario actual
            const skuExiste = inventario.some(item => item.sku === skuGenerado);
            if (skuExiste) {
                mostrarMensajeTemporal("Producto en stock. Utilice el botón editar para este ítem.", true);
                setGuardando(false);
                return;
            }
        }

        try {
            if (editandoItem) {
                // Modo Edición
                const resUpdate = await fetch(`${API_BASE_URL}/api/v1/inventario/${editandoItem.inventario_id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        producto_id: editandoItem.producto_id,
                        variante_id: editandoItem.variante_id,
                        prenda: formulario.prenda,
                        color: formulario.color,
                        talla: formulario.talla,
                        precio: parseFloat(formulario.precio),
                        stock: parseInt(formulario.stock),
                        sku: skuGenerado
                    })
                });
                const dataUpdate = await resUpdate.json();
                if (!resUpdate.ok) throw new Error("Error actualizando: " + dataUpdate.detail);
                mostrarMensajeTemporal("¡Producto actualizado exitosamente!");
            } else {
                // Modo Creación
                // 1. Crear Producto Base
                const resProd = await fetch(`${API_BASE_URL}/api/v1/productos`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nombre: formulario.prenda,
                        descripcion: `Producto de la categoría ${formulario.prenda}`,
                        precio_base: parseFloat(formulario.precio),
                        graba_itbis: true
                    })
                });
                const dataProd = await resProd.json();
                if (!resProd.ok) throw new Error("Error creando producto base: " + dataProd.detail);
                const productoId = dataProd.datos.id;

                // 2. Crear Variante
                const resVar = await fetch(`${API_BASE_URL}/api/v1/variantes`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        producto_id: productoId,
                        talla: formulario.talla,
                        color: formulario.color,
                        sku: skuGenerado,
                        precio_modificado: parseFloat(formulario.precio)
                    })
                });
                const dataVar = await resVar.json();
                if (!resVar.ok) throw new Error("Error creando variante: " + dataVar.detail);
                const varianteId = dataVar.datos.id;

                // 3. Insertar Stock en Inventario
                const resInv = await fetch(`${API_BASE_URL}/api/v1/inventario/stock`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        variante_id: varianteId,
                        ubicacion: "Tienda Principal - La Vega",
                        cantidad_disponible: parseInt(formulario.stock)
                    })
                });
                const dataInv = await resInv.json();
                if (!resInv.ok) throw new Error("Error al asignar stock inicial: " + dataInv.detail);

                mostrarMensajeTemporal("¡Producto agregado exitosamente al inventario!");
            }

            resetFormulario();
            cargarInventario(); // Recargar tabla

        } catch (error) {
            mostrarMensajeTemporal(error.message, true);
        } finally {
            setGuardando(false);
        }
    };

    const eliminarProducto = async (item) => {
        if (!window.confirm(`¿Estás seguro de eliminar permanentemente ${item.nombre} - ${item.talla} ${item.color}?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/inventario/${item.inventario_id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Error eliminando producto");
            mostrarMensajeTemporal("Producto eliminado exitosamente.");
            cargarInventario();
        } catch (error) {
            mostrarMensajeTemporal(error.message, true);
        }
    };

    const manejarOrden = (columna) => {
        if (ordenColumna === columna) {
            setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
        } else {
            setOrdenColumna(columna);
            setOrdenDireccion('asc');
        }
    };

    const inventarioFiltrado = inventario.filter(item => {
        const termino = busqueda.toLowerCase();
        return (item.nombre && item.nombre.toLowerCase().includes(termino)) ||
            (item.sku && item.sku.toLowerCase().includes(termino)) ||
            (item.codigo_barras && item.codigo_barras.toLowerCase().includes(termino));
    }).sort((a, b) => {
        if (!ordenColumna) return 0;

        let valorA = a[ordenColumna];
        let valorB = b[ordenColumna];

        if (ordenColumna === 'talla_color') {
            valorA = `${a.talla} - ${a.color}`;
            valorB = `${b.talla} - ${b.color}`;
        }

        if (typeof valorA === 'string') valorA = valorA.toLowerCase();
        if (typeof valorB === 'string') valorB = valorB.toLowerCase();

        if (valorA == null) valorA = "";
        if (valorB == null) valorB = "";

        if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', minHeight: 'calc(100vh - 60px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1200px' }}>
                <h1 style={{ color: '#2c3e50', margin: 0, fontSize: '24px' }}>Gestión de Inventario</h1>
                <button
                    onClick={() => {
                        if (puedeAgregar) {
                            setMostrarModal(true);
                            setEditandoItem(null);
                            setFormulario({ prenda: '', color: '', talla: '', precio: '', stock: '' });
                        } else {
                            setModalAuth({
                                permiso_requerido: 'inventario_agregar',
                                descripcionAccion: 'Agregar nuevo producto al inventario',
                                onAutorizado: () => {
                                    setModalAuth(null);
                                    setMostrarModal(true);
                                    setEditandoItem(null);
                                    setFormulario({ prenda: '', color: '', talla: '', precio: '', stock: '' });
                                }
                            });
                        }
                    }}
                    style={{ padding: '10px 20px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                    + Nuevo Producto
                </button>
            </div>

            {/* MODAL DE NUEVO PRODUCTO */}
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
                            <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '20px' }}>{editandoItem ? "Editar Producto" : "Agregar Nuevo Producto"}</h2>
                            <button onClick={resetFormulario} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7f8c8d' }}>
                                ✖
                            </button>
                        </div>

                        <form onSubmit={guardarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Tipo de Prenda</label>
                                    <select name="prenda" value={formulario.prenda} onChange={handleChangeForm} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} required>
                                        <option value="">Seleccione...</option>
                                        {prendasConfig.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Color</label>
                                    <select name="color" value={formulario.color} onChange={handleChangeForm} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} required>
                                        <option value="">Seleccione...</option>
                                        {coloresConfig.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Talla</label>
                                    <select name="talla" value={formulario.talla} onChange={handleChangeForm} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} required>
                                        <option value="">Seleccione...</option>
                                        {tallasConfig.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Precio a Vender</label>
                                    <input type="number" name="precio" placeholder="0.00" step="0.01" min="0" value={formulario.precio} onChange={handleChangeForm} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} required />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Generador SKU</label>
                                    <input type="text" value={calcularSKU()} disabled style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px', backgroundColor: '#ecf0f1', color: '#7f8c8d' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Stock Inicial</label>
                                    <input type="number" name="stock" placeholder="Cantidad" min="0" value={formulario.stock} onChange={handleChangeForm} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px' }} required />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Sucursal</label>
                                <input type="text" value="Tienda Principal - La Vega" disabled style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', fontSize: '14px', backgroundColor: '#ecf0f1', color: '#7f8c8d' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={resetFormulario} style={{ flex: 1, padding: '12px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={guardando} style={{ flex: 1, padding: '12px', backgroundColor: guardando ? '#7f8c8d' : '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: guardando ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                    {guardando ? "Registrando..." : (editandoItem ? "Actualizar Producto" : "Guardar Producto")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ minHeight: '60px', width: '100%', maxWidth: '1200px', marginBottom: '5px' }}>
                {mensaje && (
                    <div style={{ width: '100%', padding: '15px', backgroundColor: tipoMensaje === 'error' ? '#f8d7da' : '#d4edda', color: tipoMensaje === 'error' ? '#721c24' : '#155724', borderRadius: '5px', boxSizing: 'border-box' }}>
                        <strong>{mensaje}</strong>
                    </div>
                )}
            </div>

            <div style={{ width: '100%', maxWidth: '1200px', marginBottom: '5px' }}>
                <input
                    type="text"
                    placeholder="Buscar producto por nombre, SKU o código de barras..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
                />
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden', maxWidth: '1200px', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                            <th style={{ padding: '15px', color: '#495057', cursor: 'pointer' }} onClick={() => manejarOrden('sku')}>
                                SKU {ordenColumna === 'sku' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '15px', color: '#495057', cursor: 'pointer' }} onClick={() => manejarOrden('nombre')}>
                                Producto {ordenColumna === 'nombre' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '15px', color: '#495057', cursor: 'pointer' }} onClick={() => manejarOrden('talla_color')}>
                                Talla / Color {ordenColumna === 'talla_color' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '15px', color: '#495057', cursor: 'pointer' }} onClick={() => manejarOrden('precio')}>
                                Precio {ordenColumna === 'precio' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '15px', color: '#495057', cursor: 'pointer' }} onClick={() => manejarOrden('cantidad_disponible')}>
                                Stock {ordenColumna === 'cantidad_disponible' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '15px', color: '#495057', cursor: 'pointer' }} onClick={() => manejarOrden('ubicacion')}>
                                Ubicación {ordenColumna === 'ubicacion' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={{ padding: '15px', color: '#495057', textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>Cargando inventario...</td>
                            </tr>
                        ) : inventarioFiltrado.length > 0 ? (
                            inventarioFiltrado.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #e9ecef', color: '#34495e', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f1f3f5' } }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.sku}</td>
                                    <td style={{ padding: '15px' }}>{item.nombre}</td>
                                    <td style={{ padding: '15px' }}>{item.talla} - {item.color}</td>
                                    <td style={{ padding: '15px', color: '#28a745', fontWeight: 'bold' }}>RD$ {item.precio?.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '15px' }}>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                            backgroundColor: item.cantidad_disponible > 5 ? '#e8f5e9' : '#ffebee',
                                            color: item.cantidad_disponible > 5 ? '#2e7d32' : '#c62828'
                                        }}>
                                            {item.cantidad_disponible} unds
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px' }}>{item.ubicacion}</td>
                                    <td style={{ padding: '15px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        <button onClick={() => {
                                            if (puedeEditar) {
                                                iniciarEdicion(item);
                                            } else {
                                                setModalAuth({
                                                    permiso_requerido: 'inventario_editar',
                                                    descripcionAccion: 'Editar detalles del producto',
                                                    onAutorizado: () => {
                                                        setModalAuth(null);
                                                        iniciarEdicion(item);
                                                    }
                                                });
                                            }
                                        }} style={{ padding: '6px 10px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }} title="Editar">
                                            ✏️
                                        </button>
                                        <button onClick={() => {
                                            if (puedeEliminar) {
                                                eliminarProducto(item);
                                            } else {
                                                setModalAuth({
                                                    permiso_requerido: 'inventario_eliminar',
                                                    descripcionAccion: 'Eliminar producto permanentemente',
                                                    onAutorizado: () => {
                                                        setModalAuth(null);
                                                        eliminarProducto(item);
                                                    }
                                                });
                                            }
                                        }} style={{ padding: '6px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="Eliminar">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                                    {inventario.length === 0 ? "No hay productos en el inventario." : "No se encontraron coincidencias."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modalAuth && (
                <ModalAutorizacion
                    permisoRequerido={modalAuth.permiso_requerido}
                    descripcionAccion={modalAuth.descripcionAccion}
                    onAutorizado={modalAuth.onAutorizado}
                    onCancelar={() => setModalAuth(null)}
                />
            )}
        </div>
    );
}
