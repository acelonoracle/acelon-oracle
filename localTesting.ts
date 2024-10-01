import { Struct, str, u32, Vector, Bytes } from 'scale-ts'

// Helper function to convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
}

// Define the Source codec
const SourceCodec = Struct({
  exchangeId: str,
  certificate: Bytes(32), // 32 bytes for the certificate
})

// Define the PriceInfo codec
const PriceInfoCodec = Struct({
  from: str,
  to: str,
  decimals: u32,
  price: Vector(u32),
  timestamp: u32,
  sources: Vector(SourceCodec),
  requestHash: Bytes(32), // 32 bytes for the request hash
})

// Define types for the price data structure
interface Source {
  exchangeId: string
  certificate: string
}

interface PriceData {
  from: string
  to: string
  decimals: number
  price: number[]
  timestamp: number
  sources: Source[]
  requestHash: string
}

// The price data object
const priceData: PriceData = {
  from: 'SOL',
  to: 'USDT',
  decimals: 9,
  price: [131975000000],
  timestamp: 1726039366272,
  sources: [
    {
      exchangeId: 'BNU',
      certificate:
        'ef27778d3c1f3546d7c49fe18aa7c2559a11171df720b9b4230dc2758bb2603e',
    },
    {
      exchangeId: 'CBP',
      certificate:
        'df9dff64362b690dc333ac3883d7798f06a93d896509ba157dabe368e8d1d635',
    },
    {
      exchangeId: 'KUC',
      certificate:
        '875f2ab6d013049784ebdca33e5182d8885d81fa9d01ceb44f94175c44a824c1',
    },
    {
      exchangeId: 'OKX',
      certificate:
        'd76729dc646f89f9cf0c4e90d0cc6d9acbd0874304b518da65698edb6d6be65d',
    },
    {
      exchangeId: 'BFX',
      certificate:
        '9f828f8e197e0cd081a38be3f5ac5ed91e50a6a676ac2a818ca81c3d0d1aeddd',
    },
    {
      exchangeId: 'HTX',
      certificate:
        '74741668a181b5567f47b82d8a4cd718bd46ae53cd094e049a00cf67db0ae794',
    },
    {
      exchangeId: 'MEXC',
      certificate:
        'cf83abf1bb89c265c02bef57f4d03269dfa55ee2ff23bb89e023f61b78ac8004',
    },
    {
      exchangeId: 'GIO',
      certificate:
        '7f09db6060e6ab8c7cc96eda8cd93cf629c619e3c522dadc61130530a3681140',
    },
  ],
  requestHash:
    'c55623dc6bf3806a9e3e11ba957aa37335e154d37dacc702a9ac09f243e7bc8a',
}

// Encode the data
const scaleEncoded = PriceInfoCodec.enc({
  ...priceData,
  sources: priceData.sources.map((s) => ({
    ...s,
    certificate: Uint8Array.from(Buffer.from(s.certificate, 'hex')),
  })),
  requestHash: Uint8Array.from(Buffer.from(priceData.requestHash, 'hex')),
})

console.log('SCALE Encoded Data:', Buffer.from(scaleEncoded).toString('hex'))

// Decode the data
const decodedData = PriceInfoCodec.dec(scaleEncoded)

console.log('Decoded Data:', {
  ...decodedData,
  sources: decodedData.sources.map((s) => ({
    ...s,
    certificate: Buffer.from(s.certificate).toString('hex'),
  })),
  requestHash: Buffer.from(decodedData.requestHash).toString('hex'),
})

// Test if the decoded data matches the original data
const testDecoding = (): void => {
  console.log('Testing decoded data:')
  console.log('From:', decodedData.from === priceData.from)
  console.log('To:', decodedData.to === priceData.to)
  console.log('Decimals:', decodedData.decimals === priceData.decimals)
  console.log('Price:', decodedData.price[0] === priceData.price[0])
  console.log('Timestamp:', decodedData.timestamp === priceData.timestamp)
  console.log(
    'Sources length:',
    decodedData.sources.length === priceData.sources.length
  )
  console.log(
    'First source certificate:',
    Buffer.from(decodedData.sources[0].certificate).toString('hex') ===
      priceData.sources[0].certificate
  )
  console.log(
    'Request Hash:',
    Buffer.from(decodedData.requestHash).toString('hex') ===
      priceData.requestHash
  )
}

testDecoding()
