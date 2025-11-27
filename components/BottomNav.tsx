import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, History, User } from 'lucide-react';

const BottomNav = () => {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 ${
      isActive ? 'text-aura-400' : 'text-zinc-500 hover:text-zinc-300'
    } transition-colors`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-dark-900/90 backdrop-blur-lg border-t border-dark-700">
      <div className="grid grid-cols-3 h-full max-w-md mx-auto">
        <NavLink to="/" className={navClass}>
          <Home size={24} />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>
        <NavLink to="/workout" className={navClass}>
          <div className="relative">
            <div className="absolute -inset-3 bg-aura-500/20 rounded-full blur-sm animate-pulse-slow"></div>
            <Dumbbell size={24} className="relative z-10" />
          </div>
          <span className="text-[10px] font-medium">Workout</span>
        </NavLink>
        <NavLink to="/history" className={navClass}>
          <History size={24} />
          <span className="text-[10px] font-medium">History</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
