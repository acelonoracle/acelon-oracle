import { normalize } from '../../src/utils/math'
import { DEFAULT_DECIMALS } from '../../src/constants'
import { fetchPrices } from '../../src/methods/fetchPrices'
import { FetchPricesParams } from '../../src/types'
import { fetchPrice } from '../../src/utils/fetch'

jest.mock('../../src/utils/fetch')

describe('fetchPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch prices and return price info', async () => {
    const mockFetchPrice = fetchPrice as jest.MockedFunction<typeof fetchPrice>
    mockFetchPrice.mockResolvedValue([
      { price: 50000, exchangeId: 'TEST1', certificate: 'cert1' },
      { price: 51000, exchangeId: 'TEST2', certificate: 'cert2' },
    ])

    const params: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'Tezos',
      minSources: 2,
    }

    const result = await fetchPrices(params)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      from: 'BTC',
      to: 'USD',
      price: { median: normalize(50500, DEFAULT_DECIMALS) },
      timestamp: expect.any(Number),
      sources: expect.arrayContaining([
        { exchangeId: 'TEST1', certificate: 'cert1' },
        { exchangeId: 'TEST2', certificate: 'cert2' },
      ]),
    })
  })

  it('should use client-provided price if within threshold', async () => {
    const mockFetchPrice = fetchPrice as jest.MockedFunction<typeof fetchPrice>
    mockFetchPrice.mockResolvedValue([
      { price: 50000, exchangeId: 'TEST1', certificate: 'cert1' },
      { price: 51000, exchangeId: 'TEST2', certificate: 'cert2' },
    ])

    const params: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD', price: 50500 }],
      protocol: 'Tezos',
      minSources: 2,
    }

    const result = await fetchPrices(params)

    expect(result[0].price.median).toBe(normalize(50500, DEFAULT_DECIMALS))
  })

  it('should throw an error if not enough sources', async () => {
    const mockFetchPrice = fetchPrice as jest.MockedFunction<typeof fetchPrice>
    mockFetchPrice.mockResolvedValue([
      { price: 50000, exchangeId: 'TEST1', certificate: 'cert1' },
    ])

    const params: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'Tezos',
      minSources: 2,
    }

    await expect(fetchPrices(params)).rejects.toThrow('Not enough sources')
  })
})
