"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Returns a copy of the extension settings with values normalized and defaults applied. */
function resolveSettings(raw) {
    return {
        ['discussions.decorations.inline']: !!raw['discussions.decorations.inline'],
    };
}
exports.resolveSettings = resolveSettings;
//# sourceMappingURL=settings.js.map