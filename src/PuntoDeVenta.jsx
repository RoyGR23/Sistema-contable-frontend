import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';
import ModalAutorizacion from './ModalAutorizacion';

export default function PuntoDeVenta({ usuario }) {
    const [catalogo, setCatalogo] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [busquedaCliente, setBusquedaCliente] = useState("");
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [descuentos, setDescuentos] = useState([]);
    const [descuentoSeleccionado, setDescuentoSeleccionado] = useState('');
    const [mensaje, setMensaje] = useState("");
    const [cargando, setCargando] = useState(false);

    const [tipoVenta, setTipoVenta] = useState('Contado');
    const [aplicarItbis, setAplicarItbis] = useState(true);

    // --- Estado del Modal de Autorización ---
    const [modalAuth, setModalAuth] = useState(null);
    // modalAuth = { permiso_requerido, descripcionAccion, onAutorizado }

    const permisos_acciones = usuario?.permisos_acciones || [];
    const puedeEditarCliente = permisos_acciones.includes('caja_seleccionar_cliente');
    const puedeAplicarDescuento = permisos_acciones.includes('caja_aplicar_descuento');
    const puedeRegistrarFactura = permisos_acciones.includes('caja_aplicar_factura');
    const puedeSeleccionarProductos = permisos_acciones.includes('caja_seleccionar_productos');
    const puedeEliminarImpuesto = permisos_acciones.includes('caja_eliminar_impuesto');
    const puedeVentaCredito = permisos_acciones.includes('caja_venta_credito');

    useEffect(() => {
        const cargarDatosInciales = async () => {
            try {
                const respCat = await fetch(`${API_BASE_URL}/api/v1/catalogo`);
                const resCat = await respCat.json();
                if (respCat.ok) setCatalogo(resCat.datos);

                const respCli = await fetch(`${API_BASE_URL}/api/v1/clientes`);
                const resCli = await respCli.json();
                if (respCli.ok) setClientes(resCli.datos);

                const respDesc = await fetch(`${API_BASE_URL}/api/v1/descuentos`);
                const resDesc = await respDesc.json();
                if (respDesc.ok) setDescuentos(resDesc.datos);

            } catch (error) {
                console.error("Error al cargar datos iniciales:", error);
            }
        };
        cargarDatosInciales();
    }, []);

    useEffect(() => {
        if (clienteSeleccionado) {
            const descuentoCliente = descuentos.find(d => d.cliente_id === clienteSeleccionado.id);
            if (descuentoCliente) {
                setDescuentoSeleccionado(descuentoCliente.id);
            } else {
                setDescuentoSeleccionado('');
            }
        } else {
            setDescuentoSeleccionado('');
        }
    }, [clienteSeleccionado, descuentos]);

    const agregarAlCarrito = (producto) => {
        if (!puedeSeleccionarProductos) {
            setModalAuth({
                permiso_requerido: 'caja_seleccionar_productos',
                descripcionAccion: 'Seleccionar productos',
                onAutorizado: () => {
                    setModalAuth(null);
                    agregarAlCarritoLogica(producto);
                }
            });
            return;
        }
        agregarAlCarritoLogica(producto);
    };

    const agregarAlCarritoLogica = (producto) => {
        setCarrito((carritoActual) => {
            const existe = carritoActual.find(item => item.variante_id === producto.variante_id);
            if (existe) {
                return carritoActual.map(item =>
                    item.variante_id === producto.variante_id
                        ? { ...item, cantidad: item.cantidad + 1 }
                        : item
                );
            }
            return [...carritoActual, {
                variante_id: producto.variante_id,
                nombre: producto.nombre_mostrar,
                precio_unitario: producto.precio,
                cantidad: 1
            }];
        });
    };

    const restarDelCarrito = (variante_id) => {
        setCarrito((carritoActual) => {
            const articulo = carritoActual.find(item => item.variante_id === variante_id);
            if (articulo.cantidad === 1) {
                return carritoActual.filter(item => item.variante_id !== variante_id);
            } else {
                return carritoActual.map(item =>
                    item.variante_id === variante_id
                        ? { ...item, cantidad: item.cantidad - 1 }
                        : item
                );
            }
        });
    };

    const totalCarrito = carrito.reduce((suma, item) => suma + (item.cantidad * item.precio_unitario), 0);

    let montoDescuento = 0;
    if (descuentoSeleccionado) {
        const descuentoInfo = descuentos.find(d => String(d.id) === String(descuentoSeleccionado));
        if (descuentoInfo) {
            if (descuentoInfo.tipo === 'P') {
                montoDescuento = totalCarrito * (descuentoInfo.valor_descuento / 100);
            } else if (descuentoInfo.tipo === 'R') {
                montoDescuento = descuentoInfo.valor_descuento;
            }
        }
    }

    if (montoDescuento > totalCarrito) montoDescuento = totalCarrito;

    const subtotalConDescuento = totalCarrito - montoDescuento;
    const itbis = aplicarItbis ? subtotalConDescuento * 0.18 : 0;
    const totalConImpuesto = subtotalConDescuento + itbis;

    // Lógica real de cobro (se llama directamente o desde el modal)
    const ejecutarCobro = async () => {
        if (tipoVenta === 'Credito' && !clienteSeleccionado) {
            setMensaje("Debe asignar un cliente para las facturas a crédito.");
            return;
        }

        setCargando(true);
        setMensaje("Generando factura...");

        const datosVenta = {
            cliente_id: clienteSeleccionado ? clienteSeleccionado.id : null,
            rnc_cliente: clienteSeleccionado ? clienteSeleccionado.rnc_cedula : null,
            nombre_cliente: clienteSeleccionado ? clienteSeleccionado.nombre_cliente : (busquedaCliente.trim() !== "" ? busquedaCliente : "Cliente Casual"),
            tipo_comprobante: "B02",
            metodo_pago: "Efectivo",
            articulos: carrito,
            descuento_id: descuentoSeleccionado || null,
            descuento: montoDescuento,
            tipo_venta: tipoVenta,
            aplicar_itbis: aplicarItbis
        };

        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/v1/facturar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datosVenta)
            });
            const resultado = await respuesta.json();
            if (respuesta.ok) {
                setMensaje(`¡Factura generada exitosamente!`);
                setCarrito([]);
                setClienteSeleccionado(null);
                setBusquedaCliente("");
                setDescuentoSeleccionado('');
                setTipoVenta('Contado');
                setAplicarItbis(true);
            } else {
                setMensaje(`Error: ${resultado.detail}`);
            }
        } catch {
            setMensaje("Error de conexión con el servidor.");
        } finally {
            setCargando(false);
        }
    };

    // Validaciones con control de acceso
    const handleCobrar = () => {
        if (carrito.length === 0) {
            setMensaje("El carrito está vacío. Agrega ropa primero.");
            return;
        }
        if (!puedeRegistrarFactura) {
            setModalAuth({
                permiso_requerido: 'caja_aplicar_factura',
                descripcionAccion: 'Registrar factura',
                onAutorizado: () => { setModalAuth(null); ejecutarCobro(); }
            });
            return;
        }
        ejecutarCobro();
    };

    const handleSeleccionarCliente = (cliente) => {
        if (!puedeEditarCliente) {
            setModalAuth({
                permiso_requerido: 'caja_seleccionar_cliente',
                descripcionAccion: 'Buscar y asignar clientes',
                onAutorizado: () => {
                    setClienteSeleccionado(cliente);
                    setBusquedaCliente("");
                    setModalAuth(null);
                }
            });
            return;
        }
        setClienteSeleccionado(cliente);
        setBusquedaCliente("");
    };

    const handleCambiarDescuento = (valor) => {
        if (!puedeAplicarDescuento) {
            setModalAuth({
                permiso_requerido: 'caja_aplicar_descuento',
                descripcionAccion: 'Aplicar descuentos',
                onAutorizado: () => {
                    setDescuentoSeleccionado(valor);
                    setModalAuth(null);
                }
            });
            return;
        }
        setDescuentoSeleccionado(valor);
    };

    const clientesFiltrados = clientes.filter(c =>
        c.nombre_cliente.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
        c.rnc_cedula.includes(busquedaCliente)
    );

    // Estilos reutilizables
    const estilosCampoDeshabilitado = {
        opacity: 0.6,
        cursor: 'not-allowed',
        filter: 'grayscale(30%)',
        position: 'relative'
    };

    return (
        <div style={{ padding: '20px' }}>

            {/* Modal de Autorización (aparece encima de todo si hay una acción pendiente) */}
            {modalAuth && (
                <ModalAutorizacion
                    permiso_requerido={modalAuth.permiso_requerido}
                    descripcionAccion={modalAuth.descripcionAccion}
                    onAutorizado={modalAuth.onAutorizado}
                    onCancelar={() => setModalAuth(null)}
                />
            )}

            <div style={{ display: 'flex', gap: '40px' }}>
                <div style={{ flex: 1 }}>
                    <h2>Productos Disponibles</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                        {catalogo.map((producto) => {
                            const partes = producto.nombre_mostrar.split(' - ');
                            const nombrePrincipal = partes[0];
                            let talla = "";
                            let color = "";

                            if (partes.length > 1) {
                                const caracteristicasGrupales = partes.slice(1).join(' - ');
                                const partesTallaColor = caracteristicasGrupales.split(' (');
                                talla = partesTallaColor[0];
                                if (partesTallaColor.length > 1) {
                                    color = "Color " + partesTallaColor[1].replace(')', '');
                                }
                            }

                            return (
                                <button
                                    key={producto.variante_id}
                                    onClick={() => agregarAlCarrito(producto)}
                                    style={{ padding: '20px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '5px' }}
                                >
                                    <strong style={{ fontSize: '16px', color: '#333' }}>{nombrePrincipal}</strong>
                                    {talla && <span style={{ fontSize: '14px', color: '#666' }}>{talla}</span>}
                                    {color && <span style={{ fontSize: '14px', color: '#666' }}>{color}</span>}
                                    <span style={{ color: '#28a745', fontWeight: 'bold', marginTop: '5px' }}>RD$ {producto.precio}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ====== PANEL DERECHO: Facturación y Cliente ====== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '400px' }}>

                    {/* --- BUSCADOR DE CLIENTES --- */}
                    <div style={{
                        backgroundColor: '#ffffff', padding: '20px',
                        border: `1px solid ${puedeEditarCliente ? '#ddd' : '#f0ad4e'}`,
                        borderRadius: '8px',
                        ...(!puedeEditarCliente ? { position: 'relative' } : {})
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#495057' }}>Asignar Cliente</h3>
                            {!puedeEditarCliente && (
                                <span style={{ fontSize: '13px', backgroundColor: '#fff3cd', color: '#856404', padding: '3px 8px', borderRadius: '12px', fontWeight: '600' }}>
                                    🔒 Requiere autorización
                                </span>
                            )}
                        </div>

                        {clienteSeleccionado ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '5px' }}>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '14px' }}>{clienteSeleccionado.nombre_cliente}</strong>
                                    <span style={{ fontSize: '12px', color: '#6c757d' }}>{clienteSeleccionado.rnc_cedula}</span>
                                </div>
                                <button
                                    onClick={() => setClienteSeleccionado(null)}
                                    style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold' }}
                                    title="Remover cliente de esta compra"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="text"
                                    placeholder={puedeEditarCliente ? "Buscar por nombre, RNC o Cédula..." : "🔒 Sin permiso para buscar clientes"}
                                    value={busquedaCliente}
                                    onChange={(e) => {
                                        if (!puedeEditarCliente) {
                                            // Abrir modal en el primer intento de escritura
                                            setModalAuth({
                                                permiso_requerido: 'caja_seleccionar_cliente',
                                                descripcionAccion: 'Buscar y asignar clientes',
                                                onAutorizado: () => setModalAuth(null)
                                            });
                                            return;
                                        }
                                        setBusquedaCliente(e.target.value);
                                    }}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '5px',
                                        border: '1px solid #ccc', boxSizing: 'border-box',
                                        cursor: puedeEditarCliente ? 'text' : 'not-allowed',
                                        backgroundColor: puedeEditarCliente ? 'white' : '#f8f9fa'
                                    }}
                                />

                                {busquedaCliente && puedeEditarCliente && (
                                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: 'white', marginTop: '10px' }}>
                                        {clientesFiltrados.length > 0 ? (
                                            clientesFiltrados.map(cliente => (
                                                <div
                                                    key={cliente.rnc_cedula}
                                                    onClick={() => handleSeleccionarCliente(cliente)}
                                                    style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                                                >
                                                    <strong style={{ display: 'block', fontSize: '13px' }}>{cliente.nombre_cliente}</strong>
                                                    <span style={{ fontSize: '12px', color: '#6c757d' }}>{cliente.rnc_cedula}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '10px', fontSize: '13px', color: '#6c757d' }}>No se encontraron clientes.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- CAJA REGISTRADORA --- */}
                    <div style={{ backgroundColor: '#ffffff', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h2 style={{ marginTop: '0' }}>Factura de Venta</h2>

                        <div style={{ minHeight: '200px', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
                            {carrito.length === 0 ? <p style={{ color: '#888' }}>No hay artículos</p> : null}
                            {carrito.map((item, index) => (
                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button
                                            onClick={() => restarDelCarrito(item.variante_id)}
                                            style={{ padding: '4px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                            title="Quitar un artículo"
                                        >
                                            -
                                        </button>
                                        <span>{item.cantidad}x {item.nombre}</span>
                                    </div>
                                    <span>RD$ {(item.cantidad * item.precio_unitario).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ color: '#6c757d' }}>Subtotal:</span>
                                <span style={{ fontWeight: 'bold' }}>RD$ {totalCarrito.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* --- SELECTOR DE DESCUENTOS con control de permiso --- */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6c757d' }}>
                                    <span>Descuento:</span>
                                    {!puedeAplicarDescuento && (
                                        <span title="Requiere autorización para aplicar descuentos" style={{ fontSize: '14px', cursor: 'help' }}>🔒</span>
                                    )}
                                </div>
                                <select
                                    value={descuentoSeleccionado}
                                    onChange={(e) => handleCambiarDescuento(e.target.value)}
                                    disabled={!puedeAplicarDescuento}
                                    onClick={() => {
                                        if (!puedeAplicarDescuento) {
                                            setModalAuth({
                                                permiso_requerido: 'caja_aplicar_descuento',
                                                descripcionAccion: 'Aplicar descuentos',
                                                onAutorizado: () => setModalAuth(null)
                                            });
                                        }
                                    }}
                                    style={{
                                        padding: '4px', borderRadius: '4px', border: '1px solid #ced4da',
                                        fontSize: '13px', maxWidth: '180px',
                                        cursor: puedeAplicarDescuento ? 'pointer' : 'not-allowed',
                                        backgroundColor: puedeAplicarDescuento ? 'white' : '#f8f9fa',
                                        opacity: puedeAplicarDescuento ? 1 : 0.7
                                    }}
                                >
                                    <option value="">Ninguno</option>
                                    {descuentos.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.nombre_descuento} {d.tipo === 'P' ? `(-${d.valor_descuento}%)` : `(-$${d.valor_descuento})`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: montoDescuento > 0 ? '#e74c3c' : '#6c757d' }}>
                                <span>Total del Descuento:</span>
                                <span style={{ fontWeight: 'bold' }}>- RD$ {montoDescuento.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* --- SELECTORES DE NUEVOS PERMISOS (Crédito y Eliminar Impuesto) --- */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', marginTop: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6c757d' }}>
                                    <span>Tipo de Venta:</span>
                                    {!puedeVentaCredito && (
                                        <span title="Requiere autorización para venta a crédito" style={{ fontSize: '14px', cursor: 'help' }}>🔒</span>
                                    )}
                                </div>
                                <select
                                    value={tipoVenta}
                                    onChange={(e) => {
                                        const valor = e.target.value;
                                        if (valor === 'Credito' && !puedeVentaCredito) {
                                            setModalAuth({
                                                permiso_requerido: 'caja_venta_credito',
                                                descripcionAccion: 'Registrar factura a crédito',
                                                onAutorizado: () => {
                                                    setTipoVenta('Credito');
                                                    setModalAuth(null);
                                                }
                                            });
                                            return;
                                        }
                                        setTipoVenta(valor);
                                    }}
                                    style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px' }}
                                >
                                    <option value="Contado">Al Contado</option>
                                    <option value="Credito">A Crédito</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6c757d' }}>
                                    <span>Aplicar ITBIS (18%):</span>
                                    {!puedeEliminarImpuesto && (
                                        <span title="Requiere autorización para eliminar impuestos" style={{ fontSize: '14px', cursor: 'help' }}>🔒</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={aplicarItbis}
                                        onChange={(e) => {
                                            const nuevoValor = e.target.checked;
                                            if (!nuevoValor && !puedeEliminarImpuesto) {
                                                setModalAuth({
                                                    permiso_requerido: 'caja_eliminar_impuesto',
                                                    descripcionAccion: 'Eliminar ITBIS de la factura',
                                                    onAutorizado: () => {
                                                        setAplicarItbis(false);
                                                        setModalAuth(null);
                                                    }
                                                });
                                                return;
                                            }
                                            setAplicarItbis(nuevoValor);
                                        }}
                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '14px', color: aplicarItbis ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                                        {aplicarItbis ? 'SI' : 'NO'}
                                    </span>
                                </div>
                            </div>


                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ color: '#6c757d' }}>ITBIS (18%):</span>
                                <span style={{ fontWeight: 'bold' }}>RD$ {itbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ borderTop: '1px solid #dee2e6', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '22px', color: '#2c3e50', fontWeight: 'bold' }}>
                                <span>Total:</span>
                                <span style={{ color: '#27ae60' }}>RD$ {totalConImpuesto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Botón Cobrar con indicador de bloqueo si no tiene permiso */}
                        <button
                            onClick={handleCobrar}
                            disabled={cargando || carrito.length === 0}
                            style={{
                                width: '100%', padding: '15px', fontSize: '18px',
                                backgroundColor: carrito.length === 0 ? '#ccc' : (puedeRegistrarFactura ? '#007bff' : '#e67e22'),
                                color: 'white', border: 'none', borderRadius: '5px',
                                cursor: carrito.length === 0 ? 'not-allowed' : 'pointer'
                            }}
                            title={!puedeRegistrarFactura ? 'Requiere autorización de un supervisor para cobrar' : ''}
                        >
                            {cargando ? "Procesando..." : (puedeRegistrarFactura ? "Cobrar e Imprimir" : "🔒 Cobrar (requiere autorización)")}
                        </button>

                        {mensaje && (
                            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: mensaje.includes('Error') ? '#f8d7da' : '#d4edda', color: mensaje.includes('Error') ? '#721c24' : '#155724', borderRadius: '5px' }}>
                                <strong>{mensaje}</strong>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
