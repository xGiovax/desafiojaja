import { db } from './configuracion';
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, onSnapshot
} from 'firebase/firestore';

// Obtener cuentas en tiempo real
export function escucharCuentas(usuarioId, callback) {
  const q = query(
    collection(db, 'cuentas'),
    where('usuarioId', '==', usuarioId)
  );
  return onSnapshot(q, (snapshot) => {
    const cuentas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(cuentas);
  });
}

// Crear cuenta nueva
export async function crearCuenta(usuarioId, nombre, tipo) {
  return await addDoc(collection(db, 'cuentas'), {
    usuarioId,
    nombre,
    tipo,
    creadoEn: new Date()
  });
}

// Eliminar cuenta
export async function eliminarCuenta(cuentaId) {
  return await deleteDoc(doc(db, 'cuentas', cuentaId));
}