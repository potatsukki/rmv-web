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
      'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78818c] dark:text-slate-300',
      'truncate text-[#4d5560] dark:text-slate-400',
      'text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
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
      'text-[#15191f] dark:text-slate-100',
      'text-[#616a74] dark:text-slate-400',
      'metal-pill text-[#59626d] dark:text-slate-300 hover:-translate-y-0.5 hover:text-[#14181d] dark:hover:text-white',
    ],
  },
  {
    filePath: '../pages/admin/SettingsPage.tsx',
    snippets: [
      'className="rounded-lg text-white dark:text-white"',
      'DialogDescription className="text-[#616a74] dark:text-slate-100"',
      'text-xs font-mono text-gray-500 dark:text-slate-300 uppercase',
      'text-xs text-gray-400 dark:text-slate-300',
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
      "text-[var(--color-border)] dark:text-slate-400",
      "text-[var(--text-metal-muted-color)] dark:text-slate-300",
      'dark:border-slate-700 bg-[#f5f5f7] dark:bg-slate-800 text-left',
      'text-sm text-[#6e6e73] dark:text-slate-400 py-2',
    ],
  },
  {
    filePath: '../pages/projects/tabs/BlueprintTab.tsx',
    snippets: [
      'dark:border-slate-700 dark:bg-slate-900/70',
      'dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300',
      'dark:border-slate-700 dark:bg-slate-800/65',
      'dark:border-slate-700 dark:bg-slate-900',
    ],
  },
  {
    filePath: '../pages/projects/tabs/FabricationTab.tsx',
    snippets: [
      'dark:border-indigo-500/35 dark:bg-indigo-500/10',
      'dark:border-slate-700 dark:bg-slate-900/80',
      'dark:border-slate-700 dark:bg-slate-900',
      'dark:border-slate-700 dark:bg-slate-800',
    ],
  },
  {
    filePath: '../pages/appointments/AppointmentDetailPage.tsx',
    snippets: [
      'text-xs text-blue-600 dark:text-blue-300 hover:underline',
      "text-xs text-[#86868b] dark:text-slate-400 mt-0.5",
      'text-sm text-[#6e6e73] dark:text-slate-300',
    ],
  },
  {
    filePath: '../pages/appointments/AppointmentsPage.tsx',
    snippets: [
      'text-2xl font-bold tracking-tight text-[#171b21] dark:text-slate-100',
      'text-[11px] font-semibold text-[#5f6872] dark:text-slate-300',
      'text-sm font-medium text-[#171b21] dark:text-slate-100',
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
      'text-[11px] text-[#86868b] dark:text-slate-400',
      'dark:group-hover:text-sky-300',
    ],
  },
  {
    filePath: '../pages/visit-reports/VisitReportPage.tsx',
    snippets: [
      'dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800',
      'text-[13px] font-medium text-gray-700 dark:text-slate-300',
      'dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500',
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