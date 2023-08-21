import exec from '@actions/exec'
import * as core from '@actions/core'
import { HttpClient } from '@actions/http-client'
import { readFileSync, writeFileSync } from 'node:fs'
import { readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const httpAgent = new HttpClient('node-dist-health')

export async function getAllResults () {
  const resultsFolder = join(process.cwd(), 'results')
  const files = await readdir(resultsFolder)
  const results = {}
  for (const file of files) {
    if (file.includes('.json')) {
      const [timestamp] = file.split('.')
      const data = JSON.parse(readFileSync(join(resultsFolder, file), 'utf8'))
      results[timestamp] = data
    }
  }
  return results
}

// if 200 OK return 1, else return 0
export async function getUrlHeaders (url, userAgent) {
  try {
    const { stdout } = await exec.getExecOutput('curl', ['-A', `${userAgent}`, '--head', `${url}`], { silent: true })
    if (!stdout.includes('HTTP/2 200')) {
      core.warning(`NOT 200 status code for ${url}`)
      core.info(stdout)
      return 0
    }
    return 1
  } catch (error) {
    core.warning(`Error connecting to ${url}`)
    core.info(error)
    return 0
  }
}

// @see: https://github.com/UlisesGascon/micro-utilities/blob/main/packages/array-to-chunks/src/index.ts
export function chunkArray (arr, chunkSize) {
  if (!Array.isArray(arr)) throw new Error('arr must be an array')
  if (!Number.isInteger(chunkSize) && chunkSize >= 0) { throw new Error('chunkSize must be a positive integer') }

  const res = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize)
    res.push(chunk)
  }
  return res
}

const configFile = join(process.cwd(), 'config.json')
const releasesUrlsFile = join(process.cwd(), 'releases_urls.json')
const metricsFile = join(process.cwd(), 'metrics.json')
const getReportFilePath = domain => join(process.cwd(), `report-${domain}.md`)

const readJsonFile = (file) => () => JSON.parse(readFileSync(file, 'utf8'))
export const getConfig = readJsonFile(configFile)
export const getReleasesUrls = readJsonFile(releasesUrlsFile)
export const getMetrics = readJsonFile(metricsFile)

export function saveMetrics (metrics) {
  writeFileSync(metricsFile, JSON.stringify(metrics, null, 2))
}

export function saveResults (results, timestamp) {
  writeFileSync(join(process.cwd(), `results/${timestamp}.json`), JSON.stringify(results, null, 2))
}

export async function saveReports (reports) {
  return Promise.all(Object.keys(reports).map(async domain => writeFile(getReportFilePath(domain), reports[domain])))
}

export async function generateReleasesUrls (releases, parallelRequests) {
  const urlsCollected = {}
  for (const domain of Object.keys(releases)) {
    const chunks = chunkArray(releases[domain], parallelRequests)
    const urls = await Promise.all(chunks.map(chunk => Promise.all(chunk.map(async release => {
      const shasumUrl = `https://${domain}.org/dist/${release.version}/SHASUMS256.txt`
      const shasum = await downloadFile(shasumUrl)
      // Split the shasum file into lines, collect the file names, filter out empty lines, and generate the url with the file name
      return shasum.split('\n')
        .map(line => line.split('  ')[1])
        .filter(line => line)
        .map(line => `https://${domain}.org/dist/${release.version}/${line}`)
    }))))
    urlsCollected[domain] = urls.flat(2)
  }
  return urlsCollected
}

export function overwriteReleaseUrls (urls) {
  writeFileSync(releasesUrlsFile, JSON.stringify(urls, null, 2))
}

function downloadFile (url) {
  return httpAgent.get(url).then(res => res.readBody())
}

const getReleaseName = (url, domain) => url.split(`https://${domain}.org/dist/`)[1]

export async function downloadReleases () {
  const [nodejs, iojs] = await Promise.all([downloadFile('https://nodejs.org/dist/index.json'), downloadFile('https://iojs.org/dist/index.json')])
  return {
    nodejs: JSON.parse(nodejs),
    iojs: JSON.parse(iojs)
  }
}

const generateMdCurrentIssues = ({ urls, data, domain }) => {
  const issues = urls.filter(url => !data[domain][url].current)

  if (!issues.length) return ''

  return `
## 🚨 Current Issues

${issues.map(url => {
    return `- [${getReleaseName(url, domain)}](${url})`
}).join('\n')}
`
}

const generateMdLastDay = ({ urls, data, domain }) => {
  const issues = urls.filter(url => data[domain][url].lastDay.error)
  if (!issues.length) return ''

  return `
## 🚨 Last day

| Release | Status | OK | Errors |
| --- | --- | --- | --- |
${issues
    .map(url => {
    const release = getReleaseName(url, domain)
    const { ok, error } = data[domain][url].lastDay
    return `| [${release}](${url}) | ${error ? '❌' : '✅'} | ${ok} | ${error} |`
}).join('\n')}
`
}

const generateMdLastWeek = ({ urls, data, domain }) => {
  const issues = urls.filter(url => data[domain][url].lastWeek.error)
  if (!issues.length) return ''

  return `
## 🚨 Last Week

| Release | Status | OK | Errors |
| --- | --- | --- | --- |
${issues
    .map(url => {
    const release = getReleaseName(url, domain)
    const { ok, error } = data[domain][url].lastWeek
    return `| [${release}](${url}) | ${error ? '❌' : '✅'} | ${ok} | ${error} |`
}).join('\n')}
`
}

const generateMdLastMonth = ({ urls, data, domain }) => {
  const issues = urls.filter(url => data[domain][url].lastMonth.error)
  if (!issues.length) return ''

  return `
## 🚨 Last Month

| Release | Status | OK | Errors |
| --- | --- | --- | --- |
${issues
    .map(url => {
    const release = getReleaseName(url, domain)
    const { ok, error } = data[domain][url].lastMonth
    return `| [${release}](${url}) | ${error ? '❌' : '✅'} | ${ok} | ${error} |`
}).join('\n')}
`
}

export function generateReports (data) {
  const report = {}
  Object.keys(data).forEach(domain => {
    const urls = Object.keys(data[domain])
    const total = {
      requests: 0,
      error: 0,
      ok: 0
    }

    urls.forEach(url => {
      total.requests += data[domain][url].total.requests
      total.error += data[domain][url].total.error
      total.ok += data[domain][url].total.ok
    })

    report[domain] = `
# Health Report for ${domain}.org/dist

## ℹ️ Total overtime

- Total requests: ${total.requests}
- ✅ OK: ${total.ok} (${(total.ok / total.requests * 100).toFixed(2)}%)
- ❌ Errors: ${total.error} (${(total.error / total.requests * 100).toFixed(2)}%)

${generateMdCurrentIssues({ urls, data, domain })}

${generateMdLastDay({ urls, data, domain })}

${generateMdLastWeek({ urls, data, domain })}

${generateMdLastMonth({ urls, data, domain })}
`
  })

  return report
}
