import { ESLint } from 'eslint';
import { describe, expect, it, vi } from 'vitest';

const lint = async (code: string, filePath: string) => {
  const [result] = await new ESLint().lintText(code, { filePath });
  return result?.messages.map((m) => m.ruleId) ?? [];
};

vi.setConfig({ testTimeout: 30_000 });

describe('the app lint rule: no raw fetch in src/app', () => {
  it.each(['fetch("/x")', 'window.fetch("/x")', 'globalThis.fetch("/x")'])(
    '%s is refused',
    async (code) => {
      const rules = await lint(`export const x = () => ${code};\n`, 'src/app/index.tsx');
      expect(rules.some((id) => id?.startsWith('no-restricted-'))).toBe(true);
    }
  );

  it('fetch outside src/app is allowed', async () => {
    const rules = await lint('export const x = () => fetch("/x");\n', 'src/api/index.ts');
    expect(rules.filter((id) => id?.startsWith('no-restricted-'))).toEqual([]);
  });
});
