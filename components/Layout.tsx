import React from 'react';
import { User, UserRole } from '../types';
import { LayoutDashboard, Calendar, Music, LogOut, Menu, X, Mic2, Briefcase, DollarSign } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, currentView, onChangeView, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Safety fallback for user name
  const userName = user?.name || 'Usuário';
  const userInitial = (userName.charAt(0) || '?').toUpperCase();
  const userRole = user?.role || UserRole.VIEWER;

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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-md">
              <Mic2 size={16} />
            </div>
            <h1 className="text-lg font-bold text-white leading-tight">
              Agenda<br/>
              <span className="text-primary-400">D&E MUSIC</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wider pl-1">Sistema de Gestão</p>
        </div>

        <nav className="flex-1 px-4 py-4">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="agenda" icon={Calendar} label="Agenda" />
          {(userRole === UserRole.ADMIN || userRole === UserRole.CONTRACT) && (
            <NavItem view="financials" icon={DollarSign} label="Financeiro" />
          )}
          <NavItem view="contractors" icon={Briefcase} label="Contratantes" />
          {userRole === UserRole.ADMIN && (
             <NavItem view="bands" icon={Music} label="Bandas & Usuários" />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white border border-slate-600">
              {userInitial}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{userName}</p>
              <p className="text-xs text-slate-500 capitalize">{userRole}</p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="flex items-center justify-center w-full px-4 py-2 text-sm text-red-400 hover:text-white bg-slate-900 hover:bg-red-500/80 rounded-lg transition-all border border-slate-800 hover:border-red-500"
          >
            <LogOut size={16} className="mr-2" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-950 border-b border-slate-800 z-50 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white">
              <Mic2 size={16} />
           </div>
           <h1 className="text-lg font-bold text-white">Agenda D&E MUSIC</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2 rounded hover:bg-slate-800">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900 pt-24 px-4 md:hidden">
           <nav className="flex flex-col">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem view="agenda" icon={Calendar} label="Agenda" />
            {(userRole === UserRole.ADMIN || userRole === UserRole.CONTRACT) && (
              <NavItem view="financials" icon={DollarSign} label="Financeiro" />
            )}
            <NavItem view="contractors" icon={Briefcase} label="Contratantes" />
            {userRole === UserRole.ADMIN && (
               <NavItem view="bands" icon={Music} label="Bandas & Usuários" />
            )}
            
            <div className="mt-8 border-t border-slate-800 pt-4">
              <button 
                onClick={onLogout}
                className="flex items-center w-full px-4 py-3 text-red-400 rounded-lg hover:bg-slate-800"
              >
                <LogOut size={20} className="mr-3" /> Sair do Sistema
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-900 md:p-8 p-4 pt-24 md:pt-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;