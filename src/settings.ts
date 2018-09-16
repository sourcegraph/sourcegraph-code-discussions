/**
 * The resolved and normalized settings for this extension, the result of calling resolveSettings on a raw settings
 * value.
 *
 * See the "contributes.configuration" field in package.json for the canonical documentation on these properties.
 */
export interface Settings {
    ['discussions.decorations.inline']: boolean
}

/** Returns a copy of the extension settings with values normalized and defaults applied. */
export function resolveSettings(raw: Partial<Settings>): Settings {
    return {
        ['discussions.decorations.inline']: !!raw['discussions.decorations.inline'],
    }
}
