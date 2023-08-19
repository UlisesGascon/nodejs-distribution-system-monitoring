import { getReleases, chunkArray, getConfig, getUrlHeaders, saveResults } from '../utils/index.js'

const { parallelHttpRequests } = getConfig()
const releaseUrls = getReleases()

const chunks = chunkArray(releaseUrls, parallelHttpRequests)
console.log(`${releaseUrls.length} release urls divided into ${chunks.length} chunks`)

const timestamp = Date.now()

const output = {}
for (const chunk of chunks) {
  await Promise.all(chunk.map(async url => {
    const result = await getUrlHeaders(url)
    output[url] = result
  }))
  console.log(`total processed: ${Object.keys(output).length} / ${releaseUrls.length}`)
}

saveResults(output, timestamp)
