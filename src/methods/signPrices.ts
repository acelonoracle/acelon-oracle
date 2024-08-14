import { PriceInfo, SignedPrice, Protocol, FetchPricesParams } from '../types'
import crypto from 'crypto'
import { Struct, Vector, str, u32 } from 'scale-ts'
import RLP from 'rlp'

declare const _STD_: any

export async function signPrices(
  priceInfos: PriceInfo[],
  params: FetchPricesParams
): Promise<SignedPrice[]> {
  const requestHash = hashRequest(params)
  return priceInfos.map((info) =>
    signPriceForProtocol(info, params.protocol, requestHash)
  )
}

//SCALE data structures
const SourceCodec = Struct({
  exchangeId: str,
  certificate: str,
})

const PriceInfoCodec = Struct({
  from: str,
  to: str,
  price: Vector(u32),
  timestamp: u32,
  sources: Vector(SourceCodec),
  requestHash: str,
})

function signPriceForProtocol(
  priceInfo: PriceInfo,
  protocol: Protocol,
  requestHash: string
): SignedPrice {
  const priceData = {
    from: priceInfo.from,
    to: priceInfo.to,
    price: Object.values(priceInfo.price),
    timestamp: priceInfo.timestamp,
    sources: priceInfo.sources,
    requestHash: requestHash,
  }

  let packedPrice: string
  let signature: string

  try {
    switch (protocol) {
      case 'Substrate':
      case 'WASM':
        // Pack data into SCALE format using scale-ts
        const scaleEncoded = PriceInfoCodec.enc(priceData)
        packedPrice = sha256(scaleEncoded)
        signature = _STD_.signers.secp256k1.sign(packedPrice)
        break
      case 'EVM':
        // Pack data into RLP format
        const rlpEncoded = RLP.encode([
          priceData.from,
          priceData.to,
          priceData.price.map((p) => p.toString()),
          priceData.timestamp.toString(),
          priceData.sources.map((s) => [s.exchangeId, s.certificate]),
          priceData.requestHash,
        ])
        packedPrice = sha256(rlpEncoded)
        signature = _STD_.signers.secp256k1.sign(packedPrice)
        break
      case 'Tezos':
        packedPrice = _STD_.chains.tezos.encoding.pack([priceData])
        signature = _STD_.chains.tezos.signer.sign(packedPrice)
        break
      default:
        throw new Error(`Unsupported protocol: ${protocol}`)
    }

    return {
      priceData,
      packed: packedPrice,
      signature,
    }
  } catch (error: any) {
    throw new Error(
      `Error signing price for ${priceInfo.from}-${priceInfo.to}: ${error.message}`
    )
  }
}

function sha256(data: Uint8Array | string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function hashRequest(params: FetchPricesParams): string {
  const stableJson = JSON.stringify(params, Object.keys(params).sort())
  return sha256(JSON.stringify(stableJson))
}
