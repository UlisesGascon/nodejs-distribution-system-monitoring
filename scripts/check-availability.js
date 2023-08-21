import * as core from '@actions/core'
import { getReleases, chunkArray, getConfig, getUrlHeaders, saveResults } from '../utils/index.js'

core.notice('Checking availability...')
const { parallelHttpRequests, userAgent } = getConfig()
const releaseUrls = getReleases()

const chunks = chunkArray(releaseUrls, parallelHttpRequests)
core.info(`${releaseUrls.length} release urls divided into ${chunks.length} chunks`)

const timestamp = Date.now()

const output = {}
for (const chunk of chunks) {
  await Promise.all(chunk.map(async url => {
    const result = await getUrlHeaders(url, userAgent)
    output[url] = result
  }))
  core.info(`total processed: ${Object.keys(output).length} / ${releaseUrls.length}`)
}

saveResults(output, timestamp)
