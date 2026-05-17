import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useAuth } from '../contexto/ContextoAuth';
import {
  escucharPresupuestos, crearPresupuesto,
  actualizarPresupuesto, eliminarPresupuesto
} from '../firebase/presupuestos';
import { escucharTransacciones } from '../firebase/transacciones';
import { validarMonto, mensajeErrorFirestore } from '../utils/errores';

const CATEGORIAS_GASTO = [
  '🍔 Comida', '🚗 Transporte', '🏠 Hogar', '💊 Salud',
  '🎮 Entretenimiento', '👕 Ropa', '📚 Educación', '💡 Servicios', '📦 Otro'
];

export default function PantallaPresupuestos() {
  const { usuario } = useAuth();
  const [presupuestos, setPresupuestos] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(CATEGORIAS_GASTO[0]);
  const [limiteTexto, setLimiteTexto] = useState('');
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const unsubPresupuestos = escucharPresupuestos(usuario.uid, setPresupuestos);
    const unsubTrans = escucharTransacciones(usuario.uid, setTransacciones);
    return () => {
      unsubPresupuestos();
      unsubTrans();
    };
  }, []);

  // Calcular gasto del mes actual por categoría
  const calcularGastoMes = (categoria) => {
    const ahora = new Date();
    const mes = ahora.getMonth();
    const anio = ahora.getFullYear();

    return transacciones
      .filter(t => {
        if (t.tipo !== 'gasto') return false;
        if (t.categoria !== categoria) return false;
        const fecha = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha);
        return fecha.getMonth() === mes && fecha.getFullYear() === anio;
      })
      .reduce((total, t) => total + t.monto, 0);
  };

  const calcularPorcentaje = (gastado, limite) => {
    if (limite === 0) return 0;
    return Math.min((gastado / limite) * 100, 100);
  };

  const colorBarra = (porcentaje) => {
    if (porcentaje >= 100) return '#dc2626';
    if (porcentaje >= 80) return '#f97316';
    return '#16a34a';
  };

  const abrirModalNuevo = () => {
    const categoriasDisponibles = CATEGORIAS_GASTO.filter(
      cat => !presupuestos.find(p => p.categoria === cat)
    );
    if (categoriasDisponibles.length === 0) {
      Alert.alert('Aviso', 'Ya tienes presupuesto para todas las categorías');
      return;
    }
    setCategoriaSeleccionada(categoriasDisponibles[0]);
    setLimiteTexto('');
    setEditando(null);
    setModalVisible(true);
  };

  const abrirModalEditar = (presupuesto) => {
    setCategoriaSeleccionada(presupuesto.categoria);
    setLimiteTexto(presupuesto.limite.toString());
    setEditando(presupuesto.id);
    setModalVisible(true);
  };

const manejarGuardar = async () => {
  const errorMonto = validarMonto(limiteTexto);
  if (errorMonto) {
    Alert.alert('Límite inválido', errorMonto);
    return;
  }
  try {
    setCargando(true);
    if (editando) {
      await actualizarPresupuesto(editando, limiteTexto);
    } else {
      await crearPresupuesto(usuario.uid, categoriaSeleccionada, limiteTexto);
    }
    setModalVisible(false);
    setLimiteTexto('');
    setEditando(null);
  } catch (error) {
    Alert.alert('Error', mensajeErrorFirestore(error));
  } finally {
    setCargando(false);
  }
};

  const manejarEliminar = (presupuesto) => {
    Alert.alert(
      'Eliminar presupuesto',
      `¿Eliminar el presupuesto de "${presupuesto.categoria}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarPresupuesto(presupuesto.id);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  const categoriasDisponibles = CATEGORIAS_GASTO.filter(
    cat => !presupuestos.find(p => p.categoria === cat) || cat === categoriaSeleccionada
  );

  const renderPresupuesto = ({ item }) => {
    const gastado = calcularGastoMes(item.categoria);
    const porcentaje = calcularPorcentaje(gastado, item.limite);
    const color = colorBarra(porcentaje);
    const excedido = gastado > item.limite;
    const enAlerta = porcentaje >= 80 && !excedido;

    return (
      <TouchableOpacity
        style={estilos.tarjeta}
        onPress={() => abrirModalEditar(item)}
        onLongPress={() => manejarEliminar(item)}
      >
        {/* Alerta si supera 80% o 100% */}
        {(enAlerta || excedido) && (
          <View style={[
            estilos.bannerAlerta,
            { backgroundColor: excedido ? '#fee2e2' : '#fff7ed' }
          ]}>
            <Text style={[
              estilos.textoAlerta,
              { color: excedido ? '#dc2626' : '#f97316' }
            ]}>
              {excedido ? '🚨 ¡Presupuesto excedido!' : '⚠️ Cerca del límite (80%)'}
            </Text>
          </View>
        )}

        <View style={estilos.filaEncabezado}>
          <Text style={estilos.emojiCategoria}>
            {item.categoria.split(' ')[0]}
          </Text>
          <View style={estilos.infoCategoria}>
            <Text style={estilos.nombreCategoria}>{item.categoria}</Text>
            <Text style={estilos.mesActual}>Este mes</Text>
          </View>
          <View style={estilos.montos}>
            <Text style={[estilos.montoGastado, { color }]}>
              ${gastado.toFixed(2)}
            </Text>
            <Text style={estilos.montoLimite}>de ${item.limite.toFixed(2)}</Text>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={estilos.contenedorBarra}>
          <View style={estilos.barraFondo}>
            <View style={[
              estilos.barraProgreso,
              { width: `${porcentaje}%`, backgroundColor: color }
            ]} />
          </View>
          <Text style={[estilos.textoPorcentaje, { color }]}>
            {porcentaje.toFixed(0)}%
          </Text>
        </View>

        <Text style={estilos.textoRestante}>
          {excedido
            ? `Excedido por $${(gastado - item.limite).toFixed(2)}`
            : `Disponible: $${(item.limite - gastado).toFixed(2)}`
          }
        </Text>
      </TouchableOpacity>
    );
  };

  // Resumen general
  const totalPresupuestado = presupuestos.reduce((t, p) => t + p.limite, 0);
  const totalGastado = presupuestos.reduce((t, p) => t + calcularGastoMes(p.categoria), 0);

  return (
    <View style={estilos.contenedor}>
      {/* Encabezado */}
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Presupuestos</Text>
        <TouchableOpacity style={estilos.btnAgregar} onPress={abrirModalNuevo}>
          <Text style={estilos.textoBtnAgregar}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen del mes */}
      {presupuestos.length > 0 && (
        <View style={estilos.resumen}>
          <View style={estilos.resumenItem}>
            <Text style={estilos.resumenLabel}>Presupuestado</Text>
            <Text style={estilos.resumenMonto}>${totalPresupuestado.toFixed(2)}</Text>
          </View>
          <View style={estilos.separadorResumen} />
          <View style={estilos.resumenItem}>
            <Text style={estilos.resumenLabel}>Gastado</Text>
            <Text style={[estilos.resumenMonto, { color: '#dc2626' }]}>
              ${totalGastado.toFixed(2)}
            </Text>
          </View>
          <View style={estilos.separadorResumen} />
          <View style={estilos.resumenItem}>
            <Text style={estilos.resumenLabel}>Disponible</Text>
            <Text style={[estilos.resumenMonto, { color: '#16a34a' }]}>
              ${Math.max(totalPresupuestado - totalGastado, 0).toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* Lista */}
      {presupuestos.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.textoVacio}></Text>
          <Text style={estilos.textoVacioSub}>Sin presupuestos aún</Text>
          <Text style={estilos.textoVacioHint}>Toca "+ Nuevo" para crear uno</Text>
        </View>
      ) : (
        <FlatList
          data={presupuestos}
          keyExtractor={item => item.id}
          renderItem={renderPresupuesto}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        />
      )}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            <Text style={estilos.tituloModal}>
              {editando ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
            </Text>

            {/* Selector de categoría (solo al crear) */}
            {!editando && (
              <>
                <Text style={estilos.labelSeccion}>Categoría</Text>
                <ScrollView
                  style={{ maxHeight: 130 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={estilos.contenedorCategorias}>
                    {categoriasDisponibles.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          estilos.btnCategoria,
                          categoriaSeleccionada === cat && estilos.btnCategoriaActiva
                        ]}
                        onPress={() => setCategoriaSeleccionada(cat)}
                      >
                        <Text style={[
                          estilos.textoCategoria,
                          categoriaSeleccionada === cat && estilos.textoCategoriaActiva
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {editando && (
              <View style={estilos.categoriaEditando}>
                <Text style={estilos.emojiGrande}>
                  {categoriaSeleccionada.split(' ')[0]}
                </Text>
                <Text style={estilos.nombreCategoriaEditando}>
                  {categoriaSeleccionada}
                </Text>
              </View>
            )}

            {/* Límite */}
            <Text style={estilos.labelSeccion}>Límite mensual ($)</Text>
            <TextInput
              style={estilos.entradaMonto}
              placeholder="0.00"
              value={limiteTexto}
              onChangeText={setLimiteTexto}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={estilos.btnGuardar}
              onPress={manejarGuardar}
              disabled={cargando}
            >
              {cargando
                ? <ActivityIndicator color="#fff" />
                : <Text style={estilos.textoGuardar}>
                  {editando ? 'Guardar cambios' : 'Crear presupuesto'}
                </Text>
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
    alignItems: 'center', padding: 20, paddingTop: 50,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' },
  btnAgregar: {
    backgroundColor: '#4f46e5', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8
  },
  textoBtnAgregar: { color: '#fff', fontWeight: 'bold' },
  resumen: {
    flexDirection: 'row', backgroundColor: '#fff',
    margin: 16, borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3
  },
  resumenItem: { flex: 1, alignItems: 'center' },
  resumenLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  resumenMonto: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  separadorResumen: { width: 1, backgroundColor: '#eee', marginVertical: 4 },
  tarjeta: {
    backgroundColor: '#fff', borderRadius: 16,
    marginBottom: 12, overflow: 'hidden',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3
  },
  bannerAlerta: { paddingHorizontal: 16, paddingVertical: 8 },
  textoAlerta: { fontSize: 13, fontWeight: '600' },
  filaEncabezado: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, paddingBottom: 8
  },
  emojiCategoria: { fontSize: 28, marginRight: 12 },
  infoCategoria: { flex: 1 },
  nombreCategoria: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  mesActual: { fontSize: 12, color: '#aaa', marginTop: 2 },
  montos: { alignItems: 'flex-end' },
  montoGastado: { fontSize: 18, fontWeight: 'bold' },
  montoLimite: { fontSize: 12, color: '#999', marginTop: 2 },
  contenedorBarra: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 4
  },
  barraFondo: {
    flex: 1, height: 8, backgroundColor: '#f0f4f8',
    borderRadius: 4, overflow: 'hidden', marginRight: 8
  },
  barraProgreso: { height: '100%', borderRadius: 4 },
  textoPorcentaje: { fontSize: 12, fontWeight: 'bold', width: 36, textAlign: 'right' },
  textoRestante: {
    fontSize: 12, color: '#888',
    paddingHorizontal: 16, paddingBottom: 14
  },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoVacio: { fontSize: 50 },
  textoVacioSub: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10 },
  textoVacioHint: { fontSize: 14, color: '#999', marginTop: 5 },
  fondoModal: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'
  },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40
  },
  tituloModal: {
    fontSize: 20, fontWeight: 'bold',
    color: '#1a1a2e', marginBottom: 20, textAlign: 'center'
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
  categoriaEditando: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f4f8', borderRadius: 12,
    padding: 14, marginBottom: 16, gap: 10
  },
  emojiGrande: { fontSize: 28 },
  nombreCategoriaEditando: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
  entradaMonto: {
    fontSize: 28, fontWeight: 'bold', textAlign: 'center',
    backgroundColor: '#f0f4f8', borderRadius: 12,
    padding: 16, marginBottom: 20, color: '#1a1a2e',
    borderWidth: 1, borderColor: '#ddd'
  },
  btnGuardar: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    padding: 15, alignItems: 'center', marginBottom: 10
  },
  textoGuardar: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnCancelar: { padding: 12, alignItems: 'center' },
  textoCancelar: { color: '#666', fontSize: 15 },
});