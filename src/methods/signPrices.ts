import { PriceInfo, SignedPrice } from "../types"

declare const _STD_: any

export async function signPrices(priceInfos: PriceInfo[]): Promise<SignedPrice[]> {
  return priceInfos.map((info) => {
    const price = [
      {
        timestamp: info.timestamp,
        symbol: `${info.from}${info.to}`,
        price: info.price,
      },
    ]

    //TODO have the signed price inculde all necessary information
    // dependent also on chosen parameters 

    // timestamp
    // from
    // to
    // price ( if map supported then do all the mapping here )
    // sources
    // hash of the request ( to verify the parameters where not changed )


    const packedPrice = _STD_.chains.tezos.encoding.pack(price)
    const signature = _STD_.chains.tezos.signer.sign(packedPrice)

    return {
      pair: `${info.from}${info.to}`,
      packedPrice,
      signature,
    }
  })
}
