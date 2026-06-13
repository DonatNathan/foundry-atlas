import { useState } from 'react';
import {
  Button,
  Callout,
  Checkbox,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  HTMLSelect,
  InputGroup,
  NumericInput,
  TextArea,
} from '@blueprintjs/core';
import type { Application, Status, Tier } from '../types';
import { STATUS_LABELS, TIER_LABELS } from '../data';
import { useData } from '../DataContext';

interface EditAppDialogProps {
  app: Application | null;
  mode?: 'create' | 'edit';
  onClose: () => void;
  onSave: (app: Application) => Promise<void>;
}

const TIERS: Tier[] = ['beginner', 'intermediate', 'advanced'];
const STATUSES: Status[] = ['stable', 'new', 'legacy'];

export default function EditAppDialog({
  app,
  mode = 'edit',
  onClose,
  onSave,
}: EditAppDialogProps) {
  const { categories } = useData();
  const [draft, setDraft] = useState<Application | null>(app);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevApp, setPrevApp] = useState(app);

  // Reset the form whenever a different app is opened.
  if (app !== prevApp) {
    setPrevApp(app);
    setDraft(app);
    setError(null);
  }

  if (!draft) return null;

  const isCreate = mode === 'create';

  const set = <K extends keyof Application>(key: K, value: Application[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const submit = async () => {
    if (!draft.name.trim()) return;
    if (isCreate && !draft.id.trim()) {
      setError('ID is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...draft, id: draft.id.trim(), name: draft.name.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={app !== null}
      onClose={onClose}
      title={isCreate ? 'New application' : `Edit · ${app?.name ?? ''}`}
      icon={isCreate ? 'add' : 'edit'}
      className="bp6-dark edit-dialog"
    >
      <DialogBody>
        {isCreate && (
          <FormGroup label="ID" labelInfo="(required, kebab-case)">
            <InputGroup
              value={draft.id}
              placeholder="e.g. pipeline-builder"
              onChange={(e) => set('id', e.target.value)}
              autoFocus
            />
          </FormGroup>
        )}

        <FormGroup label="Name" labelInfo="(required)">
          <InputGroup
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            autoFocus={!isCreate}
          />
        </FormGroup>

        <div className="edit-row">
          <FormGroup label="Category" className="edit-col">
            <HTMLSelect
              fill
              value={draft.category_id}
              onChange={(e) => set('category_id', e.currentTarget.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </HTMLSelect>
          </FormGroup>

          <FormGroup label="Level" className="edit-col">
            <HTMLSelect
              fill
              value={draft.tier}
              onChange={(e) => set('tier', e.currentTarget.value as Tier)}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {TIER_LABELS[t]}
                </option>
              ))}
            </HTMLSelect>
          </FormGroup>

          <FormGroup label="Generation" className="edit-col">
            <HTMLSelect
              fill
              value={draft.status}
              onChange={(e) => set('status', e.currentTarget.value as Status)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </HTMLSelect>
          </FormGroup>
        </div>

        <div className="edit-row">
          <FormGroup label="Core application" className="edit-col">
            <Checkbox
              checked={draft.is_core}
              label="Learn early"
              onChange={(e) => set('is_core', e.currentTarget.checked)}
            />
          </FormGroup>
          <FormGroup label="Learning order" className="edit-col" helperText="Empty = not on path">
            <NumericInput
              fill
              min={1}
              value={draft.learning_order ?? ''}
              onValueChange={(n, s) => set('learning_order', s === '' || Number.isNaN(n) ? null : n)}
            />
          </FormGroup>
        </div>

        <FormGroup label="Era">
          <InputGroup
            value={draft.era ?? ''}
            onChange={(e) => set('era', e.target.value || null)}
          />
        </FormGroup>

        <FormGroup label="Description">
          <TextArea
            fill
            autoResize
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Use case">
          <TextArea
            fill
            autoResize
            value={draft.use_case}
            onChange={(e) => set('use_case', e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Learning tip">
          <TextArea
            fill
            autoResize
            value={draft.tips ?? ''}
            onChange={(e) => set('tips', e.target.value || null)}
          />
        </FormGroup>

        <FormGroup label="Docs URL">
          <InputGroup
            value={draft.docs_url ?? ''}
            onChange={(e) => set('docs_url', e.target.value || null)}
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
