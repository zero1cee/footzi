/**
 * Zod 4 replaced `required_error` and `invalid_type_error` with one `error` option. These keep the old
 * behaviour: the friendly message appears only for the case it was written for, and Zod's own wording
 * covers everything else.
 */
type Issue = { input?: unknown };

/** For a field that was left out entirely. */
export const required = (message: string) => ({ error: (issue: Issue) => (issue.input === undefined ? message : undefined) });

/** For a field that was sent, but as the wrong kind of value. */
export const wrongType = (message: string) => ({ error: (issue: Issue) => (issue.input === undefined ? undefined : message) });
