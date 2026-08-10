import { useState } from 'react';

type Resource = {
  id: string;
  resource_type: string;
  title: string;
  content_text: string;
};

type Props = {
  scope: 'task' | 'activity';
  entityId: string;
  label: string;
};

const API_BASE = '';

export function MasterSupportEditor({ scope, entityId, label }: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('Beskrivning');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const collectionPath = scope === 'task'
    ? `/api/studio/master-tasks/${encodeURIComponent(entityId)}/work-resources`
    : `/api/studio/master-activities/${encodeURIComponent(entityId)}/detail-resources`;

  async function load() {
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}${collectionPath}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as { resources?: Resource[]; error?: string };
      if (!response.ok) throw new Error(data.error || `Kunde inte läsa ${label.toLowerCase()}.`);
      setResources(data.resources || []);
      setLoaded(true);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte läsa underlaget.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) await load();
  }

  function newResource() {
    setEditingId('new');
    setTitle('Beskrivning');
    setContent('');
    setMessage('');
  }

  function edit(resource: Resource) {
    setEditingId(resource.id);
    setTitle(resource.title);
    setContent(resource.content_text || '');
    setMessage('');
  }

  function cancel() {
    setEditingId(null);
    setTitle('Beskrivning');
    setContent('');
  }

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const isNew = editingId === 'new';
      const path = isNew
        ? collectionPath
        : scope === 'task'
          ? `/api/studio/master-task-resources/${editingId}`
          : `/api/studio/master-activity-resources/${editingId}`;
      const response = await fetch(`${API_BASE}${path}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content, resourceType: 'text' })
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte spara underlaget.');
      await load();
      cancel();
      setMessage('Sparat');
      window.setTimeout(() => setMessage(''), 1400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte spara underlaget.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(resource: Resource) {
    if (!window.confirm(`Ta bort ”${resource.title}”?`)) return;
    setBusy(true);
    try {
      const path = scope === 'task'
        ? `/api/studio/master-task-resources/${resource.id}`
        : `/api/studio/master-activity-resources/${resource.id}`;
      const response = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte ta bort underlaget.');
      await load();
      if (editingId === resource.id) cancel();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte ta bort underlaget.');
    } finally {
      setBusy(false);
    }
  }

  return <section className={`masterSupport ${scope === 'activity' ? 'detailSupport' : 'workSupport'}`}>
    <button type="button" className="masterSupportToggle" onClick={() => void toggle()}>
      <span>{open ? '⌄' : '›'}</span>
      <strong>{label}</strong>
      <small>{loaded ? `${resources.length} underlag` : 'Beskrivningar och dokument'}</small>
    </button>

    {open && <div className="masterSupportBody">
      <div className="masterSupportToolbar">
        <span>{scope === 'task' ? 'Gäller hela momentet' : 'Gäller endast denna aktivitet'}</span>
        <button type="button" onClick={newResource} disabled={busy}>＋ Ny beskrivning</button>
      </div>

      {message && <div className="masterSupportMessage">{message}</div>}
      {busy && !loaded && <div className="masterSupportEmpty">Hämtar…</div>}
      {loaded && !resources.length && editingId !== 'new' && <div className="masterSupportEmpty">Inget underlag inlagt ännu.</div>}

      {resources.map(resource => <article className="masterSupportCard" key={resource.id}>
        {editingId === resource.id ? <ResourceForm title={title} content={content} setTitle={setTitle} setContent={setContent} onSave={() => void save()} onCancel={cancel} busy={busy} /> : <>
          <div className="masterSupportCardHeader"><div><span>📄</span><strong>{resource.title}</strong></div><div><button type="button" onClick={() => edit(resource)}>Redigera</button><button type="button" className="dangerText" onClick={() => void remove(resource)}>Ta bort</button></div></div>
          <div className="masterSupportText">{resource.content_text || <em>Ingen beskrivning.</em>}</div>
        </>}
      </article>)}

      {editingId === 'new' && <article className="masterSupportCard editing"><ResourceForm title={title} content={content} setTitle={setTitle} setContent={setContent} onSave={() => void save()} onCancel={cancel} busy={busy} /></article>}
    </div>}
  </section>;
}

function ResourceForm({ title, content, setTitle, setContent, onSave, onCancel, busy }: {
  title: string;
  content: string;
  setTitle: (value: string) => void;
  setContent: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return <div className="masterSupportForm">
    <label><span>Rubrik</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Beskrivning" /></label>
    <label><span>Text / instruktion</span><textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Beskriv hur momentet eller aktiviteten ska utföras…" rows={7} /></label>
    <div className="masterSupportFormActions"><button type="button" onClick={onCancel} disabled={busy}>Avbryt</button><button type="button" className="primary" onClick={onSave} disabled={busy || !title.trim()}>{busy ? 'Sparar…' : 'Spara'}</button></div>
  </div>;
}
