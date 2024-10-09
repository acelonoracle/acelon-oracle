import {
  PriceInfo,
  SignedPrice,
  Protocol,
  FetchPricesParams,
  PriceData,
} from '../types'
import crypto from 'crypto'
import { Bytes, Struct, Vector, str, u128, u64, u8 } from 'scale-ts'
import { encodeAbiParameters } from 'viem'
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
const PricePayloadCodec = Struct({
  prices: Vector(u128),
  timestamp: u64,
  certificates: Vector(Bytes(32)),
  requestHash: Bytes(32),
})

function signPriceForProtocol(
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
  let pubKey: string

  const pubKeys = _STD_.job.getPublicKeys()

  try {
    switch (protocol) {
      case 'Substrate':
      case 'WASM':
      case 'Ink!':
      case 'Gear':
        // Pack data into SCALE format using scale-ts
        const scaleEncoded = PricePayloadCodec.enc({
          prices: priceData.price,
          timestamp: BigInt(priceData.timestamp),
          certificates: priceData.sources.map((s) =>
            Uint8Array.from(Buffer.from(s.certificate, 'hex'))
          ),
          requestHash: Uint8Array.from(
            Buffer.from(priceData.requestHash, 'hex')
          ),
        })
        packedPrice = Buffer.from(scaleEncoded).toString('hex')

        _STD_.chains.substrate.signer.setSigner('SECP256K1')
        signature = _STD_.chains.substrate.signer.sign(packedPrice)

        pubKey = pubKeys['secp256k1']
        break
      case 'EVM':
        // Pack data into ABI format using viem

        // Define the ABI parameters
        const abiParameters = [
          {
            name: 'pricePayload',
            type: 'tuple',
            components: [
              { name: 'prices', type: 'uint128[]' },
              { name: 'timestamp', type: 'uint64' },
              { name: 'certificates', type: 'bytes32[]' },
              { name: 'requestHash', type: 'bytes32' },
            ],
          },
        ] as const

        // Encode the data
        const abiEncoded = encodeAbiParameters(abiParameters, [
          {
            prices: priceData.price,
            timestamp: BigInt(priceData.timestamp),
            certificates: priceData.sources.map(
              (source) => `0x${source.certificate}` as `0x${string}`
            ),
            requestHash: `0x${priceData.requestHash}` as `0x${string}`,
          },
        ] as const)

        packedPrice = abiEncoded.slice(2) // Remove '0x' prefix
        signature = _STD_.chains.ethereum.signer.sign(packedPrice)

        pubKey = pubKeys['secp256k1']
        break
      case 'Tezos':
        packedPrice = _STD_.chains.tezos.encoding.pack([
          {
            prices: priceData.price.map((p) => String(p)),
            timestamp: priceData.timestamp,
            certificates: priceData.sources.map((s) => s.certificate),
            requestHash: priceData.requestHash,
          },
        ])
        signature = _STD_.chains.tezos.signer.sign(packedPrice)

        pubKey = pubKeys['p256']
        break
      case 'Youves':
        packedPrice = _STD_.chains.tezos.encoding.pack([
          {
            timestamp: priceData.timestamp,
            symbol: priceData.from + priceData.to,
            price: Number(priceData.price[0]),
          },
        ])
        signature = _STD_.chains.tezos.signer.sign(packedPrice)

        pubKey = pubKeys['p256']
        break
      default:
        throw new Error(`Unsupported protocol: ${protocol}`)
    }

    return {
      priceData,
      packed: packedPrice,
      signature,
      pubKey,
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
