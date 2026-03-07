import React, { useState } from 'react';
import { API_BASE_URL } from './config';

/**
 * Modal de Autorización Supervisora
 *
 * Aparece cuando un usuario no tiene el permiso requerido para realizar una acción.
 * Pide las credenciales de un usuario con ese permiso, verifica que las tenga,
 * y si es válido ejecuta la acción. El usuario original sigue logueado.
 *
 * Props:
 *  - moduloCodigo: código interno del módulo (ej: "CAJ")
 *  - permisoClave: clave del permiso requerido (ej: "puede_crear", "puede_editar")
 *  - descripcionAccion: texto legible de la acción (ej: "Registrar factura")
 *  - onAutorizado: función a ejecutar si la autorización es exitosa
 *  - onCancelar: función para cerrar el modal sin hacer nada
 */
export default function ModalAutorizacion({ moduloCodigo, permisoClave, descripcionAccion, onAutorizado, onCancelar }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [verificando, setVerificando] = useState(false);

    const handleAutorizar = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Ingresa el correo y la contraseña del autorizador.');
            return;
        }

        setVerificando(true);
        setError('');

        try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const datos = await resp.json();

            if (!resp.ok) {
                setError('Credenciales incorrectas. Intenta de nuevo.');
                setVerificando(false);
                return;
            }

            // Verificar que el autorizador tenga el permiso requerido en el módulo indicado
            const permisos = datos.datos?.permisos || {};
            const permisosModulo = permisos[moduloCodigo];

            if (!permisosModulo || permisosModulo[permisoClave] !== true) {
                setError(`Este usuario tampoco tiene permiso para: "${descripcionAccion}".`);
                setVerificando(false);
                return;
            }

            // Autorización exitosa
            onAutorizado();

        } catch {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setVerificando(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '32px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                fontFamily: 'sans-serif'
            }}>
                {/* Encabezado */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔒</div>
                    <h2 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '20px' }}>
                        Autorización Requerida
                    </h2>
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '14px', lineHeight: '1.5' }}>
                        No tienes permiso para: <br />
                        <strong style={{ color: '#e74c3c' }}>"{descripcionAccion}"</strong><br />
                        Pide a un supervisor que ingrese sus credenciales.
                    </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleAutorizar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#495057', marginBottom: '6px' }}>
                            Correo del autorizador
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="supervisor@empresa.com"
                            autoFocus
                            style={{
                                width: '100%', padding: '10px 12px', borderRadius: '8px',
                                border: '1px solid #ced4da', fontSize: '14px',
                                boxSizing: 'border-box', outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#495057', marginBottom: '6px' }}>
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: '100%', padding: '10px 12px', borderRadius: '8px',
                                border: '1px solid #ced4da', fontSize: '14px',
                                boxSizing: 'border-box', outline: 'none'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px 14px', backgroundColor: '#f8d7da',
                            color: '#721c24', borderRadius: '8px', fontSize: '13px'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Botones */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button
                            type="button"
                            onClick={onCancelar}
                            style={{
                                flex: 1, padding: '11px', borderRadius: '8px',
                                border: '1px solid #ced4da', backgroundColor: '#f8f9fa',
                                color: '#495057', fontSize: '14px', fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={verificando}
                            style={{
                                flex: 1, padding: '11px', borderRadius: '8px',
                                border: 'none', backgroundColor: verificando ? '#6c757d' : '#007bff',
                                color: 'white', fontSize: '14px', fontWeight: '600',
                                cursor: verificando ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {verificando ? 'Verificando...' : 'Autorizar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
