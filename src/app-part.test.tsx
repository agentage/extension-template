// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestRecord, TestHost } from '@agentage/extension/app/test-host';
import App from './app/index.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = '';
});

describe('the app part', () => {
  it('Echo calls the own api with the message and shows the answer', async () => {
    const record = createTestRecord();
    const el = document.body.appendChild(document.createElement('div'));
    root = createRoot(el);
    await act(async () =>
      root?.render(
        <TestHost
          id="template"
          user={null}
          scopes={[]}
          record={record}
          reply={() => ({ msg: 'hi' })}
        >
          <App />
        </TestHost>
      )
    );
    const echo = [...el.querySelectorAll('button')].find((b) => b.textContent === 'Echo');
    await act(async () => echo?.click());
    expect(record.calls[0]).toMatchObject({ id: 'template', path: '/echo?msg=hi' });
    expect(el.textContent).toContain('"msg":"hi"');
  });
});
