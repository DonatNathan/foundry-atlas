import { useState } from 'react';
import { Button, Tooltip } from '@blueprintjs/core';

// Copies the current URL — which App keeps in sync with the view, selected app,
// and filters — so the active view can be shared as a permalink.
export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const link = window.location.href;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard API can be unavailable (insecure origin / permissions).
      window.prompt('Copy this shareable link:', link);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="top-action">
      <Tooltip
        content={copied ? 'Link copied!' : 'Copy a shareable link to this view'}
        placement="bottom"
      >
        <Button
          variant="minimal"
          icon={copied ? 'tick' : 'link'}
          intent={copied ? 'success' : 'none'}
          text={copied ? 'Copied' : 'Share'}
          onClick={copy}
        />
      </Tooltip>
    </div>
  );
}
