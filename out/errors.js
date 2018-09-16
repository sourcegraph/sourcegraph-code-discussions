"use strict";
// TODO: This file is allllll copypasta!
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErrorLike = (val) => !!val && typeof val === 'object' && (!!val.stack || ('message' in val || 'code' in val)) && !('__typename' in val);
/**
 * Ensures a value is a proper Error, copying all properties if needed
 */
exports.asError = (err) => {
    if (err instanceof Error) {
        return err;
    }
    if (typeof err === 'object' && err !== null) {
        return Object.assign(new Error(err.message), err);
    }
    return new Error(err);
};
/**
 * DEPRECATED: use dataOrThrowErrors instead
 * Creates an aggregate error out of multiple provided error likes
 *
 * @param errors The errors or ErrorLikes to aggregate
 */
exports.createAggregateError = (errors = []) => Object.assign(new Error(errors.map(e => e.message).join('\n')), {
    name: 'AggregateError',
    errors: errors.map(exports.asError),
});
/**
 * Improves error messages in case of ajax errors
 */
exports.normalizeAjaxError = (err) => {
    if (!err) {
        return;
    }
    if (typeof err.status === 'number') {
        if (err.status === 0) {
            err.message = 'Unable to reach server. Check your network connection and try again in a moment.';
        }
        else {
            err.message = `Unexpected HTTP error: ${err.status}`;
            if (err.xhr && err.xhr.statusText) {
                err.message += ` ${err.xhr.statusText}`;
            }
        }
    }
};
//# sourceMappingURL=errors.js.map