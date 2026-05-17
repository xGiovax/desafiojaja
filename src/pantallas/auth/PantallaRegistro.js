import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../../contexto/ContextoAuth';

export default function PantallaRegistro({ navigation }) {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const { registrarse } = useAuth();

  const manejarRegistro = async () => {
    if (!email || !contrasena || !confirmar) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    if (contrasena !== confirmar) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (contrasena.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      setCargando(true);
      await registrarse(email, contrasena);
    } catch (error) {
      let mensaje = 'Error al registrarse';
      if (error.code === 'auth/email-already-in-use') mensaje = 'El correo ya está en uso';
      if (error.code === 'auth/invalid-email') mensaje = 'Correo inválido';
      Alert.alert('Error', mensaje);
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
        <Text style={estilos.titulo}>💰 Finanzas App</Text>
        <Text style={estilos.subtitulo}>Crea tu cuenta nueva</Text>

        <TextInput
          style={estilos.entrada}
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={estilos.entrada}
          placeholder="Contraseña"
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
        />

        <TextInput
          style={estilos.entrada}
          placeholder="Confirmar contraseña"
          value={confirmar}
          onChangeText={setConfirmar}
          secureTextEntry
        />

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
  contenedor: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  formulario: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  entrada: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  boton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  textoBoton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  enlace: {
    textAlign: 'center',
    color: '#4f46e5',
    fontSize: 15,
  },
});