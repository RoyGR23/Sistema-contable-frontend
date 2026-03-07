import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';

export default function Categorias() {
    const [prendas, setPrendas] = useState([]);
    const [colores, setColores] = useState([]);
    const [tallas, setTallas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState("");

    // Estados para nuevos items
    const [nuevaPrenda, setNuevaPrenda] = useState("");
    const [nuevoColor, setNuevoColor] = useState("");
    const [nuevaTalla, setNuevaTalla] = useState("");

    // Estado para controlar cuáles tarjetas están expandidas
    const [tarjetasExpandidas, setTarjetasExpandidas] = useState({
        prendas: false,
        colores: false,
        tallas: false
    });

    const toggleExpansion = (llave) => {
        setTarjetasExpandidas(prev => ({ ...prev, [llave]: !prev[llave] }));
    };

    const mostrarMensajeTemporal = (texto, error = false) => {
        setMensaje(texto);
        setTipoMensaje(error ? 'error' : 'exito');
        setTimeout(() => setMensaje(""), 3000);
    };

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [resPrendas, resColores, resTallas] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/categorias/prendas`),
                fetch(`${API_BASE_URL}/api/v1/categorias/colores`),
                fetch(`${API_BASE_URL}/api/v1/categorias/tallas`)
            ]);

            const dataPrendas = await resPrendas.json();
            const dataColores = await resColores.json();
            const dataTallas = await resTallas.json();

            if (resPrendas.ok) setPrendas(dataPrendas.datos);
            if (resColores.ok) setColores(dataColores.datos);
            if (resTallas.ok) setTallas(dataTallas.datos);
        } catch (error) {
            mostrarMensajeTemporal("Error cargando categorías", true);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const agregarItem = async (tipo, valor, setValor) => {
        if (!valor.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/categorias/${tipo}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre: valor.trim() })
            });
            if (!res.ok) throw new Error("Error al guardar");
            mostrarMensajeTemporal("Item guardado exitosamente");
            setValor("");
            cargarDatos();
        } catch (error) {
            mostrarMensajeTemporal(error.message, true);
        }
    };

    const eliminarItem = async (tipo, id) => {
        if (!window.confirm("¿Estás seguro de eliminar este item?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/categorias/${tipo}/${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Error al eliminar (Puede que esté en uso)");
            mostrarMensajeTemporal("Item eliminado");
            cargarDatos();
        } catch (error) {
            mostrarMensajeTemporal(error.message, true);
        }
    };

    const renderCard = (titulo, items, tipoEndpoint, valorNuevo, setValorNuevo, llaveExpansion) => {
        const expandido = tarjetasExpandidas[llaveExpansion];

        return (
            <div style={{ width: '100%', backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <div
                    onClick={() => toggleExpansion(llaveExpansion)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: expandido ? '2px solid #ecf0f1' : 'none', paddingBottom: expandido ? '10px' : '0', marginBottom: expandido ? '15px' : '0' }}
                >
                    <h2 style={{ color: '#2c3e50', fontSize: '18px', margin: 0 }}>{titulo}</h2>
                    <span style={{ fontSize: '14px', transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                </div>

                {expandido && (
                    <>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="text"
                                value={valorNuevo}
                                onChange={(e) => setValorNuevo(e.target.value)}
                                placeholder={`Nuevo ${titulo.toLowerCase()}...`}
                                style={{ flex: 1, padding: '8px 12px', borderRadius: '5px', border: '1px solid #bdc3c7', outline: 'none' }}
                            />
                            <button
                                onClick={() => agregarItem(tipoEndpoint, valorNuevo, setValorNuevo)}
                                style={{ padding: '8px 15px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Añadir
                            </button>
                        </div>

                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '250px', overflowY: 'auto' }}>
                            {cargando ? (
                                <li style={{ textAlign: 'center', color: '#7f8c8d', padding: '10px', fontSize: '14px' }}>Cargando...</li>
                            ) : items.length === 0 ? (
                                <li style={{ textAlign: 'center', color: '#7f8c8d', padding: '10px', fontSize: '14px' }}>No hay elementos</li>
                            ) : (
                                items.map(item => (
                                    <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #f1f2f6' }}>
                                        <span style={{ color: '#34495e', fontSize: '14px' }}>{item.nombre}</span>
                                        <button
                                            onClick={() => eliminarItem(tipoEndpoint, item.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '14px' }}
                                            title="Eliminar"
                                        >
                                            ✖
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    </>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', minHeight: 'calc(100vh - 60px)' }}>
            <div style={{ width: '100%', maxWidth: '1000px' }}>
                <h1 style={{ color: '#2c3e50', margin: 0, fontSize: '24px', marginBottom: '20px' }}>Categorías</h1>

                <div style={{ minHeight: '60px', marginBottom: '20px' }}>
                    {mensaje && (
                        <div style={{ padding: '15px', backgroundColor: tipoMensaje === 'error' ? '#f8d7da' : '#d4edda', color: tipoMensaje === 'error' ? '#721c24' : '#155724', borderRadius: '5px' }}>
                            <strong>{mensaje}</strong>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {renderCard("Tipos de Prendas", prendas, "prendas", nuevaPrenda, setNuevaPrenda, "prendas")}
                    {renderCard("Colores", colores, "colores", nuevoColor, setNuevoColor, "colores")}
                    {renderCard("Tallas", tallas, "tallas", nuevaTalla, setNuevaTalla, "tallas")}
                </div>
            </div>
        </div>
    );
}
