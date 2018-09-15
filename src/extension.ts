import * as sourcegraph from "sourcegraph";
import { fetchDiscussionThreads, resolveRepository } from "./api";
import * as GQL from "./graphqlschema";
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import { resolveSettings, Settings } from "./settings";

export function activate(): void {
  function activeEditor(): sourcegraph.CodeEditor | undefined {
    return sourcegraph.app.activeWindow
      ? sourcegraph.app.activeWindow.visibleViewComponents[0]
      : undefined;
  }

  // When the configuration or current file changes, publish new decorations.
  async function decorate(
    editor: sourcegraph.CodeEditor | undefined = activeEditor()
  ): Promise<void> {
    if (!editor) {
      return;
    }

    const u = new URL(editor.document.uri);
    const uri = {
      repositoryName: u.pathname.slice(2),
      revision: u.search.slice(1),
      filePath: u.hash.slice(1)
    };

    const repoID = await resolveRepository(uri.repositoryName);
    const threads = await fetchDiscussionThreads({
      first: 10000,
      targetRepositoryID: repoID,
      targetRepositoryPath: uri.filePath,
      relativeRev: uri.revision
    });

    let decorations: sourcegraph.TextDocumentDecoration[] = [];
    threads.nodes.forEach(thread => {
      const settings = resolveSettings(
        sourcegraph.configuration.get<Settings>().value
      );
      if (!settings["discussions.decorations.inline"]) {
        return;
      }

      if (thread.target.__typename !== "DiscussionThreadTargetRepo") {
        return;
      }
      var target = thread.target as GQL.IDiscussionThreadTargetRepo;
      if (target.relativePath !== uri.filePath) {
        // TODO(slimsag): shouldn't the discussions API return threads created in different files and moved here, too? lol :facepalm:
        return; // comment has since moved to a different file.
      }

      const shortTitle =
        thread.title.length > 29
          ? thread.title.slice(0, 29) + "…"
          : thread.title;

      const describeThread = title =>
        `"${title}" by ${thread.author.displayName ||
          thread.author.username} ${distanceInWordsToNow(
          thread.createdAt
        )} ago`;

      // TODO(slimsag): color scheme detection is impossible, see https://github.com/sourcegraph/sourcegraph-extension-api/issues/63
      const color = location.host === "github.com" ? "black" : "#0366d6"; // #3b4d6e
      const backgroundColor =
        location.host === "github.com" ? "white" : "rgba(28, 126, 214, 0.3)"; // #151c28

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
          contentText: " 💬 " + describeThread(shortTitle),
          linkURL: location.host
            ? thread.inlineURL.slice(thread.inlineURL.lastIndexOf("#"))
            : thread.inlineURL,
          hoverMessage: " " + describeThread(thread.title),
          color: color
        },
        backgroundColor: backgroundColor
      });
    });

    try {
      editor.setDecorations(null, decorations);
    } catch (err) {
      console.error("Decoration error:", err);
    }
  }
  sourcegraph.configuration.subscribe(() => decorate());

  // TODO(sqs): Add a way to get notified when a new editor is opened (because we want to be able to pass an `editor` to `updateDecorations`/`updateContext`, but this subscription just gives us a `doc`).
  sourcegraph.workspace.onDidOpenTextDocument.subscribe(() => decorate());
}
