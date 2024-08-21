export interface GlobalWithAcurastFunctions {
  _STD_: {
    env: {
      WSS_URLS: string
    }
    ws: {
      open: jest.Mock
      registerPayloadHandler: jest.Mock
      send: jest.Mock
    }
    chains: {
      tezos: {
        encoding: {
          pack: jest.Mock
        }
        signer: {
          sign: jest.Mock
        }
      }
    }
  }
  httpGET: jest.Mock
}
