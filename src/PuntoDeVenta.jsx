import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

export default function PuntoDeVenta() {
    const [catalogo, setCatalogo] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [clientes, setClientes] = useState([]); // Lista completa de clientes
    const [busquedaCliente, setBusquedaCliente] = useState("");
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [descuentos, setDescuentos] = useState([]);
    const [descuentoSeleccionado, setDescuentoSeleccionado] = useState('');
    const [mensaje, setMensaje] = useState("");
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        const cargarDatosInciales = async () => {
            try {
                // Cargar productos
                const respCat = await fetch(`${API_BASE_URL}/api/v1/catalogo`);
                const resCat = await respCat.json();
                if (respCat.ok) setCatalogo(resCat.datos);

                // Cargar clientes para el buscador
                const respCli = await fetch(`${API_BASE_URL}/api/v1/clientes`);
                const resCli = await respCli.json();
                if (respCli.ok) setClientes(resCli.datos);

                // Cargar descuentos
                const respDesc = await fetch(`${API_BASE_URL}/api/v1/descuentos`);
                const resDesc = await respDesc.json();
                if (respDesc.ok) setDescuentos(resDesc.datos);

            } catch (error) {
                console.error("Error al cargar datos iniciales:", error);
            }
        };
        cargarDatosInciales();
    }, []);

    // Efecto para auto-seleccionar un descuento si el cliente tiene uno asignado
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

    // Cálculo del descuento
    let montoDescuento = 0;
    if (descuentoSeleccionado) {
        // En Supabase, los IDs usualmente son UUID (texto), por lo tanto quitamos el parseInt que rompe la validación
        const descuentoInfo = descuentos.find(d => String(d.id) === String(descuentoSeleccionado));
        if (descuentoInfo) {
            if (descuentoInfo.tipo === 'P') {
                montoDescuento = totalCarrito * (descuentoInfo.valor_descuento / 100);
            } else if (descuentoInfo.tipo === 'R') {
                montoDescuento = descuentoInfo.valor_descuento;
            }
        }
    }

    // Evitar que el descuento sea mayor que el total
    if (montoDescuento > totalCarrito) {
        montoDescuento = totalCarrito;
    }

    const subtotalConDescuento = totalCarrito - montoDescuento;
    const itbis = subtotalConDescuento * 0.18;
    const totalConImpuesto = subtotalConDescuento + itbis;

    const procesarCobro = async () => {
        if (carrito.length === 0) {
            setMensaje("El carrito está vacío. Agrega ropa primero.");
            return;
        }

        setCargando(true);
        setMensaje("Generando factura...");

        const datosVenta = {
            rnc_cliente: clienteSeleccionado ? clienteSeleccionado.rnc_cedula : null,
            nombre_cliente: clienteSeleccionado ? clienteSeleccionado.nombre_cliente : (busquedaCliente.trim() !== "" ? busquedaCliente : "Cliente Casual"),
            tipo_comprobante: "B02",
            metodo_pago: "Efectivo",
            articulos: carrito,
            descuento_id: descuentoSeleccionado || null,
            descuento: montoDescuento // Enviar el monto descontado al backend
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
            } else {
                setMensaje(`Error: ${resultado.detail}`);
            }
        } catch (error) {
            setMensaje("Error de conexión con el servidor.");
        } finally {
            setCargando(false);
        }
    };

    const clientesFiltrados = clientes.filter(c =>
        c.nombre_cliente.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
        c.rnc_cedula.includes(busquedaCliente)
    );

    return (
        <div style={{ padding: '20px' }}>

            <div style={{ display: 'flex', gap: '40px' }}>
                <div style={{ flex: 1 }}>
                    <h2>Productos Disponibles</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                        {catalogo.map((producto) => {
                            // Viene formato: "Nombre del Producto - Talla X (Color Y)"
                            const partes = producto.nombre_mostrar.split(' - ');
                            const nombrePrincipal = partes[0];
                            let talla = "";
                            let color = "";

                            if (partes.length > 1) {
                                const caracteristicasGrupales = partes.slice(1).join(' - '); // Ej: "Talla M (Azul)"
                                // Separamos por el paréntesis
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
                    <div style={{ backgroundColor: '#ffffff', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#495057' }}>Asignar Cliente</h3>

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
                                    placeholder="Buscar por nombre, RNC o Cédula..."
                                    value={busquedaCliente}
                                    onChange={(e) => setBusquedaCliente(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                                />

                                {busquedaCliente && (
                                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: 'white', marginTop: '10px' }}>
                                        {clientesFiltrados.length > 0 ? (
                                            clientesFiltrados.map(cliente => (
                                                <div
                                                    key={cliente.rnc_cedula}
                                                    onClick={() => {
                                                        setClienteSeleccionado(cliente);
                                                        setBusquedaCliente("");
                                                    }}
                                                    style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                                                    className="cliente-nombre-celda"
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
                    {/* ------------------------------- */}

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

                            {/* --- SELECTOR DE DESCUENTOS --- */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <span style={{ color: '#6c757d' }}>Descuento:</span>
                                <select
                                    value={descuentoSeleccionado}
                                    onChange={(e) => setDescuentoSeleccionado(e.target.value)}
                                    style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px', maxWidth: '180px' }}
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

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ color: '#6c757d' }}>ITBIS (18%):</span>
                                <span style={{ fontWeight: 'bold' }}>RD$ {itbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ borderTop: '1px solid #dee2e6', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '22px', color: '#2c3e50', fontWeight: 'bold' }}>
                                <span>Total:</span>
                                <span style={{ color: '#27ae60' }}>RD$ {totalConImpuesto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        {/* ------------------------------- */}

                        <button
                            onClick={procesarCobro}
                            disabled={cargando || carrito.length === 0}
                            style={{ width: '100%', padding: '15px', fontSize: '18px', backgroundColor: carrito.length === 0 ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: carrito.length === 0 ? 'not-allowed' : 'pointer' }}
                        >
                            {cargando ? "Procesando..." : "Cobrar e Imprimir"}
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
