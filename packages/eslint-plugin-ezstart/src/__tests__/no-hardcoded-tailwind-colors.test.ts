import { noHardcodedTailwindColors } from '../rules/no-hardcoded-tailwind-colors.js'
import { ruleTester } from './rule-tester.js'

ruleTester.run('no-hardcoded-tailwind-colors', noHardcodedTailwindColors, {
  valid: [
    // Semantic tokens are fine.
    { code: 'const Page = () => <div className="bg-primary text-foreground" />' },
    { code: 'const Page = () => <div className="bg-card text-muted-foreground border" />' },
    { code: 'const Page = () => <div className="bg-destructive text-destructive-foreground" />' },
    // Utility classes without color palette are fine.
    { code: 'const Page = () => <div className="flex items-center gap-4 p-4" />' },
    // No className, nothing to check.
    { code: 'const Page = () => <div data-id="x" />' },
    // cn() with semantic tokens only.
    { code: "import { cn } from '@ezstart/ui'; cn('bg-primary', 'text-foreground')" },
    // Arbitrary values not flagged (that's a different debate).
    { code: 'const Page = () => <div className="bg-[#123456]" />' },
  ],
  invalid: [
    // Bare bg-red-500.
    {
      code: 'const Page = () => <div className="bg-red-500" />',
      errors: [{ messageId: 'hardcoded' }],
    },
    // text-gray-700.
    {
      code: 'const Page = () => <div className="p-4 text-gray-700" />',
      errors: [{ messageId: 'hardcoded' }],
    },
    // With variant prefix.
    {
      code: 'const Page = () => <div className="hover:bg-blue-600" />',
      errors: [{ messageId: 'hardcoded' }],
    },
    // With alpha.
    {
      code: 'const Page = () => <div className="bg-slate-900/50" />',
      errors: [{ messageId: 'hardcoded' }],
    },
    // Inside cn().
    {
      code: "import { cn } from '@ezstart/ui'; cn('bg-primary', 'text-gray-500')",
      errors: [{ messageId: 'hardcoded' }],
    },
    // Conditional inside cn().
    {
      code: "import { cn } from '@ezstart/ui'; cn(cond ? 'bg-red-500' : 'bg-primary')",
      errors: [{ messageId: 'hardcoded' }],
    },
    // Template literal.
    {
      code: 'const Page = () => <div className={`flex bg-indigo-500 ${x}`} />',
      errors: [{ messageId: 'hardcoded' }],
    },
  ],
})
