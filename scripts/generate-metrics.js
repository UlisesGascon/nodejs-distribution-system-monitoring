import * as core from '@actions/core'
import { getReleases, getAllResults, saveMetrics } from '../utils/index.js'

const releaseUrls = getReleases()

const timestamp = Date.now()
const dayInMs = 24 * 60 * 60 * 1000
const ts1dayAgo = timestamp - dayInMs
const ts7daysAgo = timestamp - 7 * dayInMs
const ts30daysAgo = timestamp - 30 * dayInMs
const reportData = {}

releaseUrls.forEach(url => {
  reportData[url] = {
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
  }
})

core.notice('Metrics data is being collected...')
const results = await getAllResults()
core.info(`Total Results to process: ${Object.keys(results).length}`)

// sort timestamps in reverse order (newest first)
const timestamps = Object.keys(results).sort().reverse()

timestamps.forEach((ts, i) => {
  const data = results[ts]
  const urls = Object.keys(data)
  urls.forEach(url => {
    // skip urls that are not in releases.json
    if (!releaseUrls.includes(url)) {
      return
    }

    const response = data[url]
    const isOk = response === 1
    const isLastDay = parseInt(ts) > ts1dayAgo
    const isLastWeek = parseInt(ts) > ts7daysAgo
    const isLastMonth = parseInt(ts) > ts30daysAgo

    // update the current value only once
    if (i === 0) {
      reportData[url].current = response
    }

    reportData[url].total.requests++
    reportData[url].total[isOk ? 'ok' : 'error']++

    if (isLastDay) {
      reportData[url].lastDay.requests++
      reportData[url].lastDay[isOk ? 'ok' : 'error']++
    }

    if (isLastWeek) {
      reportData[url].lastWeek.requests++
      reportData[url].lastWeek[isOk ? 'ok' : 'error']++
    }

    if (isLastMonth) {
      reportData[url].lastMonth.requests++
      reportData[url].lastMonth[isOk ? 'ok' : 'error']++
    }
  })
})

core.info('Metrics data is ready')

saveMetrics(reportData)
