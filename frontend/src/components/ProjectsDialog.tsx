import { useState } from 'react';
import { AnchorButton, Button, Callout, Dialog, DialogBody, Icon, Tag } from '@blueprintjs/core';
import type { AppProject } from '../types';

interface ProjectsDialogProps {
  isOpen: boolean;
  appName: string;
  projects: AppProject[];
  onClose: () => void;
}

// Group projects by their `kind`, preserving first-seen order.
function groupByKind(projects: AppProject[]): [string, AppProject[]][] {
  const groups = new Map<string, AppProject[]>();
  for (const p of projects) {
    if (!groups.has(p.kind)) groups.set(p.kind, []);
    groups.get(p.kind)!.push(p);
  }
  return [...groups.entries()];
}

export default function ProjectsDialog({ isOpen, appName, projects, onClose }: ProjectsDialogProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset to the list each time the dialog opens.
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setSelectedId(null);
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  const selected = selectedId != null ? projects.find((p) => p.id === selectedId) ?? null : null;
  const groups = groupByKind(projects);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={selected ? selected.title : `Practice projects · ${appName}`}
      icon="learning"
      className="bp6-dark projects-dialog"
    >
      <DialogBody>
        {projects.length === 0 ? (
          <Callout icon="build" title="No projects yet">
            There are no hands-on projects for <b>{appName}</b> yet — check back soon, or suggest one
            via the Suggest button.
          </Callout>
        ) : selected ? (
          <div className="project-detail">
            <div className="project-detail-head">
              <Button
                variant="minimal"
                icon="chevron-left"
                text="All projects"
                className="project-back"
                onClick={() => setSelectedId(null)}
              />
              <Tag minimal intent="primary" className="project-kind-tag">
                {selected.kind}
              </Tag>
            </div>

            <h4>The scenario</h4>
            <p className="project-context">{selected.context}</p>

            <h4>Your mission</h4>
            <p className="project-instructions">{selected.instructions}</p>

            {selected.dataset_url && (
              <AnchorButton
                href={selected.dataset_url}
                target="_blank"
                rel="noreferrer"
                icon="download"
                endIcon="share"
                intent="primary"
                variant="outlined"
                fill
                className="project-dataset"
              >
                Download the dataset
              </AnchorButton>
            )}
          </div>
        ) : (
          <div className="projects-list">
            <p className="projects-intro">
              Hands-on, real-world exercises to practise <b>{appName}</b>. Pick one to get the full
              brief.
            </p>
            {groups.map(([kind, items]) => (
              <div className="projects-group" key={kind}>
                <h4>{kind}</h4>
                {items.map((p) => (
                  <button className="project-card" key={p.id} onClick={() => setSelectedId(p.id ?? null)}>
                    <span className="project-card-main">
                      <span className="project-card-title">{p.title}</span>
                      <span className="project-card-context">{p.context}</span>
                    </span>
                    <span className="project-card-meta">
                      {p.dataset_url && <Icon icon="download" size={12} title="Dataset included" />}
                      <Icon icon="chevron-right" size={14} />
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </DialogBody>
    </Dialog>
  );
}
