import { distanceInWordsToNow } from 'date-fns'
import * as sourcegraph from 'sourcegraph'
import { resolveSettings, Settings } from './settings'
import { fetchDiscussionThreads } from './shared/api'
import { resolveURI } from './uri'

const decorationType = sourcegraph.app.createDecorationType && sourcegraph.app.createDecorationType()

export function activate(): void {
    function activeEditor(): sourcegraph.CodeEditor | undefined {
        return sourcegraph.app.activeWindow ? sourcegraph.app.activeWindow.visibleViewComponents[0] : undefined
    }

    // When the configuration or current file changes, publish new decorations.
    async function decorate(editor: sourcegraph.CodeEditor | undefined = activeEditor()): Promise<void> {
        if (!editor) {
            return
        }
        const settings = resolveSettings(sourcegraph.configuration.get<Settings>().value)
        if (!settings['discussions.decorations.inline']) {
            editor.setDecorations(decorationType, []) // clear decorations
            return
        }

        const uri = resolveURI(editor.document.uri)
        if (!uri) {
            return
        }

        const threads = await fetchDiscussionThreads({
            first: 10000,
            targetRepositoryName: uri.repo,
            targetRepositoryPath: uri.path,
            relativeRev: uri.rev,
        })

        const decorations: sourcegraph.TextDocumentDecoration[] = []
        for (const thread of threads.nodes) {
            if (thread.target.__typename !== 'DiscussionThreadTargetRepo') {
                return
            }
            const target: SourcegraphGQL.IDiscussionThreadTargetRepo = thread.target
            if (target.relativePath !== uri.path) {
                // TODO(slimsag): shouldn't the discussions API return threads created in different files and moved here, too? lol :facepalm:
                return // comment has since moved to a different file.
            }
            if (!target.relativeSelection) {
                return // selection has no relative place in this revision of the file.
            }

            const shortTitle = thread.title.length > 29 ? thread.title.slice(0, 29) + '…' : thread.title

            const describeThread = (title: string) => `${thread.author.displayName || thread.author.username}: ${title}`

            decorations.push({
                range: new sourcegraph.Range(
                    new sourcegraph.Position(
                        target.relativeSelection.startLine,
                        target.relativeSelection.startCharacter
                    ),
                    new sourcegraph.Position(target.relativeSelection.endLine, target.relativeSelection.endCharacter)
                ),
                after: {
                    contentText: ' 💬 ' + describeThread(shortTitle),
                    linkURL: thread.inlineURL
                        ? sourcegraph.internal.clientApplication === 'sourcegraph'
                            ? thread.inlineURL.slice(thread.inlineURL.lastIndexOf('#'))
                            : thread.inlineURL
                        : undefined,
                    hoverMessage: `${distanceInWordsToNow(thread.createdAt)} ago`,
                    dark: {
                        color: '#0d70e0',
                        backgroundColor: 'rgba(28, 126, 214, 0.15)',
                    },
                    light: {
                        color: 'black',
                        backgroundColor: 'white',
                    },
                },
            })
        }

        try {
            editor.setDecorations(decorationType, decorations)
        } catch (err) {
            console.error('Decoration error:', err)
        }
    }
    sourcegraph.configuration.subscribe(() => decorate())

    // TODO(sqs): Add a way to get notified when a new editor is opened (because we want to be able to pass an `editor` to `updateDecorations`/`updateContext`, but this subscription just gives us a `doc`).
    sourcegraph.workspace.onDidOpenTextDocument.subscribe(() => decorate())
}
