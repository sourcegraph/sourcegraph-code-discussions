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

        const uri = resolveURI(editor.document.uri)

        const threads = await fetchDiscussionThreads({
            first: 10000,
            targetRepositoryName: uri.repo,
            targetRepositoryPath: uri.path,
            relativeRev: uri.rev,
        })

        const decorations: sourcegraph.TextDocumentDecoration[] = []
        for (const thread of threads.nodes) {
            const settings = resolveSettings(sourcegraph.configuration.get<Settings>().value)
            if (!settings['discussions.decorations.inline']) {
                return
            }

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

            const describeThread = (title: string) =>
                `"${title}" by ${thread.author.displayName || thread.author.username} ${distanceInWordsToNow(
                    thread.createdAt
                )} ago`

            // TODO(slimsag): color scheme detection was impossible when this was written, see https://github.com/sourcegraph/sourcegraph/issues/732
            const color = window.location.host === 'github.com' ? 'black' : '#0366d6' // #3b4d6e
            const backgroundColor = window.location.host === 'github.com' ? 'white' : 'rgba(28, 126, 214, 0.3)' // #151c28

            decorations.push({
                range: new sourcegraph.Range(
                    new sourcegraph.Position(
                        target.relativeSelection.startLine - 1,
                        target.relativeSelection.startCharacter
                    ),
                    new sourcegraph.Position(
                        target.relativeSelection.endLine - 1,
                        target.relativeSelection.endCharacter
                    )
                ),
                after: {
                    contentText: ' 💬 ' + describeThread(shortTitle),
                    linkURL: thread.inlineURL
                        ? window.location.host
                            ? thread.inlineURL.slice(thread.inlineURL.lastIndexOf('#'))
                            : thread.inlineURL
                        : undefined,
                    hoverMessage: ' ' + describeThread(thread.title),
                    color,
                },
                backgroundColor,
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
