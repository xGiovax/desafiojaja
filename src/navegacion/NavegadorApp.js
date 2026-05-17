import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../contexto/ContextoAuth';

import PantallaLogin from '../pantallas/auth/PantallaLogin';
import PantallaRegistro from '../pantallas/auth/PantallaRegistro';
import PantallaDashboard from '../pantallas/PantallaDashboard';
import PantallaCuentas from '../pantallas/PantallaCuentas';
import PantallaTransacciones from '../pantallas/PantallaTransacciones';
import PantallaPresupuestos from '../pantallas/PantallaPresupuestos';

const Pila = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function TabsPrincipales() {
  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="Dashboard" component={PantallaDashboard} 
        options={{ title: 'Inicio' }} />
      <Tabs.Screen name="Transacciones" component={PantallaTransacciones} 
        options={{ title: 'Movimientos' }} />
      <Tabs.Screen name="Cuentas" component={PantallaCuentas} 
        options={{ title: 'Cuentas' }} />
      <Tabs.Screen name="Presupuestos" component={PantallaPresupuestos} 
        options={{ title: 'Presupuestos' }} />
    </Tabs.Navigator>
  );
}

export default function NavegadorApp() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Pila.Navigator screenOptions={{ headerShown: false }}>
        {usuario ? (
          <Pila.Screen name="Principal" component={TabsPrincipales} />
        ) : (
          <>
            <Pila.Screen name="Login" component={PantallaLogin} />
            <Pila.Screen name="Registro" component={PantallaRegistro} />
          </>
        )}
      </Pila.Navigator>
    </NavigationContainer>
  );
}