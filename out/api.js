"use strict";
// TODO: This file is allllll copypasta (kind of)!
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
Object.defineProperty(exports, "__esModule", { value: true });
const sourcegraph = __importStar(require("sourcegraph"));
const errors_1 = require("./errors");
function queryGraphQL(query, variables = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        return sourcegraph.commands.executeCommand('queryGraphQL', query, variables);
    });
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
function discussionThreadFieldsFragment(relativeRev) {
    var relativeRevFields;
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
function createThread(input, relativeRev = '') {
    return __awaiter(this, void 0, void 0, function* () {
        let { data, errors } = yield queryGraphQL(`
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
      `, { input });
        if (!data || !data.discussions || !data.discussions.createThread) {
            throw errors_1.createAggregateError(errors);
        }
        return data.discussions.createThread;
    });
}
/**
 * Fetches discussion threads.
 */
function fetchDiscussionThreads(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        opts.relativeRev = opts.relativeRev || '';
        let { data, errors } = yield queryGraphQL(`
        query DiscussionThreads(
          $first: Int
          $query: String
          $threadID: ID
          $authorUserID: ID
          $targetRepositoryID: ID
          $targetRepositoryName: String
          $targetRepositoryGitCloneURL: String
          $targetRepositoryPath: String
          $relativeRev: String!
        ) {
          discussionThreads(
            first: $first
            query: $query
            threadID: $threadID
            authorUserID: $authorUserID
            targetRepositoryID: $targetRepositoryID
            targetRepositoryName: $targetRepositoryName
            targetRepositoryGitCloneURL: $targetRepositoryGitCloneURL
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
      `, opts);
        if (!data || !data.discussionThreads) {
            throw errors_1.createAggregateError(errors);
        }
        return data.discussionThreads;
    });
}
exports.fetchDiscussionThreads = fetchDiscussionThreads;
/**
 * Fetches a discussion thread and its comments.
 */
function fetchDiscussionThreadAndComments(threadID, relativeRev = '') {
    return __awaiter(this, void 0, void 0, function* () {
        let { data, errors } = yield queryGraphQL(`
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
      `, { threadID });
        if (!data ||
            !data.discussionThreads ||
            !data.discussionThreads.nodes ||
            data.discussionThreads.nodes.length !== 1) {
            throw errors_1.createAggregateError(errors);
        }
        return data.discussionThreads.nodes[0];
    });
}
exports.fetchDiscussionThreadAndComments = fetchDiscussionThreadAndComments;
/**
 * Adds a comment to an existing discussion thread.
 *
 * @return Promise that emits the updated discussion thread and its comments.
 */
function addCommentToThread(threadID, contents, relativeRev = '') {
    return __awaiter(this, void 0, void 0, function* () {
        let { data, errors } = yield queryGraphQL(`
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
      `, { threadID, contents });
        if (!data || !data.discussions || !data.discussions.addCommentToThread) {
            throw errors_1.createAggregateError(errors);
        }
        return data.discussions.addCommentToThread;
    });
}
exports.addCommentToThread = addCommentToThread;
/**
 * Renders Markdown to HTML.
 *
 * @return Promise that emits the HTML string, which is already sanitized and escaped and thus is always safe to render.
 */
function renderMarkdown(markdown, options) {
    return __awaiter(this, void 0, void 0, function* () {
        let { data, errors } = yield queryGraphQL(`
        query RenderMarkdown($markdown: String!, $options: MarkdownOptions) {
          renderMarkdown(markdown: $markdown, options: $options)
        }
      `, { markdown });
        if (!data || !data.renderMarkdown) {
            throw errors_1.createAggregateError(errors);
        }
        return data.renderMarkdown;
    });
}
exports.renderMarkdown = renderMarkdown;
//# sourceMappingURL=api.js.map