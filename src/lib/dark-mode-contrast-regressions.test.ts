import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentFile = fileURLToPath(import.meta.url);
const srcRoot = path.dirname(currentFile);

type FileExpectation = {
  filePath: string;
  snippets: string[];
};

const expectations: FileExpectation[] = [
  {
    filePath: '../components/layout/AppLayout.tsx',
    snippets: [
      'bg-[#090b0d]/95 backdrop-blur-xl',
      'focus:ring-[#f5b400]/30',
      'text-[10px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
    ],
  },
  {
    filePath: '../components/ui/table.tsx',
    snippets: [
      'text-[#1a1e24] dark:text-slate-200',
      'dark:[&_tr]:border-slate-700',
      'dark:hover:bg-slate-800/50',
      'text-[#68727d] dark:text-slate-400',
    ],
  },
  {
    filePath: '../components/shared/CollectionToolbar.tsx',
    snippets: [
      'rounded-xl border border-white/10 bg-[linear-gradient(180deg,#12171b_0%,#0e1215_100%)]',
      'text-xl font-bold tracking-tight text-[#f7f7f5]',
      'focus-visible:ring-[#f5b400]',
    ],
  },
  {
    filePath: '../pages/admin/SettingsPage.tsx',
    snippets: [
      'className="rounded-lg text-white dark:text-white h-8 shadow-sm"',
      'DialogDescription className="text-sm text-[#616a74] dark:text-slate-100"',
      'text-xs font-semibold uppercase text-gray-400 dark:text-slate-300',
      'text-[10px] text-gray-500 dark:text-slate-300 italic',
    ],
  },
  {
    filePath: '../pages/admin/UsersPage.tsx',
    snippets: [
      'dark:text-white hover:text-[#1d1d1f] dark:hover:text-white transition-colors',
      'dark:border-slate-700 dark:bg-none dark:bg-slate-900 dark:text-slate-100',
      'dark:bg-slate-800 text-sm dark:text-slate-100 focus:ring-2',
    ],
  },
  {
    filePath: '../pages/projects/ProjectDetailPage.tsx',
    snippets: [
      'text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-metal-muted-color)] dark:text-slate-400',
      "isDark ? 'text-slate-400' : 'text-[var(--text-metal-muted-color)]'",
      'border border-[#d2d2d7] dark:border-slate-700 bg-[#f5f5f7] dark:bg-slate-800',
      'text-sm leading-relaxed text-slate-600 dark:text-slate-300',
    ],
  },
  {
    filePath: '../pages/projects/tabs/BlueprintTab.tsx',
    snippets: [
      'dark:border-slate-700 dark:bg-slate-900/70',
      'dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300',
      'metal-panel-strong dark:bg-slate-950/85',
      'dark:border-slate-700 dark:bg-slate-900',
    ],
  },
  {
    filePath: '../pages/projects/tabs/FabricationTab.tsx',
    snippets: [
      'border-sky-400/50 bg-sky-500/10',
      'metal-panel-strong dark:bg-slate-950/85',
      'metal-panel dark:bg-slate-900/85',
      'bg-slate-900/50 dark:bg-slate-800',
    ],
  },
  {
    filePath: '../pages/appointments/AppointmentDetailPage.tsx',
    snippets: [
      'text-xs text-blue-600 hover:underline dark:text-blue-300',
      'text-[11px] text-[#8e8e93] dark:text-slate-400',
      'text-sm text-[#6e6e73] dark:text-slate-300',
    ],
  },
  {
    filePath: '../pages/appointments/AppointmentsPage.tsx',
    snippets: [
      'dark:border-slate-500/80 dark:bg-slate-800/90 dark:text-slate-100',
      'text-[11px] font-semibold uppercase tracking-wider text-[#6d7782] dark:text-slate-400',
      'text-sm text-[#1d1d1f] dark:text-slate-100 font-medium',
      'text-[11px] text-[#68727d] dark:text-slate-400',
      'dark:group-hover:text-slate-200',
    ],
  },
  {
    filePath: '../pages/visit-reports/VisitReportsListPage.tsx',
    snippets: [
      'text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-slate-100',
      'text-[#6e6e73] dark:text-slate-400 mt-1 text-sm',
      'text-[#171b21] dark:text-slate-100',
      'text-[11px] font-medium text-[#6e6e73] dark:text-slate-400',
      'dark:group-hover:text-sky-300',
    ],
  },
  {
    filePath: '../pages/visit-reports/VisitReportPage.tsx',
    snippets: [
      'dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800',
      'text-[13px] font-medium text-gray-700 dark:text-slate-300',
      'dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/30',
    ],
  },
];

const [
  appLayoutExpectation,
  tableExpectation,
  collectionToolbarExpectation,
  settingsExpectation,
  usersExpectation,
  projectDetailExpectation,
  blueprintTabExpectation,
  fabricationTabExpectation,
  appointmentDetailExpectation,
  appointmentsPageExpectation,
  visitReportsListExpectation,
  visitReportDetailExpectation,
] = expectations;

function readSource(relativeFilePath: string): string {
  return readFileSync(path.resolve(srcRoot, relativeFilePath), 'utf8');
}

describe('dark mode contrast regressions', () => {
  it('keeps the app shell contrast fixes in place', () => {
    const source = readSource('../components/layout/AppLayout.tsx');

    expect(appLayoutExpectation).toBeDefined();

    for (const snippet of appLayoutExpectation!.snippets) {
      expect(source).toContain(snippet);
    }
  });

  it('keeps the settings dialog primary action readable in dark mode', () => {
    const source = readSource('../pages/admin/SettingsPage.tsx');

    expect(settingsExpectation).toBeDefined();

    for (const snippet of settingsExpectation!.snippets) {
      expect(source).toContain(snippet);
    }
  });

  it('keeps the users dialog utility actions readable in dark mode', () => {
    const source = readSource('../pages/admin/UsersPage.tsx');

    expect(usersExpectation).toBeDefined();

    for (const snippet of usersExpectation!.snippets) {
      expect(source).toContain(snippet);
    }
  });

  it('keeps shared table and collection toolbar dark styles intact', () => {
    const tableSource = readSource('../components/ui/table.tsx');
    const toolbarSource = readSource('../components/shared/CollectionToolbar.tsx');

    expect(tableExpectation).toBeDefined();
    expect(collectionToolbarExpectation).toBeDefined();

    for (const snippet of tableExpectation!.snippets) {
      expect(tableSource).toContain(snippet);
    }

    for (const snippet of collectionToolbarExpectation!.snippets) {
      expect(toolbarSource).toContain(snippet);
    }
  });

  it('keeps the project detail muted labels and file cards readable in dark mode', () => {
    const source = readSource('../pages/projects/ProjectDetailPage.tsx');

    expect(projectDetailExpectation).toBeDefined();

    for (const snippet of projectDetailExpectation!.snippets) {
      expect(source).toContain(snippet);
    }
  });

  it('keeps the project blueprint and fabrication tabs readable in dark mode', () => {
    const blueprintSource = readSource('../pages/projects/tabs/BlueprintTab.tsx');
    const fabricationSource = readSource('../pages/projects/tabs/FabricationTab.tsx');

    expect(blueprintTabExpectation).toBeDefined();
    expect(fabricationTabExpectation).toBeDefined();

    for (const snippet of blueprintTabExpectation!.snippets) {
      expect(blueprintSource).toContain(snippet);
    }

    for (const snippet of fabricationTabExpectation!.snippets) {
      expect(fabricationSource).toContain(snippet);
    }
  });

  it('keeps the appointment detail metadata readable in dark mode', () => {
    const source = readSource('../pages/appointments/AppointmentDetailPage.tsx');

    expect(appointmentDetailExpectation).toBeDefined();

    for (const snippet of appointmentDetailExpectation!.snippets) {
      expect(source).toContain(snippet);
    }
  });

  it('keeps the appointments list dark-mode overrides in place', () => {
    const source = readSource('../pages/appointments/AppointmentsPage.tsx');

    expect(appointmentsPageExpectation).toBeDefined();

    for (const snippet of appointmentsPageExpectation!.snippets) {
      expect(source).toContain(snippet);
    }
  });

  it('keeps the visit reports list and detail dark-mode overrides in place', () => {
    const listSource = readSource('../pages/visit-reports/VisitReportsListPage.tsx');
    const detailSource = readSource('../pages/visit-reports/VisitReportPage.tsx');

    expect(visitReportsListExpectation).toBeDefined();
    expect(visitReportDetailExpectation).toBeDefined();

    for (const snippet of visitReportsListExpectation!.snippets) {
      expect(listSource).toContain(snippet);
    }

    for (const snippet of visitReportDetailExpectation!.snippets) {
      expect(detailSource).toContain(snippet);
    }
  });
});
