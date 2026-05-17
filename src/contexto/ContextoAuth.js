import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, 
         createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase/configuracion';

const ContextoAuth = createContext();

export function ProveedorAuth({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsuscribe = onAuthStateChanged(auth, (usuarioFirebase) => {
      setUsuario(usuarioFirebase);
      setCargando(false);
    });
    return unsuscribe;
  }, []);

  const iniciarSesion = (email, contrasena) => {
    return signInWithEmailAndPassword(auth, email, contrasena);
  };

  const registrarse = (email, contrasena) => {
    return createUserWithEmailAndPassword(auth, email, contrasena);
  };

  const cerrarSesion = () => {
    return signOut(auth);
  };

  return (
    <ContextoAuth.Provider value={{ usuario, cargando, iniciarSesion, registrarse, cerrarSesion }}>
      {children}
    </ContextoAuth.Provider>
  );
}

export function useAuth() {
  return useContext(ContextoAuth);
}