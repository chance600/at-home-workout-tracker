import React from 'react';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, hideNav = false }) => {
  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 font-sans pb-20 selection:bg-aura-500/30">
      <main className="max-w-md mx-auto min-h-screen relative">
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default Layout;
