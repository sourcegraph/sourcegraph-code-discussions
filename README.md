# Sourcegraph code discussions

Discuss code contextually, review code continuously.

- 🖥️ Write comments on code while browsing on Sourcegraph.com.
- 🧠 Discover discussions and existing knowledge on GitHub & Sourcegraph while browsing code.
- 🤔 Review code continuously, not just in Pull Requests.
- 🤲 Share knowledge & help unblock team members.

## ⚡ Experimental warning

Code discussions is an experiment [by Sourcegraph](https://about.sourcegraph.com/about). It is not yet ready for widespread production use.

If you're as excited about improving how code is discussed as much as we are, then please try it out, [give us feedback and file issues](https://github.com/sourcegraph/issues/issues), and reach out to us (hi@sourcegraph.com). We'd love to hear from you!

## GitHub integration

This shows how you can view previously created discussions on GitHub.com while browsing code:

![demo](https://github.com/sourcegraph/sourcegraph-extension-discussions/raw/master/demo.gif)

> Note: Clicking them will bring you to Sourcegraph, it is not yet possible to create or reply to discussions on GitHub itself. We hope to support this soon.

## Getting started

1.  [Set up a Sourcegraph server](https://about.sourcegraph.com/docs) (soon you will be able to use this on open source repositories via Sourcegraph.com).
2.  Visit the **extensions** page (link in the top right / navbar of Sourcegraph) and enable this extension.
3.  Visit any file in any repository, select a line by clicking it and then create a discussion by clicking the chat icon that appears.

For the GitHub integration:

1.  Install [Sourcegraph for Chrome](https://chrome.google.com/webstore/detail/sourcegraph/dgjhfomjieaadpoljlnidmbgkdffpack) or [Sourcegraph for Firefox](https://addons.mozilla.org/en-US/firefox/addon/sourcegraph/)
2.  Open the Sourcegraph for Chrome/Firefox extension options page (by clicking the Sourcegraph icon in the browser toolbar)
3.  Check the box labeled **Use Sourcegraph extensions** (required while this feature is in alpha)

## Coming soon: Visual Studio Code integration

This shows how you can view, create, and reply to discussions right from your editor:

![demo-vscode](https://user-images.githubusercontent.com/3173176/45849482-f85acb80-bce6-11e8-89a6-dd6d72a78383.gif)

> Note: This integration is not yet released. See [sourcegraph/sourcegraph-vscode#15](https://github.com/sourcegraph/sourcegraph-vscode/pull/15) for tracking this integration.
