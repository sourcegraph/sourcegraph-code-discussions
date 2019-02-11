import * as sourcegraph from 'sourcegraph'
import { distanceInWordsToNow } from 'date-fns'
import { resolveSettings, Settings } from './settings'
import { fetchDiscussionThreads } from './shared/api'

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

        const u = new (global as any).URL(editor.document.uri)
        const uri = {
            repositoryName: u.pathname.slice(2),
            revision: u.search.slice(1),
            filePath: u.hash.slice(1),
        }

        const threads = await fetchDiscussionThreads({
            first: 10000,
            targetRepositoryName: uri.repositoryName,
            targetRepositoryPath: uri.filePath,
            relativeRev: uri.revision,
        })

        let decorations: sourcegraph.TextDocumentDecoration[] = []
        threads.nodes.forEach(thread => {
            const settings = resolveSettings(sourcegraph.configuration.get<Settings>().value)
            if (!settings['discussions.decorations.inline']) {
                return
            }

            if (thread.target.__typename !== 'DiscussionThreadTargetRepo') {
                return
            }
            var target = thread.target as SourcegraphGQL.IDiscussionThreadTargetRepo
            if (target.relativePath !== uri.filePath) {
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
            const color = (global as any).location.host === 'github.com' ? 'black' : '#0366d6' // #3b4d6e
            const backgroundColor = (global as any).location.host === 'github.com' ? 'white' : 'rgba(28, 126, 214, 0.3)' // #151c28

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
                        ? (global as any).location.host
                            ? thread.inlineURL.slice(thread.inlineURL.lastIndexOf('#'))
                            : thread.inlineURL
                        : undefined,
                    hoverMessage: ' ' + describeThread(thread.title),
                    color: color,
                },
                backgroundColor: backgroundColor,
            })
        })

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
