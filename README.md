# Node.js Binaries Integrity Checker

This repository contains a set of scripts to monitor the integrity of the Node.js binaries hosted in [nodejs.org](https://nodejs.org) and [iojs.org](https://iojs.org).

This project will evolve over the time to help us validate the migration to R2. More info:
- [Integrity checks for R2 migration #3469](https://github.com/nodejs/build/issues/3469)
- [Cloudflare R2 Workers #3461](https://github.com/nodejs/build/issues/3461)

## How it works

The scripts are executed periodically locally or in GitHub Actions. All the data used and the results are stored in this repository. So, it is easy to check the history of the results and the changes over the time.

## Important

Some of the scripts might take a while to execute. For example, the script to check the availability of the binaries takes around 30 mins. So, it is recommended to run the scripts locally and not in GitHub Actions.

As well, some of the scripts are HTTP intensive. This can be problematic if the Node.js or io.js servers are under a lot of load. So, it is recommended to run this scripts outside the peak hours.

### Actions

The scripts can be triggered manually.

- [📦 Check Availability](https://github.com/UlisesGascon/nodejs-distribution-system-monitoring/actions/workflows/check_availability.yml). It checks the availability of the binaries in the Node.js and io.js servers. The results will update the reports.
- [🕵️‍♂️ Compare checksums](https://github.com/UlisesGascon/nodejs-distribution-system-monitoring/actions/workflows/check_checksums.yml). It compares and updates the checksums of the binaries in the Node.js and io.js servers with the checksums in the `checksums.json` file. If any checksum is different, it will generate an error.

### Data

- [Results folder](/results)
- [Checksums](/checksums.json)
- [Metrics](/metrics.json)
- [Releases](/releases.json)
- [Releases URLs](/releases_urls.json)

### Reports

- [Health Report for iojs.org/dist](report-iojs.md)
- [Health Report for nodejs.org/dist](report-nodejs.md)
