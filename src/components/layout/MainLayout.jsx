import { Outlet } from 'react-router-dom';
import { Sidebar, Header } from './Sidebar';
import { useUIStore } from '../../store';
import styles from './layout.module.css';

export const MainLayout = () => {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className={`${styles.layout} ${sidebarCollapsed ? styles.collapsed : ''}`}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        <main className={styles.pageContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
