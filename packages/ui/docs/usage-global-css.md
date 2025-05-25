# 🖌️ Required: Global CSS & Tailwind Setup

To ensure EzStart components are styled correctly, you **must** import the global CSS from [`@ezstart/ui`](https://npmjs.com/package/@ezstart/ui) once in your app:

```tsx
import '@ezstart/ui/globals.css';
```

Add this import at the root of your app (e.g. in \_app.tsx or main.tsx).

Alternative (full control):

You can also copy the globals.css file directly into your own project and adapt it as needed:

[Download globals.css (Raw)](https://raw.githubusercontent.com/DFranck/ez-start/packages/ui/styles/globals.css)

Import it in your app’s entrypoint:

```tsx
import './path/to/your/globals.css';
```

Note: If you copy and modify the CSS, you are responsible for future updates and compatibility with EzStart components.
