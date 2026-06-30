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
  TextArea,
} from '@blueprintjs/core';
import type { Application, AppProject } from '../types';

interface ProjectDialogProps {
  project: AppProject | null;
  mode?: 'create' | 'edit';
  apps: Application[];
  onClose: () => void;
  onSave: (project: AppProject) => Promise<void>;
}

const isHttpUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

export default function ProjectDialog({
  project,
  mode = 'edit',
  apps,
  onClose,
  onSave,
}: ProjectDialogProps) {
  const [draft, setDraft] = useState<AppProject | null>(project);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prev, setPrev] = useState(project);

  // Reset the form whenever a different project is opened.
  if (project !== prev) {
    setPrev(project);
    setDraft(project);
    setError(null);
  }

  const sortedApps = useMemo(() => [...apps].sort((a, b) => a.name.localeCompare(b.name)), [apps]);

  if (!draft) return null;

  const isCreate = mode === 'create';

  const set = <K extends keyof AppProject>(key: K, value: AppProject[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const submit = async () => {
    if (!draft.app_id) return setError('Pick an application.');
    if (!draft.kind.trim()) return setError('Kind is required.');
    if (!draft.title.trim()) return setError('Title is required.');
    if (!draft.context.trim()) return setError('Context is required.');
    if (!draft.instructions.trim()) return setError('Instructions are required.');
    if (draft.dataset_url && !isHttpUrl(draft.dataset_url)) {
      return setError('Dataset URL must start with http:// or https://');
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...draft,
        kind: draft.kind.trim(),
        title: draft.title.trim(),
        context: draft.context.trim(),
        instructions: draft.instructions.trim(),
        dataset_url: draft.dataset_url ? draft.dataset_url.trim() : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={project !== null}
      onClose={onClose}
      title={isCreate ? 'New project' : 'Edit project'}
      icon={isCreate ? 'add' : 'edit'}
      className="bp6-dark edit-dialog"
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
          <FormGroup label="Kind" className="edit-col" helperText="Grouping label">
            <InputGroup
              value={draft.kind}
              placeholder="e.g. Pipeline exercise"
              onChange={(e) => set('kind', e.target.value)}
            />
          </FormGroup>
        </div>

        <FormGroup label="Title">
          <InputGroup
            value={draft.title}
            placeholder="e.g. Clean and join the sales dataset"
            onChange={(e) => set('title', e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Context" helperText="The real-life scenario / background">
          <TextArea
            fill
            autoResize
            value={draft.context}
            onChange={(e) => set('context', e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Instructions" helperText="Step-by-step brief for the learner">
          <TextArea
            fill
            autoResize
            value={draft.instructions}
            onChange={(e) => set('instructions', e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Dataset URL" labelInfo="(optional)">
          <InputGroup
            value={draft.dataset_url ?? ''}
            placeholder="https://… (downloadable dataset)"
            onChange={(e) => set('dataset_url', e.target.value || null)}
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
