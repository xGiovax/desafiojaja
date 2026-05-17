import './src/firebase/configuracion';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { ProveedorAuth } from './src/contexto/ContextoAuth';
import NavegadorApp from './src/navegacion/NavegadorApp';

export default function App() {
  return (
    <ProveedorAuth>
      <NavegadorApp />
    </ProveedorAuth>
  );
}