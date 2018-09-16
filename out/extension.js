"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sourcegraph = __importStar(require("sourcegraph"));
const api_1 = require("./api");
const distance_in_words_to_now_1 = __importDefault(require("date-fns/distance_in_words_to_now"));
const settings_1 = require("./settings");
function activate() {
    function activeEditor() {
        return sourcegraph.app.activeWindow ? sourcegraph.app.activeWindow.visibleViewComponents[0] : undefined;
    }
    // When the configuration or current file changes, publish new decorations.
    function decorate(editor = activeEditor()) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!editor) {
                return;
            }
            const u = new URL(editor.document.uri);
            const uri = {
                repositoryName: u.pathname.slice(2),
                revision: u.search.slice(1),
                filePath: u.hash.slice(1),
            };
            const threads = yield api_1.fetchDiscussionThreads({
                first: 10000,
                targetRepositoryName: uri.repositoryName,
                targetRepositoryPath: uri.filePath,
                relativeRev: uri.revision,
            });
            let decorations = [];
            threads.nodes.forEach(thread => {
                const settings = settings_1.resolveSettings(sourcegraph.configuration.get().value);
                if (!settings['discussions.decorations.inline']) {
                    return;
                }
                if (thread.target.__typename !== 'DiscussionThreadTargetRepo') {
                    return;
                }
                var target = thread.target;
                if (target.relativePath !== uri.filePath) {
                    // TODO(slimsag): shouldn't the discussions API return threads created in different files and moved here, too? lol :facepalm:
                    return; // comment has since moved to a different file.
                }
                const shortTitle = thread.title.length > 29 ? thread.title.slice(0, 29) + '…' : thread.title;
                const describeThread = title => `"${title}" by ${thread.author.displayName || thread.author.username} ${distance_in_words_to_now_1.default(thread.createdAt)} ago`;
                // TODO(slimsag): color scheme detection is impossible, see https://github.com/sourcegraph/sourcegraph-extension-api/issues/63
                const color = location.host === 'github.com' ? 'black' : '#0366d6'; // #3b4d6e
                const backgroundColor = location.host === 'github.com' ? 'white' : 'rgba(28, 126, 214, 0.3)'; // #151c28
                decorations.push({
                    range: new sourcegraph.Range(new sourcegraph.Position(target.relativeSelection.startLine - 1, target.relativeSelection.startCharacter), new sourcegraph.Position(target.relativeSelection.endLine - 1, target.relativeSelection.endCharacter)),
                    after: {
                        contentText: ' 💬 ' + describeThread(shortTitle),
                        linkURL: location.host
                            ? thread.inlineURL.slice(thread.inlineURL.lastIndexOf('#'))
                            : thread.inlineURL,
                        hoverMessage: ' ' + describeThread(thread.title),
                        color: color,
                    },
                    backgroundColor: backgroundColor,
                });
            });
            try {
                editor.setDecorations(null, decorations);
            }
            catch (err) {
                console.error('Decoration error:', err);
            }
        });
    }
    sourcegraph.configuration.subscribe(() => decorate());
    // TODO(sqs): Add a way to get notified when a new editor is opened (because we want to be able to pass an `editor` to `updateDecorations`/`updateContext`, but this subscription just gives us a `doc`).
    sourcegraph.workspace.onDidOpenTextDocument.subscribe(() => decorate());
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map