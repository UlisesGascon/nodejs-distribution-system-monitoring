import * as core from '@actions/core'
import { downloadReleases, overwriteReleaseUrls, generateReleasesUrls, getConfig } from '../utils/index.js'

const { parallelHttpRequests } = getConfig()
core.notice('Collecting releases...')
const releases = await downloadReleases()
core.info(`Found ${releases.length} releases`)
const urls = await generateReleasesUrls(releases, parallelHttpRequests)
core.info(`Found ${urls.length} release urls`)
overwriteReleaseUrls(urls)
