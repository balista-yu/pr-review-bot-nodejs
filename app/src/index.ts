import { Probot, Context } from 'probot';
import { createAppAuth } from '@octokit/auth-app';
import { EmitterWebhookEventName } from '@octokit/webhooks/dist-types/types.js';
import { generativeModel } from './geminiClient.js';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const privateKey: string = process.env.PRIVATE_KEY || '';

const githubAppId: number = parseInt(process.env.APP_ID || '', 10);

const RETRY_LIMIT = 3;
// gemini apiは1分間のAPIリクエスト数の制限があるため、リトライまでのインターバルを1分にする
const GEMINI_RETRY_INTERVAL = 60000;
const GITHUB_RETRY_INTERVAL = 1000;

const events: EmitterWebhookEventName[] = [
  'pull_request.opened',
  'pull_request.reopened'
]

const reviewPoint = fs.readFileSync(
  path.join(__dirname, '../src/review-point.md'),
  'utf8'
);

async function runReview(prompt: string, retries = 0): Promise<any> {
  try {
    return await generativeModel.generateContent(prompt);
  } catch (error) {
    if (retries < RETRY_LIMIT) {
      console.error(`Error generating content, retrying in 1 minute... (${retries + 1}/${RETRY_LIMIT})`);
      await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_INTERVAL));
      return runReview(prompt, retries + 1);
    } else {
      console.error('Max retries reached, could not generate content');
      throw error;
    }
  }
}

async function createReview(octokit: any, owner: string, repo: string, pull_number: number, comments: any[], attempts = 0): Promise<void> {
  try {
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number,
      event: 'COMMENT',
      comments,
    });
  } catch (error) {
    console.error(`Error creating review: ${(error as Error).message}`);
    if (attempts < RETRY_LIMIT) {
      console.log(`Retrying in 1 second... (Attempt ${attempts + 1} of ${RETRY_LIMIT})`);
      await new Promise((resolve) => setTimeout(resolve, GITHUB_RETRY_INTERVAL));
      return createReview(octokit, owner, repo, pull_number, comments, attempts + 1);
    } else {
      console.error('Max retry attempts reached for GitHub review. Could not create review.');
      throw error;
    }
  }
}

export default (app: Probot) => {
  app.on(events, async (context: Context<any>) => {
    const {pull_request, repository, installation} = context.payload;

    const auth = createAppAuth({
      appId: githubAppId,
      privateKey: privateKey,
      installationId: installation.id,
    });

    const {token} = await auth({type: 'installation'});
    const octokit = context.octokit;

    const diffApiUrl = `${pull_request.url}/files`;
    const diffResponse = await fetch(diffApiUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (diffResponse.ok) {
      const files = await diffResponse.json() as Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        changes: number;
        patch: string;
      }>;

      for (const file of files) {
        const diff = {
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
        };

        const prompt = `
        次のコードを日本語で要約しレビューしてください。
        コード差分:
        ${JSON.stringify(diff)}

        レビューポイント:
        ${reviewPoint}
        `;

        try {
          const reviewResult = await runReview(prompt);
          const owner = repository.owner.login;
          const repo = repository.name;
          const comments = [
            {
              path: diff.filename,
              position: 1,
              body: reviewResult.response.text(),
            },
          ];
          await createReview(octokit, owner, repo, pull_request.number, comments);
        } catch (error) {
          console.error('Failed to generate review content after retries:', error);
        }
      }
      console.log('review success.')
    }
  });
};
