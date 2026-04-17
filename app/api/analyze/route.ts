import { Octokit } from "octokit";
import { NextRequest, NextResponse } from "next/server";

type GitHubContentEntry = {
  name: string;
  path: string;
  type: "file" | "dir";
};

type GitHubApiError = Error & {
  status?: number;
  message?: string;
  response?: {
    headers?: Record<string, string>;
  };
};

function parseGitHubRepoUrl(repoUrl: string) {
  try {
    const url = new URL(repoUrl);

    if (url.hostname !== "github.com") {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);

    if (segments.length !== 2) {
      return null;
    }

    const [owner, repo] = segments;

    if (!owner || !repo) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

function isRateLimitError(error: unknown) {
  const githubError = error as GitHubApiError;
  const remaining = githubError.response?.headers?.["x-ratelimit-remaining"];
  const message = githubError.message?.toLowerCase() ?? "";

  return (
    githubError.status === 429 ||
    (githubError.status === 403 &&
      (remaining === "0" || message.includes("rate limit exceeded")))
  );
}

function createOctokit() {
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    console.warn(
      "GITHUB_TOKEN is not set. Atlas is using unauthenticated GitHub API requests."
    );

    return new Octokit();
  }

  return new Octokit({ auth: githubToken });
}

export async function POST(request: NextRequest) {
  let repoUrl = "";

  try {
    const body = (await request.json()) as { repoUrl?: string };
    repoUrl = body.repoUrl?.trim() ?? "";
  } catch {
    return NextResponse.json(
      { error: "Invalid GitHub repo URL" },
      { status: 400 }
    );
  }

  const parsedRepo = parseGitHubRepoUrl(repoUrl);

  if (!parsedRepo) {
    return NextResponse.json(
      { error: "Invalid GitHub repo URL" },
      { status: 400 }
    );
  }

  const { owner, repo } = parsedRepo;
  const octokit = createOctokit();

  try {
    const metadataPromise = octokit.rest.repos.get({ owner, repo });
    const readmePromise = octokit.rest.repos
      .getReadme({ owner, repo })
      .catch((error: GitHubApiError) => {
        if (error.status === 404) {
          return null;
        }

        throw error;
      });
    const fileTreePromise = octokit.rest.repos.getContent({
      owner,
      repo,
      path: "",
    });

    const [metadataResponse, readmeResponse, fileTreeResponse] = await Promise.all(
      [metadataPromise, readmePromise, fileTreePromise]
    );

    const readme =
      readmeResponse && "content" in readmeResponse.data
        ? Buffer.from(readmeResponse.data.content, "base64").toString("utf8")
        : "";

    const fileTree = Array.isArray(fileTreeResponse.data)
      ? fileTreeResponse.data.map<GitHubContentEntry>((entry) => ({
          name: entry.name,
          path: entry.path,
          type: entry.type === "dir" ? "dir" : "file",
        }))
      : [];

    return NextResponse.json({
      metadata: {
        name: metadataResponse.data.name,
        fullName: metadataResponse.data.full_name,
        description: metadataResponse.data.description,
        language: metadataResponse.data.language,
        stars: metadataResponse.data.stargazers_count,
        url: metadataResponse.data.html_url,
      },
      readme,
      fileTree,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: "GitHub rate limit exceeded. Try again in a few minutes." },
        { status: 429 }
      );
    }

    const githubError = error as GitHubApiError;

    if (githubError.status === 404) {
      return NextResponse.json(
        { error: "Repository not found or private" },
        { status: 404 }
      );
    }

    console.error("Failed to fetch repository", error);

    return NextResponse.json(
      { error: "Failed to fetch repository" },
      { status: 500 }
    );
  }
}
