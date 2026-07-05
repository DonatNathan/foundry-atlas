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
  NumericInput,
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

  // A non-null `track` means the project belongs to a multi-project series.
  const isTrack = draft.track !== null;
  const setType = (type: 'solo' | 'multi') => {
    if (type === 'multi') {
      setDraft((d) => (d ? { ...d, track: d.track ?? '', track_step: d.track_step || 1 } : d));
    } else {
      setDraft((d) => (d ? { ...d, track: null, track_step: 0 } : d));
    }
  };

  const submit = async () => {
    if (!draft.app_id) return setError('Pick an application.');
    if (!draft.kind.trim()) return setError('Kind is required.');
    if (!draft.title.trim()) return setError('Title is required.');
    if (!draft.context.trim()) return setError('Context is required.');
    if (!draft.instructions.trim()) return setError('Instructions are required.');
    if (draft.dataset_url && !isHttpUrl(draft.dataset_url)) {
      return setError('Dataset URL must start with http:// or https://');
    }
    if (isTrack && !(draft.track ?? '').trim()) {
      return setError('Give the multi-project a name (the same name links its steps).');
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
        track: isTrack ? (draft.track ?? '').trim() : null,
        track_step: isTrack ? draft.track_step : 0,
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

        <FormGroup label="Project type">
          <HTMLSelect
            fill
            value={isTrack ? 'multi' : 'solo'}
            onChange={(e) => setType(e.currentTarget.value as 'solo' | 'multi')}
          >
            <option value="solo">Solo project</option>
            <option value="multi">Part of a multi-project</option>
          </HTMLSelect>
        </FormGroup>

        {isTrack && (
          <div className="edit-row">
            <FormGroup
              label="Multi-project name"
              className="edit-col"
              helperText="Use the same name on each step to link them"
            >
              <InputGroup
                value={draft.track ?? ''}
                placeholder="e.g. End-to-end data workflow"
                onChange={(e) => set('track', e.target.value)}
              />
            </FormGroup>
            <FormGroup label="Step" className="edit-col" helperText="Order within the series">
              <NumericInput
                fill
                min={1}
                value={draft.track_step || 1}
                onValueChange={(n) => set('track_step', Number.isNaN(n) ? 1 : n)}
              />
            </FormGroup>
          </div>
        )}

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
