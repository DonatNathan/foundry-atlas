import { useState } from 'react';
import { Button, Callout, Icon, Tag } from '@blueprintjs/core';
import type { Suggestion } from '../types';
import { RELATIONSHIP_VERBS, STATUS_LABELS, TIER_LABELS } from '../data';

interface SuggestionQueueProps {
  suggestions: Suggestion[];
  nameOf: (id: string) => string;
  dotColor: (id: string) => string;
  categoryName: (id: string) => string;
  onApprove: (s: Suggestion) => Promise<void>;
  onReject: (s: Suggestion) => Promise<void>;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  category_id: 'Category',
  description: 'Description',
  use_case: 'Use case',
  tier: 'Experience level',
  status: 'Generation',
  is_core: 'Core application',
  learning_order: 'Learning-path step',
  era: 'Era',
  docs_url: 'Docs URL',
  tips: 'Learning tip',
};

export default function SuggestionQueue({
  suggestions,
  nameOf,
  dotColor,
  categoryName,
  onApprove,
  onReject,
}: SuggestionQueueProps) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<{ id: number; msg: string } | null>(null);

  const run = async (action: (s: Suggestion) => Promise<void>, s: Suggestion) => {
    setBusy(s.id);
    setError(null);
    try {
      await action(s);
    } catch (e) {
      setError({ id: s.id, msg: e instanceof Error ? e.message : 'Action failed.' });
    } finally {
      setBusy(null);
    }
  };

  // Render a correction's proposed value the way it'll appear once applied.
  const formatValue = (s: Suggestion): string => {
    const v = s.value;
    if (s.field === 'category_id') return v ? categoryName(v) : '—';
    if (s.field === 'tier') return v ? (TIER_LABELS[v as keyof typeof TIER_LABELS] ?? v) : '—';
    if (s.field === 'status') return v ? (STATUS_LABELS[v as keyof typeof STATUS_LABELS] ?? v) : '—';
    if (s.field === 'is_core') return v === 'true' ? 'Yes — core' : 'No';
    if (v == null || v === '') return '(empty)';
    return v;
  };

  if (suggestions.length === 0) {
    return (
      <Callout icon="inbox" title="The queue is empty" className="suggestion-empty">
        Community corrections and new-link suggestions will appear here for you to approve or reject.
      </Callout>
    );
  }

  return (
    <div className="suggestion-queue">
      {suggestions.map((s) => (
        <div className="suggestion-card" key={s.id}>
          <div className="suggestion-card-main">
            <div className="suggestion-card-head">
              {s.kind === 'correction' ? (
                <Tag minimal intent="primary" icon="edit">
                  Correction
                </Tag>
              ) : (
                <Tag minimal intent="success" icon="new-link">
                  New link
                </Tag>
              )}
              <span className="suggestion-meta">
                {s.submitter ? <strong>{s.submitter}</strong> : 'Anonymous'} ·{' '}
                {new Date(s.created_at).toLocaleString()}
              </span>
            </div>

            {s.kind === 'correction' ? (
              <div className="suggestion-body">
                <span className="suggestion-target">
                  <span className="dot" style={{ background: dotColor(s.app_id ?? '') }} />
                  {nameOf(s.app_id ?? '')}
                </span>
                <div className="suggestion-change">
                  Set <strong>{FIELD_LABELS[s.field ?? ''] ?? s.field}</strong> to:
                  <div className="suggestion-value">{formatValue(s)}</div>
                </div>
              </div>
            ) : (
              <div className="suggestion-body">
                <span className="suggestion-target">
                  <span className="dot" style={{ background: dotColor(s.source_id ?? '') }} />
                  {nameOf(s.source_id ?? '')}
                </span>
                <span className="suggestion-rel">
                  <Icon icon="arrow-right" size={12} />
                  {s.relationship
                    ? (RELATIONSHIP_VERBS[s.relationship]?.out ?? s.relationship)
                    : '—'}
                  <Icon icon="arrow-right" size={12} />
                </span>
                <span className="suggestion-target">
                  <span className="dot" style={{ background: dotColor(s.target_id ?? '') }} />
                  {nameOf(s.target_id ?? '')}
                </span>
                {s.link_description && (
                  <div className="suggestion-value">{s.link_description}</div>
                )}
              </div>
            )}

            {s.comment && <blockquote className="suggestion-comment">“{s.comment}”</blockquote>}

            {error?.id === s.id && <p className="admin-delete-error">{error.msg}</p>}
          </div>

          <div className="suggestion-actions">
            <Button
              icon="tick"
              intent="success"
              text="Approve"
              loading={busy === s.id}
              disabled={busy !== null && busy !== s.id}
              onClick={() => run(onApprove, s)}
            />
            <Button
              icon="cross"
              intent="danger"
              variant="minimal"
              text="Reject"
              disabled={busy !== null}
              onClick={() => run(onReject, s)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
