import * as core from '@actions/core'
import { getMetrics, generateReport, saveReport } from '../utils/index.js'

core.notice('Generating report...')
const metrics = getMetrics()
const reportData = generateReport(metrics)
saveReport(reportData)
