import * as core from '@actions/core'
import { getChecksums, compareChecksums, getConfig, getReleases, generateFilesChecksums } from '../utils/index.js'

const { parallelHttpRequests } = getConfig()
core.notice('Comparing checksums...')
const releases = getReleases()
core.info(`Found ${Object.keys(releases).reduce((acc, c) => releases[acc].length + releases[c].length)} releases between Node.js and io.js`)

const checksums = await generateFilesChecksums(releases, parallelHttpRequests)
const storedChecksums = getChecksums()

core.info('Comparing checksums...')
const issues = compareChecksums(storedChecksums, checksums)

if (issues.length) {
  core.warning('Found issues with checksums:')
  issues.forEach(issue => core.warning(`- ${issue}`))
  process.exit(1)
}

core.info('No issues found with checksums')
process.exit(0)
