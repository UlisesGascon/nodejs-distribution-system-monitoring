import { readFileSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import https from 'node:https'
import { join } from 'node:path'
import exec from '@actions/exec'

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

export async function getUrlHeaders (url, userAgent) {
  const { stdout } = await exec.getExecOutput('curl', ['-A', `${userAgent}`, '--head', `${url}`], { silent: true })
  if (!stdout.includes('HTTP/2 200')) {
    console.log(`NOT 200 for ${url}`)
    console.log(stdout)
  }
  // if 200 OK return 1, else return 0
  return Number(stdout.includes('HTTP/2 200'))
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
const releasesFile = join(process.cwd(), 'releases.json')
const metricsFile = join(process.cwd(), 'metrics.json')
const reportFile = join(process.cwd(), 'report.md')

const readJsonFile = (file) => () => JSON.parse(readFileSync(file, 'utf8'))
export const getConfig = readJsonFile(configFile)
export const getReleases = readJsonFile(releasesFile)
export const getMetrics = readJsonFile(metricsFile)

export function saveMetrics (metrics) {
  writeFileSync(metricsFile, JSON.stringify(metrics, null, 2))
}

export function saveResults (results, timestamp) {
  writeFileSync(join(process.cwd(), `results/${timestamp}.json`), JSON.stringify(results, null, 2))
}

export function saveReport (report) {
  writeFileSync(reportFile, report)
}

export async function generateReleasesUrls (releases, parallelRequests) {
  const chunks = chunkArray(releases, parallelRequests)
  const urls = await Promise.all(chunks.map(chunk => Promise.all(chunk.map(async release => {
    const shasumUrl = `https://nodejs.org/dist/${release.version}/SHASUMS256.txt`
    const shasum = await downloadFile(shasumUrl)
    // Split the shasum file into lines, collect the file names, filter out empty lines, and generate the url with the file name
    return shasum.split('\n')
      .map(line => line.split('  ')[1])
      .filter(line => line)
      .map(line => `https://nodejs.org/dist/${release.version}/${line}`)
  }))))
  return urls.flat(2)
}

export function overwriteReleaseUrls (urls) {
  writeFileSync(releasesFile, JSON.stringify(urls, null, 2))
}

function downloadFile (url) {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = ''

      resp.on('data', (chunk) => {
        data += chunk
      })

      resp.on('end', () => {
        resolve(data)
      })
    }).on('error', reject)
  })
}

export async function downloadReleases () {
  const data = await downloadFile('https://nodejs.org/dist/index.json')
  return JSON.parse(data)
}

export function generateReport (data) {
  const getReleaseName = (url) => url.split('https://nodejs.org/dist/')[1]
  const urls = Object.keys(data)
  const total = {
    requests: 0,
    error: 0,
    ok: 0
  }

  urls.forEach(url => {
    total.requests += data[url].total.requests
    total.error += data[url].total.error
    total.ok += data[url].total.ok
  })

  return `
# Node.js Dist Health Report

## ℹ️ Total overtime

- Total requests: ${total.requests}
- ✅ OK: ${total.ok} (${(total.ok / total.requests * 100).toFixed(2)}%)
- ❌ Errors: ${total.error} (${(total.error / total.requests * 100).toFixed(2)}%)


## 🚨 Current Issues

${urls.filter(url => !data[url].current).map(url => {
    return `- [${getReleaseName(url)}](${url})`
}).join('\n')}


## 🚨 Last day

| Release | Status | OK | Errors |
| --- | --- | --- | --- |
${urls
    .filter(url => data[url].lastDay.error)
    .map(url => {
    const release = getReleaseName(url)
    const { ok, error } = data[url].lastDay
    return `| [${release}](${url}) | ${error ? '❌' : '✅'} | ${ok} | ${error} |`
}).join('\n')}

## 🚨 Last Week

| Release | Status | OK | Errors |
| --- | --- | --- | --- |
${urls
    .filter(url => data[url].lastWeek.error)
    .map(url => {
    const release = getReleaseName(url)
    const { ok, error } = data[url].lastWeek
    return `| [${release}](${url}) | ${error ? '❌' : '✅'} | ${ok} | ${error} |`
}).join('\n')}

## 🚨 Last Month

| Release | Status | OK | Errors |
| --- | --- | --- | --- |
${urls
    .filter(url => data[url].lastMonth.error)
    .map(url => {
    const release = getReleaseName(url)
    const { ok, error } = data[url].lastMonth
    return `| [${release}](${url}) | ${error ? '❌' : '✅'} | ${ok} | ${error} |`
}).join('\n')}

`
}
