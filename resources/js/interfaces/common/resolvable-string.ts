/**
 * Pattern used to identify environment variable placeholders in strings.
 * Matches double-brace syntax: {{variable_name}}
 */
export const PLACEHOLDER_PATTERN = /{{\s*([^{}]+?)\s*}}/g;

/**
 * Status of an environment variable placeholder within a string.
 */
export enum EnvVariableCheckStatus {
    None = 'none',
    Missing = 'missing',
    Empty = 'empty',
    Resolved = 'resolved',
}

/**
 * Represents a segment of a string, identifying
 * whether it is a reactive environment placeholder or static text.
 */
export interface StringSegment {
    text: string;
    isEnvVariable: boolean;
    status?: EnvVariableCheckStatus;
    resolvedValue?: string | null;
}

/**
 * Represents a string that can exist either as a raw value (with potential placeholders)
 * or as its final resolved version after environment variables are processed.
 */
export type ResolvableString = { raw: string; resolved: string };
