import { useAppHost, useAppState } from '@agentage/extension/app';
import { Button } from '@agentage/design-system/button';
import { Input } from '@agentage/design-system/input';
import { Label } from '@agentage/design-system/label';
import { useState } from 'react';

// The shell page of the extension: it reaches its own api through useAppHost().api, never fetch.
export default function App() {
  const { api } = useAppHost();
  const [msg, setMsg] = useAppState('msg', 'hi');
  const [answer, setAnswer] = useState('');
  const ping = async () => {
    try {
      setAnswer(JSON.stringify(await api(`/echo?msg=${encodeURIComponent(msg)}`)));
    } catch (err) {
      setAnswer(String((err as { code?: string }).code ?? err));
    }
  };
  return (
    <section className="flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">template</h1>
      <div className="flex flex-col gap-2">
        <Label htmlFor="template-msg">Message</Label>
        <Input id="template-msg" value={msg} onChange={(e) => setMsg(e.target.value)} />
      </div>
      <Button onClick={() => void ping()}>Echo</Button>
      <p aria-live="polite" className="min-h-6">
        {answer}
      </p>
    </section>
  );
}
