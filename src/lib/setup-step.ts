/** One step of a "Get started" checklist (teacher or student). */
export type SetupStep = {
  key: string;
  title: string;
  hint: string;
  href: string;
  done: boolean;
};
