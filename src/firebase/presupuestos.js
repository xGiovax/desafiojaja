import { db } from './configuracion';
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot
} from 'firebase/firestore';

// Escuchar presupuestos en tiempo real
export function escucharPresupuestos(usuarioId, callback) {
  const q = query(
    collection(db, 'presupuestos'),
    where('usuarioId', '==', usuarioId)
  );
  return onSnapshot(q, (snapshot) => {
    const presupuestos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(presupuestos);
  });
}

// Crear presupuesto
export async function crearPresupuesto(usuarioId, categoria, limite) {
  return await addDoc(collection(db, 'presupuestos'), {
    usuarioId,
    categoria,
    limite: parseFloat(limite),
    creadoEn: new Date()
  });
}

// Actualizar presupuesto
export async function actualizarPresupuesto(presupuestoId, limite) {
  return await updateDoc(doc(db, 'presupuestos', presupuestoId), {
    limite: parseFloat(limite)
  });
}

// Eliminar presupuesto
export async function eliminarPresupuesto(presupuestoId) {
  return await deleteDoc(doc(db, 'presupuestos', presupuestoId));
}