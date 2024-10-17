import { bigIntReplacer } from './util'
import * as Sentry from '@sentry/node'

declare const _STD_: any
declare const httpPOST: any

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

//this log sentry function works on SENTRY version processors
function logSentryProcessor(message: string): void {
  if (_STD_ && _STD_.sentry && typeof _STD_.sentry.log === 'function') {
    _STD_.sentry.log(message)
  }
}

//this log sentry function works on any processor that provides a SENTRY_KEY in the ENV variables
function logSentryPost(message: string): void {
  if (_STD_ && _STD_.env['SENTRY_KEY'] && _STD_.env['SENTRY_POST_URL']) {
    httpPOST(
      _STD_.env['SENTRY_POST_URL'],
      JSON.stringify(
        {
          event_id: generateUUID(),
          timestamp: new Date().toISOString(),
          platform: 'javascript',
          message: {
            message: message,
          },
          tags: { processorAddress: _STD_.device.getAddress() },
        },
        bigIntReplacer
      ),
      {
        'Content-Type': 'application/json',
        'user-agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.52 Safari/537.36',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${_STD_.env['SENTRY_KEY']}, sentry_client=raven-bash/0.1`,
      },
      (rawResponse: string, certificate: string) => {},
      (errorMessage: string) => {
        console.error('Error sending log to Sentry:', errorMessage)
      }
    )
  }
}

export function log(
  message: string,
  type: 'default' | 'warn' | 'error' = 'default'
): void {
  switch (type) {
    case 'warn':
      console.warn(message)
      break
    case 'error':
      console.error(message)
      Sentry.captureException(message)
      logSentryPost(message)
      break
    default:
      console.log(message)
  }
}
