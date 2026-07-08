import { Fragment, useMemo, useState } from 'react';
import { Callout, Icon, Tag } from '@blueprintjs/core';
import type { AppProject } from '../types';
import { useData } from '../DataContext';
import ProjectsDialog from './ProjectsDialog';

// One card in the gallery: a standalone project, or a whole multi-project.
type Entry =
  | { type: 'solo'; key: string; project: AppProject }
  | { type: 'multi'; key: string; track: string; steps: AppProject[] };

interface OpenState {
  projects: AppProject[];
  title: string;
  initialId: number | null;
}

export default function ProjectsView() {
  const { projects, appById, colorOf } = useData();
  const [open, setOpen] = useState<OpenState | null>(null);

  const appNameOf = (id: string) => appById.get(id)?.name ?? id;
  const appColorOf = (id: string) => {
    const a = appById.get(id);
    return a ? colorOf(a) : '#8F99A8';
  };

  // Group projects: each solo = one entry, each multi-project (track) = one entry.
  const entries = useMemo<Entry[]>(() => {
    const tracks = new Map<string, AppProject[]>();
    const solos: AppProject[] = [];
    for (const p of projects) {
      if (p.track) {
        if (!tracks.has(p.track)) tracks.set(p.track, []);
        tracks.get(p.track)!.push(p);
      } else {
        solos.push(p);
      }
    }
    const multi: Entry[] = [...tracks.entries()].map(([track, steps]) => ({
      type: 'multi',
      key: `track:${track}`,
      track,
      steps: [...steps].sort((a, b) => a.track_step - b.track_step || (a.id ?? 0) - (b.id ?? 0)),
    }));
    const solo: Entry[] = solos.map((p) => ({ type: 'solo', key: `p:${p.id ?? p.title}`, project: p }));
    return [...multi, ...solo].sort((a, b) =>
      (a.type === 'multi' ? a.track : a.project.title).localeCompare(
        b.type === 'multi' ? b.track : b.project.title
      )
    );
  }, [projects]);

  const openSolo = (p: AppProject) =>
    setOpen({ projects: [p], title: appNameOf(p.app_id), initialId: p.id ?? null });
  const openMulti = (track: string, steps: AppProject[]) =>
    setOpen({ projects: steps, title: track, initialId: steps[0]?.id ?? null });

  return (
    <div className="projects-view bp6-dark">
      <div className="projects-view-head">
        <h2>Projects</h2>
        <p className="projects-view-sub">
          Hands-on, real-world exercises to practise Foundry — {entries.length} in total.
        </p>
      </div>

      {entries.length === 0 ? (
        <Callout icon="build" title="No projects yet" className="projects-view-empty">
          Practice projects added in the Admin tab will appear here.
        </Callout>
      ) : (
        <div className="projects-grid">
          {entries.map((e) =>
            e.type === 'multi' ? (
              <button className="project-tile" key={e.key} onClick={() => openMulti(e.track, e.steps)}>
                <div className="project-tile-top">
                  <Tag minimal intent="success" icon="flows">
                    Multi-project · {e.steps.length} steps
                  </Tag>
                  {e.steps.some((s) => s.dataset_url) && <Icon icon="download" size={13} />}
                </div>
                <h3>{e.track}</h3>
                <p className="project-tile-context">{e.steps[0]?.context}</p>
                <div className="project-tile-flow">
                  {e.steps.map((s, i) => (
                    <Fragment key={s.id ?? i}>
                      {i > 0 && <Icon icon="chevron-right" size={11} className="project-tile-arrow" />}
                      <span className="project-tile-app">
                        <span className="dot" style={{ background: appColorOf(s.app_id) }} />
                        {appNameOf(s.app_id)}
                      </span>
                    </Fragment>
                  ))}
                </div>
              </button>
            ) : (
              <button className="project-tile" key={e.key} onClick={() => openSolo(e.project)}>
                <div className="project-tile-top">
                  <Tag minimal intent="primary">
                    {e.project.kind}
                  </Tag>
                  {e.project.dataset_url && <Icon icon="download" size={13} />}
                </div>
                <h3>{e.project.title}</h3>
                <p className="project-tile-context">{e.project.context}</p>
                <div className="project-tile-flow">
                  <span className="project-tile-app">
                    <span className="dot" style={{ background: appColorOf(e.project.app_id) }} />
                    {appNameOf(e.project.app_id)}
                  </span>
                </div>
              </button>
            )
          )}
        </div>
      )}

      <ProjectsDialog
        isOpen={open !== null}
        appName={open?.title ?? ''}
        projects={open?.projects ?? []}
        initialProjectId={open?.initialId ?? null}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}
