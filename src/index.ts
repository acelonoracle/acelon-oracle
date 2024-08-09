import { WSS_URLS } from "./constants"
import { fetchPrices } from "./methods/fetchPrices"
import { signPrices } from "./methods/signPrices"
import { JsonRpcRequest, JsonRpcResponse, WebSocketPayload } from "./types"

declare const _STD_: any

// Handle incoming JSON-RPC requests and call methods accordingly
async function handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  try {
    switch (request.method) {
      case "fetchPrices":
        //check that required parameters are present
        if (!request.params || !request.params.pairs || !request.params.protocol) {
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32602,
              message: "Missing required parameters",
            },
          }
        }

        try {
          const priceInfos = await fetchPrices(request.params)
          const signedPrices = await signPrices(priceInfos, request.params)
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              priceInfos,
              signedPrices,
              version: "1.0.0",
            },
          }
        } catch (error: any) {
          // Handle specific errors from fetchPrices
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32000, // Custom error code
              message: "fetchPrices error",
              data: error.message,
            },
          }
        }
      default: // Method not found
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: "Method not found",
          },
        }
    }
  } catch (error: any) {
    console.error("Error in handleRequest:", error)
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message,
      },
    }
  }
}

async function main() {
  _STD_.ws.open(
    WSS_URLS,
    () => {
      console.log("🛜 WebSocket connection opened successfully!")
      _STD_.ws.registerPayloadHandler(async (payload: WebSocketPayload) => {
        try {
          const request: JsonRpcRequest = JSON.parse(Buffer.from(payload.payload, "hex").toString("utf8"))
          console.log("📩 REQUEST RECEIVED", JSON.stringify(request))

          const response = await handleRequest(request)
          _STD_.ws.send(payload.sender, Buffer.from(JSON.stringify(response)).toString("hex"))
        } catch (error) {
          console.error("❌ Error processing payload:", error)
          const errorResponse: JsonRpcResponse = {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: "Parse error",
            },
          }
          _STD_.ws.send(payload.sender, Buffer.from(JSON.stringify(errorResponse)).toString("hex"))
        }
      })
    },
    (err: any) => {
      console.error("WebSocket connection error:", err)
    }
  )
}

main().catch((error) => {
  console.error("Main function error:", error)
})
