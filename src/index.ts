import { WSS_URLS } from './constants'
import { checkExchangeHealth } from './methods/checkExchangeHealth'
import { fetchPrices } from './methods/fetchPrices'
import { signPrices } from './methods/signPrices'
import { JsonRpcRequest, JsonRpcResponse, WebSocketPayload } from './types'
import { log } from './utils/sentry'
import { bigIntReplacer } from './utils/util'

declare const _STD_: any

// Handle incoming JSON-RPC requests and call methods accordingly
async function handleRequest(
  request: JsonRpcRequest
): Promise<JsonRpcResponse> {
  try {
    switch (request.method) {
      case 'ping':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { status: 'alive', timestamp: Date.now() },
        }
      case 'fetchPrices':
        if (
          !request.params ||
          !request.params.pairs ||
          !request.params.protocol
        ) {
          log(
            '🚨 Invalid fetchPrices request: Missing required parameters',
            'warn'
          )
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32602,
              message: 'Missing required parameters',
            },
          }
        }

        try {
          const { priceInfos, priceErrors } = await fetchPrices(request.params)
          const signedPrices = await signPrices(priceInfos, request.params)
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              priceInfos,
              priceErrors,
              signedPrices,
              version: '1.0.0',
            },
          }
        } catch (error: any) {
          log(`❌ Error in fetchPrices: ${error.message}`, 'error')
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32001,
              message: 'fetchPrices error',
              data: error.message,
            },
          }
        }
      case 'checkExchangeHealth':
        try {
          const healthStatuses = await checkExchangeHealth(request.params)
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: { healthStatuses },
          }
        } catch (error: any) {
          log(`❌ Error in checkExchangeHealth: ${error.message}`, 'error')
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32002,
              message: 'checkExchangeHealth error',
              data: error.message,
            },
          }
        }
      default:
        log(`🚨 Method not found: ${request.method}`, 'warn')
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        }
    }
  } catch (error: any) {
    log(`❌ Unexpected error in handleRequest: ${error.message}`, 'error')
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message,
      },
    }
  }
}

async function main() {
  log('🌱 Oracle script execution started')

  _STD_.ws.open(
    WSS_URLS,
    () => {
      log('🛜 WebSocket connection opened successfully!')
      _STD_.ws.registerPayloadHandler(async (payload: WebSocketPayload) => {
        try {
          const request: JsonRpcRequest = JSON.parse(
            Buffer.from(payload.payload, 'hex').toString('utf8')
          )
          log(`📬 REQUEST RECEIVED: ${JSON.stringify(request, bigIntReplacer)}`)

          const response = await handleRequest(request)
          console.log(response)
          _STD_.ws.send(
            payload.sender,
            Buffer.from(JSON.stringify(response, bigIntReplacer)).toString(
              'hex'
            )
          )

          log(`📨 RESPONSE SENT: ${JSON.stringify(response, bigIntReplacer)}`)
        } catch (error: any) {
          log(`❌ Error processing payload: ${error.message}`, 'error')
          const errorResponse: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'Parse error',
            },
          }
          _STD_.ws.send(
            payload.sender,
            Buffer.from(JSON.stringify(errorResponse)).toString('hex')
          )
        }
      })
    },
    (err: any) => {
      log(`❌ WebSocket connection error: ${err}`, 'error')
    }
  )
}

main().catch((error) => {
  log(`❌ Main function error: ${error.message}`, 'error')
})
