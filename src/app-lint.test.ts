import { ESLint } from 'eslint';
import { describe, expect, it, vi } from 'vitest';

// With CI set, typescript-eslint assumes a one-shot CLI run and the first lintText returns nothing.
process.env['TSESTREE_SINGLE_RUN'] = 'false';
const eslint = new ESLint();

const lint = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.map((m) => m.ruleId ?? m.message.slice(0, 200)) ?? [];
};

vi.setConfig({ testTimeout: 30_000 });

describe('the app lint rule: no raw fetch in src/app', () => {
  it.each(["fetch('/x')", "window.fetch('/x')", "globalThis.fetch('/x')"])(
    '%s is refused',
    async (code) => {
      const rules = await lint(`export const x = () => ${code};\n`, 'src/app/index.tsx');
      expect(rules).toEqual(['no-restricted-syntax']);
    }
  );

  it('fetch outside src/app is allowed', async () => {
    const rules = await lint("export const x = () => fetch('/x');\n", 'src/api/index.ts');
    expect(rules).toEqual([]);
  });
});
