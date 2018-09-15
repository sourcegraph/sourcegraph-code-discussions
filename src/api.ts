// TODO: This file is allllll copypasta (kind of)!

import * as sourcegraph from "sourcegraph";
import * as GQL from "./graphqlschema";
import { createAggregateError } from "./errors";

async function queryGraphQL(query: string, variables: any = {}) {
  return sourcegraph.commands.executeCommand<any>(
    "queryGraphQL",
    query,
    variables
  );
}

const discussionCommentFieldsFragment = `
    fragment DiscussionCommentFields on DiscussionComment {
      id
      author {
        ...UserFields
      }
      html
      inlineURL
      createdAt
      updatedAt
    }
  `;

function discussionThreadFieldsFragment(relativeRev?: string): string {
  var relativeRevFields: string;
  if (relativeRev) {
    relativeRevFields = `
        relativePath(rev: $relativeRev)
        relativeSelection(rev: $relativeRev) {
          startLine
          startCharacter
          endLine
          endCharacter
        }
    `;
  }
  return `
    fragment DiscussionThreadFields on DiscussionThread {
      id
      author {
        ...UserFields
      }
      title
      target {
        __typename
        ... on DiscussionThreadTargetRepo {
          repository {
            name
          }
          path
          branch {
            displayName
          }
          revision {
            displayName
          }
          selection {
            startLine
            startCharacter
            endLine
            endCharacter
            linesBefore
            lines
            linesAfter
          }
          ${relativeRevFields}
        }
      }
      inlineURL
      createdAt
      updatedAt
      archivedAt
    }

    fragment UserFields on User {
      displayName
      username
      avatarURL
    }
  `;
}

/**
 * Creates a new discussion thread.
 *
 * @return Promise that emits the new discussion thread.
 */
async function createThread(
  input: GQL.IDiscussionThreadCreateInput,
  relativeRev: string = ""
): Promise<GQL.IDiscussionThread> {
  let { data, errors } = await queryGraphQL(
    `
        mutation CreateThread($input: DiscussionThreadCreateInput!, $relativeRev: String!) {
          discussions {
            createThread(input: $input) {
              ...DiscussionThreadFields
              comments {
                totalCount
              }
            }
          }
        }
        ${discussionThreadFieldsFragment(relativeRev)}
      `,
    { input }
  );
  if (!data || !data.discussions || !data.discussions.createThread) {
    throw createAggregateError(errors);
  }
  return data.discussions.createThread;
}

/**
 * Fetches discussion threads.
 */
export async function fetchDiscussionThreads(opts: {
  first?: number;
  query?: string;
  threadID?: GQL.ID;
  authorUserID?: GQL.ID;
  targetRepositoryID?: GQL.ID;
  targetRepositoryPath?: string;
  relativeRev?: string;
}): Promise<GQL.IDiscussionThreadConnection> {
  opts.relativeRev = opts.relativeRev || "";
  let { data, errors } = await queryGraphQL(
    `
        query DiscussionThreads(
          $first: Int
          $query: String
          $threadID: ID
          $authorUserID: ID
          $targetRepositoryID: ID
          $targetRepositoryPath: String
          $relativeRev: String!
        ) {
          discussionThreads(
            first: $first
            query: $query
            threadID: $threadID
            authorUserID: $authorUserID
            targetRepositoryID: $targetRepositoryID
            targetRepositoryPath: $targetRepositoryPath
          ) {
            totalCount
            pageInfo {
              hasNextPage
            }
            nodes {
              ...DiscussionThreadFields
              comments {
                totalCount
              }
            }
          }
        }
        ${discussionThreadFieldsFragment(opts.relativeRev)}
      `,
    opts
  );
  if (!data || !data.discussionThreads) {
    throw createAggregateError(errors);
  }
  return data.discussionThreads;
}

/**
 * Fetches a discussion thread and its comments.
 */
export async function fetchDiscussionThreadAndComments(
  threadID: GQL.ID,
  relativeRev: string = ""
): Promise<GQL.IDiscussionThread> {
  let { data, errors } = await queryGraphQL(
    `
        query DiscussionThreadComments($threadID: ID!, $relativeRev: String!) {
          discussionThreads(threadID: $threadID) {
            totalCount
            nodes {
              ...DiscussionThreadFields
              comments {
                totalCount
                nodes {
                  ...DiscussionCommentFields
                }
              }
            }
          }
        }
        ${discussionThreadFieldsFragment(relativeRev)}
        ${discussionCommentFieldsFragment}
      `,
    { threadID }
  );
  if (
    !data ||
    !data.discussionThreads ||
    !data.discussionThreads.nodes ||
    data.discussionThreads.nodes.length !== 1
  ) {
    throw createAggregateError(errors);
  }
  return data.discussionThreads.nodes[0];
}

/**
 * Adds a comment to an existing discussion thread.
 *
 * @return Promise that emits the updated discussion thread and its comments.
 */
export async function addCommentToThread(
  threadID: GQL.ID,
  contents: string,
  relativeRev: string = ""
): Promise<GQL.IDiscussionThread> {
  let { data, errors } = await queryGraphQL(
    `
        mutation AddCommentToThread($threadID: ID!, $contents: String!, $relativeRev: String!) {
          discussions {
            addCommentToThread(threadID: $threadID, contents: $contents) {
              ...DiscussionThreadFields
              comments {
                totalCount
                nodes {
                  ...DiscussionCommentFields
                }
              }
            }
          }
        }
        ${discussionThreadFieldsFragment(relativeRev)}
        ${discussionCommentFieldsFragment}
      `,
    { threadID, contents }
  );
  if (!data || !data.discussions || !data.discussions.addCommentToThread) {
    throw createAggregateError(errors);
  }
  return data.discussions.addCommentToThread;
}

/**
 * Renders Markdown to HTML.
 *
 * @return Promise that emits the HTML string, which is already sanitized and escaped and thus is always safe to render.
 */
export async function renderMarkdown(
  markdown: string,
  options?: GQL.IMarkdownOptions
): Promise<string> {
  let { data, errors } = await queryGraphQL(
    `
        query RenderMarkdown($markdown: String!, $options: MarkdownOptions) {
          renderMarkdown(markdown: $markdown, options: $options)
        }
      `,
    { markdown }
  );
  if (!data || !data.renderMarkdown) {
    throw createAggregateError(errors);
  }
  return data.renderMarkdown;
}

/**
 * Turn a repository name into a GraphQL repository ID.
 *
 * @return Promise that emits the ID.
 */
export async function resolveRepository(
  repositoryName: string
): Promise<GQL.ID> {
  let { data, errors } = await queryGraphQL(
    `
      query ResolveRepository($repositoryName: String!) {
        repository(name:$repositoryName) {
          id
        }
      }
      `,
    { repositoryName }
  );
  if (!data || !data.repository || !data.repository.id) {
    throw createAggregateError(errors);
  }
  return data.repository.id;
}
