import { ethers } from 'ethers';

// Define types for the price data structure
interface Source {
  exchangeId: string;
  certificate: string;
}

interface PriceData {
  from: string;
  to: string;
  decimals: number;
  price: number[];
  timestamp: number;
  sources: Source[];
  requestHash: string;
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
      certificate: '0xef27778d3c1f3546d7c49fe18aa7c2559a11171df720b9b4230dc2758bb2603e',
    },
    {
      exchangeId: 'CBP',
      certificate: '0xdf9dff64362b690dc333ac3883d7798f06a93d896509ba157dabe368e8d1d635',
    },
    {
      exchangeId: 'KUC',
      certificate: '0x875f2ab6d013049784ebdca33e5182d8885d81fa9d01ceb44f94175c44a824c1',
    },
    {
      exchangeId: 'OKX',
      certificate: '0xd76729dc646f89f9cf0c4e90d0cc6d9acbd0874304b518da65698edb6d6be65d',
    },
    {
      exchangeId: 'BFX',
      certificate: '0x9f828f8e197e0cd081a38be3f5ac5ed91e50a6a676ac2a818ca81c3d0d1aeddd',
    },
    {
      exchangeId: 'HTX',
      certificate: '0x74741668a181b5567f47b82d8a4cd718bd46ae53cd094e049a00cf67db0ae794',
    },
    {
      exchangeId: 'MEXC',
      certificate: '0xcf83abf1bb89c265c02bef57f4d03269dfa55ee2ff23bb89e023f61b78ac8004',
    },
    {
      exchangeId: 'GIO',
      certificate: '0x7f09db6060e6ab8c7cc96eda8cd93cf629c619e3c522dadc61130530a3681140',
    },
  ],
  requestHash: '0xc55623dc6bf3806a9e3e11ba957aa37335e154d37dacc702a9ac09f243e7bc8a',
};

// Define the ABI types for our data structure
const types: string[] = [
  'string',
  'string',
  'uint8',
  'uint256[]',
  'uint256',
  'tuple(string,bytes32)[]',
  'bytes32'
];

// Prepare the values for encoding
const values: (string | number | bigint[] | Array<[string, string]> | bigint)[] = [
  priceData.from,
  priceData.to,
  priceData.decimals,
  priceData.price.map(p => BigInt(p)),
  BigInt(priceData.timestamp),
  priceData.sources.map(source => [source.exchangeId, source.certificate] as [string, string]),
  priceData.requestHash
];

// Encode the data
const abiCoder = new ethers.AbiCoder();
const encodedData: string = abiCoder.encode(types, values);

console.log('Encoded Data:', encodedData);

// Optionally, you can also decode the data to verify the encoding
const decodedData: ethers.Result = abiCoder.decode(types, encodedData);

console.log('Decoded Data:', decodedData);

// Test if the decoded data matches the original data
const testDecoding = (): void => {
  console.log('Testing decoded data:');
  console.log('From:', decodedData[0] === priceData.from);
  console.log('To:', decodedData[1] === priceData.to);
  console.log('Decimals:', decodedData[2] === priceData.decimals);
  console.log('Price:', (decodedData[3] as bigint[])[0] === BigInt(priceData.price[0]));
  console.log('Timestamp:', (decodedData[4] as bigint) === BigInt(priceData.timestamp));
  console.log('Sources length:', (decodedData[5] as Array<[string, string]>).length === priceData.sources.length);
  console.log('Request Hash:', decodedData[6] === priceData.requestHash);
};

testDecoding();