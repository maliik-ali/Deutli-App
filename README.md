# Gateway2Deutsch platform

German B1 exam preparation — Next.js + Supabase, deployed on Vercel.

- Setup (Supabase SQL, keys, Vercel): [docs/SETUP.md](docs/SETUP.md)
- Project rules: [CLAUDE.md](CLAUDE.md) · Design system: [.claude/skills/g2d-ui/SKILL.md](.claude/skills/g2d-ui/SKILL.md)

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm run lint
```

## Deploy

Live: https://g2d-app-ali-3548.vercel.app — hosted on Vercel, connected to this repo: every push to `main` deploys automatically.
Environment variables to set in Vercel are listed in [docs/SETUP.md](docs/SETUP.md) (section C).
