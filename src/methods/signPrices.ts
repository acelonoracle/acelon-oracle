import { PriceInfo, SignedPrice, Protocol, FetchPricesParams } from "../types"
import crypto from "crypto"

declare const _STD_: any

// use for acurast and tezos signers.secp256r1
// use for substrate, evm, bitcoin signers.secp256k1
// use for aeternity signers.ed25519

function hashJson(data: any): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex")
}

function hashRequest(params: FetchPricesParams): string {
  const stableJson = JSON.stringify(params, Object.keys(params).sort())
  return hashJson(stableJson)
}

export async function signPrices(priceInfos: PriceInfo[], params: FetchPricesParams): Promise<SignedPrice[]> {
  const requestHash = hashRequest(params)
  return priceInfos.map((info) => signPriceForProtocol(info, params.protocol, requestHash))
}

function signPriceForProtocol(priceInfo: PriceInfo, protocol: Protocol, requestHash: string): SignedPrice {
  const data = {
    from: priceInfo.from,
    to: priceInfo.to,
    price: priceInfo.price,
    timestamp: priceInfo.timestamp,
    sources: priceInfo.sources,
    requestHash: requestHash,
  }

  let packedPrice: string
  let signature: string

  try {
    switch (protocol) {
      case "Substrate":
      case "WASM":
      case "EVM":
        // Create a SHA-256 hash of the JSON string and convert it to a hex string
        packedPrice = hashJson(data)
        signature = _STD_.signers.secp256k1.sign(packedPrice)
        break
      case "Tezos":
        packedPrice = _STD_.chains.tezos.encoding.pack([data])
        signature = _STD_.chains.tezos.signer.sign(packedPrice)
        break
      default:
        throw new Error(`Unsupported protocol: ${protocol}`)
    }

    return {
      data,
      packedPrice,
      signature,
    }
  } catch (error: any) {
    throw new Error(`Error signing price for ${priceInfo.from}-${priceInfo.to}: ${error.message}`)
  }
}
