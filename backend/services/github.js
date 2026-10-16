import axios from "axios";

const GITHUB_API = "https://api.github.com";

// Extensions we know how to review meaningfully. Keep this tight for the MVP —
// binary/config/lockfiles add noise without adding review value.
const REVIEWABLE_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx",
  ".py",
  ".java",
  ".go",
  ".rb",
  ".c", ".cpp", ".h",
  ".cs",
];

// Paths we never want to pull in, even if the extension matches.
const IGNORED_PATH_SEGMENTS = [
  "node_modules/", "dist/", "build/", ".min.", "vendor/",
  "test/", "tests/", "__tests__/", ".test.", ".spec/",
];

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 40_000; // ~40KB per file cap to control token usage/cost

function authHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Accepts a GitHub URL in the form https://github.com/{owner}/{repo}
 * and returns { owner, repo }.
 */
export function parseRepoUrl(url) {
  const match = url
    .trim()
    .replace(/\.git$/, "")
    .match(/github\.com\/([^/]+)\/([^/]+)\/?$/);

  if (!match) {
    throw new Error(
      "Invalid GitHub URL. Expected format: https://github.com/owner/repo"
    );
  }
  return { owner: match[1], repo: match[2] };
}

async function getDefaultBranch(owner, repo) {
  const { data } = await axios.get(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: authHeaders(),
  });
  return data.default_branch;
}

async function getRepoTree(owner, repo, branch) {
  const { data } = await axios.get(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: authHeaders() }
  );
  return data.tree;
}

function isReviewable(path, size) {
  if (size > MAX_FILE_SIZE_BYTES) return false;
  if (IGNORED_PATH_SEGMENTS.some((seg) => path.includes(seg))) return false;
  return REVIEWABLE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

/**
 * Picks which files to review. For the MVP we take the largest reviewable
 * files up to MAX_FILES, on the theory that bigger files tend to carry more
 * logic worth reviewing than tiny config/index files.
 */
function selectFiles(tree) {
  return tree
    .filter((entry) => entry.type === "blob" && isReviewable(entry.path, entry.size || 0))
    .sort((a, b) => (b.size || 0) - (a.size || 0))
    .slice(0, MAX_FILES);
}

async function fetchFileContent(owner, repo, branch, path) {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const { data } = await axios.get(rawUrl, { responseType: "text" });
  return data;
}

/**
 * Main entry point: given a repo URL, returns an array of
 * { path, content, sizeBytes } for the files selected for review.
 */
export async function fetchRepoFiles(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const branch = await getDefaultBranch(owner, repo);
  const tree = await getRepoTree(owner, repo, branch);
  const selected = selectFiles(tree);

  if (selected.length === 0) {
    throw new Error(
      "No reviewable source files found in this repo (checked JS/TS/Python/Java/Go/Ruby/C++/C#)."
    );
  }

  const files = await Promise.all(
    selected.map(async (entry) => ({
      path: entry.path,
      sizeBytes: entry.size,
      content: await fetchFileContent(owner, repo, branch, entry.path),
    }))
  );

  return { owner, repo, branch, files };
}
