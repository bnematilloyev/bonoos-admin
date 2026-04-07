import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, ConfirmModal, FormModal, Input, PageHeader, Textarea, useToast } from '../../components/ui';
import {
  useCreateQuestion,
  useCreateTopic,
  useDeleteQuestion,
  useDeleteTopic,
  useTopicQuestions,
  useTopics,
  useUpdateQuestion,
  useUpdateTopic,
} from '../../hooks/useApi';
import { extractApiError } from '../../utils/error';
import styles from '../admin.module.css';

const emptyTopicForm = () => ({ name: '', description: '', contentUz: '', contentRu: '', contentEn: '', status: '1', sort: '0' });

function contentToFormFields(content) {
  if (content == null) return { contentUz: '', contentRu: '', contentEn: '' };
  let obj = content;
  if (typeof content === 'string') {
    try { obj = JSON.parse(content); } catch { return { contentUz: content, contentRu: '', contentEn: '' }; }
  }
  if (typeof obj !== 'object' || obj === null) return { contentUz: '', contentRu: '', contentEn: '' };
  if (!('uz' in obj || 'ru' in obj || 'en' in obj)) {
    return { contentUz: JSON.stringify(obj, null, 2), contentRu: '', contentEn: '' };
  }
  return { contentUz: obj.uz != null ? String(obj.uz) : '', contentRu: obj.ru != null ? String(obj.ru) : '', contentEn: obj.en != null ? String(obj.en) : '' };
}

function topicDisplayName(topic) {
  return topic?.name ?? topic?.title ?? `#${topic?.id}`;
}

export const TopicsPage = () => {
  const { data: topics = [] } = useTopics();
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const { show: toast, ToastRenderer } = useToast();

  const [topicModal, setTopicModal] = useState(null);
  const [topicForm, setTopicForm] = useState(emptyTopicForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState(null);

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [questionModal, setQuestionModal] = useState(null);
  const [questionText, setQuestionText] = useState('');

  const { data: questions = [] } = useTopicQuestions(selectedTopic);

  const setTopicField = (key, value) => setTopicForm((p) => ({ ...p, [key]: value }));

  const openCreateTopic = () => { setTopicForm(emptyTopicForm()); setTopicModal('create'); };
  const openEditTopic = (topic) => {
    const langs = contentToFormFields(topic.content);
    setTopicForm({
      name: topic.name ?? topic.title ?? '',
      description: topic.description ?? '',
      ...langs,
      status: topic.status != null ? String(topic.status) : '1',
      sort: topic.sort != null ? String(topic.sort) : '0',
    });
    setTopicModal({ type: 'edit', id: topic.id });
  };

  const submitTopic = async (e) => {
    e.preventDefault();
    if (!topicForm.name.trim()) { toast('Nom majburiy', 'error'); return; }
    const payload = {
      name: topicForm.name.trim(),
      content: { uz: topicForm.contentUz ?? '', ru: topicForm.contentRu ?? '', en: topicForm.contentEn ?? '' },
    };
    if (topicForm.description.trim()) payload.description = topicForm.description.trim();
    if (topicForm.status !== '') { const n = Number(topicForm.status); if (!Number.isNaN(n)) payload.status = n; }
    if (topicForm.sort !== '') { const n = Number(topicForm.sort); if (!Number.isNaN(n)) payload.sort = n; }

    try {
      if (topicModal === 'create') {
        await createTopic.mutateAsync(payload);
        toast('Mavzu yaratildi');
      } else {
        await updateTopic.mutateAsync({ id: topicModal.id, payload });
        toast('Mavzu yangilandi');
      }
      setTopicModal(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  const confirmDeleteTopic = async () => {
    try {
      await deleteTopic.mutateAsync(deleteTarget.id);
      if (selectedTopic === deleteTarget.id) setSelectedTopic(null);
      toast("Mavzu o'chirildi");
      setDeleteTarget(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionTarget || !selectedTopic) return;
    try {
      await deleteQuestion.mutateAsync({ topicId: selectedTopic, questionId: deleteQuestionTarget.id });
      toast("Savol o'chirildi");
      setDeleteQuestionTarget(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  const openCreateQuestion = () => { setQuestionText(''); setQuestionModal('create'); };
  const openEditQuestion = (q) => {
    setQuestionText(q.text ?? q.question ?? '');
    setQuestionModal({ type: 'edit', id: q.id });
  };

  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!questionText.trim() || !selectedTopic) return;
    const payload = { text: questionText.trim() };
    try {
      if (questionModal === 'create') {
        await createQuestion.mutateAsync({ topicId: selectedTopic, payload });
        toast('Savol yaratildi');
      } else {
        await updateQuestion.mutateAsync({ topicId: selectedTopic, questionId: questionModal.id, payload });
        toast('Savol yangilandi');
      }
      setQuestionModal(null);
    } catch (err) {
      toast(extractApiError(err), 'error');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Mavzular va savollar"
        description={`${topics.length} ta mavzu`}
        actions={<Button leftIcon={<Plus size={18} />} onClick={openCreateTopic}>Yangi mavzu</Button>}
      />

      <div className={styles.grid2}>
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Mavzular</h3>
          <ul className={styles.list}>
            {topics.map((topic) => (
              <li key={topic.id} className={styles.listItem} style={selectedTopic === topic.id ? { borderColor: 'var(--brand-accent)' } : {}}>
                <button className={styles.textButton} onClick={() => setSelectedTopic(topic.id)} type="button">
                  <strong>{topicDisplayName(topic)}</strong>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    status: {topic.status ?? '—'} · sort: {topic.sort ?? '—'}
                  </span>
                </button>
                <div className={styles.actions}>
                  <Button size="sm" variant="ghost" onClick={() => openEditTopic(topic)}>Tahrir</Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteTarget(topic)}>O'chirish</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>
              Savollar {selectedTopic ? `(#${selectedTopic})` : ''}
            </h3>
            {selectedTopic && (
              <Button size="sm" leftIcon={<Plus size={16} />} onClick={openCreateQuestion}>Savol qo'shish</Button>
            )}
          </div>
          {!selectedTopic ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Mavzu tanlang</p>
          ) : (
            <ul className={styles.list}>
              {questions.map((q) => (
                <li key={q.id} className={styles.listItem}>
                  <div className={styles.textCell} style={{ whiteSpace: 'pre-wrap', maxWidth: '100%' }}>
                    {q.text ?? q.question ?? '—'}
                  </div>
                  <div className={styles.actions}>
                    <Button size="sm" variant="ghost" onClick={() => openEditQuestion(q)}>Tahrir</Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteQuestionTarget(q)}>O'chirish</Button>
                  </div>
                </li>
              ))}
              {questions.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Savollar yo'q</p>}
            </ul>
          )}
        </Card>
      </div>

      {topicModal && (
        <FormModal
          title={topicModal === 'create' ? 'Yangi mavzu' : 'Mavzuni tahrirlash'}
          onClose={() => setTopicModal(null)}
          onSubmit={submitTopic}
          isLoading={createTopic.isPending || updateTopic.isPending}
          submitLabel={topicModal === 'create' ? 'Yaratish' : 'Saqlash'}
          size="lg"
        >
          <Input label="Nom" value={topicForm.name} onChange={(e) => setTopicField('name', e.target.value)} required />
          <Textarea label="Tavsif (ixtiyoriy)" value={topicForm.description} onChange={(e) => setTopicField('description', e.target.value)} rows={2} />
          <div className={styles.gridLangs}>
            <Textarea label="O'zbek (uz)" value={topicForm.contentUz} onChange={(e) => setTopicField('contentUz', e.target.value)} rows={3} />
            <Textarea label="Русский (ru)" value={topicForm.contentRu} onChange={(e) => setTopicField('contentRu', e.target.value)} rows={3} />
            <Textarea label="English (en)" value={topicForm.contentEn} onChange={(e) => setTopicField('contentEn', e.target.value)} rows={3} />
          </div>
          <div className={styles.grid2}>
            <Input label="Status" type="number" value={topicForm.status} onChange={(e) => setTopicField('status', e.target.value)} />
            <Input label="Sort" type="number" value={topicForm.sort} onChange={(e) => setTopicField('sort', e.target.value)} />
          </div>
        </FormModal>
      )}

      {questionModal && (
        <FormModal
          title={questionModal === 'create' ? 'Yangi savol' : 'Savolni tahrirlash'}
          onClose={() => setQuestionModal(null)}
          onSubmit={submitQuestion}
          isLoading={createQuestion.isPending || updateQuestion.isPending}
          submitLabel={questionModal === 'create' ? 'Yaratish' : 'Saqlash'}
        >
          <Textarea label="Savol matni" value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={4} required />
        </FormModal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={<><strong>{topicDisplayName(deleteTarget)}</strong> mavzusi o&apos;chiriladi.</>}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteTopic}
          isLoading={deleteTopic.isPending}
        />
      )}

      {deleteQuestionTarget && (
        <ConfirmModal
          message={
            <>
              Savol o&apos;chiriladi:{' '}
              <strong>
                {(deleteQuestionTarget.text ?? deleteQuestionTarget.question ?? '').slice(0, 160) || `ID ${deleteQuestionTarget.id}`}
              </strong>
              {(deleteQuestionTarget.text ?? deleteQuestionTarget.question ?? '').length > 160 ? '…' : ''}
            </>
          }
          onClose={() => setDeleteQuestionTarget(null)}
          onConfirm={confirmDeleteQuestion}
          isLoading={deleteQuestion.isPending}
        />
      )}

      <ToastRenderer />
    </div>
  );
};
