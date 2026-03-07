import React, { useState } from 'react';
import logoImg from './assets/logo.jpg';
import { API_BASE_URL } from './config';

export default function Login({ onLoginExitoso }) {
    const [credenciales, setCredenciales] = useState({
        email: '',
        password: ''
    });
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
        setError(''); // Limpia el error si empieza a escribir de nuevo
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!credenciales.email || !credenciales.password) {
            setError('Por favor completa todos los campos.');
            return;
        }

        setCargando(true);
        setError('');

        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credenciales)
            });

            const data = await respuesta.json();

            if (respuesta.ok) {
                // Notificamos a App.jsx y pasamos los datos del usuario logueado
                onLoginExitoso(data.datos);
            } else {
                setError(data.detail || "Error al iniciar sesión.");
            }
        } catch (error) {
            setError("No se pudo conectar con el servidor.");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div style={{
            display: 'flex', minHeight: '100vh', width: '100vw', backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif'
        }}>
            {/* Mitad Izquierda - Decorativa */}
            <div style={{
                flex: 1, backgroundColor: '#2c3e50', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', padding: '40px', color: 'white'
            }}>
                <img src={logoImg} alt="D'Vestilo Logo" style={{ width: '250px', marginBottom: '30px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
                <h1 style={{ fontSize: '36px', marginBottom: '15px', textAlign: 'center' }}>D'Vvestylo</h1>
                <p style={{ fontSize: '18px', textAlign: 'center', opacity: 0.8, maxWidth: '400px', lineHeight: '1.6' }}>
                    Control de inventarios, ventas y personal desde una sola plataforma unificada e inteligente.
                </p>
            </div>

            {/* Mitad Derecha - Formulario */}
            <div style={{
                flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff'
            }}>
                <div style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>

                    <h2 style={{ color: '#2c3e50', fontSize: '28px', marginBottom: '10px' }}>¡Bienvenido de vuelta!</h2>
                    <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>Por favor ingresa tus credenciales de empleado.</p>

                    {error && (
                        <div style={{ padding: '15px', marginBottom: '20px', backgroundColor: '#fdecea', color: '#e74c3c', borderRadius: '8px', borderLeft: '4px solid #e74c3c', fontSize: '14px', fontWeight: 'bold' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Correo Electrónico</label>
                            <input
                                type="email"
                                name="email"
                                value={credenciales.email}
                                onChange={handleChange}
                                placeholder="ejemplo@DVestilo.com"
                                style={{
                                    padding: '14px', borderRadius: '8px', border: '1px solid #bdc3c7', fontSize: '16px',
                                    outline: 'none', transition: 'border-color 0.3s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                                onBlur={(e) => e.target.style.borderColor = '#bdc3c7'}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label style={{ color: '#34495e', fontWeight: 'bold', fontSize: '14px' }}>Contraseña</label>
                            </div>
                            <input
                                type="password"
                                name="password"
                                value={credenciales.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                style={{
                                    padding: '14px', borderRadius: '8px', border: '1px solid #bdc3c7', fontSize: '16px',
                                    outline: 'none', transition: 'border-color 0.3s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                                onBlur={(e) => e.target.style.borderColor = '#bdc3c7'}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={cargando}
                            style={{
                                marginTop: '10px', padding: '16px', backgroundColor: cargando ? '#95a5a6' : '#2980b9',
                                color: 'white', border: 'none', borderRadius: '8px', cursor: cargando ? 'not-allowed' : 'pointer',
                                fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.3s',
                                boxShadow: cargando ? 'none' : '0 4px 6px rgba(41, 128, 185, 0.3)'
                            }}
                        >
                            {cargando ? "Autenticando..." : "Iniciar Sesión"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
