import { ESLint } from 'eslint';
import { describe, expect, it, vi } from 'vitest';

const eslint = new ESLint();

const lint = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  const ids = result?.messages.map((m) => m.ruleId ?? m.message.slice(0, 200)) ?? [];
  return ids.length ? ids : [JSON.stringify(result).slice(0, 600)];
};

vi.setConfig({ testTimeout: 30_000 });

describe('the app lint rule: no raw fetch in src/app', () => {
  it.each(["fetch('/x')", "window.fetch('/x')", "globalThis.fetch('/x')"])(
    '%s is refused',
    async (code) => {
      const rules = await lint(`export const x = () => ${code};\n`, 'src/app/index.tsx');
      expect(rules.join('|')).toContain('no-restricted-syntax');
    }
  );

  it('fetch outside src/app is allowed', async () => {
    const rules = await lint("export const x = () => fetch('/x');\n", 'src/api/index.ts');
    expect(rules.filter((id) => id?.startsWith('no-restricted-'))).toEqual([]);
  });
});
