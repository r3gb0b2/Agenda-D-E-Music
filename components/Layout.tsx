import React from 'react';
import { User, UserRole } from '../types';
import { LayoutDashboard, Calendar, Settings, Music, LogOut, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  currentView: string;
  onChangeView: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, currentView, onChangeView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ view, icon: Icon, label }: { view: string, icon: any, label: string }) => (
    <button
      onClick={() => {
        onChangeView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} className="mr-3" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            BandMaster
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Pro System</p>
        </div>

        <nav className="flex-1 px-4 py-4">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="agenda" icon={Calendar} label="Agenda" />
          {user.role === UserRole.ADMIN && (
             <NavItem view="bands" icon={Music} label="Bandas & Usuários" />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-950 border-b border-slate-800 z-50 flex items-center justify-between p-4">
        <h1 className="text-xl font-bold text-white">BandMaster</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900 pt-20 px-4 md:hidden">
           <nav className="flex flex-col">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem view="agenda" icon={Calendar} label="Agenda" />
            {user.role === UserRole.ADMIN && (
               <NavItem view="bands" icon={Music} label="Bandas & Usuários" />
            )}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-900 md:p-8 p-4 pt-20 md:pt-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;