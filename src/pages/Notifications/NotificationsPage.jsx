import { useEffect, useRef, useState } from 'react';
import { Bell, Globe, Plus, Send, Trash2, Users, X } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmModal,
  Input,
  PageHeader,
  Textarea,
  useToast,
} from '../../components/ui';
import {
  useAdminUsers,
  useCommonNotifications,
  useCreateCommonNotification,
  useDeleteCommonNotification,
  useSendNotificationToUser,
  useUpdateCommonNotification,
} from '../../hooks/useApi';
import { formatIsoDateTime } from '../../utils/adminDisplay';
import { extractApiError } from '../../utils/error';
import styles from '../admin.module.css';
import notif from './NotificationsPage.module.css';

const TABS = [
  { id: 'send', label: 'Xabarnoma yuborish', icon: Bell },
  { id: 'common', label: 'Umumiy xabarnomalar', icon: Globe },
];

const emptyForm = () => ({
  title_uz: '',
  content_uz: '',
  title_ru: '',
  content_ru: '',
  expires_at: '',
});

/* ══════════════════════════════════════════════════
   TAB 1 — Send notification
══════════════════════════════════════════════════ */
function SendTab({ toast }) {
  const [recipients, setRecipients] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langTab, setLangTab] = useState('uz');
  const [form, setForm] = useState(emptyForm());
  const dropdownRef = useRef(null);

  const searchEnabled = phoneQuery.length >= 5;
  const { data: searchData, isFetching: searchLoading } = useAdminUsers(
    searchEnabled ? { phone: phoneQuery, limit: 8 } : {},
    searchEnabled && recipients === 'specific'
  );

  const sendToUser = useSendNotificationToUser();
  const createCommon = useCreateCommonNotification();
  const isPending = sendToUser.isPending || createCommon.isPending;

  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const addUser = (user) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, { id: user.id, phone: user.phone }]);
    }
    setPhoneQuery('');
    setDropdownOpen(false);
  };

  const removeUser = (userId) =>
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));

  useEffect(() => {
    const handle = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();

    const title = form.title_uz.trim() || form.title_ru.trim();
    const content = form.content_uz.trim() || form.content_ru.trim();

    if (!title) { toast("Sarlavha kiriting (O'zbek yoki Rus tilida)", 'error'); return; }
    if (!content) { toast('Xabar matni kiriting', 'error'); return; }
    if (recipients === 'specific' && selectedUsers.length === 0) {
      toast("Kamida 1 ta foydalanuvchi qo'shing", 'error');
      return;
    }

    try {
      if (recipients === 'all') {
        const payload = {
          type: 0,
          title,
          content,
          ...(form.expires_at ? { expires_at: new Date(form.expires_at).toISOString() } : {}),
        };
        await createCommon.mutateAsync(payload);
        toast('Barcha foydalanuvchilarga xabarnoma yuborildi');
      } else {
        let ok = 0;
        for (const user of selectedUsers) {
          try {
            await sendToUser.mutateAsync({ user_id: user.id, type: 0, title, content });
            ok++;
          } catch (err) {
            toast(`${user.phone}: ${extractApiError(err)}`, 'error');
          }
        }
        if (ok > 0) toast(`${ok} ta foydalanuvchiga xabarnoma yuborildi`);
      }
      setForm(emptyForm());
      setSelectedUsers([]);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  const searchResults = searchData?.items ?? [];

  return (
    <form onSubmit={handleSend} className={notif.formWrap}>
      {/* Recipients toggle */}
      <Card>
        <div className={notif.cardSection}>
          <div className={notif.sectionLabel}>
            <span className={notif.dot} />
            Qabul qiluvchilar
          </div>
          <div className={notif.toggleGroup}>
            <button
              type="button"
              className={`${notif.toggleBtn} ${recipients === 'all' ? notif.toggleBtnActive : ''}`}
              onClick={() => setRecipients('all')}
            >
              <Users size={15} />
              Hammaga
            </button>
            <button
              type="button"
              className={`${notif.toggleBtn} ${recipients === 'specific' ? notif.toggleBtnActive : ''}`}
              onClick={() => setRecipients('specific')}
            >
              <Plus size={15} />
              Maxsus userlarga
            </button>
          </div>
        </div>
      </Card>

      {/* User selection */}
      {recipients === 'specific' && (
        <Card>
          <div className={notif.cardSection}>
            <div className={notif.sectionHeader}>
              <div className={notif.sectionLabel}>
                <span className={`${notif.dot} ${notif.dotOrange}`} />
                Foydalanuvchilar
              </div>
              {selectedUsers.length > 0 && (
                <span className={notif.userCount}>{selectedUsers.length} ta user</span>
              )}
            </div>

            {selectedUsers.length > 0 && (
              <div className={notif.userTags}>
                {selectedUsers.map((u) => (
                  <span key={u.id} className={notif.userTag}>
                    {u.phone}
                    <button type="button" onClick={() => removeUser(u.id)} aria-label="O'chirish">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className={notif.userSearch} ref={dropdownRef}>
              <Input
                placeholder="Telefon raqam (9 ta raqam)"
                value={phoneQuery}
                onChange={(e) => {
                  setPhoneQuery(e.target.value.replace(/\D/g, '').slice(0, 9));
                  setDropdownOpen(true);
                }}
                onFocus={() => phoneQuery.length >= 5 && setDropdownOpen(true)}
                autoComplete="off"
              />
              {dropdownOpen && searchEnabled && (
                <div className={notif.searchDropdown}>
                  {searchLoading ? (
                    <p className={notif.searchEmpty}>Qidirilmoqda...</p>
                  ) : searchResults.length === 0 ? (
                    <p className={notif.searchEmpty}>Foydalanuvchi topilmadi</p>
                  ) : (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className={notif.searchItem}
                        onClick={() => addUser(user)}
                      >
                        <div>
                          <div className={notif.searchItemPhone}>{user.phone}</div>
                          {(user.full_name || user.username) && (
                            <div className={notif.searchItemName}>
                              {user.full_name || user.username}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Expires at (common only) */}
      {recipients === 'all' && (
        <Card>
          <div className={notif.cardSection}>
            <div className={notif.sectionLabel}>
              <span className={notif.dot} />
              Muddat (ixtiyoriy)
            </div>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setField('expires_at', e.target.value)}
            />
          </div>
        </Card>
      )}

      {/* Language tabs + title/content */}
      <Card>
        <div className={notif.langTabs}>
          <button
            type="button"
            className={`${notif.langTab} ${langTab === 'uz' ? notif.langTabActive : ''}`}
            onClick={() => setLangTab('uz')}
          >
            🇺🇿 O&apos;zbek tili
          </button>
          <button
            type="button"
            className={`${notif.langTab} ${langTab === 'ru' ? notif.langTabActive : ''}`}
            onClick={() => setLangTab('ru')}
          >
            🇷🇺 Русский язык
          </button>
        </div>

        <div className={notif.langContent}>
          <p className={notif.langSubLabel}>
            {langTab === 'uz' ? "O'zbek tili" : 'Русский язык'}
          </p>
          {langTab === 'uz' ? (
            <>
              <Input
                label="Sarlavha"
                placeholder="Masalan: 12.12 — Chegirmalar davom etmoqda 🎉"
                value={form.title_uz}
                onChange={(e) => setField('title_uz', e.target.value)}
              />
              <Textarea
                label="Xabar matni *"
                placeholder="Xabar matnini kiriting..."
                value={form.content_uz}
                onChange={(e) => setField('content_uz', e.target.value)}
                rows={4}
              />
            </>
          ) : (
            <>
              <Input
                label="Заголовок"
                placeholder="Например: 12.12 — Скидки продолжаются 🎉"
                value={form.title_ru}
                onChange={(e) => setField('title_ru', e.target.value)}
              />
              <Textarea
                label="Текст сообщения *"
                placeholder="Введите текст сообщения..."
                value={form.content_ru}
                onChange={(e) => setField('content_ru', e.target.value)}
                rows={4}
              />
            </>
          )}
        </div>
      </Card>

      <div className={notif.sendActions}>
        <Button type="submit" leftIcon={<Send size={17} />} isLoading={isPending}>
          Yuborish
        </Button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════
   TAB 2 — Common notifications management
══════════════════════════════════════════════════ */
function CommonTab({ toast }) {
  const { data: items = [], isLoading, isError } = useCommonNotifications();
  const createCommon = useCreateCommonNotification();
  const updateCommon = useUpdateCommonNotification();
  const deleteCommon = useDeleteCommonNotification();

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', expires_at: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const openCreate = () => {
    setForm({ title: '', content: '', expires_at: '' });
    setModal('create');
  };

  const openEdit = (item) => {
    setForm({
      title: item.title ?? '',
      content: item.content ?? '',
      expires_at: item.expires_at ? item.expires_at.slice(0, 16) : '',
    });
    setModal({ type: 'edit', id: item.id });
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast('Sarlavha kiriting', 'error'); return; }
    if (!form.content.trim()) { toast('Matn kiriting', 'error'); return; }

    const payload = {
      type: 0,
      title: form.title.trim(),
      content: form.content.trim(),
      ...(form.expires_at ? { expires_at: new Date(form.expires_at).toISOString() } : {}),
    };

    try {
      if (modal === 'create') {
        await createCommon.mutateAsync(payload);
        toast('Umumiy xabarnoma yaratildi');
      } else {
        await updateCommon.mutateAsync({ id: modal.id, payload });
        toast('Xabarnoma yangilandi');
      }
      setModal(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteCommon.mutateAsync(deleteTarget.id);
      toast("Xabarnoma o'chirildi");
      setDeleteTarget(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  const isFormPending = createCommon.isPending || updateCommon.isPending;

  return (
    <div className={notif.formWrap}>
      {/* Create form */}
      <Card>
        <div className={notif.commonHeader}>
          <div className={notif.sectionLabel}>
            <span className={notif.dot} />
            Yangi umumiy xabarnoma
          </div>
        </div>
        <form
          onSubmit={submitForm}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}
        >
          <Input
            label="Sarlavha *"
            placeholder="Xabarnoma sarlavhasi"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            required
          />
          <Textarea
            label="Matn *"
            placeholder="Xabarnoma matni"
            value={form.content}
            onChange={(e) => setField('content', e.target.value)}
            rows={3}
            required
          />
          <Input
            label="Tugash muddati (ixtiyoriy)"
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setField('expires_at', e.target.value)}
          />
          <div className={notif.sendActions}>
            <Button type="submit" leftIcon={<Plus size={17} />} isLoading={isFormPending}>
              Yaratish
            </Button>
          </div>
        </form>
      </Card>

      {/* List */}
      <Card>
        <div className={notif.sectionLabel} style={{ marginBottom: 16 }}>
          <span className={notif.dot} />
          Mavjud umumiy xabarnomalar
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Yuklanmoqda...</p>
        ) : isError ? (
          <p className={notif.infoBox}>
            Umumiy xabarnomalar ro&apos;yxati hozircha mavjud emas yoki API qo&apos;llab-quvvatlamaydi.
          </p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Hech qanday umumiy xabarnoma topilmadi.
          </p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sarlavha</th>
                  <th>Matn</th>
                  <th>Tugash muddati</th>
                  <th>Yaratilgan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.title}</td>
                    <td className={styles.textCell} title={item.content}>{item.content}</td>
                    <td className={styles.nowrap}>
                      {item.expires_at ? formatIsoDateTime(item.expires_at) : '—'}
                    </td>
                    <td className={styles.nowrap}>{formatIsoDateTime(item.created_at)}</td>
                    <td>
                      <div className={styles.actions}>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                          Tahrirlash
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit modal */}
      {modal && modal !== 'create' && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)', padding: 24, width: '100%', maxWidth: 500,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Xabarnomani tahrirlash</h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Sarlavha *"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                required
              />
              <Textarea
                label="Matn *"
                value={form.content}
                onChange={(e) => setField('content', e.target.value)}
                rows={3}
                required
              />
              <Input
                label="Tugash muddati (ixtiyoriy)"
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setField('expires_at', e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button type="button" variant="secondary" onClick={() => setModal(null)}>
                  Bekor
                </Button>
                <Button type="submit" isLoading={isFormPending}>
                  Saqlash
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={<><strong>{deleteTarget.title}</strong> xabarnomasi o&apos;chiriladi.</>}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          isLoading={deleteCommon.isPending}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════ */
export const NotificationsPage = () => {
  const [tab, setTab] = useState('send');
  const { show: toast, ToastRenderer } = useToast();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Bildirishnomalar"
        description="Foydalanuvchilarga push-xabarnomalar yuborish"
      />

      {/* Page-level tabs */}
      <div className={notif.pageTabs}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`${notif.pageTab} ${tab === id ? notif.pageTabActive : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'send' && <SendTab toast={toast} />}
      {tab === 'common' && <CommonTab toast={toast} />}

      <ToastRenderer />
    </div>
  );
};
