// Detectar si es error de red
export function esErrorDeRed(error) {
  return (
    error.message?.includes('network') ||
    error.message?.includes('Network') ||
    error.message?.includes('fetch') ||
    error.code === 'auth/network-request-failed' ||
    error.code === 'unavailable'
  );
}

// Mensajes amigables para errores de Firebase Auth
export function mensajeErrorAuth(error) {
  if (esErrorDeRed(error)) {
    return 'Sin conexión a internet. Verifica tu red e intenta de nuevo.';
  }
  const mensajes = {
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-email': 'El formato del correo no es válido.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde.',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
  };
  return mensajes[error.code] || 'Ocurrió un error inesperado. Intenta de nuevo.';
}

// Mensajes amigables para errores de Firestore
export function mensajeErrorFirestore(error) {
  if (esErrorDeRed(error)) {
    return 'Sin conexión a internet. Verifica tu red e intenta de nuevo.';
  }
  const mensajes = {
    'permission-denied': 'No tienes permiso para realizar esta acción.',
    'not-found': 'El registro no fue encontrado.',
    'already-exists': 'Este registro ya existe.',
    'resource-exhausted': 'Límite de uso alcanzado. Intenta más tarde.',
    'unavailable': 'Servicio no disponible. Intenta más tarde.',
  };
  return mensajes[error.code] || 'Error al conectar con la base de datos.';
}

// Validar monto
export function validarMonto(monto) {
  if (!monto || monto.trim() === '') {
    return 'El monto es obligatorio.';
  }
  const numero = parseFloat(monto);
  if (isNaN(numero)) {
    return 'El monto debe ser un número válido.';
  }
  if (numero <= 0) {
    return 'El monto debe ser mayor a cero.';
  }
  if (numero > 999999999) {
    return 'El monto es demasiado grande.';
  }
  if (!/^\d+(\.\d{0,2})?$/.test(monto.trim())) {
    return 'El monto solo puede tener hasta 2 decimales.';
  }
  return null; // Sin error
}

// Validar email
export function validarEmail(email) {
  if (!email || email.trim() === '') {
    return 'El correo es obligatorio.';
  }
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email.trim())) {
    return 'El formato del correo no es válido.';
  }
  return null;
}

// Validar contraseña
export function validarContrasena(contrasena) {
  if (!contrasena || contrasena.trim() === '') {
    return 'La contraseña es obligatoria.';
  }
  if (contrasena.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return null;
}

// Validar nombre (cuentas, etc.)
export function validarNombre(nombre, campo = 'Este campo') {
  if (!nombre || nombre.trim() === '') {
    return `${campo} es obligatorio.`;
  }
  if (nombre.trim().length < 2) {
    return `${campo} debe tener al menos 2 caracteres.`;
  }
  if (nombre.trim().length > 50) {
    return `${campo} no puede tener más de 50 caracteres.`;
  }
  return null;
}