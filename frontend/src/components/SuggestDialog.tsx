import { useState } from 'react';
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
import type { Application, Relationship, SuggestionInput, SuggestionKind } from '../types';
import { RELATIONSHIP_VERBS, STATUS_LABELS, TIER_LABELS } from '../data';
import { useData } from '../DataContext';
import { submitSuggestion } from '../api';

interface SuggestDialogProps {
  isOpen: boolean;
  apps: Application[];
  initialApp: Application | null;
  onClose: () => void;
}

type Control = 'text' | 'textarea' | 'tier' | 'status' | 'bool' | 'category';

// The application columns a correction may target, with a friendly label and the
// input control to render. Mirrors the server's CORRECTABLE set.
const FIELDS: { key: string; label: string; control: Control }[] = [
  { key: 'name', label: 'Name', control: 'text' },
  { key: 'category_id', label: 'Category', control: 'category' },
  { key: 'description', label: 'Description', control: 'textarea' },
  { key: 'use_case', label: 'Use case', control: 'textarea' },
  { key: 'tier', label: 'Experience level', control: 'tier' },
  { key: 'status', label: 'Generation', control: 'status' },
  { key: 'is_core', label: 'Core application', control: 'bool' },
  { key: 'available_in_dev', label: 'Available in dev tier', control: 'bool' },
  { key: 'learning_order', label: 'Learning-path step', control: 'text' },
  { key: 'era', label: 'Era', control: 'text' },
  { key: 'docs_url', label: 'Docs URL', control: 'text' },
  { key: 'tips', label: 'Learning tip', control: 'textarea' },
];

const RELATIONSHIPS = Object.keys(RELATIONSHIP_VERBS) as Relationship[];

// Current value of a field as a string, to pre-fill the form for editing.
const fieldValue = (app: Application, key: string): string => {
  if (key === 'is_core') return app.is_core ? 'true' : 'false';
  if (key === 'learning_order') return app.learning_order == null ? '' : String(app.learning_order);
  const v = (app as unknown as Record<string, unknown>)[key];
  return v == null ? '' : String(v);
};

export default function SuggestDialog({ isOpen, apps, initialApp, onClose }: SuggestDialogProps) {
  const { categories, links } = useData();
  const sortedApps = [...apps].sort((a, b) => a.name.localeCompare(b.name));
  const appById = new Map(apps.map((a) => [a.id, a]));
  const nameOf = (id: string) => appById.get(id)?.name ?? id;
  // Only links with a stable id (from the API) can be targeted for an edit.
  const editableLinks = links.filter((l) => l.id != null);
  const linkById = new Map(editableLinks.map((l) => [l.id as number, l]));
  // When opened for a specific app, only offer that app's links to edit.
  const linkOptions = initialApp
    ? editableLinks.filter((l) => l.source_id === initialApp.id || l.target_id === initialApp.id)
    : editableLinks;

  // Empty until the user picks a type from the dropdown.
  const [kind, setKind] = useState<SuggestionKind | ''>('');
  // Correction state.
  const [appId, setAppId] = useState('');
  const [field, setField] = useState('description');
  const [value, setValue] = useState('');
  // New-link state.
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relationship, setRelationship] = useState<Relationship>('feeds');
  const [linkDescription, setLinkDescription] = useState('');
  // Edit-link state.
  const [editLinkId, setEditLinkId] = useState<number | null>(null);
  const [editRelationship, setEditRelationship] = useState<Relationship>('feeds');
  const [editDescription, setEditDescription] = useState('');
  // Common.
  const [comment, setComment] = useState('');
  const [submitter, setSubmitter] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Initialize the form each time the dialog transitions to open (the same
  // adjust-state-on-prop-change pattern the other dialogs use).
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    const start = initialApp ?? sortedApps[0] ?? null;
    // Default the edit-link picker to the first offered link (already scoped to
    // the opened app, if any).
    const startLink = linkOptions[0] ?? null;
    setKind('');
    setAppId(start?.id ?? '');
    setField('description');
    setValue(start ? fieldValue(start, 'description') : '');
    setSourceId(initialApp?.id ?? start?.id ?? '');
    setTargetId('');
    setRelationship('feeds');
    setLinkDescription('');
    setEditLinkId(startLink?.id ?? null);
    setEditRelationship(startLink?.relationship ?? 'feeds');
    setEditDescription(startLink?.description ?? '');
    setComment('');
    setSubmitter('');
    setError(null);
    setDone(false);
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  const fieldMeta = FIELDS.find((f) => f.key === field) ?? FIELDS[0];

  // Reset the proposed value to the field's current value when app/field change.
  const onAppChange = (id: string) => {
    setAppId(id);
    const a = appById.get(id);
    if (a) setValue(fieldValue(a, field));
  };
  const onFieldChange = (key: string) => {
    setField(key);
    const a = appById.get(appId);
    if (a) setValue(fieldValue(a, key));
  };
  const onEditLinkChange = (idStr: string) => {
    const id = Number(idStr);
    setEditLinkId(id);
    const l = linkById.get(id);
    if (l) {
      setEditRelationship(l.relationship);
      setEditDescription(l.description ?? '');
    }
  };

  const submit = async () => {
    setError(null);
    if (!kind) return setError('Choose a suggestion type.');
    let input: SuggestionInput;
    if (kind === 'correction') {
      if (!appId) return setError('Pick the application to correct.');
      input = { kind, app_id: appId, field, value, comment, submitter };
    } else if (kind === 'edit_link') {
      if (editLinkId == null) return setError('Pick a link to edit.');
      input = {
        kind,
        link_id: editLinkId,
        relationship: editRelationship,
        link_description: editDescription,
        comment,
        submitter,
      };
    } else if (kind === 'feature') {
      if (!comment.trim()) return setError('Describe the feature you have in mind.');
      input = { kind, comment, submitter };
    } else {
      if (!sourceId || !targetId) return setError('Pick both applications for the link.');
      if (sourceId === targetId) return setError('A link must connect two different applications.');
      input = {
        kind,
        source_id: sourceId,
        target_id: targetId,
        relationship,
        link_description: linkDescription,
        comment,
        submitter,
      };
    }
    setSubmitting(true);
    try {
      await submitSuggestion(input);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderValueControl = () => {
    switch (fieldMeta.control) {
      case 'textarea':
        return (
          <TextArea value={value} onChange={(e) => setValue(e.target.value)} fill rows={4} autoResize />
        );
      case 'tier':
        return (
          <HTMLSelect fill value={value} onChange={(e) => setValue(e.currentTarget.value)}>
            {(['beginner', 'intermediate', 'advanced'] as const).map((t) => (
              <option key={t} value={t}>
                {TIER_LABELS[t]}
              </option>
            ))}
          </HTMLSelect>
        );
      case 'status':
        return (
          <HTMLSelect fill value={value} onChange={(e) => setValue(e.currentTarget.value)}>
            {(['stable', 'new', 'legacy'] as const).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </HTMLSelect>
        );
      case 'bool':
        return (
          <HTMLSelect fill value={value} onChange={(e) => setValue(e.currentTarget.value)}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </HTMLSelect>
        );
      case 'category':
        return (
          <HTMLSelect fill value={value} onChange={(e) => setValue(e.currentTarget.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </HTMLSelect>
        );
      default:
        return (
          <InputGroup
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={fieldMeta.key === 'learning_order' ? 'Leave blank for none' : undefined}
          />
        );
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Suggest a correction or new link"
      icon="lightbulb"
      className="bp6-dark suggest-dialog"
    >
      {done ? (
        <DialogBody>
          <Callout intent="success" icon="tick-circle" title="Thanks for helping!">
            Your suggestion was submitted. A maintainer will review it and, if it checks out, apply
            it to the map.
          </Callout>
          <div className="suggest-done-actions">
            <Button text="Suggest another" onClick={() => setDone(false)} />
            <Button text="Done" intent="primary" onClick={onClose} />
          </div>
        </DialogBody>
      ) : (
        <>
          <DialogBody>
            <p className="suggest-intro">
              Spotted something off, know a connection that’s missing, or have an idea for the
              project? Tell us below — it goes into a moderation queue, not straight onto the map.
            </p>

            <FormGroup label="What would you like to suggest?">
              <HTMLSelect
                fill
                value={kind}
                onChange={(e) => setKind(e.currentTarget.value as SuggestionKind | '')}
              >
                <option value="">Select a type…</option>
                <option value="correction">Correct a detail</option>
                <option value="new_link">Add a missing link</option>
                <option value="edit_link" disabled={linkOptions.length === 0}>
                  Edit a link
                </option>
                <option value="feature">Suggest a feature</option>
              </HTMLSelect>
            </FormGroup>

            {kind === '' ? null : kind === 'correction' ? (
              <>
                <div className="edit-row">
                  <FormGroup label="Application" className="edit-col">
                    <HTMLSelect fill value={appId} onChange={(e) => onAppChange(e.currentTarget.value)}>
                      {sortedApps.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </HTMLSelect>
                  </FormGroup>
                  <FormGroup label="Field" className="edit-col">
                    <HTMLSelect fill value={field} onChange={(e) => onFieldChange(e.currentTarget.value)}>
                      {FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </HTMLSelect>
                  </FormGroup>
                </div>
                <FormGroup label="Proposed value">{renderValueControl()}</FormGroup>
              </>
            ) : kind === 'edit_link' ? (
              <>
                <FormGroup label="Link">
                  <HTMLSelect
                    fill
                    value={editLinkId ?? ''}
                    onChange={(e) => onEditLinkChange(e.currentTarget.value)}
                  >
                    {linkOptions.map((l) => (
                      <option key={l.id} value={l.id as number}>
                        {nameOf(l.source_id)} → {nameOf(l.target_id)}
                        {` (${RELATIONSHIP_VERBS[l.relationship].out})`}
                      </option>
                    ))}
                  </HTMLSelect>
                </FormGroup>
                <div className="edit-row">
                  <FormGroup label="Relationship" className="edit-col">
                    <HTMLSelect
                      fill
                      value={editRelationship}
                      onChange={(e) => setEditRelationship(e.currentTarget.value as Relationship)}
                    >
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>
                          {RELATIONSHIP_VERBS[r].out}
                        </option>
                      ))}
                    </HTMLSelect>
                  </FormGroup>
                </div>
                <FormGroup label="Description" labelInfo="(optional)">
                  <InputGroup
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="e.g. Streams events into the pipeline"
                  />
                </FormGroup>
              </>
            ) : kind === 'new_link' ? (
              <>
                <div className="edit-row">
                  <FormGroup label="From" className="edit-col">
                    <HTMLSelect fill value={sourceId} onChange={(e) => setSourceId(e.currentTarget.value)}>
                      <option value="">Select…</option>
                      {sortedApps.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </HTMLSelect>
                  </FormGroup>
                  <FormGroup label="Relationship" className="edit-col">
                    <HTMLSelect
                      fill
                      value={relationship}
                      onChange={(e) => setRelationship(e.currentTarget.value as Relationship)}
                    >
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>
                          {RELATIONSHIP_VERBS[r].out}
                        </option>
                      ))}
                    </HTMLSelect>
                  </FormGroup>
                  <FormGroup label="To" className="edit-col">
                    <HTMLSelect fill value={targetId} onChange={(e) => setTargetId(e.currentTarget.value)}>
                      <option value="">Select…</option>
                      {sortedApps.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </HTMLSelect>
                  </FormGroup>
                </div>
                <FormGroup label="Link description" labelInfo="(optional)">
                  <InputGroup
                    value={linkDescription}
                    onChange={(e) => setLinkDescription(e.target.value)}
                    placeholder="e.g. Streams events into the pipeline"
                  />
                </FormGroup>
              </>
            ) : null}

            {kind === 'feature' ? (
              <FormGroup label="Your idea" labelInfo="(required)">
                <TextArea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  fill
                  rows={5}
                  autoResize
                  placeholder="Describe the feature you’d like to see in Foundry Atlas…"
                />
              </FormGroup>
            ) : kind === '' ? null : (
              <FormGroup label="Why / source" labelInfo="(optional)">
                <TextArea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  fill
                  rows={2}
                  placeholder="Add context or a link to docs so a maintainer can verify it."
                />
              </FormGroup>
            )}

            {kind !== '' && (
              <FormGroup label="Your name or handle" labelInfo="(optional)">
                <InputGroup
                  value={submitter}
                  onChange={(e) => setSubmitter(e.target.value)}
                  placeholder="So we can credit you"
                />
              </FormGroup>
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
                <Button text="Cancel" onClick={onClose} disabled={submitting} />
                <Button
                  text="Submit suggestion"
                  intent="primary"
                  loading={submitting}
                  disabled={!kind}
                  onClick={submit}
                />
              </>
            }
          />
        </>
      )}
    </Dialog>
  );
}
