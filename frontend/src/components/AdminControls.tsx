import { useState } from 'react';
import {
  Button,
  Callout,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  InputGroup,
} from '@blueprintjs/core';
import { checkAdminToken } from '../api';

interface AdminControlsProps {
  unlocked: boolean;
  onUnlock: (token: string) => void;
  onLock: () => void;
}

export default function AdminControls({ unlocked, onUnlock, onLock }: AdminControlsProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!token.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const ok = await checkAdminToken(token.trim());
      if (!ok) {
        setError('That token was rejected.');
        return;
      }
      onUnlock(token.trim());
      setOpen(false);
      setToken('');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <button
        className={`admin-control ${unlocked ? 'unlocked' : ''}`}
        title={unlocked ? 'Editing unlocked — click to lock' : 'Unlock editing (admin)'}
        onClick={() => (unlocked ? onLock() : setOpen(true))}
      >
        <span className={`bp6-icon bp6-icon-${unlocked ? 'unlock' : 'lock'}`} />
        <span className="admin-control-label">Admin</span>
      </button>

      <Dialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Unlock editing"
        icon="lock"
        className="bp6-dark"
      >
        <DialogBody>
          <p className="admin-hint">
            Enter the admin token to edit applications. Everyone else has read-only access.
          </p>
          <FormGroup label="Admin token">
            <InputGroup
              type="password"
              value={token}
              autoFocus
              placeholder="Paste your token…"
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
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
              <Button text="Cancel" onClick={() => setOpen(false)} />
              <Button
                text="Unlock"
                intent="primary"
                loading={checking}
                onClick={submit}
              />
            </>
          }
        />
      </Dialog>
    </>
  );
}
