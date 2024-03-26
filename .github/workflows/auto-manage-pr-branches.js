// @ts-check

const dangerousBaseBranches = ["main", "hotfix"];
const trustedHeadBranches = ["main", "hotfix", "develop"];
const allowedHeadBranchForDevelopment = /^preview\/*/;

/**
 * PRブランチの検証を行います。
 * @param {import("github-script").AsyncFunctionArguments} AsyncFunctionArguments
 */
module.exports = async ({ context, github }) => {
  validateHeadBranchOrThrow(context);
  await validateAndFixBaseBranch(context, github);
};

/**
 * PRのヘッドブランチを検証します。
 * @param {import("@actions/github/lib/context").Context} context
 */
function validateHeadBranchOrThrow(context) {
  const pullRequest = context.payload.pull_request;
  const headBranch = pullRequest?.head.ref;

  if (headBranch == undefined) {
    throw new Error("The PR is not valid.");
  }

  const isAllowedHeadBranchForDevelopment =
    allowedHeadBranchForDevelopment.test(headBranch);

  if (isAllowedHeadBranchForDevelopment) {
    console.log("The head branch is valid. Continue the workflow.");
    return;
  }

  throw new Error(
    `The head branch '${headBranch}' is not an allowed head branch for development.` +
      ` Please create a PR with a head branch that starts with the 'preview/' prefix.`
  );
}

/**
 * PRのベースブランチを検証し、必要に応じて修正します。
 * @param {import("@actions/github/lib/context").Context} context
 * @param {import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api} github
 */
const validateAndFixBaseBranch = async (context, github) => {
  const pullRequest = context.payload.pull_request;
  const pull_number = pullRequest?.number;
  const headBranch = pullRequest?.head.ref;
  const baseBranch = pullRequest?.base.ref;

  if (
    pull_number == undefined ||
    headBranch == undefined ||
    baseBranch == undefined
  ) {
    throw new Error("The PR is not valid.");
  }

  const isSafeBaseBranch = !dangerousBaseBranches.includes(baseBranch);
  const isTrustedHeadBranch = trustedHeadBranches.includes(headBranch);

  // ベースブランチが安全、ヘッドブランチが信頼できる場合は何もしない
  if (isSafeBaseBranch || isTrustedHeadBranch) {
    console.log("No changes are required to the base branch.");
    return;
  }

  await github.rest.pulls.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pull_number,
    base: "develop", // ベースブランチを'develop'に上書き
  });

  console.log("The base branch has been updated to 'develop'");
};
