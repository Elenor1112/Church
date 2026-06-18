import { ExpoRoot } from 'expo-router';

const ctx = require.context('./app');
export const unstable_settings = {
  initialRouteName: '(auth)',
};

export default function App() {
  return <ExpoRoot context={ctx} />;
}
