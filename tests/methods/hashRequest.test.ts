import { FetchPricesParams } from '../../src/types'
import { hashRequest } from '../../src/methods/signPrices'

describe('hashRequest', () => {
  it('should produce different hashes for different pairs', () => {
    const params1: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'EVM',
    }
    const params2: FetchPricesParams = {
      pairs: [{ from: 'ETH', to: 'USD' }],
      protocol: 'EVM',
    }
    const hash1 = hashRequest(params1)
    const hash2 = hashRequest(params2)
    expect(hash1).not.toBe(hash2)
  })

  it('should produce the same hash for identical params', () => {
    const params1: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'EVM',
    }
    const params2: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'EVM',
    }
    const hash1 = hashRequest(params1)
    const hash2 = hashRequest(params2)
    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different protocols', () => {
    const params1: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'EVM',
    }
    const params2: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'Substrate',
    }
    const hash1 = hashRequest(params1)
    const hash2 = hashRequest(params2)
    expect(hash1).not.toBe(hash2)
  })

  it('should produce different hashes for multiple pairs', () => {
    const params1: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'EVM',
    }
    const params2: FetchPricesParams = {
      pairs: [
        { from: 'BTC', to: 'USD' },
        { from: 'ETH', to: 'USD' },
      ],
      protocol: 'EVM',
    }
    const hash1 = hashRequest(params1)
    const hash2 = hashRequest(params2)
    expect(hash1).not.toBe(hash2)
  })

  it('should produce different hashes for different optional fields', () => {
    const params1: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'EVM',
    }
    const params2: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD', decimals: 8 }],
      protocol: 'EVM',
      minSources: 3,
    }
    const hash1 = hashRequest(params1)
    const hash2 = hashRequest(params2)
    expect(hash1).not.toBe(hash2)
  })

  it('should be independent of property order', () => {
    const params1: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'EVM',
    }
    const params2: FetchPricesParams = {
      protocol: 'EVM',
      pairs: [{ to: 'USD', from: 'BTC' }],
    }
    const hash1 = hashRequest(params1)
    const hash2 = hashRequest(params2)
    expect(hash1).toBe(hash2)
  })
}) 