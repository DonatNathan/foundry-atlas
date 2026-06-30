import { Fragment, useState } from 'react';
import { Button, Callout, Dialog, DialogBody, FormGroup, HTMLSelect, Icon } from '@blueprintjs/core';
import { RELATIONSHIP_VERBS } from '../data';
import { useData } from '../DataContext';

interface PathFinderDialogProps {
  isOpen: boolean;
  initialFrom: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}

// Cap how many equal-length paths we enumerate, so a richly connected pair can't
// blow up the UI.
const MAX_PATHS = 25;

export default function PathFinderDialog({
  isOpen,
  initialFrom,
  onClose,
  onSelect,
}: PathFinderDialogProps) {
  const { apps, appById, links, colorOf } = useData();
  const sortedApps = [...apps].sort((a, b) => a.name.localeCompare(b.name));

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [wasOpen, setWasOpen] = useState(false);

  // Initialize once each time the dialog opens (prefill "from" with the
  // currently-selected app, if any).
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setFrom(initialFrom ?? '');
    setTo('');
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  const nameOf = (id: string) => appById.get(id)?.name ?? id;
  const colorFor = (id: string) => {
    const a = appById.get(id);
    return a ? colorOf(a) : '#8F99A8';
  };

  // Relationship verb for a directed hop a -> b (we follow link direction).
  const hopLabel = (a: string, b: string): string => {
    for (const l of links) {
      if (l.source_id === a && l.target_id === b) return RELATIONSHIP_VERBS[l.relationship].out;
    }
    return 'connects to';
  };

  // All shortest *directed* paths from `from` to `to`: BFS over edges in their
  // stored direction (source -> target), recording every predecessor reaching a
  // node at its shortest distance, then backtracking.
  const paths: string[][] = (() => {
    if (!from || !to || from === to) return [];
    // Directed adjacency: source id -> the targets it points at.
    const adj = new Map<string, string[]>();
    for (const l of links) {
      const out = adj.get(l.source_id);
      if (out) out.push(l.target_id);
      else adj.set(l.source_id, [l.target_id]);
    }
    const dist = new Map<string, number>([[from, 0]]);
    const parents = new Map<string, string[]>();
    const queue = [from];
    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      const du = dist.get(u)!;
      if (du >= (dist.get(to) ?? Infinity)) continue; // can't shorten the path to `to`
      for (const v of adj.get(u) ?? []) {
        const dv = dist.get(v);
        if (dv === undefined) {
          dist.set(v, du + 1);
          parents.set(v, [u]);
          queue.push(v);
        } else if (dv === du + 1) {
          parents.get(v)!.push(u);
        }
      }
    }
    if (!dist.has(to)) return [];
    const result: string[][] = [];
    const build = (node: string, suffix: string[]) => {
      if (result.length >= MAX_PATHS) return;
      const path = [node, ...suffix];
      if (node === from) {
        result.push(path);
        return;
      }
      for (const p of parents.get(node) ?? []) {
        build(p, path);
        if (result.length >= MAX_PATHS) return;
      }
    };
    build(to, []);
    return result;
  })();

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const pick = (id: string) => onSelect(id);

  const hops = paths[0] ? paths[0].length - 1 : 0;
  const showVerbs = paths.length === 1;

  const appOptions = (
    <>
      <option value="">Select…</option>
      {sortedApps.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Shortest path between two apps"
      icon="flows"
      className="bp6-dark pathfinder-dialog"
    >
      <DialogBody>
        <FormGroup label="From">
          <HTMLSelect fill value={from} onChange={(e) => setFrom(e.currentTarget.value)}>
            {appOptions}
          </HTMLSelect>
        </FormGroup>

        <div className="pathfinder-swap">
          <Button variant="minimal" icon="swap-vertical" text="Swap" onClick={swap} />
        </div>

        <FormGroup label="To">
          <HTMLSelect fill value={to} onChange={(e) => setTo(e.currentTarget.value)}>
            {appOptions}
          </HTMLSelect>
        </FormGroup>

        <div className="pathfinder-result">
          {!from || !to ? (
            <Callout icon="search" compact>
              Pick two applications to see how they connect. Paths follow link direction
              (From → To).
            </Callout>
          ) : from === to ? (
            <Callout intent="warning" compact>
              Pick two different applications.
            </Callout>
          ) : paths.length === 0 ? (
            <Callout intent="warning" icon="disable" compact>
              No directed path from <b>{nameOf(from)}</b> to <b>{nameOf(to)}</b>. Try swapping the
              direction.
            </Callout>
          ) : (
            <>
              <p className="pathfinder-summary">
                Shortest path: <b>{hops}</b> hop{hops === 1 ? '' : 's'}
                {paths.length > 1 && (
                  <>
                    {' '}
                    · {paths.length}
                    {paths.length >= MAX_PATHS ? '+' : ''} equal-length routes
                  </>
                )}
              </p>
              <div className="pathfinder-paths">
                {paths.map((p, i) => (
                  <div className="path-row" key={i}>
                    {p.map((id, idx) => (
                      <Fragment key={id}>
                        {idx > 0 && (
                          <span className="path-arrow">
                            <Icon icon="arrow-right" size={11} />
                            {showVerbs && <span className="path-verb">{hopLabel(p[idx - 1], id)}</span>}
                          </span>
                        )}
                        <button className="path-node" onClick={() => pick(id)} title={`Show ${nameOf(id)}`}>
                          <span className="dot" style={{ background: colorFor(id) }} />
                          {nameOf(id)}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogBody>
    </Dialog>
  );
}
