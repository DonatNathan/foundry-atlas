import { useMemo, useState } from 'react';
import {
  Button,
  Callout,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  HTMLSelect,
  InputGroup,
} from '@blueprintjs/core';
import type { Application, AppResource, ResourceKind } from '../types';

interface ResourceDialogProps {
  resource: AppResource | null;
  mode?: 'create' | 'edit';
  apps: Application[];
  onClose: () => void;
  onSave: (resource: AppResource) => Promise<void>;
}

const KINDS: { value: ResourceKind; label: string }[] = [
  { value: 'tutorial', label: 'Foundry tutorial' },
  { value: 'video', label: 'YouTube video' },
];

const isHttpUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

export default function ResourceDialog({
  resource,
  mode = 'edit',
  apps,
  onClose,
  onSave,
}: ResourceDialogProps) {
  const [draft, setDraft] = useState<AppResource | null>(resource);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prev, setPrev] = useState(resource);

  // Reset the form whenever a different resource is opened.
  if (resource !== prev) {
    setPrev(resource);
    setDraft(resource);
    setError(null);
  }

  const sortedApps = useMemo(() => [...apps].sort((a, b) => a.name.localeCompare(b.name)), [apps]);

  if (!draft) return null;

  const isCreate = mode === 'create';

  const set = <K extends keyof AppResource>(key: K, value: AppResource[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const submit = async () => {
    if (!draft.app_id) return setError('Pick an application.');
    if (!draft.title.trim()) return setError('Title is required.');
    if (!isHttpUrl(draft.url)) return setError('URL must start with http:// or https://');
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...draft, title: draft.title.trim(), url: draft.url.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={resource !== null}
      onClose={onClose}
      title={isCreate ? 'New resource' : 'Edit resource'}
      icon={isCreate ? 'add' : 'edit'}
      className="bp6-dark"
    >
      <DialogBody>
        <div className="edit-row">
          <FormGroup label="Application" className="edit-col">
            <HTMLSelect fill value={draft.app_id} onChange={(e) => set('app_id', e.currentTarget.value)}>
              <option value="">— select —</option>
              {sortedApps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </HTMLSelect>
          </FormGroup>
          <FormGroup label="Kind" className="edit-col">
            <HTMLSelect
              fill
              value={draft.kind}
              onChange={(e) => set('kind', e.currentTarget.value as ResourceKind)}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </HTMLSelect>
          </FormGroup>
        </div>

        <FormGroup label="Title">
          <InputGroup
            value={draft.title}
            placeholder={draft.kind === 'video' ? 'e.g. Pipeline Builder in 10 minutes' : 'e.g. Build your first pipeline'}
            onChange={(e) => set('title', e.target.value)}
            autoFocus
          />
        </FormGroup>

        <FormGroup label="URL" labelInfo={draft.kind === 'video' ? '(YouTube link)' : '(Foundry learning link)'}>
          <InputGroup
            value={draft.url}
            placeholder="https://…"
            onChange={(e) => set('url', e.target.value)}
          />
        </FormGroup>

        {error && (
          <Callout intent="danger" compact>
            {error}
          </Callout>
        )}
      </DialogBody>
      <DialogFooter
        actions={
          <>
            <Button text="Cancel" onClick={onClose} disabled={saving} />
            <Button
              text={isCreate ? 'Create' : 'Save changes'}
              intent="primary"
              loading={saving}
              onClick={submit}
            />
          </>
        }
      />
    </Dialog>
  );
}
