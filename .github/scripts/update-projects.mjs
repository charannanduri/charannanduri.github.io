#!/usr/bin/env node
// Monthly job: look at recent GitHub activity, ask Claude which repos are
// worth featuring, and append any new entries to projects.json.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const GITHUB_USER = 'charannanduri';
const SITE_REPO = 'charannanduri.github.io';
const LOOKBACK_DAYS = 35;
const CLAUDE_MODEL = 'claude-opus-4-8';

const PROJECTS_PATH = fileURLToPath(new URL('../../projects.json', import.meta.url));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function ghFetch(path) {
    const res = await fetch(`https://api.github.com${path}`, {
        headers: {
            Accept: 'application/vnd.github+json',
            ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
        },
    });
    if (!res.ok) throw new Error(`GitHub API ${path} failed: ${res.status}`);
    return res.json();
}

async function getCandidateRepos() {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86400 * 1000);
    const repos = await ghFetch(`/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`);
    return repos.filter(r =>
        !r.fork &&
        !r.private &&
        r.name !== SITE_REPO &&
        new Date(r.pushed_at) > since
    );
}

async function getRepoSummary(repo) {
    let readme = '';
    try {
        const readmeRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${repo.name}/readme`, {
            headers: {
                Accept: 'application/vnd.github.raw+json',
                ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
            },
        });
        if (readmeRes.ok) readme = (await readmeRes.text()).slice(0, 2000);
    } catch {
        // README is optional context; ignore fetch failures.
    }

    let commitCount = 0;
    let commitMessages = [];
    try {
        const since = new Date(Date.now() - LOOKBACK_DAYS * 86400 * 1000).toISOString();
        const commits = await ghFetch(`/repos/${GITHUB_USER}/${repo.name}/commits?since=${since}&per_page=30`);
        commitCount = commits.length;
        commitMessages = commits.slice(0, 10).map(c => c.commit.message.split('\n')[0]);
    } catch {
        // Empty repos (no commits) 409 here; treat as zero activity.
    }

    return {
        name: repo.name,
        description: repo.description || '',
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        pushedAt: repo.pushed_at,
        commitCount,
        commitMessages,
        readmeExcerpt: readme,
    };
}

function buildSystemPrompt(existingProjects) {
    const styleExamples = existingProjects
        .map((p, i) => `${i + 1}. ${p.title} - ${p.description}`)
        .join('\n');

    return `You maintain the "projects" section of a personal terminal-style portfolio website for Charan, an Electrical & Computer Engineering student.

Existing entries, for style/tone reference:

${styleExamples}

You'll be given a list of GitHub repos with activity in the last ${LOOKBACK_DAYS} days (description, README excerpt, recent commit messages). Decide which ones are genuinely interesting or substantial enough to add as a new project entry. Skip trivial repos: forks, dotfiles, tiny scripts, empty/placeholder repos, and coursework unless it's clearly a real project. It is fine to return zero projects if nothing qualifies this month.

For each repo worth adding, write a title and a 1-3 sentence description matching the factual, understated tone of the existing entries above. Do not duplicate a project that's already listed (case-insensitive title match).

Respond with ONLY a JSON array (no markdown fences, no commentary) of objects shaped like {"title": "...", "description": "..."}. Return [] if none qualify.`;
}

function buildUserContent(candidates) {
    const blocks = candidates.map(c => [
        `Repo: ${c.name}`,
        `URL: ${c.url}`,
        `Description: ${c.description}`,
        `Language: ${c.language}`,
        `Stars: ${c.stars}`,
        `Commits in window: ${c.commitCount}`,
        c.commitMessages.length ? `Recent commit messages:\n- ${c.commitMessages.join('\n- ')}` : '',
        c.readmeExcerpt ? `README excerpt:\n${c.readmeExcerpt}` : '',
    ].filter(Boolean).join('\n'));

    return `Candidate repositories (activity in the last ${LOOKBACK_DAYS} days):\n\n${blocks.join('\n\n---\n\n')}`;
}

async function callClaude(existingProjects, candidates) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 2000,
            system: buildSystemPrompt(existingProjects),
            messages: [{ role: 'user', content: buildUserContent(candidates) }],
        }),
    });

    if (!res.ok) {
        throw new Error(`Anthropic API failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.content.find(b => b.type === 'text')?.text ?? '[]';
    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : [];
    }
}

async function main() {
    if (!ANTHROPIC_API_KEY) {
        console.error('ANTHROPIC_API_KEY is not set; skipping this run.');
        return;
    }

    const existing = JSON.parse(await readFile(PROJECTS_PATH, 'utf8'));
    const candidateRepos = await getCandidateRepos();

    if (candidateRepos.length === 0) {
        console.log('No repos with activity in the lookback window. Nothing to do.');
        return;
    }

    console.log(`Found ${candidateRepos.length} candidate repo(s): ${candidateRepos.map(r => r.name).join(', ')}`);

    const summaries = await Promise.all(candidateRepos.map(getRepoSummary));
    const suggested = await callClaude(existing, summaries);

    const existingTitles = new Set(existing.map(p => p.title.toLowerCase()));
    const additions = suggested.filter(p =>
        p && p.title && p.description && !existingTitles.has(p.title.toLowerCase())
    );

    if (additions.length === 0) {
        console.log('No new projects judged interesting enough this month.');
        return;
    }

    const updated = [...existing, ...additions];
    await writeFile(PROJECTS_PATH, JSON.stringify(updated, null, 2) + '\n');
    console.log(`Added ${additions.length} project(s): ${additions.map(p => p.title).join(', ')}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
