import * as core from '@actions/core'
import { getReleasesUrls, getAllResults, saveMetrics } from '../utils/index.js'

const releaseUrls = getReleasesUrls()
const timestamp = Date.now()
const dayInMs = 24 * 60 * 60 * 1000
const ts1dayAgo = timestamp - dayInMs
const ts7daysAgo = timestamp - 7 * dayInMs
const ts30daysAgo = timestamp - 30 * dayInMs
const reportData = {}

const generateURLReportStructure = () => ({
  current: 0,
  lastDay: {
    ok: 0,
    error: 0,
    requests: 0
  },
  lastWeek: {
    ok: 0,
    error: 0,
    requests: 0
  },
  lastMonth: {
    ok: 0,
    error: 0,
    requests: 0
  },
  total: {
    ok: 0,
    error: 0,
    requests: 0
  }
})

core.notice('Metrics data is being collected...')
const results = await getAllResults()
core.info(`Total Results to process: ${Object.keys(results).length}`)

// sort timestamps in reverse order (newest first)
const timestamps = Object.keys(results).sort().reverse()

timestamps.forEach((ts, i) => {
  Object.keys(results[ts]).forEach((domain) => {
    reportData[domain] = {}

    const data = results[ts][domain]
    const urls = Object.keys(data)
    urls.forEach((url) => {
      reportData[domain][url] = generateURLReportStructure()
      // skip urls that are not in releases.json
      if (!releaseUrls[domain].includes(url)) {
        return
      }

      const response = data[url]
      const isOk = response === 1
      const isLastDay = parseInt(ts) > ts1dayAgo
      const isLastWeek = parseInt(ts) > ts7daysAgo
      const isLastMonth = parseInt(ts) > ts30daysAgo

      // update the current value only once
      if (i === 0) {
        reportData[domain][url].current = response
      }

      reportData[domain][url].total.requests++
      reportData[domain][url].total[isOk ? 'ok' : 'error']++

      if (isLastDay) {
        reportData[domain][url].lastDay.requests++
        reportData[domain][url].lastDay[isOk ? 'ok' : 'error']++
      }

      if (isLastWeek) {
        reportData[domain][url].lastWeek.requests++
        reportData[domain][url].lastWeek[isOk ? 'ok' : 'error']++
      }

      if (isLastMonth) {
        reportData[domain][url].lastMonth.requests++
        reportData[domain][url].lastMonth[isOk ? 'ok' : 'error']++
      }
    })
  })
})

core.info('Metrics data is ready')

saveMetrics(reportData)
