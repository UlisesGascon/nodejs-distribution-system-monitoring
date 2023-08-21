import * as core from '@actions/core'
import { getChecksums, updateChecksums, overwriteChecksums, getConfig, getReleases, generateFilesChecksums } from '../utils/index.js'

const { parallelHttpRequests } = getConfig()
core.notice('Collecting releases...')
const releases = getReleases()
core.info(`Found ${Object.keys(releases).reduce((acc, c) => releases[acc].length + releases[c].length)} releases between Node.js and io.js`)

const checksums = await generateFilesChecksums(releases, parallelHttpRequests)
const storedChecksums = getChecksums()

core.info('Adding new checksums to previous results...')
const extendChecksums = updateChecksums(storedChecksums, checksums)

core.info('Overwriting checksums file...')
overwriteChecksums(extendChecksums)
