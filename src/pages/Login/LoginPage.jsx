import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLogin } from '../../hooks/useApi';
import { useThemeStore } from '../../store';
import { brandLogoSrc } from '../../theme/initTheme';
import { extractApiError } from '../../utils/error';
import styles from './login.module.css';

export const LoginPage = () => {
  const theme = useThemeStore((s) => s.theme);
  const logoSrc = brandLogoSrc(theme);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const loginMutation = useLogin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username va parolni kiriting');
      return;
    }

    try {
      await loginMutation.mutateAsync({ username, password });
      navigate('/analytics');
    } catch (err) {
      setError(extractApiError(err, 'Login xatosi yuz berdi'));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.bgEffects}>
        <div className={styles.gradientOrb1} />
        <div className={styles.gradientOrb2} />
        <div className={styles.gridPattern} />
      </div>

      <div className={styles.loginCard}>
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>
            <img src={logoSrc} alt="" className={styles.logoImage} />
          </div>
          <h1 className={styles.logoText}>BONOOS</h1>
          <p className={styles.subtitle}>Admin Panel</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Username</label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} size={20} />
              <input
                type="text"
                className={styles.input}
                placeholder="admin_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Parol</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className={styles.spinner} size={20} />
                Kirish...
              </>
            ) : (
              'Kirish'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <p>&copy; {new Date().getFullYear()} Bonoos. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </div>
  );
};
