import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FolderTree,
  MessagesSquare,
  CreditCard,
  Quote,
  Trophy,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Users,
  Activity,
  RefreshCw,
  Banknote,
  Bell,
  MessageCircle,
} from 'lucide-react';
import { useLogout } from '../../hooks/useApi';
import { useAuthStore, useUIStore, useThemeStore } from '../../store';
import { brandLogoSrc } from '../../theme/initTheme';
import styles from './layout.module.css';

const navItems = [
  { path: '/analytics', icon: BarChart3, label: 'Analitika' },
  { path: '/users', icon: Users, label: 'Foydalanuvchilar' },
  { path: '/chat', icon: MessageCircle, label: 'Mijozlar chat' },
  // { path: '/challenge-monitoring', icon: Activity, label: 'Challenge monitoring' },
  { path: '/categories', icon: FolderTree, label: 'Categories' },
  { path: '/topics', icon: MessagesSquare, label: 'Topics / Questions' },
  { path: '/plans', icon: CreditCard, label: 'Plans' },
  { path: '/subscriptions', icon: RefreshCw, label: 'Obunalar' },
  { path: '/payments', icon: Banknote, label: 'To‘lovlar' },
  { path: '/notifications', icon: Bell, label: 'Bildirishnomalar' },
  { path: '/quotes', icon: Quote, label: 'Quotes' },
  // { path: '/challenges', icon: Trophy, label: 'Challenge’lar' },
];

export const Sidebar = () => {
  const theme = useThemeStore((s) => s.theme);
  const logoSrc = brandLogoSrc(theme);
  const { user } = useAuthStore();
  const logoutMutation = useLogout();
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleCollapsed } = useUIStore();
  const [isClosing, setIsClosing] = useState(false);

  const onLogout = async () => {
    if (isClosing) return;
    setIsClosing(true);
    await logoutMutation.mutateAsync();
  };

  return (
    <>
      {sidebarOpen && <div className={styles.overlay} onClick={toggleSidebar} />}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''} ${sidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.logoSection}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <img src={logoSrc} alt="Bonoos" className={styles.logoImage} />
            </div>
            {!sidebarCollapsed && <span className={styles.logoText}>BONOOS ADMIN</span>}
          </div>
          <button className={styles.mobileClose} onClick={toggleSidebar} aria-label="Close sidebar">
            <X size={20} />
          </button>
          <button className={styles.collapseBtn} onClick={toggleCollapsed} aria-label="Collapse sidebar">
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>
            {!sidebarCollapsed && <span className={styles.navLabel}>Admin</span>}
            <ul className={styles.navList}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                      onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                    >
                      <Icon size={20} />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className={styles.userSection}>
          <NavLink
            to="/profile"
            title="Profil"
            className={({ isActive }) =>
              `${styles.userInfo} ${styles.userProfileLink} ${isActive ? styles.userProfileLinkActive : ''}`
            }
            onClick={() => window.innerWidth < 1024 && toggleSidebar()}
          >
            <div className={styles.avatar}>{user?.username?.charAt(0)?.toUpperCase() || 'A'}</div>
            {!sidebarCollapsed && (
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user?.username || 'admin'}</span>
                <span className={styles.userRole}>Administrator</span>
              </div>
            )}
          </NavLink>
          <button className={styles.logoutBtn} onClick={onLogout} disabled={logoutMutation.isPending}>
            <LogOut size={18} />
            {!sidebarCollapsed && <span>{logoutMutation.isPending ? '...' : 'Chiqish'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export const Header = () => {
  const { toggleSidebar } = useUIStore();
  const { user } = useAuthStore();

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button className={styles.menuBtn} onClick={toggleSidebar} aria-label="Toggle menu">
          <Menu size={22} />
        </button>
      </div>
      <div className={styles.headerRight}>
        <NavLink to="/profile" className={styles.headerUser} title="Profil">
          <div className={styles.headerUserInfo}>
            <span className={styles.headerUserName}>{user?.username || 'admin'}</span>
            <span className={styles.headerUserRole}>Bonoos Admin</span>
          </div>
          <div className={styles.headerAvatar}>{user?.username?.charAt(0)?.toUpperCase() || 'A'}</div>
        </NavLink>
      </div>
    </header>
  );
};
