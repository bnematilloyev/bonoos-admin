import { forwardRef, useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2, X, AlertTriangle, Check } from 'lucide-react';
import styles from './ui.module.css';

/* ─── Button ─── */
export const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => (
  <button
    ref={ref}
    className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
    disabled={isLoading || props.disabled}
    {...props}
  >
    {isLoading ? (
      <Loader2 className={styles.spinner} size={18} />
    ) : (
      <>
        {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
      </>
    )}
  </button>
));
Button.displayName = 'Button';

/* ─── Input ─── */
export const Input = forwardRef(({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => (
  <div className={`${styles.inputWrapper} ${className}`}>
    {label && <label className={styles.label}>{label}</label>}
    <div className={`${styles.inputContainer} ${error ? styles.hasError : ''}`}>
      {leftIcon && <span className={styles.inputIcon}>{leftIcon}</span>}
      <input
        ref={ref}
        className={`${styles.input} ${leftIcon ? styles.hasLeftIcon : ''} ${rightIcon ? styles.hasRightIcon : ''}`}
        {...props}
      />
      {rightIcon && <span className={styles.inputIconRight}>{rightIcon}</span>}
    </div>
    {error && <span className={styles.errorText}>{error}</span>}
  </div>
));
Input.displayName = 'Input';

/* ─── Select ─── */
export const Select = forwardRef(({
  label,
  error,
  options = [],
  placeholder,
  className = '',
  ...props
}, ref) => (
  <div className={`${styles.inputWrapper} ${className}`}>
    {label && <label className={styles.label}>{label}</label>}
    <select
      ref={ref}
      className={`${styles.select} ${error ? styles.selectError : ''}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <span className={styles.errorText}>{error}</span>}
  </div>
));
Select.displayName = 'Select';

/* ─── Textarea ─── */
export const Textarea = forwardRef(({
  label,
  error,
  className = '',
  ...props
}, ref) => (
  <div className={`${styles.inputWrapper} ${className}`}>
    {label && <label className={styles.label}>{label}</label>}
    <textarea
      ref={ref}
      className={`${styles.textarea} ${error ? styles.textareaError : ''}`}
      {...props}
    />
    {error && <span className={styles.errorText}>{error}</span>}
  </div>
));
Textarea.displayName = 'Textarea';

/* ─── Badge ─── */
export const Badge = ({ children, variant = 'default', className = '' }) => (
  <span className={`${styles.badge} ${styles[`badge_${variant}`]} ${className}`}>
    {children}
  </span>
);

/* ─── Modal ─── */
export const Modal = ({ title, children, onClose, footer, size = 'md', className = '' }) => {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`${styles.modalPanel} ${styles[`modalSize_${size}`]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          {title ? <h2 id={titleId} className={styles.modalTitle}>{title}</h2> : <span />}
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Yopish">
            <X size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

/* ─── FormModal — create/edit pattern ─── */
export const FormModal = ({
  title,
  onClose,
  onSubmit,
  isLoading = false,
  submitLabel = 'Saqlash',
  size = 'md',
  children,
}) => (
  <Modal
    title={title}
    onClose={onClose}
    size={size}
    footer={
      <>
        <Button type="button" variant="secondary" onClick={onClose}>Bekor</Button>
        <Button type="submit" form="__form_modal__" isLoading={isLoading}>{submitLabel}</Button>
      </>
    }
  >
    <form id="__form_modal__" onSubmit={onSubmit} className={styles.formModalBody}>
      {children}
    </form>
  </Modal>
);

/* ─── ConfirmModal — delete confirmation ─── */
export const ConfirmModal = ({
  title = "O'chirishni tasdiqlang",
  message,
  onClose,
  onConfirm,
  isLoading = false,
  confirmLabel = "O'chirish",
  variant = 'danger',
  /** false bo'lsa faqat message ko'rsatiladi */
  showAffirmation = true,
}) => (
  <Modal
    title={title}
    onClose={onClose}
    size="sm"
    footer={
      <>
        <Button type="button" variant="secondary" onClick={onClose}>Bekor</Button>
        <Button type="button" variant={variant} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
      </>
    }
  >
    <div className={styles.confirmModalBody}>
      {showAffirmation && (
        <>
          <p className={styles.confirmLead}>Siz rostdan ham o&apos;chirmoqchimisiz?</p>
          <p className={styles.confirmIrreversible}>Bu amalni qaytarib bo&apos;lmaydi.</p>
        </>
      )}
      <div className={styles.confirmMessage}>{message}</div>
    </div>
  </Modal>
);

/* ─── Card ─── */
export const Card = ({ children, className = '', ...props }) => (
  <div className={`${styles.card} ${className}`} {...props}>
    {children}
  </div>
);

/* ─── StatCard ─── */
export const StatCard = ({ title, value, icon, trend, trendUp, highlight, className = '' }) => (
  <div className={`${styles.statCard} ${highlight ? styles.statCardHighlight : ''} ${className}`}>
    <div className={styles.statHeader}>
      <span className={styles.statTitle}>{title}</span>
      {icon && <div className={styles.statIcon}>{icon}</div>}
    </div>
    <div className={styles.statValue}>{value}</div>
    {trend && (
      <div className={`${styles.statTrend} ${trendUp ? styles.trendUp : styles.trendDown}`}>
        {trendUp ? '↑' : '↓'} {trend}
      </div>
    )}
  </div>
);

/* ─── Skeleton ─── */
export const Skeleton = ({ width, height, className = '' }) => (
  <div className={`${styles.skeleton} ${className}`} style={{ width, height }} />
);

/* ─── EmptyState ─── */
export const EmptyState = ({ icon, title, description, action }) => (
  <div className={styles.emptyState}>
    {icon && <div className={styles.emptyIcon}>{icon}</div>}
    <h3 className={styles.emptyTitle}>{title}</h3>
    {description && <p className={styles.emptyDescription}>{description}</p>}
    {action && <div className={styles.emptyAction}>{action}</div>}
  </div>
);

/* ─── PageHeader ─── */
export const PageHeader = ({ title, description, actions }) => (
  <div className={styles.pageHeader}>
    <div className={styles.pageHeaderText}>
      <h1 className={styles.pageTitle}>{title}</h1>
      {description && <p className={styles.pageDescription}>{description}</p>}
    </div>
    {actions && <div className={styles.pageHeaderActions}>{actions}</div>}
  </div>
);

/* ─── Pagination ─── */
export const Pagination = ({ total, offset, pageSize, onOffsetChange }) => {
  const canPrev = offset > 0;
  const canNext = offset + pageSize < total;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + pageSize, total);

  return (
    <div className={styles.pagination}>
      <span className={styles.paginationInfo}>
        {from}–{to} / {total.toLocaleString('uz-UZ')}
      </span>
      <div className={styles.paginationBtns}>
        <button
          type="button"
          className={styles.paginationBtn}
          disabled={!canPrev}
          onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
          aria-label="Oldingi"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className={styles.paginationBtn}
          disabled={!canNext}
          onClick={() => onOffsetChange(offset + pageSize)}
          aria-label="Keyingi"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

/* ─── Toast notifications ─── */
export const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <div className={`${styles.toast} ${styles[`toast_${type}`]}`} role="alert">
      <div className={styles.toastIcon}>
        {type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
      </div>
      <span className={styles.toastMessage}>{message}</span>
      <button type="button" className={styles.toastClose} onClick={onClose} aria-label="Yopish">
        <X size={16} />
      </button>
    </div>,
    document.body
  );
};

/* ─── useToast hook ─── */
export function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);
  const hide = useCallback(() => setToast(null), []);
  const ToastRenderer = toast
    ? () => <Toast key={toast.key} message={toast.message} type={toast.type} onClose={hide} />
    : () => null;
  return { show, ToastRenderer };
}

/* ─── Tabs (local state, not routes) ─── */
export const Tabs = ({ items, value, onChange, className = '' }) => (
  <div className={`${styles.tabs} ${className}`} role="tablist">
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        role="tab"
        aria-selected={value === item.value}
        className={`${styles.tab} ${value === item.value ? styles.tabActive : ''}`}
        onClick={() => onChange(item.value)}
      >
        {item.icon && <span className={styles.tabIcon}>{item.icon}</span>}
        {item.label}
      </button>
    ))}
  </div>
);
