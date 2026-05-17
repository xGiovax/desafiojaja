import { db } from './configuracion';
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot
} from 'firebase/firestore';

// Escuchar transacciones en tiempo real
export function escucharTransacciones(usuarioId, callback) {
  const q = query(
    collection(db, 'transacciones'),
    where('usuarioId', '==', usuarioId)
  );
  return onSnapshot(q, (snapshot) => {
    const transacciones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Ordenar por fecha descendente
    transacciones.sort((a, b) => b.fecha?.toDate() - a.fecha?.toDate());
    callback(transacciones);
  });
}

// Crear transacción
export async function crearTransaccion(usuarioId, datos) {
  return await addDoc(collection(db, 'transacciones'), {
    usuarioId,
    ...datos,
    fecha: new Date(),
    creadoEn: new Date()
  });
}

// Editar transacción
export async function editarTransaccion(transaccionId, datos) {
  return await updateDoc(doc(db, 'transacciones', transaccionId), datos);
}

// Eliminar transacción
export async function eliminarTransaccion(transaccionId) {
  return await deleteDoc(doc(db, 'transacciones', transaccionId));
}