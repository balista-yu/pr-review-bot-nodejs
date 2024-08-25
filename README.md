# Name

pr-review-bot-nodejs

## Overview
- AIモデルであるGeminiを使用してプルリクエストに対してコードレビューを実施する

## Getting Start

1. Clone the repository

```
$ git clone https://github.com/balista-yu/pr-review-bot-nodejs.git
```

2. Run docker compose
```
$ cd pr-review-bot-nodejs
$ make init
```

## ローカル環境での動作確認
- GithubからのWebhookをローカルでテストするため[こちら](https://docs.github.com/ja/enterprise-cloud@latest/webhooks/using-webhooks/handling-webhook-deliveries)を元にセットアップを行います
  - [smee](https://smee.io/)にアクセスし、Start new channelをクリックしWebhook Proxy URLを発行
  - Webhook Proxy URLをコピーしておきます
  - 合わせてWebhook Secretに登録する値も適当に作成しておきます

- [Github Appの登録](https://docs.github.com/ja/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)に従いGithub Appの登録を行います
  - Github App name
    - 適当なアプリ名
  - Homepage URL
    - 適当なURL
  - Webhook
    - URL: 先ほど取得したWebhook proxy URL
    - Secret: ランダムな値
  - Permissions
    - Contents: Read and write
    - Metadata: Readonly
    - Pull Requests: Read and write
    - Subscribe to events: Pull requestにチェック
- Github App作成後App ID、Client IDが発行されるので控えておきます
- Generate new client secretでClientSecretを発行し控えておきます
- Generate a private keyをクリックしPrivate Keysを発行します
  - pemファイルがダウンロードできるので控えておきます

- Gemini APIを使用するため[こちら](https://ai.google.dev/gemini-api/docs/api-key?hl=ja)からAPIキーを発行して控えておきます

- `.env.example`をコピーし`.env`を作成して下記の環境変数を埋めます
  - APP_ID: 作成したGithub AppのアプリID
  - WEBHOOK_PROXY_URL: 発行したWebhookプロキシのURL
  - WEBHOOK_SECRET: Github Appで登録したWebhookのSecretの値
  - GITHUB_CLIENT_ID: App作成時に発行されたClientID
  - GITHUB_CLIENT_SECRET: Github Appで発行したClientSecretの値
  - PRIVATE_KEY: Github Appで発行したPrivate Keysの内容
  - GEMINI_API_KEY: Gemini API キー

- Botを入れたいリポジトリにGithub Appをインストール
- `make up`で環境を起動し`make run-app`でアプリを起動しておきます
- 対象のリポジトリで適当にプルリクエストを作成しレビューコメントが通知されればOK
