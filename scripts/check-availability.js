import * as core from '@actions/core'
import { getReleases, chunkArray, getConfig, getUrlHeaders, saveResults } from '../utils/index.js'

core.notice('Checking availability...')
const { parallelHttpRequests, userAgent } = getConfig()
const releaseUrls = getReleases()

const output = {}
const timestamp = Date.now()

for (const domain of Object.keys(releaseUrls)) {
  const chunks = chunkArray(releaseUrls[domain], parallelHttpRequests)
  core.info(`${releaseUrls[domain].length} release urls for ${domain} divided into ${chunks.length} chunks`)
  output[domain] = {}
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async url => {
      const result = await getUrlHeaders(url, userAgent)
      output[domain][url] = result
    }))
    core.info(`total processed for ${domain}: ${Object.keys(output[domain]).length} / ${releaseUrls[domain].length}`)
  }
}

saveResults(output, timestamp)
