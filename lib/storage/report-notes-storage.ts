const REPORT_NOTES_KEY = "astro-clean-report-notes";

export type ReportNotesMap = Record<string, string>;

function canUseStorage() {
  return typeof window !== "undefined";
}

export function loadReportNotes(): ReportNotesMap {
  if (!canUseStorage()) {
    return {};
  }

  const rawValue = window.localStorage.getItem(REPORT_NOTES_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    const notes = parsedValue as Record<string, unknown>;
    const cleanNotes: ReportNotesMap = {};

    for (const [reportId, note] of Object.entries(notes)) {
      if (typeof note === "string") {
        cleanNotes[reportId] = note;
      }
    }

    return cleanNotes;
  } catch {
    return {};
  }
}

export function loadReportNote(reportId: string) {
  return loadReportNotes()[reportId] ?? "";
}

export function saveReportNote(reportId: string, note: string) {
  if (!canUseStorage()) {
    return;
  }

  const notes = loadReportNotes();
  const cleanNote = note.trim();

  if (!cleanNote) {
    delete notes[reportId];
  } else {
    notes[reportId] = cleanNote;
  }

  window.localStorage.setItem(REPORT_NOTES_KEY, JSON.stringify(notes));
}

export function saveReportNotes(notes: ReportNotesMap) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(REPORT_NOTES_KEY, JSON.stringify(notes));
}

export function deleteReportNote(reportId: string) {
  if (!canUseStorage()) {
    return;
  }

  const notes = loadReportNotes();
  delete notes[reportId];

  window.localStorage.setItem(REPORT_NOTES_KEY, JSON.stringify(notes));
}

export function clearReportNotes() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(REPORT_NOTES_KEY);
}
