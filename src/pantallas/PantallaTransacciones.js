import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../contexto/ContextoAuth';
import {
  escucharTransacciones, crearTransaccion,
  editarTransaccion, eliminarTransaccion
} from '../firebase/transacciones';
import { escucharCuentas } from '../firebase/cuentas';
import { validarMonto, mensajeErrorFirestore } from '../utils/errores';
const CATEGORIAS_GASTO = [
  '🍔 Comida', '🚗 Transporte', '🏠 Hogar', '💊 Salud',
  '🎮 Entretenimiento', '👕 Ropa', '📚 Educación', '💡 Servicios', '📦 Otro'
];

const CATEGORIAS_INGRESO = [
  '💼 Salario', '💰 Freelance', '🎁 Regalo', '📈 Inversión', '💵 Otro ingreso'
];

const TRANSACCION_VACIA = {
  monto: '',
  tipo: 'gasto',
  categoria: '',
  cuentaId: '',
  descripcion: '',
};

export default function PantallaTransacciones() {
  const { usuario } = useAuth();
  const [transacciones, setTransacciones] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [transaccionActual, setTransaccionActual] = useState(TRANSACCION_VACIA);
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroCuenta, setFiltroCuenta] = useState('');

  useEffect(() => {
    const unsubTrans = escucharTransacciones(usuario.uid, setTransacciones);
    const unsubCuentas = escucharCuentas(usuario.uid, setCuentas);
    return () => {
      unsubTrans();
      unsubCuentas();
    };
  }, []);

  // Filtrar transacciones
  const transaccionesFiltradas = transacciones.filter(t => {
    if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false;
    if (filtroCategoria && t.categoria !== filtroCategoria) return false;
    if (filtroCuenta && t.cuentaId !== filtroCuenta) return false;
    return true;
  });

  const abrirModalNuevo = () => {
    setTransaccionActual({
      ...TRANSACCION_VACIA,
      cuentaId: cuentas[0]?.id || '',
      categoria: CATEGORIAS_GASTO[0],
    });
    setEditando(null);
    setModalVisible(true);
  };

  const abrirModalEditar = (transaccion) => {
    setTransaccionActual({
      monto: transaccion.monto.toString(),
      tipo: transaccion.tipo,
      categoria: transaccion.categoria,
      cuentaId: transaccion.cuentaId,
      descripcion: transaccion.descripcion || '',
    });
    setEditando(transaccion.id);
    setModalVisible(true);
  };

 const manejarGuardar = async () => {
  // Validar monto
  const errorMonto = validarMonto(transaccionActual.monto);
  if (errorMonto) {
    Alert.alert('Monto inválido', errorMonto);
    return;
  }
  if (!transaccionActual.cuentaId) {
    Alert.alert('Cuenta requerida', 'Por favor selecciona una cuenta.');
    return;
  }
  if (!transaccionActual.categoria) {
    Alert.alert('Categoría requerida', 'Por favor selecciona una categoría.');
    return;
  }
  try {
    setCargando(true);
    const datos = {
      monto: parseFloat(transaccionActual.monto),
      tipo: transaccionActual.tipo,
      categoria: transaccionActual.categoria,
      cuentaId: transaccionActual.cuentaId,
      descripcion: transaccionActual.descripcion,
    };
    if (editando) {
      await editarTransaccion(editando, datos);
    } else {
      await crearTransaccion(usuario.uid, datos);
    }
    setModalVisible(false);
    setTransaccionActual(TRANSACCION_VACIA);
    setEditando(null);
  } catch (error) {
    Alert.alert('Error', mensajeErrorFirestore(error));
  } finally {
    setCargando(false);
  }
};

  const manejarEliminar = (transaccion) => {
    Alert.alert(
      'Eliminar transacción',
      '¿Estás seguro que deseas eliminar esta transacción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarTransaccion(transaccion.id);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  const nombreCuenta = (cuentaId) => {
    return cuentas.find(c => c.id === cuentaId)?.nombre || 'Sin cuenta';
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const categorias = transaccionActual.tipo === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO;

  const renderTransaccion = ({ item }) => (
    <TouchableOpacity
      style={estilos.tarjetaTransaccion}
      onPress={() => abrirModalEditar(item)}
      onLongPress={() => manejarEliminar(item)}
    >
      <View style={estilos.filaTransaccion}>
        <View style={[
          estilos.iconoCategoria,
          { backgroundColor: item.tipo === 'ingreso' ? '#dcfce7' : '#fee2e2' }
        ]}>
          <Text style={estilos.emojiCategoria}>
            {item.categoria?.split(' ')[0] || '📦'}
          </Text>
        </View>
        <View style={estilos.infoTransaccion}>
          <Text style={estilos.categoriaTransaccion}>{item.categoria}</Text>
          <Text style={estilos.cuentaTransaccion}>{nombreCuenta(item.cuentaId)}</Text>
          {item.descripcion ? (
            <Text style={estilos.descripcionTransaccion} numberOfLines={1}>
              {item.descripcion}
            </Text>
          ) : null}
        </View>
        <View style={estilos.derechaTransaccion}>
          <Text style={[
            estilos.montoTransaccion,
            { color: item.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }
          ]}>
            {item.tipo === 'ingreso' ? '+' : '-'}${item.monto?.toFixed(2)}
          </Text>
          <Text style={estilos.fechaTransaccion}>{formatearFecha(item.fecha)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={estilos.contenedor}>
      {/* Encabezado */}
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Transacciones</Text>
        <TouchableOpacity style={estilos.btnAgregar} onPress={abrirModalNuevo}>
          <Text style={estilos.textoBtnAgregar}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros tipo */}
      <View style={estilos.contenedorFiltros}>
        {['todos', 'gasto', 'ingreso'].map(tipo => (
          <TouchableOpacity
            key={tipo}
            style={[estilos.btnFiltro, filtroTipo === tipo && estilos.btnFiltroActivo]}
            onPress={() => setFiltroTipo(tipo)}
          >
            <Text style={[
              estilos.textoFiltro,
              filtroTipo === tipo && estilos.textoFiltroActivo
            ]}>
              {tipo === 'todos' ? 'Todos' : tipo === 'gasto' ? 'Gastos' : 'Ingresos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtro por cuenta */}
      {cuentas.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={estilos.filtrosCuenta}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          <TouchableOpacity
            style={[estilos.chipCuenta, !filtroCuenta && estilos.chipCuentaActivo]}
            onPress={() => setFiltroCuenta('')}
          >
            <Text style={[estilos.textoChip, !filtroCuenta && estilos.textoChipActivo]}>
              Todas
            </Text>
          </TouchableOpacity>
          {cuentas.map(cuenta => (
            <TouchableOpacity
              key={cuenta.id}
              style={[estilos.chipCuenta, filtroCuenta === cuenta.id && estilos.chipCuentaActivo]}
              onPress={() => setFiltroCuenta(filtroCuenta === cuenta.id ? '' : cuenta.id)}
            >
              <Text style={[
                estilos.textoChip,
                filtroCuenta === cuenta.id && estilos.textoChipActivo
              ]}>
                {cuenta.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Lista */}
      {transaccionesFiltradas.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.textoVacio}></Text>
          <Text style={estilos.textoVacioSub}>No hay transacciones</Text>
          <Text style={estilos.textoVacioHint}>Toca "+ Nueva" para agregar una</Text>
        </View>
      ) : (
        <FlatList
          data={transaccionesFiltradas}
          keyExtractor={item => item.id}
          renderItem={renderTransaccion}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        />
      )}

      {/* Modal agregar/editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={estilos.fondoModal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={estilos.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={estilos.tituloModal}>
                {editando ? 'Editar Transacción' : 'Nueva Transacción'}
              </Text>

              {/* Tipo ingreso/gasto */}
              <View style={estilos.selectorTipo}>
                {['gasto', 'ingreso'].map(tipo => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      estilos.btnTipo,
                      transaccionActual.tipo === tipo && (
                        tipo === 'gasto' ? estilos.btnGastoActivo : estilos.btnIngresoActivo
                      )
                    ]}
                    onPress={() => {
                      const nuevaCategoria = tipo === 'gasto'
                        ? CATEGORIAS_GASTO[0]
                        : CATEGORIAS_INGRESO[0];
                      setTransaccionActual({
                        ...transaccionActual,
                        tipo,
                        categoria: nuevaCategoria
                      });
                    }}
                  >
                    <Text style={[
                      estilos.textoTipo,
                      transaccionActual.tipo === tipo && estilos.textoTipoActivo
                    ]}>
                      {tipo === 'gasto' ? ' Gasto' : ' Ingreso'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Monto */}
              <TextInput
                style={estilos.entradaMonto}
                placeholder="0.00"
                value={transaccionActual.monto}
                onChangeText={v => setTransaccionActual({ ...transaccionActual, monto: v })}
                keyboardType="decimal-pad"
              />

              {/* Categorías */}
              <Text style={estilos.labelSeccion}>Categoría</Text>
              <View style={estilos.contenedorCategorias}>
                {categorias.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      estilos.btnCategoria,
                      transaccionActual.categoria === cat && estilos.btnCategoriaActiva
                    ]}
                    onPress={() => setTransaccionActual({ ...transaccionActual, categoria: cat })}
                  >
                    <Text style={[
                      estilos.textoCategoria,
                      transaccionActual.categoria === cat && estilos.textoCategoriaActiva
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cuenta */}
              <Text style={estilos.labelSeccion}>Cuenta</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {cuentas.map(cuenta => (
                  <TouchableOpacity
                    key={cuenta.id}
                    style={[
                      estilos.btnCuenta,
                      transaccionActual.cuentaId === cuenta.id && estilos.btnCuentaActiva
                    ]}
                    onPress={() => setTransaccionActual({ ...transaccionActual, cuentaId: cuenta.id })}
                  >
                    <Text style={[
                      estilos.textoCuenta,
                      transaccionActual.cuentaId === cuenta.id && estilos.textoCuentaActiva
                    ]}>
                      {cuenta.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Descripción */}
              <Text style={estilos.labelSeccion}>Descripción (opcional)</Text>
              <TextInput
                style={estilos.entrada}
                placeholder="Agrega una nota..."
                value={transaccionActual.descripcion}
                onChangeText={v => setTransaccionActual({ ...transaccionActual, descripcion: v })}
                multiline
              />

              <TouchableOpacity
                style={estilos.btnGuardar}
                onPress={manejarGuardar}
                disabled={cargando}
              >
                {cargando
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={estilos.textoGuardar}>
                    {editando ? 'Guardar cambios' : 'Agregar transacción'}
                  </Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.btnCancelar}
                onPress={() => setModalVisible(false)}
              >
                <Text style={estilos.textoCancelar}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  encabezado: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, paddingTop: 50,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' },
  btnAgregar: {
    backgroundColor: '#4f46e5', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8
  },
  textoBtnAgregar: { color: '#fff', fontWeight: 'bold' },
  contenedorFiltros: {
    flexDirection: 'row', padding: 12,
    backgroundColor: '#fff', gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  btnFiltro: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#f0f4f8', alignItems: 'center'
  },
  btnFiltroActivo: { backgroundColor: '#4f46e5' },
  textoFiltro: { color: '#666', fontWeight: '600' },
  textoFiltroActivo: { color: '#fff' },
  filtrosCuenta: {
    backgroundColor: '#fff', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  chipCuenta: {
    borderWidth: 1, borderColor: '#ddd',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6
  },
  chipCuentaActivo: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  textoChip: { color: '#555', fontSize: 13 },
  textoChipActivo: { color: '#fff' },
  tarjetaTransaccion: {
    backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 10, padding: 14,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3
  },
  filaTransaccion: { flexDirection: 'row', alignItems: 'center' },
  iconoCategoria: {
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  emojiCategoria: { fontSize: 22 },
  infoTransaccion: { flex: 1 },
  categoriaTransaccion: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  cuentaTransaccion: { fontSize: 12, color: '#888', marginTop: 2 },
  descripcionTransaccion: { fontSize: 12, color: '#aaa', marginTop: 1 },
  derechaTransaccion: { alignItems: 'flex-end' },
  montoTransaccion: { fontSize: 16, fontWeight: 'bold' },
  fechaTransaccion: { fontSize: 11, color: '#aaa', marginTop: 3 },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoVacio: { fontSize: 50 },
  textoVacioSub: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10 },
  textoVacioHint: { fontSize: 14, color: '#999', marginTop: 5 },
  fondoModal: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'
  },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24,
    paddingBottom: 40, maxHeight: '90%'
  },
  tituloModal: {
    fontSize: 20, fontWeight: 'bold',
    color: '#1a1a2e', marginBottom: 20, textAlign: 'center'
  },
  selectorTipo: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  btnTipo: {
    flex: 1, padding: 12, borderRadius: 12,
    backgroundColor: '#f0f4f8', alignItems: 'center'
  },
  btnGastoActivo: { backgroundColor: '#fee2e2' },
  btnIngresoActivo: { backgroundColor: '#dcfce7' },
  textoTipo: { fontWeight: '600', color: '#555' },
  textoTipoActivo: { color: '#1a1a2e' },
  entradaMonto: {
    fontSize: 32, fontWeight: 'bold', textAlign: 'center',
    backgroundColor: '#f0f4f8', borderRadius: 12,
    padding: 16, marginBottom: 16, color: '#1a1a2e'
  },
  labelSeccion: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '600' },
  contenedorCategorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  btnCategoria: {
    borderWidth: 1, borderColor: '#ddd',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7
  },
  btnCategoriaActiva: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  textoCategoria: { color: '#555', fontSize: 13 },
  textoCategoriaActiva: { color: '#fff' },
  btnCuenta: {
    borderWidth: 1, borderColor: '#ddd',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8
  },
  btnCuentaActiva: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  textoCuenta: { color: '#555' },
  textoCuentaActiva: { color: '#fff' },
  entrada: {
    backgroundColor: '#f0f4f8', borderRadius: 12,
    padding: 14, fontSize: 15, marginBottom: 16,
    borderWidth: 1, borderColor: '#ddd', minHeight: 60
  },
  btnGuardar: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    padding: 15, alignItems: 'center', marginBottom: 10
  },
  textoGuardar: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnCancelar: { padding: 12, alignItems: 'center' },
  textoCancelar: { color: '#666', fontSize: 15 },
});