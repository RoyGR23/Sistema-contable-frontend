import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import PuntoDeVenta from './PuntoDeVenta';
import Clientes from './Clientes';
import Inventario from './Inventario';
import Categorias from './Categorias';
import Descuentos from './Descuentos';
import Roles from './Roles';
import Usuarios from './Usuarios';
import Login from './Login';
import logoImg from './assets/logo.jpg';
import { API_BASE_URL } from './config';

// --- 1. COMPONENTE DEL MENÚ LATERAL (SIDEBAR) ---
function LayoutConMenu({ children, onLogout, usuario }) {
  // Estado para controlar si el menú está abierto o cerrado
  const [menuAbierto, setMenuAbierto] = useState(true);
  const [inventarioAbierto, setInventarioAbierto] = useState(false);
  const [administracionAbierto, setAdministracionAbierto] = useState(false);

  // Para saber en qué ruta estamos y resaltar el botón activo
  const location = useLocation();

  const anchoMenu = menuAbierto ? '260px' : '70px';

  const estiloEnlace = (ruta) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '15px 20px',
    color: location.pathname === ruta ? '#ffffff' : '#495057',
    backgroundColor: location.pathname === ruta ? '#007bff' : 'transparent',
    textDecoration: 'none',
    fontSize: '16px',
    transition: 'background-color 0.2s, color 0.2s',
    borderLeft: location.pathname === ruta ? '4px solid #ffffff' : '4px solid transparent',
    whiteSpace: 'nowrap', // Evita que el texto baje a la siguiente línea al cerrar
    overflow: 'hidden'
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: '#f4f6f9' }}>

      {/* --- PANEL LATERAL (SIDEBAR) --- */}
      <div style={{
        width: anchoMenu,
        backgroundColor: '#ffffff', // Fondo blanco
        color: '#212529', // Texto oscuro
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>

        {/* Encabezado del Menú y Botón Hamburguesa */}
        <div style={{ display: 'flex', alignItems: 'center', padding: menuAbierto ? '20px' : '20px 0', justifyContent: menuAbierto ? 'space-between' : 'center', borderBottom: '1px solid #e9ecef', flexDirection: menuAbierto ? 'row' : 'column', gap: menuAbierto ? '0' : '15px' }}>
          {menuAbierto ? (
            <img src={logoImg} alt="D'Vestilo Logo" style={{ width: '60px', objectFit: 'contain' }} />
          ) : (
            <img src={logoImg} alt="Logo" style={{ width: '40px', objectFit: 'contain' }} />
          )}
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            style={{ background: 'transparent', border: 'none', color: '#2c3e50', fontSize: '24px', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Alternar Menú"
          >
            ☰
          </button>
        </div>

        {/* Enlaces de Navegación */}
        <nav style={{ display: 'flex', flexDirection: 'column', marginTop: '20px' }}>
          <Link to="/" style={estiloEnlace('/')} title="Inicio">
            <span style={{ fontSize: '20px', minWidth: '35px' }}>🏠</span>
            {menuAbierto && <span>Panel Principal</span>}
          </Link>

          <Link to="/pos" style={estiloEnlace('/pos')} title="Punto de Venta">
            <span style={{ fontSize: '20px', minWidth: '35px' }}>🛒</span>
            {menuAbierto && <span>Caja</span>}
          </Link>

          <Link to="/clientes" style={estiloEnlace('/clientes')} title="Clientes">
            <span style={{ fontSize: '20px', minWidth: '35px' }}>👥</span>
            {menuAbierto && <span>Clientes</span>}
          </Link>

          {/* Menú Desplegable Inventario */}
          <div>
            <div
              onClick={() => {
                setInventarioAbierto(!inventarioAbierto);
                if (!menuAbierto) setMenuAbierto(true); // Abre el menú principal si estaba cerrado
              }}
              style={{ ...estiloEnlace(''), cursor: 'pointer', backgroundColor: (location.pathname.startsWith('/inventario') || location.pathname.startsWith('/categorias')) ? 'rgba(0, 123, 255, 0.1)' : 'transparent', color: '#495057' }}
              title="Inventario"
            >
              <span style={{ fontSize: '20px', minWidth: '35px' }}>📦</span>
              {menuAbierto && (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Inventario</span>
                  <span style={{ fontSize: '12px', transform: inventarioAbierto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                </div>
              )}
            </div>

            {menuAbierto && inventarioAbierto && (
              <div style={{ backgroundColor: '#f8f9fa', padding: '5px 0' }}>
                <Link to="/inventario" style={{ ...estiloEnlace('/inventario'), paddingLeft: '55px', fontSize: '14px', borderLeft: 'none', backgroundColor: location.pathname === '/inventario' ? '#e9ecef' : 'transparent', color: location.pathname === '/inventario' ? '#007bff' : '#495057' }}>
                  Gestión de Inventario
                </Link>
                <Link to="/categorias" style={{ ...estiloEnlace('/categorias'), paddingLeft: '55px', fontSize: '14px', borderLeft: 'none', backgroundColor: location.pathname === '/categorias' ? '#e9ecef' : 'transparent', color: location.pathname === '/categorias' ? '#007bff' : '#495057' }}>
                  Categorías
                </Link>
              </div>
            )}
          </div>

          {/* Menú Desplegable Administración */}
          <div>
            <div
              onClick={() => {
                setAdministracionAbierto(!administracionAbierto);
                if (!menuAbierto) setMenuAbierto(true); // Abre el menú principal si estaba cerrado
              }}
              style={{ ...estiloEnlace(''), cursor: 'pointer', backgroundColor: (location.pathname.startsWith('/descuentos') || location.pathname.startsWith('/roles') || location.pathname.startsWith('/usuarios')) ? 'rgba(0, 123, 255, 0.1)' : 'transparent', color: '#495057' }}
              title="Administración"
            >
              <span style={{ fontSize: '20px', minWidth: '35px' }}>⚙️</span>
              {menuAbierto && (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Administración</span>
                  <span style={{ fontSize: '12px', transform: administracionAbierto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                </div>
              )}
            </div>

            {menuAbierto && administracionAbierto && (
              <div style={{ backgroundColor: '#f8f9fa', padding: '5px 0' }}>
                <Link to="/descuentos" style={{ ...estiloEnlace('/descuentos'), paddingLeft: '55px', fontSize: '14px', borderLeft: 'none', backgroundColor: location.pathname === '/descuentos' ? '#e9ecef' : 'transparent', color: location.pathname === '/descuentos' ? '#007bff' : '#495057' }}>
                  Descuentos
                </Link>
                <Link to="/roles" style={{ ...estiloEnlace('/roles'), paddingLeft: '55px', fontSize: '14px', borderLeft: 'none', backgroundColor: location.pathname === '/roles' ? '#e9ecef' : 'transparent', color: location.pathname === '/roles' ? '#007bff' : '#495057' }}>
                  Roles y Permisos
                </Link>
                <Link to="/usuarios" style={{ ...estiloEnlace('/usuarios'), paddingLeft: '55px', fontSize: '14px', borderLeft: 'none', backgroundColor: location.pathname === '/usuarios' ? '#e9ecef' : 'transparent', color: location.pathname === '/usuarios' ? '#007bff' : '#495057' }}>
                  Usuarios
                </Link>
              </div>
            )}
          </div>

          <div style={{ ...estiloEnlace('#'), cursor: 'not-allowed', opacity: 0.5 }} title="Reportes DGII (Próximamente)">
            <span style={{ fontSize: '20px', minWidth: '35px' }}>📊</span>
            {menuAbierto && <span>Reportes DGII</span>}
          </div>
        </nav>

        {/* --- SECCIÓN INFERIOR: PERFIL Y LOGOUT --- */}
        <div style={{ marginTop: 'auto', padding: '15px', borderTop: '1px solid #e9ecef', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {menuAbierto && usuario && (
            <div style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '5px' }}>
              Registrado como:<br />
              <strong style={{ color: '#2c3e50', fontSize: '14px' }}>{usuario.nombre_completo}</strong><br />
              <span style={{ color: '#e67e22' }}>{usuario.rol}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: menuAbierto ? 'flex-start' : 'center',
              padding: '10px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none',
              borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', width: '100%',
              fontWeight: 'bold', fontSize: '14px'
            }}
            title="Cerrar Sesión"
            onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
          >
            <span style={{ fontSize: '18px', marginRight: menuAbierto ? '10px' : '0' }}>🚪</span>
            {menuAbierto && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* --- CONTENIDO PRINCIPAL (DERECHA) --- */}
      <div style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
        {children}
      </div>

    </div >
  );
}

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- DATOS ESTATICOS (RESUMEN) ---
const resumen = {
  cuentasPorCobrarVigentes: 12500.50,
  cuentasPorCobrarVencidas: 3200.00
};

// --- 2. COMPONENTE DEL PANEL PRINCIPAL (DASHBOARD) ---
function PantallaInicio() {
  const [datosVentasMes, setDatosVentasMes] = useState([
    { name: 'Ene', Ventas: 0, VentasSinITBIS: 0 }, { name: 'Feb', Ventas: 0, VentasSinITBIS: 0 }, { name: 'Mar', Ventas: 0, VentasSinITBIS: 0 },
    { name: 'Abr', Ventas: 0, VentasSinITBIS: 0 }, { name: 'May', Ventas: 0, VentasSinITBIS: 0 }, { name: 'Jun', Ventas: 0, VentasSinITBIS: 0 },
    { name: 'Jul', Ventas: 0, VentasSinITBIS: 0 }, { name: 'Ago', Ventas: 0, VentasSinITBIS: 0 }, { name: 'Sep', Ventas: 0, VentasSinITBIS: 0 },
    { name: 'Oct', Ventas: 0, VentasSinITBIS: 0 }, { name: 'Nov', Ventas: 0, VentasSinITBIS: 0 }, { name: 'Dic', Ventas: 0, VentasSinITBIS: 0 }
  ]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [sinItbis, setSinItbis] = useState(false);

  useEffect(() => {
    const cargarVentas = async () => {
      try {
        const respuesta = await fetch(`${API_BASE_URL}/api/v1/dashboard/ventas-mes`);
        const resultado = await respuesta.json();
        if (respuesta.ok) {
          setDatosVentasMes(resultado.datos);
        }
      } catch (error) {
        console.error("Error al cargar ventas del dashboard:", error);
      }
    };

    const cargarTotalClientes = async () => {
      try {
        const respuesta = await fetch(`${API_BASE_URL}/api/v1/dashboard/clientes-total`);
        const resultado = await respuesta.json();
        if (respuesta.ok) {
          setTotalClientes(resultado.total_clientes || 0);
        }
      } catch (error) {
        console.error("Error al cargar el total de clientes:", error);
      } finally {
        setCargandoClientes(false);
      }
    };

    cargarVentas();
    cargarTotalClientes();
  }, []);

  return (
    <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 60px)' }}>
      <h1 style={{ color: '#2c3e50', margin: '0 0 10px 0', fontSize: '28px' }}>
        Resumen del Negocio
      </h1>

      {/* 2.1 Tarjetas Superiores */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>

        {/* Tarjeta de Cuentas por Cobrar */}
        <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: '5px solid #e74c3c' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#7f8c8d', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Cuentas por Cobrar
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: '#34495e', fontWeight: 'bold' }}>Vigentes:</span>
            <span style={{ fontSize: '20px', color: '#2ecc71', fontWeight: 'bold' }}>RD$ {resumen.cuentasPorCobrarVigentes.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#34495e', fontWeight: 'bold' }}>Vencidas:</span>
            <span style={{ fontSize: '20px', color: '#e74c3c', fontWeight: 'bold' }}>RD$ {resumen.cuentasPorCobrarVencidas.toLocaleString()}</span>
          </div>
        </div>

        {/* Tarjeta de Clientes */}
        <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: '5px solid #3498db', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#7f8c8d', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Total de Clientes
          </h3>
          <div style={{ textAlign: 'center' }}>
            {cargandoClientes ? (
              <span style={{ fontSize: '18px', color: '#95a5a6' }}>Cargando...</span>
            ) : (
              <span style={{ fontSize: '48px', color: '#2c3e50', fontWeight: 'bold' }}>{totalClientes}</span>
            )}
          </div>
        </div>

      </div>

      {/* 2.2 Gráfico Inferior (Ocupa todo el ancho) */}
      <div style={{ flex: 2, backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#7f8c8d', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Ventas por Mes
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'bold' }}>Sin ITBIS</span>
            <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
              <input
                type="checkbox"
                checked={sinItbis}
                onChange={(e) => setSinItbis(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: sinItbis ? '#3498db' : '#ccc', transition: '.4s', borderRadius: '34px'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '16px', width: '16px', left: '2px', bottom: '2px',
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                  transform: sinItbis ? 'translateX(20px)' : 'translateX(0)'
                }}></span>
              </span>
            </label>
          </div>
        </div>
        <div style={{ width: '100%', height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={datosVentasMes}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecf0f1" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7f8c8d' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7f8c8d' }} tickFormatter={(value) => `$${value}`} />
              <Tooltip cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Bar dataKey={sinItbis ? "VentasSinITBIS" : "Ventas"} fill="#3498db" radius={[4, 4, 0, 0]} barSize={40} name={sinItbis ? "Ventas (Sin ITBIS)" : "Ventas (Con ITBIS)"} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

// --- 3. CONFIGURACIÓN DE RUTAS ---
export default function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(null);

  // Al cargar la App, revisar si hay usuario guardado (Session Persistente)
  useEffect(() => {
    const storedUser = localStorage.getItem('usuario_dvestilo');
    if (storedUser) {
      try {
        setUsuarioActivo(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error leyendo usuario guardado", e);
        localStorage.removeItem('usuario_dvestilo');
      }
    }
  }, []);

  const handleLoginExitoso = (datosUsuario) => {
    setUsuarioActivo(datosUsuario);
    localStorage.setItem('usuario_dvestilo', JSON.stringify(datosUsuario));
  };

  const handleLogout = () => {
    setUsuarioActivo(null);
    localStorage.removeItem('usuario_dvestilo');
  };

  // Si no hay usuario activo, bloqueamos la app y forzamos el login
  if (!usuarioActivo) {
    return <Login onLoginExitoso={handleLoginExitoso} />;
  }

  return (
    <Router>
      {/* Envolvemos todas las pantallas con nuestro menú lateral */}
      <LayoutConMenu onLogout={handleLogout} usuario={usuarioActivo}>
        <Routes>
          <Route path="/" element={<PantallaInicio />} />
          <Route path="/pos" element={<PuntoDeVenta />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/descuentos" element={<Descuentos />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Routes>
      </LayoutConMenu>
    </Router>
  );
}