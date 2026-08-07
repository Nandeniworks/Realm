import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import Interactive3D from '../components/Interactive3D';

export default function LandingPage() {
  const { currentUser } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning 🌅';
    if (hour < 17) return 'Good Afternoon ☀️';
    return 'Good Evening 🌙';
  };

  return (
    <div className="relative w-full min-h-screen text-realm-moon font-sans overflow-x-hidden selection:bg-realm-lavender/30">
      {/* Primary Layout Wrapper */}
      <div className="relative z-10 w-full px-6 md:px-16 lg:px-24 mx-auto max-w-7xl pt-28 pb-20">
        
        {/* Section 1: Hero Editorial Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-16 pb-24 items-center">
          
          {/* Column A (Left): Editorial Headline & Statement */}
          <div className="lg:col-span-7 text-left space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-realm-lavender/5 border border-realm-lavender/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-realm-lavender animate-pulse" />
              <span className="text-[10px] font-semibold tracking-widest text-realm-lavender uppercase font-sans">
                A digital place where people spend time together
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-8xl font-light leading-none tracking-tight text-realm-moon font-serif"
            >
              Movie nights <br />
              <span className="italic font-normal text-realm-lavender">reinvented.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-base text-realm-moon-muted leading-relaxed max-w-lg font-sans font-light"
            >
              Experience films together in beautifully designed digital lounges. Gather, watch, chat, and react in real-time with friends.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-start justify-start gap-4"
            >
              <Link to="/create">
                <Button variant="primary" icon={Sparkles} className="px-8 py-3.5 rounded-full font-bold shadow-lg hover:shadow-realm-lavender/10">
                  Create Your Lounge
                </Button>
              </Link>
              <Link to="/join">
                <Button variant="glass" className="px-8 py-3.5 rounded-full font-bold border border-realm-lavender/10 hover:bg-realm-lavender/5">
                  Join a Lounge
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Column B (Right): Floating Cinematic Card */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 2 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm aspect-[4/5] rounded-[32px] overflow-hidden glass-panel border border-realm-lavender/15 p-5 flex flex-col justify-between shadow-2xl relative group"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono font-bold bg-realm-lavender/10 text-realm-lavender px-2 py-0.5 rounded border border-realm-lavender/10">
                  {getGreeting()}
                </span>
                {currentUser ? (
                  <div className="flex items-center space-x-2">
                    <img src={currentUser.avatar || currentUser.avatarUrl} alt="Avatar" className="w-6 h-6 rounded-lg bg-realm-navy-dark p-0.5 border border-realm-lavender/15" />
                    <span className="text-[10px] font-bold text-realm-moon">{currentUser.displayName || currentUser.username}</span>
                  </div>
                ) : (
                  <span className="text-[9px] font-semibold text-realm-moon-muted uppercase tracking-wider">Passport Inactive</span>
                )}
              </div>

              {/* Live Interactive 3D Sphere */}
              <div className="w-full h-44 rounded-2xl overflow-hidden relative my-6">
                <Interactive3D />
              </div>

              <div className="text-left space-y-2">
                <h3 className="text-xl font-bold text-realm-moon leading-tight font-serif">
                  Cozy Lounge Cinema
                </h3>
                <p className="text-xs text-realm-moon-muted leading-relaxed">
                  &ldquo;A digital lounge where friends gather. Light a fireplace, pop popcorn, and settle in.&rdquo;
                </p>
              </div>
            </motion.div>
          </div>

        </section>

        {/* Section 2: Statement Whitespace Block */}
        <section className="py-20 text-center border-t border-realm-lavender/5 mt-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.2 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <span className="text-[10px] font-bold text-realm-lavender uppercase tracking-widest block font-sans">
              Our Vision
            </span>
            <blockquote className="text-2xl md:text-4xl font-light text-realm-moon font-serif leading-relaxed italic">
              &ldquo;This world is ready for memories. Every great story starts with someone saying hello.&rdquo;
            </blockquote>
          </motion.div>
        </section>

      </div>
    </div>
  );
}
