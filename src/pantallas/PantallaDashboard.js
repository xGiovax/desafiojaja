import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../contexto/ContextoAuth';
import { escucharTransacciones } from '../firebase/transacciones';
import { escucharCuentas } from '../firebase/cuentas';
import { exportarPDF, exportarCSV } from '../firebase/exportar';

const { width } = Dimensions.get('window');

const COLORES_GRAFICA = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#d97706', '#16a34a', '#0891b2', '#4338ca', '#be185d'
];

export default function PantallaDashboard() {
  const { usuario, cerrarSesion } = useAuth();
  const [transacciones, setTransacciones] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [mesActual, setMesActual] = useState(new Date());
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const unsubTrans = escucharTransacciones(usuario.uid, setTransacciones);
    const unsubCuentas = escucharCuentas(usuario.uid, setCuentas);
    return () => {
      unsubTrans();
      unsubCuentas();
    };
  }, []);

  // Filtrar transacciones del mes seleccionado
  const transaccionesMes = transacciones.filter(t => {
    const fecha = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha);
    return (
      fecha.getMonth() === mesActual.getMonth() &&
      fecha.getFullYear() === mesActual.getFullYear()
    );
  });

  // Calcular totales
  const totalIngresos = transaccionesMes
    .filter(t => t.tipo === 'ingreso')
    .reduce((total, t) => total + t.monto, 0);

  const totalGastos = transaccionesMes
    .filter(t => t.tipo === 'gasto')
    .reduce((total, t) => total + t.monto, 0);

  const saldoNeto = totalIngresos - totalGastos;

  // Gastos por categoría
  const gastosPorCategoria = () => {
    const mapa = {};
    transaccionesMes
      .filter(t => t.tipo === 'gasto')
      .forEach(t => {
        const cat = t.categoria || 'Otro';
        mapa[cat] = (mapa[cat] || 0) + t.monto;
      });
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  };

  // Saldo de cada cuenta
  const calcularSaldoCuenta = (cuentaId) => {
    return transacciones
      .filter(t => t.cuentaId === cuentaId)
      .reduce((total, t) => {
        return t.tipo === 'ingreso' ? total + t.monto : total - t.monto;
      }, 0);
  };

  // Datos para gráfica de barras (últimos 6 meses)
  const datosBarras = () => {
    const meses = [];
    const ingresos = [];
    const gastos = [];
    const etiquetas = [];
    const nombresMeses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const mes = fecha.getMonth();
      const anio = fecha.getFullYear();

      const transMes = transacciones.filter(t => {
        const f = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha);
        return f.getMonth() === mes && f.getFullYear() === anio;
      });

      const ing = transMes.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
      const gas = transMes.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);

      etiquetas.push(nombresMeses[mes]);
      ingresos.push(ing);
      gastos.push(gas);
    }

    return { etiquetas, ingresos, gastos };
  };

  // Datos para gráfica circular
  const datosTorta = () => {
    const categorias = gastosPorCategoria();
    if (categorias.length === 0) return [];
    return categorias.map(([nombre, valor], i) => ({
      name: nombre.split(' ').slice(1).join(' ') || nombre,
      population: valor,
      color: COLORES_GRAFICA[i % COLORES_GRAFICA.length],
      legendFontColor: '#555',
      legendFontSize: 12,
    }));
  };

  const categorias = gastosPorCategoria();
  const barras = datosBarras();
  const torta = datosTorta();

  const configGrafica = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    labelColor: () => '#888',
    style: { borderRadius: 16 },
    propsForBackgroundLines: { stroke: '#f0f4f8' },
  };

  const nombreMes = mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const cambiarMes = (direccion) => {
    const nuevo = new Date(mesActual);
    nuevo.setMonth(nuevo.getMonth() + direccion);
    setMesActual(nuevo);
  };

  // Función para manejar las acciones de exportación
  const manejarExportar = () => {
    Alert.alert(
      'Exportar reporte',
      `¿En qué formato deseas exportar el reporte de ${nombreMes}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '📊 CSV',
          onPress: async () => {
            try {
              setExportando(true);
              await exportarCSV(transaccionesMes, cuentas, mesActual);
            } catch (e) {
              Alert.alert('Error', 'No se pudo exportar el CSV');
            } finally {
              setExportando(false);
            }
          }
        },
        {
          text: '📄 PDF',
          onPress: async () => {
            try {
              setExportando(true);
              await exportarPDF(transaccionesMes, cuentas, mesActual);
            } catch (e) {
              Alert.alert('Error', 'No se pudo exportar el PDF');
            } finally {
              setExportando(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={estilos.contenedor} showsVerticalScrollIndicator={false}>

      {/* Encabezado */}
      <View style={estilos.encabezado}>
        <View>
          <Text style={estilos.saludo}>Hola,</Text>
          <Text style={estilos.email} numberOfLines={1}>
            {usuario.email?.split('@')[0]}
          </Text>
        </View>
        <View style={estilos.botonesEncabezado}>
          <TouchableOpacity
            style={estilos.btnExportar}
            onPress={manejarExportar}
            disabled={exportando}
          >
            {exportando
              ? <ActivityIndicator size="small" color="#4f46e5" />
              : <Text style={estilos.textoBtnExportar}> Exportar</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={estilos.btnSalir} onPress={cerrarSesion}>
            <Text style={estilos.textoBtnSalir}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selector de mes */}
      <View style={estilos.selectorMes}>
        <TouchableOpacity onPress={() => cambiarMes(-1)} style={estilos.btnMes}>
          <Text style={estilos.textoBtnMes}>‹</Text>
        </TouchableOpacity>
        <Text style={estilos.textoMes}>{nombreMes}</Text>
        <TouchableOpacity onPress={() => cambiarMes(1)} style={estilos.btnMes}>
          <Text style={estilos.textoBtnMes}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjetas resumen */}
      <View style={estilos.contenedorTarjetas}>
        <View style={[estilos.tarjeta, { backgroundColor: '#4f46e5' }]}>
          <Text style={estilos.labelTarjeta}>Saldo neto</Text>
          <Text style={estilos.montoTarjeta}>${saldoNeto.toFixed(2)}</Text>
        </View>

        <View style={estilos.filaTarjetas}>
          <View style={[estilos.tarjetaMini, { backgroundColor: '#dcfce7' }]}>
            <Text style={estilos.labelTarjetaMini}> Ingresos</Text>
            <Text style={[estilos.montoTarjetaMini, { color: '#16a34a' }]}>
              ${totalIngresos.toFixed(2)}
            </Text>
          </View>
          <View style={[estilos.tarjetaMini, { backgroundColor: '#fee2e2' }]}>
            <Text style={estilos.labelTarjetaMini}> Gastos</Text>
            <Text style={[estilos.montoTarjetaMini, { color: '#dc2626' }]}>
              ${totalGastos.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Saldo por cuentas */}
      {cuentas.length > 0 && (
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Saldo por cuenta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {cuentas.map(cuenta => {
              const saldo = calcularSaldoCuenta(cuenta.id);
              return (
                <View key={cuenta.id} style={estilos.tarjetaCuenta}>
                  <Text style={estilos.nombreCuenta}>{cuenta.nombre}</Text>
                  <Text style={estilos.tipoCuenta}>{cuenta.tipo}</Text>
                  <Text style={[
                    estilos.saldoCuenta,
                    { color: saldo >= 0 ? '#16a34a' : '#dc2626' }
                  ]}>
                    ${saldo.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Gráfica de barras */}
      {transacciones.length > 0 && (
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}> Últimos 6 meses</Text>
          <View style={estilos.contenedorGrafica}>
            <BarChart
              data={{
                labels: barras.etiquetas,
                datasets: [{ data: barras.gastos }]
              }}
              width={width - 48}
              height={180}
              chartConfig={{
                ...configGrafica,
                color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})`,
              }}
              style={estilos.grafica}
              showValuesOnTopOfBars
              withInnerLines={false}
            />
            <Text style={estilos.leyendaGrafica}>Gastos por mes</Text>
          </View>
        </View>
      )}

      {/* Gráfica circular por categoría */}
      {torta.length > 0 && (
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}> Gastos por categoría</Text>
          <View style={estilos.contenedorGrafica}>
            <PieChart
              data={torta}
              width={width - 48}
              height={180}
              chartConfig={configGrafica}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="10"
              style={estilos.grafica}
            />
          </View>
        </View>
      )}

      {/* Desglose por categoría */}
      {categorias.length > 0 && (
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Desglose de gastos</Text>
          {categorias.map(([nombre, monto], index) => {
            const porcentaje = totalGastos > 0
              ? ((monto / totalGastos) * 100).toFixed(1)
              : 0;
            return (
              <View key={nombre} style={estilos.filaCategoria}>
                <View style={[
                  estilos.puntoColor,
                  { backgroundColor: COLORES_GRAFICA[index % COLORES_GRAFICA.length] }
                ]} />
                <Text style={estilos.nombreCategoriaDesglose} numberOfLines={1}>
                  {nombre}
                </Text>
                <View style={estilos.barraDesglose}>
                  <View style={[
                    estilos.barraDesgloseFill,
                    {
                      width: `${porcentaje}%`,
                      backgroundColor: COLORES_GRAFICA[index % COLORES_GRAFICA.length]
                    }
                  ]} />
                </View>
                <Text style={estilos.porcentajeDesglose}>{porcentaje}%</Text>
                <Text style={estilos.montoDesglose}>${monto.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Estado vacío */}
      {transacciones.length === 0 && (
        <View style={estilos.vacio}>
          <Text style={estilos.textoVacio}></Text>
          <Text style={estilos.textoVacioSub}>Sin datos aún</Text>
          <Text style={estilos.textoVacioHint}>
            Agrega transacciones para ver tus estadísticas
          </Text>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  encabezado: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, paddingTop: 50,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  saludo: { fontSize: 14, color: '#888' },
  email: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', maxWidth: 220 },
  botonesEncabezado: {
    flexDirection: 'row', gap: 8, alignItems: 'center'
  },
  btnExportar: {
    backgroundColor: '#e0e7ff', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    minWidth: 44, alignItems: 'center'
  },
  textoBtnExportar: { color: '#4f46e5', fontWeight: '600', fontSize: 13 },
  btnSalir: {
    backgroundColor: '#fee2e2', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8
  },
  textoBtnSalir: { color: '#dc2626', fontWeight: '600' },
  selectorMes: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  btnMes: { paddingHorizontal: 20 },
  textoBtnMes: { fontSize: 28, color: '#4f46e5', fontWeight: 'bold' },
  textoMes: {
    fontSize: 16, fontWeight: '600',
    color: '#1a1a2e', textTransform: 'capitalize', minWidth: 160, textAlign: 'center'
  },
  contenedorTarjetas: { padding: 16, gap: 10 },
  tarjeta: {
    borderRadius: 16, padding: 20,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4
  },
  labelTarjeta: { color: '#c7d2fe', fontSize: 14 },
  montoTarjeta: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  filaTarjetas: { flexDirection: 'row', gap: 10 },
  tarjetaMini: {
    flex: 1, borderRadius: 14, padding: 14,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3
  },
  labelTarjetaMini: { fontSize: 13, color: '#555' },
  montoTarjetaMini: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  seccion: {
    backgroundColor: '#fff', marginHorizontal: 16,
    marginBottom: 16, borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3
  },
  tituloSeccion: {
    fontSize: 16, fontWeight: 'bold',
    color: '#1a1a2e', marginBottom: 14
  },
  tarjetaCuenta: {
    backgroundColor: '#f0f4f8', borderRadius: 12,
    padding: 14, marginRight: 10, minWidth: 130
  },
  nombreCuenta: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  tipoCuenta: { fontSize: 11, color: '#aaa', marginTop: 2 },
  saldoCuenta: { fontSize: 18, fontWeight: 'bold', marginTop: 6 },
  contenedorGrafica: { alignItems: 'center' },
  grafica: { borderRadius: 12 },
  leyendaGrafica: {
    fontSize: 12, color: '#aaa',
    textAlign: 'center', marginTop: 6
  },
  filaCategoria: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, gap: 8
  },
  puntoColor: { width: 10, height: 10, borderRadius: 5 },
  nombreCategoriaDesglose: { fontSize: 13, color: '#555', width: 100 },
  barraDesglose: {
    flex: 1, height: 8, backgroundColor: '#f0f4f8',
    borderRadius: 4, overflow: 'hidden'
  },
  barraDesgloseFill: { height: '100%', borderRadius: 4 },
  porcentajeDesglose: { fontSize: 12, color: '#888', width: 36, textAlign: 'right' },
  montoDesglose: { fontSize: 13, fontWeight: '600', color: '#1a1a2e', width: 70, textAlign: 'right' },
  vacio: {
    alignItems: 'center', justifyContent: 'center',
    padding: 40
  },
  textoVacio: { fontSize: 50 },
  textoVacioSub: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10 },
  textoVacioHint: { fontSize: 14, color: '#999', marginTop: 5, textAlign: 'center' },
});