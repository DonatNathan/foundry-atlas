import { useEffect, useMemo, useState } from 'react';
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
import type { Application, AppLink, Relationship } from '../types';
import { RELATIONSHIP_VERBS } from '../data';

interface LinkDialogProps {
  link: AppLink | null;
  mode?: 'create' | 'edit';
  apps: Application[];
  onClose: () => void;
  onSave: (link: AppLink) => Promise<void>;
}

const RELATIONSHIPS = Object.keys(RELATIONSHIP_VERBS) as Relationship[];

export default function LinkDialog({
  link,
  mode = 'edit',
  apps,
  onClose,
  onSave,
}: LinkDialogProps) {
  const [draft, setDraft] = useState<AppLink | null>(link);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(link);
    setError(null);
  }, [link]);

  const sortedApps = useMemo(() => [...apps].sort((a, b) => a.name.localeCompare(b.name)), [apps]);

  if (!draft) return null;

  const isCreate = mode === 'create';

  const set = <K extends keyof AppLink>(key: K, value: AppLink[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const submit = async () => {
    if (!draft.source_id || !draft.target_id) return setError('Pick both a source and a target.');
    if (draft.source_id === draft.target_id) {
      return setError('A link cannot connect an application to itself.');
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const verb = RELATIONSHIP_VERBS[draft.relationship];

  return (
    <Dialog
      isOpen={link !== null}
      onClose={onClose}
      title={isCreate ? 'New link' : 'Edit link'}
      icon={isCreate ? 'add' : 'edit'}
      className="bp6-dark"
    >
      <DialogBody>
        <FormGroup label="Source">
          <HTMLSelect
            fill
            value={draft.source_id}
            onChange={(e) => set('source_id', e.currentTarget.value)}
          >
            <option value="">— select —</option>
            {sortedApps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </HTMLSelect>
        </FormGroup>

        <FormGroup label="Relationship">
          <HTMLSelect
            fill
            value={draft.relationship}
            onChange={(e) => set('relationship', e.currentTarget.value as Relationship)}
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </HTMLSelect>
        </FormGroup>

        <FormGroup label="Target">
          <HTMLSelect
            fill
            value={draft.target_id}
            onChange={(e) => set('target_id', e.currentTarget.value)}
          >
            <option value="">— select —</option>
            {sortedApps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </HTMLSelect>
        </FormGroup>

        {verb && (
          <Callout compact icon="arrow-right">
            {verb.out} — reads as “{verb.out.toLowerCase()}” from source to target.
          </Callout>
        )}

        <FormGroup label="Description" className="link-desc-field">
          <InputGroup
            value={draft.description ?? ''}
            placeholder="Optional — how the two relate"
            onChange={(e) => set('description', e.target.value || null)}
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
