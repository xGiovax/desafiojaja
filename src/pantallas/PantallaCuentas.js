import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { useAuth } from '../contexto/ContextoAuth';
import { escucharCuentas, crearCuenta, eliminarCuenta } from '../firebase/cuentas';
import { escucharTransacciones } from '../firebase/transacciones';
import { validarNombre, mensajeErrorFirestore } from '../utils/errores';

const TIPOS_CUENTA = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Cuenta banco', 'Ahorros', 'Otro'];

export default function PantallaCuentas() {
  const { usuario } = useAuth();
  const [cuentas, setCuentas] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nombreCuenta, setNombreCuenta] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('Efectivo');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const unsubCuentas = escucharCuentas(usuario.uid, setCuentas);
    const unsubTrans = escucharTransacciones(usuario.uid, setTransacciones);
    return () => {
      unsubCuentas();
      unsubTrans();
    };
  }, []);

  const calcularSaldo = (cuentaId) => {
    return transacciones
      .filter(t => t.cuentaId === cuentaId)
      .reduce((total, t) => {
        return t.tipo === 'ingreso' ? total + t.monto : total - t.monto;
      }, 0);
  };

const manejarCrearCuenta = async () => {
  const errorNombre = validarNombre(nombreCuenta, 'El nombre de la cuenta');
  if (errorNombre) {
    Alert.alert('Nombre inválido', errorNombre);
    return;
  }
  try {
    setCargando(true);
    await crearCuenta(usuario.uid, nombreCuenta.trim(), tipoSeleccionado);
    setNombreCuenta('');
    setTipoSeleccionado('Efectivo');
    setModalVisible(false);
  } catch (error) {
    Alert.alert('Error', mensajeErrorFirestore(error));
  } finally {
    setCargando(false);
  }
};

  const manejarEliminarCuenta = (cuenta) => {
    Alert.alert(
      'Eliminar cuenta',
      `¿Deseas eliminar la cuenta "${cuenta.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarCuenta(cuenta.id);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la cuenta');
            }
          }
        }
      ]
    );
  };

  const iconoTipo = (tipo) => {
    const iconos = {
      'Efectivo': '💵',
      'Tarjeta débito': '💳',
      'Tarjeta crédito': '💳',
      'Cuenta banco': '🏦',
      'Ahorros': '🐷',
      'Otro': '📁'
    };
    return iconos[tipo] || '📁';
  };

  const renderCuenta = ({ item }) => {
    const saldo = calcularSaldo(item.id);
    return (
      <View style={estilos.tarjetaCuenta}>
        <View style={estilos.filaCuenta}>
          <Text style={estilos.iconoCuenta}>{iconoTipo(item.tipo)}</Text>
          <View style={estilos.infoCuenta}>
            <Text style={estilos.nombreCuenta}>{item.nombre}</Text>
            <Text style={estilos.tipoCuenta}>{item.tipo}</Text>
          </View>
          <View style={estilos.derechaCuenta}>
            <Text style={[
              estilos.saldoCuenta,
              { color: saldo >= 0 ? '#16a34a' : '#dc2626' }
            ]}>
              ${saldo.toFixed(2)}
            </Text>
            <TouchableOpacity onPress={() => manejarEliminarCuenta(item)}>
              <Text style={estilos.btnEliminar}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const saldoTotal = cuentas.reduce((total, cuenta) => {
    return total + calcularSaldo(cuenta.id);
  }, 0);

  return (
    <View style={estilos.contenedor}>
      {/* Encabezado */}
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Mis Cuentas</Text>
        <TouchableOpacity
          style={estilos.btnAgregar}
          onPress={() => setModalVisible(true)}
        >
          <Text style={estilos.textoBtnAgregar}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjeta resumen total */}
      <View style={estilos.tarjetaTotal}>
        <Text style={estilos.labelTotal}>Balance Total</Text>
        <Text style={[
          estilos.montoTotal,
          { color: saldoTotal >= 0 ? '#16a34a' : '#dc2626' }
        ]}>
          ${saldoTotal.toFixed(2)}
        </Text>
        <Text style={estilos.numeroCuentas}>
          {cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'}
        </Text>
      </View>

      {/* Lista de cuentas */}
      {cuentas.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.textoVacio}></Text>
          <Text style={estilos.textoVacioSub}>No tienes cuentas aún</Text>
          <Text style={estilos.textoVacioHint}>Toca "+ Nueva" para crear una</Text>
        </View>
      ) : (
        <FlatList
          data={cuentas}
          keyExtractor={item => item.id}
          renderItem={renderCuenta}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Modal crear cuenta */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            <Text style={estilos.tituloModal}>Nueva Cuenta</Text>

            <TextInput
              style={estilos.entrada}
              placeholder="Nombre de la cuenta"
              value={nombreCuenta}
              onChangeText={setNombreCuenta}
            />

            <Text style={estilos.labelTipo}>Tipo de cuenta:</Text>
            <View style={estilos.contenedorTipos}>
              {TIPOS_CUENTA.map(tipo => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    estilos.btnTipo,
                    tipoSeleccionado === tipo && estilos.btnTipoActivo
                  ]}
                  onPress={() => setTipoSeleccionado(tipo)}
                >
                  <Text style={[
                    estilos.textoTipo,
                    tipoSeleccionado === tipo && estilos.textoTipoActivo
                  ]}>
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={estilos.btnGuardar}
              onPress={manejarCrearCuenta}
              disabled={cargando}
            >
              {cargando
                ? <ActivityIndicator color="#fff" />
                : <Text style={estilos.textoGuardar}>Crear Cuenta</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.btnCancelar}
              onPress={() => setModalVisible(false)}
            >
              <Text style={estilos.textoCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  encabezado: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20,
    paddingTop: 50, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' },
  btnAgregar: {
    backgroundColor: '#4f46e5', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8
  },
  textoBtnAgregar: { color: '#fff', fontWeight: 'bold' },
  tarjetaTotal: {
    margin: 20, backgroundColor: '#4f46e5',
    borderRadius: 16, padding: 20, alignItems: 'center'
  },
  labelTotal: { color: '#c7d2fe', fontSize: 14 },
  montoTotal: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginVertical: 4 },
  numeroCuentas: { color: '#c7d2fe', fontSize: 13 },
  tarjetaCuenta: {
    backgroundColor: '#fff', marginHorizontal: 20,
    marginBottom: 10, borderRadius: 12, padding: 15,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3
  },
  filaCuenta: { flexDirection: 'row', alignItems: 'center' },
  iconoCuenta: { fontSize: 28, marginRight: 12 },
  infoCuenta: { flex: 1 },
  nombreCuenta: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  tipoCuenta: { fontSize: 13, color: '#666', marginTop: 2 },
  derechaCuenta: { alignItems: 'flex-end' },
  saldoCuenta: { fontSize: 18, fontWeight: 'bold' },
  btnEliminar: { fontSize: 18, marginTop: 4 },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoVacio: { fontSize: 50 },
  textoVacioSub: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10 },
  textoVacioHint: { fontSize: 14, color: '#999', marginTop: 5 },
  fondoModal: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40
  },
  tituloModal: {
    fontSize: 20, fontWeight: 'bold',
    color: '#1a1a2e', marginBottom: 20, textAlign: 'center'
  },
  entrada: {
    backgroundColor: '#f0f4f8', borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#ddd'
  },
  labelTipo: { fontSize: 14, color: '#666', marginBottom: 10 },
  contenedorTipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  btnTipo: {
    borderWidth: 1, borderColor: '#ddd',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7
  },
  btnTipoActivo: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  textoTipo: { color: '#555', fontSize: 13 },
  textoTipoActivo: { color: '#fff' },
  btnGuardar: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    padding: 15, alignItems: 'center', marginBottom: 10
  },
  textoGuardar: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnCancelar: { padding: 12, alignItems: 'center' },
  textoCancelar: { color: '#666', fontSize: 15 },
});