import nock from 'nock';
import prReviewBotApp from '../src/index.ts';
import { Probot, ProbotOctokit } from 'probot';
import payload from './fixtures/pull_request.opened.json' with {'type': 'json'};
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const privateKey = fs.readFileSync(
  path.join(__dirname, 'fixtures/mock-cert.pem'),
  'utf-8',
);

vi.mock('@octokit/auth-app', () => ({
  createAppAuth: vi.fn().mockReturnValue(() => ({
    token: async () => 'test-token'
  }))
}))

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => {
      return {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => 'Generated review text'
            }
          })
        })
      }
    })
  }
})

describe('Code Review Bot App', () => {
  let probot: Probot;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      Octokit: ProbotOctokit.defaults({
        retry: {enabled: false},
        throttle: {enabled: false},
      }),
    });
    probot.load(prReviewBotApp);
  });

  test('creates a code review comment on pull request open', async () => {

    const diffResponse = [
      {
        filename: 'test-file.ts',
        status: 'modified',
        additions: 10,
        deletions: 2,
        changes: 12,
        patch: 'diff --git a/test-file.ts b/test-file.ts...',
      },
    ]

    const mock = nock('https://api.github.com')
      .post('/app/installations/1/access_tokens')
      .reply(200, {
        token: 'test',
        permissions: {
          pull_request: 'write',
        },
      })

    nock('https://api.github.com')
      .get('/repos/test-owner/test-repo/pulls/1/files')
      .reply(200, diffResponse);

    nock('https://api.github.com')
      .post('/repos/test-owner/test-repo/pulls/1/reviews', (body) => {
        expect(body.comments[0].body).toContain('Generated review');
        expect(body.comments[0].path).toBe('test-file.ts');
        return true;
      })
      .reply(200);

    await probot.receive({name: 'pull_request', payload});

    expect(mock.isDone()).toBe(true);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
