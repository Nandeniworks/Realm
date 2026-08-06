import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import FloatingBackground from './components/FloatingBackground';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import CreateRealmPage from './pages/CreateRealmPage';
import JoinRealmPage from './pages/JoinRealmPage';
import RealmPage from './pages/RealmPage';
import NotFoundPage from './pages/NotFoundPage';
import CustomCursor from './components/CustomCursor';
import { AuthProvider } from './contexts/AuthContext';
import { SocialProvider } from './contexts/SocialContext';
import Lenis from 'lenis';

function AppContent() {
  const location = useLocation();
  // Check if current page is the immersive Realm lounge page
  const isRealmPage = location.pathname.startsWith('/realm');

  useEffect(() => {
    // Respect reduced motion setting
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    console.log("[Lenis] Initializing smooth scrolling physics.");
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0
    });

    let frameId;
    function raf(time) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }
    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col selection:bg-realm-lavender/30 selection:text-realm-lavender overflow-x-hidden">
      {/* Global Interactive Luxury Cursor */}
      <CustomCursor />

      {/* Render the default magical background & layout only if not on the immersive Realm lounge */}
      {!isRealmPage && <FloatingBackground />}
      {!isRealmPage && <Navbar />}

      <main className="flex-1 w-full flex flex-col justify-start">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateRealmPage />} />
          <Route path="/join" element={<JoinRealmPage />} />
          <Route path="/realm/:id" element={<RealmPage />} />
          <Route path="/realm" element={<RealmPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {!isRealmPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocialProvider>
        <Router>
          <AppContent />
        </Router>
      </SocialProvider>
    </AuthProvider>
  );
}

export default App;
