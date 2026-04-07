import { useEffect, useState } from 'react';
import { Palette, User, UserPlus } from 'lucide-react';
import { Badge, Button, Card, Input, PageHeader, useToast } from '../../components/ui';
import { useAdminProfile, useCreateAdmin, useUpdateAdminProfile } from '../../hooks/useApi';
import { useThemeStore } from '../../store';
import { extractApiError } from '../../utils/error';
import styles from './profile.module.css';

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
}

const ROLE_LABELS = { 1: 'Super admin', 2: 'Admin' };
const STATUS_LABELS = { 0: 'Nofaol', 1: 'Faol' };

export const ProfilePage = () => {
  const { data: profile, isLoading, isError, error: loadError } = useAdminProfile();
  const updateMutation = useUpdateAdminProfile();
  const createMutation = useCreateAdmin();
  const { show: toast, ToastRenderer } = useToast();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePassword2, setProfilePassword2] = useState('');

  const [newAdminFullName, setNewAdminFullName] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminPass2, setNewAdminPass2] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setUsername(profile.username ?? '');
  }, [profile]);

  const onSaveProfile = async (e) => {
    e.preventDefault();
    if (profilePassword && profilePassword !== profilePassword2) return;
    const payload = {};
    if (fullName.trim()) payload.full_name = fullName.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (username.trim()) payload.username = username.trim();
    if (profilePassword.trim()) payload.password = profilePassword;
    if (Object.keys(payload).length === 0) return;
    try {
      await updateMutation.mutateAsync(payload);
      setProfilePassword('');
      setProfilePassword2('');
      toast("Ma'lumotlar yangilandi");
    } catch (err) { toast(extractApiError(err), 'error'); }
  };

  const onCreateAdmin = async (e) => {
    e.preventDefault();
    if (newAdminPass !== newAdminPass2) return;
    if (!newAdminFullName.trim() || !newAdminPhone.trim() || !newAdminUser.trim() || !newAdminPass) return;
    try {
      const res = await createMutation.mutateAsync({
        full_name: newAdminFullName.trim(),
        phone: newAdminPhone.trim(),
        username: newAdminUser.trim(),
        password: newAdminPass,
      });
      toast(res?.message || `Admin @${res?.username || newAdminUser.trim()} yaratildi`);
      setNewAdminFullName(''); setNewAdminPhone(''); setNewAdminUser(''); setNewAdminPass(''); setNewAdminPass2('');
    } catch (err) { toast(extractApiError(err), 'error'); }
  };

  if (isLoading) return <div className={styles.page}><Card className={styles.loadingBox}>Profil yuklanmoqda...</Card></div>;
  if (isError) return <div className={styles.page}><Card style={{ color: 'var(--error)' }}>{extractApiError(loadError)}</Card></div>;

  const initial = (profile?.full_name || profile?.username || '?').charAt(0).toUpperCase();

  return (
    <div className={styles.page}>
      <PageHeader title="Profil va adminlar" description="O'z ma'lumotlaringizni yangilang va yangi admin yarating" />

      <div className={styles.grid}>
        <Card className={styles.summaryCard}>
          <div className={styles.avatar}>{initial}</div>
          <div>
            <div className={styles.summaryName}>{profile?.full_name || '—'}</div>
            <div className={styles.summaryUsername}>@{profile?.username || '—'}</div>
          </div>
          <div className={styles.badges}>
            <Badge variant="default">{ROLE_LABELS[profile?.role] ?? `Rol: ${profile?.role ?? '—'}`}</Badge>
            <Badge variant={profile?.status === 1 ? 'default' : 'error'}>
              {STATUS_LABELS[profile?.status] ?? `Status: ${profile?.status ?? '—'}`}
            </Badge>
          </div>
          <div className={styles.metaList}>
            <div className={styles.metaRow}><span className={styles.metaLabel}>Telefon</span><span className={styles.metaValue}>{profile?.phone || '—'}</span></div>
            <div className={styles.metaRow}><span className={styles.metaLabel}>ID</span><span className={styles.metaValue}>{profile?.id ?? '—'}</span></div>
            <div className={styles.metaRow}><span className={styles.metaLabel}>Ro'yxatdan</span><span className={styles.metaValue}>{formatDate(profile?.created_at)}</span></div>
          </div>
        </Card>

        <div className={styles.formsColumn}>
          <Card className={styles.formCard}>
            <h2 className={styles.cardTitle}><Palette size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Interfeys mavzusi</h2>
            <p className={styles.themeDesc}>
              Standart — Bonoos (siyohrang fon va oltin urg&apos;u). Ocean — avvalgi ko&apos;k admin palitrasi (#001b26, #00a8e8). Tanlov brauzeringizda saqlanadi.
            </p>
            <div className={styles.themeRow} role="group" aria-label="Mavzu tanlash">
              <button
                type="button"
                className={`${styles.themeBtn} ${theme === 'bonoos' ? styles.themeBtnActive : ''}`}
                onClick={() => setTheme('bonoos')}
                aria-pressed={theme === 'bonoos'}
              >
                <span className={styles.themeSwatches} aria-hidden>
                  <span className={`${styles.themeDot} ${styles.themeDotPlum}`} />
                  <span className={`${styles.themeDot} ${styles.themeDotGold}`} />
                </span>
                Bonoos (standart)
              </button>
              <button
                type="button"
                className={`${styles.themeBtn} ${theme === 'ocean' ? styles.themeBtnActive : ''}`}
                onClick={() => setTheme('ocean')}
                aria-pressed={theme === 'ocean'}
              >
                <span className={styles.themeSwatches} aria-hidden>
                  <span className={`${styles.themeDot} ${styles.themeDotTeal}`} />
                  <span className={`${styles.themeDot} ${styles.themeDotCyan}`} />
                </span>
                Ocean (ko&apos;k)
              </button>
            </div>
          </Card>

          <Card className={styles.formCard}>
            <h2 className={styles.cardTitle}><User size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Profilni tahrirlash</h2>
            <form onSubmit={onSaveProfile}>
              <div className={styles.formGrid}>
                <Input label="To'liq ism" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
                <div className={styles.formGridFull}><Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></div>
                <Input label="Yangi parol (ixtiyoriy)" type="password" value={profilePassword} onChange={(e) => setProfilePassword(e.target.value)} autoComplete="new-password" />
                <Input label="Parolni tasdiqlash" type="password" value={profilePassword2} onChange={(e) => setProfilePassword2(e.target.value)} autoComplete="new-password"
                  error={profilePassword2 && profilePassword !== profilePassword2 ? 'Parollar mos emas' : undefined} />
              </div>
              <div className={styles.formActions}>
                <Button type="submit" isLoading={updateMutation.isPending} disabled={Boolean(profilePassword2 && profilePassword !== profilePassword2)}>Saqlash</Button>
              </div>
            </form>
          </Card>

          <Card className={styles.formCard}>
            <h2 className={styles.cardTitle}><UserPlus size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Yangi admin yaratish</h2>
            <form onSubmit={onCreateAdmin}>
              <div className={styles.formGrid}>
                <div className={styles.formGridFull}><Input label="To'liq ism" value={newAdminFullName} onChange={(e) => setNewAdminFullName(e.target.value)} placeholder="Test Admin" /></div>
                <Input label="Telefon" value={newAdminPhone} onChange={(e) => setNewAdminPhone(e.target.value)} type="tel" placeholder="901234567" />
                <Input label="Username" value={newAdminUser} onChange={(e) => setNewAdminUser(e.target.value)} placeholder="test_admin" />
                <Input label="Parol" type="password" value={newAdminPass} onChange={(e) => setNewAdminPass(e.target.value)} autoComplete="new-password" />
                <Input label="Parolni tasdiqlash" type="password" value={newAdminPass2} onChange={(e) => setNewAdminPass2(e.target.value)} autoComplete="new-password"
                  error={newAdminPass2 && newAdminPass !== newAdminPass2 ? 'Parollar mos emas' : undefined} />
              </div>
              <div className={styles.formActions}>
                <Button type="submit" isLoading={createMutation.isPending}
                  disabled={newAdminPass !== newAdminPass2 || !newAdminFullName.trim() || !newAdminPhone.trim() || !newAdminUser.trim() || !newAdminPass}>
                  Admin yaratish
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      <ToastRenderer />
    </div>
  );
};
