import { useState } from 'react';
import {
  Button,
  Callout,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  InputGroup,
  NumericInput,
} from '@blueprintjs/core';
import type { Category } from '../types';

interface CategoryDialogProps {
  category: Category | null;
  mode?: 'create' | 'edit';
  onClose: () => void;
  onSave: (category: Category) => Promise<void>;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export default function CategoryDialog({
  category,
  mode = 'edit',
  onClose,
  onSave,
}: CategoryDialogProps) {
  const [draft, setDraft] = useState<Category | null>(category);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevCategory, setPrevCategory] = useState(category);

  // Reset the form whenever a different category is opened.
  if (category !== prevCategory) {
    setPrevCategory(category);
    setDraft(category);
    setError(null);
  }

  if (!draft) return null;

  const isCreate = mode === 'create';

  const set = <K extends keyof Category>(key: K, value: Category[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const submit = async () => {
    if (isCreate && !draft.id.trim()) return setError('ID is required.');
    if (!draft.name.trim()) return setError('Name is required.');
    if (!HEX.test(draft.color)) return setError('Color must be a hex value like #4C90F0.');
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
      isOpen={category !== null}
      onClose={onClose}
      title={isCreate ? 'New category' : `Edit · ${category?.name ?? ''}`}
      icon={isCreate ? 'add' : 'edit'}
      className="bp6-dark"
    >
      <DialogBody>
        {isCreate && (
          <FormGroup label="ID" labelInfo="(required, kebab-case)">
            <InputGroup
              value={draft.id}
              placeholder="e.g. data-integration"
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
          <FormGroup label="Color" className="edit-col">
            <div className="color-field">
              <input
                type="color"
                value={HEX.test(draft.color) ? draft.color : '#8f99a8'}
                onChange={(e) => set('color', e.target.value.toUpperCase())}
                aria-label="Pick color"
              />
              <InputGroup
                value={draft.color}
                onChange={(e) => set('color', e.target.value)}
              />
            </div>
          </FormGroup>
          <FormGroup label="Sort order" className="edit-col">
            <NumericInput
              fill
              value={draft.sort}
              onValueChange={(n) => set('sort', Number.isNaN(n) ? 0 : n)}
            />
          </FormGroup>
        </div>

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
