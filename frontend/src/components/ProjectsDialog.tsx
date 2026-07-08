import { useState } from 'react';
import { AnchorButton, Button, Callout, Dialog, DialogBody, Icon, Tag } from '@blueprintjs/core';
import type { AppProject } from '../types';
import { useData } from '../DataContext';

interface ProjectsDialogProps {
  isOpen: boolean;
  appName: string;
  projects: AppProject[];
  /** Open straight to this project's detail (e.g. from the Projects gallery). */
  initialProjectId?: number | null;
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

export default function ProjectsDialog({
  isOpen,
  appName,
  projects,
  initialProjectId = null,
  onClose,
}: ProjectsDialogProps) {
  // All projects (not just this app's) so a multi-project can span applications.
  const { projects: allProjects, appById } = useData();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  // On open, jump straight to a project if one was requested, else show the list.
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setSelectedId(initialProjectId);
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  const selected = selectedId != null ? allProjects.find((p) => p.id === selectedId) ?? null : null;
  const groups = groupByKind(projects);
  const appNameOf = (id: string) => appById.get(id)?.name ?? id;

  // Ordered steps of the selected project's multi-project (if any).
  const trackSteps: AppProject[] = selected?.track
    ? allProjects
        .filter((p) => p.track === selected.track)
        .sort((a, b) => a.track_step - b.track_step || (a.id ?? 0) - (b.id ?? 0))
    : [];
  const currentIdx = trackSteps.findIndex((p) => p.id === selected?.id);
  const nextStep = currentIdx >= 0 ? trackSteps[currentIdx + 1] : undefined;

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
              <span className="project-detail-tags">
                {selected.track && (
                  <Tag minimal intent="success" icon="flows">
                    Step {selected.track_step} of {trackSteps.length}
                  </Tag>
                )}
                <Tag minimal intent="primary" className="project-kind-tag">
                  {selected.kind}
                </Tag>
              </span>
            </div>

            {selected.track && (
              <Callout className="project-track-banner" icon="flows" intent="success">
                Part of the multi-project <b>{selected.track}</b>.
              </Callout>
            )}

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

            {trackSteps.length > 1 && (
              <>
                <h4>Multi-project steps</h4>
                <ol className="track-steps">
                  {trackSteps.map((s) => (
                    <li key={s.id}>
                      <button
                        className={`track-step ${s.id === selected.id ? 'current' : ''}`}
                        onClick={() => s.id != null && setSelectedId(s.id)}
                      >
                        <span className="track-step-num">{s.track_step}</span>
                        <span className="track-step-main">
                          <span className="track-step-title">{s.title}</span>
                          <span className="track-step-app">{appNameOf(s.app_id)}</span>
                        </span>
                        {s.id === selected.id ? (
                          <Tag minimal>Current</Tag>
                        ) : (
                          <Icon icon="chevron-right" size={14} />
                        )}
                      </button>
                    </li>
                  ))}
                </ol>
                {nextStep && (
                  <Button
                    intent="primary"
                    rightIcon="arrow-right"
                    fill
                    className="track-next"
                    onClick={() => nextStep.id != null && setSelectedId(nextStep.id)}
                  >
                    Next step · {nextStep.title}
                  </Button>
                )}
              </>
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
                      {p.track && (
                        <span className="project-card-track">
                          <Icon icon="flows" size={11} /> {p.track} · step {p.track_step}
                        </span>
                      )}
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
