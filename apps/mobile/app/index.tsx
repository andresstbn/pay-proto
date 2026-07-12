import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { AnimatedLaunchScreen } from '../src/components/AnimatedLaunchScreen';
import { useStore } from '../src/domain/store';

// Pantalla 1: carga inicial. Espera a que Firebase Auth resuelva la sesión persistida
// (SPEC-002 §5.3) y redirige a /home o /login — único punto de decisión de arranque.
export default function Index() {
  const { currentUserId, loading } = useStore();
  const router = useRouter();

  const finishLaunch = useCallback(() => {
    router.replace(currentUserId ? '/home' : '/login');
  }, [currentUserId, router]);

  return <AnimatedLaunchScreen ready={!loading} onComplete={finishLaunch} />;
}
