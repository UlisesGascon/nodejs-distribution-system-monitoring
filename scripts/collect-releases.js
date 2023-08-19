import { downloadReleases, overwriteReleaseUrls, generateReleasesUrls, getConfig } from '../utils/index.js'

const { parallelHttpRequests } = getConfig()
const releases = await downloadReleases()
console.log(`Found ${releases.length} releases`)
const urls = await generateReleasesUrls(releases, parallelHttpRequests)
console.log(`Found ${urls.length} release urls`)
overwriteReleaseUrls(urls)
