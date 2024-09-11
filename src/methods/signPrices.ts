import {
  PriceInfo,
  SignedPrice,
  Protocol,
  FetchPricesParams,
  PriceData,
} from '../types'
import crypto from 'crypto'
import { Bytes, Struct, Vector, str, u32 } from 'scale-ts'
import { encodeAbiParameters, Hex } from 'viem'

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
  certificate: Bytes(32),
})

const PriceInfoCodec = Struct({
  from: str,
  to: str,
  decimals: u32,
  price: Vector(u32),
  timestamp: u32,
  sources: Vector(SourceCodec),
  requestHash: Bytes(32),
})

export function signPriceForProtocol(
  priceInfo: PriceInfo,
  protocol: Protocol,
  requestHash: string
): SignedPrice {
  const priceData: PriceData = {
    from: priceInfo.from,
    to: priceInfo.to,
    decimals: priceInfo.decimals,
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
        const scaleEncoded = PriceInfoCodec.enc({
          ...priceData,
          sources: priceData.sources.map((s) => ({
            ...s,
            certificate: Uint8Array.from(Buffer.from(s.certificate, 'hex')),
          })),
          requestHash: Uint8Array.from(Buffer.from(priceData.requestHash, 'hex')),
        })
        packedPrice = Buffer.from(scaleEncoded).toString('hex')
        signature = _STD_.signers.secp256k1.sign(sha256(packedPrice))
        break
      case 'EVM':
        // Pack data into ABI format using viem

        // Define the type for our encoded data
        type EncodedPriceData = readonly [
          string,
          string,
          number,
          readonly number[],
          number,
          readonly { exchangeId: string; certificate: Hex }[],
          Hex,
        ]

        // Define the ABI parameters
        const abiParameters = [
          { name: 'from', type: 'string' },
          { name: 'to', type: 'string' },
          { name: 'decimals', type: 'uint32' },
          { name: 'price', type: 'uint32[]' },
          { name: 'timestamp', type: 'uint32' },
          {
            name: 'sources',
            type: 'tuple[]',
            components: [
              { name: 'exchangeId', type: 'string' },
              { name: 'certificate', type: 'bytes32' },
            ],
          },
          { name: 'requestHash', type: 'bytes32' },
        ] as const

        // Encode the data
        const abiEncoded = encodeAbiParameters(abiParameters, [
          priceData.from,
          priceData.to,
          priceData.decimals,
          priceData.price,
          priceData.timestamp,
          priceData.sources,
          priceData.requestHash,
        ] as EncodedPriceData)

        packedPrice = abiEncoded.slice(2) // Remove '0x' prefix
        signature = _STD_.signers.secp256k1.sign(sha256(packedPrice))
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
