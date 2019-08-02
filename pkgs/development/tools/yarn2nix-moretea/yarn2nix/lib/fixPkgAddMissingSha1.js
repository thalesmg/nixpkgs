const https = require('https')
const crypto = require('crypto')

// TODO:
// make test case where getSha1 function is used, i.e. the case when resolved is without sha1?
// consider using https://github.com/request/request-promise-native

function getSha1(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const { statusCode } = res
      const hash = crypto.createHash('sha1')

      if (statusCode !== 200) {
        const err = new Error(`Request Failed.\nStatus Code: ${statusCode}`)

        // consume response data to free up memory
        res.resume()

        reject(err)
      }

      res.on('data', chunk => {
        hash.update(chunk)
      })

      res.on('end', () => {
        resolve(hash.digest('hex'))
      })

      res.on('error', reject)
    })
  })
}

// Object -> Object
async function fixPkgAddMissingSha1(pkg) {
  // local dependency

  if (!pkg.resolved) {
    console.error(
      `yarn2nix: can't find "resolved" field for package ${
        pkg.nameWithVersion
      }, you probably required it using "file:...", this feature is not supported, ignoring`,
    )
    return pkg
  }

  const [url, sha1] = pkg.resolved.split('#', 2)

  if (sha1) {
    return pkg
  }

  // if there is no sha1 in resolved url
  // (this could happen if yarn.lock was generated by older version of yarn)
  // - request it from registry by https and add it to pkg
  const newSha1 = await getSha1(url)

  return {
    ...pkg,
    resolved: `${url}#${newSha1}`,
  }
}

module.exports = fixPkgAddMissingSha1