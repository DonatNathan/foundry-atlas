import { useMemo, useState } from 'react';
import {
  Button,
  Callout,
  Dialog,
  DialogBody,
  FormGroup,
  InputGroup,
  Radio,
  RadioGroup,
  TextArea,
  Tooltip,
} from '@blueprintjs/core';
import type { Filters } from '../types';
import { buildEmbedSnippet, buildEmbedSrc, type EmbedMode } from '../urlState';

interface EmbedButtonProps {
  selectedId: string | null;
  selectedAppName: string | null;
  filters: Filters;
  allCategoryIds: string[];
}

const DEFAULTS: Record<EmbedMode, { width: string; height: string }> = {
  map: { width: '100%', height: '640' },
  card: { width: '480', height: '460' },
};

// Builds the "Embed this map" <iframe> snippet for the current view, with a
// live preview so people can drop the map (or a single app card) into Notion,
// a wiki, or a blog post.
export default function EmbedButton({
  selectedId,
  selectedAppName,
  filters,
  allCategoryIds,
}: EmbedButtonProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<EmbedMode>('map');
  const [width, setWidth] = useState(DEFAULTS.map.width);
  const [height, setHeight] = useState(DEFAULTS.map.height);
  const [copied, setCopied] = useState(false);

  const canCard = selectedId !== null;
  // A card embed needs a selected app; fall back to the map if none is picked.
  const effectiveMode: EmbedMode = mode === 'card' && !canCard ? 'map' : mode;

  const chooseMode = (next: EmbedMode) => {
    setMode(next);
    setWidth(DEFAULTS[next].width);
    setHeight(DEFAULTS[next].height);
  };

  const src = useMemo(
    () =>
      buildEmbedSrc(
        { view: 'map', selectedId, filters },
        allCategoryIds,
        effectiveMode,
      ),
    [selectedId, filters, allCategoryIds, effectiveMode],
  );
  const snippet = buildEmbedSnippet(src, width || '100%', height || '600');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      window.prompt('Copy this embed snippet:', snippet);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="top-action">
      <Tooltip content="Embed this map elsewhere" placement="bottom">
        <Button variant="minimal" icon="code-block" text="Embed" onClick={() => setOpen(true)} />
      </Tooltip>

      <Dialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Embed Foundry Atlas"
        icon="code-block"
        className="bp6-dark embed-dialog"
      >
        <DialogBody>
          <p className="embed-intro">
            Drop a live, interactive Foundry Atlas into Notion, an internal wiki, or a blog post.
            The embed reflects your current filters and links back here.
          </p>

          <FormGroup label="What to embed">
            <RadioGroup
              inline
              selectedValue={effectiveMode}
              onChange={(e) => chooseMode(e.currentTarget.value as EmbedMode)}
            >
              <Radio label="Whole map" value="map" />
              <Radio
                label={
                  canCard ? `App card · ${selectedAppName}` : 'App card (select an app first)'
                }
                value="card"
                disabled={!canCard}
              />
            </RadioGroup>
          </FormGroup>

          <div className="edit-row">
            <FormGroup label="Width" className="edit-col">
              <InputGroup value={width} onChange={(e) => setWidth(e.target.value)} placeholder="100%" />
            </FormGroup>
            <FormGroup label="Height" className="edit-col">
              <InputGroup value={height} onChange={(e) => setHeight(e.target.value)} placeholder="600" />
            </FormGroup>
          </div>

          <FormGroup label="Preview">
            <div className="embed-preview">
              <iframe
                key={src}
                src={src}
                title="Foundry Atlas embed preview"
                loading="lazy"
              />
            </div>
          </FormGroup>

          <FormGroup label="Embed code">
            <TextArea value={snippet} readOnly fill rows={3} className="embed-snippet" />
          </FormGroup>

          {effectiveMode === 'card' && (
            <Callout compact intent="primary" icon="info-sign">
              The card shows <b>{selectedAppName}</b> and its connections under the current filters.
            </Callout>
          )}

          <div className="embed-actions">
            <Button
              icon={copied ? 'tick' : 'clipboard'}
              intent={copied ? 'success' : 'primary'}
              text={copied ? 'Copied!' : 'Copy embed code'}
              onClick={copy}
            />
          </div>
        </DialogBody>
      </Dialog>
    </div>
  );
}
