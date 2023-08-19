import { getMetrics, generateReport, saveReport } from '../utils/index.js'

console.log('Generating report...')
const metrics = getMetrics()
const reportData = generateReport(metrics)
saveReport(reportData)
