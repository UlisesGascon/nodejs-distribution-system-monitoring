import * as core from '@actions/core'
import { downloadReleases, overwriteReleaseUrls, generateReleasesUrls, getConfig, overwriteReleases } from '../utils/index.js'

const { parallelHttpRequests } = getConfig()
core.notice('Collecting releases...')
const releases = await downloadReleases()
core.info(`Found ${Object.keys(releases).reduce((acc, c) => releases[acc].length + releases[c].length)} releases between Node.js and io.js`)
overwriteReleases(releases)
const urls = await generateReleasesUrls(releases, parallelHttpRequests)
core.info(`Found ${Object.keys(urls).reduce((acc, c) => urls[acc].length + urls[c].length)} release urls`)
overwriteReleaseUrls(urls)
