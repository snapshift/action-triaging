import * as core from '@actions/core'
import * as github from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'
import minimatch from 'minimatch'

type GithubClient = InstanceType<typeof GitHub>

type Args = {
  repoToken: string
  configPath: string
}

type TriageBotConfig = {
  labels: {
    label: string
    glob: string
    comment?: string
  }[]
  comment?: string
  no_label_comment?: string
}

async function run(): Promise<void> {
  try {
    const args = getAndValidateArgs()
    core.info('Starting GitHub Client')
    const client = github.getOctokit(args.repoToken)

    const issue = github.context.payload.issue
    if (!issue) {
      core.error('No issue context found. This action can only run on issue creation.')
      return
    }
    core.debug(`Issue content ${JSON.stringify(issue)}`)

    core.info(`Loading config file at ${args.configPath}`)
    const config = await getConfig(client, args.configPath)

    await processIssue({ client, config, issueId: issue.number })
  } catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

async function processIssue({
  client,
  config,
  issueId
}: {
  client: GithubClient
  config: TriageBotConfig
  issueId: number
}): Promise<void> {
  const issue = await getIssue(client, issueId)

  const matchingLabels: string[] = []
  const comments: string[] = config.comment ? [config.comment] : []

  for (const label of config.labels) {
    if (minimatch(issue.body, label.glob)) {
      matchingLabels.push(label.label)
      if (label.comment) {
        comments.push(label.comment)
      }
    }
  }

  if (matchingLabels.length > 0) {
    core.debug(`Adding labels ${matchingLabels.join(', ')} to issue #${issue.number}`)

    await addLabels(client, issue.number, matchingLabels)

    if (comments.length) {
      await writeComment(client, issue.number, comments.join('\n\n'))
    }
  } else if (config.no_label_comment) {
    core.debug(`Adding comment to issue #${issue.number}, because no labels match`)

    await writeComment(client, issue.number, config.no_label_comment)
  }
}

async function writeComment(client: GithubClient, issueId: number, body: string): Promise<void> {
  await client.issues.createComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: issueId,
    body
  })
}

async function addLabels(client: GithubClient, issueId: number, labels: string[]): Promise<void> {
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: issueId,
    labels
  })
}

async function getIssue(client: GithubClient, issueId: number) {
  return (
    await client.issues.get({
      issue_number: issueId,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    })
  ).data
}

async function getConfig(client: GithubClient, configPath: string): Promise<TriageBotConfig> {
  const response = await client.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: configPath,
    ref: github.context.sha
  })

  return JSON.parse(Buffer.from(response.data.content, 'base64').toString())
}

function getAndValidateArgs(): Args {
  const args = {
    repoToken: core.getInput('repo-token', { required: true }),
    configPath: core.getInput('config-path', { required: true })
  }

  return args
}

run()
