import { GlobalWithAcurastFunctions } from "./global"

declare global {
  var _STD_: GlobalWithAcurastFunctions["_STD_"]
  var httpGET: GlobalWithAcurastFunctions["httpGET"]
}

global._STD_ = {
  env: {
    WSS_URLS: "wss://websocket-proxy-1.test.com,wss://websocket-proxy-2.test.com",
  },
  ws: {
    open: jest.fn(),
    registerPayloadHandler: jest.fn(),
    send: jest.fn(),
  },
  chains: {
    tezos: {
      encoding: {
        pack: jest.fn(),
      },
      signer: {
        sign: jest.fn(),
      },
    },
  },
  job: {
    getPublicKeys: jest.fn(),
  },
}

global.httpGET = jest.fn()
