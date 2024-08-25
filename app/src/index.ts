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

const events: EmitterWebhookEventName[] = [
  'pull_request.opened',
  'pull_request.reopened'
]

const reviewPoint = fs.readFileSync(
  path.join(__dirname, '../src/review-point.md'),
  'utf8'
);

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

        const reviewResult = await generativeModel.generateContent(prompt);

        const owner = repository.owner.login;
        const repo = repository.name;

        const comments = [
          {
            path: diff.filename,
            position: 1,
            body: reviewResult.response.text(),
          },
        ];

        await octokit.pulls.createReview({
          owner,
          repo,
          pull_number: pull_request.number,
          event: 'COMMENT',
          comments,
        });
      }
    }
  });
};
