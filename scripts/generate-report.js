import * as core from '@actions/core'
import { getMetrics, generateReports, saveReports } from '../utils/index.js'

core.notice('Generating report...')
const metrics = getMetrics()
const reportData = generateReports(metrics)
await saveReports(reportData)
