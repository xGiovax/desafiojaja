import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../../contexto/ContextoAuth';
import { validarEmail, validarContrasena, mensajeErrorAuth } from '../../utils/errores';

export default function PantallaRegistro({ navigation }) {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const { registrarse } = useAuth();

  const validar = () => {
    const nuevosErrores = {};
    const errorEmail = validarEmail(email);
    const errorContrasena = validarContrasena(contrasena);
    if (errorEmail) nuevosErrores.email = errorEmail;
    if (errorContrasena) nuevosErrores.contrasena = errorContrasena;
    if (!confirmar || confirmar.trim() === '') {
      nuevosErrores.confirmar = 'Confirma tu contraseña.';
    } else if (contrasena !== confirmar) {
      nuevosErrores.confirmar = 'Las contraseñas no coinciden.';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const manejarRegistro = async () => {
    if (!validar()) return;
    try {
      setCargando(true);
      await registrarse(email.trim(), contrasena);
    } catch (error) {
      Alert.alert('Error al registrarse', mensajeErrorAuth(error));
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={estilos.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={estilos.formulario}>
        <Text style={estilos.titulo}> Finanzas App</Text>
        <Text style={estilos.subtitulo}>Crea tu cuenta nueva</Text>

        <TextInput
          style={[estilos.entrada, errores.email && estilos.entradaError]}
          placeholder="Correo electrónico"
          value={email}
          onChangeText={v => { setEmail(v); setErrores(e => ({ ...e, email: null })); }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errores.email && <Text style={estilos.textoError}>{errores.email}</Text>}

        <TextInput
          style={[estilos.entrada, errores.contrasena && estilos.entradaError]}
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={contrasena}
          onChangeText={v => { setContrasena(v); setErrores(e => ({ ...e, contrasena: null })); }}
          secureTextEntry
        />
        {errores.contrasena && <Text style={estilos.textoError}>{errores.contrasena}</Text>}

        <TextInput
          style={[estilos.entrada, errores.confirmar && estilos.entradaError]}
          placeholder="Confirmar contraseña"
          value={confirmar}
          onChangeText={v => { setConfirmar(v); setErrores(e => ({ ...e, confirmar: null })); }}
          secureTextEntry
        />
        {errores.confirmar && <Text style={estilos.textoError}>{errores.confirmar}</Text>}

        <TouchableOpacity
          style={estilos.boton}
          onPress={manejarRegistro}
          disabled={cargando}
        >
          {cargando
            ? <ActivityIndicator color="#fff" />
            : <Text style={estilos.textoBoton}>Registrarse</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={estilos.enlace}>¿Ya tienes cuenta? Inicia sesión</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  formulario: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  titulo: {
    fontSize: 32, fontWeight: 'bold',
    textAlign: 'center', color: '#1a1a2e', marginBottom: 8
  },
  subtitulo: {
    fontSize: 16, textAlign: 'center',
    color: '#666', marginBottom: 40
  },
  entrada: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 15, marginBottom: 4, fontSize: 16,
    borderWidth: 1, borderColor: '#ddd'
  },
  entradaError: { borderColor: '#dc2626', borderWidth: 1.5 },
  textoError: { color: '#dc2626', fontSize: 12, marginBottom: 10, marginLeft: 4 },
  boton: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    padding: 15, alignItems: 'center',
    marginTop: 10, marginBottom: 20
  },
  textoBoton: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  enlace: { textAlign: 'center', color: '#4f46e5', fontSize: 15 },
});